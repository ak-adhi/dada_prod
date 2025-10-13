import GrafanaPanel from "./GrafanaPanel";

const toSubpath = (u) => u.replace(/^https?:\/\/[^/]+/, "");
const ensureParam = (u, key, value) =>
  u.includes(`${key}=`) ? u.replace(new RegExp(`${key}=[^&]*`), `${key}=${value}`) : `${u}&${key}=${value}`;
const norm = (u) => {
  let v = toSubpath(u);
  v = v.replace(/from=\d+/g, "from=now-15m");
  v = v.replace(/to=\d+/g, "to=now");
  v = ensureParam(v, "refresh", "5s");
  v = ensureParam(v, "theme", "light");
  v = ensureParam(v, "kiosk", ""); // hide chrome
  return v;
};

const RAW = {
  success:  "http://localhost/grafana/d-solo/adsx9x2/new-dashboard?orgId=1&from=1759900101195&to=1759901001195&timezone=browser&refresh=5s&panelId=panel-1&__feature.dashboardSceneSolo=true",
  apm:      "http://localhost/grafana/d-solo/adsx9x2/new-dashboard?orgId=1&from=1759900081198&to=1759900981198&timezone=browser&refresh=5s&panelId=panel-2&__feature.dashboardSceneSolo=true",
  failures: "http://localhost/grafana/d-solo/adsx9x2/new-dashboard?orgId=1&from=1759899987958&to=1759900887958&timezone=browser&refresh=5s&panelId=panel-6&__feature.dashboardSceneSolo=true",
  running:  "http://localhost/grafana/d-solo/adsx9x2/new-dashboard?orgId=1&from=1759900046196&to=1759900946196&timezone=browser&refresh=5s&panelId=panel-4&__feature.dashboardSceneSolo=true",
  p95:      "http://localhost/grafana/d-solo/adsx9x2/new-dashboard?orgId=1&from=1759900066196&to=1759900966196&timezone=browser&refresh=5s&panelId=panel-3&__feature.dashboardSceneSolo=true",
  family:   "http://localhost/grafana/d-solo/adsx9x2/new-dashboard?orgId=1&from=1759900031196&to=1759900931196&timezone=browser&refresh=5s&panelId=panel-5&__feature.dashboardSceneSolo=true",
};

const PANELS = Object.fromEntries(Object.entries(RAW).map(([k, v]) => [k, norm(v)]));

export default function LiveMetrics({ visible = true }) {
  if (!visible) return null;
  return (
    <section className="mt-6">
      <h3 className="text-lg font-semibold text-blue-600 mb-3">Live Metrics</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GrafanaPanel url={PANELS.success}  title="" height={260} />
        <GrafanaPanel url={PANELS.apm}      title="" height={260} />
        <GrafanaPanel url={PANELS.failures} title="" height={260} />
        <GrafanaPanel url={PANELS.running}  title="" height={260} />
        <GrafanaPanel url={PANELS.p95}      title="" height={260} />
        <GrafanaPanel url={PANELS.family}   title="" height={260} />
      </div>
    </section>
  );
}
