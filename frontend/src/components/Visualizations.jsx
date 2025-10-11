import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Label, Cell,
  PieChart, Pie,
} from 'recharts';

const COLORS = ['#0ea5e9','#a78bfa','#34d399','#fbbf24','#f43f5e','#22d3ee','#f59e0b','#10b981','#ef4444','#14b8a6','#8b5cf6','#84cc16'];
const toPct = (x) => (Number.isFinite(x) ? Number(x.toFixed(1)) : 0);
const isAll = (v) => !v || v === 'All';

const axisStyle = { fontSize: 12, fill: '#4b5563' }; // gray-600
const pctTick = (v) => (Number.isFinite(v) ? `${v}%` : '0%');

// ---- grouping helpers (always from rowsAll to avoid 100% artifact) ----
function groupCounts(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = r[key] ?? 'unknown';
    if (!m.has(k)) m.set(k, { name: k, total: 0, success: 0, failure: 0 });
    const g = m.get(k);
    g.total += 1;
    if (r.success) g.success += 1; else g.failure += 1;
  }
  return Array.from(m.values()).sort((a, b) => b.total - a.total);
}
function injectRate(groups, successFilter) {
  const wantFailure = successFilter === 'False';
  return groups.map((g, i) => ({
    ...g,
    rate: g.total ? toPct(100 * (wantFailure ? g.failure : g.success) / g.total) : 0,
    __color: COLORS[i % COLORS.length],
  }));
}

// ---- pies (driven by current success filter) ----
function rowsForPie(rows, successFilter) {
  if (successFilter === 'False') return rows.filter((r) => !r.success);
  // default: “All” or “True” → successes only
  return rows.filter((r) => r.success);
}
function pieByKey(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = r[key] ?? 'unknown';
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Array.from(m.entries())
    .map(([name, value], i) => ({ name, value, __color: COLORS[i % COLORS.length] }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}
function legendPayload(items) {
  return items.map((d) => ({
    value: d.name,
    type: 'square',
    color: d.__color || '#8884d8',
    id: d.name,
  }));
}

// ---- small layout bits ----
const SmallTitle = ({ children }) => (
  <div className="text-xs font-semibold text-brand-blue mb-2">{children}</div>
);
const Card = ({ title, children }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
    <SmallTitle>{title}</SmallTitle>
    <div className="h-64 text-brand-blue">{children}</div>
  </div>
);

// ---- chart builders ----
const BarGeneric = ({ title, data, xLabel }) => (
  <Card title={title}>
    <ResponsiveContainer>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={axisStyle} interval={0} angle={-10} textAnchor="end" height={48}>
          <Label value={xLabel} position="insideBottom" offset={-2} />
        </XAxis>
        <YAxis tick={axisStyle} tickFormatter={pctTick} domain={[0, 100]}>
          <Label value="Rate (%)" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle' }} />
        </YAxis>
        <Tooltip formatter={(v) => [`${v}%`, 'Rate']} />
        {/* No Legend here → avoids “rate” label */}
        <Bar dataKey="rate" fill="currentColor" />
      </BarChart>
    </ResponsiveContainer>
  </Card>
);

const BarFamilies = ({ title, data }) => (
  <Card title={title}>
    <ResponsiveContainer>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tick={false}              // hide all family names on axis
          height={28}
        >
          <Label value="Attack Families" position="insideBottom" offset={-2} />
        </XAxis>
        <YAxis tick={axisStyle} tickFormatter={pctTick} domain={[0, 100]}>
          <Label value="Rate (%)" angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle' }} />
        </YAxis>
        <Tooltip formatter={(v) => [`${v}%`, 'Rate']} />
        <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} payload={legendPayload(data)} />
        <Bar dataKey="rate">
          {data.map((d, i) => <Cell key={i} fill={d.__color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </Card>
);

const PieGeneric = ({ title, items, legendTitle }) => (
  <Card title={title}>
    <ResponsiveContainer>
      <PieChart>
        <Tooltip />
        <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} payload={legendPayload(items)} />
        <Pie data={items} dataKey="value" nameKey="name" outerRadius="80%">
          {items.map((d, i) => <Cell key={i} fill={d.__color || COLORS[i % COLORS.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  </Card>
);

export default function Visualizations({ rows, rowsAll, selected }) {
  const rateLabel = selected.success === 'False' ? 'Failure Rate' : 'Success Rate';

  // bar denominators come from rowsAll (ignores Success filter)
  const byModel = useMemo(
    () => injectRate(groupCounts(rowsAll, 'model'), selected.success),
    [rowsAll, selected.success]
  );
  const byUsecase = useMemo(
    () => injectRate(groupCounts(rowsAll, 'usecase'), selected.success),
    [rowsAll, selected.success]
  );
  const byFamily = useMemo(
    () => injectRate(groupCounts(rowsAll, 'attack_family'), selected.success),
    [rowsAll, selected.success]
  );

  // pies respect Success filter
  const pieRows = useMemo(() => rowsForPie(rows, selected.success), [rows, selected.success]);
  const pieFamilies = useMemo(() => pieByKey(pieRows, 'attack_family'), [pieRows]);
  const pieUsecases = useMemo(() => pieByKey(pieRows, 'usecase'), [pieRows]);
  const pieModels   = useMemo(() => pieByKey(pieRows, 'model'), [pieRows]);

  // scenario-specific pie helpers
  // A) for (family selected, model selected, usecase=All): pie of usecases within that model+family
  const pieUsecases_modelFamily = useMemo(() => pieByKey(pieRows, 'usecase'), [pieRows]);
  // B) for (family selected, model=All, usecase=All): n pies — one per model, each by usecase
  const piesPerModel_familyAll = useMemo(() => {
    if (!pieRows.length) return [];
    const m = new Map();
    for (const r of pieRows) {
      const arr = m.get(r.model) || [];
      arr.push(r);
      m.set(r.model, arr);
    }
    return Array.from(m.entries()).map(([model, arr]) => ({
      model,
      slices: pieByKey(arr, 'usecase'),
    }));
  }, [pieRows]);
  // C) for (family selected, usecase selected, model=All): one pie by model
  const pieModels_familyUsecase = pieModels;

  // choose which cards to render per your rules
  const S = selected;
  const cards = [];

  // 1) All model + All usecase + All family
  if (isAll(S.model) && isAll(S.usecase) && isAll(S.family)) {
    cards.push(
      <BarGeneric key="m-all" title={`${rateLabel} by Model`} data={byModel} xLabel="Models" />,
      <BarGeneric key="u-all" title={`${rateLabel} by Usecase`} data={byUsecase} xLabel="Usecases" />,
      <BarFamilies key="f-all" title={`${rateLabel} by Attack Family`} data={byFamily} />,
    );
  }

  // 2) All model + particular usecase + All family  (omit usecase chart)
  if (isAll(S.model) && !isAll(S.usecase) && isAll(S.family)) {
    cards.push(
      <BarGeneric key="m-u1" title={`${rateLabel} by Model`} data={byModel} xLabel="Models" />,
      <BarFamilies key="f-u1" title={`${rateLabel} by Attack Family`} data={byFamily} />,
    );
  }

  // 3) particular model + All usecase + All family
  if (!isAll(S.model) && isAll(S.usecase) && isAll(S.family)) {
    cards.push(
      <BarGeneric key="u-m1" title={`Usecase ${rateLabel} (${S.model})`} data={byUsecase} xLabel="Usecases" />,
      <BarFamilies key="f-m1" title={`Attack Family ${rateLabel} (${S.model})`} data={byFamily} />,
    );
  }

  // 4) particular model + particular usecase + All family
  if (!isAll(S.model) && !isAll(S.usecase) && isAll(S.family)) {
    cards.push(
      <BarFamilies key="f-mu" title={`Attack Family ${rateLabel} (${S.model} · ${S.usecase})`} data={byFamily} />,
      <PieGeneric
        key="pie-mu"
        title={`${S.success === 'False' ? 'Failures' : 'Successes'} by Attack Family`}
        items={pieFamilies}
      />
    );
  }

  // 5) particular model + All usecase + particular family → keep model chart; add pie of usecases
  if (!isAll(S.model) && isAll(S.usecase) && !isAll(S.family)) {
    cards.push(
      <BarGeneric
        key="model-onefam"
        title={`${rateLabel} by Model (${S.family})`}
        data={byModel}
        xLabel="Models"
      />,
      <PieGeneric
        key="pie-usecases-for-model-family"
        title={`${S.success === 'False' ? 'Failures' : 'Successes'} by Usecase (${S.model} · ${S.family})`}
        items={pieUsecases_modelFamily}
      />
    );
  }

  // 6) particular model + particular usecase + particular family → single family bar
  if (!isAll(S.model) && !isAll(S.usecase) && !isAll(S.family)) {
    const famOnly = byFamily.filter((d) => d.name === S.family);
    cards.push(
      <BarFamilies
        key="one-muf"
        title={`Attack Family ${rateLabel} (${S.model} · ${S.usecase})`}
        data={famOnly}
      />
    );
  }

  // 7) particular family + All model + All usecase → add n pies (one per model) + keep model bar
  if (!isAll(S.family) && isAll(S.model) && isAll(S.usecase)) {
    cards.push(
      <BarGeneric
        key="model-fam-all"
        title={`${rateLabel} by Model (${S.family})`}
        data={byModel}
        xLabel="Models"
      />
    );
    piesPerModel_familyAll.forEach(({ model, slices }) => {
      cards.push(
        <PieGeneric
          key={`pie-${model}`}
          title={`${S.success === 'False' ? 'Failures' : 'Successes'} by Usecase (${model} · ${S.family})`}
          items={slices}
        />
      );
    });
  }

  // 8) particular family + particular usecase + All model → bar by Model + pie per model (successes)
  if (!isAll(S.family) && !isAll(S.usecase) && isAll(S.model)) {
    cards.push(
      <BarGeneric
        key="model-fam-use"
        title={`${rateLabel} by Model (${S.family} · ${S.usecase})`}
        data={byModel}
        xLabel="Models"
      />,
      <PieGeneric
        key="pie-models-fam-use"
        title={`${S.success === 'False' ? 'Failures' : 'Successes'} by Model (${S.family} · ${S.usecase})`}
        items={pieModels_familyUsecase}
      />
    );
  }

  // fallback defaults
  if (cards.length === 0) {
    cards.push(
      <BarGeneric key="m-default" title={`${rateLabel} by Model`} data={byModel} xLabel="Models" />,
      <BarFamilies key="f-default" title={`${rateLabel} by Attack Family`} data={byFamily} />,
    );
  }

  return <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">{cards}</div>;
}
