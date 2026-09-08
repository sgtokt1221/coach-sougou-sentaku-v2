#!/usr/bin/env bash
#
# .env.local に書かれた LiveKit の鍵を Secret Manager へ移す。
#
# 値はこのスクリプトの中だけで扱い、画面には出さない。
# ターミナルに手で打ち込むのが面倒なとき用（setup-livekit.sh の代わり）。
#
# 使い方:
#   1. .env.local の末尾に3行を書く
#        LIVEKIT_API_KEY=...
#        LIVEKIT_API_SECRET=...
#        NEXT_PUBLIC_LIVEKIT_URL=wss://xxxxx.livekit.cloud
#   2. bash scripts/livekit-from-env.sh
#
set -euo pipefail

PROJECT="coach-sougou-sentaku"
SA_COMPUTE="firebase-app-hosting-compute@${PROJECT}.iam.gserviceaccount.com"
SA_BUILD="service-160362237739@gcp-sa-firebaseapphosting.iam.gserviceaccount.com"

say() { printf '\n\033[1m%s\033[0m\n' "$1"; }

if [ ! -f .env.local ]; then
  echo ".env.local がありません" >&2
  exit 1
fi

# .env.local から必要な3つだけを取り出す。他の値には触れない
read_env() {
  local key="$1"
  # 最後に書かれたものを採用する（重複して書いても直近が効く）
  grep -E "^${key}=" .env.local | tail -1 | cut -d= -f2- | tr -d '"'"'"'\r'
}

LK_KEY="$(read_env LIVEKIT_API_KEY || true)"
LK_SECRET="$(read_env LIVEKIT_API_SECRET || true)"
LK_URL="$(read_env NEXT_PUBLIC_LIVEKIT_URL || true)"

missing=""
[ -z "$LK_KEY" ] && missing="${missing} LIVEKIT_API_KEY"
[ -z "$LK_SECRET" ] && missing="${missing} LIVEKIT_API_SECRET"
[ -z "$LK_URL" ] && missing="${missing} NEXT_PUBLIC_LIVEKIT_URL"
if [ -n "$missing" ]; then
  echo ".env.local に足りない行があります:${missing}" >&2
  exit 1
fi

case "$LK_URL" in
  wss://*) ;;
  *) echo "NEXT_PUBLIC_LIVEKIT_URL は wss:// で始まる必要があります" >&2; exit 1 ;;
esac

# 値そのものは出さず、長さだけ見せて取り違えに気づけるようにする
say "読み取りました（値は表示しません）"
printf '  LIVEKIT_API_KEY        %s文字\n' "${#LK_KEY}"
printf '  LIVEKIT_API_SECRET     %s文字\n' "${#LK_SECRET}"
printf '  NEXT_PUBLIC_LIVEKIT_URL %s\n' "$LK_URL"

put_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "$name" --project="$PROJECT" >/dev/null 2>&1; then
    printf '  %s に新しいバージョンを足します\n' "$name"
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

say "Secret Manager に登録します"
put_secret LIVEKIT_API_KEY "$LK_KEY"
put_secret LIVEKIT_API_SECRET "$LK_SECRET"

say "apphosting.yaml を有効にします"
python3 - "$LK_URL" <<'PY'
import sys
url = sys.argv[1]
p = "apphosting.yaml"
s = open(p).read()
if "\n  - variable: LIVEKIT_API_KEY\n" in s:
    print("  すでに有効です")
else:
    s2 = s.replace(
        "  # - variable: LIVEKIT_API_KEY\n  #   secret: LIVEKIT_API_KEY\n"
        "  # - variable: LIVEKIT_API_SECRET\n  #   secret: LIVEKIT_API_SECRET\n",
        "  - variable: LIVEKIT_API_KEY\n    secret: LIVEKIT_API_KEY\n"
        "  - variable: LIVEKIT_API_SECRET\n    secret: LIVEKIT_API_SECRET\n",
    )
    s3 = s2.replace(
        "  # - variable: NEXT_PUBLIC_LIVEKIT_URL\n"
        "  #   value: wss://xxxxx.livekit.cloud\n",
        f"  - variable: NEXT_PUBLIC_LIVEKIT_URL\n    value: {url}\n",
    )
    if s3 == s:
        print("  置換できませんでした。apphosting.yaml を手で確認してください")
        raise SystemExit(1)
    open(p, "w").write(s3)
    print("  有効にしました")
PY

say "完了"
echo "  このあとは Claude 側で、インデックスの反映と push、通話の確認をします"
