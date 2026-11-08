import { useClientGlobal } from "../../contexts/ClientGlobal";
import { dashboardMetrics } from "../../dashboard/metrics";
import { useLocaleText } from "../../contexts/Locale";
import { DashboardSummary } from "../../controllers/DashboardController";
import Price from "../Items/Price";

export default function DashboardMetrics({ data }: { data: DashboardSummary }) {
  const t = useLocaleText();
  const { purchasing } = useClientGlobal();
  const metrics = dashboardMetrics(data, purchasing);
  return (
    <section className="dashboard-metrics" aria-label={t("DASH_OVERVIEW")}>
      {metrics.map((metric) => (
        <article className="dashboard-metric" key={metric.label}>
          <h2>{t(metric.label)}</h2>
          <div className="dashboard-value">
            {"money" in metric ? (
              <Price price={metric.value} />
            ) : (
              metric.value.toLocaleString()
            )}
          </div>
          {"note" in metric && <p>{t(metric.note)}</p>}
        </article>
      ))}
    </section>
  );
}
