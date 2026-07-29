"use client";

import type { ChangeEvent, DragEvent, RefObject } from "react";
import type { UploadFileItem } from "../types";
import { formatBytes } from "../utils";

export function UploadCard({
  inputRef, selected, selectedBytes, dragging, uploading, uploadProgress, connected, error,
  ratio, includeLeRobot, lerobotFps, agentMessage, onChoose, onDrop, onDragging, onClear, onRemove,
  onRatio, onLeRobot, onLeRobotFps, onResetSettings, onUpload,
}: {
  inputRef: RefObject<HTMLInputElement | null>; selected: UploadFileItem[]; selectedBytes: number;
  dragging: boolean; uploading: boolean; uploadProgress: number; connected: boolean | null; error: string;
  ratio: string; includeLeRobot: boolean; lerobotFps: string;
  agentMessage?: string;
  onChoose: (e: ChangeEvent<HTMLInputElement>) => void; onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragging: (value: boolean) => void; onClear: () => void; onRemove: (key: string) => void;
  onRatio: (value: string) => void; onLeRobot: (value: boolean) => void; onLeRobotFps: (value: string) => void;
  onResetSettings: () => void; onUpload: () => void;
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
        <label><span>Minimum completeness · {Math.round((Number(ratio) || 0) * 100)}%</span><input value={ratio} onChange={(e) => onRatio(e.target.value)} inputMode="decimal" /><small>要求视频帧全部成功解码。若原始 MCAP 存在损坏帧或解码失败，任务可能无法通过。需要提高兼容性时可调整为 99%。</small></label>
        <label className="switch-row"><input type="checkbox" checked={includeLeRobot} onChange={(e) => onLeRobot(e.target.checked)} /><span className="switch" /><div><strong>LeRobot V3.0</strong><small>默认生成 LeRobot 训练数据集</small><em>仅包含受支持 LivUMI Ego 主相机数据的 MCAP 文件可以生成 LeRobot 数据集。不兼容文件仍可完成视频导出和质量检测。</em></div></label>
        <label><span>LeRobot FPS</span><input disabled={!includeLeRobot} value={lerobotFps} onChange={(e) => onLeRobotFps(e.target.value)} inputMode="decimal" min="1" max="30" /><small>{includeLeRobot ? "当前使用允许的最高默认值 30 FPS。" : "已关闭训练数据集生成，不影响视频导出和质量分析。"}</small></label>
        <button className="primary-button" disabled={!selected.length || uploading || !connected} onClick={onUpload}>{uploading ? `Uploading ${uploadProgress}%` : `Start Processing${selected.length ? ` · ${selected.length}` : ""}`}</button>
      </div>
      <button className="settings-reset-button" onClick={onResetSettings}>恢复最高质量默认设置</button>
      {uploading && <div className="progress"><span style={{ width: `${uploadProgress}%` }} /></div>}
      {error && <div className="error-banner" role="alert"><strong>Request failed</strong><span>{error}</span></div>}
    </section>
  );
}
