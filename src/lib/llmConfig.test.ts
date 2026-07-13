import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LlmConfig } from '../types';
import { defaultLlmConfig, loadLlmConfig, resolveLlmConfig, saveLlmConfig } from './llmConfig';

afterEach(() => {
  vi.unstubAllGlobals();
});

const stubStoredConfig = (stored: Record<string, unknown>) => {
  let value = JSON.stringify(stored);
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => { value = nextValue; }),
  });
};

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

describe('stored LLM configuration migration', () => {
  it('enables the default trial for legacy users without a personal API key', () => {
    stubStoredConfig({ ...defaultLlmConfig, enabled: false });

    expect(loadLlmConfig().enabled).toBe(true);
  });

  it('preserves an explicit disabled choice after the new config has been saved', () => {
    stubStoredConfig({});
    saveLlmConfig({ ...defaultLlmConfig, enabled: false });

    expect(loadLlmConfig().enabled).toBe(false);
  });
});
