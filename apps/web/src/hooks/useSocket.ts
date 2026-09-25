import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../lib/socket';
import type { Socket } from 'socket.io-client';

type EventHandler = (...args: any[]) => void;

/**
 * useSocket — connects to Socket.IO and registers event handlers.
 *
 * @param handlers - map of socket event name → handler function
 * @returns { socket, emit } — raw socket and a stable emit helper
 */
export function useSocket(handlers: Record<string, EventHandler> = {}) {
  const socket: Socket = getSocket();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const registeredEvents: string[] = [];

    Object.entries(handlersRef.current).forEach(([event, handler]) => {
      socket.on(event, handler);
      registeredEvents.push(event);
    });

    return () => {
      registeredEvents.forEach((event) => {
        socket.off(event, handlersRef.current[event]);
      });
    };
  }, [socket, JSON.stringify(Object.keys(handlers))]);

  const emit = useCallback(
    (event: string, ...args: any[]) => {
      socket.emit(event, ...args);
    },
    [socket]
  );

  return { socket, emit };
}
