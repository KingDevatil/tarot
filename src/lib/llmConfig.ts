import type { LlmConfig, LlmProvider } from '../types';

const LLM_CONFIG_KEY = 'tarot_llm_config_v1';

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
  enabled: false,
  thinkingEnabled: false,
  provider: 'openai_compatible',
  baseUrl: llmProviderPresets.openai_compatible.baseUrl,
  model: llmProviderPresets.openai_compatible.model,
  apiKey: '',
  providerApiKeys: {},
  temperature: 0.7,
  timeoutMs: 30000,
};

interface StoredLlmConfig extends Partial<LlmConfig> {
  endpoint?: string;
}

export const loadLlmConfig = (): LlmConfig => {
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
    return {
      ...defaultLlmConfig,
      ...stored,
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
  const providerApiKeys = {
    ...config.providerApiKeys,
    [config.provider]: config.apiKey,
  };
  localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify({
    ...config,
    baseUrl: normalizeBaseUrl(config.baseUrl),
    providerApiKeys,
  }));
};

export const isLlmConfigUsable = (config: LlmConfig) =>
  config.enabled && config.baseUrl.trim() && config.model.trim() && config.apiKey.trim();

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
