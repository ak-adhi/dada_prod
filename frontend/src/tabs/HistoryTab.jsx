import React, { useEffect, useMemo, useState } from 'react';
import Visualizations from '../components/Visualizations';

// Constants for success/defence filter options
const SUCCESS_OPTIONS = ['All', 'True', 'False'];
const DEFENCE_OPTIONS = ['False', 'True'];

export default function HistoryTab() {
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Filter lists loaded from dedicated list endpoints
  const [filters, setFilters] = useState({
    models: ['All'],
    usecases: ['All'],
    families: ['All'],
    successes: SUCCESS_OPTIONS,
    defences: DEFENCE_OPTIONS,
  });

  // Current selections (Defence defaults to False)
  const [selectedModel, setSelectedModel] = useState('All');
  const [selectedUsecase, setSelectedUsecase] = useState('All');
  const [selectedFamily, setSelectedFamily] = useState('All');
  const [selectedSuccess, setSelectedSuccess] = useState('All');   // All | True | False
  const [selectedDefence, setSelectedDefence] = useState('False'); // False | True

  // Summary + data
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);       // respects Success + Defence
  const [rowsAll, setRowsAll] = useState([]); // ignores Success (but respects Defence)

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
  
  /**
   * Helper function to extract string values from potentially complex API responses.
   * Handles array of strings OR array of objects (e.g., [{"llm_name": "model_a"}]).
   */
  const extractNames = (data, keyName) => {
    if (Array.isArray(data)) {
      // If it's an array of objects, map to the value of the expected key
      if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null && keyName in data[0]) {
        return data.map(item => item[keyName]).filter(name => typeof name === 'string');
      }
      // Otherwise, assume it's already an array of strings
      return data;
    }
    return [];
  };

  /**
   * Fetches the static filter lists (Models, Usecases, Families) once on load.
   */
  const fetchFilters = async () => {
    // console.log('--- fetchFilters: Starting filter list fetch.'); // DEBUG
    setLoadingFilters(true);
    try {
      // Define endpoints and the expected key name in the database results
      const endpoints = {
        models: { url: '/api/v1/list/llms', key: 'llm_name' },
        usecases: { url: '/api/v1/list/usecases', key: 'usecase_name' },
        families: { url: '/api/v1/list/attack_families', key: 'attack_family' },
      };

      const results = await Promise.all(
        Object.values(endpoints).map(({ url }) => fetch(url))
      );

      const data = await Promise.all(
        results.map(res => res.json())
      );
      
      // console.log('--- fetchFilters: Raw API filter data received:', data); // DEBUG

      // Process results using the helper function
      const models = ['All', ...extractNames(data[0], endpoints.models.key)];
      const usecases = ['All', ...extractNames(data[1], endpoints.usecases.key)];
      const families = ['All', ...extractNames(data[2], endpoints.families.key)];
      
      // console.log('--- fetchFilters: Processed filters:', { models, usecases, families }); // DEBUG

      setFilters(prev => ({
        ...prev,
        models: models,
        usecases: usecases,
        families: families,
      }));
    } catch (e) {
      // console.error("Error fetching filter lists:", e);
      // Keep default filter options on failure
    } finally {
      setLoadingFilters(false);
    }
  };

  /**
   * Fetches history data based on current selections.
   */
  const fetchHistory = async (
    m = selectedModel,
    u = selectedUsecase,
    f = selectedFamily,
    s = selectedSuccess,
    d = selectedDefence
  ) => {
    // Only proceed if filters are loaded, or if this is the initial run
    if (loadingFilters) return;

    setLoading(true);
    try {
      // Base query params for all requests
      const base = { model: m, usecase: u, family: f, defence: d };

      // 1. Fetch filtered data (respects selectedSuccess)
      const qsFiltered = new URLSearchParams({ ...base, success: s });
      
      // 2. Fetch all data (explicitly ignores success filter to get baseline for visualizations)
      const qsAll = new URLSearchParams({ ...base, success: 'All' }); 

      // console.log('--- fetchHistory: Fetching filtered with:', qsFiltered.toString()); // DEBUG
      // console.log('--- fetchHistory: Fetching all with:', qsAll.toString()); // DEBUG

      const [resFiltered, resAll] = await Promise.all([
        fetch(`/api/v1/history?${qsFiltered.toString()}`),
        fetch(`/api/v1/history?${qsAll.toString()}`),
      ]);
      
      // Check for non-200 response codes before trying to parse JSON
      if (!resFiltered.ok) throw new Error(`History API failed: ${resFiltered.statusText}`);
      if (!resAll.ok) throw new Error(`History All API failed: ${resAll.statusText}`);


      const [dataFiltered, dataAll] = await Promise.all([
        resFiltered.json(),
        resAll.json(),
      ]);

      // console.log('--- fetchHistory: Filtered Data Response:', dataFiltered); // DEBUG
      // console.log('--- fetchHistory: All Data Response:', dataAll); // DEBUG

      if (!dataFiltered.success) throw new Error(dataFiltered.error || 'Failed to load history');
      if (!dataAll.success) throw new Error(dataAll.error || 'Failed to load history (all)');

      setSummary(dataFiltered.summary || null);
      setRows(dataFiltered.data || []);
      setRowsAll(dataAll.data || []);
      setOpen({}); // collapse all on refresh or filter change
      
      // console.log('--- fetchHistory: Data set successfully. Rows filtered:', (dataFiltered.data || []).length); // DEBUG

    } catch (e) {
      // console.error("Error fetching history data:", e);
      setSummary(null);
      setRows([]);
      setRowsAll([]);
    } finally {
      setLoading(false);
    }
  };

  // 1. Initial filter list fetch (runs once)
  useEffect(() => {
    fetchFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Initial history load (runs once after filters are loaded)
  useEffect(() => {
    if (!loadingFilters) {
      fetchHistory(selectedModel, selectedUsecase, selectedFamily, selectedSuccess, selectedDefence);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingFilters]);

  // 3. Re-fetch history whenever a selection filter changes
  useEffect(() => {
    // Prevent fetching until filters are fully loaded and the initial run is complete
    if (!loadingFilters) {
      fetchHistory(selectedModel, selectedUsecase, selectedFamily, selectedSuccess, selectedDefence);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel, selectedUsecase, selectedFamily, selectedSuccess, selectedDefence]);

  // Summary cards (Memoized for performance)
  const Summary = useMemo(() => {
    if (!summary) return null;
    const cards = [
      { label: 'Total Events', value: summary.total },
      { label: 'Succeeded', value: summary.success_count },
      { label: 'Blocked', value: summary.failure_count },
      { label: 'Success Rate', value: `${summary.success_rate}%` },
      { label: 'Avg Latency', value: `${Number(summary.avg_latency || 0).toFixed(2)} ms` },
    ];
    // console.log('--- Summary Memo: Summary data calculated:', cards); // DEBUG
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

  // Reset to default on Refresh
  const onRefresh = () => {
    // Reset selections to defaults
    setSelectedModel('All');
    setSelectedUsecase('All');
    setSelectedFamily('All');
    setSelectedSuccess('All');
    setSelectedDefence('False'); // default
    
    // Explicitly re-run fetch to bypass effect debounce if needed (though effects should handle it)
    fetchHistory('All', 'All', 'All', 'All', 'False');
  };

  const currentLoadingState = loading || loadingFilters;
  
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
            disabled={currentLoadingState}
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
            disabled={currentLoadingState}
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
            disabled={currentLoadingState}
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
            disabled={currentLoadingState}
          >
            {filters.successes?.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Defence</label>
          <select
            className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
            value={selectedDefence}
            onChange={(e) => setSelectedDefence(e.target.value)}
            disabled={currentLoadingState}
          >
            {filters.defences?.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onRefresh}
          className="h-[38px] px-4 rounded border border-brand-blue bg-white text-brand-blue hover:bg-gray-50"
          disabled={currentLoadingState}
          title="Refresh (resets filters to All/False)"
        >
          {currentLoadingState ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Summary cards */}
      {Summary}

      {/* Visualization area */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="text-sm font-medium text-brand-blue mb-2">
          Visualizations
        </div>
        <Visualizations
          rows={rows}          // respects Success + Defence
          rowsAll={rowsAll}    // ignores Success but respects Defence
          selected={{
            model: selectedModel,
            usecase: selectedUsecase,
            family: selectedFamily,
            success: selectedSuccess,
            defence: selectedDefence,
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
              <th className="text-left px-3 py-2">Defence</th>
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
                    <td className="px-3 py-2">{r.defence ? 'True' : 'False'}</td>
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
                      <td className="px-3 py-3" colSpan={11}>
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

            {rows.length === 0 && !currentLoadingState && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={11}>
                  No events found for the chosen filters.
                </td>
              </tr>
            )}
            {currentLoadingState && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={11}>
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
