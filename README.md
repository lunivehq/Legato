# 🎵 Legato

**This bot is made for study purpose of programming using ai agent.**

![Legato Banner](https://img.shields.io/badge/Legato-Discord%20Music%20Bot-FA2D48?style=for-the-badge&logo=discord&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Discord.js](https://img.shields.io/badge/Discord.js-14-5865F2?style=flat-square&logo=discord)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)

## ✨ 특징

- 🎨 **Apple Music 스타일 웹 대시보드** - 아름답고 직관적인 UI
- 🎵 **고품질 음악 스트리밍** - YouTube에서 직접 스트리밍
- 📝 **실시간 가사 표시** - Genius API 연동
- 🔍 **스마트 검색** - URL 또는 검색어로 음악 찾기
- 📋 **드래그 앤 드롭 대기열** - 쉬운 재생목록 관리
- 🔄 **실시간 동기화** - WebSocket을 통한 실시간 업데이트
- 🔀 **셔플 & 반복** - 다양한 재생 모드

## 🚀 시작하기

### 필수 조건

- Node.js 18.0.0 이상
- Discord 봇 토큰
- Genius API 키 (가사 기능용)

### 설치

1. **저장소 클론**

```bash
git clone https://github.com/yourusername/legato.git
cd legato
```

2. **의존성 설치**

```bash
npm install
```

3. **환경 변수 설정**

```bash
cp .env.example .env
```

`.env` 파일을 열고 다음 값들을 설정하세요:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here

# Web Dashboard Configuration
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# WebSocket Server Port
WS_PORT=3001

# Genius API (for lyrics)
GENIUS_API_KEY=your_genius_api_key_here
```

4. **Discord 슬래시 명령어 등록**

```bash
npm run deploy-commands
```

5. **개발 서버 시작**

```bash
npm run dev
```

## 📖 사용법

### Discord 명령어

| 명령어          | 설명                                                                        |
| --------------- | --------------------------------------------------------------------------- |
| `/play [query]` | 음성 채널에 참여하고 웹 대시보드 링크 제공. 선택적으로 검색어/URL 입력 가능 |
| `/skip`         | 현재 재생 중인 트랙 스킵                                                    |
| `/stop`         | 재생 종료 및 음성 채널에서 퇴장                                             |

### 웹 대시보드

`/play` 명령어 사용 시 고유 세션 ID가 포함된 대시보드 URL이 제공됩니다.

대시보드에서 가능한 작업:

- 🔍 음악 검색 및 대기열에 추가
- ▶️ 재생/일시정지/스킵/이전 곡
- 🔀 셔플 및 반복 모드 설정
- 📋 드래그 앤 드롭으로 대기열 순서 변경
- 📝 실시간 가사 확인
- 🔊 볼륨 조절
- ⏩ 재생 위치 탐색

## 🏗️ 프로젝트 구조

```
legato/
├── src/
│   ├── app/                    # Next.js 앱 라우터
│   │   ├── globals.css         # 전역 스타일
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   ├── page.tsx            # 홈페이지
│   │   └── session/
│   │       └── [id]/
│   │           └── page.tsx    # 세션 대시보드
│   │
│   ├── bot/                    # Discord 봇
│   │   ├── index.ts            # 봇 진입점
│   │   ├── deploy-commands.ts  # 명령어 배포 스크립트
│   │   ├── commands/           # 슬래시 명령어
│   │   │   ├── play.ts
│   │   │   ├── skip.ts
│   │   │   └── stop.ts
│   │   └── services/           # 봇 서비스
│   │       ├── MusicPlayer.ts  # 음악 재생 로직
│   │       ├── SessionManager.ts # 세션 관리
│   │       ├── WebSocketServer.ts # WS 서버
│   │       ├── SearchService.ts # 검색 서비스
│   │       └── LyricsService.ts # 가사 서비스
│   │
│   ├── components/             # React 컴포넌트
│   │   ├── NowPlaying.tsx      # 현재 재생 중 표시
│   │   ├── PlayerControls.tsx  # 플레이어 컨트롤
│   │   ├── Queue.tsx           # 재생 대기열
│   │   ├── Search.tsx          # 검색 UI
│   │   ├── Lyrics.tsx          # 가사 표시
│   │   └── Sidebar.tsx         # 사이드바 네비게이션
│   │
│   ├── hooks/                  # React 훅
│   │   └── useWebSocket.ts     # WebSocket 연결 훅
│   │
│   └── shared/                 # 공유 코드
│       ├── types.ts            # TypeScript 타입 정의
│       └── utils.ts            # 유틸리티 함수
│
├── public/                     # 정적 파일
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## 🛠️ 기술 스택

### 봇

- **Discord.js v14** - Discord API 라이브러리
- **@discordjs/voice** - 음성 연결
- **play-dl** - YouTube 스트리밍
- **genius-lyrics** - 가사 API

### 웹 대시보드

- **Next.js 14** - React 프레임워크
- **TypeScript** - 타입 안전성
- **TailwindCSS** - 스타일링
- **WebSocket** - 실시간 통신

## 🔧 스크립트

```bash
# 개발 모드 (봇 + 웹)
npm run dev

# 봇만 개발 모드
npm run dev:bot

# 웹만 개발 모드
npm run dev:web

# 빌드
npm run build

# 프로덕션 실행
npm run start

# 명령어 배포
npm run deploy-commands
```

## 🌐 호스팅 가이드

### 프로덕션 환경 설정

1. **환경 변수 설정**

`.env.production` 파일을 생성하거나 호스팅 플랫폼에서 환경 변수를 설정하세요:

```env
# Production URLs
NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Discord
DISCORD_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id

# Other
WS_PORT=3001
NODE_ENV=production
```

2. **리버스 프록시 설정 (Nginx 예시)**

```nginx
server {
    listen 443 ssl http2;
    server_name legato.lunive.app;

    # SSL 인증서
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Next.js 앱
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 엔드포인트
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

3. **빌드 및 실행**

```bash
# 빌드
pnpm run build

# 프로덕션 실행 (PM2 사용 권장)
pm2 start ecosystem.config.js
```

### 시스템 의존성

호스팅 서버에 다음이 설치되어 있어야 합니다:

- **FFmpeg** - 오디오 처리용
- **yt-dlp** - YouTube 스트리밍용

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# macOS
brew install ffmpeg yt-dlp
```

## 📝 환경 설정 가이드

### Discord 봇 생성

1. [Discord Developer Portal](https://discord.com/developers/applications)에서 새 애플리케이션 생성
2. Bot 탭에서 봇 추가
3. 다음 권한 활성화:
   - `MESSAGE CONTENT INTENT`
   - `PRESENCE INTENT`
   - `SERVER MEMBERS INTENT`
4. OAuth2 > URL Generator에서 초대 링크 생성:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Connect`, `Speak`, `Send Messages`, `Embed Links`

### Genius API 키 발급

1. [Genius API](https://genius.com/api-clients)에서 앱 생성
2. Client Access Token 복사

## 🎨 디자인 철학

Legato는 Apple Music의 미니멀하고 세련된 디자인 철학을 따릅니다:

- **다크 테마** - 눈의 피로를 줄이는 어두운 배경
- **Glassmorphism** - 반투명 요소와 블러 효과
- **부드러운 애니메이션** - 자연스러운 인터랙션
- **직관적인 UX** - 복잡한 기능의 단순한 표현

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포하세요.

## 🤝 기여하기

버그 리포트, 기능 제안, PR을 환영합니다!

1. 이 저장소를 Fork하세요
2. 새 브랜치를 만드세요 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋하세요 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시하세요 (`git push origin feature/amazing-feature`)
5. Pull Request를 열어주세요

---

<p align="center">
  Made with ❤️ and 🎵
</p>
