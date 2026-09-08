#!/usr/bin/env bash
#
# LiveKit の鍵を Secret Manager に登録し、App Hosting から読めるようにする。
#
# 鍵の値はこのスクリプトの中だけで扱い、画面にも履歴にも残さない
# （read -s で入力し、パイプで gcloud に渡す）。
#
# 前提: LiveKit Cloud でプロジェクトを作り、API Key / Secret / URL を控えてあること。
#       https://cloud.livekit.io/ の Settings > Keys
#
# 使い方: bash scripts/setup-livekit.sh
#
set -euo pipefail

PROJECT="coach-sougou-sentaku"
# App Hosting のバックエンドが使うサービスアカウント（既存の secret と同じもの）
SA_COMPUTE="firebase-app-hosting-compute@${PROJECT}.iam.gserviceaccount.com"
SA_BUILD="service-160362237739@gcp-sa-firebaseapphosting.iam.gserviceaccount.com"

say() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# 値を1つ受け取り、secret を作って（あれば追記して）権限を付ける
put_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "$name" --project="$PROJECT" >/dev/null 2>&1; then
    printf '  %s は既にあります。新しいバージョンを足します\n' "$name"
  else
    printf '  %s を作ります\n' "$name"
    gcloud secrets create "$name" --project="$PROJECT" \
      --replication-policy=automatic >/dev/null
  fi
  printf '%s' "$value" | gcloud secrets versions add "$name" \
    --project="$PROJECT" --data-file=- >/dev/null
  for sa in "$SA_COMPUTE" "$SA_BUILD"; do
    gcloud secrets add-iam-policy-binding "$name" \
      --project="$PROJECT" \
      --member="serviceAccount:${sa}" \
      --role=roles/secretmanager.secretAccessor >/dev/null
  done
  printf '  %s OK\n' "$name"
}

say "1. LiveKit の鍵を入力してください（入力は画面に出ません）"
read -rsp "  LIVEKIT_API_KEY: " LK_KEY; echo
read -rsp "  LIVEKIT_API_SECRET: " LK_SECRET; echo
read -rp "  NEXT_PUBLIC_LIVEKIT_URL (wss://xxxxx.livekit.cloud): " LK_URL

if [ -z "$LK_KEY" ] || [ -z "$LK_SECRET" ] || [ -z "$LK_URL" ]; then
  echo "3つとも必要です。中止します" >&2
  exit 1
fi
case "$LK_URL" in
  wss://*) ;;
  *) echo "URL は wss:// で始まる必要があります。中止します" >&2; exit 1 ;;
esac

say "2. Secret Manager に登録します"
put_secret LIVEKIT_API_KEY "$LK_KEY"
put_secret LIVEKIT_API_SECRET "$LK_SECRET"

say "3. apphosting.yaml のコメントを外します"
python3 - "$LK_URL" <<'PY'
import sys
url = sys.argv[1]
p = "apphosting.yaml"
s = open(p).read()
if "\n  - variable: LIVEKIT_API_KEY\n" in s:
    print("  すでに有効になっています")
else:
    s = s.replace(
        "  # - variable: LIVEKIT_API_KEY\n  #   secret: LIVEKIT_API_KEY\n"
        "  # - variable: LIVEKIT_API_SECRET\n  #   secret: LIVEKIT_API_SECRET\n",
        "  - variable: LIVEKIT_API_KEY\n    secret: LIVEKIT_API_KEY\n"
        "  - variable: LIVEKIT_API_SECRET\n    secret: LIVEKIT_API_SECRET\n",
    )
    s = s.replace(
        "  # - variable: NEXT_PUBLIC_LIVEKIT_URL\n"
        "  #   value: wss://xxxxx.livekit.cloud\n",
        f"  - variable: NEXT_PUBLIC_LIVEKIT_URL\n    value: {url}\n",
    )
    open(p, "w").write(s)
    print("  有効にしました")
PY

say "4. ローカル用に .env.local へ追記しますか"
echo "  （ローカルの npm run dev で通話を試すときに要ります。不要なら n）"
read -rp "  追記する? [y/N]: " WRITE_ENV
if [ "${WRITE_ENV:-N}" != "y" ] && [ "${WRITE_ENV:-N}" != "Y" ]; then
  echo "  飛ばしました"
elif grep -q "^LIVEKIT_API_KEY=" .env.local 2>/dev/null; then
  echo "  .env.local には既にあります。手で確認してください"
else
  {
    echo ""
    echo "# LiveKit (setup-livekit.sh が追記)"
    echo "LIVEKIT_API_KEY=${LK_KEY}"
    echo "LIVEKIT_API_SECRET=${LK_SECRET}"
    echo "NEXT_PUBLIC_LIVEKIT_URL=${LK_URL}"
  } >> .env.local
  echo "  追記しました"
fi

say "完了。次にやること"
cat <<'NEXT'
  1) LiveKit の管理画面で webhook を登録する
       URL: https://coach-app--coach-sougou-sentaku.asia-east1.hosted.app/api/livekit/webhook
       （録画を使うときだけ必要。今は録画を止めているので後回しでよい）
  2) firebase deploy --only firestore:indexes
       着信のクエリに複合インデックスが要る。忘れると着信が来ない
  3) apphosting.yaml をコミットして push（本番に反映される）
  4) npm run check-env  で3つとも OK になることを確認
NEXT
