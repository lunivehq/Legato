"use client";

import Image from "next/image";
import { Track } from "@/shared/types";
import { formatDuration } from "@/shared/utils";

interface NowPlayingProps {
  track: Track | null;
  isPlaying: boolean;
  isPaused: boolean;
  position: number;
}

export function NowPlaying({
  track,
  isPlaying,
  isPaused,
  position,
}: NowPlayingProps) {
  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <div className="w-64 h-64 rounded-2xl bg-apple-bg-tertiary flex items-center justify-center mb-8 shadow-2xl">
          <svg
            className="w-24 h-24 text-apple-text-tertiary"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-apple-text-secondary mb-2">
          재생 중인 음악 없음
        </h2>
        <p className="text-apple-text-tertiary">검색하여 음악을 추가하세요</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center max-w-md">
      {/* Album Art */}
      <div className="relative mb-8 group">
        <div className="w-72 h-72 rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src={track.thumbnail || "/placeholder-album.png"}
            alt={track.title}
            width={288}
            height={288}
            className="object-cover w-full h-full"
            priority
          />
        </div>

        {/* Playing Indicator */}
        {isPlaying && !isPaused && (
          <div className="absolute bottom-4 right-4 bg-apple-red rounded-full p-2 shadow-lg">
            <div className="flex items-end gap-0.5 h-4">
              <div
                className="w-1 bg-white visualizer-bar"
                style={{ height: "60%" }}
              />
              <div
                className="w-1 bg-white visualizer-bar"
                style={{ height: "100%" }}
              />
              <div
                className="w-1 bg-white visualizer-bar"
                style={{ height: "40%" }}
              />
              <div
                className="w-1 bg-white visualizer-bar"
                style={{ height: "80%" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1 line-clamp-2">{track.title}</h1>
        <p className="text-lg text-apple-red">{track.artist}</p>
      </div>

      {/* Progress Info */}
      <div className="flex items-center gap-3 text-sm text-apple-text-secondary">
        <span>{formatDuration(position)}</span>
        <span>/</span>
        <span>{formatDuration(track.duration)}</span>
      </div>

      {/* Requested By */}
      <div className="mt-6 text-sm text-apple-text-tertiary">
        요청: {track.requestedBy}
      </div>
    </div>
  );
}
