// pwa/src/pages/LocationCapture.jsx
// Landing page: worker scans QR/clicks link → captures GPS → sends location back via WhatsApp deep-link
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

export default function LocationCapture() {
  const { phone } = useParams();
  const [searchParams] = useSearchParams();
  const returnBot = searchParams.get('bot') || phone;

  const [status, setStatus] = useState('idle'); // idle, capturing, success, error
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Auto-capture on load
    captureLocation();
  }, []);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setError('Your browser does not support location. Please use Chrome or Safari.');
      return;
    }

    setStatus('capturing');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setCoords(loc);

        // Save location to backend
        try {
          await fetch('/api/workers/location-capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, ...loc })
          });
        } catch (e) {
          // Non-blocking — we still have coords for the WhatsApp message
        }

        setStatus('success');
      },
      (err) => {
        setStatus('error');
        if (err.code === 1) {
          setError('Location permission denied. Please allow location access and try again.');
        } else if (err.code === 2) {
          setError('Could not determine your location. Please try again outside.');
        } else {
          setError('Location request timed out. Please try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Build WhatsApp deep-link to send location back to bot
  const getWhatsAppLink = () => {
    if (!coords) return '#';
    const message = `LOC:${coords.lat},${coords.lng},${Math.round(coords.accuracy)}`;
    const botNumber = returnBot.replace(/^0/, '234'); // Convert 080... to 234...
    return `https://wa.me/${botNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">SabiWork</h1>
          <p className="text-sm text-gray-500 mt-1">Location Verification</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          {status === 'capturing' && (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-800">Getting your location...</h2>
              <p className="text-sm text-gray-500 mt-2">Please allow location access when prompted</p>
            </div>
          )}

          {status === 'success' && coords && (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Location captured!</h2>
              <p className="text-xs text-gray-400 mt-1">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} (±{Math.round(coords.accuracy)}m)
              </p>

              <a
                href={getWhatsAppLink()}
                className="mt-6 w-full h-12 bg-green-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 no-underline"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.12 1.52 5.856L0 24l6.335-1.652A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.875 0-3.63-.51-5.14-1.395l-.37-.22-3.82.998 1.018-3.715-.24-.38A9.69 9.69 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/>
                </svg>
                Send to WhatsApp
              </a>

              <p className="text-xs text-gray-400 mt-3">
                Tap the button to return to WhatsApp and complete registration
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Location not available</h2>
              <p className="text-sm text-gray-500 mt-2">{error}</p>
              <button
                onClick={captureLocation}
                className="mt-4 w-full h-11 bg-green-600 text-white text-sm font-semibold rounded-xl"
              >
                Try Again
              </button>
            </div>
          )}

          {status === 'idle' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Share your location</h2>
              <p className="text-sm text-gray-500 mt-2">We need your location to verify your service area and connect you with nearby jobs.</p>
              <button
                onClick={captureLocation}
                className="mt-4 w-full h-11 bg-green-600 text-white text-sm font-semibold rounded-xl"
              >
                Allow Location
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your location is only used to verify your service area. We do not track you.
        </p>
      </div>
    </div>
  );
}
