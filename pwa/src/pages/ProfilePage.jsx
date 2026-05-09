// pwa/src/pages/ProfilePage.jsx
export default function ProfilePage() {
  return (
    <div className="h-full pb-14 overflow-y-auto p-4">
      <h1 className="text-xl font-bold text-warm-text mb-2">Profile</h1>
      <p className="text-warm-muted text-sm">Set up your account to get started.</p>
      <div className="mt-6 space-y-4">
        <div className="bg-white rounded-xl p-4 border border-warm-border animate-pulse h-20" />
        <div className="bg-white rounded-xl p-4 border border-warm-border animate-pulse h-32" />
      </div>
    </div>
  );
}
