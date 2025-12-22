"use client";

import { useState, useCallback } from "react";
import { SearchResult } from "@/shared/types";
import Image from "next/image";

interface SearchProps {
  searchResults: SearchResult[];
  onSearch: (query: string) => void;
  onAddTrack: (query: string) => void;
  isSearching?: boolean;
}

export function Search({
  searchResults,
  onSearch,
  onAddTrack,
  isSearching = false,
}: SearchProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query.trim());
      }
    },
    [query, onSearch]
  );

  const handleAddTrack = useCallback(
    (result: SearchResult) => {
      // Use the video URL or title as the query
      onAddTrack(result.url || result.title);
    },
    [onAddTrack]
  );

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="노래 검색..."
            className="w-full px-5 py-3 pl-12 bg-legato-bg-tertiary rounded-full text-legato-text-primary placeholder-legato-text-tertiary focus:outline-none focus:ring-2 focus:ring-legato-primary/50 transition-all"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-legato-text-tertiary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-legato-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </form>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-legato-text-tertiary">
            <svg
              className="w-16 h-16 mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            <p className="text-center">
              검색어를 입력하여
              <br />
              음악을 찾아보세요
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {searchResults.map((result, index) => (
              <button
                key={result.id || index}
                onClick={() => handleAddTrack(result)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-legato-bg-tertiary transition-colors group text-left"
              >
                {/* Thumbnail */}
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-legato-bg-tertiary flex-shrink-0">
                  {result.thumbnail ? (
                    <Image
                      src={result.thumbnail}
                      alt={result.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-legato-text-tertiary"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                    </svg>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-legato-text-primary truncate">
                    {result.title}
                  </p>
                  <p className="text-sm text-legato-text-secondary truncate">
                    {result.artist}
                  </p>
                </div>

                {/* Duration */}
                <span className="text-sm text-legato-text-tertiary flex-shrink-0">
                  {formatDuration(result.duration)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
