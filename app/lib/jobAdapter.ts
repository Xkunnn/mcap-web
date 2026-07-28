import type { AnalysisMetric, Job, LeRobotResult, McapAnalysis, ResultItem, TopicCandidate } from "../types";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}
function number(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function optionalNumber(value: unknown): number | undefined {
  if (value == null || value === "" || value === "N/A" || value === "-") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeStatus(value: unknown): Job["status"] {
  const status = text(value).toLowerCase();
  if (["queued", "pending", "waiting"].includes(status)) return "queued";
  if (["running", "processing"].includes(status)) return "processing";
  if (["completed", "success", "succeeded", "done"].includes(status)) return "completed";
  return "failed";
}

function normalizeMetric(value: unknown): AnalysisMetric {
  const item = record(value);
  return {
    metric: text(item.metric, "未命名指标"),
    topic: text(item.topic) || undefined,
    target: text(item.target) || undefined,
    actual: text(item.actual) || undefined,
    result: text(item.result, "N/A").toUpperCase(),
    note: text(item.note) || undefined,
  };
}

function normalizeTopic(value: unknown): TopicCandidate {
  const item = record(value);
  return {
    topic: text(item.topic, "—"),
    kind: text(item.kind) || undefined,
    media_format: text(item.media_format) || undefined,
    message_count: optionalNumber(item.message_count),
    hz: optionalNumber(item.hz),
  };
}

export function normalizeAnalysis(value: unknown): McapAnalysis | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = record(value);
  const frame = record(item.frame_diagnostics);
  const sensors = record(item.sensors);
  return {
    status: text(item.status, "ERROR").toUpperCase() as McapAnalysis["status"],
    counts: Object.fromEntries(Object.entries(record(item.counts)).map(([key, count]) => [key, number(count)])),
    file_size_mb: optionalNumber(item.file_size_mb),
    duration_s: optionalNumber(item.duration_s),
    total_messages: optionalNumber(item.total_messages),
    topic_count: optionalNumber(item.topic_count),
    total_payload_bytes: optionalNumber(item.total_payload_bytes),
    capture_efficiency_pct: optionalNumber(item.capture_efficiency_pct),
    frame_diagnostics: Object.keys(frame).length ? {
      topic: text(frame.topic) || undefined,
      frame_count: optionalNumber(frame.frame_count),
      average_fps: optionalNumber(frame.average_fps),
      interval_p95_ms: optionalNumber(frame.interval_p95_ms),
      interval_max_ms: optionalNumber(frame.interval_max_ms),
      estimated_missing_frames: optionalNumber(frame.estimated_missing_frames),
    } : undefined,
    metrics: array(item.metrics).map(normalizeMetric),
    selected_topics: array(item.selected_topics).map(normalizeTopic),
    sensors: Object.keys(sensors).length ? sensors as McapAnalysis["sensors"] : undefined,
    error: text(item.error) || undefined,
    report_url: text(item.report_url) || undefined,
  };
}

export function normalizeVideoResults(value: unknown): ResultItem[] {
  return array(value).map((raw, index) => {
    const item = record(raw);
    return {
      source: text(item.source, `MCAP ${index + 1}`),
      name: text(item.name, `video-${index + 1}.mp4`),
      topic: text(item.topic) || undefined,
      codec: text(item.codec) || undefined,
      width: optionalNumber(item.width),
      height: optionalNumber(item.height),
      frames: optionalNumber(item.frames),
      completeness_pct: optionalNumber(item.completeness_pct),
      fps: optionalNumber(item.fps),
      blur_score: optionalNumber(item.blur_score),
      crop_applied: Boolean(item.crop_applied),
      method: text(item.method) || undefined,
      size: number(item.size),
      view_url: text(item.view_url) || undefined,
      download_url: text(item.download_url),
      report_url: text(item.report_url),
      analysis: normalizeAnalysis(item.analysis),
      analysis_only: Boolean(item.analysis_only),
    };
  });
}

export function normalizeLerobotResults(value: unknown): LeRobotResult[] {
  return array(value).map((raw, index) => {
    const item = record(raw);
    return {
      source: text(item.source, `MCAP ${index + 1}`),
      name: text(item.name, `lerobot-${index + 1}`),
      version: text(item.version) || undefined,
      robot_type: text(item.robot_type) || undefined,
      fps: optionalNumber(item.fps),
      episodes: optionalNumber(item.episodes),
      frames: optionalNumber(item.frames),
      completeness_pct: optionalNumber(item.completeness_pct),
      data_size_mb: optionalNumber(item.data_size_mb),
      video_size_mb: optionalNumber(item.video_size_mb),
      archive_size: number(item.archive_size),
      download_url: text(item.download_url),
      info_url: text(item.info_url),
      preview_url: text(item.preview_url) || undefined,
    };
  });
}

export function normalizeJob(value: unknown): Job {
  const item = record(value);
  const files = array(item.files).map((raw) => {
    const file = record(raw);
    return { name: text(file.name, "unknown.mcap"), size: number(file.size) };
  });
  return {
    id: text(item.id),
    status: normalizeStatus(item.status),
    progress: Math.min(100, Math.max(0, number(item.progress))),
    created_at: text(item.created_at, new Date(0).toISOString()),
    updated_at: text(item.updated_at) || undefined,
    started_at: text(item.started_at) || undefined,
    finished_at: text(item.finished_at) || undefined,
    files,
    file_count: number(item.file_count, files.length),
    message: text(item.message),
    min_decode_ratio: number(item.min_decode_ratio, 0.9),
    create_lerobot: Boolean(item.create_lerobot),
    lerobot_fps: optionalNumber(item.lerobot_fps),
    results: normalizeVideoResults(item.results),
    lerobot_results: normalizeLerobotResults(item.lerobot_results),
    lerobot_errors: array(item.lerobot_errors).map((raw) => {
      const error = record(raw);
      return { source: text(error.source, "LeRobot"), error: text(error.error, "未知错误") };
    }),
    succeeded_count: number(item.succeeded_count),
    failed_count: number(item.failed_count),
    return_code: optionalNumber(item.return_code),
    pending_operation: text(item.pending_operation) || undefined,
    error: text(item.error) || undefined,
  };
}

export function normalizeJobs(value: unknown): Job[] {
  return array(value).map(normalizeJob).filter((job) => job.id);
}

export function jobFailureDetails(job: Job): string[] {
  const messages = [job.message, job.error].filter(Boolean) as string[];
  job.results.forEach((result) => {
    if (result.analysis?.error) messages.push(`${result.source}: ${result.analysis.error}`);
  });
  job.lerobot_errors?.forEach((item) => messages.push(`${item.source}: ${item.error}`));
  if (job.return_code != null && job.return_code !== 0) messages.push(`进程返回码：${job.return_code}`);
  return [...new Set(messages)];
}
