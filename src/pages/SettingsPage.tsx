import { Save, SlidersHorizontal, TestTube2 } from 'lucide-react';
import { useState } from 'react';
import { testLlmConnection } from '../lib/llmAnalysis';
import {
  applyLlmProviderPreset,
  defaultLlmConfig,
  llmProviderPresets,
  loadLlmConfig,
  saveLlmConfig,
} from '../lib/llmConfig';
import type { LlmConfig, LlmProvider } from '../types';

type TestState =
  | { status: 'idle'; message: string }
  | { status: 'testing'; message: string }
  | { status: 'success'; message: string; detail: string }
  | { status: 'error'; message: string };

export function SettingsPage() {
  const [config, setConfig] = useState<LlmConfig>(() => loadLlmConfig());
  const [saved, setSaved] = useState(false);
  const [testState, setTestState] = useState<TestState>({
    status: 'idle',
    message: '填写 Base URL、模型和 API Key 后，可以先测试连接。',
  });

  const update = <K extends keyof LlmConfig>(key: K, value: LlmConfig[K]) => {
    setSaved(false);
    setTestState({
      status: 'idle',
      message: '配置已修改，建议重新测试连接。',
    });
    setConfig((current) => {
      const next = { ...current, [key]: value };
      if (key === 'apiKey') {
        return {
          ...next,
          providerApiKeys: {
            ...current.providerApiKeys,
            [current.provider]: value as string,
          },
        };
      }
      return next;
    });
  };

  const changeProvider = (provider: LlmProvider) => {
    setSaved(false);
    setTestState({
      status: 'idle',
      message: '服务商已切换，已填入推荐 Base URL 和模型，建议重新测试连接。',
    });
    setConfig((current) => applyLlmProviderPreset(current, provider));
  };

  const save = () => {
    saveLlmConfig(config);
    setSaved(true);
  };

  const reset = () => {
    setConfig(defaultLlmConfig);
    saveLlmConfig(defaultLlmConfig);
    setSaved(true);
    setTestState({
      status: 'idle',
      message: '已恢复默认配置。填写 Base URL、模型和 API Key 后，可以先测试连接。',
    });
  };

  const testConnection = async () => {
    setTestState({ status: 'testing', message: '正在测试 LLM 连接与 JSON 输出格式...' });
    try {
      const result = await testLlmConnection(config);
      setTestState({
        status: 'success',
        message: result.message,
        detail: `${result.model} 返回：${result.rawPreview}`,
      });
    } catch (error) {
      setTestState({
        status: 'error',
        message: error instanceof Error ? error.message : '连接测试失败，请检查配置',
      });
    }
  };

  const canTest = Boolean(config.baseUrl.trim() && config.model.trim() && config.apiKey.trim());
  const isTesting = testState.status === 'testing';
  const providerPreset = llmProviderPresets[config.provider];

  return (
    <main className="screen settings-screen">
      <section className="section-header">
        <div>
          <h1>配置</h1>
          <p>开启后，结果页会尝试使用 LLM 根据问题、牌阵、牌位和正逆位生成辅助解析。</p>
        </div>
      </section>

      <section className="settings-panel">
        <div className="panel-title">
          <SlidersHorizontal size={22} />
          <div>
            <h2>LLM 辅助解析</h2>
            <p>未开启或请求失败时，系统自动使用默认牌义解析规则。</p>
          </div>
        </div>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(event) => update('enabled', event.target.checked)}
          />
          <span>开启 LLM 辅助解析</span>
        </label>

        <div className="settings-grid">
          <label className="settings-field">
            <span>服务商</span>
            <select
              value={config.provider}
              onChange={(event) => changeProvider(event.target.value as LlmProvider)}
            >
              {(Object.entries(llmProviderPresets) as Array<[LlmProvider, typeof providerPreset]>).map(([provider, preset]) => (
                <option key={provider} value={provider}>{preset.label}</option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>Base URL</span>
            <input
              value={config.baseUrl}
              placeholder="https://api.openai.com/v1"
              onChange={(event) => update('baseUrl', event.target.value)}
            />
          </label>

          <label className="settings-field">
            <span>模型</span>
            <input
              value={config.model}
              placeholder="gpt-4o-mini"
              onChange={(event) => update('model', event.target.value)}
            />
          </label>

          <label className="settings-field">
            <span>API Key</span>
            <input
              type="password"
              value={config.apiKey}
              placeholder="仅保存在本机浏览器"
              onChange={(event) => update('apiKey', event.target.value)}
            />
          </label>

          <label className="settings-field">
            <span>温度：{config.temperature.toFixed(1)}</span>
            <input
              type="range"
              min="0"
              max="1.2"
              step="0.1"
              value={config.temperature}
              onChange={(event) => update('temperature', Number(event.target.value))}
            />
          </label>

          <label className="settings-field">
            <span>超时毫秒</span>
            <input
              type="number"
              min="5000"
              max="120000"
              step="1000"
              value={config.timeoutMs}
              onChange={(event) => update('timeoutMs', Number(event.target.value))}
            />
          </label>
        </div>

        <div className="settings-note">
          <strong>格式容错</strong>
          <p>
            LLM 会被要求只返回 JSON。前端会自动提取 JSON、校验字段、补齐缺失内容；如果仍然失败，会显示本地牌义解析。
          </p>
        </div>

        <div className="settings-note">
          <strong>{providerPreset.label}</strong>
          <p>{providerPreset.note}</p>
        </div>

        <div className="settings-note">
          <strong>前端直连限制</strong>
          <p>
            API Key 会按服务商分别保存在本机浏览器，切换服务商时会自动带出对应 Key。Base URL 只填写兼容协议根路径，程序会自动拼接 /chat/completions。部分 LLM 服务不允许浏览器跨域直连，这种情况下请求会失败并回退本地解析。
          </p>
        </div>

        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={save}>
            <Save size={18} />
            保存配置
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!canTest || isTesting}
            onClick={testConnection}
          >
            <TestTube2 size={18} />
            {isTesting ? '测试中' : '测试连接'}
          </button>
          <button className="ghost-button" type="button" onClick={reset}>
            恢复默认
          </button>
          {saved ? <span className="settings-saved">已保存</span> : null}
        </div>

        <div className={`settings-test-result is-${testState.status}`}>
          <strong>{testState.status === 'success' ? '测试通过' : testState.status === 'error' ? '测试失败' : '连接测试'}</strong>
          <p>{testState.message}</p>
          {testState.status === 'success' ? <code>{testState.detail}</code> : null}
        </div>
      </section>
    </main>
  );
}
