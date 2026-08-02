# star-hm

Official roster site for THE HM, built with Next.js App Router, TypeScript, and Tailwind CSS.

## Public HM AI

공개 HM AI는 Vercel에서 실행되는 사용자용 리플레이 분석 화면입니다.

- `.rep` 직접 업로드
- `screp` 기반 명령/빌드/단축키 분석
- 업로드 REP 내부 맵 데이터 기반 2D 맵 이미지 생성
- 명령 좌표 기반 2D 전장 보기
- `ReplayFact -> DetectedIssue -> CoachFinding` 근거 기반 코칭
- PDF/JSON 다운로드
- 공개 관리자 기능 없음

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
```

## Local HM AI Admin

로컬 관리자는 공개 사이트가 아니며 사용자 컴퓨터의 `127.0.0.1`에서만 실행됩니다. 원본 REP, SQLite DB, 관리자 검수 메모는 Vercel에 배포하지 않습니다.

```bash
pnpm admin:db:migrate
pnpm admin:local
```

Windows:

```text
start-hm-ai-admin.cmd
```

기본 주소:

```text
http://127.0.0.1:43821
```

관리자 DB 명령:

```bash
pnpm admin:db:migrate
pnpm admin:db:check
pnpm admin:backup
```

SQLite CLI가 필요합니다. DB 기본 위치는 `data/hm-ai-admin/hm-ai-admin.sqlite`입니다.

## REP 가져오기와 승인 흐름

현재 체크포인트에서는 로컬 관리자 DB, 마이그레이션, 보안 경계, 데이터팩 검증 구조를 제공합니다. 완전한 자동 수집 UI는 아직 구현 전이며, 원본 REP는 아래 폴더에 수동으로 넣고 이후 파싱/검수 파이프라인에 연결합니다.

```text
data/hm-ai-admin/replays/incoming
data/hm-ai-admin/replays/originals
data/hm-ai-admin/replays/processed
data/hm-ai-admin/replays/rejected
data/hm-ai-admin/replays/quarantine
data/hm-ai-admin/replays/packs
```

한국 프로게이머 등록은 `pro_players`, `pro_player_aliases` 테이블에 후보로 저장한 뒤 관리자가 `verified`로 승인하는 방식입니다. 승인되지 않은 선수, 해외 선수, 일반 사용자 REP는 프로 기준 학습에 포함하지 않습니다.

## Public Data Pack

공개 사이트에는 원본 REP나 SQLite를 올리지 않고 승인된 파생 데이터만 반영합니다.

```bash
pnpm public-pack:build
pnpm public-pack:verify
```

출력 위치:

```text
public/hm-ai-data/
  manifest.json
  knowledge.json
  rules.json
  coverage.json
  pro-reference-stats.json
```

## Smoke Test

샘플 REP가 있으면 운영 API를 점검합니다.

```bash
HM_AI_SAMPLE_REP=/path/to/sample.rep pnpm test
```

검사 항목:

- 맵 API Content-Type
- JPEG/PNG magic bytes
- 맵 해시 헤더
- 분석 API `coaching.facts`
- Finding evidence ID

## Environment Flags

- `NEXT_PUBLIC_ENABLE_ENTRY_OVERLAY=false` disables the intro overlay.
- `NEXT_PUBLIC_FORCE_ENTRY_OVERLAY=true` always shows the intro overlay, even after localStorage has completed it.
- `HM_AI_ADMIN_PORT=43821` changes the local admin port.
- `HM_AI_ADMIN_DATA_DIR=data/hm-ai-admin` changes local admin data storage.
- `HM_AI_ADMIN_DB=data/hm-ai-admin/hm-ai-admin.sqlite` changes the SQLite path.

Production defaults are overlay enabled and force disabled.

## Current Analysis Limits

지원됨:

- 실제 REP 내부 맵 렌더링
- 시작 위치, 건설 좌표, 이동/공격 명령 좌표
- 명령 시간 재생, 레이어 토글, 히트맵
- 생산 공백, 명령 효율, 단축키 편중, 좌표 집중
- ReplayFact evidence 기반 코칭

아직 지원하지 않음:

- 실제 프레임별 유닛 생존 위치
- 체력/실드/자원/서플라이/일꾼 수 재구성
- 플레이어별 Fog of War와 실제 시야
- OpenBW 기반 전투 시뮬레이션
- 완전 자동 공개 REP 수집기
- 승인된 한국 프로 REP 통계 데이터팩
