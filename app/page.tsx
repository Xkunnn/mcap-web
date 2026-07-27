"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "./components/Header";
import { JobList } from "./components/JobList";
import { UploadCard } from "./components/UploadCard";
import { agentUrl, checkAgent, requestAgent } from "./lib/agent";
import type { Job, UploadFileItem } from "./types";

function makeKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const [selected, setSelected] = useState<UploadFileItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ratio, setRatio] = useState("0.90");
  const [includeLeRobot, setIncludeLeRobot] = useState(false);
  const [lerobotFps, setLeRobotFps] = useState("12");
  const [error, setError] = useState("");
  const [backendReady, setBackendReady] = useState<boolean | null>(null);

  const selectedBytes = useMemo(() => selected.reduce((total, item) => total + item.file.size, 0), [selected]);

  const refreshJobs = useCallback(async () => {
    try {
      const [ready, response] = await Promise.all([checkAgent(), requestAgent("/api/jobs")]);
      if (!ready || !response.ok) throw new Error("Local Agent unavailable");
      setBackendReady(true);
      setJobs(await response.json());
    } catch {
      setBackendReady(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshJobs(), 0);
    const timer = window.setInterval(refreshJobs, 1500);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refreshJobs]);

  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming.filter((file) => file.name.toLowerCase().endsWith(".mcap"));
    setError(valid.length !== incoming.length ? "已忽略非 .mcap 文件，仅支持 MCAP 数据。" : "");
    setSelected((current) => {
      const existing = new Set(current.map((item) => item.key));
      return [...current, ...valid.filter((file) => !existing.has(makeKey(file))).map((file) => ({ file, key: makeKey(file) }))];
    });
  }, []);

  function onChoose(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    addFiles(files);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  async function uploadFiles(incoming: File[]) {
    const batch = incoming.filter((file) => file.name.toLowerCase().endsWith(".mcap"));
    const numericRatio = Number(ratio);
    const numericFps = Number(lerobotFps);
    if (!batch.length || uploadingRef.current) return;
    if (!backendReady) return setError("请启动 MCAP Agent（运行 mcap-agent/start_agent.sh）");
    if (!Number.isFinite(numericRatio) || numericRatio < 0 || numericRatio > 1) return setError("最低数据完整率必须在 0 到 1 之间");
    if (includeLeRobot && (!Number.isFinite(numericFps) || numericFps < 1 || numericFps > 60)) return setError("LeRobot FPS 必须在 1 到 60 之间");
    const data = new FormData();
    batch.forEach((file) => data.append("files", file));
    data.append("min_decode_ratio", String(numericRatio));
    data.append("create_lerobot", String(includeLeRobot));
    data.append("lerobot_fps", lerobotFps);
    const request = new XMLHttpRequest();
    request.open("POST", agentUrl("/api/jobs"));
    uploadingRef.current = true;
    setUploading(true);
    setUploadProgress(0);
    setError("");
    request.upload.onprogress = (event) => { if (event.lengthComputable) setUploadProgress(Math.round(event.loaded / event.total * 100)); };
    request.onload = () => {
      uploadingRef.current = false;
      setUploading(false);
      if (request.status >= 200 && request.status < 300) {
        setSelected([]);
        setUploadProgress(0);
        void refreshJobs();
      } else {
        try { setError(JSON.parse(request.responseText).detail || `上传失败（HTTP ${request.status}）`); }
        catch { setError(`上传失败（HTTP ${request.status}），请检查本地 Agent 日志。`); }
      }
    };
    request.onerror = () => { uploadingRef.current = false; setUploading(false); setError("无法连接本地 Agent，请确认服务已在 127.0.0.1:8765 启动。"); };
    request.send(data);
  }

  async function runAction(path: string, fallback: string, init: RequestInit = { method: "POST" }) {
    setError("");
    try {
      const response = await requestAgent(path, init);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.detail || `${fallback}（HTTP ${response.status}）`);
      }
      await refreshJobs();
    } catch {
      setError(`${fallback}：无法连接本地 Agent。`);
    }
  }

  function createLeRobot(id: string) {
    const fps = Number(lerobotFps);
    if (!Number.isFinite(fps) || fps < 1 || fps > 60) return setError("LeRobot FPS 必须在 1 到 60 之间");
    void runAction(`/api/jobs/${id}/lerobot?fps=${encodeURIComponent(fps)}`, "LeRobot 数据集生成失败");
  }

  return (
    <main className="app-shell">
      <Header connected={backendReady} />
      <div className="app-scroll">
        <section className="workspace-intro">
          <div><span>LOCAL DATA OPERATIONS</span><h1>Data Processing Workspace</h1><p>MCAP 视频提取、数据质量检测与机器人训练数据生成。</p></div>
          <div className="workspace-stats"><div><strong>{jobs.length}</strong><span>TOTAL JOBS</span></div><div><strong>{jobs.filter((job) => job.status === "processing").length}</strong><span>PROCESSING</span></div><div><strong>{jobs.reduce((sum, job) => sum + job.results.length, 0)}</strong><span>OUTPUTS</span></div></div>
        </section>
        <UploadCard inputRef={inputRef} selected={selected} selectedBytes={selectedBytes} dragging={dragging} uploading={uploading}
          uploadProgress={uploadProgress} connected={backendReady} error={error} ratio={ratio} includeLeRobot={includeLeRobot}
          lerobotFps={lerobotFps} onChoose={onChoose} onDrop={onDrop} onDragging={setDragging} onClear={() => setSelected([])}
          onRemove={(key) => setSelected((current) => current.filter((item) => item.key !== key))} onRatio={setRatio}
          onLeRobot={setIncludeLeRobot} onLeRobotFps={setLeRobotFps} onUpload={() => void uploadFiles(selected.map((item) => item.file))} />
        <JobList jobs={jobs} connected={backendReady}
          onDelete={(id) => void runAction(`/api/jobs/${id}`, "删除任务失败", { method: "DELETE" })}
          onAnalyze={(id) => void runAction(`/api/jobs/${id}/analyze`, "检测运行失败")}
          onLeRobot={createLeRobot} />
        <footer><span>MCAP Data Processing Platform</span><p>All files and results remain on your local machine.</p></footer>
      </div>
    </main>
  );
}
