const teams = ["Northstar Cloud", "HelixOps", "BlueScale", "Orbital Labs", "Vertex Infra"];

export default function TrustBar() {
  return (
    <section className="py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-slate-400">
          Built for modern cloud teams
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {teams.map((team) => (
            <div
              key={team}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
            >
              {team}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
