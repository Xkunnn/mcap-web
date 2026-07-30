import type { Job, LeRobotResult } from "../types";
import { stripRepeatedErrorPrefix } from "./errorFormatter";
import { getJobDisplayStatus, normalizeFileResults, type LerobotStatus } from "./jobDisplay";
import { currentLerobotErrors, latestLerobotResults } from "./lerobotDisplay";

export const HISTORY_STORAGE_KEY = "mcap-web-history-v1";
export const ARCHIVE_AFTER_MS = 24 * 60 * 60 * 1000;
export const HISTORY_RETENTION_DAYS = 90;

export type QualityCounts = { PASS: number; CHECK: number; FAIL: number; "N/A": number };

export type HistoryRecord = {
  id: string;
  status: Job["status"];
  progress: number;
  createdAt: string;
  updatedAt?: string;
  finishedAt?: string;
  archiveTimestamp: string;
  files: {
    name: string;
    size: number;
    videoStatus: string;
    analysisStatus: string;
    lerobotStatus: LerobotStatus;
  }[];
  fileCount: number;
  totalSize: number;
  durationSeconds?: number;
  succeededCount: number;
  failedCount: number;
  qualityCounts: QualityCounts;
  qualityStatus: "PASS" | "CHECK" | "FAIL" | "N/A";
  videoResults: {
    source: string;
    name: string;
    size: number;
    topic?: string;
    viewUrl?: string;
    downloadUrl: string;
    reportUrl: string;
  }[];
  analysisResults: {
    source: string;
    status: string;
    counts: QualityCounts;
    durationSeconds?: number;
    reportUrl?: string;
  }[];
  lerobotResults: {
    source: string;
    name: string;
    archiveSize: number;
    downloadUrl: string;
    infoUrl: string;
    previewUrl?: string;
    robotType?: string;
    version?: string;
    fps?: number;
    cameraPreviews?: { key?: string; label?: string; previewUrl: string }[];
  }[];
  lerobotUnsupportedCount: number;
  errors: { source?: string; message: string }[];
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function validTimestamp(value?: string): number {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function getArchiveTimestamp(job: Pick<Job, "finished_at" | "updated_at" | "created_at">): number {
  return validTimestamp(job.finished_at) || validTimestamp(job.updated_at) || validTimestamp(job.created_at);
}

export function isArchivedJob(job: Job, now = Date.now()): boolean {
  if (job.status === "queued" || job.status === "processing") return false;
  const timestamp = getArchiveTimestamp(job);
  return timestamp > 0 && now - timestamp >= ARCHIVE_AFTER_MS;
}

export function partitionCurrentAndHistory(jobs: Job[], now = Date.now()) {
  const current: Job[] = [];
  const archived: Job[] = [];
  jobs.forEach((job) => (isArchivedJob(job, now) ? archived : current).push(job));
  return { current, archived };
}

function emptyCounts(): QualityCounts {
  return { PASS: 0, CHECK: 0, FAIL: 0, "N/A": 0 };
}

function analysisCounts(job: Job): QualityCounts {
  const counts = emptyCounts();
  const seen = new Set<string>();
  job.results.forEach((result) => {
    if (!result.analysis || seen.has(result.source)) return;
    seen.add(result.source);
    Object.keys(counts).forEach((key) => {
      counts[key as keyof QualityCounts] += Number(result.analysis?.counts?.[key] || 0);
    });
  });
  return counts;
}

function qualityStatus(counts: QualityCounts): HistoryRecord["qualityStatus"] {
  if (counts.FAIL > 0) return "FAIL";
  if (counts.CHECK > 0) return "CHECK";
  if (counts.PASS > 0) return "PASS";
  return "N/A";
}

function slimLerobot(result: LeRobotResult): HistoryRecord["lerobotResults"][number] {
  return {
    source: result.source,
    name: result.name,
    archiveSize: result.archive_size,
    downloadUrl: result.download_url,
    infoUrl: result.info_url,
    previewUrl: result.preview_url,
    robotType: result.robot_type,
    version: result.version,
    fps: result.fps,
    cameraPreviews: result.camera_previews?.map((preview) => ({
      key: preview.key,
      label: preview.label,
      previewUrl: preview.preview_url,
    })),
  };
}

export function createHistoryRecord(job: Job): HistoryRecord {
  const files = normalizeFileResults(job);
  const counts = analysisCounts(job);
  const durations = [...new Map(
    job.results
      .filter((result) => result.analysis?.duration_s != null)
      .map((result) => [result.source, result.analysis?.duration_s || 0]),
  ).values()];
  const archiveTime = getArchiveTimestamp(job);
  return {
    id: job.id,
    status: getJobDisplayStatus(job),
    progress: job.progress,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    finishedAt: job.finished_at,
    archiveTimestamp: new Date(archiveTime || Date.now()).toISOString(),
    files: files.map((file) => ({
      name: file.name,
      size: file.size,
      videoStatus: file.videoStatus,
      analysisStatus: file.analysisStatus,
      lerobotStatus: file.lerobotStatus,
    })),
    fileCount: files.length || job.file_count,
    totalSize: job.files.reduce((sum, file) => sum + file.size, 0),
    durationSeconds: durations.length ? durations.reduce((sum, value) => sum + value, 0) : undefined,
    succeededCount: job.succeeded_count,
    failedCount: job.failed_count,
    qualityCounts: counts,
    qualityStatus: qualityStatus(counts),
    videoResults: job.results
      .filter((result) => !result.analysis_only && Boolean(result.download_url))
      .map((result) => ({
        source: result.source,
        name: result.name,
        size: result.size,
        topic: result.topic,
        viewUrl: result.view_url,
        downloadUrl: result.download_url,
        reportUrl: result.report_url,
      })),
    analysisResults: [...new Map(
      job.results.filter((result) => result.analysis).map((result) => [result.source, {
        source: result.source,
        status: result.analysis?.status || "N/A",
        counts: {
          PASS: Number(result.analysis?.counts?.PASS || 0),
          CHECK: Number(result.analysis?.counts?.CHECK || 0),
          FAIL: Number(result.analysis?.counts?.FAIL || 0),
          "N/A": Number(result.analysis?.counts?.["N/A"] || 0),
        },
        durationSeconds: result.analysis?.duration_s,
        reportUrl: result.analysis?.report_url,
      }]),
    ).values()],
    lerobotResults: latestLerobotResults(job.lerobot_results).map(slimLerobot),
    lerobotUnsupportedCount: files.filter((file) => file.lerobotStatus === "unsupported").length,
    errors: [
      ...(job.error ? [{ message: stripRepeatedErrorPrefix(job.error) }] : []),
      ...currentLerobotErrors(job).map((error) => ({
        source: error.source,
        message: stripRepeatedErrorPrefix(error.error),
      })),
    ],
  };
}

function recordTimestamp(record: HistoryRecord): number {
  return Math.max(
    validTimestamp(record.finishedAt),
    validTimestamp(record.updatedAt),
    validTimestamp(record.archiveTimestamp),
    validTimestamp(record.createdAt),
  );
}

export function mergeHistoryRecords(existing: HistoryRecord[], incoming: HistoryRecord[]): HistoryRecord[] {
  const records = new Map(existing.map((record) => [record.id, record]));
  incoming.forEach((record) => {
    const previous = records.get(record.id);
    if (!previous || recordTimestamp(record) >= recordTimestamp(previous)) records.set(record.id, record);
  });
  return [...records.values()].sort((a, b) => recordTimestamp(b) - recordTimestamp(a));
}

export function pruneExpiredHistory(
  records: HistoryRecord[],
  retentionDays = HISTORY_RETENTION_DAYS,
  now = Date.now(),
): HistoryRecord[] {
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  return records.filter((record) => recordTimestamp(record) >= cutoff);
}

export function loadHistory(storage: StorageLike, now = Date.now()): HistoryRecord[] {
  try {
    const raw = storage.getItem(HISTORY_STORAGE_KEY);
    return pruneExpiredHistory(raw ? JSON.parse(raw) : [], HISTORY_RETENTION_DAYS, now);
  } catch {
    return [];
  }
}

export function saveHistory(storage: StorageLike, records: HistoryRecord[], now = Date.now()): HistoryRecord[] {
  const pruned = pruneExpiredHistory(records, HISTORY_RETENTION_DAYS, now);
  storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(pruned));
  return pruned;
}

export function clearHistory(storage: StorageLike): void {
  storage.removeItem(HISTORY_STORAGE_KEY);
}
