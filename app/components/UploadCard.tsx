"use client";

import type { ChangeEvent, DragEvent, RefObject } from "react";
import type { UploadFileItem } from "../types";
import { formatBytes } from "../utils";

export function UploadCard({
  inputRef, selected, selectedBytes, dragging, uploading, uploadProgress, connected, error,
  ratio, includeLeRobot, lerobotFps, agentMessage, onChoose, onDrop, onDragging, onClear, onRemove,
  onRatio, onLeRobot, onLeRobotFps, onUpload,
}: {
  inputRef: RefObject<HTMLInputElement | null>; selected: UploadFileItem[]; selectedBytes: number;
  dragging: boolean; uploading: boolean; uploadProgress: number; connected: boolean | null; error: string;
  ratio: string; includeLeRobot: boolean; lerobotFps: string;
  agentMessage?: string;
  onChoose: (e: ChangeEvent<HTMLInputElement>) => void; onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragging: (value: boolean) => void; onClear: () => void; onRemove: (key: string) => void;
  onRatio: (value: string) => void; onLeRobot: (value: boolean) => void; onLeRobotFps: (value: string) => void;
  onUpload: () => void;
}) {
  return (
    <section className="workspace-card upload-card">
      <div className="card-heading"><div><span>新建处理任务</span><h2>上传 MCAP 数据</h2></div>{selected.length > 0 && <button className="ghost-button danger" onClick={onClear}>清空</button>}</div>
      {connected === false && <div className="offline-banner"><span>!</span><div><strong>本地 Agent 未启动</strong><p>{agentMessage}。请运行 <code>mcap-agent/start_agent.sh</code></p></div></div>}
      <div className={`dropzone ${dragging ? "dragging" : ""}`} role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragEnter={(e) => { e.preventDefault(); onDragging(true); }} onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => { if (e.currentTarget === e.target) onDragging(false); }} onDrop={onDrop}
        data-testid="mcap-dropzone">
        <input ref={inputRef} type="file" accept=".mcap" multiple hidden onChange={onChoose} />
        <span className="upload-symbol">↑</span>
        <strong>{dragging ? "Release to add files" : "拖入一个或多个 .mcap 文件"}</strong>
        <span>Drag & drop or click to browse · Local processing only</span>
      </div>
      {selected.length > 0 && <div className="selected-files">
        <div><strong>{selected.length} files selected</strong><span>{formatBytes(selectedBytes)}</span></div>
        <div className="selected-scroll">{selected.map(({ file, key }) => <div key={key}><span>MCAP</span><p><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></p><button onClick={() => onRemove(key)} aria-label={`移除 ${file.name}`}>×</button></div>)}</div>
      </div>}
      <div className="pipeline-options">
        <label><span>Minimum completeness</span><input value={ratio} onChange={(e) => onRatio(e.target.value)} inputMode="decimal" /></label>
        <label className="switch-row"><input type="checkbox" checked={includeLeRobot} onChange={(e) => onLeRobot(e.target.checked)} /><span className="switch" /><div><strong>LeRobot V3.0</strong><small>Generate training dataset</small></div></label>
        {includeLeRobot && <label><span>LeRobot FPS</span><input value={lerobotFps} onChange={(e) => onLeRobotFps(e.target.value)} inputMode="decimal" /></label>}
        <button className="primary-button" disabled={!selected.length || uploading || !connected} onClick={onUpload}>{uploading ? `Uploading ${uploadProgress}%` : `Start Processing${selected.length ? ` · ${selected.length}` : ""}`}</button>
      </div>
      {uploading && <div className="progress"><span style={{ width: `${uploadProgress}%` }} /></div>}
      {error && <div className="error-banner" role="alert"><strong>Request failed</strong><span>{error}</span></div>}
    </section>
  );
}
