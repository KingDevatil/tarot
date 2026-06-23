# Cloudflare Pages 部署说明

本项目是 Vite + React 纯前端应用，推荐部署到 Cloudflare Pages。

## 方式一：连接 GitHub 自动部署

1. 进入 Cloudflare Dashboard。
2. 打开 `Workers & Pages`。
3. 选择 `Create application` -> `Pages` -> `Connect to Git`。
4. 选择本项目 GitHub 仓库。
5. 构建配置填写：
   - Framework preset: `React (Vite)`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: 留空
6. 保存并部署。

之后每次推送到 GitHub，Cloudflare Pages 会自动重新构建和部署。

## 方式二：本地直接上传

首次使用需要登录 Cloudflare：

```bash
npx wrangler login
```

部署：

```bash
npm run deploy:cloudflare
```

该命令会先执行 `npm run build`，再把 `dist` 上传到 Cloudflare Pages 的 `tarot` 项目。

## 注意事项

- Cloudflare Pages 的输出目录必须是 `dist`。
- 项目包含 `public/_redirects`，构建时会复制到 `dist/_redirects`，用于 SPA 回退到 `index.html`。
- 目前 LLM API Key 保存在浏览器 localStorage 中，不需要 Cloudflare 环境变量。
- 如果后续改为 Cloudflare Worker/Pages Function 代理 LLM 请求，再把 API Key 放到 Cloudflare 环境变量中。
