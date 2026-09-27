import { io, Socket } from 'socket.io-client';

const getSocketUrl = (): string | undefined => {
  const envUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  if (import.meta.env.DEV) return 'http://localhost:4000';
  return undefined; // relative same-origin fallback for single-domain Vercel deployment
};

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

const isServerlessProd =
  import.meta.env.PROD &&
  !import.meta.env.VITE_SOCKET_URL &&
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') || window.location.hostname !== 'localhost');

const mockSocket: any = {
  connected: false,
  id: undefined,
  on: () => mockSocket,
  off: () => mockSocket,
  emit: () => mockSocket,
  once: () => mockSocket,
  connect: () => mockSocket,
  disconnect: () => mockSocket,
};

export function getSocket(): Socket {
  if (isServerlessProd) {
    return mockSocket as Socket;
  }

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
      if (reason === 'io server disconnect') {
        socket?.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.debug('[Socket.IO] Real-time socket unavailable, using REST fallback:', error.message);
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
