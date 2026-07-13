import { describe, expect, it } from 'vitest';
import type { LlmConfig } from '../types';
import { defaultLlmConfig, resolveLlmConfig } from './llmConfig';

describe('result LLM configuration', () => {
  it('uses the managed proxy when the enabled user config has no API key', () => {
    const resolved = resolveLlmConfig(defaultLlmConfig, 'reading-123');

    expect(resolved.managedProxy).toBe(true);
    expect(resolved.baseUrl).toBe('/api/managed-llm');
    expect(resolved.quotaKey).toBe('reading-123');
  });

  it('keeps a complete user-owned LLM configuration', () => {
    const personal: LlmConfig = {
      ...defaultLlmConfig,
      baseUrl: 'https://example.com/v1',
      model: 'personal-model',
      apiKey: 'personal-key',
    };
    const resolved = resolveLlmConfig(personal, 'reading-456');

    expect(resolved.managedProxy).not.toBe(true);
    expect(resolved.apiKey).toBe('personal-key');
    expect(resolved.quotaKey).toBeUndefined();
  });

  it('does not enable the managed proxy after the user disables LLM analysis', () => {
    const resolved = resolveLlmConfig(
      { ...defaultLlmConfig, enabled: false },
      'reading-789',
    );

    expect(resolved.enabled).toBe(false);
    expect(resolved.managedProxy).not.toBe(true);
  });
});
