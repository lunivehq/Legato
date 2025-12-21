"use client";

import Image from "next/image";
import { SearchResult } from "@/shared/types";
import { formatDuration } from "@/shared/utils";
import { useState, useCallback } from "react";

interface SearchProps {
  results: SearchResult[];
  onSearch: (query: string) => void;
  onAddTrack: (query: string) => void;
}

export function Search({ results, onSearch, onAddTrack }: SearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [addingTrackIds, setAddingTrackIds] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        setIsSearching(true);
        onSearch(query.trim());
        // Reset searching state after a delay
        setTimeout(() => setIsSearching(false), 2000);
      }
    },
    [query, onSearch]
  );

  const handleAddTrack = useCallback(
    (result: SearchResult) => {
      // Prevent duplicate clicks
      if (addingTrackIds.has(result.id)) return;

      setAddingTrackIds((prev) => new Set(prev).add(result.id));
      onAddTrack(result.url);

      // Reset after 3 seconds
      setTimeout(() => {
        setAddingTrackIds((prev) => {
          const next = new Set(prev);
          next.delete(result.id);
          return next;
        });
      }, 3000);
    },
    [addingTrackIds, onAddTrack]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-apple-separator">
        <h2 className="text-lg font-bold mb-3">검색</h2>
        <form onSubmit={handleSearch}>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="노래, 아티스트, URL 검색..."
              className="w-full bg-apple-bg-tertiary rounded-xl px-4 py-3 pl-10 text-white placeholder-apple-text-tertiary focus:outline-none focus:ring-2 focus:ring-apple-red transition-all"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-text-tertiary"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-apple-red border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-apple-bg-tertiary flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10 text-apple-text-tertiary"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>
            <p className="text-apple-text-secondary">음악을 검색하세요</p>
            <p className="text-sm text-apple-text-tertiary mt-1">
              YouTube URL 또는 검색어 입력
            </p>
          </div>
        ) : (
          <div className="p-2">
            {results.map((result) => (
              <div
                key={result.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-apple-bg-tertiary transition-colors group"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow">
                  <Image
                    src={result.thumbnail || "/placeholder-album.png"}
                    alt={result.title}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{result.title}</h3>
                  <p className="text-sm text-apple-text-secondary truncate">
                    {result.artist}
                  </p>
                </div>

                {/* Duration */}
                <span className="text-sm text-apple-text-secondary flex-shrink-0">
                  {formatDuration(result.duration)}
                </span>

                {/* Add Button */}
                <button
                  onClick={() => handleAddTrack(result)}
                  disabled={addingTrackIds.has(result.id)}
                  className={`p-2 rounded-full transition-colors ${
                    addingTrackIds.has(result.id)
                      ? "bg-green-500/20 text-green-500 opacity-100"
                      : "bg-apple-red/20 hover:bg-apple-red text-apple-red hover:text-white opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {addingTrackIds.has(result.id) ? (
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
