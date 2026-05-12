'use client';

import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const SYSTEM_ACTORS = [
  'system',
  'SabiWork Agent',
  'SabiScore Engine',
  'AI Engine',
  'Squad API',
  'Squad Webhook',
  'Trust Engine',
  'SabiInvest Engine',
  'Supply Chain Engine',
  'SabiWork Platform',
];

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ events }) {
  const leaderboard = useMemo(() => {
    const actorMap = {};

    for (const event of events) {
      const actor =
        event.actor || event.worker_name || event.trader_name;
      if (!actor || SYSTEM_ACTORS.includes(actor)) continue;

      if (!actorMap[actor]) {
        actorMap[actor] = { name: actor, count: 0, totalValue: 0 };
      }

      actorMap[actor].count += 1;

      const amount = Number(event?.metadata?.amount || event?.amount || 0);
      if (amount > 0) {
        actorMap[actor].totalValue += amount;
      }
    }

    return Object.values(actorMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [events]);

  return (
    <Card className="h-full border-border/50">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Trophy className="h-3.5 w-3.5 text-yellow-400" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {leaderboard.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No activity yet
          </p>
        ) : (
          <div className="space-y-1.5">
            {leaderboard.map((participant, idx) => (
              <div
                key={participant.name}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${
                  idx === 0
                    ? 'bg-yellow-400/10 border border-yellow-400/30'
                    : 'bg-muted/50'
                }`}
              >
                <span className="text-sm w-5 text-center shrink-0">
                  {idx < 3 ? RANK_MEDALS[idx] : `${idx + 1}`}
                </span>
                <span className="flex-1 text-xs text-foreground truncate">
                  {participant.name}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {participant.count}
                </span>
                {participant.totalValue > 0 && (
                  <span className="text-[10px] font-mono text-yellow-400">
                    ₦{participant.totalValue.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
