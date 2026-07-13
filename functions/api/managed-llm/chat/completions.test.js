import { describe, expect, it } from 'vitest';
import { buildUpstreamRequest, isMimoUpstream } from './completions.js';

const messages = [{ role: 'user', content: 'test' }];

describe('managed LLM upstream request', () => {
  it('uses Xiaomi MiMo authentication without exposing a bearer token', () => {
    const request = buildUpstreamRequest({
      LLM_API_KEY: 'test-secret',
      LLM_BASE_URL: 'https://api.xiaomimimo.com/v1',
      LLM_MODEL: 'mimo-v2.5',
    }, { max_tokens: 1024, temperature: 0.5 }, messages);

    expect(request.headers).toEqual({
      'Content-Type': 'application/json',
      'api-key': 'test-secret',
    });
    expect(request.headers.Authorization).toBeUndefined();
    expect(request.body.max_completion_tokens).toBe(1024);
    expect(request.body.max_tokens).toBeUndefined();
  });

  it('keeps bearer authentication for other OpenAI-compatible services', () => {
    const request = buildUpstreamRequest({
      LLM_API_KEY: 'test-secret',
      LLM_BASE_URL: 'https://api.example.com/v1',
      LLM_MODEL: 'example-model',
    }, { max_tokens: 2048 }, messages);

    expect(request.headers.Authorization).toBe('Bearer test-secret');
    expect(request.headers['api-key']).toBeUndefined();
    expect(request.body.max_tokens).toBe(2048);
  });

  it('only recognizes the Xiaomi MiMo API domain', () => {
    expect(isMimoUpstream('https://api.xiaomimimo.com/v1')).toBe(true);
    expect(isMimoUpstream('https://xiaomimimo.com.attacker.example/v1')).toBe(false);
  });
});
