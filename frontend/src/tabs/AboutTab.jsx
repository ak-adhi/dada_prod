export default function TeamTab(){
  return (
    <section>
      <h2 className="text-lg font-semibold text-brand-blue">Meet the team</h2>
      <p className="mt-2 text-sm text-gray-600">Each teammate gets their own tab in the full project — keep UI separation minimal to avoid git conflicts.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {['Adithya','Alfi',,'Amanda','Faiyaz','Nayna','Shashikanth','Siddartha'].map((name)=> (
          <div key={name} className="p-4 bg-white rounded-lg shadow text-sm">
            <div className="font-medium">{name}</div>
            <div className="text-gray-500 mt-1">Role & short bio (placeholder)</div>
          </div>
        ))}
      </div>
    </section>
  );
}