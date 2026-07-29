"use client";

export type WorkspaceView = "current" | "history";

export function WorkspaceTabs({
  value,
  historyCount,
  onChange,
}: {
  value: WorkspaceView;
  historyCount: number;
  onChange: (value: WorkspaceView) => void;
}) {
  return (
    <nav className="workspace-tabs" aria-label="工作区视图">
      <button className={value === "current" ? "active" : ""} onClick={() => onChange("current")}>当前检测</button>
      <button className={value === "history" ? "active" : ""} onClick={() => onChange("history")}>历史记录 <span>{historyCount}</span></button>
    </nav>
  );
}
