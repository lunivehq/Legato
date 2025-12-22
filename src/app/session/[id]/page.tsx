"use client";

import { useParams } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { NowPlaying } from "@/components/NowPlaying";
import { Queue } from "@/components/Queue";
import { Lyrics } from "@/components/Lyrics";
import { PlayerControls } from "@/components/PlayerControls";
import { useState } from "react";

type TabType = "queue" | "search" | "lyrics";

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>("queue");

  const {
    session,
    isConnected,
    isLoading,
    error,
    searchResults,
    lyrics,
    actions,
  } = useWebSocket(sessionId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-apple-red border-t-transparent animate-spin" />
          <p className="text-apple-text-secondary">세션에 연결 중...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😢</div>
          <h1 className="text-2xl font-bold mb-2">세션을 찾을 수 없습니다</h1>
          <p className="text-apple-text-secondary mb-6">
            {error || "세션이 만료되었거나 존재하지 않습니다."}
          </p>
          <a
            href="/"
            className="px-6 py-3 bg-apple-red hover:bg-apple-pink rounded-full font-medium transition-colors inline-block"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  const currentTrack = session.queue.tracks[session.queue.currentIndex];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Connection Status */}
      {!isConnected && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white text-center py-2 z-50">
          연결이 끊어졌습니다. 재연결 시도 중...
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 pb-24">
        {/* Main Area */}
        <main className="flex-1 flex">
          {/* Now Playing Section */}
          <div className="flex-1 p-8 flex flex-col items-center justify-center gradient-bg">
            <NowPlaying
              track={currentTrack}
              isPlaying={session.queue.isPlaying}
              isPaused={session.queue.isPaused}
              position={session.queue.position}
            />
          </div>

          {/* Right Panel */}
          <div className="w-96 border-l border-apple-separator bg-apple-bg-secondary">
            {activeTab === "queue" && (
              <Queue
                tracks={session.queue.tracks}
                currentIndex={session.queue.currentIndex}
                onPlay={actions.play}
                onRemove={actions.removeTrack}
                onReorder={actions.reorderQueue}
              />
            )}
            {activeTab === "lyrics" && (
              <Lyrics
                lyrics={lyrics}
                track={currentTrack}
                onFetchLyrics={actions.fetchLyrics}
              />
            )}
          </div>
        </main>
      </div>

      {/* Player Controls */}
      <PlayerControls
        track={currentTrack}
        isPlaying={session.queue.isPlaying}
        isPaused={session.queue.isPaused}
        position={session.queue.position}
        volume={session.queue.volume}
        repeatMode={session.queue.repeatMode}
        shuffle={session.queue.shuffle}
        onPlay={actions.resume}
        onPause={actions.pause}
        onSkip={actions.skip}
        onPrevious={actions.previous}
        onSeek={actions.seek}
        onVolumeChange={actions.setVolume}
        onRepeat={actions.setRepeatMode}
        onShuffle={actions.shuffle}
      />
    </div>
  );
}
