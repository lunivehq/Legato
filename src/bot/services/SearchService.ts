import play from "play-dl";
import { SearchResult } from "../../shared/types";
import { cleanYouTubeUrl } from "../../shared/utils";

export class SearchService {
  async search(
    query: string,
    source: "youtube" | "spotify" | "soundcloud" | "all" = "youtube",
    limit: number = 20
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      if (source === "youtube" || source === "all") {
        const ytResults = await this.searchYouTube(query, limit);
        results.push(...ytResults);
      }

      // Additional sources can be added here
      // if (source === 'spotify' || source === 'all') { ... }
      // if (source === 'soundcloud' || source === 'all') { ... }

      return results;
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

      // Check if it's already a URL
      const validateResult = play.yt_validate(cleanedQuery);

      if (validateResult === "video") {
        // It's a YouTube URL, get video info
        const info = await play.video_info(cleanedQuery);
        const video = info.video_details;
        return [
          {
            id: video.id || "",
            title: video.title || "Unknown Title",
            artist: video.channel?.name || "Unknown Artist",
            duration: video.durationInSec || 0,
            thumbnail: video.thumbnails?.[0]?.url || "",
            url: cleanedQuery, // Use the cleaned URL
            source: "youtube" as const,
          },
        ];
      }

      const searched = await play.search(query, {
        limit,
        source: { youtube: "video" },
      });

      return searched.map((video) => ({
        id: video.id || "",
        title: video.title || "Unknown Title",
        artist: video.channel?.name || "Unknown Artist",
        duration: video.durationInSec || 0,
        thumbnail: video.thumbnails?.[0]?.url || "",
        url: `https://www.youtube.com/watch?v=${video.id}`,
        source: "youtube" as const,
      }));
    } catch (error) {
      console.error("YouTube search error:", error);
      return [];
    }
  }

  async getVideoInfo(url: string): Promise<SearchResult | null> {
    try {
      if (play.yt_validate(url) === "video") {
        const info = await play.video_info(url);
        const video = info.video_details;

        return {
          id: video.id || "",
          title: video.title || "Unknown Title",
          artist: video.channel?.name || "Unknown Artist",
          duration: video.durationInSec || 0,
          thumbnail: video.thumbnails?.[0]?.url || "",
          url: url, // Use the original URL
          source: "youtube",
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting video info:", error);
      return null;
    }
  }

  async getPlaylistInfo(url: string): Promise<SearchResult[]> {
    try {
      if (play.yt_validate(url) === "playlist") {
        const playlist = await play.playlist_info(url);
        const videos = await playlist.all_videos();

        return videos.map((video) => ({
          id: video.id || "",
          title: video.title || "Unknown Title",
          artist: video.channel?.name || "Unknown Artist",
          duration: video.durationInSec || 0,
          thumbnail: video.thumbnails?.[0]?.url || "",
          url: `https://www.youtube.com/watch?v=${video.id}`,
          source: "youtube" as const,
        }));
      }
      return [];
    } catch (error) {
      console.error("Error getting playlist info:", error);
      return [];
    }
  }
}
