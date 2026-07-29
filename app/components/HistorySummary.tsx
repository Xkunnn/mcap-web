import type { DailySummary } from "../lib/historySummary";
import { formatBytes } from "../utils";

function duration(value?: number): string {
  if (value == null) return "-";
  if (value < 60) return `${Math.round(value)} 秒`;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return hours ? `${hours} 小时 ${minutes} 分` : `${minutes} 分`;
}

export function HistorySummary({ summary }: { summary: DailySummary }) {
  const items = [
    ["任务", summary.taskCount],
    ["MCAP 文件", summary.fileCount],
    ["总大小", formatBytes(summary.totalSize)],
    ["总录制时长", duration(summary.durationSeconds)],
    ["成功任务", summary.successfulTasks],
    ["失败任务", summary.failedTasks],
    ["PASS", summary.qualityCounts.PASS],
    ["CHECK", summary.qualityCounts.CHECK],
    ["FAIL", summary.qualityCounts.FAIL],
    ["N/A", summary.qualityCounts["N/A"]],
    ["LeRobot 已生成", summary.lerobotCompleted],
    ["LeRobot 不兼容", summary.lerobotUnsupported],
  ];
  return <div className="history-summary">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}
