import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './use-auth';

export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;
  const { user } = useAuth();

  const connect = useCallback(() => {
    if (!user) {
      console.log('[WS] Not connecting - user not authenticated');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WS] Connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Send authentication message
      ws.send(JSON.stringify({
        type: 'auth',
        userId: user.id
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('[WS] Message parse error:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code, event.reason);
      setIsConnected(false);
      wsRef.current = null;

      // Attempt to reconnect if not a normal closure and user is authenticated
      if (event.code !== 1000 && user && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = reconnectDelay * Math.pow(2, reconnectAttempts.current);
        setTimeout(() => {
          console.log(`[WS] Attempting to reconnect (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    wsRef.current = ws;
  }, [user, onMessage]);

  useEffect(() => {
    if (user) {
      connect();
    } else {
      // Close connection if user logs out
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
      }
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, user]);

  const sendMessage = useCallback((message: any) => {
    if (!user) {
      console.warn('[WS] Cannot send message - not authenticated');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        userId: user.id
      }));
    } else {
      console.warn('[WS] Cannot send message - connection not open');
    }
  }, [user]);

  return { sendMessage, isConnected };
}