"use client";

import Image from "next/image";
import { Track } from "@/shared/types";
import { formatDuration } from "@/shared/utils";
import { useState } from "react";

interface QueueProps {
  tracks: Track[];
  currentIndex: number;
  onPlay: (trackId: string) => void;
  onRemove: (trackId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function Queue({
  tracks,
  currentIndex,
  onPlay,
  onRemove,
  onReorder,
}: QueueProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
      onReorder(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-legato-separator">
        <h2 className="text-lg font-bold">재생 대기열</h2>
        <p className="text-sm text-legato-text-secondary">
          {tracks.length}곡 • {currentIndex + 1}번째 재생 중
        </p>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-legato-bg-tertiary flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10 text-legato-text-tertiary"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
              </svg>
            </div>
            <p className="text-legato-text-secondary">대기열이 비어 있습니다</p>
            <p className="text-sm text-legato-text-tertiary mt-1">
              검색하여 음악을 추가하세요
            </p>
          </div>
        ) : (
          <div className="p-2">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-3 p-3 rounded-xl transition-all cursor-grab
                  ${
                    index === currentIndex
                      ? "bg-legato-primary/20"
                      : "hover:bg-legato-bg-tertiary"
                  }
                  ${draggedIndex === index ? "opacity-50" : ""}
                  ${
                    dragOverIndex === index && draggedIndex !== index
                      ? "border-t-2 border-legato-primary"
                      : ""
                  }
                `}
                onClick={() => onPlay(track.id)}
              >
                {/* Index / Playing Indicator */}
                <div className="w-6 text-center flex-shrink-0">
                  {index === currentIndex ? (
                    <div className="flex items-end justify-center gap-0.5 h-4">
                      <div
                        className="w-0.5 bg-legato-primary visualizer-bar"
                        style={{ height: "60%" }}
                      />
                      <div
                        className="w-0.5 bg-legato-primary visualizer-bar"
                        style={{ height: "100%" }}
                      />
                      <div
                        className="w-0.5 bg-legato-primary visualizer-bar"
                        style={{ height: "40%" }}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-legato-text-secondary">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow">
                  <Image
                    src={track.thumbnail || "/placeholder-album.png"}
                    alt={track.title}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-medium truncate ${
                      index === currentIndex ? "text-legato-primary" : ""
                    }`}
                  >
                    {track.title}
                  </h3>
                  <p className="text-sm text-legato-text-secondary truncate">
                    {track.artist}
                  </p>
                </div>

                {/* Duration */}
                <span className="text-sm text-legato-text-secondary flex-shrink-0">
                  {formatDuration(track.duration)}
                </span>

                {/* Remove Button */}
                {index !== currentIndex && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(track.id);
                    }}
                    className="p-2 text-legato-text-tertiary hover:text-legato-primary transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
