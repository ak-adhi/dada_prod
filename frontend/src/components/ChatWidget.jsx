export default function ChatWidget({onClose}){
  return (
    <div className="w-80 bg-white rounded-xl shadow-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">DADA Bot</div>
        <div className="text-xs text-gray-500">v0.1</div>
      </div>

      <div className="h-40 overflow-auto text-sm text-gray-700 bg-gray-50 rounded p-2">Hello — I'm the DADA prototype helper. Ask me about this project (placeholder).</div>

      <div className="mt-3 flex gap-2">
        <input className="flex-1 rounded border px-2 py-1 bg-white text-gray-900 placeholder-gray-400" placeholder="Type a question..." />
        <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}