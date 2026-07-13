const DAILY_SUCCESS_LIMIT = 5;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_TOTAL_MESSAGE_CHARS = 24_000;
const MAX_OUTPUT_TOKENS = 4_096;
const UPSTREAM_TIMEOUT_MS = 280_000;

const securityHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export async function onRequestPost(context) {
  const { request, env } = context;
  const originError = validateSameOrigin(request);
  if (originError) return jsonError(403, 'ORIGIN_NOT_ALLOWED', originError);

  if (!env.DB || !env.LLM_API_KEY || !env.LLM_BASE_URL || !env.LLM_MODEL || !env.RATE_LIMIT_SALT) {
    return jsonError(503, 'MANAGED_LLM_UNAVAILABLE', 'Managed LLM is not configured');
  }

  const trialRequestId = (
    request.headers.get('X-Tarot-Trial-Id')
    || request.headers.get('X-Tarot-Reading-Id')
    || ''
  ).trim();
  if (!/^[A-Za-z0-9_.:-]{8,128}$/.test(trialRequestId)) {
    return jsonError(400, 'INVALID_TRIAL_REQUEST_ID', 'A valid trial request id is required');
  }

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonError(413, 'REQUEST_TOO_LARGE', 'Request body is too large');
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return jsonError(413, 'REQUEST_TOO_LARGE', 'Request body is too large');
  }

  let input;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return jsonError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }

  const messages = validateMessages(input?.messages);
  if (!messages) {
    return jsonError(400, 'INVALID_MESSAGES', 'Messages are invalid or too long');
  }

  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return jsonError(403, 'VISITOR_UNAVAILABLE', 'Visitor identity is unavailable');

  const usageDate = getUsageDate();
  const visitorHash = await sha256(`${env.RATE_LIMIT_SALT}:${ip}`);
  const requestHash = await sha256(`${visitorHash}:${trialRequestId}`);
  await releaseStaleReservations(env.DB);
  context.waitUntil(cleanOldUsage(env.DB, usageDate));

  const cached = await env.DB.prepare(
    "SELECT status, response_json FROM managed_llm_usage WHERE visitor_hash = ? AND usage_date = ? AND request_hash = ?",
  ).bind(visitorHash, usageDate, requestHash).first();
  if (cached?.status === 'success' && cached.response_json) {
    return new Response(cached.response_json, { status: 200, headers: securityHeaders });
  }
  if (cached?.status === 'pending') {
    return jsonError(409, 'ANALYSIS_IN_PROGRESS', 'This reading is already being analyzed');
  }

  const usage = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM managed_llm_usage WHERE visitor_hash = ? AND usage_date = ?',
  ).bind(visitorHash, usageDate).first();
  if (Number(usage?.count || 0) >= DAILY_SUCCESS_LIMIT) {
    return jsonError(429, 'DAILY_QUOTA_EXHAUSTED', 'Daily managed LLM quota exhausted');
  }

  try {
    await env.DB.prepare(
      "INSERT INTO managed_llm_usage (visitor_hash, usage_date, request_hash, status, response_json, created_at) VALUES (?, ?, ?, 'pending', NULL, ?)",
    ).bind(visitorHash, usageDate, requestHash, new Date().toISOString()).run();
  } catch {
    return jsonError(429, 'DAILY_QUOTA_EXHAUSTED', 'Daily managed LLM quota exhausted');
  }

  const upstreamController = new AbortController();
  const timeout = setTimeout(() => upstreamController.abort(), UPSTREAM_TIMEOUT_MS);
  let upstream;
  try {
    upstream = await fetch(`${env.LLM_BASE_URL.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        messages,
        temperature: clampNumber(input.temperature, 0, 1.2, 0.7),
        max_tokens: clampNumber(input.max_tokens, 256, MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
      }),
      signal: upstreamController.signal,
    });
  } catch {
    await releaseReservation(env.DB, visitorHash, usageDate, requestHash);
    return jsonError(502, 'MANAGED_LLM_UNAVAILABLE', 'Managed LLM did not return a result');
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) {
    await releaseReservation(env.DB, visitorHash, usageDate, requestHash);
    return jsonError(502, 'MANAGED_LLM_UNAVAILABLE', 'Managed LLM upstream failed');
  }

  const responseText = await upstream.text();
  if (new TextEncoder().encode(responseText).byteLength > 256 * 1024 || !hasUsableContent(responseText)) {
    await releaseReservation(env.DB, visitorHash, usageDate, requestHash);
    return jsonError(502, 'MANAGED_LLM_UNAVAILABLE', 'Managed LLM returned an invalid result');
  }

  try {
    await env.DB.prepare(
      "UPDATE managed_llm_usage SET status = 'success', response_json = ?, created_at = ? WHERE visitor_hash = ? AND usage_date = ? AND request_hash = ? AND status = 'pending'",
    ).bind(responseText, new Date().toISOString(), visitorHash, usageDate, requestHash).run();
  } catch {
    await releaseReservation(env.DB, visitorHash, usageDate, requestHash);
    const existing = await env.DB.prepare(
      "SELECT response_json FROM managed_llm_usage WHERE visitor_hash = ? AND usage_date = ? AND request_hash = ? AND status = 'success'",
    ).bind(visitorHash, usageDate, requestHash).first();
    if (existing?.response_json) {
      return new Response(existing.response_json, { status: 200, headers: securityHeaders });
    }
    return jsonError(429, 'DAILY_QUOTA_EXHAUSTED', 'Daily managed LLM quota exhausted');
  }

  return new Response(responseText, { status: 200, headers: securityHeaders });
}

function validateSameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return 'Origin header is required';
  return origin === new URL(request.url).origin ? '' : 'Cross-origin requests are not allowed';
}

function validateMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) return null;
  let totalChars = 0;
  const messages = [];
  for (const item of value) {
    if (!item || (item.role !== 'system' && item.role !== 'user') || typeof item.content !== 'string') return null;
    totalChars += item.content.length;
    if (totalChars > MAX_TOTAL_MESSAGE_CHARS) return null;
    messages.push({ role: item.role, content: item.content });
  }
  return messages;
}

function hasUsableContent(text) {
  try {
    const payload = JSON.parse(text);
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) return false;
    const parsed = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''));
    return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

async function cleanOldUsage(db, today) {
  const cutoff = new Date(`${today}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 2);
  await db.prepare('DELETE FROM managed_llm_usage WHERE usage_date < ?')
    .bind(cutoff.toISOString().slice(0, 10))
    .run();
}

async function releaseStaleReservations(db) {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await db.prepare("DELETE FROM managed_llm_usage WHERE status = 'pending' AND created_at < ?")
    .bind(cutoff)
    .run();
}

async function releaseReservation(db, visitorHash, usageDate, requestHash) {
  await db.prepare(
    "DELETE FROM managed_llm_usage WHERE visitor_hash = ? AND usage_date = ? AND request_hash = ? AND status = 'pending'",
  ).bind(visitorHash, usageDate, requestHash).run();
}

function getUsageDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function jsonError(status, code, message) {
  return new Response(JSON.stringify({ code, message }), { status, headers: securityHeaders });
}
