export default function GrafanaPanel({ url, title, height = 260 }) {
  return (
    <div className="rounded-2xl shadow p-3 bg-white">
      <div className="px-1 pb-2 text-sm font-medium text-gray-700">{title}</div>
      <iframe
        src={url}
        width="100%"
        height={height}
        frameBorder="0"
        loading="lazy"
        className="rounded-xl w-full"
      />
    </div>
  );
}
