"use client";

import { useMemo, useState } from "react";
import { filterAndSortHistory, paginateHistory } from "../lib/historyFilters";
import type { HistoryRecord } from "../lib/historyManager";
import { createDailySummary, groupHistoryByDate } from "../lib/historySummary";
import { HistoryJobList } from "./HistoryJobList";
import { HistorySummary } from "./HistorySummary";

const PAGE_SIZE = 20;

export function HistoryView({
  records,
  connected,
  onClear,
}: {
  records: HistoryRecord[];
  connected: boolean | null;
  onClear: () => void;
}) {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("all");
  const [quality, setQuality] = useState("all");
  const [lerobot, setLerobot] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return filterAndSortHistory(records, { search, from, to, status, quality, lerobot, sort });
  }, [records, search, from, to, status, quality, lerobot, sort]);

  const pagination = paginateHistory(filtered, page, PAGE_SIZE);
  const pages = pagination.pages;
  const currentPage = pagination.page;
  const visible = pagination.records;
  const visibleIds = new Set(visible.map((record) => record.id));
  const groups = groupHistoryByDate(filtered, false);

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  function clearWithConfirmation() {
    if (window.confirm("确认清除当前浏览器中的历史记录吗？本机 Agent 中的任务文件不会被删除。")) onClear();
  }

  return <section className="history-view">
    {connected === false && <div className="stale-data-notice">当前为离线历史记录，启动本地 Agent 后可同步最新任务。</div>}
    <div className="history-toolbar">
      <input aria-label="文件名搜索" placeholder="搜索文件名" value={search} onChange={(event) => updateFilter(() => setSearch(event.target.value))} />
      <label><span>开始日期</span><input type="date" value={from} onChange={(event) => updateFilter(() => setFrom(event.target.value))} /></label>
      <label><span>结束日期</span><input type="date" value={to} onChange={(event) => updateFilter(() => setTo(event.target.value))} /></label>
      <select aria-label="任务状态" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}><option value="all">全部任务状态</option><option value="completed">已完成</option><option value="failed">失败</option></select>
      <select aria-label="综合质量状态" value={quality} onChange={(event) => updateFilter(() => setQuality(event.target.value))}><option value="all">全部质量状态</option><option value="PASS">PASS</option><option value="CHECK">CHECK</option><option value="FAIL">FAIL</option></select>
      <select aria-label="LeRobot 状态" value={lerobot} onChange={(event) => updateFilter(() => setLerobot(event.target.value))}><option value="all">全部 LeRobot 状态</option><option value="completed">LeRobot 已生成</option><option value="unsupported">LeRobot 不兼容</option></select>
      <select aria-label="排序" value={sort} onChange={(event) => updateFilter(() => setSort(event.target.value))}><option value="newest">完成时间从新到旧</option><option value="oldest">完成时间从旧到新</option><option value="size">文件大小从大到小</option></select>
      <button className="danger-outline" disabled={!records.length} onClick={clearWithConfirmation}>清除历史记录</button>
    </div>
    <p className="history-clear-note">清除历史记录只会清除当前浏览器中的记录，不会删除本机 Agent 中的任务文件。</p>
    {!filtered.length ? <div className="empty-state"><span>◇</span><strong>暂无历史记录</strong><p>完成超过 24 小时的任务会自动归档到这里。</p></div> :
      <div className="history-groups">{[...groups.entries()].map(([date, dateRecords]) => {
        const pageRecords = dateRecords.filter((record) => visibleIds.has(record.id));
        if (!pageRecords.length) return null;
        const expanded = expandedDates.has(date);
        return <section className="history-day" key={date}>
          <header><div><span>历史日期</span><h3>{date}</h3></div><button onClick={() => setExpandedDates((current) => {
            const next = new Set(current);
            if (next.has(date)) next.delete(date); else next.add(date);
            return next;
          })}>{expanded ? "收起任务" : "展开任务"}</button></header>
          <HistorySummary summary={createDailySummary(dateRecords)} />
          {expanded && <HistoryJobList records={pageRecords} />}
        </section>;
      })}</div>}
    {filtered.length > 0 && <div className="history-pagination"><button disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button><span>第 {currentPage} / {pages} 页 · 共 {filtered.length} 条</span><button disabled={currentPage >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>下一页</button></div>}
  </section>;
}
