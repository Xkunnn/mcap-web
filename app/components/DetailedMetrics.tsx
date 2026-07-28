import { agentUrl } from "../lib/agent";
import type { ResultItem } from "../types";
import { AnalysisAccordion } from "./AnalysisAccordion";

export function DetailedMetrics({ results }: { results: ResultItem[] }) {
  const analyzed = results.filter((result) => result.analysis);
  if (!analyzed.length) return <div className="empty-inline"><span>◇</span><strong>暂无详细指标</strong><p>点击“运行分析”生成质量检测报告。</p></div>;
  return <div className="analysis-result-stack">
    {analyzed.map((result, index) => <details className="result-accordion" key={`${result.source}-${index}`} open={index === 0}>
      <summary><strong>{result.source}</strong><span>{result.analysis?.metrics.length || 0} 项指标</span><i>⌄</i></summary>
      <div className="result-accordion-body">
        <AnalysisAccordion metrics={result.analysis?.metrics || []} topics={result.analysis?.selected_topics || []} />
        {result.analysis?.report_url && <a className="download-link" href={agentUrl(result.analysis.report_url)}>下载完整分析 JSON ↓</a>}
      </div>
    </details>)}
  </div>;
}
