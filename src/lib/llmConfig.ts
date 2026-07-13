import type { LlmConfig, LlmProvider } from '../types';
import { isBilibiliVariant } from './appVariant';

const LLM_CONFIG_KEY = 'tarot_llm_config_v1';
const LLM_CONFIG_SCHEMA_VERSION = 2;

export const llmProviderPresets: Record<LlmProvider, {
  label: string;
  baseUrl: string;
  model: string;
  note: string;
}> = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    note: 'OpenAI 兼容协议，使用 Authorization: Bearer。',
  },
  mimo: {
    label: '小米 MiMo',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    model: 'mimo-v2.5',
    note: 'OpenAI 兼容协议，使用 api-key 请求头。',
  },
  openai_compatible: {
    label: '通用 OpenAI 兼容接口',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    note: '适用于 OpenAI 或其它完全兼容 OpenAI Chat Completions 的服务。',
  },
};

export const defaultLlmConfig: LlmConfig = {
  enabled: true,
  thinkingEnabled: false,
  provider: 'openai_compatible',
  baseUrl: llmProviderPresets.openai_compatible.baseUrl,
  model: llmProviderPresets.openai_compatible.model,
  apiKey: '',
  providerApiKeys: {},
  temperature: 0.7,
  timeoutMs: 300000,
};

export const bilibiliLlmConfig: LlmConfig = {
  enabled: true,
  thinkingEnabled: false,
  provider: 'openai_compatible',
  baseUrl: '/api/bxk/private_chat',
  model: 'bxk-private-chat-1114',
  apiKey: 'builtin',
  providerApiKeys: {},
  temperature: 0.7,
  timeoutMs: 300000,
  privateChat: {
    endpoint: '/api/bxk/private_chat',
    kid: '1114',
    chatMod: 'bot',
  },
};

export const managedLlmConfig: LlmConfig = {
  enabled: true,
  thinkingEnabled: false,
  provider: 'openai_compatible',
  baseUrl: '/api/managed-llm',
  model: 'managed-default',
  apiKey: 'server-managed',
  providerApiKeys: {},
  temperature: 0.7,
  timeoutMs: 300000,
  managedProxy: true,
};

interface StoredLlmConfig extends Partial<LlmConfig> {
  endpoint?: string;
  schemaVersion?: number;
}

export const loadLlmConfig = (): LlmConfig => {
  if (isBilibiliVariant) return bilibiliLlmConfig;
  try {
    const raw = localStorage.getItem(LLM_CONFIG_KEY);
    if (!raw) return defaultLlmConfig;
    const stored = JSON.parse(raw) as StoredLlmConfig;
    const provider = stored.provider ?? inferProvider(stored.baseUrl ?? stored.endpoint ?? '');
    const providerApiKeys = {
      ...(stored.providerApiKeys ?? {}),
    };
    if (stored.apiKey && !providerApiKeys[provider]) {
      providerApiKeys[provider] = stored.apiKey;
    }
    const hasPersonalApiKey = Object.values(providerApiKeys).some((key) => Boolean(key?.trim()));
    const shouldMigrateToTrial = stored.schemaVersion !== LLM_CONFIG_SCHEMA_VERSION
      && !hasPersonalApiKey;
    return {
      ...defaultLlmConfig,
      ...stored,
      enabled: shouldMigrateToTrial ? true : stored.enabled ?? defaultLlmConfig.enabled,
      provider,
      baseUrl: normalizeBaseUrl(stored.baseUrl ?? stored.endpoint ?? defaultLlmConfig.baseUrl),
      apiKey: providerApiKeys[provider] ?? stored.apiKey ?? '',
      providerApiKeys,
    };
  } catch {
    return defaultLlmConfig;
  }
};

export const saveLlmConfig = (config: LlmConfig) => {
  if (isBilibiliVariant) return;
  const providerApiKeys = {
    ...config.providerApiKeys,
    [config.provider]: config.apiKey,
  };
  localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify({
    ...config,
    schemaVersion: LLM_CONFIG_SCHEMA_VERSION,
    baseUrl: normalizeBaseUrl(config.baseUrl),
    providerApiKeys,
  }));
};

export const isLlmConfigUsable = (config: LlmConfig) =>
  config.enabled
  && (
    Boolean(config.privateChat?.endpoint && config.privateChat.kid)
    || Boolean(config.baseUrl.trim() && config.model.trim() && config.apiKey.trim())
  );

export const needsLlmApiKey = (config: LlmConfig) =>
  config.enabled && !config.privateChat && !config.apiKey.trim();

export const resolveLlmConfig = (config: LlmConfig, trialRequestId: string): LlmConfig => {
  if (!config.enabled || isLlmConfigUsable(config)) {
    const { managedProxy: _managedProxy, quotaKey: _quotaKey, ...personalConfig } = config;
    return personalConfig;
  }
  return { ...managedLlmConfig, quotaKey: trialRequestId };
};

export const resolveResultLlmConfig = resolveLlmConfig;

export const applyLlmProviderPreset = (config: LlmConfig, provider: LlmProvider): LlmConfig => ({
  ...config,
  providerApiKeys: {
    ...config.providerApiKeys,
    [config.provider]: config.apiKey,
  },
  provider,
  baseUrl: llmProviderPresets[provider].baseUrl,
  model: llmProviderPresets[provider].model,
  apiKey: config.providerApiKeys[provider] ?? '',
});

export const normalizeBaseUrl = (value: string) => value
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/chat\/completions$/i, '');

const inferProvider = (value: string): LlmProvider => {
  const normalized = normalizeBaseUrl(value).toLowerCase();
  if (normalized.includes('deepseek.com')) return 'deepseek';
  if (normalized.includes('xiaomimimo.com') || normalized.includes('mimo.mi.com')) return 'mimo';
  return 'openai_compatible';
};
