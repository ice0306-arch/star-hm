#!/bin/zsh
set -e

cd "$(dirname "$0")"

export PATH="/Users/junokim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/junokim/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm을 찾을 수 없습니다. Node.js/pnpm 설치 후 다시 실행하세요."
  read "?Enter를 누르면 종료합니다."
  exit 1
fi

echo "HM AI 로컬 관리자 DB를 확인합니다."
pnpm admin:db:migrate

echo "브라우저에서 http://127.0.0.1:43821 를 엽니다."
(sleep 1 && open "http://127.0.0.1:43821") >/dev/null 2>&1 &

echo "HM AI Local Admin 실행 중..."
pnpm admin:local
