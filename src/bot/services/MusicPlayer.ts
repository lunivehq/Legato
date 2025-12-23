import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  VoiceConnection,
  VoiceConnectionStatus,
  entersState,
  AudioResource,
  StreamType,
} from "@discordjs/voice";
import { spawn, exec, ChildProcess } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { Track, QueueState } from "../../shared/types";
import { cleanYouTubeUrl } from "../../shared/utils";

const execPromise = promisify(exec);

// Audio URL cache to reduce yt-dlp calls
const audioUrlCache = new Map<string, { url: string; expires: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class MusicPlayer {
  private audioPlayer: AudioPlayer;
  private connection: VoiceConnection;
  private queue: QueueState;
  private currentResource: AudioResource | null = null;
  private currentFFmpegProcess: ChildProcess | null = null;
  private positionInterval: NodeJS.Timeout | null = null;
  private onQueueUpdate: (queue: QueueState) => void;
  private onTrackStart: (track: Track) => void;
  private onTrackEnd: () => void;
  private onPositionUpdate: (position: number, duration: number) => void;
  private startTime: number = 0;
  private pausedPosition: number = 0;
  private isDestroyed: boolean = false;

  constructor(
    connection: VoiceConnection,
    queue: QueueState,
    callbacks: {
      onQueueUpdate: (queue: QueueState) => void;
      onTrackStart: (track: Track) => void;
      onTrackEnd: () => void;
      onPositionUpdate: (position: number, duration: number) => void;
    }
  ) {
    this.connection = connection;
    this.queue = queue;
    this.audioPlayer = createAudioPlayer();
    this.onQueueUpdate = callbacks.onQueueUpdate;
    this.onTrackStart = callbacks.onTrackStart;
    this.onTrackEnd = callbacks.onTrackEnd;
    this.onPositionUpdate = callbacks.onPositionUpdate;

    this.setupListeners();
    this.connection.subscribe(this.audioPlayer);
  }

  updateCallbacks(callbacks: {
    onQueueUpdate: (queue: QueueState) => void;
    onTrackStart: (track: Track) => void;
    onTrackEnd: () => void;
    onPositionUpdate: (position: number, duration: number) => void;
  }) {
    this.onQueueUpdate = callbacks.onQueueUpdate;
    this.onTrackStart = callbacks.onTrackStart;
    this.onTrackEnd = callbacks.onTrackEnd;
    this.onPositionUpdate = callbacks.onPositionUpdate;
  }

  private setupListeners() {
    // Connection state handling
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });

    // Audio player state handling
    this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
      this.queue.isPlaying = true;
      this.queue.isPaused = false;
      this.startPositionUpdates();

      const currentTrack = this.getCurrentTrack();
      if (currentTrack) {
        this.onTrackStart(currentTrack);
      }
      this.onQueueUpdate(this.queue);
    });

    this.audioPlayer.on(AudioPlayerStatus.Paused, () => {
      this.queue.isPaused = true;
      this.pausedPosition = this.getCurrentPosition();
      this.stopPositionUpdates();
      this.onQueueUpdate(this.queue);
    });

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.stopPositionUpdates();
      this.handleTrackEnd();
    });

    this.audioPlayer.on("error", (error) => {
      console.error("Audio player error:", error);
      this.handleTrackEnd();
    });
  }

  private startPositionUpdates() {
    this.stopPositionUpdates();
    this.startTime = Date.now() - this.pausedPosition * 1000;

    this.positionInterval = setInterval(() => {
      const position = this.getCurrentPosition();
      const currentTrack = this.getCurrentTrack();
      if (currentTrack) {
        this.queue.position = position;
        this.onPositionUpdate(position, currentTrack.duration);
      }
    }, 1000);
  }

  private stopPositionUpdates() {
    if (this.positionInterval) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
  }

  private cleanupFFmpeg() {
    if (this.currentFFmpegProcess) {
      try {
        this.currentFFmpegProcess.kill("SIGTERM");
      } catch {
        // Process may already be dead
      }
      this.currentFFmpegProcess = null;
    }
  }

  private async getAudioUrl(videoUrl: string): Promise<string | null> {
    // Check cache first
    const cached = audioUrlCache.get(videoUrl);
    if (cached && cached.expires > Date.now()) {
      console.log("Using cached audio URL");
      return cached.url;
    }

    try {
      const { stdout } = await execPromise(
        `yt-dlp --format bestaudio --get-url --no-warnings --no-call-home --socket-timeout 10 "${videoUrl}"`,
        { timeout: 15000 }
      );

      const audioUrl = stdout.trim();
      if (audioUrl) {
        // Cache the URL
        audioUrlCache.set(videoUrl, {
          url: audioUrl,
          expires: Date.now() + CACHE_DURATION,
        });
        return audioUrl;
      }
      return null;
    } catch (error) {
      console.error("Error getting audio URL:", error);
      // Clear potentially stale cache entry
      audioUrlCache.delete(videoUrl);
      return null;
    }
  }

  private getCurrentPosition(): number {
    if (this.queue.isPaused) {
      return this.pausedPosition;
    }
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  private handleTrackEnd() {
    this.onTrackEnd();
    this.queue.position = 0;
    this.pausedPosition = 0;
    this.cleanupFFmpeg();

    if (this.isDestroyed) return;

    if (this.queue.repeatMode === "one") {
      // Repeat current track
      this.playCurrentTrack();
    } else if (this.queue.currentIndex < this.queue.tracks.length - 1) {
      // Play next track
      this.queue.currentIndex++;
      this.playCurrentTrack();
    } else if (
      this.queue.repeatMode === "all" &&
      this.queue.tracks.length > 0
    ) {
      // Repeat entire queue
      this.queue.currentIndex = 0;
      this.playCurrentTrack();
    } else {
      // Queue finished
      this.queue.isPlaying = false;
      this.queue.isPaused = false;
      this.onQueueUpdate(this.queue);
    }
  }

  async addTrack(query: string, requestedBy: string): Promise<Track | null> {
    try {
      let trackUrl: string;
      let trackTitle: string;
      let trackArtist: string;
      let trackDuration: number;
      let trackThumbnail: string;

      // Clean YouTube URL if it contains extra parameters
      const cleanedQuery = cleanYouTubeUrl(query);
      console.log(`Cleaned query: ${cleanedQuery}`);

      // Check if it's a URL or search query using regex
      const isVideoUrl = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/.test(
        cleanedQuery
      );
      const isPlaylistUrl = /youtube\.com\/playlist\?list=/.test(cleanedQuery);

      if (isVideoUrl && !isPlaylistUrl) {
        // It's a YouTube video URL - get info via yt-dlp
        trackUrl = cleanedQuery;
        const info = await this.getVideoInfoWithYtDlp(cleanedQuery);
        if (!info) {
          return null;
        }
        trackTitle = info.title;
        trackArtist = info.artist;
        trackDuration = info.duration;
        trackThumbnail = info.thumbnail;
      } else if (isPlaylistUrl) {
        // Handle playlist via yt-dlp
        const videos = await this.getPlaylistWithYtDlp(cleanedQuery);

        for (const video of videos.slice(0, 50)) {
          // Limit to 50 tracks
          const track: Track = {
            id: randomUUID(),
            title: video.title,
            artist: video.artist,
            duration: video.duration,
            thumbnail: video.thumbnail,
            url: video.url,
            source: "youtube",
            requestedBy,
            requestedAt: new Date(),
          };
          this.queue.tracks.push(track);
        }

        this.onQueueUpdate(this.queue);

        // Start playing if not already
        if (!this.queue.isPlaying && this.queue.tracks.length > 0) {
          await this.playCurrentTrack();
        }

        return this.queue.tracks[this.queue.tracks.length - 1];
      } else {
        // Search for the query via yt-dlp
        const searchResult = await this.searchWithYtDlp(cleanedQuery);
        if (!searchResult) {
          return null;
        }
        trackUrl = searchResult.url;
        trackTitle = searchResult.title;
        trackArtist = searchResult.artist;
        trackDuration = searchResult.duration;
        trackThumbnail = searchResult.thumbnail;
      }

      const track: Track = {
        id: randomUUID(),
        title: trackTitle,
        artist: trackArtist,
        duration: trackDuration,
        thumbnail: trackThumbnail,
        url: trackUrl,
        source: "youtube",
        requestedBy,
        requestedAt: new Date(),
      };

      this.queue.tracks.push(track);
      this.onQueueUpdate(this.queue);

      // Start playing if this is the first track
      if (!this.queue.isPlaying && this.queue.tracks.length === 1) {
        await this.playCurrentTrack();
      }

      return track;
    } catch (error) {
      console.error("Error adding track:", error);
      return null;
    }
  }

  async playCurrentTrack(): Promise<boolean> {
    const track = this.getCurrentTrack();
    if (!track) {
      console.log("No current track to play");
      return false;
    }

    if (!track.url) {
      console.error("Track URL is undefined:", track);
      this.handleTrackEnd();
      return false;
    }

    if (this.isDestroyed) return false;

    console.log(`Playing track: ${track.title} - URL: ${track.url}`);

    try {
      // Cleanup previous FFmpeg process
      this.cleanupFFmpeg();

      // Get audio URL with caching
      const audioUrl = await this.getAudioUrl(track.url);
      if (!audioUrl) {
        throw new Error("Could not get audio URL from yt-dlp");
      }

      console.log("Got audio URL from yt-dlp");

      // Use FFmpeg to stream the audio with minimal processing for Discord
      // Discord requires: 48kHz, stereo, 16-bit PCM (Opus encoded by discord.js)
      const ffmpeg = spawn(
        "ffmpeg",
        [
          // Input options for network streaming stability
          "-reconnect",
          "1",
          "-reconnect_streamed",
          "1",
          "-reconnect_delay_max",
          "5",
          "-i",
          audioUrl,
          // Disable video processing
          "-vn",
          // Minimal processing - just format conversion, no filters
          // This preserves original dynamic range
          "-f",
          "s16le",
          "-ar",
          "48000",
          "-ac",
          "2",
          "-loglevel",
          "error",
          "pipe:1",
        ],
        {
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      this.currentFFmpegProcess = ffmpeg;

      // Handle FFmpeg errors
      ffmpeg.stderr?.on("data", (data) => {
        console.error("FFmpeg error:", data.toString());
      });

      ffmpeg.on("error", (error) => {
        console.error("FFmpeg process error:", error);
      });

      ffmpeg.on("close", (code) => {
        if (code !== 0 && code !== null && !this.isDestroyed) {
          console.error(`FFmpeg exited with code ${code}`);
        }
      });

      this.currentResource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw,
        inlineVolume: true,
      });

      // Apply current volume
      if (this.currentResource.volume) {
        this.currentResource.volume.setVolume(this.queue.volume / 100);
      }

      this.pausedPosition = 0;
      this.audioPlayer.play(this.currentResource);

      // Update playing state
      this.queue.isPlaying = true;
      this.queue.isPaused = false;
      this.onQueueUpdate(this.queue);
      this.onTrackStart(track);

      return true;
    } catch (error) {
      console.error("Error playing track:", error);
      // Try next track
      this.handleTrackEnd();
      return false;
    }
  }

  async play(trackId?: string): Promise<boolean> {
    if (trackId) {
      const index = this.queue.tracks.findIndex((t) => t.id === trackId);
      if (index !== -1) {
        this.queue.currentIndex = index;
        return this.playCurrentTrack();
      }
      return false;
    }
    return this.playCurrentTrack();
  }

  pause(): boolean {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
      this.audioPlayer.pause();
      return true;
    }
    return false;
  }

  resume(): boolean {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Paused) {
      this.audioPlayer.unpause();
      this.startTime = Date.now() - this.pausedPosition * 1000;
      return true;
    }
    return false;
  }

  skip(): boolean {
    if (this.queue.tracks.length === 0) {
      return false;
    }

    this.audioPlayer.stop();
    return true;
  }

  previous(): boolean {
    if (this.queue.currentIndex > 0) {
      this.queue.currentIndex--;
      this.playCurrentTrack();
      return true;
    } else if (
      this.queue.repeatMode === "all" &&
      this.queue.tracks.length > 0
    ) {
      this.queue.currentIndex = this.queue.tracks.length - 1;
      this.playCurrentTrack();
      return true;
    }
    return false;
  }

  async seek(position: number): Promise<boolean> {
    const track = this.getCurrentTrack();
    if (!track || position < 0 || position > track.duration) {
      return false;
    }

    try {
      // Cleanup previous FFmpeg process
      this.cleanupFFmpeg();

      // Get audio URL with caching
      const audioUrl = await this.getAudioUrl(track.url);
      if (!audioUrl) {
        throw new Error("Could not get audio URL");
      }

      // Use FFmpeg to seek to position with optimized settings
      const ffmpeg = spawn(
        "ffmpeg",
        [
          "-ss",
          position.toString(),
          "-reconnect",
          "1",
          "-reconnect_streamed",
          "1",
          "-reconnect_delay_max",
          "5",
          "-i",
          audioUrl,
          "-af",
          "aresample=async=1,pan=stereo|c0=c0|c1=c1",
          "-f",
          "s16le",
          "-ar",
          "48000",
          "-ac",
          "2",
          "-loglevel",
          "error",
          "pipe:1",
        ],
        {
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      this.currentFFmpegProcess = ffmpeg;

      this.currentResource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw,
        inlineVolume: true,
      });

      // Apply current volume
      if (this.currentResource.volume) {
        this.currentResource.volume.setVolume(this.queue.volume / 100);
      }

      this.pausedPosition = position;
      this.startTime = Date.now() - position * 1000;
      this.audioPlayer.play(this.currentResource);
      return true;
    } catch (error) {
      console.error("Error seeking:", error);
      return false;
    }
  }

  setVolume(volume: number): boolean {
    this.queue.volume = Math.max(0, Math.min(100, volume));

    // Apply volume in real-time using inline volume
    if (this.currentResource?.volume) {
      this.currentResource.volume.setVolume(this.queue.volume / 100);
    }

    this.onQueueUpdate(this.queue);
    return true;
  }

  shuffle(): boolean {
    if (this.queue.tracks.length <= 1) {
      return false;
    }

    const currentTrack = this.getCurrentTrack();
    const remainingTracks = this.queue.tracks.filter(
      (_, i) => i !== this.queue.currentIndex
    );

    // Fisher-Yates shuffle
    for (let i = remainingTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingTracks[i], remainingTracks[j]] = [
        remainingTracks[j],
        remainingTracks[i],
      ];
    }

    if (currentTrack) {
      this.queue.tracks = [currentTrack, ...remainingTracks];
      this.queue.currentIndex = 0;
    } else {
      this.queue.tracks = remainingTracks;
    }

    this.queue.shuffle = !this.queue.shuffle;
    this.onQueueUpdate(this.queue);
    return true;
  }

  setRepeatMode(mode: "off" | "one" | "all"): void {
    this.queue.repeatMode = mode;
    this.onQueueUpdate(this.queue);
  }

  removeTrack(trackId: string): boolean {
    const index = this.queue.tracks.findIndex((t) => t.id === trackId);
    if (index === -1) {
      return false;
    }

    // Don't remove currently playing track
    if (index === this.queue.currentIndex && this.queue.isPlaying) {
      return false;
    }

    this.queue.tracks.splice(index, 1);

    // Adjust current index if needed
    if (index < this.queue.currentIndex) {
      this.queue.currentIndex--;
    }

    this.onQueueUpdate(this.queue);
    return true;
  }

  reorderQueue(fromIndex: number, toIndex: number): boolean {
    if (
      fromIndex < 0 ||
      fromIndex >= this.queue.tracks.length ||
      toIndex < 0 ||
      toIndex >= this.queue.tracks.length
    ) {
      return false;
    }

    const [track] = this.queue.tracks.splice(fromIndex, 1);
    this.queue.tracks.splice(toIndex, 0, track);

    // Update current index
    if (fromIndex === this.queue.currentIndex) {
      this.queue.currentIndex = toIndex;
    } else if (
      fromIndex < this.queue.currentIndex &&
      toIndex >= this.queue.currentIndex
    ) {
      this.queue.currentIndex--;
    } else if (
      fromIndex > this.queue.currentIndex &&
      toIndex <= this.queue.currentIndex
    ) {
      this.queue.currentIndex++;
    }

    this.onQueueUpdate(this.queue);
    return true;
  }

  getCurrentTrack(): Track | null {
    return this.queue.tracks[this.queue.currentIndex] || null;
  }

  getQueue(): QueueState {
    return this.queue;
  }

  // yt-dlp helper methods
  private async getVideoInfoWithYtDlp(url: string): Promise<{
    title: string;
    artist: string;
    duration: number;
    thumbnail: string;
  } | null> {
    try {
      const { stdout } = await execPromise(
        `yt-dlp "${url}" --dump-json --no-warnings --no-download 2>/dev/null`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      const data = JSON.parse(stdout);
      const artistInfo = this.extractArtistFromTitle(
        data.title,
        data.artist,
        data.creator
      );
      return {
        title: artistInfo.title,
        artist: artistInfo.artist,
        duration: data.duration || 0,
        thumbnail:
          data.thumbnail || `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`,
      };
    } catch (error) {
      console.error("yt-dlp video info error:", error);
      return null;
    }
  }

  private async getPlaylistWithYtDlp(url: string): Promise<
    Array<{
      title: string;
      artist: string;
      duration: number;
      thumbnail: string;
      url: string;
    }>
  > {
    try {
      const { stdout } = await execPromise(
        `yt-dlp "${url}" --flat-playlist --dump-json --no-warnings 2>/dev/null`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      const results: Array<{
        title: string;
        artist: string;
        duration: number;
        thumbnail: string;
        url: string;
      }> = [];

      const lines = stdout.trim().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          const artistInfo = this.extractArtistFromTitle(
            data.title,
            data.artist,
            data.creator
          );
          results.push({
            title: artistInfo.title,
            artist: artistInfo.artist,
            duration: data.duration || 0,
            thumbnail:
              data.thumbnail ||
              `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${data.id}`,
          });
        } catch {
          // Skip invalid JSON lines
        }
      }
      return results;
    } catch (error) {
      console.error("yt-dlp playlist error:", error);
      return [];
    }
  }

  private async searchWithYtDlp(query: string): Promise<{
    title: string;
    artist: string;
    duration: number;
    thumbnail: string;
    url: string;
  } | null> {
    try {
      const escapedQuery = query.replace(/"/g, '\\"');
      const { stdout } = await execPromise(
        `yt-dlp "ytsearch1:${escapedQuery}" --flat-playlist --dump-json --no-warnings 2>/dev/null`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      const data = JSON.parse(stdout.trim());
      const artistInfo = this.extractArtistFromTitle(
        data.title,
        data.artist,
        data.creator
      );
      return {
        title: artistInfo.title,
        artist: artistInfo.artist,
        duration: data.duration || 0,
        thumbnail:
          data.thumbnail || `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${data.id}`,
      };
    } catch (error) {
      console.error("yt-dlp search error:", error);
      return null;
    }
  }

  /**
   * Extract artist from video title using common patterns
   * YouTube videos often have "Artist - Title" format
   */
  private extractArtistFromTitle(
    title: string,
    ytArtist?: string,
    creator?: string
  ): { title: string; artist: string } {
    // If yt-dlp provided an artist field (rare but possible), use it
    if (ytArtist && ytArtist !== "Unknown Artist") {
      return { title: title || "Unknown Title", artist: ytArtist };
    }

    // If creator field exists, it might be the actual artist
    if (creator) {
      return { title: title || "Unknown Title", artist: creator };
    }

    const originalTitle = title || "Unknown Title";

    // Common patterns: "Artist - Song Title", "Artist | Song Title", "Artist「Song Title」"
    const patterns = [
      /^(.+?)\s*[-–—]\s*(.+)$/, // Artist - Title (most common)
      /^(.+?)\s*\|\s*(.+)$/, // Artist | Title
      /^(.+?)「(.+?)」/, // Artist「Title」(Japanese)
      /^(.+?)\s*[：:]\s*(.+)$/, // Artist : Title
    ];

    for (const pattern of patterns) {
      const match = originalTitle.match(pattern);
      if (match) {
        let potentialArtist = match[1].trim();
        let potentialTitle = match[2].trim();

        // Clean up common suffixes from artist name
        potentialArtist = potentialArtist
          .replace(
            /\s*(Official|VEVO|Music|Records|Entertainment|Studios?|Channel|Topic)$/gi,
            ""
          )
          .trim();

        // Clean up common suffixes from title
        potentialTitle = potentialTitle
          .replace(/\s*\(Official.*?\)/gi, "")
          .replace(/\s*\(Music.*?\)/gi, "")
          .replace(/\s*\(Lyric.*?\)/gi, "")
          .replace(/\s*\(Audio\)/gi, "")
          .replace(/\s*\(MV\)/gi, "")
          .replace(/\s*\(M\/V\)/gi, "")
          .replace(/\s*\[Official.*?\]/gi, "")
          .replace(/\s*\[MV\]/gi, "")
          .replace(/\s*【.*?】/g, "")
          .trim();

        // Only use if both parts are reasonable length
        if (
          potentialArtist.length >= 1 &&
          potentialArtist.length <= 50 &&
          potentialTitle.length >= 1 &&
          potentialTitle.length <= 100
        ) {
          return { title: potentialTitle, artist: potentialArtist };
        }
      }
    }

    // No pattern matched - try to extract from parentheses like "Title (by Artist)"
    const byMatch = originalTitle.match(/(.+?)\s*\((?:by|from)\s+(.+?)\)/i);
    if (byMatch) {
      return { title: byMatch[1].trim(), artist: byMatch[2].trim() };
    }

    // Fallback: use the whole title as title, unknown artist
    return { title: originalTitle, artist: "Unknown Artist" };
  }

  destroy(): void {
    this.isDestroyed = true;
    this.stopPositionUpdates();
    this.cleanupFFmpeg();
    this.audioPlayer.stop();
    try {
      this.connection.destroy();
    } catch {
      // Connection may already be destroyed
    }
  }
}
