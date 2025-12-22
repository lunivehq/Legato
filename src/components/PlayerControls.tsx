"use client";

import Image from "next/image";
import { Track } from "@/shared/types";
import { formatDuration } from "@/shared/utils";

interface PlayerControlsProps {
  track: Track | null;
  isPlaying: boolean;
  isPaused: boolean;
  position: number;
  volume: number;
  repeatMode: "off" | "one" | "all";
  shuffle: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  onVolumeChange: (volume: number) => void;
  onRepeat: (mode: "off" | "one" | "all") => void;
  onShuffle: () => void;
}

export function PlayerControls({
  track,
  isPlaying,
  isPaused,
  position,
  volume,
  repeatMode,
  shuffle,
  onPlay,
  onPause,
  onSkip,
  onPrevious,
  onSeek,
  onVolumeChange,
  onRepeat,
  onShuffle,
}: PlayerControlsProps) {
  const progress = track ? (position / track.duration) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (track) {
      const newPosition = (parseFloat(e.target.value) / 100) * track.duration;
      onSeek(newPosition);
    }
  };

  const handleRepeatClick = () => {
    const modes: ("off" | "one" | "all")[] = ["off", "one", "all"];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    onRepeat(nextMode);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 glass border-t border-legato-separator">
      {/* Progress Bar */}
      <div className="relative h-1 bg-legato-bg-tertiary group cursor-pointer">
        <div
          className="absolute left-0 top-0 h-full bg-legato-primary transition-all"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={!track}
          style={{ "--progress": `${progress}%` } as React.CSSProperties}
        />
      </div>

      <div className="flex items-center justify-between px-6 py-4">
        {/* Track Info */}
        <div className="flex items-center gap-4 w-1/4 min-w-0">
          {track ? (
            <>
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                <Image
                  src={track.thumbnail || "/placeholder-album.png"}
                  alt={track.title}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium truncate">{track.title}</h3>
                <p className="text-sm text-legato-text-secondary truncate">
                  {track.artist}
                </p>
              </div>
            </>
          ) : (
            <div className="text-legato-text-secondary">재생 중인 음악 없음</div>
          )}
        </div>

        {/* Main Controls */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-6">
            {/* Shuffle */}
            <button
              onClick={onShuffle}
              className={`p-2 transition-colors apple-button ${
                shuffle
                  ? "text-legato-primary"
                  : "text-legato-text-secondary hover:text-white"
              }`}
              disabled={!track}
            >
              <ShuffleIcon className="w-5 h-5" />
            </button>

            {/* Previous */}
            <button
              onClick={onPrevious}
              className="p-2 text-legato-text-secondary hover:text-white transition-colors apple-button"
              disabled={!track}
            >
              <PreviousIcon className="w-6 h-6" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={isPlaying && !isPaused ? onPause : onPlay}
              className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform apple-button"
              disabled={!track}
            >
              {isPlaying && !isPaused ? (
                <PauseIcon className="w-6 h-6" />
              ) : (
                <PlayIcon className="w-6 h-6 ml-1" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={onSkip}
              className="p-2 text-legato-text-secondary hover:text-white transition-colors apple-button"
              disabled={!track}
            >
              <NextIcon className="w-6 h-6" />
            </button>

            {/* Repeat */}
            <button
              onClick={handleRepeatClick}
              className={`p-2 transition-colors apple-button relative ${
                repeatMode !== "off"
                  ? "text-legato-primary"
                  : "text-legato-text-secondary hover:text-white"
              }`}
              disabled={!track}
            >
              <RepeatIcon className="w-5 h-5" />
              {repeatMode === "one" && (
                <span className="absolute -top-1 -right-1 text-xs bg-legato-primary text-white rounded-full w-4 h-4 flex items-center justify-center">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Time Display */}
          <div className="flex items-center gap-2 text-xs text-legato-text-secondary">
            <span>{formatDuration(position)}</span>
            <span>/</span>
            <span>{track ? formatDuration(track.duration) : "0:00"}</span>
          </div>
        </div>

        {/* Volume & Other Controls */}
        <div className="flex items-center gap-4 w-1/4 justify-end">
          <VolumeIcon className="w-5 h-5 text-legato-text-secondary" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(parseInt(e.target.value))}
            className="w-24 accent-legato-primary"
            style={{ "--progress": `${volume}%` } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  );
}

// Icons
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function PreviousIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  );
}

function NextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
}

function ShuffleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
    </svg>
  );
}

function RepeatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
    </svg>
  );
}

function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}
