# 배당 투자 플래닝 웹서비스

국내/해외 주식·ETF의 배당 정보 조회, 포트폴리오 관리, 세후 DCA 시나리오 시뮬레이션을 제공하는 싱글페이지 앱입니다.

## 기능

| 페이지 | 설명 |
|--------|------|
| **종목 탐색** (`/explorer`) | 티커 검색 → 배당수익률·배당 일정 조회, 보유종목 추가 |
| **배당 캘린더** (`/calendar`) | 보유 종목의 배당락일·지급일 달력 |
| **보유종목 관리** (`/holdings`) | localStorage CRUD (계좌 종류 포함: ISA / 연금저축 / 일반) |
| **시나리오 시뮬레이터** (`/scenario`) | DCA 적립 + 배당 재투자 세후 수익 시뮬레이션 + 3계좌 비교 |

---

## 로컬 개발

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성합니다.

```env
# Yahoo Finance API는 공개 엔드포인트를 사용합니다 (별도 키 불필요).
# KRX 데이터는 data.krx.co.kr 공개 JSON API를 사용합니다 (별도 키 불필요).

# (선택) 로컬 API 포트 — 기본값은 3000
# VERCEL_DEV_PORT=3000
```

환경 변수가 없어도 기본값으로 동작합니다. Yahoo Finance와 KRX 엔드포인트는 모두 공개 API를 이용하며 별도 API 키가 필요하지 않습니다.

### 3. 개발 서버 실행

Vercel CLI가 필요합니다 (서버리스 `/api/*` 함수 로컬 실행).

```bash
# Vercel CLI 설치 (최초 1회)
npm install -g vercel

# 로컬 풀스택 개발 서버 (Vite + Vercel Functions)
vercel dev
```

> `vercel dev` 없이 프론트엔드만 확인하려면:
> ```bash
> npm run dev
> ```
> `/api/*` 호출은 실패하지만 UI 탐색은 가능합니다.

### 4. 테스트

```bash
npm test              # 전체 테스트 (87개)
npm run typecheck     # TypeScript 타입 검사
npm run build         # 프로덕션 빌드 확인
```

---

## Vercel 배포

### 1. 저장소를 Vercel에 연결

```bash
vercel link
```

또는 [Vercel 대시보드](https://vercel.com/new)에서 GitHub 저장소를 임포트합니다.

### 2. 빌드 설정

`vercel.json`에 이미 설정되어 있습니다:

```json
{
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/api/:path*", "destination": "/api/:path*" }]
}
```

### 3. 배포

```bash
# 프리뷰 배포
vercel

# 프로덕션 배포
vercel --prod
```

---

## 데이터 소스

| 소스 | 용도 | 비고 |
|------|------|------|
| Yahoo Finance (`query2.finance.yahoo.com`) | 미국 주식 시세·배당 정보, USD/KRW 환율 | 공개 API |
| KRX 정보데이터시스템 (`data.krx.co.kr`) | 국내 주식 배당 캘린더 | 비공식 JSON 엔드포인트, 장애 시 빈 배열 반환 |

## 아키텍처 메모

- **데이터 저장**: localStorage만 사용 (`dividend-app:holdings:v1`). 서버 DB 없음.
- **API 캐싱**: Vercel CDN `Cache-Control: s-maxage=86400, stale-while-revalidate=43200` (KV/Redis 불필요).
- **세금 계산**: ISA · 연금저축 · 일반계좌 × KR · US 6-cell 매트릭스. `src/domain/tax.ts` 참조.
