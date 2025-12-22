"use client";

import { useParams } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { formatDuration } from "@/shared/utils";
import { SearchResult, Track } from "@/shared/types";

type ViewType = "home" | "search" | "queue" | "lyrics";

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    session,
    isConnected,
    isLoading,
    error,
    searchResults,
    lyrics,
    actions,
  } = useWebSocket(sessionId);

  const handleSearch = useCallback(
    (query: string) => {
      if (query.trim()) {
        setIsSearching(true);
        setCurrentView("search");
        actions.search(query);
        setTimeout(() => setIsSearching(false), 2000);
      }
    },
    [actions]
  );

  const handleAddTrack = useCallback(
    (result: SearchResult) => {
      actions.addTrack(result.url || result.title);
      // Visual feedback
      setCurrentView("queue");
    },
    [actions]
  );

  // Auto-fetch lyrics when track changes
  const currentTrack = session?.queue.tracks[session.queue.currentIndex];
  const lastFetchedTrackId = useRef<string | null>(null);

  useEffect(() => {
    if (currentTrack && currentTrack.id !== lastFetchedTrackId.current) {
      lastFetchedTrackId.current = currentTrack.id;
      actions.fetchLyrics(currentTrack.title, currentTrack.artist);
    }
  }, [currentTrack, actions]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-legato-primary border-t-transparent"
          />
          <p className="text-white/60 text-lg">세션에 연결 중...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md px-6"
        >
          <div className="text-7xl mb-6">😢</div>
          <h1 className="text-3xl font-bold text-white mb-3">
            세션을 찾을 수 없습니다
          </h1>
          <p className="text-white/60 mb-8">
            {error || "세션이 만료되었거나 존재하지 않습니다."}
          </p>
          <a
            href="/"
            className="px-8 py-4 bg-legato-primary hover:bg-legato-secondary rounded-full font-semibold transition-all hover:scale-105 inline-block text-white"
          >
            홈으로 돌아가기
          </a>
        </motion.div>
      </div>
    );
  }

  const isPlaying = session.queue.isPlaying && !session.queue.isPaused;

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Connection Status */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            exit={{ y: -50 }}
            className="fixed top-0 left-0 right-0 bg-gradient-to-r from-yellow-600 to-orange-500 text-white text-center py-3 z-50 font-medium"
          >
            <span className="inline-flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
              />
              연결이 끊어졌습니다. 재연결 시도 중...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background - Album Art Blur */}
      <div className="fixed inset-0 z-0">
        {currentTrack?.thumbnail && (
          <motion.div
            key={currentTrack.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <Image
              src={currentTrack.thumbnail}
              alt=""
              fill
              className="object-cover blur-3xl scale-110"
              priority
              unoptimized
            />
          </motion.div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Navigation */}
        <header className="flex items-center justify-between px-4 py-4 md:px-8 md:py-6">
          <div className="flex items-center gap-2 md:gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentView("home")}
              className={`px-4 py-1.5 md:px-5 md:py-2 rounded-full text-sm font-medium transition-all ${
                currentView === "home"
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              홈
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentView("queue")}
              className={`px-4 py-1.5 md:px-5 md:py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                currentView === "queue"
                  ? "bg-white/20 text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              재생목록
              {session.queue.tracks.length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-legato-primary">
                  {session.queue.tracks.length}
                </span>
              )}
            </motion.button>
            {currentTrack && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView("lyrics")}
                className={`px-4 py-1.5 md:px-5 md:py-2 rounded-full text-sm font-medium transition-all ${
                  currentView === "lyrics"
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                가사
              </motion.button>
            )}
          </div>

          {/* Mini Search */}
          {currentView !== "home" && currentView !== "search" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative hidden md:block"
            >
              <input
                type="text"
                placeholder="검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleSearch(searchQuery)
                }
                onFocus={() => setCurrentView("search")}
                className="w-64 px-4 py-2 pl-10 bg-white/10 rounded-full text-sm text-white placeholder-white/40 focus:outline-none focus:bg-white/20 transition-all"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
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
            </motion.div>
          )}
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 pb-40 md:px-8 md:pb-32">
          <AnimatePresence mode="wait">
            {/* Home View - Centered Search */}
            {currentView === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-3xl text-center"
              >
                {/* Now Playing Card */}
                {currentTrack ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-12"
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="relative inline-block cursor-pointer"
                      onClick={() => setCurrentView("lyrics")}
                    >
                      <div className="w-48 h-48 md:w-72 md:h-72 mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                        <Image
                          src={
                            currentTrack.thumbnail || "/placeholder-album.png"
                          }
                          alt={currentTrack.title}
                          width={288}
                          height={288}
                          className="object-cover w-full h-full"
                          priority
                          unoptimized
                        />
                      </div>
                      {/* Playing indicator */}
                      {isPlaying && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute bottom-4 right-4 bg-legato-primary rounded-full p-3 shadow-lg"
                        >
                          <div className="flex items-end gap-0.5 h-4">
                            {[0.6, 1, 0.4, 0.8].map((h, i) => (
                              <motion.div
                                key={i}
                                animate={{
                                  height: ["40%", `${h * 100}%`, "40%"],
                                }}
                                transition={{
                                  duration: 0.5,
                                  repeat: Infinity,
                                  delay: i * 0.1,
                                }}
                                className="w-1 bg-white rounded-full"
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="mt-6"
                    >
                      <h2 className="text-2xl font-bold mb-1">
                        {currentTrack.title}
                      </h2>
                      <p className="text-lg text-legato-primary">
                        {currentTrack.artist}
                      </p>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-12"
                  >
                    <div className="w-48 h-48 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                      <svg
                        className="w-20 h-20 text-white/20"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white/60 mb-2">
                      재생 중인 음악 없음
                    </h2>
                    <p className="text-white/40">검색하여 음악을 추가하세요</p>
                  </motion.div>
                )}

                {/* Centered Search Bar */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative max-w-xl mx-auto"
                >
                  <motion.div
                    animate={{
                      boxShadow: isSearchFocused
                        ? "0 0 0 4px rgba(59, 130, 246, 0.4)"
                        : "0 0 0 0px rgba(59, 130, 246, 0)",
                    }}
                    className="relative rounded-full"
                  >
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="노래, 아티스트 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSearch(searchQuery)
                      }
                      className="w-full h-16 px-14 bg-white/10 backdrop-blur-xl rounded-full text-lg text-white placeholder-white/40 focus:outline-none focus:bg-white/15 transition-all"
                    />
                    <div className="absolute left-5 inset-y-0 flex items-center pointer-events-none">
                      <svg
                        className="w-6 h-6 text-white/40"
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
                    </div>
                    {searchQuery && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 inset-y-0 flex items-center"
                      >
                        <div className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </div>
                      </motion.button>
                    )}
                  </motion.div>

                  {/* Search Suggestions */}
                  <AnimatePresence>
                    {isSearchFocused && searchQuery && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden"
                      >
                        <button
                          onMouseDown={() => handleSearch(searchQuery)}
                          className="w-full px-6 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors text-left"
                        >
                          <svg
                            className="w-5 h-5 text-white/40"
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
                          <span className="text-white/80">
                            &quot;{searchQuery}&quot; 검색
                          </span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}

            {/* Search Results View */}
            {currentView === "search" && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-4xl"
              >
                {/* Search Input */}
                <div className="mb-8">
                  <div className="relative max-w-xl mx-auto">
                    <input
                      type="text"
                      placeholder="노래, 아티스트 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSearch(searchQuery)
                      }
                      autoFocus
                      className="w-full h-14 px-14 bg-white/10 backdrop-blur-xl rounded-full text-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-legato-primary/50 transition-all"
                    />
                    <div className="absolute left-5 inset-y-0 flex items-center pointer-events-none">
                      <svg
                        className="w-6 h-6 text-white/40"
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
                    </div>
                    {isSearching && (
                      <div className="absolute right-5 inset-y-0 flex items-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-5 h-5 border-2 border-legato-primary border-t-transparent rounded-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Results */}
                <div className="space-y-1 md:space-y-2">
                  {searchResults.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <svg
                        className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-white/20"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                      <p className="text-white/40">검색 결과가 없습니다</p>
                    </div>
                  ) : (
                    searchResults.map((result, index) => (
                      <motion.button
                        key={result.id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleAddTrack(result)}
                        className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl hover:bg-white/10 transition-all group text-left"
                      >
                        <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden flex-shrink-0">
                          {result.thumbnail ? (
                            <Image
                              src={result.thumbnail}
                              alt={result.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center">
                              <svg
                                className="w-5 h-5 md:w-6 md:h-6 text-white/40"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                              </svg>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <svg
                              className="w-6 h-6 md:w-8 md:h-8 text-white"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm md:text-base font-medium truncate">
                            {result.title}
                          </p>
                          <p className="text-xs md:text-sm text-white/60 truncate">
                            {result.artist}
                          </p>
                        </div>
                        <span className="text-xs md:text-sm text-white/40 hidden sm:block">
                          {formatDuration(result.duration)}
                        </span>
                      </motion.button>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* Queue View */}
            {currentView === "queue" && (
              <motion.div
                key="queue"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-4xl"
              >
                <h1 className="text-3xl font-bold mb-8 text-center">
                  재생목록
                </h1>
                {session.queue.tracks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-white/20"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                    <p className="text-white/40 mb-4">
                      재생목록이 비어있습니다
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentView("home")}
                      className="px-6 py-3 bg-legato-primary rounded-full font-medium"
                    >
                      음악 검색하기
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {session.queue.tracks.map((track, index) => (
                      <QueueItem
                        key={track.id}
                        track={track}
                        index={index}
                        isCurrentTrack={index === session.queue.currentIndex}
                        isPlaying={
                          isPlaying && index === session.queue.currentIndex
                        }
                        onPlay={() => actions.play(track.id)}
                        onRemove={() => actions.removeTrack(track.id)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Lyrics View */}
            {currentView === "lyrics" && currentTrack && (
              <motion.div
                key="lyrics"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-6xl flex flex-col md:flex-row gap-6 md:gap-12 items-center md:items-start"
              >
                {/* Album Art */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-shrink-0 md:sticky md:top-8"
                >
                  <div className="w-48 h-48 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                    <Image
                      src={currentTrack.thumbnail || "/placeholder-album.png"}
                      alt={currentTrack.title}
                      width={320}
                      height={320}
                      className="object-cover w-full h-full"
                      sizes="(max-width: 768px) 192px, 320px"
                      unoptimized
                    />
                  </div>
                  <div className="mt-4 md:mt-6 text-center">
                    <h2 className="text-lg md:text-xl font-bold line-clamp-2">
                      {currentTrack.title}
                    </h2>
                    <p className="text-sm md:text-base text-legato-primary line-clamp-1">
                      {currentTrack.artist}
                    </p>
                  </div>
                </motion.div>

                {/* Lyrics */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex-1 w-full max-h-[50vh] md:max-h-[calc(100vh-300px)] overflow-y-auto px-4 md:pr-4 md:px-0 lyrics-scroll"
                >
                  {!lyrics ? (
                    <div className="flex flex-col items-center justify-center py-8 md:py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-6 h-6 md:w-8 md:h-8 border-2 border-legato-primary border-t-transparent rounded-full mb-3 md:mb-4"
                      />
                      <p className="text-sm md:text-base text-white/40">
                        가사를 불러오는 중...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 md:space-y-6">
                      {lyrics.lyrics.split("\n\n").map((paragraph, pIndex) => (
                        <div key={pIndex}>
                          {paragraph.split("\n").map((line, lIndex) => (
                            <motion.p
                              key={`${pIndex}-${lIndex}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: (pIndex * 3 + lIndex) * 0.02,
                              }}
                              className={`text-lg md:text-2xl leading-relaxed font-medium ${
                                line.startsWith("[")
                                  ? "text-white/30 text-sm md:text-base uppercase tracking-wider mt-6 md:mt-8"
                                  : "text-white/80 hover:text-white transition-colors"
                              }`}
                            >
                              {line || "\u00A0"}
                            </motion.p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Player Controls */}
        <PlayerBar
          track={currentTrack ?? null}
          isPlaying={isPlaying}
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
          onQueueClick={() => setCurrentView("queue")}
          onLyricsClick={() => setCurrentView("lyrics")}
        />
      </div>
    </div>
  );
}

// Queue Item Component
function QueueItem({
  track,
  index,
  isCurrentTrack,
  isPlaying,
  onPlay,
  onRemove,
}: {
  track: Track;
  index: number;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-4 p-4 rounded-xl transition-all group ${
        isCurrentTrack ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      {/* Index or Playing Indicator */}
      <div className="w-8 text-center">
        {isPlaying ? (
          <div className="flex items-end justify-center gap-0.5 h-4">
            {[0.6, 1, 0.4, 0.8].map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: ["40%", `${h * 100}%`, "40%"] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                className="w-0.5 bg-legato-primary rounded-full"
              />
            ))}
          </div>
        ) : (
          <span className="text-white/40 group-hover:hidden">{index + 1}</span>
        )}
        {!isPlaying && (
          <button
            onClick={onPlay}
            className="hidden group-hover:block text-white hover:text-legato-primary transition-colors"
          >
            <svg
              className="w-5 h-5 mx-auto"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
        {track.thumbnail ? (
          <Image
            src={track.thumbnail}
            alt={track.title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-white/10 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white/40"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium truncate ${
            isCurrentTrack ? "text-legato-primary" : ""
          }`}
        >
          {track.title}
        </p>
        <p className="text-sm text-white/60 truncate">{track.artist}</p>
      </div>

      {/* Duration */}
      <span className="text-sm text-white/40">
        {formatDuration(track.duration)}
      </span>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-2 opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-500 transition-all"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </motion.div>
  );
}

// Player Bar Component
function PlayerBar({
  track,
  isPlaying,
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
  onQueueClick,
  onLyricsClick,
}: {
  track: Track | null;
  isPlaying: boolean;
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
  onQueueClick: () => void;
  onLyricsClick: () => void;
}) {
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
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-40"
    >
      {/* Progress Bar */}
      <div className="relative h-1 bg-white/10 group cursor-pointer">
        <motion.div
          className="absolute left-0 top-0 h-full bg-legato-primary"
          style={{ width: `${progress}%` }}
          layoutId="progress"
        />
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={!track}
        />
      </div>

      <div className="flex items-center justify-between px-3 py-3 md:px-6 md:py-4">
        {/* Left Controls */}
        <div className="flex items-center gap-2 md:gap-4 w-1/4 min-w-0">
          {/* Queue - Mobile */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onQueueClick}
            className="p-2 text-white/40 hover:text-white transition-colors md:hidden"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
            </svg>
          </motion.button>

          {/* Track info - Desktop only */}
          <div className="hidden md:flex items-center gap-4 min-w-0">
            {track ? (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-lg cursor-pointer"
                  onClick={onLyricsClick}
                >
                  <Image
                    src={track.thumbnail || "/placeholder-album.png"}
                    alt={track.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </motion.div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{track.title}</p>
                  <p className="text-sm text-white/60 truncate">
                    {track.artist}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-white/40">재생 중인 음악 없음</p>
            )}
          </div>
        </div>

        {/* Main Controls - Center */}
        <div className="flex items-center gap-3 md:gap-6">
          {/* Shuffle - Desktop only */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onShuffle}
            className={`p-2 transition-colors hidden md:block ${
              shuffle ? "text-legato-primary" : "text-white/40 hover:text-white"
            }`}
            disabled={!track}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </motion.button>

          {/* Previous */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onPrevious}
            className="p-2 text-white/60 hover:text-white transition-colors"
            disabled={!track}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </motion.button>

          {/* Play/Pause */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isPlaying ? onPause : onPlay}
            className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center text-black shadow-lg"
            disabled={!track}
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </motion.button>

          {/* Next */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSkip}
            className="p-2 text-white/60 hover:text-white transition-colors"
            disabled={!track}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </motion.button>

          {/* Repeat - Desktop only */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRepeatClick}
            className={`p-2 transition-colors relative hidden md:block ${
              repeatMode !== "off"
                ? "text-legato-primary"
                : "text-white/40 hover:text-white"
            }`}
            disabled={!track}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            {repeatMode === "one" && (
              <span className="absolute -top-1 -right-1 text-xs font-bold">
                1
              </span>
            )}
          </motion.button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 md:gap-4 w-1/4 justify-end">
          {/* Time - Desktop only */}
          {track && (
            <div className="text-sm text-white/40 tabular-nums hidden md:block">
              {formatDuration(position)} / {formatDuration(track.duration)}
            </div>
          )}

          {/* Volume - Desktop only */}
          <div className="hidden md:flex items-center gap-2">
            <svg
              className="w-5 h-5 text-white/40"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
            <div className="relative w-24 h-4 flex items-center">
              <div className="absolute w-full h-1 bg-white/30 rounded-full" />
              <div
                className="absolute h-1 bg-white rounded-full"
                style={{ width: `${volume}%` }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                className="absolute w-full h-4 opacity-0 cursor-pointer"
              />
              <div
                className="absolute w-3 h-3 bg-white rounded-full shadow-md pointer-events-none"
                style={{ left: `calc(${volume}% - 6px)` }}
              />
            </div>
          </div>

          {/* Queue - Desktop only */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onQueueClick}
            className="p-2 text-white/40 hover:text-white transition-colors hidden md:block"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
            </svg>
          </motion.button>

          {/* Lyrics - Always visible */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onLyricsClick}
            className={`p-2 transition-colors ${
              track ? "text-white/40 hover:text-white" : "text-white/20"
            }`}
            disabled={!track}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
