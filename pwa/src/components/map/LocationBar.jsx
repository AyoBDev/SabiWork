// pwa/src/components/map/LocationBar.jsx
import { MapPin, ChevronDown, Bell } from 'lucide-react';

export default function LocationBar() {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 bg-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Location selector */}
        <button className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
            <MapPin className="w-[18px] h-[18px] text-sabi-green" fill="#8BC34A" strokeWidth={0} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="text-base font-semibold text-gray-900">Surulere, Lagos</span>
              <ChevronDown className="w-4 h-4 text-gray-700" />
            </div>
            <span className="text-xs text-gray-400">Tap to change area</span>
          </div>
        </button>

        {/* Notification bell */}
        <button className="w-11 h-11 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
          <Bell className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
}
