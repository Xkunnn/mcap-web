# MCAP Web

公网可部署的 MCAP 工作台前端。它只负责文件选择、任务操作、状态和报告展示；MCAP 数据与计算均由用户电脑上的 MCAP Agent 完成。

开发与构建：

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

前端会自动检测 `http://127.0.0.1:8765/api/health`。部署方法见 [DEPLOY.md](./DEPLOY.md)，Agent 安装方法见 `mcap-agent/README_AGENT.md`。
# mcap-web
