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
import play from "play-dl";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import { Track, QueueState } from "../../shared/types";
import { cleanYouTubeUrl } from "../../shared/utils";
import { v4 as uuidv4 } from "uuid";

const execPromise = promisify(exec);

export class MusicPlayer {
  private audioPlayer: AudioPlayer;
  private connection: VoiceConnection;
  private queue: QueueState;
  private currentResource: AudioResource | null = null;
  private positionInterval: NodeJS.Timeout | null = null;
  private onQueueUpdate: (queue: QueueState) => void;
  private onTrackStart: (track: Track) => void;
  private onTrackEnd: () => void;
  private onPositionUpdate: (position: number, duration: number) => void;
  private startTime: number = 0;
  private pausedPosition: number = 0;

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

      // Check if it's a URL or search query
      const validateResult = play.yt_validate(cleanedQuery);

      if (validateResult === "video") {
        // It's a YouTube video URL
        trackUrl = cleanedQuery;
        const info = await play.video_info(cleanedQuery);
        const videoDetails = info.video_details;
        trackTitle = videoDetails.title || "Unknown Title";
        trackArtist = videoDetails.channel?.name || "Unknown Artist";
        trackDuration = videoDetails.durationInSec || 0;
        trackThumbnail = videoDetails.thumbnails?.[0]?.url || "";
      } else if (validateResult === "playlist") {
        // Handle playlist
        const playlist = await play.playlist_info(cleanedQuery);
        const videos = await playlist.all_videos();

        for (const video of videos.slice(0, 50)) {
          // Limit to 50 tracks
          const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
          const track: Track = {
            id: uuidv4(),
            title: video.title || "Unknown Title",
            artist: video.channel?.name || "Unknown Artist",
            duration: video.durationInSec || 0,
            thumbnail: video.thumbnails?.[0]?.url || "",
            url: videoUrl,
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
        // Search for the query (use original query for search, not cleaned URL)
        const searched = await play.search(cleanedQuery, { limit: 1 });
        if (searched.length === 0) {
          return null;
        }
        const firstResult = searched[0];
        trackUrl = `https://www.youtube.com/watch?v=${firstResult.id}`;
        trackTitle = firstResult.title || "Unknown Title";
        trackArtist = firstResult.channel?.name || "Unknown Artist";
        trackDuration = firstResult.durationInSec || 0;
        trackThumbnail = firstResult.thumbnails?.[0]?.url || "";
      }

      const track: Track = {
        id: uuidv4(),
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

    console.log(`Playing track: ${track.title} - URL: ${track.url}`);

    try {
      // Use system yt-dlp to get direct audio URL
      const { stdout } = await execPromise(
        `yt-dlp --format bestaudio --get-url --no-warnings --no-call-home "${track.url}"`
      );

      const audioUrl = stdout.trim();
      if (!audioUrl) {
        throw new Error("Could not get audio URL from yt-dlp");
      }

      console.log("Got audio URL from yt-dlp");

      // Use FFmpeg to stream the audio (volume controlled via inline volume)
      const ffmpeg = spawn(
        "ffmpeg",
        ["-i", audioUrl, "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"],
        {
          stdio: ["ignore", "pipe", "ignore"],
        }
      );

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
      // Use system yt-dlp to get direct audio URL
      const { stdout } = await execPromise(
        `yt-dlp --format bestaudio --get-url --no-warnings --no-call-home "${track.url}"`
      );

      const audioUrl = stdout.trim();
      if (!audioUrl) {
        throw new Error("Could not get audio URL");
      }

      // Use FFmpeg to seek to position
      const ffmpeg = spawn(
        "ffmpeg",
        [
          "-ss",
          position.toString(),
          "-i",
          audioUrl,
          "-f",
          "s16le",
          "-ar",
          "48000",
          "-ac",
          "2",
          "pipe:1",
        ],
        {
          stdio: ["ignore", "pipe", "ignore"],
        }
      );

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

  destroy(): void {
    this.stopPositionUpdates();
    this.audioPlayer.stop();
    this.connection.destroy();
  }
}
