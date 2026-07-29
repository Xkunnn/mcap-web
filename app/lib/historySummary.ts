import type { HistoryRecord, QualityCounts } from "./historyManager";

export type DailySummary = {
  date: string;
  taskCount: number;
  fileCount: number;
  totalSize: number;
  durationSeconds?: number;
  successfulTasks: number;
  failedTasks: number;
  qualityCounts: QualityCounts;
  lerobotCompleted: number;
  lerobotUnsupported: number;
};

export function historyLocalDate(record: HistoryRecord): string {
  const date = new Date(record.finishedAt || record.updatedAt || record.archiveTimestamp || record.createdAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function groupHistoryByDate(records: HistoryRecord[], sortDates = true): Map<string, HistoryRecord[]> {
  const groups = new Map<string, HistoryRecord[]>();
  records.forEach((record) => {
    const date = historyLocalDate(record);
    groups.set(date, [...(groups.get(date) || []), record]);
  });
  return sortDates ? new Map([...groups.entries()].sort(([a], [b]) => b.localeCompare(a))) : groups;
}

export function createDailySummary(records: HistoryRecord[]): DailySummary {
  const qualityCounts = { PASS: 0, CHECK: 0, FAIL: 0, "N/A": 0 };
  let hasDuration = false;
  let durationSeconds = 0;
  records.forEach((record) => {
    Object.keys(qualityCounts).forEach((key) => {
      qualityCounts[key as keyof QualityCounts] += record.qualityCounts[key as keyof QualityCounts];
    });
    if (record.durationSeconds != null) {
      hasDuration = true;
      durationSeconds += record.durationSeconds;
    }
  });
  return {
    date: records[0] ? historyLocalDate(records[0]) : "",
    taskCount: records.length,
    fileCount: records.reduce((sum, record) => sum + record.fileCount, 0),
    totalSize: records.reduce((sum, record) => sum + record.totalSize, 0),
    durationSeconds: hasDuration ? durationSeconds : undefined,
    successfulTasks: records.filter((record) => record.status === "completed").length,
    failedTasks: records.filter((record) => record.status === "failed").length,
    qualityCounts,
    lerobotCompleted: records.reduce((sum, record) => sum + record.lerobotResults.length, 0),
    lerobotUnsupported: records.reduce((sum, record) => sum + record.lerobotUnsupportedCount, 0),
  };
}
