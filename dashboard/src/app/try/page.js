// dashboard/src/app/try/page.js
import { Smartphone, MessageCircle } from 'lucide-react';

const PWA_URL = process.env.NEXT_PUBLIC_PWA_URL || 'https://pwa-production-af30.up.railway.app/';
const WHATSAPP_URL = 'https://wa.me/2347070979606?text=Join%20SabiWork%20Demo';

export const metadata = {
  title: 'Try SabiWork',
  description: 'Try SabiWork — your AI business assistant via app or WhatsApp',
};

export default function TryPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo + Tagline */}
        <div className="flex flex-col items-center gap-3">
          <img
            src="/logo.png"
            alt="SabiWork"
            width={64}
            height={64}
            className="rounded-2xl"
          />
          <h1 className="text-xl font-bold text-foreground text-center">
            Try SabiWork
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Your AI business assistant
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="w-full flex flex-col gap-4">
          <a
            href={PWA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-base transition-colors"
          >
            <Smartphone className="w-5 h-5" />
            Use the App
          </a>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-xl border-2 border-green-500 text-green-400 hover:bg-green-500/10 font-semibold text-base transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Use WhatsApp
          </a>
        </div>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground text-center">
          Choose how you'd like to interact with SabiWork
        </p>
      </div>
    </div>
  );
}
