import { io, Socket } from 'socket.io-client';

const getSocketUrl = (): string | undefined => {
  const envUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  if (import.meta.env.DEV) return 'http://localhost:4000';
  return undefined; // relative same-origin fallback for single-domain Vercel deployment
};

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      transports: ['polling', 'websocket'],
      timeout: 5000,
    });

    socket.on('connect', () => {
      console.log(`[Socket.IO] Connected: ${socket?.id}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Disconnected: ${reason}`);
      // Auto-reconnect unless server explicitly closed the connection
      if (reason === 'io server disconnect') {
        socket?.connect();
      }
    });

    socket.on('connect_error', (error) => {
      if (import.meta.env.PROD) {
        console.debug('[Socket.IO] Real-time socket unavailable, using REST fallback');
      } else {
        console.warn('[Socket.IO] Connection error:', error.message);
      }
    });

    socket.on('reconnect', (attempt) => {
      console.log(`[Socket.IO] Reconnected after ${attempt} attempt(s)`);
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`[Socket.IO] Reconnect attempt #${attempt}`);
    });
  }

  return socket;
}

/** Reset the socket singleton (e.g. after auth change) */
export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
