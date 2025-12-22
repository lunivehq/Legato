import { LyricsData } from "../../shared/types";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// Simple in-memory cache for lyrics
const lyricsCache = new Map<string, { data: LyricsData; expires: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export class LyricsService {
  constructor() {
    console.log("LyricsService initialized (web search mode)");
  }

  async getLyrics(title: string, artist: string): Promise<LyricsData | null> {
    try {
      // Check cache first
      const cacheKey = `${title.toLowerCase()}-${artist.toLowerCase()}`;
      const cached = lyricsCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }

      // Clean up title for better search results
      const cleanTitle = this.cleanTitle(title);
      const cleanArtist = this.cleanArtist(artist);

      // Try multiple sources
      let lyricsData = await this.fetchFromGeniusWeb(cleanTitle, cleanArtist);

      if (!lyricsData) {
        lyricsData = await this.fetchFromAZLyrics(cleanTitle, cleanArtist);
      }

      if (lyricsData) {
        // Cache the result
        lyricsCache.set(cacheKey, {
          data: lyricsData,
          expires: Date.now() + CACHE_DURATION,
        });
      }

      return lyricsData;
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      return null;
    }
  }

  private async fetchFromGeniusWeb(
    title: string,
    artist: string
  ): Promise<LyricsData | null> {
    try {
      const searchQuery = encodeURIComponent(
        `${title} ${artist} lyrics site:genius.com`
      );

      // Use curl to search and get the first Genius result
      const { stdout: searchResult } = await execPromise(
        `curl -s "https://html.duckduckgo.com/html/?q=${searchQuery}" | grep -oP 'https://genius\\.com/[^"]+' | head -1`,
        { timeout: 10000 }
      );

      const geniusUrl = searchResult.trim();
      if (!geniusUrl || !geniusUrl.includes("genius.com")) {
        return null;
      }

      // Fetch the Genius page and extract lyrics
      const { stdout: pageContent } = await execPromise(
        `curl -s "${geniusUrl}" | grep -oP '(?<=<div data-lyrics-container="true"[^>]*>).*?(?=</div>)' | head -50`,
        { timeout: 10000 }
      );

      if (!pageContent) {
        return null;
      }

      // Clean HTML tags and decode entities
      const lyrics = this.cleanHtmlLyrics(pageContent);

      if (!lyrics || lyrics.length < 50) {
        return null;
      }

      return {
        title: title,
        artist: artist,
        lyrics: lyrics,
        source: "Genius",
        url: geniusUrl,
      };
    } catch (error) {
      console.error("Genius web fetch error:", error);
      return null;
    }
  }

  private async fetchFromAZLyrics(
    title: string,
    artist: string
  ): Promise<LyricsData | null> {
    try {
      // Format for AZLyrics URL pattern
      const cleanArtist = artist.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const azUrl = `https://www.azlyrics.com/lyrics/${cleanArtist}/${cleanTitle}.html`;

      const { stdout: pageContent } = await execPromise(
        `curl -s -A "Mozilla/5.0" "${azUrl}"`,
        { timeout: 10000 }
      );

      if (
        !pageContent ||
        pageContent.includes("404") ||
        pageContent.includes("not found")
      ) {
        return null;
      }

      // Extract lyrics from AZLyrics page format
      const lyricsMatch = pageContent.match(
        /<!-- Usage of azlyrics\.com content.*?-->([\s\S]*?)<!-- MxM banner -->/
      );

      if (!lyricsMatch || !lyricsMatch[1]) {
        return null;
      }

      const lyrics = this.cleanHtmlLyrics(lyricsMatch[1]);

      if (!lyrics || lyrics.length < 50) {
        return null;
      }

      return {
        title: title,
        artist: artist,
        lyrics: lyrics,
        source: "AZLyrics",
        url: azUrl,
      };
    } catch (error) {
      console.error("AZLyrics fetch error:", error);
      return null;
    }
  }

  private cleanHtmlLyrics(html: string): string {
    return (
      html
        // Remove HTML tags
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        // Decode common HTML entities
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&#x27;/g, "'")
        .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
        // Clean up whitespace
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
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
      .replace(/\[Official.*?\]/gi, "")
      .replace(/\[Music.*?\]/gi, "")
      .replace(/\[Lyric.*?\]/gi, "")
      .replace(/\[Audio.*?\]/gi, "")
      .replace(/\[Video.*?\]/gi, "")
      .replace(/\|.*$/g, "")
      .replace(/ft\..*/gi, "")
      .replace(/feat\..*/gi, "")
      .replace(/\(ft\..*?\)/gi, "")
      .replace(/\(feat\..*?\)/gi, "")
      .replace(/-\s*Topic$/gi, "")
      .trim();
  }

  private cleanArtist(artist: string): string {
    return artist
      .replace(/- Topic$/gi, "")
      .replace(/VEVO$/gi, "")
      .replace(/Official$/gi, "")
      .trim();
  }
}
