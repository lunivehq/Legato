import { LyricsData } from "../../shared/types";

// Simple in-memory cache for lyrics
const lyricsCache = new Map<string, { data: LyricsData; expires: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export class LyricsService {
  constructor() {
    console.log("LyricsService initialized (multi-source mode)");
  }

  async getLyrics(title: string, artist: string): Promise<LyricsData | null> {
    try {
      // Check cache first
      const cacheKey = `${title.toLowerCase()}-${artist.toLowerCase()}`;
      const cached = lyricsCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        console.log("Lyrics found in cache");
        return cached.data;
      }

      // Clean up title for better search results
      const cleanTitle = this.cleanTitle(title);
      const cleanArtist = this.cleanArtist(artist);

      console.log(`Fetching lyrics for: "${cleanTitle}" by "${cleanArtist}"`);

      // Try multiple sources in order of reliability
      let lyricsData: LyricsData | null = null;

      // 1. Try Lyrics.ovh (most reliable free API)
      lyricsData = await this.fetchFromLyricsOvh(cleanTitle, cleanArtist);
      if (lyricsData) {
        console.log("Found lyrics from Lyrics.ovh");
      }

      // 2. Try Lyrist
      if (!lyricsData) {
        lyricsData = await this.fetchFromLyrist(cleanTitle, cleanArtist);
        if (lyricsData) {
          console.log("Found lyrics from Lyrist");
        }
      }

      // 3. Try with simplified title (remove featuring artists, etc.)
      if (!lyricsData) {
        const simplifiedTitle = this.simplifyTitle(cleanTitle);
        const simplifiedArtist = this.simplifyArtist(cleanArtist);

        if (
          simplifiedTitle !== cleanTitle ||
          simplifiedArtist !== cleanArtist
        ) {
          console.log(
            `Retrying with simplified: "${simplifiedTitle}" by "${simplifiedArtist}"`
          );

          lyricsData = await this.fetchFromLyricsOvh(
            simplifiedTitle,
            simplifiedArtist
          );
          if (!lyricsData) {
            lyricsData = await this.fetchFromLyrist(
              simplifiedTitle,
              simplifiedArtist
            );
          }
        }
      }

      // 4. Try LRClib (for synced lyrics)
      if (!lyricsData) {
        lyricsData = await this.fetchFromLrclib(cleanTitle, cleanArtist);
        if (lyricsData) {
          console.log("Found lyrics from LRClib");
        }
      }

      // 5. Try with just title search
      if (!lyricsData) {
        lyricsData = await this.fetchFromLrclib(cleanTitle, "");
        if (lyricsData) {
          console.log("Found lyrics from LRClib (title only)");
        }
      }

      if (lyricsData) {
        // Cache the result
        lyricsCache.set(cacheKey, {
          data: lyricsData,
          expires: Date.now() + CACHE_DURATION,
        });
      } else {
        console.log("Lyrics not found from any source");
      }

      return lyricsData;
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      return null;
    }
  }

  private async fetchFromLyricsOvh(
    title: string,
    artist: string
  ): Promise<LyricsData | null> {
    try {
      const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(
        artist
      )}/${encodeURIComponent(title)}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Legato/1.0)",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { lyrics?: string };

      if (!data.lyrics || data.lyrics.length < 30) {
        return null;
      }

      return {
        title: title,
        artist: artist,
        lyrics: data.lyrics.trim(),
        source: "Lyrics.ovh",
      };
    } catch (error) {
      // Silently fail, will try next source
      return null;
    }
  }

  private async fetchFromLyrist(
    title: string,
    artist: string
  ): Promise<LyricsData | null> {
    try {
      const url = `https://lyrist.vercel.app/api/${encodeURIComponent(
        title
      )}/${encodeURIComponent(artist)}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Legato/1.0)",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        lyrics?: string;
        title?: string;
        artist?: string;
        image?: string;
      };

      if (!data.lyrics || data.lyrics.length < 30) {
        return null;
      }

      return {
        title: data.title || title,
        artist: data.artist || artist,
        lyrics: data.lyrics.trim(),
        source: "Lyrist",
        url: data.image,
      };
    } catch (error) {
      return null;
    }
  }

  private async fetchFromLrclib(
    title: string,
    artist: string
  ): Promise<LyricsData | null> {
    try {
      // LRClib - free synced lyrics API
      const params = new URLSearchParams();
      params.set("track_name", title);
      if (artist) {
        params.set("artist_name", artist);
      }

      const url = `https://lrclib.net/api/search?${params.toString()}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Legato/1.0)",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const results = (await response.json()) as Array<{
        trackName?: string;
        artistName?: string;
        plainLyrics?: string;
        syncedLyrics?: string;
      }>;

      if (!results || results.length === 0) {
        return null;
      }

      // Get the first result with lyrics
      const result = results.find((r) => r.plainLyrics || r.syncedLyrics);
      if (!result) {
        return null;
      }

      // Prefer plain lyrics, fall back to synced (removing timestamps)
      let lyrics = result.plainLyrics;
      if (!lyrics && result.syncedLyrics) {
        // Remove LRC timestamps like [00:12.34]
        lyrics = result.syncedLyrics
          .replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "")
          .trim();
      }

      if (!lyrics || lyrics.length < 30) {
        return null;
      }

      return {
        title: result.trackName || title,
        artist: result.artistName || artist,
        lyrics: lyrics.trim(),
        source: "LRClib",
      };
    } catch (error) {
      return null;
    }
  }

  private simplifyTitle(title: string): string {
    return (
      title
        // Remove everything after common separators
        .split(/[-–—]/)[0]
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  private simplifyArtist(artist: string): string {
    return (
      artist
        // Take only the first artist if multiple
        .split(/[,&×x]/i)[0]
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/\(Official.*?\)/gi, "")
      .replace(/\(Music.*?\)/gi, "")
      .replace(/\(Lyric.*?\)/gi, "")
      .replace(/\(Audio.*?\)/gi, "")
      .replace(/\(Video.*?\)/gi, "")
      .replace(/\(Lyrics\)/gi, "")
      .replace(/\(MV\)/gi, "")
      .replace(/\(M\/V\)/gi, "")
      .replace(/\[Official.*?\]/gi, "")
      .replace(/\[Music.*?\]/gi, "")
      .replace(/\[Lyric.*?\]/gi, "")
      .replace(/\[Audio.*?\]/gi, "")
      .replace(/\[Video.*?\]/gi, "")
      .replace(/\[MV\]/gi, "")
      .replace(/\|.*$/g, "")
      .replace(/ft\.\s*.*/gi, "")
      .replace(/feat\.\s*.*/gi, "")
      .replace(/\(ft\..*?\)/gi, "")
      .replace(/\(feat\..*?\)/gi, "")
      .replace(/-\s*Topic$/gi, "")
      .replace(/\s*\(.*?\)\s*$/g, "") // Remove trailing parentheses
      .replace(/\s*\[.*?\]\s*$/g, "") // Remove trailing brackets
      .replace(/\s+/g, " ")
      .trim();
  }

  private cleanArtist(artist: string): string {
    return artist
      .replace(/- Topic$/gi, "")
      .replace(/VEVO$/gi, "")
      .replace(/Official$/gi, "")
      .replace(/\s*\(.*?\)\s*/g, "") // Remove parentheses content
      .replace(/\s+/g, " ")
      .trim();
  }
}
