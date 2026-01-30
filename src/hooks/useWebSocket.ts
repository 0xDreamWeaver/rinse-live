import { useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store';
import type { WsEvent } from '../types';

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const connect = () => {
      try {
        const socket = new WebSocket(api.getWebSocketUrl());

        socket.onopen = () => {
          console.log('WebSocket connected');
        };

        socket.onmessage = (event) => {
          try {
            const wsEvent: WsEvent = JSON.parse(event.data);
            console.log('WebSocket event:', wsEvent.type, wsEvent);
            useAppStore.getState().handleWsEvent(wsEvent);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error, event.data);
          }
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        socket.onclose = () => {
          console.log('WebSocket closed, reconnecting in 5s...');
          reconnectTimeoutRef.current = window.setTimeout(connect, 5000);
        };

        ws.current = socket;
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reconnectTimeoutRef.current = window.setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);
}
