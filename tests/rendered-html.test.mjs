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
  assert.match(html, /Connecting to Local Agent/);
  assert.match(html, /MCAP Data Processing Platform/);
  assert.match(html, /Jobs &amp; Analysis/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});
