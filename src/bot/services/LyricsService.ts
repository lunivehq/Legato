import { LyricsData } from "../../shared/types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Genius = require("genius-lyrics");

export class LyricsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;

  constructor() {
    this.client = new Genius.Client(process.env.GENIUS_API_KEY);
  }

  async getLyrics(title: string, artist: string): Promise<LyricsData | null> {
    try {
      // Clean up title for better search results
      const cleanTitle = this.cleanTitle(title);
      const searchQuery = `${cleanTitle} ${artist}`;

      const searches = await this.client.songs.search(searchQuery);

      if (searches.length === 0) {
        return null;
      }

      const song = searches[0];
      const lyrics = await song.lyrics();

      if (!lyrics) {
        return null;
      }

      return {
        title: song.title,
        artist: song.artist.name,
        lyrics,
        thumbnail: song.thumbnail,
        source: "Genius",
        url: song.url,
      };
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      return null;
    }
  }

  private cleanTitle(title: string): string {
    // Remove common suffixes and extra info from title
    return title
      .replace(/\(Official.*?\)/gi, "")
      .replace(/\(Music.*?\)/gi, "")
      .replace(/\(Lyric.*?\)/gi, "")
      .replace(/\(Audio.*?\)/gi, "")
      .replace(/\(Video.*?\)/gi, "")
      .replace(/\[Official.*?\]/gi, "")
      .replace(/\[Music.*?\]/gi, "")
      .replace(/\[Lyric.*?\]/gi, "")
      .replace(/\[Audio.*?\]/gi, "")
      .replace(/\[Video.*?\]/gi, "")
      .replace(/\|.*$/g, "")
      .replace(/ft\..*/gi, "")
      .replace(/feat\..*/gi, "")
      .trim();
  }
}
