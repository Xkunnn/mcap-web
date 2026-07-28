import { agentUrl } from "../lib/agent";
import type { ResultItem } from "../types";
import { formatBytes } from "../utils";

function streamName(result: ResultItem, index: number) {
  const text = `${result.name} ${result.topic || ""}`.toLowerCase();
  if (text.includes("depth")) return "Depth";
  if (text.includes("gray") || text.includes("grey")) return "Gray";
  if (text.includes("rgb") || text.includes("camera")) return "RGB";
  return index === 0 ? "RGB / Primary" : `Preview ${index + 1}`;
}

export function VideoGallery({ results }: { results: ResultItem[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!results.length) return <div className="empty-inline"><span>▻</span><strong>No video output</strong><p>视频处理完成后会显示在这里。</p></div>;
  const visible = expanded ? results : results.slice(0, 4);
  return (
    <>
    <div className="video-gallery">
      {visible.map((result, index) => {
        const view = agentUrl(result.view_url || result.download_url.replace("/download/", "/view/"));
        return (
          <article className="video-card" key={result.download_url}>
            <div className="video-head">
              <div><span className="video-live-dot" /><strong>{streamName(result, index)}</strong></div>
              <span>{result.width || "—"} × {result.height || "—"} · {result.fps?.toFixed(1) || "—"} FPS</span>
            </div>
            <video controls playsInline preload="metadata" src={view}>当前浏览器无法播放此 MP4。</video>
            {result.topic && <p className="video-topic" title={result.topic}>{result.topic}</p>}
            <div className="video-meta">
              <div><span>FRAMES</span><strong>{result.frames?.toLocaleString("zh-CN") || "—"}</strong></div>
              <div><span>CODEC</span><strong>{result.codec?.toUpperCase() || "—"}</strong></div>
              <div><span>SIZE</span><strong>{formatBytes(result.size)}</strong></div>
              <div><span>QUALITY</span><strong>{result.blur_score?.toFixed(3) || "—"}</strong></div>
            </div>
            <div className="card-actions">
              <a href={agentUrl(result.download_url)}>Download</a>
              <a href={view} target="_blank" rel="noreferrer">Fullscreen ↗</a>
              <a href={agentUrl(result.report_url)}>Report</a>
            </div>
          </article>
        );
      })}
    </div>
    {results.length > 4 && <button className="expand-button" onClick={() => setExpanded((value) => !value)}>{expanded ? "收起视频" : `展开更多视频（${results.length - 4}）`}</button>}
    </>
  );
}
import { useState } from "react";
