# 오늘의 뉴스 브리핑 (news-agent)

매일 아침 원하는 주제의 뉴스를 검색 → 검증 → 요약해서 보여주는 개인용 대시보드입니다.
PC와 휴대폰 브라우저 모두에서 접속할 수 있고, Vercel에 배포해 어디서든 열어볼 수 있습니다.

## 구성

- **검색 에이전트**: Claude API의 웹 검색 도구로 주제별 최신 뉴스를 수집 (`lib/newsAgent.ts` → `searchTopic`)
- **검증 에이전트**: 각 기사 링크가 실제로 열리는지 서버에서 직접 확인 + Claude가 날짜·내용 정합성 재검토 (`verifyItems`)
- **요약 에이전트**: 검증된 항목만 근거로 3~5줄 요약 생성 (`summarizeTopic`)
- **음성 안내**: 브라우저 내장 음성합성(Web Speech API)으로 요약 읽어주기 (`components/SpeakButton.tsx`)
- **주제 관리**: `config/topics.json` 파일만 수정하면 주제 추가/삭제 가능
- **매일 아침 자동 생성 (선택)**: Vercel Cron이 매일 07:50(KST)에 `/api/cron/generate`를 호출해 4개 주제를 미리 만들어 Redis에 저장 — 대시보드를 열면 기다리지 않고 바로 보임 (`vercel.json`, `app/api/cron/generate/route.ts`)

## 로컬에서 실행하기

1. 의존성 설치
   ```bash
   npm install
   ```
2. API 키 설정
   ```bash
   cp .env.local.example .env.local
   # .env.local을 열어 ANTHROPIC_API_KEY 값을 실제 키로 교체
   ```
   키는 [Anthropic 콘솔](https://console.anthropic.com/settings/keys)에서 발급받습니다.
3. 개발 서버 실행
   ```bash
   npm run dev
   ```
   브라우저에서 http://localhost:3000 접속

## 주제 추가/삭제하기

`config/topics.json` 파일의 배열에 항목을 추가하거나 삭제하면 됩니다. 각 항목 형식:

```json
{
  "id": "고유-영문-id",
  "label": "화면에 보일 이름",
  "emoji": "🗞️",
  "searchQuery": "검색 에이전트에게 줄 구체적인 검색 가이드 문장",
  "enabled": true
}
```

`enabled`를 `false`로 바꾸면 화면에서 숨길 수 있습니다 (삭제하지 않고 보관).

## GitHub + Vercel 배포하기

1. GitHub에 새 저장소를 만듭니다.
2. 이 프로젝트 폴더에서 커밋 후 푸시합니다.
   ```bash
   git add .
   git commit -m "첫 커밋"
   git remote add origin [GitHub 저장소 주소]
   git push -u origin main
   ```
3. [vercel.com](https://vercel.com) 접속 → GitHub 계정으로 로그인
4. "Add New Project" → 방금 만든 저장소 선택
5. **Environment Variables**에 `ANTHROPIC_API_KEY`를 등록 (`.env.local`과 동일한 값)
6. Deploy 클릭 → 몇 분 후 `https://프로젝트이름.vercel.app` 링크 생성
7. 이 링크를 PC에서는 즐겨찾기에, 휴대폰에서는 브라우저로 열어 "홈 화면에 추가"하면 앱처럼 사용 가능합니다.

> 참고: 검색 → 검증 → 요약 3단계를 모두 거치면 주제당 몇 초~수십 초가 걸릴 수 있습니다.
> Vercel 무료(Hobby) 플랜은 서버리스 함수 실행 시간에 제한이 있으니, 만약 타임아웃 오류가 나면
> `app/api/news/[topicId]/route.ts`의 `maxDuration` 값과 Vercel 플랜의 함수 실행 제한을 함께 확인하세요.

## 매일 아침 7시 50분 자동 생성 설정하기 (Vercel Cron)

접속할 때마다 새로 검색·검증·요약하면 몇 초~수십 초씩 기다려야 합니다. 아래처럼 설정하면
Vercel이 매일 새벽에 미리 만들어두고, 대시보드는 그 결과를 즉시 보여줍니다.

1. **결과를 저장할 공간 만들기 (Upstash Redis, 무료)**
   - Vercel 프로젝트 화면 → **Storage** 탭 → **Marketplace Database Providers**에서 **Upstash**(Redis) 선택 후 프로젝트에 연결
     (또는 [upstash.com](https://upstash.com)에서 직접 무료 Redis 데이터베이스를 만들어도 됩니다)
   - 연결하면 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 값이 자동으로 프로젝트 환경 변수에 추가됩니다.
     (직접 만든 경우엔 Upstash 콘솔에서 두 값을 복사해 Vercel **Environment Variables**에 직접 등록)
2. **크론 보안 비밀값 설정 (권장)**
   - Vercel **Environment Variables**에 `CRON_SECRET`을 추가하고 아무 임의의 긴 문자열을 값으로 넣습니다.
   - Vercel이 크론을 호출할 때 이 값을 자동으로 함께 보내주기 때문에, 이 값을 설정해두면
     외부에서 `/api/cron/generate`를 함부로 호출하지 못하게 막아줍니다.
3. **재배포**
   - 환경 변수를 추가한 뒤에는 Vercel에서 한 번 다시 배포해야 반영됩니다.
   - `vercel.json`에 크론 스케줄이 이미 들어있어서(`50 22 * * *` = UTC 22:50 = 한국시간 07:50) 별도 설정 없이 자동 인식됩니다.
4. **확인**
   - Vercel 프로젝트의 **Cron Jobs** 탭에서 실행 이력과 성공/실패 여부를 볼 수 있습니다.
   - 로그에 `UPSTASH_REDIS_REST_URL / TOKEN이 설정되지 않아...` 경고가 보이면 1번 단계를 다시 확인하세요.

> Vercel **Hobby(무료)** 플랜은 크론 실행 시각이 정확히 그 분(分)에 맞지 않고 최대 몇 분~수십 분 정도
> 늦게 실행될 수 있습니다(과금 플랜일수록 더 정확). 정시 알림이 꼭 필요하면 Pro 플랜을 고려하세요.
> Redis를 연결하지 않아도 앱 자체는 문제없이 동작하며, 그 경우 방문 시마다 즉석 생성됩니다.

## 알림까지 받고 싶다면 (다음 단계)

지금은 "미리 만들어두고, 열면 바로 보이는" 방식까지입니다. 실제 알림(폰 알림/카톡 등)을 받으려면 아래를
추가로 붙일 수 있습니다.

- 웹 푸시 알림(Web Push API) — 브라우저 알림 권한을 받아서 발송
- 카카오톡 알림톡 연동 — 비즈니스 계정과 별도 API 설정 필요

## 향후 조정 포인트

- `config/topics.json`만 수정하면 주제 추가/삭제 가능
- 검증 기준(출처 신뢰도, 날짜 범위 등)은 `lib/newsAgent.ts`의 프롬프트만 수정하면 조정 가능
- 음성 목소리·속도는 `components/SpeakButton.tsx`의 Web Speech API 옵션으로 조정 가능
- 사용 모델은 `.env.local`의 `ANTHROPIC_MODEL`로 교체 가능
