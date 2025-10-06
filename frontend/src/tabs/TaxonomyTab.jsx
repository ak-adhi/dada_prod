export default function TaxonomyTab(){
  return (
    <section>
      <h2 className="text-lg font-semibold text-brand-blue">Taxonomy</h2>
      <p className="mt-2 text-sm text-gray-600">Tree + list view. Each node should offer an option to perform the selected attack (with/without defence).</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="font-medium">Tree (placeholder)</h3>
          <ul className="mt-3 text-sm text-gray-600 space-y-2">
            <li>• Injection attacks</li>
            <li>• Prompt leaks</li>
            <li>• Data exfiltration</li>
          </ul>
        </div>

        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="font-medium">Node actions</h3>
          <p className="text-sm text-gray-600 mt-2">For each node: "Run attack" / "Run attack + defence" buttons (placeholder).</p>
        </div>
      </div>
    </section>
  );
}
