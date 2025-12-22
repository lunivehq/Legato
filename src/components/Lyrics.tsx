"use client";

import { Track, LyricsData } from "@/shared/types";
import { useEffect, useRef } from "react";

interface LyricsProps {
  lyrics: LyricsData | null;
  track: Track | null;
  onFetchLyrics: (title: string, artist: string) => void;
}

export function Lyrics({ lyrics, track, onFetchLyrics }: LyricsProps) {
  const lastFetchedTrackId = useRef<string | null>(null);

  useEffect(() => {
    if (track && track.id !== lastFetchedTrackId.current) {
      lastFetchedTrackId.current = track.id;
      onFetchLyrics(track.title, track.artist);
    }
  }, [track, onFetchLyrics]);

  if (!track) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-apple-bg-tertiary flex items-center justify-center mb-4">
          <svg
            className="w-10 h-10 text-apple-text-tertiary"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
        <p className="text-apple-text-secondary">재생 중인 음악 없음</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-apple-separator">
        <h2 className="text-lg font-bold">가사</h2>
        {track && (
          <p className="text-sm text-apple-text-secondary truncate">
            {track.title} • {track.artist}
          </p>
        )}
      </div>

      {/* Lyrics Content */}
      <div className="flex-1 overflow-y-auto lyrics-container">
        {!lyrics ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-12 h-12 border-3 border-apple-red border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-apple-text-secondary">가사를 불러오는 중...</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Lyrics Source */}
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs text-apple-text-tertiary uppercase tracking-wider">
                출처: {lyrics.source}
              </span>
              {lyrics.url && (
                <a
                  href={lyrics.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-apple-red hover:underline"
                >
                  원본 보기
                </a>
              )}
            </div>

            {/* Lyrics Text */}
            <div className="space-y-4">
              {lyrics.lyrics.split("\n\n").map((paragraph, pIndex) => (
                <div key={pIndex} className="space-y-1">
                  {paragraph.split("\n").map((line, lIndex) => (
                    <p
                      key={`${pIndex}-${lIndex}`}
                      className={`
                        text-lg leading-relaxed transition-all
                        ${
                          line.startsWith("[")
                            ? "text-apple-text-tertiary text-sm uppercase tracking-wider mt-6"
                            : "text-apple-text-primary"
                        }
                      `}
                    >
                      {line || "\u00A0"}
                    </p>
                  ))}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-apple-separator">
              <p className="text-sm text-apple-text-tertiary text-center">
                가사 제공: Genius
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
