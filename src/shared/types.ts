// Shared types between bot and web dashboard

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  thumbnail: string;
  url: string;
  source: "youtube" | "spotify" | "soundcloud";
  requestedBy: string;
  requestedAt: Date;
}

export interface QueueState {
  tracks: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  volume: number;
  repeatMode: "off" | "one" | "all";
  shuffle: boolean;
  position: number; // current position in seconds
}

export interface Session {
  id: string;
  guildId: string;
  guildName: string;
  channelId: string;
  channelName: string;
  createdAt: Date;
  expiresAt: Date;
  queue: QueueState;
}

export interface LyricsData {
  title: string;
  artist: string;
  lyrics: string;
  thumbnail?: string;
  source: string;
  url?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  url: string;
  source: "youtube" | "spotify" | "soundcloud";
}

// WebSocket message types
export type WSMessageType =
  | "connect"
  | "disconnect"
  | "session_update"
  | "queue_update"
  | "track_update"
  | "position_update"
  | "play"
  | "pause"
  | "resume"
  | "skip"
  | "previous"
  | "seek"
  | "volume"
  | "add_track"
  | "remove_track"
  | "reorder_queue"
  | "shuffle"
  | "repeat"
  | "search"
  | "search_results"
  | "lyrics_request"
  | "lyrics_response"
  | "error";

export interface WSMessage {
  type: WSMessageType;
  sessionId: string;
  payload?: unknown;
  timestamp: number;
}

export interface WSConnectPayload {
  sessionId: string;
}

export interface WSSessionUpdatePayload {
  session: Session;
}

export interface WSQueueUpdatePayload {
  queue: QueueState;
}

export interface WSTrackUpdatePayload {
  track: Track | null;
  isPlaying: boolean;
}

export interface WSPositionUpdatePayload {
  position: number;
  duration: number;
}

export interface WSPlayPayload {
  trackId?: string;
}

export interface WSSeekPayload {
  position: number;
}

export interface WSVolumePayload {
  volume: number;
}

export interface WSAddTrackPayload {
  url?: string;
  searchQuery?: string;
  track?: Track;
}

export interface WSRemoveTrackPayload {
  trackId: string;
}

export interface WSReorderQueuePayload {
  fromIndex: number;
  toIndex: number;
}

export interface WSShufflePayload {
  enabled: boolean;
}

export interface WSRepeatPayload {
  mode: "off" | "one" | "all";
}

export interface WSSearchPayload {
  query: string;
  source?: "youtube" | "spotify" | "soundcloud" | "all";
}

export interface WSSearchResultsPayload {
  results: SearchResult[];
  query: string;
}

export interface WSLyricsRequestPayload {
  title: string;
  artist: string;
}

export interface WSLyricsResponsePayload {
  lyrics: LyricsData | null;
  error?: string;
}

export interface WSErrorPayload {
  code: string;
  message: string;
}
