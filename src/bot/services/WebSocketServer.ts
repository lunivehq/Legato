import { WebSocket, WebSocketServer as WSServer } from "ws";
import {
  WSMessage,
  WSSearchPayload,
  WSAddTrackPayload,
  WSRemoveTrackPayload,
  WSReorderQueuePayload,
  WSSeekPayload,
  WSVolumePayload,
  WSRepeatPayload,
  WSLyricsRequestPayload,
  WSPlayPayload,
  SearchResult,
} from "../../shared/types";
import { SessionManager } from "./SessionManager";
import { LyricsService } from "./LyricsService";
import { SearchService } from "./SearchService";

interface WebSocketClient extends WebSocket {
  sessionId?: string;
  isAlive?: boolean;
  lastActivity?: number;
}

export class WebSocketServer {
  private wss: WSServer | null = null;
  private clients: Map<string, Set<WebSocketClient>> = new Map();
  private sessionManager: SessionManager;
  private lyricsService: LyricsService;
  private searchService: SearchService;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly MAX_CLIENTS_PER_SESSION = 10;
  private readonly PING_INTERVAL = 30000;
  private readonly CLIENT_TIMEOUT = 60000;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.lyricsService = new LyricsService();
    this.searchService = new SearchService();
  }

  start(port: number) {
    this.wss = new WSServer({
      port,
      perMessageDeflate: false, // Disable compression for lower latency
      maxPayload: 1024 * 1024, // 1MB max message size
    });

    this.wss.on("connection", (ws: WebSocketClient) => {
      ws.isAlive = true;
      ws.lastActivity = Date.now();

      ws.on("pong", () => {
        ws.isAlive = true;
        ws.lastActivity = Date.now();
      });

      ws.on("message", (data) => {
        try {
          ws.lastActivity = Date.now();
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error("Error parsing message:", error);
          this.sendError(ws, "PARSE_ERROR", "Invalid message format");
        }
      });

      ws.on("close", () => {
        this.removeClient(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.removeClient(ws);
      });
    });

    // Heartbeat interval with cleanup
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      this.wss?.clients.forEach((ws: WebSocketClient) => {
        if (
          ws.isAlive === false ||
          (ws.lastActivity && now - ws.lastActivity > this.CLIENT_TIMEOUT)
        ) {
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, this.PING_INTERVAL);

    console.log(`🔌 WebSocket server started on port ${port}`);
  }

  private handleMessage(ws: WebSocketClient, message: WSMessage) {
    const { type, sessionId, payload } = message;

    switch (type) {
      case "connect":
        this.handleConnect(ws, sessionId);
        break;
      case "play":
        this.handlePlay(sessionId, payload as WSPlayPayload);
        break;
      case "pause":
        this.handlePause(sessionId);
        break;
      case "resume":
        this.handleResume(sessionId);
        break;
      case "skip":
        this.handleSkip(sessionId);
        break;
      case "previous":
        this.handlePrevious(sessionId);
        break;
      case "seek":
        this.handleSeek(sessionId, payload as WSSeekPayload);
        break;
      case "volume":
        this.handleVolume(sessionId, payload as WSVolumePayload);
        break;
      case "add_track":
        this.handleAddTrack(sessionId, payload as WSAddTrackPayload);
        break;
      case "remove_track":
        this.handleRemoveTrack(sessionId, payload as WSRemoveTrackPayload);
        break;
      case "reorder_queue":
        this.handleReorderQueue(sessionId, payload as WSReorderQueuePayload);
        break;
      case "shuffle":
        this.handleShuffle(sessionId);
        break;
      case "repeat":
        this.handleRepeat(sessionId, payload as WSRepeatPayload);
        break;
      case "search":
        this.handleSearch(ws, sessionId, payload as WSSearchPayload);
        break;
      case "lyrics_request":
        this.handleLyricsRequest(
          ws,
          sessionId,
          payload as WSLyricsRequestPayload
        );
        break;
      default:
        console.log("Unknown message type:", type);
    }
  }

  private handleConnect(ws: WebSocketClient, sessionId: string) {
    const session = this.sessionManager.getSession(sessionId);

    if (!session) {
      this.sendError(ws, "SESSION_NOT_FOUND", "세션을 찾을 수 없습니다.");
      ws.close(4004, "Session not found");
      return;
    }

    // Check max clients per session
    const existingClients = this.clients.get(sessionId);
    if (
      existingClients &&
      existingClients.size >= this.MAX_CLIENTS_PER_SESSION
    ) {
      this.sendError(
        ws,
        "MAX_CLIENTS_REACHED",
        "세션 최대 연결 수에 도달했습니다."
      );
      ws.close(4003, "Max clients reached");
      return;
    }

    ws.sessionId = sessionId;

    // Add to clients map - only set callbacks on first client connection
    const isFirstClient = !this.clients.has(sessionId);
    if (isFirstClient) {
      this.clients.set(sessionId, new Set());
    }
    this.clients.get(sessionId)!.add(ws);

    // Set up session callbacks only for the first client to avoid overwriting
    if (isFirstClient) {
      this.sessionManager.setSessionCallbacks(sessionId, {
        onQueueUpdate: (queue) => {
          this.broadcastToSession(sessionId, {
            type: "queue_update",
            sessionId,
            payload: { queue },
            timestamp: Date.now(),
          });
        },
        onTrackStart: (track) => {
          this.broadcastToSession(sessionId, {
            type: "track_update",
            sessionId,
            payload: { track, isPlaying: true },
            timestamp: Date.now(),
          });
        },
        onTrackEnd: () => {
          this.broadcastToSession(sessionId, {
            type: "track_update",
            sessionId,
            payload: { track: null, isPlaying: false },
            timestamp: Date.now(),
          });
        },
        onPositionUpdate: (position, duration) => {
          this.broadcastToSession(sessionId, {
            type: "position_update",
            sessionId,
            payload: { position, duration },
            timestamp: Date.now(),
          });
        },
      });
    }

    // Send session data
    this.send(ws, {
      type: "session_update",
      sessionId,
      payload: { session },
      timestamp: Date.now(),
    });

    console.log(`Client connected to session: ${sessionId}`);
  }

  private handlePlay(sessionId: string, payload: WSPlayPayload) {
    const player = this.sessionManager.getPlayer(sessionId);
    if (player) {
      player.play(payload?.trackId);
    }
  }

  private handlePause(sessionId: string) {
    const player = this.sessionManager.getPlayer(sessionId);
    if (player) {
      player.pause();
    }
  }

  private handleResume(sessionId: string) {
    const player = this.sessionManager.getPlayer(sessionId);
    if (player) {
      player.resume();
    }
  }

  private handleSkip(sessionId: string) {
    const player = this.sessionManager.getPlayer(sessionId);
    if (player) {
      player.skip();
    }
  }

  private handlePrevious(sessionId: string) {
    const player = this.sessionManager.getPlayer(sessionId);
    if (player) {
      player.previous();
    }
  }

  private handleSeek(sessionId: string, payload: WSSeekPayload) {
    const player = this.sessionManager.getPlayer(sessionId);
    if (player && payload?.position !== undefined) {
      player.seek(payload.position);
    }
  }

  private handleVolume(sessionId: string, payload: WSVolumePayload) {
    const player = this.sessionManager.getPlayer(sessionId);
    if (player && payload?.volume !== undefined) {
      player.setVolume(payload.volume);
    }
  }

  private async handleAddTrack(sessionId: string, payload: WSAddTrackPayload) {
    const player = this.sessionManager.getPlayer(sessionId);
    if (player) {
      const query = payload?.url || payload?.searchQuery;
      if (query) {
        console.log(`Adding track with query: ${query}`);
        await player.addTrack(query, "Web User");
      }
    }
  }

  private handleRemoveTrack(sessionId: string, payload: WSRemoveTrackPayload) {
    const player = this.sessionManager.getPlayer(sessionId);
    if (player && payload?.trackId) {
      player.removeTrack(payload.trackId);
    }
  }

  private handleReorderQueue(
    sessionId: string,
    payload: WSReorderQueuePayload
  ) {
    const player = this.sessionManager.getPlayer(sessionId);
    if (
      player &&
      payload?.fromIndex !== undefined &&
      payload?.toIndex !== undefined
    ) {
      player.reorderQueue(payload.fromIndex, payload.toIndex);
    }
  }

  private handleShuffle(sessionId: string) {
    const player = this.sessionManager.getPlayer(sessionId);
    if (player) {
      player.shuffle();
    }
  }

  private handleRepeat(sessionId: string, payload: WSRepeatPayload) {
    const player = this.sessionManager.getPlayer(sessionId);
    if (player && payload?.mode) {
      player.setRepeatMode(payload.mode);
    }
  }

  private async handleSearch(
    ws: WebSocketClient,
    sessionId: string,
    payload: WSSearchPayload
  ) {
    if (!payload?.query) return;

    try {
      const results = await this.searchService.search(
        payload.query,
        payload.source || "youtube"
      );

      this.send(ws, {
        type: "search_results",
        sessionId,
        payload: { results, query: payload.query },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Search error:", error);
      this.sendError(ws, "SEARCH_ERROR", "검색 중 오류가 발생했습니다.");
    }
  }

  private async handleLyricsRequest(
    ws: WebSocketClient,
    sessionId: string,
    payload: WSLyricsRequestPayload
  ) {
    if (!payload?.title || !payload?.artist) return;

    try {
      const lyrics = await this.lyricsService.getLyrics(
        payload.title,
        payload.artist
      );

      this.send(ws, {
        type: "lyrics_response",
        sessionId,
        payload: { lyrics },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Lyrics error:", error);
      this.send(ws, {
        type: "lyrics_response",
        sessionId,
        payload: { lyrics: null, error: "가사를 찾을 수 없습니다." },
        timestamp: Date.now(),
      });
    }
  }

  private removeClient(ws: WebSocketClient) {
    if (ws.sessionId) {
      const clients = this.clients.get(ws.sessionId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          this.clients.delete(ws.sessionId);
        }
      }
    }
  }

  private send(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, code: string, message: string) {
    this.send(ws, {
      type: "error",
      sessionId: "",
      payload: { code, message },
      timestamp: Date.now(),
    });
  }

  broadcastToSession(sessionId: string, message: WSMessage) {
    const clients = this.clients.get(sessionId);
    if (clients) {
      clients.forEach((ws) => {
        this.send(ws, message);
      });
    }
  }

  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.wss?.close();
  }
}
