# 오늘의 뉴스 브리핑 — 개인용 뉴스 리서치 대시보드 (완전 무료 버전)

원래 기획(Claude API 검색·검증·요약 + Upstash Redis)은 사용량이 늘면 비용이
발생할 수 있어서, **API 키가 하나도 필요 없는 완전 무료 구조**로 다시 만들었습니다.

## 왜 비용이 0원인가

| 기능 | 원래 계획 | 이번 버전 | 비용 |
|---|---|---|---|
| 뉴스 검색 | Claude API 웹 검색 (유료) | **Google News RSS** (공개 피드) | 0원 |
| 사실 검증 | 별도 LLM 검증 에이전트 | RSS는 언론사 원문 링크를 그대로 보여주므로 별도 검증 단계 불필요 (할루시네이션 자체가 발생하지 않음) | 0원 |
| 요약 | LLM 요약 에이전트 | 헤드라인 + 출처 + 날짜를 그대로 카드로 표시 (요약이 필요하면 아래 "선택 확장" 참고) | 0원 |
| 환율 | 별도 유료 API | **Frankfurter API** (ECB 데이터, 키 불필요) | 0원 |
| 저장소 | Upstash Redis | 없음 — 요청마다 실시간 조회 + 5분 캐시 | 0원 |
| 배포 | Vercel | Vercel **Hobby(무료)** 플랜 | 0원 |
| 자동 새로고침 | 별도 서버 | Vercel Cron 1일 1회(Hobby 무료 한도 내) | 0원 |

정리하면: **API 키를 하나도 발급받지 않아도** 바로 동작합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000 접속하면 바로 확인 가능합니다.

## 주제 추가/삭제

`config/topics.json` 파일만 수정하면 됩니다. 예:

```json
{
  "id": "my-topic",
  "label": "내가 원하는 주제",
  "query": "검색어",
  "hl": "ko",
  "gl": "KR",
  "ceid": "KR:ko",
  "count": 6
}
```

- `hl`/`gl`/`ceid`: 해외 뉴스는 `en-US`/`US`/`US:en`, 국내 뉴스는 `ko`/`KR`/`KR:ko`
- `query`: 검색어. `OR`로 여러 단어 묶기 가능 (예: `"federal reserve OR inflation"`)

## GitHub + Vercel 배포 (직접 진행하실 3단계)

계정 로그인이 필요한 단계라 제가 대신 진행할 수 없어요. 아래 순서대로 하시면 5분 내로 끝납니다.

### 1) GitHub에 올리기
이 폴더(`news-agent`)를 다운로드/복사한 뒤 터미널에서:
```bash
cd news-agent
git init
git add .
git commit -m "뉴스 리서치 대시보드 - 무료 버전"
```
GitHub에서 새 저장소를 만든 다음(Private으로 만들어도 무방):
```bash
git remote add origin https://github.com/본인아이디/news-agent.git
git branch -M main
git push -u origin main
```

### 2) Vercel에 연결
1. https://vercel.com 접속 → GitHub 계정으로 로그인 (무료 가입)
2. "Add New" → "Project" → 방금 만든 `news-agent` 저장소 선택
3. 프레임워크는 Next.js로 자동 인식됨, 설정 변경 없이 그대로 "Deploy" 클릭
4. **환경 변수는 등록할 필요 없습니다** (API 키가 없으므로)

### 3) 확인
몇 분 뒤 `https://news-agent-본인이름.vercel.app` 같은 주소가 생성됩니다.
- PC: 즐겨찾기에 추가
- 휴대폰: 브라우저로 열고 "홈 화면에 추가" 하면 앱처럼 사용 가능

Vercel Hobby 플랜은 개인 트래픽 수준에서는 **무제한 무료**이며, 신용카드 등록도
필요 없습니다.

## 선택 확장 (비용이 조금이라도 들 수 있는 것들 — 원하실 때만)

- **AI 요약을 진짜로 원하는 경우**: Google Gemini API는 무료 티어(분당/일일 요청 한도
  내에서 완전 무료)가 있습니다. 개인 사용량으로는 한도를 넘기기 어려워서 비용 없이
  요약 기능을 추가할 수 있어요. 원하시면 이 부분만 추가로 구현해드릴게요.
- **카카오톡 알림**: 카카오 알림톡은 발송 건당 비용이 있어 무료로는 어렵습니다.
  대신 완전 무료인 **웹 푸시(Web Push API)** 로 대체 가능합니다.
- **매번 실시간 조회가 느리게 느껴지면**: Vercel의 무료 KV(Upstash 무료 티어,
  일일 요청 한도 내 무료)로 캐싱을 추가할 수 있습니다.

## 폴더 구조

```
news-agent/
├── app/
│   ├── page.tsx           # 대시보드 화면
│   └── api/news/route.ts  # RSS + 환율 집계 API
├── config/topics.json     # 주제 목록 (여기만 수정하면 됨)
├── lib/
│   ├── rss.ts              # Google News RSS 파서
│   └── fx.ts                # 무료 환율 API
├── vercel.json              # 매일 07:50(KST) 자동 갱신 cron
└── package.json
```
