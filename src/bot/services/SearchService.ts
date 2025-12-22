import { SearchResult } from "../../shared/types";
import { cleanYouTubeUrl } from "../../shared/utils";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// Cache for search results to reduce yt-dlp calls
const searchCache = new Map<
  string,
  { results: SearchResult[]; expires: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class SearchService {
  constructor() {
    console.log("SearchService initialized (yt-dlp mode)");
  }

  async search(
    query: string,
    source: "youtube" | "spotify" | "soundcloud" | "all" = "youtube",
    limit: number = 20
  ): Promise<SearchResult[]> {
    try {
      if (source === "youtube" || source === "all") {
        return await this.searchYouTube(query, limit);
      }
      return [];
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  }

  private async searchYouTube(
    query: string,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      // Clean the URL if it contains extra parameters
      const cleanedQuery = cleanYouTubeUrl(query);

      // Check cache first
      const cacheKey = `${cleanedQuery}-${limit}`;
      const cached = searchCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.results;
      }

      // Check if it's a YouTube URL
      const isUrl = this.isYouTubeUrl(cleanedQuery);

      let results: SearchResult[];

      if (isUrl) {
        // Get info for single video or playlist
        results = await this.getVideoInfoFromUrl(cleanedQuery);
      } else {
        // Search YouTube
        results = await this.searchWithYtDlp(query, limit);
      }

      // Cache results
      if (results.length > 0) {
        searchCache.set(cacheKey, {
          results,
          expires: Date.now() + CACHE_DURATION,
        });
      }

      return results;
    } catch (error) {
      console.error("YouTube search error:", error);
      return [];
    }
  }

  private isYouTubeUrl(query: string): boolean {
    return (
      query.includes("youtube.com/watch") ||
      query.includes("youtu.be/") ||
      query.includes("youtube.com/playlist")
    );
  }

  private async searchWithYtDlp(
    query: string,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      // Use yt-dlp to search YouTube
      const escapedQuery = query.replace(/"/g, '\\"');
      const { stdout } = await execPromise(
        `yt-dlp "ytsearch${limit}:${escapedQuery}" --flat-playlist --dump-json --no-warnings 2>/dev/null`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      const results: SearchResult[] = [];
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
            id: data.id || "",
            title: artistInfo.title,
            artist: artistInfo.artist,
            duration: data.duration || 0,
            thumbnail:
              data.thumbnail ||
              data.thumbnails?.[0]?.url ||
              `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`,
            url: data.url || `https://www.youtube.com/watch?v=${data.id}`,
            source: "youtube" as const,
          });
        } catch {
          // Skip invalid JSON lines
        }
      }

      return results;
    } catch (error) {
      console.error("yt-dlp search error:", error);
      return [];
    }
  }

  private async getVideoInfoFromUrl(url: string): Promise<SearchResult[]> {
    try {
      const isPlaylist = url.includes("playlist");
      const command = isPlaylist
        ? `yt-dlp "${url}" --flat-playlist --dump-json --no-warnings 2>/dev/null`
        : `yt-dlp "${url}" --dump-json --no-warnings --no-download 2>/dev/null`;

      const { stdout } = await execPromise(command, {
        maxBuffer: 10 * 1024 * 1024,
      });

      const results: SearchResult[] = [];
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
            id: data.id || "",
            title: artistInfo.title,
            artist: artistInfo.artist,
            duration: data.duration || 0,
            thumbnail:
              data.thumbnail ||
              data.thumbnails?.[0]?.url ||
              `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${data.id}`,
            source: "youtube" as const,
          });
        } catch {
          // Skip invalid JSON lines
        }
      }

      return results;
    } catch (error) {
      console.error("yt-dlp URL info error:", error);
      return [];
    }
  }

  async getVideoInfo(url: string): Promise<SearchResult | null> {
    try {
      const results = await this.getVideoInfoFromUrl(url);
      return results[0] || null;
    } catch (error) {
      console.error("Error getting video info:", error);
      return null;
    }
  }

  async getPlaylistInfo(url: string): Promise<SearchResult[]> {
    try {
      if (url.includes("playlist")) {
        return await this.getVideoInfoFromUrl(url);
      }
      return [];
    } catch (error) {
      console.error("Error getting playlist info:", error);
      return [];
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
}
