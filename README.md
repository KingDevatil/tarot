# Tarot Divination Frontend

一个纯前端塔罗占卜应用，基于 Vite + React + TypeScript 构建。项目包含完整 78 张塔罗牌、问题预设、牌阵抽牌、揭牌仪式、结果解析、历史记录、牌库浏览，以及可选的 LLM 辅助解读。

## 当前能力

- 完整牌库：22 张大阿尔卡那 + 56 张小阿尔卡那。
- 小阿尔卡那分组：权杖、圣杯、宝剑、星币。
- 数字牌策略：每个花色使用统一底图，牌面用罗马数字区分 1–10，牌名显示为“权杖一”“圣杯十”等。
- 宫廷牌策略：侍从、骑士、王后、国王保留独立牌面，便于玩家识别角色差异。
- 问题类型：今日指引、感情关系、事业学业、选择判断、内在状态、近期趋势、牌阵。
- 选择判断：支持 A/B 或 3–4 个选项比较，按选项动态生成对应牌位。
- 牌阵支持：单张指引、三张趋势、身心灵三牌、五张关系、七张马蹄、凯尔特十字。
- 揭牌仪式：不同牌阵会按对应牌位布局展示，而不是简单线性排列。
- 解读流程：本地规则解读优先，支持开启 OpenAI 兼容接口、DeepSeek、小米 MiMo 等 LLM 辅助分析。
- 本地保存：占卜历史与 LLM 配置保存在浏览器 `localStorage` 中。
- 牌库浏览：按大阿尔卡那和四组小阿尔卡那分类展示。

## 技术栈

- React 18
- TypeScript
- Vite
- lucide-react
- LocalStorage
- OpenAI-compatible Chat Completions API（可选）

## 目录结构

```text
.
├─ assets/tarot/cards/          # 塔罗牌原图与缩略图源素材
├─ docs/                        # 设计、实施、部署与生图记录文档
├─ public/                      # 静态部署辅助文件
├─ src/
│  ├─ components/               # 通用 UI 组件
│  ├─ data/                     # 牌库、问题预设、牌阵配置
│  ├─ lib/                      # 抽牌、历史、LLM 配置与解析逻辑
│  ├─ pages/                    # 首页、占卜、结果、历史、牌库、配置页
│  ├─ App.tsx
│  └─ styles.css
├─ .github/workflows/           # CI 与 GitHub Pages 部署流程
├─ vite.config.ts
└─ package.json
```

## 本地开发

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173/
```

## 类型检查与构建

类型检查：

```bash
npm run typecheck
```

生产构建：

```bash
npm run build
```

本地预览生产构建：

```bash
npm run preview
```

## LLM 辅助解读

应用可以在“配置”页开启 LLM 辅助解读。当前支持：

- DeepSeek
- 小米 MiMo
- 通用 OpenAI 兼容接口

注意事项：

- API Key 保存在当前浏览器的 `localStorage` 中。
- 当前项目是纯前端应用，请不要把高权限或生产级 API Key 直接暴露给不可信用户。
- 如果要公开部署给多人使用，建议后续增加服务端代理或 Serverless Function，由服务端持有 API Key。

## GitHub Pages 部署

项目已经包含 GitHub Pages workflow：

```text
.github/workflows/github-pages.yml
```

该流程会在推送到 `main` 分支时自动执行：

1. 安装依赖。
2. 执行 `npm run build`。
3. 设置 `VITE_BASE_PATH=/tarot/`。
4. 上传 `dist` 到 GitHub Pages。

启用方式：

1. 将仓库推送到 GitHub。
2. 打开仓库 `Settings`。
3. 进入 `Pages`。
4. 在 `Build and deployment` 中选择 `GitHub Actions`。
5. 推送到 `main`，等待 `Deploy to GitHub Pages` workflow 完成。

部署地址通常为：

```text
https://<github-user>.github.io/tarot/
```

如果仓库名不是 `tarot`，需要同步修改 `.github/workflows/github-pages.yml` 中的：

```yaml
VITE_BASE_PATH: /tarot/
```

详见 [docs/github-pages-deploy.md](docs/github-pages-deploy.md)。

## Cloudflare Pages 部署

项目也支持 Cloudflare Pages：

- Framework preset: `React (Vite)`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: 留空

本地直接上传：

```bash
npx wrangler login
npm run deploy:cloudflare
```

详见 [docs/cloudflare-deploy.md](docs/cloudflare-deploy.md)。


## 当前限制

- 占卜结果主要用于娱乐与自我反思，不应作为医疗、法律、金融等高风险决策依据。
- LLM 解读质量依赖所配置模型，且会受提示词、牌阵、问题输入质量影响。
- 当前没有服务端账户体系；历史记录只保存在当前浏览器。
- 公开部署时，前端直连 LLM API 不适合共享生产密钥。
