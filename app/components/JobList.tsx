"use client";

import { useState } from "react";
import { agentUrl } from "../lib/agent";
import { jobFailureDetails } from "../lib/jobAdapter";
import {
  fileStageLabels,
  formatFileSize,
  getJobDisplayName,
  getJobDisplayStatus,
  getJobFileSummary,
  isJobLerobotUnsupported,
  lerobotStatusLabels,
  normalizeFileResults,
  type FileStageStatus,
  type LerobotStatus,
  type NormalizedFileResult,
} from "../lib/jobDisplay";
import {
  currentLerobotErrors,
  getDatasetPreviews,
  isStereoDataset,
  latestLerobotResults,
} from "../lib/lerobotDisplay";
import type { Job } from "../types";
import { elapsedTime, formatBytes, formatDate, statusLabel } from "../utils";
import { AnalysisDashboard } from "./AnalysisDashboard";
import { DetailedMetrics } from "./DetailedMetrics";
import { LerobotCompatibilityNotice } from "./LerobotCompatibilityNotice";
import { VideoGallery } from "./VideoGallery";

type Tab = "analysis" | "video" | "metrics" | "dataset";

function DatasetGallery({ job, onLeRobot, generating }: {
  job: Job;
  onLeRobot: (id: string) => void;
  generating: boolean;
}) {
  const files = normalizeFileResults(job);
  const datasets = latestLerobotResults(job.lerobot_results);
  const errors = currentLerobotErrors(job);
  if (!datasets.length && !errors.length && !files.some((file) => file.lerobotStatus === "unsupported")) {
    return <div className="empty-inline"><span>◇</span><strong>当前任务尚未生成 LeRobot 数据集</strong><p>点击“生成 LeRobot”创建训练数据集。</p></div>;
  }
  return <div className="dataset-grid">
    {datasets.map((dataset, index) => {
      const previews = getDatasetPreviews(dataset);
      return <article className="dataset-card" key={`${dataset.source}-${dataset.download_url}-${index}`}>
        <div><span>LR</span><p><strong>{dataset.name || "LeRobot 数据集"}</strong><small title={dataset.source}>源文件：{dataset.source || "—"}</small></p><em>{isStereoDataset(dataset) ? "双目数据集" : "单目数据集"}</em></div>
        {previews.length > 0 && <div className="dataset-previews">{previews.map((preview) => (
          <figure key={`${preview.key}-${preview.preview_url}`}>
            <figcaption>{preview.label || preview.key || "相机预览"}</figcaption>
            <video controls playsInline preload="metadata" src={agentUrl(preview.preview_url)} />
          </figure>
        ))}</div>}
        <dl>
          <div><dt>LeRobot 版本</dt><dd>{dataset.version || "—"}</dd></div>
          <div><dt>数据集类型</dt><dd>{isStereoDataset(dataset) ? "双目" : "单目"}</dd></div>
          <div><dt>FPS</dt><dd>{dataset.fps ?? "—"}</dd></div>
          <div><dt>Episode 数</dt><dd>{dataset.episodes ?? "—"}</dd></div>
          <div><dt>总帧数</dt><dd>{dataset.frames?.toLocaleString("zh-CN") ?? "—"}</dd></div>
          <div><dt>视频完整率</dt><dd>{dataset.completeness_pct == null ? "—" : `${dataset.completeness_pct.toFixed(2)}%`}</dd></div>
          <div><dt>数据文件大小</dt><dd>{dataset.data_size_mb == null ? "—" : `${dataset.data_size_mb.toFixed(2)} MB`}</dd></div>
          <div><dt>视频文件大小</dt><dd>{dataset.video_size_mb == null ? "—" : `${dataset.video_size_mb.toFixed(2)} MB`}</dd></div>
          <div><dt>ZIP 大小</dt><dd>{dataset.archive_size == null ? "—" : formatBytes(dataset.archive_size)}</dd></div>
        </dl>
        <div className="card-actions">
          {dataset.download_url && <a href={agentUrl(dataset.download_url)}>下载数据集 ZIP</a>}
          {dataset.info_url && <a href={agentUrl(dataset.info_url)} target="_blank" rel="noreferrer">查看 info.json</a>}
        </div>
      </article>;
    })}
    {errors.map((item) => <LerobotCompatibilityNotice
      key={`${item.source}-${item.error}`}
      source={item.source}
      error={item.error}
      onRetry={() => onLeRobot(job.id)}
      retryDisabled={generating}
    />)}
    {files.filter((file) => file.lerobotStatus === "unsupported" && !file.lerobotErrors.length).map((file) => (
      <LerobotCompatibilityNotice
        key={`inferred-${file.name}`}
        source={file.name}
        error="未找到 /ego/camera/0 视频流；LeRobot 导出仅支持 LivUMI Ego 主相机数据"
        onRetry={() => onLeRobot(job.id)}
        retryDisabled={generating}
      />
    ))}
  </div>;
}

function StatusBadge({ status, kind }: { status: FileStageStatus | LerobotStatus; kind: "stage" | "lerobot" }) {
  const label = kind === "lerobot"
    ? lerobotStatusLabels[status as LerobotStatus]
    : fileStageLabels[status as FileStageStatus];
  return <span className={`file-status file-status-${status}`}>{label}</span>;
}

function FileResultList({ files }: { files: NormalizedFileResult[] }) {
  return (
    <div className="job-file-list">
      <div className="job-file-list-head"><span>#</span><span>文件名</span><span>大小</span><span>视频转换</span><span>质量分析</span><span>LeRobot</span></div>
      {files.map((file) => (
        <div className="job-file-row" key={`${file.index}-${file.name}`}>
          <span>{file.index + 1}</span>
          <strong title={file.name}>{file.name}</strong>
          <span>{formatFileSize(file.size)}</span>
          <StatusBadge status={file.videoStatus} kind="stage" />
          <StatusBadge status={file.analysisStatus} kind="stage" />
          <StatusBadge status={file.lerobotStatus} kind="lerobot" />
        </div>
      ))}
    </div>
  );
}

function stageSummary(files: NormalizedFileResult[], field: "videoStatus" | "analysisStatus"): string {
  const completed = files.filter((file) => file[field] === "completed").length;
  const pending = files.some((file) => file[field] === "pending");
  if (completed === files.length && files.length) return "成功";
  if (pending) return "处理中";
  return `${completed}/${files.length} 成功`;
}

function lerobotSummary(files: NormalizedFileResult[]): string {
  if (files.length && files.every((file) => file.lerobotStatus === "unsupported")) return "不兼容";
  if (files.some((file) => file.lerobotStatus === "pending")) return "处理中";
  const completed = files.filter((file) => file.lerobotStatus === "completed").length;
  const unsupported = files.filter((file) => file.lerobotStatus === "unsupported").length;
  const failed = files.filter((file) => file.lerobotStatus === "failed").length;
  if (completed === files.length && files.length) return "已生成";
  if (!completed && !unsupported && !failed) return "未请求";
  return [
    completed ? `${completed} 已生成` : "",
    unsupported ? `${unsupported} 不兼容` : "",
    failed ? `${failed} 失败` : "",
  ].filter(Boolean).join(" · ");
}

function JobCard({ job, expanded, generating, onToggle, onDelete, onAnalyze, onLeRobot, onRetry }: {
  job: Job; expanded: boolean; onToggle: () => void;
  generating: boolean;
  onDelete: (id: string) => void; onAnalyze: (id: string) => void; onLeRobot: (id: string) => void; onRetry: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("analysis");
  const [filesExpanded, setFilesExpanded] = useState(false);
  const busy = job.status === "queued" || job.status === "processing";
  const fileResults = normalizeFileResults(job);
  const totalSize = job.files.reduce((sum, file) => sum + file.size, 0);
  const displayStatus = getJobDisplayStatus(job);
  const lerobotUnsupported = isJobLerobotUnsupported(job);
  const videoResults = job.results.filter((result) => !result.analysis_only && result.view_url && result.download_url);
  const analysisResults = [...new Map(
    job.results.filter((result) => result.analysis).map((result) => [result.source, result]),
  ).values()];
  const qualityCounts = analysisResults.reduce((counts, result) => {
    (["PASS", "CHECK", "FAIL"] as const).forEach((key) => { counts[key] += Number(result.analysis?.counts?.[key] || 0); });
    return counts;
  }, { PASS: 0, CHECK: 0, FAIL: 0 });
  const qualityStatus = qualityCounts.FAIL ? "FAIL" : qualityCounts.CHECK ? "CHECK" : qualityCounts.PASS ? "PASS" : "N/A";
  const failures = jobFailureDetails(job);
  return <article className="job-card">
    <div className="job-summary">
      <div className="job-file-icon">MC</div>
      <div className="job-name"><strong>{getJobDisplayName(job)}</strong><span>{getJobFileSummary(job)}{job.file_count > 1 ? ` · ${formatBytes(totalSize)}` : ""}</span></div>
      <span className={`job-status status-${displayStatus}`}><i />{statusLabel(displayStatus)}</span>
      <div className="job-time"><span>CREATED</span><strong>{formatDate(job.created_at)}</strong></div>
      <div className="job-time"><span>耗时</span><strong>{elapsedTime(job.started_at || job.created_at, job.finished_at)}</strong></div>
      <div className="job-actions">
        <button disabled={busy || !job.files.length} onClick={() => onAnalyze(job.id)}>运行分析</button>
        <button
          disabled={busy || generating || !job.files.length || lerobotUnsupported}
          title={lerobotUnsupported ? "未检测到 LivUMI Ego 主相机视频流 /ego/camera/0" : undefined}
          onClick={() => onLeRobot(job.id)}
        >{lerobotUnsupported ? "不支持 LeRobot" : generating ? "正在生成…" : "生成 LeRobot"}</button>
        <button disabled={busy || displayStatus !== "failed"} onClick={() => onRetry(job.id)}>重试</button>
        <button className="result-toggle" onClick={onToggle}>{expanded ? "收起结果" : "查看结果"}</button>
        <button disabled={busy} className="danger" onClick={() => onDelete(job.id)}>删除</button>
      </div>
    </div>
    <div className="job-progress-line"><span style={{ width: `${job.progress}%` }} /></div>
    <div className="job-message"><span>{job.message}</span><span>成功 {job.succeeded_count} · 失败 {job.failed_count}</span><strong>{job.progress}%</strong></div>
    <div className="job-stage-summary">
      <span>视频导出：<strong>{stageSummary(fileResults, "videoStatus")}</strong></span>
      <span>质量分析：<strong>{stageSummary(fileResults, "analysisStatus")}</strong></span>
      <span>LeRobot：<strong>{lerobotSummary(fileResults)}</strong></span>
      <span>综合质量：<strong className={`quality-text quality-${qualityStatus.toLowerCase().replace("/", "")}`}>{qualityStatus}</strong></span>
      {expanded && job.file_count > 1 && <button onClick={() => setFilesExpanded((value) => !value)}>{filesExpanded ? "收起文件列表" : "查看全部文件"}</button>}
    </div>
    {expanded && filesExpanded && <FileResultList files={fileResults} />}
    {expanded && (busy ? <div className="processing-state"><span className="spinner" /><div><strong>Processing pipeline</strong><p>任务正在本地 Agent 中运行，结果会自动刷新。</p></div></div> : <>
      <nav className="result-tabs" aria-label="任务结果">
        <button className={tab === "analysis" ? "active" : ""} onClick={() => setTab("analysis")}>分析概览 <span>{analysisResults.length}</span></button>
        <button className={tab === "video" ? "active" : ""} onClick={() => setTab("video")}>视频预览 <span>{videoResults.length}</span></button>
        <button className={tab === "metrics" ? "active" : ""} onClick={() => setTab("metrics")}>详细指标 <span>{job.results.reduce((sum, r) => sum + (r.analysis?.metrics.length || 0), 0)}</span></button>
        <button className={tab === "dataset" ? "active" : ""} onClick={() => setTab("dataset")}>LeRobot <span>{job.lerobot_results?.length || 0}</span></button>
      </nav>
      <div className="tab-content">
        {tab === "analysis" && (analysisResults.length ? <AnalysisDashboard results={analysisResults} /> : <div className="failure-details"><strong>{displayStatus === "failed" ? "任务未生成可展示的分析结果" : "等待分析结果"}</strong>{failures.map((message, index) => <p key={`${message}-${index}`}>{message}</p>)}</div>)}
        {tab === "video" && <VideoGallery results={videoResults} />}
        {tab === "metrics" && <DetailedMetrics results={job.results} />}
        {tab === "dataset" && <DatasetGallery job={job} onLeRobot={onLeRobot} generating={generating} />}
      </div>
    </>)}
  </article>;
}

export function JobList({ jobs, connected, generatingIds, onDelete, onAnalyze, onLeRobot, onRetry }: {
  jobs: Job[]; connected: boolean | null;
  generatingIds: ReadonlySet<string>;
  onDelete: (id: string) => void; onAnalyze: (id: string) => void; onLeRobot: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const activeJobs = jobs.filter((job) => job.status === "queued" || job.status === "processing");
  const recentJobs = jobs
    .filter((job) => job.status !== "queued" && job.status !== "processing")
    .sort((a, b) => new Date(b.finished_at || b.updated_at || b.created_at).getTime() - new Date(a.finished_at || a.updated_at || a.created_at).getTime());
  const visibleJobs = [...activeJobs, ...(showAllRecent ? recentJobs : recentJobs.slice(0, 5))];
  return <section className="jobs-section">
    <div className="section-heading"><div><span>任务队列</span><h2>处理任务与分析结果</h2><p>管理本地处理任务并查看数据质量。</p></div><div className="job-count"><strong>{jobs.length}</strong><span>任务总数</span></div></div>
    {connected === false && jobs.length === 0 ? <div className="empty-state offline"><span>!</span><strong>无法读取任务列表</strong><p>请启动本地 MCAP Agent，连接成功后任务会自动显示。</p></div>
      : jobs.length === 0 ? <div className="empty-state"><span>◇</span><strong>No jobs yet</strong><p>上传 MCAP 文件，开始第一条数据处理 Pipeline。</p></div>
      : <div className="job-list">{connected === false && <div className="stale-data-notice">Agent 暂时离线，以下为上次成功读取的数据，不代表实时状态。</div>}{visibleJobs.map((job) => <JobCard
        key={job.id}
        job={job}
        generating={generatingIds.has(job.id)}
        expanded={expandedId === job.id}
        onToggle={() => setExpandedId((current) => current === job.id ? null : job.id)}
        onDelete={onDelete}
        onAnalyze={onAnalyze}
        onLeRobot={onLeRobot}
        onRetry={onRetry}
      />)}{recentJobs.length > 5 && <button className="show-recent-button" onClick={() => setShowAllRecent((value) => !value)}>{showAllRecent ? "收起最近任务" : `查看全部最近任务（${recentJobs.length}）`}</button>}</div>}
  </section>;
}
