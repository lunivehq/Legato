"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Session,
  WSMessage,
  SearchResult,
  LyricsData,
  WSSessionUpdatePayload,
  WSQueueUpdatePayload,
  WSPositionUpdatePayload,
  WSSearchResultsPayload,
  WSLyricsResponsePayload,
} from "@/shared/types";

interface UseWebSocketReturn {
  session: Session | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  searchResults: SearchResult[];
  lyrics: LyricsData | null;
  actions: {
    play: (trackId?: string) => void;
    pause: () => void;
    resume: () => void;
    skip: () => void;
    previous: () => void;
    seek: (position: number) => void;
    setVolume: (volume: number) => void;
    addTrack: (query: string) => void;
    removeTrack: (trackId: string) => void;
    reorderQueue: (fromIndex: number, toIndex: number) => void;
    shuffle: () => void;
    setRepeatMode: (mode: "off" | "one" | "all") => void;
    search: (query: string) => void;
    fetchLyrics: (title: string, artist: string) => void;
  };
}

export function useWebSocket(sessionId: string): UseWebSocketReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const send = useCallback((message: Omit<WSMessage, "timestamp">) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          ...message,
          timestamp: Date.now(),
        })
      );
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;

      // Send connect message
      send({
        type: "connect",
        sessionId,
      });
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (err) {
        console.error("Error parsing message:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);

      // Attempt to reconnect
      if (reconnectAttemptsRef.current < 5) {
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
  }, [sessionId, send]);

  const handleMessage = (message: WSMessage) => {
    switch (message.type) {
      case "session_update": {
        const payload = message.payload as WSSessionUpdatePayload;
        setSession(payload.session);
        setIsLoading(false);
        break;
      }
      case "queue_update": {
        const payload = message.payload as WSQueueUpdatePayload;
        setSession((prev) => (prev ? { ...prev, queue: payload.queue } : null));
        break;
      }
      case "track_update": {
        // Track update is handled through queue_update
        break;
      }
      case "position_update": {
        const payload = message.payload as WSPositionUpdatePayload;
        setSession((prev) =>
          prev
            ? {
                ...prev,
                queue: { ...prev.queue, position: payload.position },
              }
            : null
        );
        break;
      }
      case "search_results": {
        const payload = message.payload as WSSearchResultsPayload;
        setSearchResults(payload.results);
        break;
      }
      case "lyrics_response": {
        const payload = message.payload as WSLyricsResponsePayload;
        setLyrics(payload.lyrics);
        break;
      }
      case "error": {
        const payload = message.payload as { code: string; message: string };
        setError(payload.message);
        setIsLoading(false);
        break;
      }
      case "disconnect": {
        setSession(null);
        setError("세션이 종료되었습니다.");
        break;
      }
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const actions = {
    play: (trackId?: string) => {
      send({
        type: "play",
        sessionId,
        payload: trackId ? { trackId } : undefined,
      });
    },
    pause: () => {
      send({ type: "pause", sessionId });
    },
    resume: () => {
      send({ type: "resume", sessionId });
    },
    skip: () => {
      send({ type: "skip", sessionId });
    },
    previous: () => {
      send({ type: "previous", sessionId });
    },
    seek: (position: number) => {
      send({ type: "seek", sessionId, payload: { position } });
    },
    setVolume: (volume: number) => {
      send({ type: "volume", sessionId, payload: { volume } });
    },
    addTrack: (query: string) => {
      // Check if it's a URL or search query
      const isUrl = query.startsWith("http://") || query.startsWith("https://");
      send({
        type: "add_track",
        sessionId,
        payload: isUrl ? { url: query } : { searchQuery: query },
      });
    },
    removeTrack: (trackId: string) => {
      send({ type: "remove_track", sessionId, payload: { trackId } });
    },
    reorderQueue: (fromIndex: number, toIndex: number) => {
      send({
        type: "reorder_queue",
        sessionId,
        payload: { fromIndex, toIndex },
      });
    },
    shuffle: () => {
      send({ type: "shuffle", sessionId });
    },
    setRepeatMode: (mode: "off" | "one" | "all") => {
      send({ type: "repeat", sessionId, payload: { mode } });
    },
    search: (query: string) => {
      setSearchResults([]);
      send({ type: "search", sessionId, payload: { query } });
    },
    fetchLyrics: (title: string, artist: string) => {
      setLyrics(null);
      send({ type: "lyrics_request", sessionId, payload: { title, artist } });
    },
  };

  return {
    session,
    isConnected,
    isLoading,
    error,
    searchResults,
    lyrics,
    actions,
  };
}
