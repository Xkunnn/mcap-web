import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

function moduleUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

const errorSource = await readFile(new URL("../app/lib/errorFormatter.ts", import.meta.url), "utf8");
const errorModuleUrl = moduleUrl(stripTypeScriptTypes(errorSource, { mode: "transform" }));
const jobSource = await readFile(new URL("../app/lib/jobDisplay.ts", import.meta.url), "utf8");
const transformedJobSource = stripTypeScriptTypes(
  jobSource.replace("\"./errorFormatter\"", JSON.stringify(errorModuleUrl)),
  { mode: "transform" },
);

const {
  getJobDisplayName,
  getJobDisplayStatus,
  getJobFileSummary,
  normalizeFileResults,
} = await import(moduleUrl(transformedJobSource));
const {
  classifyLerobotError,
  formatLerobotError,
  stripRepeatedErrorPrefix,
} = await import(errorModuleUrl);
const lerobotDisplay = await import(moduleUrl(stripTypeScriptTypes(
  await readFile(new URL("../app/lib/lerobotDisplay.ts", import.meta.url), "utf8"),
  { mode: "transform" },
)));
const adapterSource = await readFile(new URL("../app/lib/jobAdapter.ts", import.meta.url), "utf8");
const adapter = await import(moduleUrl(stripTypeScriptTypes(
  adapterSource.replace("\"./errorFormatter\"", JSON.stringify(errorModuleUrl)),
  { mode: "transform" },
)));

function job(overrides = {}) {
  return {
    id: "job-1",
    status: "completed",
    progress: 100,
    created_at: "2026-07-29T00:00:00Z",
    file_count: 1,
    files: [{ name: "full-recording-name.mcap", size: 1024 }],
    message: "完成",
    min_decode_ratio: 0.9,
    create_lerobot: false,
    results: [],
    lerobot_results: [],
    lerobot_errors: [],
    succeeded_count: 1,
    failed_count: 0,
    ...overrides,
  };
}

function successfulResult(source, topics = ["/ego/camera/0"]) {
  return {
    source,
    name: `${source}.mp4`,
    size: 100,
    view_url: "/view/video",
    download_url: "/download/video",
    report_url: "/download/report",
    analysis: {
      status: "PASS",
      counts: {},
      metrics: [],
      selected_topics: topics.map((topic) => ({ topic })),
    },
  };
}

test("single and multi-file task names preserve the intended context", () => {
  const single = job();
  assert.equal(getJobDisplayName(single), "full-recording-name.mcap");

  const batch = job({
    file_count: 3,
    files: [
      { name: "first.mcap", size: 1 },
      { name: "second.mcap", size: 2 },
      { name: "third.mcap", size: 3 },
    ],
  });
  assert.equal(getJobDisplayName(batch), "批量任务 · 3 个 MCAP 文件");
  assert.equal(getJobFileSummary(batch), "first.mcap，以及另外 2 个文件");
});

test("normalizes partial multi-file results independently", () => {
  const batch = job({
    status: "failed",
    file_count: 2,
    files: [{ name: "good.mcap", size: 10 }, { name: "bad.mcap", size: 20 }],
    results: [successfulResult("good.mcap")],
  });
  const files = normalizeFileResults(batch);
  assert.deepEqual(
    files.map((file) => [file.name, file.videoStatus, file.analysisStatus]),
    [
      ["good.mcap", "completed", "completed"],
      ["bad.mcap", "failed", "failed"],
    ],
  );
  assert.equal(getJobDisplayStatus(batch), "failed");
});

test("keeps successful video and analysis task completed when LeRobot is unsupported", () => {
  const source = "standard-camera.mcap";
  const unsupported = job({
    status: "failed",
    create_lerobot: true,
    files: [{ name: source, size: 10 }],
    results: [successfulResult(source, ["/robot0/sensor/stereo/compressed"])],
    lerobot_errors: [{
      source,
      error: "RuntimeError: RuntimeError: 未找到 /ego/camera/0 视频流；LeRobot 导出仅支持 LivUMI Ego 主相机数据",
    }],
  });
  assert.equal(normalizeFileResults(unsupported)[0].lerobotStatus, "unsupported");
  assert.equal(getJobDisplayStatus(unsupported), "completed");
});

test("keeps successful video and analysis completed after a real LeRobot failure", () => {
  const source = "stereo failed.mcap";
  const failed = job({
    status: "failed",
    create_lerobot: true,
    files: [{ name: source, size: 10 }],
    results: [successfulResult(source)],
    lerobot_errors: [{ source, error: "RuntimeError: 没有可导出的同步 episode" }],
  });
  assert.equal(normalizeFileResults(failed)[0].lerobotStatus, "failed");
  assert.equal(getJobDisplayStatus(failed), "completed");
});

test("distinguishes LeRobot requested states per file", () => {
  const pending = job({ status: "processing", create_lerobot: true });
  assert.equal(normalizeFileResults(pending)[0].lerobotStatus, "pending");

  const notRequested = job({ results: [successfulResult("full-recording-name.mcap")] });
  assert.equal(normalizeFileResults(notRequested)[0].lerobotStatus, "not_requested");

  const completed = job({
    create_lerobot: true,
    results: [successfulResult("full-recording-name.mcap")],
    lerobot_results: [{ source: "full-recording-name.mcap", name: "dataset.zip", archive_size: 1, download_url: "/d", info_url: "/i" }],
  });
  assert.equal(normalizeFileResults(completed)[0].lerobotStatus, "completed");

  const failed = job({
    create_lerobot: true,
    results: [successfulResult("full-recording-name.mcap")],
    lerobot_errors: [{ source: "full-recording-name.mcap", error: "RuntimeError: archive write failed" }],
  });
  assert.equal(normalizeFileResults(failed)[0].lerobotStatus, "failed");
});

test("does not let one incompatible file overwrite another successful LeRobot result", () => {
  const batch = job({
    create_lerobot: true,
    file_count: 2,
    files: [{ name: "ego.mcap", size: 1 }, { name: "other.mcap", size: 2 }],
    results: [
      successfulResult("ego.mcap"),
      successfulResult("other.mcap", ["/robot0/camera"]),
    ],
    lerobot_results: [{ source: "ego.mcap", name: "ego.zip", archive_size: 1, download_url: "/d", info_url: "/i" }],
    lerobot_errors: [{ source: "other.mcap", error: "未找到 /ego/camera/0 视频流" }],
  });
  assert.deepEqual(normalizeFileResults(batch).map((file) => file.lerobotStatus), ["completed", "unsupported"]);
});

test("cleans and classifies LeRobot errors without duplicate RuntimeError", () => {
  const raw = "RuntimeError: RuntimeError: 未找到 /ego/camera/0 视频流；LeRobot 导出仅支持 LivUMI Ego 主相机数据";
  assert.equal(stripRepeatedErrorPrefix(raw), "未找到 /ego/camera/0 视频流；LeRobot 导出仅支持 LivUMI Ego 主相机数据");
  assert.equal(classifyLerobotError(raw), "unsupported");
  assert.equal(classifyLerobotError("RuntimeError: disk full"), "failed");
  const formatted = formatLerobotError(raw);
  assert.equal(formatted.title, "该文件不支持生成 LeRobot V3.0");
  assert.match(formatted.description, /\/ego\/camera\/0/);
  assert.doesNotMatch(formatted.detail, /RuntimeError:\s*RuntimeError:/);
});

test("normalizes mono, stereo and future preview payloads without requiring optional fields", () => {
  const [legacy, stereo, alias] = adapter.normalizeLerobotResults([
    { source: "中文 文件.mcap", name: "legacy", download_url: "/d", info_url: "/i" },
    {
      source: "two-stream.mcap",
      name: "stereo",
      robot_type: "LivUMI-Ego-Lite-stereo",
      preview_url: "/old-left.mp4",
      camera_previews: [
        { key: "observation.images.left", label: "左相机", preview_url: "/left.mp4" },
        { key: "observation.images.right", label: "右相机", preview_url: "/right.mp4" },
      ],
      unknown_future_field: { safe: true },
    },
    { source: "side-by-side.mcap", name: "sbs", robot_type: "custom-stereo-side-by-side", previews: [{ label: "拼接源", preview_url: "/sbs.mp4" }] },
  ]);
  assert.equal(legacy.robot_type, undefined);
  assert.deepEqual(lerobotDisplay.getDatasetPreviews(legacy), []);
  assert.equal(lerobotDisplay.isStereoDataset(stereo), true);
  assert.deepEqual(lerobotDisplay.getDatasetPreviews(stereo).map((item) => item.label), ["左相机", "右相机"]);
  assert.equal(lerobotDisplay.getDatasetPreviews(stereo)[0].preview_url, "/left.mp4");
  assert.equal(lerobotDisplay.isStereoDataset(alias), true);
  assert.equal(lerobotDisplay.getDatasetPreviews(alias)[0].preview_url, "/sbs.mp4");
});

test("labels a lone legacy preview as left camera and suppresses an old same-source failure", () => {
  const result = {
    source: "目录/中文 空格.mcap",
    name: "dataset",
    archive_size: 1,
    download_url: "/d",
    info_url: "/i",
    preview_url: "/preview.mp4",
  };
  assert.equal(lerobotDisplay.getDatasetPreviews(result)[0].label, "左相机预览");
  assert.deepEqual(lerobotDisplay.getDatasetPreviews({ ...result, preview_url: undefined }), []);
  assert.deepEqual(lerobotDisplay.currentLerobotErrors({
    lerobot_results: [result],
    lerobot_errors: [
      { source: "中文 空格.mcap", error: "旧失败" },
      { source: "other.mcap", error: "当前失败" },
    ],
  }), [{ source: "other.mcap", error: "当前失败" }]);
});

if (process.env.MCAP_JOBS_FIXTURE) {
  test("normalizes the current Agent multi-file response and remains stable after refresh", async () => {
    const payload = JSON.parse(await readFile(process.env.MCAP_JOBS_FIXTURE, "utf8"));
    const multiFileJob = payload.find((item) =>
      item.files?.length > 1
      && item.results?.length
      && item.lerobot_errors?.some((error) => /\/ego\/camera\/0/.test(error.error)),
    );
    assert.ok(multiFileJob, "真实接口中应存在可验证的多文件 LeRobot 不兼容任务");

    const firstRead = normalizeFileResults(multiFileJob);
    const refreshedRead = normalizeFileResults(JSON.parse(JSON.stringify(multiFileJob)));
    assert.equal(firstRead.length, multiFileJob.files.length);
    assert.deepEqual(refreshedRead, firstRead);
    assert.ok(firstRead.every((file) => file.videoStatus === "completed"));
    assert.ok(firstRead.every((file) => file.analysisStatus === "completed"));
    assert.ok(firstRead.every((file) => file.lerobotStatus === "unsupported"));
    assert.equal(getJobDisplayStatus(multiFileJob), "completed");
  });
}
