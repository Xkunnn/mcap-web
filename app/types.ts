export type UploadFileItem = { file: File; key: string };

export type AnalysisMetric = {
  metric: string;
  topic?: string;
  target?: string;
  actual?: string;
  result: "PASS" | "CHECK" | "FAIL" | "N/A" | string;
  note?: string;
};

export type TopicCandidate = {
  topic: string;
  kind?: string;
  media_format?: string;
  message_count?: number;
  hz?: number;
};

export type McapAnalysis = {
  status: "PASS" | "CHECK" | "FAIL" | "ERROR";
  counts: Record<string, number>;
  file_size_mb?: number;
  duration_s?: number;
  total_messages?: number;
  topic_count?: number;
  total_payload_bytes?: number;
  capture_efficiency_pct?: number;
  frame_diagnostics?: {
    topic?: string;
    frame_count?: number;
    average_fps?: number;
    interval_p95_ms?: number;
    interval_max_ms?: number;
    estimated_missing_frames?: number;
  };
  metrics: AnalysisMetric[];
  selected_topics: TopicCandidate[];
  sensors?: Record<string, {
    kind: string;
    status: string;
    topic?: string;
    format?: string;
    rate?: string;
    rate_target?: string;
    resolution?: string;
    resolution_target?: string;
    count?: number | string;
    rate_unit?: string;
  }>;
  error?: string;
  report_url?: string;
};

export type ResultItem = {
  source: string;
  name: string;
  topic?: string;
  codec?: string;
  width?: number;
  height?: number;
  frames?: number;
  completeness_pct?: number;
  fps?: number;
  blur_score?: number;
  crop_applied?: boolean;
  method?: string;
  size: number;
  view_url?: string;
  download_url: string;
  report_url: string;
  analysis?: McapAnalysis;
};

export type LeRobotResult = {
  source: string;
  name: string;
  version?: string;
  robot_type?: string;
  fps?: number;
  episodes?: number;
  frames?: number;
  completeness_pct?: number;
  data_size_mb?: number;
  video_size_mb?: number;
  archive_size: number;
  download_url: string;
  info_url: string;
  preview_url?: string;
};

export type Job = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  created_at: string;
  completed_at?: string;
  file_count: number;
  files: { name: string; size: number }[];
  message: string;
  min_decode_ratio: number;
  create_lerobot?: boolean;
  lerobot_fps?: number;
  results: ResultItem[];
  lerobot_results?: LeRobotResult[];
  lerobot_errors?: { source: string; error: string }[];
  succeeded_count: number;
  failed_count: number;
};
