import { memo } from "react";
import { Activity, Zap, TrendingUp, AlertCircle } from "lucide-react";

const KpiCards = memo(({ stats }) => {
  const formatNumber = (value) =>
    Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Number(value || 0));

  const cards = [
    {
      label: "Avg Latency",
      value: stats.avgLatency ? `${stats.avgLatency.toFixed(2)}ms` : "N/A",
      icon: Zap,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "P95 Latency",
      value: stats.p95Latency ? `${stats.p95Latency.toFixed(2)}ms` : "N/A",
      icon: TrendingUp,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      label: "Success Rate",
      value: stats.successRate ? `${stats.successRate.toFixed(1)}%` : "N/A",
      icon: Activity,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Total Requests",
      value: formatNumber(stats.totalRequests || 0),
      icon: AlertCircle,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">{card.label}</span>
              <div className={`${card.bgColor} p-2 rounded-lg`}>
                <Icon size={16} className={card.color} />
              </div>
            </div>
            <div className="text-2xl font-bold text-base-content">{card.value}</div>
            <div className="text-xs text-base-content/50 mt-1">
              {card.label === "Success Rate"
                ? "Successful requests"
                : card.label === "Total Requests"
                  ? "Total API calls"
                  : "Response time"}
            </div>
          </div>
        );
      })}
    </section>
  );
});

KpiCards.displayName = "KpiCards";

export default KpiCards;
