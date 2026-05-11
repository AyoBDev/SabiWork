// whatsapp-bot/src/handlers/ghost.js
import { backendAPI } from '../services/api.js';

let ghostTimer = null;
let ghostFired = false;

/**
 * Start the ghost timer. Call this when the QR code is shown to audience.
 * If no real messages arrive within 15 seconds, fire ghost messages.
 */
export function startGhostTimer() {
  ghostFired = false;
  clearTimeout(ghostTimer);

  ghostTimer = setTimeout(async () => {
    if (!ghostFired) {
      ghostFired = true;
      console.log('[Ghost] No audience messages after 15s — firing ghost messages');
      try {
        await backendAPI.notifyEvent('ghost_triggered', {
          actor: 'Ghost System',
          description: 'No audience messages received — firing ghost messages',
          metadata: {}
        });
        // Trigger ghost messages via backend demo endpoint
        await fetch(`${process.env.BACKEND_URL || 'http://localhost:3000'}/api/demo/ghost`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        console.error('[Ghost] Failed to fire:', err.message);
      }
    }
  }, 15000);
}

/**
 * Call this when a real audience message arrives. Cancels ghost timer.
 */
export function cancelGhost() {
  if (!ghostFired) {
    clearTimeout(ghostTimer);
  }
}

/**
 * Force-fire ghosts immediately (e.g., from a CLI command during demo)
 */
export function fireGhostNow() {
  ghostFired = true;
  clearTimeout(ghostTimer);
  fetch(`${process.env.BACKEND_URL || 'http://localhost:3000'}/api/demo/ghost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }).catch(() => {});
}
