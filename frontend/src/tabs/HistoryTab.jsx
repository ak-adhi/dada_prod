import React, { useEffect, useMemo, useState } from 'react';
import Visualizations from '../components/Visualizations';

export default function HistoryTab() {
  const [loading, setLoading] = useState(false);

  // Filter lists provided by the API
  const [filters, setFilters] = useState({
    models: ['All'],
    usecases: ['All'],
    families: ['All'],
  });

  // Current selections
  const [selectedModel, setSelectedModel] = useState('All');
  const [selectedUsecase, setSelectedUsecase] = useState('All');
  const [selectedFamily, setSelectedFamily] = useState('All');
  const [selectedSuccess, setSelectedSuccess] = useState('All'); // All | True | False

  // Summary + data
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);      // respects Success filter
  const [rowsAll, setRowsAll] = useState([]); // ignores Success filter (for bar denominators)

  // Row expansion state
  const [open, setOpen] = useState({}); // rowId -> boolean
  const toggled = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const truncate = (text, n = 100) =>
    !text ? '' : text.length > n ? text.slice(0, n).trim() + '…' : text;

  const statusBadge = (success) => (
    <span
      className={`px-2 py-0.5 text-xs rounded ${
        success
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-green-50 text-green-700 border border-green-200'
      }`}
      title={success ? 'True' : 'False'}
    >
      {success ? 'True' : 'False'}
    </span>
  );

  const fmtLatency = (val) => {
    const num = parseFloat(val);
    if (Number.isNaN(num)) return '—';
    return `${num.toFixed(2)} ms`;
  };

  // Fetch history (two calls: one with Success filter, one with success=All)
  const fetchHistory = async (
    m = selectedModel,
    u = selectedUsecase,
    f = selectedFamily,
    s = selectedSuccess
  ) => {
    setLoading(true);
    try {
      const base = { model: m || 'All', usecase: u || 'All', family: f || 'All' };

      const qsFiltered = new URLSearchParams({ ...base, success: s || 'All' });
      const qsAll = new URLSearchParams({ ...base, success: 'All' });

      const [resFiltered, resAll] = await Promise.all([
        fetch(`/api/history?${qsFiltered.toString()}`),
        fetch(`/api/history?${qsAll.toString()}`),
      ]);

      const [dataFiltered, dataAll] = await Promise.all([
        resFiltered.json(),
        resAll.json(),
      ]);

      if (!dataFiltered.success) throw new Error(dataFiltered.error || 'Failed to load history');
      if (!dataAll.success) throw new Error(dataAll.error || 'Failed to load history (all)');

      setFilters({
        models: dataFiltered.filters?.models || ['All'],
        usecases: dataFiltered.filters?.usecases || ['All'],
        families: dataFiltered.filters?.families || ['All'],
      });

      setSummary(dataFiltered.summary || null);
      setRows(dataFiltered.data || []);
      setRowsAll(dataAll.data || []);
      setOpen({}); // collapse all on refresh or filter change
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Initial load defaults to All/All/All/All
  useEffect(() => {
    fetchHistory('All', 'All', 'All', 'All');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch whenever a filter changes
  useEffect(() => {
    fetchHistory(selectedModel, selectedUsecase, selectedFamily, selectedSuccess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel, selectedUsecase, selectedFamily, selectedSuccess]);

  // Summary cards
  const Summary = useMemo(() => {
    if (!summary) return null;
    const cards = [
      { label: 'Total Events', value: summary.total },
      { label: 'Succeeded', value: summary.success_count },
      { label: 'Blocked', value: summary.failure_count },
      { label: 'Success Rate', value: `${summary.success_rate}%` },
      { label: 'Avg Latency', value: `${Number(summary.avg_latency || 0).toFixed(2)} ms` },
    ];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
          >
            <div className="text-xs text-gray-500">{c.label}</div>
            <div className="mt-1 text-lg font-semibold text-brand-blue">{c.value}</div>
          </div>
        ))}
      </div>
    );
  }, [summary]);

  // Reset to default “All” on Refresh
  const onRefresh = () => {
    setSelectedModel('All');
    setSelectedUsecase('All');
    setSelectedFamily('All');
    setSelectedSuccess('All');
    fetchHistory('All', 'All', 'All', 'All');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Model</label>
          <select
            className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {filters.models?.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Usecase</label>
          <select
            className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
            value={selectedUsecase}
            onChange={(e) => setSelectedUsecase(e.target.value)}
          >
            {filters.usecases?.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Attack Family</label>
          <select
            className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
            value={selectedFamily}
            onChange={(e) => setSelectedFamily(e.target.value)}
          >
            {filters.families?.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Success</label>
          <select
            className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
            value={selectedSuccess}
            onChange={(e) => setSelectedSuccess(e.target.value)}
          >
            {['All', 'True', 'False'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onRefresh}
          className="h-[38px] px-4 rounded border border-brand-blue bg-white text-brand-blue hover:bg-gray-50"
          disabled={loading}
          title="Refresh (resets filters to All)"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Summary cards */}
      {Summary}

      {/* Visualization area */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="text-sm font-medium text-brand-blue mb-2">
          Visualizations (auto-updates with filters)
        </div>
        <Visualizations
          rows={rows}          // respects Success filter
          rowsAll={rowsAll}    // ignores Success filter (for bar denominators)
          selected={{
            model: selectedModel,
            usecase: selectedUsecase,
            family: selectedFamily,
            success: selectedSuccess,
          }}
        />
      </div>

      {/* Event Log header */}
      <div className="text-sm font-medium text-brand-blue">Event Log</div>

      {/* Event Log Table */}
      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-3 py-2 w-14">Index</th>
              <th className="text-left px-3 py-2">Model</th>
              <th className="text-left px-3 py-2">Usecase</th>
              <th className="text-left px-3 py-2">Attack Family</th>
              <th className="text-left px-3 py-2">Attack Name</th>
              <th className="text-left px-3 py-2">Success</th>
              <th className="text-left px-3 py-2">Latency</th>
              <th className="text-left px-3 py-2">Prompt</th>
              <th className="text-left px-3 py-2">Response</th>
              <th className="px-3 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => {
              const isOpen = !!open[r.id];
              return (
                <React.Fragment key={r.id}>
                  <tr className="align-top">
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2">{r.model}</td>
                    <td className="px-3 py-2">{r.usecase}</td>
                    <td className="px-3 py-2">{r.attack_family}</td>
                    <td className="px-3 py-2">{r.attack_name ?? '—'}</td>
                    <td className="px-3 py-2">{statusBadge(r.success)}</td>
                    <td className="px-3 py-2">{fmtLatency(r.latency)}</td>
                    <td className="px-3 py-2 text-gray-700">
                      <span title="Full prompt">{truncate(r.prompt, 80)}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <span title="Full response">{truncate(r.response, 80)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggled(r.id)}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? 'Collapse row' : 'Expand row'}
                        className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50 border-gray-300 text-brand-blue"
                        title={isOpen ? 'Hide details' : 'Show full Prompt & Response'}
                      >
                        {isOpen ? 'Collapse' : 'Expand'}
                      </button>
                    </td>
                  </tr>

                  {/* Expandable details */}
                  {isOpen && (
                    <tr className="bg-gray-50">
                      <td className="px-3 py-3" colSpan={10}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="rounded border border-gray-200 bg-white p-3">
                            <div className="text-xs font-semibold text-brand-blue mb-1">Full Prompt</div>
                            <pre className="text-[13px] leading-5 whitespace-pre-wrap break-words text-gray-800">
{r.prompt || '—'}
                            </pre>
                          </div>
                          <div className="rounded border border-gray-200 bg-white p-3">
                            <div className="text-xs font-semibold text-brand-blue mb-1">Full Response</div>
                            <pre className="text-[13px] leading-5 whitespace-pre-wrap break-words text-gray-800">
{r.response || '—'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {rows.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={10}>
                  No events found for the chosen filters.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={10}>
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500">
        Showing up to 2000 latest events. Use the filters above to refine results.
      </div>
    </div>
  );
}