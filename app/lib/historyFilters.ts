import type { HistoryRecord } from "./historyManager";

export type HistoryFilters = {
  search: string;
  from: string;
  to: string;
  status: string;
  quality: string;
  lerobot: string;
  sort: string;
};

export function filterAndSortHistory(records: HistoryRecord[], filters: HistoryFilters): HistoryRecord[] {
  const term = filters.search.trim().toLocaleLowerCase();
  const start = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const end = filters.to ? new Date(`${filters.to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  return records.filter((record) => {
    const timestamp = new Date(record.finishedAt || record.archiveTimestamp).getTime();
    return (!term || record.files.some((file) => file.name.toLocaleLowerCase().includes(term)))
      && timestamp >= start && timestamp <= end
      && (filters.status === "all" || record.status === filters.status)
      && (filters.quality === "all" || record.qualityStatus === filters.quality)
      && (filters.lerobot === "all"
        || (filters.lerobot === "completed" && record.lerobotResults.length > 0)
        || (filters.lerobot === "unsupported" && record.lerobotUnsupportedCount > 0));
  }).sort((a, b) => {
    if (filters.sort === "size") return b.totalSize - a.totalSize;
    const left = new Date(a.finishedAt || a.archiveTimestamp).getTime();
    const right = new Date(b.finishedAt || b.archiveTimestamp).getTime();
    return filters.sort === "oldest" ? left - right : right - left;
  });
}

export function paginateHistory(records: HistoryRecord[], page: number, pageSize = 20) {
  const pages = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.max(1, Math.min(page, pages));
  return {
    page: currentPage,
    pages,
    records: records.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  };
}
