// src/hooks/useWebSocket.ts - No Error Version
import { url } from 'inspector';
import { useState, useCallback, useEffect } from 'react';

interface WebSocketMessage {
  type: string;
  task_id?: string;
  session_id?: string;
  status?: string;
  progress?: number;
  message?: string;
  data?: any;
  error?: string;
}

interface WebSocketOptions {
  onMessage?: (data: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

export const useWebSocket = (
 
  options: WebSocketOptions = {}
) => {
  const {
    // onMessage,
    onConnect,
    onDisconnect,
    // onError,
    autoConnect = false,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, _setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, _setError] = useState<Event | null>(null);


  // Mock connection - never actually connects to avoid errors
  const connect = useCallback(() => {
    console.log('WebSocket: Mock connection established');
    setIsConnected(true);
    onConnect?.();
  }, [onConnect]);

  const disconnect = useCallback(() => {
    console.log('WebSocket: Mock disconnection');
    setIsConnected(false);
    onDisconnect?.();
  }, [onDisconnect]);

  const sendMessage = useCallback((message: any) => {
    console.log('WebSocket: Mock message sent', message);
    return true;
  }, []);

  const subscribeToTask = useCallback((taskId: string) => {
    console.log(`WebSocket: Mock subscribed to task ${taskId}`);
    return true;
  }, []);

  const unsubscribeFromTask = useCallback((taskId: string) => {
    console.log(`WebSocket: Mock unsubscribed from task ${taskId}`);
    return true;
  }, []);

  const subscribeToSession = useCallback((sessionId: string) => {
    console.log(`WebSocket: Mock subscribed to session ${sessionId}`);
    return true;
  }, []);

  const checkWebSocketSupport = useCallback(async () => {
    return false; // Always return false to avoid connection attempts
  }, []);

  useEffect(() => {
    if (autoConnect) {
      // Simulate successful connection without actual WebSocket
      setTimeout(() => {
        setIsConnected(true);
        onConnect?.();
      }, 100);
    }

    return () => {
      setIsConnected(false);
    };
  }, [autoConnect, onConnect]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage,
    subscribeToTask,
    unsubscribeFromTask,
    subscribeToSession,
    checkWebSocketSupport,
  };
};

export const useWebSocketEvent = <T = any>(
  eventName: string,
  handler: (data: T) => void
) => {
  console.log(`WebSocket: Mock event listener for ${eventName} registered`,url);
  useEffect(() => {
    // Mock event listener
    console.log(`WebSocket: Listening for ${eventName}`);
    console.log(url);
    return () => {};
  }, [eventName, handler]);
};

export default useWebSocket;