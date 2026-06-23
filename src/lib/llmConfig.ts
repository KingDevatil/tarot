import type { LlmConfig } from '../types';

const LLM_CONFIG_KEY = 'tarot_llm_config_v1';

export const defaultLlmConfig: LlmConfig = {
  enabled: false,
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  apiKey: '',
  temperature: 0.7,
  timeoutMs: 30000,
};

export const loadLlmConfig = (): LlmConfig => {
  try {
    const raw = localStorage.getItem(LLM_CONFIG_KEY);
    if (!raw) return defaultLlmConfig;
    return {
      ...defaultLlmConfig,
      ...(JSON.parse(raw) as Partial<LlmConfig>),
    };
  } catch {
    return defaultLlmConfig;
  }
};

export const saveLlmConfig = (config: LlmConfig) => {
  localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(config));
};

export const isLlmConfigUsable = (config: LlmConfig) =>
  config.enabled && config.endpoint.trim() && config.model.trim() && config.apiKey.trim();
