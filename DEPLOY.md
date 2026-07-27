# 公网前端部署

该目录是纯前端入口。运行时所有任务和文件请求都直接访问用户电脑上的 `http://127.0.0.1:8765`，不依赖托管平台的后端或环境变量。

## 本地构建

需要 Node.js 22.13+，推荐使用 pnpm：

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build
```

构建产物位于 `dist/`。

## Cloudflare Pages

连接包含 `mcap-web` 的 Git 仓库，并设置：

- Root directory：`mcap-web`
- Build command：`pnpm install --frozen-lockfile && pnpm build`
- Build output directory：`dist/client`
- Node.js：22.13 或更高版本

若平台识别为 Workers/Vinext 项目，可按构建输出提示部署生成的 Worker；项目中不应添加任何 MCAP 上传路由。

## Vercel

导入仓库后将 Root Directory 设为 `mcap-web`，安装命令设为 `pnpm install --frozen-lockfile`，构建命令设为 `pnpm build`。若使用静态输出，发布 `dist/client`；若使用 Vinext 适配器，则按其生成的服务端入口部署。无论哪种方式，运行时 API 目标仍固定为用户本机 Agent。

## 验收

1. 未启动 Agent 时打开公网网址，页面正常加载并显示“请启动 MCAP Agent”。
2. 启动 `mcap-agent/start_agent.sh`，最多约 1.5 秒后状态自动变为“本地分析服务已连接”。
3. 在浏览器开发者工具的 Network 面板中上传 MCAP，确认请求 URL 是 `http://127.0.0.1:8765/api/jobs`。
4. 确认托管平台日志和存储中没有 MCAP 文件。
