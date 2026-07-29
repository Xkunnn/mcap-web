import type { Job, ResultItem } from "../types";
import { classifyLerobotError } from "./errorFormatter";

export type LerobotStatus = "not_requested" | "pending" | "completed" | "unsupported" | "failed";
export type FileStageStatus = "not_requested" | "pending" | "completed" | "failed";

export type NormalizedFileResult = {
  index: number;
  name: string;
  size: number;
  videoStatus: FileStageStatus;
  analysisStatus: FileStageStatus;
  lerobotStatus: LerobotStatus;
  results: ResultItem[];
  lerobotResults: NonNullable<Job["lerobot_results"]>;
  lerobotErrors: NonNullable<Job["lerobot_errors"]>;
  hasEgoCameraTopic: boolean;
  hasTopicEvidence: boolean;
};

function sourceKey(value: string): string {
  return value.replaceAll("\\", "/").split("/").pop()?.trim().toLocaleLowerCase() || "";
}

function sameSource(source: string, fileName: string): boolean {
  return sourceKey(source) === sourceKey(fileName);
}

function topicEvidence(results: ResultItem[]) {
  const topics = results.flatMap((result) => [
    result.topic,
    ...(result.analysis?.selected_topics || []).map((topic) => topic.topic),
  ]).filter((topic): topic is string => Boolean(topic));
  return {
    hasTopicEvidence: topics.length > 0,
    hasEgoCameraTopic: topics.some((topic) => topic === "/ego/camera/0"),
  };
}

export function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

export function getJobDisplayName(job: Job): string {
  const count = job.files.length || job.file_count;
  if (count === 1) return job.files[0]?.name || "未命名 MCAP 文件";
  return `批量任务 · ${count} 个 MCAP 文件`;
}

export function getJobFileSummary(job: Job): string {
  const count = job.files.length || job.file_count;
  if (!count) return "未找到 MCAP 文件";
  if (count === 1) return formatFileSize(job.files[0]?.size || 0);
  return `${job.files[0]?.name || "未命名 MCAP 文件"}，以及另外 ${count - 1} 个文件`;
}

export function normalizeFileResults(job: Job): NormalizedFileResult[] {
  const busy = job.status === "queued" || job.status === "processing";
  const terminal = job.status === "completed" || job.status === "failed";

  return job.files.map((file, index) => {
    const results = job.results.filter((result) => sameSource(result.source, file.name));
    const lerobotResults = (job.lerobot_results || []).filter((result) => sameSource(result.source, file.name));
    const lerobotErrors = (job.lerobot_errors || []).filter((error) => sameSource(error.source, file.name));
    const videos = results.filter((result) => !result.analysis_only && Boolean(result.view_url || result.download_url));
    const analyses = results.filter((result) => Boolean(result.analysis));
    const evidence = topicEvidence(results);

    let lerobotStatus: LerobotStatus = "not_requested";
    if (lerobotResults.length) {
      lerobotStatus = "completed";
    } else if (lerobotErrors.length) {
      lerobotStatus = lerobotErrors.every((item) => classifyLerobotError(item.error) === "unsupported")
        ? "unsupported"
        : "failed";
    } else if (evidence.hasTopicEvidence && !evidence.hasEgoCameraTopic) {
      lerobotStatus = "unsupported";
    } else if (busy && (job.create_lerobot || job.pending_operation === "lerobot")) {
      lerobotStatus = "pending";
    } else if (terminal && job.create_lerobot) {
      lerobotStatus = "failed";
    }

    return {
      index,
      name: file.name,
      size: file.size,
      videoStatus: videos.length ? "completed" : busy ? "pending" : terminal ? "failed" : "not_requested",
      analysisStatus: analyses.some((result) => !result.analysis?.error)
        ? "completed"
        : analyses.length
          ? "failed"
          : busy
            ? "pending"
            : terminal
              ? "failed"
              : "not_requested",
      lerobotStatus,
      results,
      lerobotResults,
      lerobotErrors,
      ...evidence,
    };
  });
}

export function getJobDisplayStatus(job: Job): Job["status"] {
  if (job.status !== "failed") return job.status;
  const files = normalizeFileResults(job);
  const primarySucceeded = files.length > 0 && files.every(
    (file) => file.videoStatus === "completed" && file.analysisStatus === "completed",
  );
  const lerobotNonFatal = files.every(
    (file) => file.lerobotStatus === "completed"
      || file.lerobotStatus === "unsupported"
      || file.lerobotStatus === "not_requested",
  );
  return primarySucceeded && lerobotNonFatal ? "completed" : job.status;
}

export function isJobLerobotUnsupported(job: Job): boolean {
  const files = normalizeFileResults(job);
  return files.length > 0 && files.every((file) => file.lerobotStatus === "unsupported");
}

export const fileStageLabels: Record<FileStageStatus, string> = {
  not_requested: "未请求",
  pending: "处理中",
  completed: "成功",
  failed: "失败",
};

export const lerobotStatusLabels: Record<LerobotStatus, string> = {
  not_requested: "未请求",
  pending: "处理中",
  completed: "已生成",
  unsupported: "不兼容",
  failed: "失败",
};
