export default function HistoryTab(){
  return (
    <section>
      <h2 className="text-lg font-semibold text-brand-blue">Attack & Defence History</h2>
      <p className="mt-2 text-sm text-gray-600">This dashboard will read from Postgres. Placeholder table below.</p>

      <div className="mt-6 overflow-auto">
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-3">#001</td>
              <td className="px-4 py-3">Injection</td>
              <td className="px-4 py-3">gpt-4o</td>
              <td className="px-4 py-3">Detected</td>
              <td className="px-4 py-3">2025-10-06 11:00</td>
            </tr>
            <tr>
              <td className="px-4 py-3">#002</td>
              <td className="px-4 py-3">Prompt Leaks</td>
              <td className="px-4 py-3">open-source-1</td>
              <td className="px-4 py-3">Blocked</td>
              <td className="px-4 py-3">2025-10-05 16:20</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}