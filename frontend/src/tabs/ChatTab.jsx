export default function ChatTab() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-brand-blue">Chat with Custom Prompts</h2>
      <p className="mt-2 text-sm text-gray-600">
        Select model and usecase, craft a quick user prompt. This is only a skeleton.
      </p>

      <div className="mt-6 p-4 bg-white rounded-lg shadow">
        {/* Model Selection */}
        <label className="block text-sm font-medium">Model</label>
        <select className="mt-2 w-full rounded border px-3 py-2 bg-white text-gray-900">
          <option>gpt-4o</option>
          <option>gpt-5</option>
          <option>open-source-1</option>
        </select>

        {/* Business Usecase Selection */}
        <label className="block text-sm font-medium mt-4">Business Usecase</label>
        <select className="mt-2 w-full rounded border px-3 py-2 bg-white text-gray-900">
          <option>Customer Support</option>
          <option>Internal Knowledge Base</option>
          <option>Marketing Copy</option>
          <option>Other</option>
        </select>

        {/* Prompt */}
        <label className="block text-sm font-medium mt-4">Prompt</label>
        <textarea
          className="mt-2 w-full rounded border p-3 h-24 bg-white text-gray-900"
          placeholder="Write a quick prompt..."
        ></textarea>

        <div className="mt-4 text-right">
          <button className="px-4 py-2 rounded-lg bg-white border">Cancel</button>
          <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white ml-3">
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
