// pwa/src/pages/PulsePage.jsx
export default function PulsePage() {
  return (
    <div className="h-full pb-14 overflow-y-auto p-4">
      <h1 className="text-xl font-bold text-warm-text mb-2">Pulse</h1>
      <p className="text-warm-muted text-sm">Your economic dashboard is loading...</p>
      <div className="mt-6 space-y-4">
        <div className="bg-white rounded-xl p-4 border border-warm-border animate-pulse h-32" />
        <div className="bg-white rounded-xl p-4 border border-warm-border animate-pulse h-24" />
        <div className="bg-white rounded-xl p-4 border border-warm-border animate-pulse h-40" />
      </div>
    </div>
  );
}
