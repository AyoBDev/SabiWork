// dashboard/src/components/ChannelChart.jsx
'use client';

export default function ChannelChart({ channels }) {
  const data = channels || [
    { channel: 'card', count: 23, percentage: 46 },
    { channel: 'transfer', count: 15, percentage: 30 },
    { channel: 'ussd', count: 8, percentage: 16 },
    { channel: 'bank', count: 4, percentage: 8 }
  ];

  const colors = {
    card: '#F9A825',
    transfer: '#1B7A3D',
    ussd: '#E8630A',
    bank: '#1976D2'
  };

  return (
    <div className="bg-dash-surface border border-dash-border rounded-xl p-3">
      <h3 className="text-xs font-semibold text-dash-text mb-3">Payment Channels</h3>

      {/* Stacked bar */}
      <div className="h-4 rounded-full overflow-hidden flex mb-3">
        {data.map((d) => (
          <div
            key={d.channel}
            style={{ width: `${d.percentage}%`, background: colors[d.channel] || '#666' }}
            className="h-full"
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-1.5">
        {data.map((d) => (
          <div key={d.channel} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: colors[d.channel] }} />
            <span className="text-[10px] text-dash-muted capitalize">{d.channel}</span>
            <span className="text-[10px] text-dash-text font-mono ml-auto">{d.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
