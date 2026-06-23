# Tarot Divination Frontend

纯前端塔罗占卜 MVP。当前版本使用 22 张大阿尔卡那、本地随机抽牌、问题类别选择、LocalStorage 历史记录，并支持可选 LLM 辅助解析。

## 功能

- 主题选择与标准化问题生成
- 本地洗牌、抽牌、正逆位
- 单张指引、三张趋势、五张关系牌阵
- 结果解析与行动建议
- 历史记录
- 大阿尔卡那图鉴与搜索
- 统一 UI 牌框叠加

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## Cloudflare Pages 部署

推荐使用 Cloudflare Pages 连接 GitHub 自动部署：

- Framework preset: `React (Vite)`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: 留空

也可以本地直接上传：

```bash
npx wrangler login
npm run deploy:cloudflare
```

详细说明见 [docs/cloudflare-deploy.md](docs/cloudflare-deploy.md)。
