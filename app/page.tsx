"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "./components/Header";
import { HistoryView } from "./components/HistoryView";
import { JobList } from "./components/JobList";
import { UploadCard } from "./components/UploadCard";
import { WorkspaceTabs, type WorkspaceView } from "./components/WorkspaceTabs";
import { agentUrl, inspectAgent, requestAgent } from "./lib/agent";
import {
  clearHistory,
  createHistoryRecord,
  loadHistory,
  mergeHistoryRecords,
  partitionCurrentAndHistory,
  saveHistory,
  type HistoryRecord,
} from "./lib/historyManager";
import { normalizeJob, normalizeJobs } from "./lib/jobAdapter";
import {
  appendUploadSettings,
  HIGHEST_QUALITY_DEFAULTS,
  loadUploadSettings,
  saveUploadSettings,
} from "./lib/uploadSettings";
import type { Job, UploadFileItem } from "./types";

function makeKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const settingsLoadedRef = useRef(false);
  const lerobotGeneratingRef = useRef<Set<string>>(new Set());
  const clearedHistoryIdsRef = useRef<Set<string>>(new Set());
  const [selected, setSelected] = useState<UploadFileItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [view, setView] = useState<WorkspaceView>("current");
  const [archiveNow, setArchiveNow] = useState(() => Date.now());
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ratio, setRatio] = useState(HIGHEST_QUALITY_DEFAULTS.minDecodeRatio);
  const [includeLeRobot, setIncludeLeRobot] = useState(HIGHEST_QUALITY_DEFAULTS.createLerobot);
  const [lerobotGeneratingIds, setLerobotGeneratingIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const [agentMessage, setAgentMessage] = useState("正在连接本地 Agent");

  const selectedBytes = useMemo(() => selected.reduce((total, item) => total + item.file.size, 0), [selected]);
  const partitionedJobs = useMemo(() => partitionCurrentAndHistory(jobs, archiveNow), [jobs, archiveNow]);
  const currentJobs = partitionedJobs.current;

  const syncHistory = useCallback((sourceJobs: Job[], now: number) => {
    const incoming = partitionCurrentAndHistory(sourceJobs, now).archived
      .filter((job) => !clearedHistoryIdsRef.current.has(job.id))
      .map(createHistoryRecord);
    setHistoryRecords((existing) => {
      const merged = mergeHistoryRecords(existing, incoming);
      return saveHistory(window.localStorage, merged, now);
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const settings = loadUploadSettings(window.localStorage);
      setRatio(settings.minDecodeRatio);
      setIncludeLeRobot(settings.createLerobot);
      setHistoryRecords(loadHistory(window.localStorage));
      settingsLoadedRef.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!settingsLoadedRef.current) return;
    saveUploadSettings(window.localStorage, {
      minDecodeRatio: ratio,
      createLerobot: includeLeRobot,
      lerobotFps: HIGHEST_QUALITY_DEFAULTS.lerobotFps,
    });
  }, [ratio, includeLeRobot]);

  const refreshJobs = useCallback(async () => {
    try {
      const diagnostic = await inspectAgent();
      setAgentMessage(diagnostic.message);
      if (!diagnostic.connected) {
        setBackendReady(false);
        return;
      }
      const response = await requestAgent("/api/jobs");
      if (!response.ok) throw new Error(`任务接口返回异常（HTTP ${response.status}）`);
      const normalized = normalizeJobs(await response.json());
      const now = Date.now();
      setBackendReady(true);
      setArchiveNow(now);
      setJobs(normalized);
      syncHistory(normalized, now);
    } catch (reason) {
      setBackendReady(false);
      setAgentMessage(reason instanceof Error ? reason.message : "任务接口返回异常");
    }
  }, [syncHistory]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshJobs(), 0);
    const hasActiveJob = jobs.some((job) => job.status === "queued" || job.status === "processing");
    const timer = window.setInterval(refreshJobs, hasActiveJob ? 1500 : 10000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [jobs, refreshJobs]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setArchiveNow(now);
      syncHistory(jobs, now);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [jobs, syncHistory]);

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
    if (!batch.length || uploadingRef.current) return;
    if (!backendReady) return setError("请启动 MCAP Agent（运行 mcap-agent/start_agent.sh）");
    if (!Number.isFinite(numericRatio) || numericRatio < 0 || numericRatio > 1) return setError("最低数据完整率必须在 0 到 1 之间");
    const data = new FormData();
    batch.forEach((file) => data.append("files", file));
    appendUploadSettings(data, {
      minDecodeRatio: ratio,
      createLerobot: includeLeRobot,
      lerobotFps: HIGHEST_QUALITY_DEFAULTS.lerobotFps,
    });
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

  async function createLeRobot(id: string) {
    const fps = Number(HIGHEST_QUALITY_DEFAULTS.lerobotFps);
    if (!Number.isFinite(fps) || fps < 1 || fps > 60) return setError("LeRobot FPS 必须在 1 到 60 之间");
    if (lerobotGeneratingRef.current.has(id)) return;
    lerobotGeneratingRef.current.add(id);
    setLerobotGeneratingIds((current) => new Set(current).add(id));
    setError("");
    try {
      const response = await requestAgent(`/api/jobs/${id}/lerobot?fps=${encodeURIComponent(fps)}`, { method: "POST" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || `LeRobot 数据集生成失败（HTTP ${response.status}）`);
      }
      while (lerobotGeneratingRef.current.has(id)) {
        const jobResponse = await requestAgent(`/api/jobs/${id}`);
        if (!jobResponse.ok) throw new Error(`任务状态读取失败（HTTP ${jobResponse.status}）`);
        const updated = normalizeJob(await jobResponse.json());
        setBackendReady(true);
        setJobs((current) => {
          const exists = current.some((job) => job.id === updated.id);
          return exists
            ? current.map((job) => job.id === updated.id ? updated : job)
            : [updated, ...current];
        });
        if (updated.status === "completed" || updated.status === "failed") {
          const now = Date.now();
          setArchiveNow(now);
          syncHistory([updated], now);
          break;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "LeRobot 数据集生成失败：无法连接本地 Agent。");
    } finally {
      lerobotGeneratingRef.current.delete(id);
      setLerobotGeneratingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      void refreshJobs();
    }
  }

  function resetUploadSettings() {
    setRatio(HIGHEST_QUALITY_DEFAULTS.minDecodeRatio);
    setIncludeLeRobot(HIGHEST_QUALITY_DEFAULTS.createLerobot);
  }

  function removeHistory() {
    historyRecords.forEach((record) => clearedHistoryIdsRef.current.add(record.id));
    clearHistory(window.localStorage);
    setHistoryRecords([]);
  }

  return (
    <main className="app-shell">
      <Header connected={backendReady} message={agentMessage} />
      <div className="app-scroll">
        <section className="workspace-intro">
          <div><span>MCAP Data Processing Workspace</span><h1>数据处理工作区</h1><p>视频导出 · 质量检测 · LeRobot 数据集</p></div>
          <div className="workspace-stats"><div><strong>{currentJobs.length}</strong><span>当前任务</span></div><div><strong>{currentJobs.filter((job) => job.status === "processing").length}</strong><span>处理中</span></div><div><strong>{historyRecords.length}</strong><span>历史记录</span></div></div>
        </section>
        <WorkspaceTabs value={view} historyCount={historyRecords.length} onChange={setView} />
        {view === "current" ? <>
          <UploadCard inputRef={inputRef} selected={selected} selectedBytes={selectedBytes} dragging={dragging} uploading={uploading}
          uploadProgress={uploadProgress} connected={backendReady} error={error} ratio={ratio} includeLeRobot={includeLeRobot}
          agentMessage={agentMessage}
          onChoose={onChoose} onDrop={onDrop} onDragging={setDragging} onClear={() => setSelected([])}
          onRemove={(key) => setSelected((current) => current.filter((item) => item.key !== key))} onRatio={setRatio}
          onLeRobot={setIncludeLeRobot} onResetSettings={resetUploadSettings}
          onUpload={() => void uploadFiles(selected.map((item) => item.file))} />
        <JobList jobs={currentJobs} connected={backendReady} generatingIds={lerobotGeneratingIds}
          onDelete={(id) => void runAction(`/api/jobs/${id}`, "删除任务失败", { method: "DELETE" })}
          onAnalyze={(id) => void runAction(`/api/jobs/${id}/analyze`, "检测运行失败")}
          onRetry={(id) => void runAction(`/api/jobs/${id}/retry`, "任务重试失败")}
          onLeRobot={(id) => void createLeRobot(id)} />
        </> : <HistoryView records={historyRecords} connected={backendReady} onClear={removeHistory} />}
        <footer><span>MCAP 数据处理工作台</span><p>视频、分析报告和 LeRobot 数据集均保存在本机。</p></footer>
      </div>
    </main>
  );
}
