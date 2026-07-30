import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

function moduleUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

const errorUrl = moduleUrl(stripTypeScriptTypes(await source("../app/lib/errorFormatter.ts"), { mode: "transform" }));
const jobDisplayUrl = moduleUrl(stripTypeScriptTypes(
  (await source("../app/lib/jobDisplay.ts")).replace("\"./errorFormatter\"", JSON.stringify(errorUrl)),
  { mode: "transform" },
));
const lerobotDisplayUrl = moduleUrl(stripTypeScriptTypes(
  await source("../app/lib/lerobotDisplay.ts"),
  { mode: "transform" },
));
const historyManagerUrl = moduleUrl(stripTypeScriptTypes(
  (await source("../app/lib/historyManager.ts"))
    .replace("\"./errorFormatter\"", JSON.stringify(errorUrl))
    .replace("\"./jobDisplay\"", JSON.stringify(jobDisplayUrl))
    .replace("\"./lerobotDisplay\"", JSON.stringify(lerobotDisplayUrl)),
  { mode: "transform" },
));

const history = await import(historyManagerUrl);
const summary = await import(moduleUrl(stripTypeScriptTypes(await source("../app/lib/historySummary.ts"), { mode: "transform" })));
const filters = await import(moduleUrl(stripTypeScriptTypes(await source("../app/lib/historyFilters.ts"), { mode: "transform" })));
const settings = await import(moduleUrl(stripTypeScriptTypes(await source("../app/lib/uploadSettings.ts"), { mode: "transform" })));

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function job(overrides = {}) {
  return {
    id: "job-1",
    status: "completed",
    progress: 100,
    created_at: "2026-07-27T00:00:00.000Z",
    updated_at: "2026-07-27T01:00:00.000Z",
    finished_at: "2026-07-27T02:00:00.000Z",
    file_count: 1,
    files: [{ name: "recording.mcap", size: 1024 }],
    message: "完成",
    min_decode_ratio: 1,
    create_lerobot: true,
    lerobot_fps: 12,
    results: [{
      source: "recording.mcap",
      name: "recording.mp4",
      size: 500,
      view_url: "/view",
      download_url: "/download",
      report_url: "/report",
      analysis: {
        status: "PASS",
        counts: { PASS: 3, CHECK: 1, FAIL: 0, "N/A": 2 },
        duration_s: 60,
        metrics: [],
        selected_topics: [{ topic: "/ego/camera/0" }],
      },
    }],
    lerobot_results: [{
      source: "recording.mcap",
      name: "dataset.zip",
      archive_size: 100,
      download_url: "/dataset",
      info_url: "/info",
    }],
    lerobot_errors: [],
    succeeded_count: 1,
    failed_count: 0,
    ...overrides,
  };
}

test("highest-quality upload defaults and FormData values are exact", () => {
  assert.deepEqual(settings.HIGHEST_QUALITY_DEFAULTS, {
    minDecodeRatio: "1.00",
    createLerobot: true,
    lerobotFps: "12",
  });
  const formData = new FormData();
  settings.appendUploadSettings(formData, settings.HIGHEST_QUALITY_DEFAULTS);
  assert.equal(formData.get("min_decode_ratio"), "1.0");
  assert.equal(formData.get("create_lerobot"), "true");
  assert.equal(formData.get("lerobot_fps"), "12");
});

test("upload settings persist and reset to defaults when cache is absent", () => {
  const storage = memoryStorage();
  assert.deepEqual(settings.loadUploadSettings(storage), settings.HIGHEST_QUALITY_DEFAULTS);
  const custom = { minDecodeRatio: "0.99", createLerobot: false, lerobotFps: "24" };
  settings.saveUploadSettings(storage, custom);
  assert.deepEqual(settings.loadUploadSettings(storage), { ...custom, lerobotFps: "12" });
  storage.removeItem(settings.UPLOAD_SETTINGS_KEY);
  assert.deepEqual(settings.loadUploadSettings(storage), settings.HIGHEST_QUALITY_DEFAULTS);
});

test("archives terminal jobs at the exact 24-hour boundary", () => {
  const finished = Date.parse("2026-07-27T02:00:00.000Z");
  const item = job();
  assert.equal(history.isArchivedJob(item, finished + history.ARCHIVE_AFTER_MS - 60_000), false);
  assert.equal(history.isArchivedJob(item, finished + history.ARCHIVE_AFTER_MS), true);
  assert.equal(history.isArchivedJob(item, finished + history.ARCHIVE_AFTER_MS + 60_000), true);
});

test("never archives active jobs and falls back from finished_at to updated_at", () => {
  const now = Date.parse("2026-07-29T03:00:00.000Z");
  assert.equal(history.isArchivedJob(job({ status: "processing" }), now), false);
  assert.equal(history.isArchivedJob(job({ status: "queued" }), now), false);
  const fallback = job({ finished_at: undefined, updated_at: "2026-07-27T01:00:00.000Z" });
  assert.equal(history.getArchiveTimestamp(fallback), Date.parse("2026-07-27T01:00:00.000Z"));
  assert.equal(history.isArchivedJob(fallback, now), true);
});

test("partitions recent and archived jobs without losing active work", () => {
  const now = Date.parse("2026-07-29T03:00:00.000Z");
  const recent = job({ id: "recent", finished_at: "2026-07-28T12:00:00.000Z" });
  const old = job({ id: "old" });
  const active = job({ id: "active", status: "processing", created_at: "2026-07-01T00:00:00.000Z" });
  const result = history.partitionCurrentAndHistory([recent, old, active], now);
  assert.deepEqual(result.current.map((item) => item.id), ["recent", "active"]);
  assert.deepEqual(result.archived.map((item) => item.id), ["old"]);
});

test("creates compact multi-file records and accurate daily totals", () => {
  const multi = job({
    id: "multi",
    file_count: 2,
    files: [{ name: "a.mcap", size: 100 }, { name: "b.mcap", size: 200 }],
    results: [
      job().results[0],
      { ...job().results[0], source: "b.mcap", analysis: { ...job().results[0].analysis, counts: { PASS: 2, CHECK: 0, FAIL: 1, "N/A": 0 }, duration_s: 30 } },
    ],
    succeeded_count: 2,
  });
  const record = history.createHistoryRecord(multi);
  assert.equal(record.fileCount, 2);
  assert.equal(record.totalSize, 300);
  assert.equal(record.durationSeconds, 90);
  assert.deepEqual(record.qualityCounts, { PASS: 5, CHECK: 1, FAIL: 1, "N/A": 2 });
  const daily = summary.createDailySummary([record, history.createHistoryRecord(job({ id: "single" }))]);
  assert.equal(daily.taskCount, 2);
  assert.equal(daily.fileCount, 3);
  assert.equal(daily.successfulTasks, 2);
  assert.equal(daily.failedTasks, 0);
});

test("deduplicates history by job id and keeps the newer state", () => {
  const older = history.createHistoryRecord(job({ status: "failed", updated_at: "2026-07-27T01:00:00.000Z" }));
  const newer = history.createHistoryRecord(job({ status: "completed", updated_at: "2026-07-28T01:00:00.000Z" }));
  const merged = history.mergeHistoryRecords([older], [newer, newer]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, "completed");
});

test("local history remains readable offline and prunes records after 90 days", () => {
  const storage = memoryStorage();
  const record = history.createHistoryRecord(job());
  history.saveHistory(storage, [record], Date.parse("2026-07-29T00:00:00.000Z"));
  assert.equal(history.loadHistory(storage, Date.parse("2026-07-29T00:00:00.000Z")).length, 1);
  assert.equal(history.loadHistory(storage, Date.parse("2026-11-01T00:00:00.000Z")).length, 0);
});

test("history search, filters, sorting and 20-item pagination work", () => {
  const records = Array.from({ length: 25 }, (_, index) => ({
    ...history.createHistoryRecord(job({ id: `job-${index}`, files: [{ name: index === 4 ? "target.mcap" : `file-${index}.mcap`, size: index + 1 }] })),
    totalSize: index + 1,
    qualityStatus: index === 4 ? "FAIL" : "PASS",
  }));
  const found = filters.filterAndSortHistory(records, {
    search: "target", from: "", to: "", status: "all", quality: "FAIL", lerobot: "completed", sort: "newest",
  });
  assert.equal(found.length, 1);
  assert.equal(found[0].id, "job-4");
  const page = filters.paginateHistory(records, 2, 20);
  assert.equal(page.pages, 2);
  assert.equal(page.records.length, 5);
});

if (process.env.MCAP_JOBS_FIXTURE) {
  test("classifies and summarizes the current Agent response without losing files", async () => {
    const jobs = JSON.parse(await readFile(process.env.MCAP_JOBS_FIXTURE, "utf8"));
    const partitioned = history.partitionCurrentAndHistory(jobs, Date.now());
    assert.equal(partitioned.current.length + partitioned.archived.length, jobs.length);
    const records = partitioned.archived.map(history.createHistoryRecord);
    records.forEach((record) => {
      const source = jobs.find((item) => item.id === record.id);
      assert.equal(record.fileCount, source.files.length);
      assert.equal(record.totalSize, source.files.reduce((sum, file) => sum + file.size, 0));
    });
    assert.equal(history.mergeHistoryRecords(records, records).length, records.length);
  });
}
