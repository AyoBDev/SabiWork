// pwa/src/components/agent/OnboardPage.jsx
import { useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import api from '../../services/api';

const TRADES = [
  'plumbing', 'electrical', 'carpentry', 'cleaning', 'tailoring',
  'hairdressing', 'painting', 'catering', 'welding', 'tiling'
];

const AREAS = [
  'surulere', 'yaba', 'ikeja', 'lekki', 'victoria_island',
  'mushin', 'maryland', 'ojota', 'ikorodu', 'ajah'
];

export default function OnboardPage() {
  const { location, loading: gpsLoading, capture } = useGeolocation();
  const [form, setForm] = useState({
    name: '', phone: '', primary_trade: '', service_areas: [],
    bank_code: '', account_number: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleArea = (area) => {
    setForm((f) => ({
      ...f,
      service_areas: f.service_areas.includes(area)
        ? f.service_areas.filter((a) => a !== area)
        : [...f.service_areas, area]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Capture GPS if not already done
      let coords = location;
      if (!coords) {
        coords = await capture();
      }

      await api.getWorkers(); // placeholder — will call onboard endpoint
      const payload = {
        ...form,
        location_lat: coords.lat,
        location_lng: coords.lng,
        onboarding_channel: 'field_agent',
        gps_verified: true
      };

      // POST to onboard endpoint
      const response = await fetch('/api/workers/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      setSuccess(result);
      setForm({ name: '', phone: '', primary_trade: '', service_areas: [], bank_code: '', account_number: '' });
    } catch (err) {
      alert('Registration failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="h-full pb-14 overflow-y-auto p-4">
        <div className="bg-sabi-green/5 rounded-xl border border-sabi-green/20 p-6 text-center mt-8">
          <p className="text-3xl mb-2">✅</p>
          <h2 className="text-lg font-bold text-sabi-green">Worker Registered!</h2>
          <p className="text-sm text-warm-text mt-1">{success.name || form.name}</p>
          {success.virtual_account_number && (
            <p className="text-xs text-warm-muted mt-2">
              VA: <span className="font-mono text-sabi-green">{success.virtual_account_number}</span>
            </p>
          )}
          <button
            onClick={() => setSuccess(null)}
            className="mt-4 px-6 py-2 bg-sabi-green text-white rounded-lg text-sm font-medium"
          >
            Register Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full pb-14 overflow-y-auto">
      <div className="sticky top-0 bg-warm-bg/95 backdrop-blur-sm z-10 px-4 pt-4 pb-2 border-b border-warm-border">
        <h1 className="text-lg font-bold text-warm-text">Onboard Worker</h1>
        <p className="text-xs text-warm-muted">GPS will be captured automatically</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* GPS status */}
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2.5 h-2.5 rounded-full ${location ? 'bg-sabi-green' : 'bg-cash-gold animate-pulse'}`} />
          <span className="text-warm-muted">
            {location
              ? `GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} (±${Math.round(location.accuracy)}m)`
              : gpsLoading ? 'Acquiring GPS...' : 'GPS will capture on submit'}
          </span>
          {!location && (
            <button type="button" onClick={capture} className="text-sabi-green font-medium">
              Capture Now
            </button>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-medium text-warm-text">Full Name</label>
          <input
            type="text" required value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-warm-border text-sm focus:outline-none focus:border-sabi-green"
            placeholder="Enter worker's name"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-medium text-warm-text">Phone Number</label>
          <input
            type="tel" required value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-warm-border text-sm focus:outline-none focus:border-sabi-green"
            placeholder="08012345678"
          />
        </div>

        {/* Trade */}
        <div>
          <label className="text-xs font-medium text-warm-text">Primary Trade</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {TRADES.map((trade) => (
              <button
                key={trade} type="button"
                onClick={() => updateField('primary_trade', trade)}
                className={`h-9 rounded-lg text-xs font-medium capitalize transition-colors ${
                  form.primary_trade === trade
                    ? 'bg-sabi-green text-white'
                    : 'bg-warm-bg text-warm-text border border-warm-border'
                }`}
              >
                {trade}
              </button>
            ))}
          </div>
        </div>

        {/* Service Areas */}
        <div>
          <label className="text-xs font-medium text-warm-text">Service Areas (select multiple)</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {AREAS.map((area) => (
              <button
                key={area} type="button"
                onClick={() => toggleArea(area)}
                className={`px-2.5 py-1.5 rounded-full text-xs capitalize transition-colors ${
                  form.service_areas.includes(area)
                    ? 'bg-work-orange text-white'
                    : 'bg-warm-bg text-warm-text border border-warm-border'
                }`}
              >
                {area.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Bank details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-warm-text">Bank Code</label>
            <input
              type="text" value={form.bank_code}
              onChange={(e) => updateField('bank_code', e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-warm-border text-sm focus:outline-none focus:border-sabi-green"
              placeholder="058"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-warm-text">Account No.</label>
            <input
              type="text" value={form.account_number}
              onChange={(e) => updateField('account_number', e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-warm-border text-sm focus:outline-none focus:border-sabi-green"
              placeholder="0123456789"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !form.name || !form.phone || !form.primary_trade}
          className="w-full h-12 bg-sabi-green text-white text-sm font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>Register Worker</>
          )}
        </button>
      </form>
    </div>
  );
}
