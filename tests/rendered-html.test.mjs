import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("static export contains the MCAP batch console", async () => {
  const html = await readFile(
    new URL("../dist/client/index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /<title>MCAP 数据处理工作台<\/title>/i);
  assert.match(html, /拖入一个或多个 .mcap 文件/);
  assert.match(html, /正在连接本地 Agent/);
  assert.match(html, /MCAP 数据处理工作台/);
  assert.match(html, /处理任务与分析结果/);
  assert.match(html, /视频导出 · 质量检测 · LeRobot 数据集/);
  assert.match(html, /Minimum completeness · [\s\S]*?100[\s\S]*?%/);
  assert.match(html, /默认生成 LeRobot 训练数据集/);
  assert.match(html, /value="12"/);
  assert.match(html, /当前检测/);
  assert.match(html, /历史记录/);
  assert.match(html, /恢复最高质量默认设置/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});
