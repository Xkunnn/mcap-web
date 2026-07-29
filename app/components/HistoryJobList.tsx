"use client";

import { useState } from "react";
import { agentUrl } from "../lib/agent";
import type { HistoryRecord } from "../lib/historyManager";
import { formatBytes, formatDate } from "../utils";

function historyName(record: HistoryRecord): string {
  return record.fileCount === 1 ? record.files[0]?.name || "未命名 MCAP 文件" : `批量任务 · ${record.fileCount} 个 MCAP 文件`;
}

function lerobotLabel(record: HistoryRecord): string {
  if (record.lerobotResults.length) return `${record.lerobotResults.length} 已生成`;
  if (record.lerobotUnsupportedCount) return `${record.lerobotUnsupportedCount} 不兼容`;
  return "未生成";
}

export function HistoryJobList({ records }: { records: HistoryRecord[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return <div className="history-job-list">{records.map((record) => {
    const expanded = expandedId === record.id;
    return <article className="history-job" key={record.id}>
      <div className="history-job-summary">
        <div className="job-file-icon">MC</div>
        <div className="job-name"><strong>{historyName(record)}</strong><span>{record.fileCount} 个文件 · {formatBytes(record.totalSize)}</span></div>
        <span className={`job-status status-${record.status}`}><i />{record.status === "completed" ? "已完成" : "失败"}</span>
        <div className="job-time"><span>完成时间</span><strong>{formatDate(record.finishedAt || record.archiveTimestamp)}</strong></div>
        <span className={`result-pill result-${record.qualityStatus.toLowerCase().replace("/", "")}`}>{record.qualityStatus}</span>
        <button className="history-detail-button" onClick={() => setExpandedId(expanded ? null : record.id)}>{expanded ? "收起详情" : "查看详情"}</button>
      </div>
      {expanded && <div className="history-job-detail">
        <div className="history-detail-stats">
          <span>成功 <strong>{record.succeededCount}</strong></span>
          <span>失败 <strong>{record.failedCount}</strong></span>
          <span>PASS <strong>{record.qualityCounts.PASS}</strong></span>
          <span>CHECK <strong>{record.qualityCounts.CHECK}</strong></span>
          <span>FAIL <strong>{record.qualityCounts.FAIL}</strong></span>
          <span>LeRobot <strong>{lerobotLabel(record)}</strong></span>
        </div>
        <div className="job-file-list">
          <div className="job-file-list-head"><span>#</span><span>文件名</span><span>大小</span><span>视频转换</span><span>质量分析</span><span>LeRobot</span></div>
          {record.files.map((file, index) => <div className="job-file-row" key={`${index}-${file.name}`}>
            <span>{index + 1}</span><strong title={file.name}>{file.name}</strong><span>{formatBytes(file.size)}</span>
            <span className={`file-status file-status-${file.videoStatus}`}>{file.videoStatus === "completed" ? "成功" : file.videoStatus}</span>
            <span className={`file-status file-status-${file.analysisStatus}`}>{file.analysisStatus === "completed" ? "成功" : file.analysisStatus}</span>
            <span className={`file-status file-status-${file.lerobotStatus}`}>{file.lerobotStatus === "completed" ? "已生成" : file.lerobotStatus === "unsupported" ? "不兼容" : file.lerobotStatus === "not_requested" ? "未请求" : file.lerobotStatus}</span>
          </div>)}
        </div>
        {record.videoResults.length > 0 && <div className="history-video-grid">{record.videoResults.slice(0, 4).map((video) => <article key={video.downloadUrl}>
          <strong>{video.name}</strong>
          {video.viewUrl && <video controls playsInline preload="none" src={agentUrl(video.viewUrl)} />}
          <div className="card-actions"><a href={agentUrl(video.downloadUrl)}>下载视频</a><a href={agentUrl(video.reportUrl)}>报告</a></div>
        </article>)}</div>}
        {record.lerobotResults.length > 0 && <div className="history-downloads">{record.lerobotResults.map((result) => <a key={result.downloadUrl} href={agentUrl(result.downloadUrl)}>下载 {result.name}</a>)}</div>}
        {record.errors.length > 0 && <details className="history-errors"><summary>查看错误摘要</summary>{record.errors.map((error, index) => <p key={`${index}-${error.message}`}>{error.source ? `${error.source}：` : ""}{error.message}</p>)}</details>}
      </div>}
    </article>;
  })}</div>;
}
