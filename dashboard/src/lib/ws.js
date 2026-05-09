// dashboard/src/lib/ws.js
export function createWSConnection(onEvent) {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/dashboard/feed';
  let ws = null;
  let reconnectTimer = null;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WS] Connected to dashboard feed');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting in 3s...');
      reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };
  }

  connect();

  return {
    close: () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    }
  };
}
