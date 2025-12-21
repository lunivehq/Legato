import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gradient-bg">
      <div className="text-center max-w-2xl mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-apple-red to-apple-pink flex items-center justify-center shadow-2xl">
            <svg
              className="w-16 h-16 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-apple-text-secondary bg-clip-text text-transparent">
          Legato
        </h1>

        <p className="text-xl text-apple-text-secondary mb-8">
          Apple Music에서 영감을 받은
          <br />
          프리미엄 Discord 음악 봇
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass rounded-2xl p-6">
            <div className="text-3xl mb-3">🎵</div>
            <h3 className="font-semibold mb-2">고품질 스트리밍</h3>
            <p className="text-sm text-apple-text-secondary">
              YouTube에서 직접 스트리밍하는 고품질 오디오
            </p>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="font-semibold mb-2">아름다운 대시보드</h3>
            <p className="text-sm text-apple-text-secondary">
              Apple Music 스타일의 직관적인 웹 인터페이스
            </p>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="font-semibold mb-2">실시간 가사</h3>
            <p className="text-sm text-apple-text-secondary">
              Genius에서 가져온 노래 가사 표시
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <p className="text-apple-text-secondary">
            Discord에서{" "}
            <code className="bg-apple-bg-tertiary px-2 py-1 rounded">
              /play
            </code>{" "}
            명령어를 사용하여 시작하세요
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="https://discord.com/api/oauth2/authorize"
              target="_blank"
              className="px-6 py-3 bg-apple-red hover:bg-apple-pink rounded-full font-medium transition-colors apple-button"
            >
              봇 초대하기
            </Link>
            <Link
              href="https://github.com"
              target="_blank"
              className="px-6 py-3 bg-apple-bg-tertiary hover:bg-apple-bg-elevated rounded-full font-medium transition-colors apple-button"
            >
              GitHub
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-center text-apple-text-tertiary text-sm">
        <p>© 2024 Legato. Apple Music에서 영감을 받았습니다.</p>
      </footer>
    </main>
  );
}
