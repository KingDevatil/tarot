# 公开版默认 LLM 部署

公开版使用 Cloudflare Pages Functions 代理默认 LLM。生产 API Key 只保存在 Cloudflare 服务端环境变量中，不能写入 `src`、`public`、构建参数或 Git 仓库。

## 1. 创建 D1 数据库

```bash
npx wrangler d1 create tarot-public
```

在 Cloudflare Pages 项目的 `Settings > Bindings` 中添加 D1 binding：

- Variable name: `DB`
- D1 database: 刚创建的数据库

执行数据库初始化：

```bash
npx wrangler d1 execute tarot-public --remote --file migrations/0001_managed_llm_usage.sql
```

## 2. 配置服务端变量

在 Cloudflare Pages 的 `Settings > Variables and Secrets` 中配置：

- `LLM_API_KEY`：比赛专用、设置消费上限的密钥，必须使用 Secret
- `LLM_BASE_URL`：OpenAI-compatible API 根地址，例如 `https://api.openai.com/v1`
- `LLM_MODEL`：服务端固定使用的模型
- `RATE_LIMIT_SALT`：至少 32 个随机字符，必须使用 Secret

当 `LLM_BASE_URL` 使用 `xiaomimimo.com` 域名时，代理会自动使用小米 MiMo 的 `api-key` 鉴权头和 `max_completion_tokens` 参数；API Key 仍只存在于服务端 Secret 中。

建议为 Preview 和 Production 分别设置独立密钥和额度。

## 3. 部署

```bash
npm run deploy:cloudflare
```

Functions 路由为 `/api/managed-llm/chat/completions`。如果 D1 或任一服务端变量缺失，接口会失败关闭，不会无额度限制地调用模型。

## 额度规则

- 默认 LLM 仅作为试用：每个访问来源按北京时间每天最多成功调用 5 次。
- 问题分析、问题生成和结果解析使用默认 LLM 时均属于试用调用。
- 只有上游返回符合结果结构的内容并成功写入 D1 后才计数。
- 网络错误、超时、模型错误和本地牌义解析均不计数。
- 同一个占卜结果重复打开时返回缓存，不重复计数或调用模型。
- 服务端在调用模型前原子预留名额，失败立即释放，避免并发请求绕过额度并产生额外费用。
- 缓存和匿名额度记录仅保存加盐 IP 哈希，不保存原始 IP；超过两天的记录会自动清理。

## 用户自己的 LLM

用户在配置页填写 API Key 后，所有 LLM 功能都直接使用用户自己的 OpenAI-compatible 接口，不经过默认代理，也不受公开版每日试用额度限制。该 Key 只保存在用户浏览器 `localStorage`，不会发送给默认代理。

## 上线前检查

- 给比赛专用 API Key 设置独立账户、硬消费上限和告警。
- 不在日志、截图、错误响应或前端构建中输出任何 Secret。
- 仅通过 HTTPS 域名公开访问。
- 在 Cloudflare WAF 中为 `/api/managed-llm/*` 增加每分钟请求速率规则。
- 定期轮换 `LLM_API_KEY`；怀疑泄露时立即吊销。
