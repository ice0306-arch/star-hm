#!/bin/zsh
set -u

cd "$(dirname "$0")"

export PATH="/Users/junokim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/junokim/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"

URL="http://127.0.0.1:43821"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1
  fi
}
trap cleanup INT TERM EXIT

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm을 찾을 수 없습니다. Node.js/pnpm 설치 후 다시 실행하세요."
  read "?Enter를 누르면 종료합니다."
  exit 1
fi

echo "HM AI 로컬 관리자 DB를 확인합니다."
if ! pnpm admin:db:migrate; then
  echo "DB 초기화에 실패했습니다."
  read "?Enter를 누르면 종료합니다."
  exit 1
fi

if /usr/bin/curl -fsS "$URL/api/health" >/dev/null 2>&1; then
  echo "HM AI Local Admin이 이미 실행 중입니다."
  echo "브라우저에서 $URL 를 엽니다."
  if ! /usr/bin/open "$URL"; then
    echo "브라우저 자동 실행에 실패했습니다. Safari 또는 Chrome 주소창에 아래 주소를 직접 입력하세요."
    echo "$URL"
  fi
  echo "기존 서버를 사용합니다. 이 창은 닫아도 됩니다."
  exit 0
fi

echo "HM AI Local Admin 서버를 시작합니다."
pnpm admin:local &
SERVER_PID=$!

echo "서버 준비를 확인합니다."
for attempt in {1..40}; do
  if /usr/bin/curl -fsS "$URL/api/health" >/dev/null 2>&1; then
    echo "브라우저에서 $URL 를 엽니다."
    if ! /usr/bin/open "$URL"; then
      echo "브라우저 자동 실행에 실패했습니다. Safari 또는 Chrome 주소창에 아래 주소를 직접 입력하세요."
      echo "$URL"
    fi
    echo "HM AI Local Admin 실행 중입니다. 종료하려면 이 터미널 창에서 Ctrl+C를 누르세요."
    wait "$SERVER_PID"
    exit $?
  fi

  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    echo "서버가 시작되지 못했습니다."
    wait "$SERVER_PID"
    read "?Enter를 누르면 종료합니다."
    exit 1
  fi

  sleep 0.5
done

echo "서버 준비 확인 시간이 초과되었습니다."
echo "브라우저 주소창에 아래 주소를 직접 입력해보세요."
echo "$URL"
wait "$SERVER_PID"
