'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Users } from 'lucide-react';

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || '/try';
const QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(LANDING_URL)}&bgcolor=1a1a1a&color=ffffff`;

export default function AudienceQR({ participantCount = 0 }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5" />
            Audience Participation
          </CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            <Users className="w-3 h-3" />
            {participantCount} joined
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex flex-col items-center gap-3">
        <img
          src={QR_SRC}
          alt="Scan to try SabiWork"
          width={200}
          height={200}
          className="rounded-lg"
        />
        <p className="text-sm font-medium text-foreground">
          Scan to try SabiWork
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Try via app or WhatsApp
        </p>
      </CardContent>
    </Card>
  );
}
