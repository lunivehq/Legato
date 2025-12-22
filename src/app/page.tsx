import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gradient-bg">
      <div className="text-center max-w-2xl mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/logo.png"
              alt="Legato"
              width={128}
              height={128}
              className="w-full h-full object-cover"
              priority
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-bold mb-4 pb-2 bg-gradient-to-r from-white to-legato-text-secondary bg-clip-text text-transparent leading-tight">
          Legato
        </h1>

        <p className="text-xl text-legato-text-secondary mb-8">
          Discord 음악 봇
        </p>

        {/* CTA */}
        <div className="space-y-4">
          <p className="text-legato-text-secondary">
            Discord에서{" "}
            <code className="bg-legato-bg-tertiary px-2 py-1 rounded">
              /play
            </code>{" "}
            명령어를 사용하여 시작하세요
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="https://discord.com/oauth2/authorize?client_id=1452272641254756384"
              target="_blank"
              className="px-6 py-3 bg-legato-primary hover:bg-legato-accent rounded-full font-medium transition-colors legato-button"
            >
              봇 초대하기
            </Link>
            <Link
              href="https://github.com/lunivehq/legato"
              target="_blank"
              className="px-6 py-3 bg-legato-bg-tertiary hover:bg-legato-bg-elevated rounded-full font-medium transition-colors legato-button"
            >
              GitHub
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-center text-legato-text-tertiary text-sm">
        <p>© 2025 Lunive</p>
      </footer>
    </main>
  );
}
