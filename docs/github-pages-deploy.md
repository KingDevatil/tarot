# GitHub Pages 部署说明

本项目是 Vite + React 纯前端应用，可以通过 GitHub Actions 自动部署到 GitHub Pages。

## 已包含的部署文件

项目已包含 workflow：

```text
.github/workflows/github-pages.yml
```

该 workflow 会在以下情况触发：

- 推送到 `main` 分支。
- 在 GitHub Actions 页面手动执行 `workflow_dispatch`。

## GitHub 仓库设置

首次部署需要在 GitHub 仓库中启用 Pages：

1. 打开仓库页面。
2. 进入 `Settings`。
3. 进入 `Pages`。
4. 在 `Build and deployment` 中将 `Source` 设置为 `GitHub Actions`。
5. 保存后，推送到 `main` 分支或手动运行 workflow。

## 构建配置

workflow 使用 Node.js 22，并执行：

```bash
npm ci
npm run build
```

构建产物目录为：

```text
dist
```

## Base Path

GitHub Pages 的项目站点通常部署在子路径下，例如：

```text
https://<github-user>.github.io/tarot/
```

因此 workflow 在构建时设置了：

```yaml
VITE_BASE_PATH: /tarot/
```

`vite.config.ts` 会读取这个变量：

```ts
base: process.env.VITE_BASE_PATH || '/'
```

如果 GitHub 仓库名不是 `tarot`，需要把 `.github/workflows/github-pages.yml` 中的 base path 改为对应仓库名：

```yaml
VITE_BASE_PATH: /your-repo-name/
```

如果部署到用户或组织根站点，例如：

```text
https://<github-user>.github.io/
```

则应改为：

```yaml
VITE_BASE_PATH: /
```

## 部署后验证

workflow 成功后，访问：

```text
https://<github-user>.github.io/tarot/
```

建议验证：

- 首页能正常加载。
- 牌库图片能正常显示。
- 可以完成一次抽牌并进入解析页。
- 刷新页面后应用仍能正常打开。
- “配置”页保存的 LLM 设置只保存在当前浏览器。

## 注意事项

- GitHub Pages 只托管静态文件，不能安全保存后端密钥。
- 如果要公开给多人使用，不建议在前端内置或共享高权限 LLM API Key。
- 当前项目没有服务端路由；页面切换由 React 内部状态管理完成。
- 如果后续引入 URL 路由，需要额外处理 GitHub Pages 的 SPA 回退策略。
