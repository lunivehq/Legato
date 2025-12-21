import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Legato - Discord Music Bot",
  description: "Apple Music inspired Discord Music Bot Dashboard",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body
        className={`${inter.className} bg-apple-bg-primary text-apple-text-primary`}
      >
        {children}
      </body>
    </html>
  );
}
