import { VoiceConnection } from "@discordjs/voice";
import { Session, QueueState, Track } from "../../shared/types";
import { MusicPlayer } from "./MusicPlayer";

interface SessionData extends Session {
  connection: VoiceConnection;
}

interface CreateSessionData {
  id: string;
  guildId: string;
  guildName: string;
  channelId: string;
  channelName: string;
  connection: VoiceConnection;
}

export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private guildToSession: Map<string, string> = new Map();
  private players: Map<string, MusicPlayer> = new Map();
  private aloneTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private sessionCallbacks: Map<
    string,
    {
      onQueueUpdate: (queue: QueueState) => void;
      onTrackStart: (track: Track) => void;
      onTrackEnd: () => void;
      onPositionUpdate: (position: number, duration: number) => void;
    }
  > = new Map();

  createSession(data: CreateSessionData): Session {
    const queue: QueueState = {
      tracks: [],
      currentIndex: 0,
      isPlaying: false,
      isPaused: false,
      volume: 100,
      repeatMode: "off",
      shuffle: false,
      position: 0,
    };

    const session: SessionData = {
      id: data.id,
      guildId: data.guildId,
      guildName: data.guildName,
      channelId: data.channelId,
      channelName: data.channelName,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      queue,
      connection: data.connection,
    };

    this.sessions.set(data.id, session);
    this.guildToSession.set(data.guildId, data.id);

    // Create callbacks placeholder
    const callbacks = {
      onQueueUpdate: (queue: QueueState) => {
        session.queue = queue;
      },
      onTrackStart: (_track: Track) => {},
      onTrackEnd: () => {},
      onPositionUpdate: (_position: number, _duration: number) => {},
    };
    this.sessionCallbacks.set(data.id, callbacks);

    // Create player
    const player = new MusicPlayer(data.connection, queue, callbacks);
    this.players.set(data.id, player);

    console.log(`Session created: ${data.id} for guild ${data.guildName}`);
    return this.getPublicSession(session);
  }

  setSessionCallbacks(
    sessionId: string,
    callbacks: {
      onQueueUpdate: (queue: QueueState) => void;
      onTrackStart: (track: Track) => void;
      onTrackEnd: () => void;
      onPositionUpdate: (position: number, duration: number) => void;
    }
  ) {
    const existing = this.sessionCallbacks.get(sessionId);
    const session = this.sessions.get(sessionId);
    const player = this.players.get(sessionId);

    if (existing && session) {
      const wrappedCallbacks = {
        onQueueUpdate: (queue: QueueState) => {
          session.queue = queue;
          callbacks.onQueueUpdate(queue);
        },
        onTrackStart: callbacks.onTrackStart,
        onTrackEnd: callbacks.onTrackEnd,
        onPositionUpdate: callbacks.onPositionUpdate,
      };

      existing.onQueueUpdate = wrappedCallbacks.onQueueUpdate;
      existing.onTrackStart = wrappedCallbacks.onTrackStart;
      existing.onTrackEnd = wrappedCallbacks.onTrackEnd;
      existing.onPositionUpdate = wrappedCallbacks.onPositionUpdate;

      // Update player callbacks too
      if (player) {
        player.updateCallbacks(wrappedCallbacks);
      }
    }
  }

  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    return session ? this.getPublicSession(session) : null;
  }

  getSessionByGuildId(guildId: string): Session | null {
    const sessionId = this.guildToSession.get(guildId);
    if (!sessionId) return null;
    return this.getSession(sessionId);
  }

  getPlayer(sessionId: string): MusicPlayer | null {
    return this.players.get(sessionId) || null;
  }

  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Destroy player
    const player = this.players.get(sessionId);
    if (player) {
      player.destroy();
      this.players.delete(sessionId);
    }

    // Cancel alone timeout
    this.cancelAloneTimeout(sessionId);

    // Remove from maps
    this.guildToSession.delete(session.guildId);
    this.sessions.delete(sessionId);
    this.sessionCallbacks.delete(sessionId);

    console.log(`Session destroyed: ${sessionId}`);
    return true;
  }

  destroyAllSessions(): void {
    for (const sessionId of this.sessions.keys()) {
      this.destroySession(sessionId);
    }
  }

  startAloneTimeout(
    sessionId: string,
    timeout: number,
    callback: () => void
  ): void {
    this.cancelAloneTimeout(sessionId);

    const timeoutId = setTimeout(() => {
      callback();
      this.aloneTimeouts.delete(sessionId);
    }, timeout);

    this.aloneTimeouts.set(sessionId, timeoutId);
  }

  cancelAloneTimeout(sessionId: string): void {
    const timeoutId = this.aloneTimeouts.get(sessionId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.aloneTimeouts.delete(sessionId);
    }
  }

  private getPublicSession(session: SessionData): Session {
    return {
      id: session.id,
      guildId: session.guildId,
      guildName: session.guildName,
      channelId: session.channelId,
      channelName: session.channelName,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      queue: session.queue,
    };
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values()).map((s) =>
      this.getPublicSession(s)
    );
  }

  isSessionValid(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return new Date() < session.expiresAt;
  }
}
