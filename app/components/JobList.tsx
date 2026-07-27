"use client";

import { useState } from "react";
import { agentUrl } from "../lib/agent";
import type { Job } from "../types";
import { elapsedTime, formatBytes, formatDate, statusLabel } from "../utils";
import { AnalysisDashboard } from "./AnalysisDashboard";
import { VideoGallery } from "./VideoGallery";

type Tab = "analysis" | "video" | "dataset";

function DatasetGallery({ job }: { job: Job }) {
  if (!job.lerobot_results?.length && !job.lerobot_errors?.length) return <div className="empty-inline"><span>◇</span><strong>No LeRobot dataset</strong><p>点击“Generate LeRobot”创建训练数据集。</p></div>;
  return <div className="dataset-grid">
    {(job.lerobot_results || []).map((dataset) => <article className="dataset-card" key={dataset.download_url}>
      <div><span>LR</span><p><strong>{dataset.name}</strong><small>{dataset.robot_type || "LivUMI-Ego-Lite"}</small></p><em>{dataset.version || "v3.0"}</em></div>
      {dataset.preview_url && <video controls playsInline preload="metadata" src={agentUrl(dataset.preview_url)} />}
      <dl><div><dt>Episodes</dt><dd>{dataset.episodes ?? 0}</dd></div><div><dt>Frames</dt><dd>{dataset.frames?.toLocaleString("zh-CN") ?? 0}</dd></div><div><dt>FPS</dt><dd>{dataset.fps ?? "—"}</dd></div><div><dt>Complete</dt><dd>{dataset.completeness_pct?.toFixed(2) ?? "—"}%</dd></div></dl>
      <div className="card-actions"><a href={agentUrl(dataset.download_url)}>Download ZIP</a><a href={agentUrl(dataset.info_url)}>info.json</a></div>
    </article>)}
    {(job.lerobot_errors || []).map((item) => <div className="error-banner" key={`${item.source}-${item.error}`}><strong>{item.source}</strong><span>{item.error}</span></div>)}
  </div>;
}

function JobCard({ job, onDelete, onAnalyze, onLeRobot }: {
  job: Job; onDelete: (id: string) => void; onAnalyze: (id: string) => void; onLeRobot: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("analysis");
  const totalSize = job.files.reduce((sum, file) => sum + file.size, 0);
  const busy = job.status === "queued" || job.status === "processing";
  const firstResult = job.results[0];
  return <article className="job-card">
    <div className="job-summary">
      <div className="job-file-icon">MC</div>
      <div className="job-name"><strong>{job.files[0]?.name || `${job.file_count} MCAP files`}</strong><span>{job.file_count > 1 ? `+ ${job.file_count - 1} more files · ` : ""}{formatBytes(totalSize)}</span></div>
      <span className={`job-status status-${job.status}`}><i />{statusLabel(job.status)}</span>
      <div className="job-time"><span>CREATED</span><strong>{formatDate(job.created_at)}</strong></div>
      <div className="job-time"><span>ELAPSED</span><strong>{elapsedTime(job.created_at, job.completed_at)}</strong></div>
      <div className="job-actions">
        {!busy && <><button onClick={() => onAnalyze(job.id)}>Run Analysis</button><button onClick={() => onLeRobot(job.id)}>Generate LeRobot</button><button className="danger" onClick={() => onDelete(job.id)}>Delete</button></>}
      </div>
    </div>
    <div className="job-progress-line"><span style={{ width: `${job.progress}%` }} /></div>
    <div className="job-message"><span>{job.message}</span><strong>{job.progress}%</strong></div>
    {busy ? <div className="processing-state"><span className="spinner" /><div><strong>Processing pipeline</strong><p>任务正在本地 Agent 中运行，结果会自动刷新。</p></div></div> : <>
      <nav className="result-tabs" aria-label="任务结果">
        <button className={tab === "analysis" ? "active" : ""} onClick={() => setTab("analysis")}>Analysis <span>{job.results.filter((r) => r.analysis).length}</span></button>
        <button className={tab === "video" ? "active" : ""} onClick={() => setTab("video")}>Video Gallery <span>{job.results.length}</span></button>
        <button className={tab === "dataset" ? "active" : ""} onClick={() => setTab("dataset")}>LeRobot <span>{job.lerobot_results?.length || 0}</span></button>
      </nav>
      <div className="tab-content">
        {tab === "analysis" && (firstResult ? <AnalysisDashboard result={firstResult} /> : <div className="empty-inline"><strong>No processing result</strong><p>{job.status === "failed" ? job.message : "等待分析结果。"}</p></div>)}
        {tab === "video" && <VideoGallery results={job.results} />}
        {tab === "dataset" && <DatasetGallery job={job} />}
      </div>
    </>}
  </article>;
}

export function JobList({ jobs, connected, onDelete, onAnalyze, onLeRobot }: {
  jobs: Job[]; connected: boolean | null;
  onDelete: (id: string) => void; onAnalyze: (id: string) => void; onLeRobot: (id: string) => void;
}) {
  return <section className="jobs-section">
    <div className="section-heading"><div><span>PROCESSING QUEUE</span><h2>Jobs & Analysis</h2><p>Manage local processing pipelines and review data quality.</p></div><div className="job-count"><strong>{jobs.length}</strong><span>Total jobs</span></div></div>
    {connected === false ? <div className="empty-state offline"><span>!</span><strong>无法读取任务列表</strong><p>请启动本地 MCAP Agent，连接成功后任务会自动显示。</p></div>
      : jobs.length === 0 ? <div className="empty-state"><span>◇</span><strong>No jobs yet</strong><p>上传 MCAP 文件，开始第一条数据处理 Pipeline。</p></div>
      : <div className="job-list">{jobs.map((job) => <JobCard key={job.id} job={job} onDelete={onDelete} onAnalyze={onAnalyze} onLeRobot={onLeRobot} />)}</div>}
  </section>;
}
