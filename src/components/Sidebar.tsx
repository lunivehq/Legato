"use client";

import { Session } from "@/shared/types";

interface SidebarProps {
  session: Session;
  activeTab: "queue" | "search" | "lyrics";
  onTabChange: (tab: "queue" | "search" | "lyrics") => void;
}

export function Sidebar({ session, activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-apple-bg-secondary border-r border-apple-separator flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-apple-separator">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-apple-red to-apple-pink flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg">Legato</h1>
            <p className="text-xs text-apple-text-secondary">Music Bot</p>
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="p-4 border-b border-apple-separator">
        <div className="bg-apple-bg-tertiary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-apple-text-secondary">연결됨</span>
          </div>
          <h3 className="font-medium truncate">{session.guildName}</h3>
          <p className="text-sm text-apple-text-secondary truncate">
            🔊 {session.channelName}
          </p>
          <p className="text-xs text-apple-text-tertiary mt-2">
            세션: {session.id}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          <NavButton
            icon={<QueueIcon />}
            label="재생 대기열"
            isActive={activeTab === "queue"}
            onClick={() => onTabChange("queue")}
          />
          <NavButton
            icon={<SearchIcon />}
            label="검색"
            isActive={activeTab === "search"}
            onClick={() => onTabChange("search")}
          />
          <NavButton
            icon={<LyricsIcon />}
            label="가사"
            isActive={activeTab === "lyrics"}
            onClick={() => onTabChange("lyrics")}
          />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-apple-separator">
        <p className="text-xs text-apple-text-tertiary text-center">
          Legato v1.0.0
        </p>
        <p className="text-xs text-apple-text-tertiary text-center mt-1">
          Apple Music Inspired
        </p>
      </div>
    </aside>
  );
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, isActive, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
        ${
          isActive
            ? "bg-apple-red/20 text-apple-red"
            : "text-apple-text-secondary hover:bg-apple-bg-tertiary hover:text-white"
        }
      `}
    >
      <span className="w-5 h-5">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

// Icons
function QueueIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );
}

function LyricsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  );
}
