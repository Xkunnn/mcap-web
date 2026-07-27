# MCAP Web

这是仅负责界面展示的公网前端。浏览器会直接连接用户电脑上的
`http://127.0.0.1:8765`，不会把 MCAP 文件发送给 Cloudflare 或其他公网服务器。

## 本地开发与构建

要求 Node.js 22.13 或更高版本，并安装 pnpm。

```bash
pnpm install
pnpm dev
```

生产构建：

```bash
pnpm build
```

构建结果是纯静态站点，输出目录为：

```text
dist/client
```

前端不包含、调用或依赖 `backend.py`，也没有 Vite `/api` 反向代理。

## 部署到 Cloudflare Pages

1. 将 `mcap-web` 提交到 Git 仓库。
2. 在 Cloudflare Dashboard 中进入 Workers & Pages，创建 Pages 项目并连接仓库。
3. 如果仓库根目录还包含其他项目，把 Root directory 设置为 `mcap-web`。
4. 设置构建参数：

```text
Build command: pnpm build
Build output directory: dist/client
```

5. 保存并部署。完成后访问 Cloudflare 分配的
   `https://xxx.pages.dev` 地址。

如果浏览器首次询问“本地网络访问”权限，请选择允许。网页只能访问固定的
`127.0.0.1:8765`；本地 Agent 必须先启动。

## 架构

```text
Cloudflare Pages（静态页面）
        │ 浏览器直接请求
        ▼
http://127.0.0.1:8765（用户电脑上的 MCAP Agent）
        │
        └── mcap-agent/web_data/jobs（MCAP 与全部结果）
```

Cloudflare Pages 只分发 HTML、CSS 和 JavaScript。文件选择后，浏览器将文件直接
POST 到回环地址上的 Agent，因此原始 MCAP 不经过公网网页服务器。
