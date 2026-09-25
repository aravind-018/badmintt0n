import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      transports: ['websocket', 'polling'],
      timeout: 10000,
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
      console.warn('[Socket.IO] Connection error:', error.message);
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
