// pwa/src/components/map/LocationBar.jsx
export default function LocationBar() {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between py-3">
        {/* Location selector */}
        <button className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#8BC34A" />
              <circle cx="12" cy="9" r="2.5" fill="white" />
            </svg>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="text-base font-semibold text-gray-900">Surulere, Lagos</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <span className="text-xs text-gray-400">Tap to change area</span>
          </div>
        </button>

        {/* Notification bell */}
        <button className="w-11 h-11 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
      </div>
    </div>
  );
}
