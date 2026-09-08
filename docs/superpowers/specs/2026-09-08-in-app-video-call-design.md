# アプリ内ビデオ通話 設計書

作成: 2026-09-08
状態: **P1・P2 実装済み**（鍵の投入待ち）。P3 未着手

## 0. P1 で入ったもの

| 追加                         | ファイル                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| 型と定数                     | `src/lib/types/call.ts`                                                  |
| 認可判定（純関数）           | `src/lib/livekit/authz.ts`                                               |
| 設定 / トークン発行          | `src/lib/livekit/{config,client-config,token}.ts`                        |
| 通話の作成・取得・終了・拒否 | `src/app/api/calls/**`                                                   |
| 入室トークン                 | `src/app/api/livekit/token/route.ts`                                     |
| 通話ページ                   | `src/app/call/[callId]/{layout,page}.tsx`                                |
| 通話UI・着信・開始ボタン     | `src/components/call/*.tsx`                                              |
| 着信の購読                   | `src/lib/hooks/useIncomingCall.ts`                                       |
| ルール・インデックス         | `firestore.rules` / `firestore.indexes.json`                             |
| 検証                         | `scripts/verify-call-authz.ts`（`validate:data` に連結。ビルドが止まる） |

### P2 で入ったもの（録画）

| 追加                         | ファイル                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| Egress の開始・停止          | `src/lib/livekit/egress.ts`                                              |
| 録画の操作と再生URL発行      | `src/app/api/calls/[id]/recording/route.ts`                              |
| 同意の受付と録画開始         | `src/app/api/calls/[id]/recording/consent/route.ts`                      |
| webhook                      | `src/app/api/livekit/webhook/route.ts`                                   |
| 同意画面・録画表示・終了画面 | `src/components/call/{RecordingConsentModal,RecordingBar,CallEnded}.tsx` |
| 通話の実時間購読             | `src/lib/hooks/useCallRealtime.ts`                                       |

エミュレータで確認済み: 録画要求で `awaiting_consent` になる、発信者自身の同意は
400 で弾く、参加者の同意がそろうと Egress 開始を試みる（鍵がダミーなので 502 と
`failed` になるところまで）、1人でも断れば `declined`、確認終了後の再送は 409、
参加者以外は 403、生徒は録画を操作できず 403、署名の無い/不正な webhook は 400、
正しい署名の `egress_ended` でパスと長さ（ナノ秒→秒）が書き戻る、`room_finished`
で通話が `ended` になる。**実際の映像の録画だけ未確認。**

**動かすには鍵が要る。** LiveKit Cloud のアカウント作成は人がやる（§12）。鍵が入るまでは
通話ボタンが出ず、トークン発行は 503 を返すだけで既存機能には影響しない。

エミュレータで確認済みなのは、通話の作成、別組織の拒否（単独・混在とも403）、トークンの
発行内容（ルーム名と identity）、`ringing → active` の遷移、着信モーダルの実時間表示、
生徒からの拒否、発信者による終了、終了後のトークン拒否。**実際の映像接続だけ未確認。**

## 1. 背景と目的

講師と生徒がオンラインで話す手段は現在 Google Meet のリンクしかない。問題が3つある。

1. **アプリの外に出る。** Meet は iframe 埋め込みを拒否するため、リンクは別タブで開く。通話中に生徒の答案や弱点を並べて見られない。
2. **リンクが安定しない。** 通常のセッション作成画面（`src/app/admin/sessions/new/page.tsx:393`）は Meet リンクの手貼り。自動発行は `POST /api/admin/sessions/[id]/calendar-event` を明示的に叩いたときだけで、しかも担当講師本人が Google 連携を済ませていないと失敗する（`src/app/api/admin/sessions/[id]/calendar-event/route.ts:78`）。
3. **記録が残らない。** 通話の内容がアプリのデータにならないため、既存の授業録音・文字起こし・指導報告書の流れ（`merge-transcriptions` → `extract-reflection` → `summary`）に繋がらない。

本機能はこれをアプリ内で完結させる。チャットから通話を始め、画面内に映像を埋め込み、必要な回だけ録画して指導記録に合流させる。

## 2. 決定事項

| 論点       | 決定                                      | 理由                                                                                                                             |
| ---------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 基盤       | LiveKit Cloud                             | 中継・再接続・画面共有・録画が込み。React の既製コンポーネントで画面内に埋め込める。オープンソースなので将来自前運用に逃げられる |
| 参加人数   | 最大10人                                  | 1対1の面談と少人数のグループ添削会の両方を想定                                                                                   |
| 通話の器   | チャットとは独立した `calls` コレクション | チャットは生徒1人に紐づく1対1しかなく、複数人の器が存在しない                                                                    |
| 呼び出し   | 各参加者の1対1チャットにカードを配る      | 「チャットから始まる」体験を保ちつつ、器は分ける                                                                                 |
| 録画       | 講師が録画ボタンを押したときだけ          | 録画が費用の大半を占めるため（§7）                                                                                               |
| 発信権限   | 管理者・講師のみ。生徒は参加のみ          | 生徒同士の私的通話の場にしない                                                                                                   |
| プラン制限 | かけない                                  | セッション機能と同じ扱い。`requireFeature` は使わない                                                                            |

### 却下した案

- **Meet リンクをチャットカードで配る。** 実装は最小だが別タブが開くため「埋め込む」という目的を満たさない。Google 連携の有無に依存する弱さも残る。
- **WebRTC を自前実装。** 中継サーバが必要になり、常時起動のサーバを置かない方針（`apphosting.yaml` の `minInstances: 0`）と衝突する。中継を外部に頼るなら費用は SDK と大差なく、不具合対応だけがこちらに残る。
- **既存の `group_review` セッションに相乗り。** 参加者の権限チェックが存在しないため（§3-2）、穴をそのまま継承する。

## 3. 設計を縛る既存実装の制約

1. **チャットに複数人の器がない。** スレッドは `users/{生徒uid}/feedback`（対管理者）と `users/{生徒uid}/teacherFeedback`（対講師）の2つで、どちらも生徒1人に紐づく（`src/lib/hooks/useFeedbackThread.ts:55-64`）。グループチャットは存在しない。
2. **グループセッションに参加者の権限チェックがない。** `Session.participantIds`（`src/lib/types/session.ts:80`）は `assertSessionAccess`（`src/lib/api/session-auth.ts`）も `firestore.rules:144-155` も見ていない。生徒側の録音ルートも `session.studentId !== auth.uid` の直接比較で、参加者を想定していない。
3. **セッションに組織IDがない。** テナントは `users/{uid}.organizationId` が正本（`src/lib/api/organization-scope.ts:22-27`）で、セッションは `createdByAdminId` と `users/{studentId}.managedBy` から間接的に導いている。通話は参加者リストを自前で持つため、`organizationId` を通話ドキュメントに直接持たせる。
4. **チャットカードの href は `/student/` 始まりを強制される。** クライアント（`src/components/chat/ChatThread.tsx:143-145`）とサーバ（`src/lib/chat/conversation.ts:27`）の二重チェック。**片方だけ直すと保存が黙って弾かれる沈黙失敗**になる。
5. **サーバが書き、両クライアントが購読する。** 授業録音の `recordingState` が同じ形（`src/components/student/StudentRecordingController.tsx:39-51`）。チャットの書き込みも全て API ルート経由。通話もこれに合わせる。
6. **`sessions/**` は Storage のルールに一致せず既定拒否。** Admin SDK が書き、長期署名URL（`expires: "2030-01-01"`）で読ませている（`src/app/api/admin/sessions/[id]/recording/route.ts:69-82`）。録画もこれに合わせる。
7. **`export const dynamic` はリポジトリ内にゼロ。** `runtime` は2ルートのみ。`maxDuration` は AI 生成・メディア処理のルートだけ。新設ルートもこれに従う。

## 4. データ設計

### 4.1 `calls/{callId}`（新規・トップレベル）

サーバのみが書き、参加者だけが読む。

| フィールド                            | 型                                         | 説明                                                                 |
| ------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| `hostUid`                             | string                                     | 発信した管理者・講師                                                 |
| `organizationId`                      | string                                     | テナント。参加者追加時の照合に使う正本                               |
| `status`                              | `'ringing' \| 'active' \| 'ended'`         |                                                                      |
| `participantUids`                     | string[]                                   | **認可の正本。**最大10                                               |
| `participants`                        | `{uid, name, role}[]`                      | 表示用                                                               |
| `roomName`                            | string                                     | `call-{callId}`。サーバでのみ組む                                    |
| `sessionId`                           | string?                                    | セッションに紐づける場合                                             |
| `createdAt` / `startedAt` / `endedAt` | ISO 8601 文字列                            | `sessions` と同じ形式（CLAUDE.md 6.5）                               |
| `endedReason`                         | `'completed' \| 'missed' \| 'cancelled'` ? | §5.3 の遷移に対応                                                    |
| `declinedUids`                        | string[]                                   | 拒否した参加者。発信者には人数だけ見せる                             |
| `recording`                           | object?                                    | P2。`{status, egressId, path, url, startedAt, endedAt, durationSec}` |

型は `src/lib/types/call.ts`。

### 4.2 Firestore ルール

```
match /calls/{callId} {
  allow read: if request.auth != null
              && request.auth.uid in resource.data.participantUids;
  allow write: if false;   // サーバのみ
}
```

### 4.3 インデックス

`participantUids`（array-contains）+ `status` + `createdAt` の複合インデックスを `firestore.indexes.json` に追加する。**`firebase deploy --only firestore:indexes` を別途実行する。** push では反映されず、欠落は着信が来ない沈黙失敗になる（CLAUDE.md 7章）。

## 5. サーバ設計

既存の `src/app/api/interview/gemini-live-session/route.ts`（短命トークン）と `src/app/api/stripe/webhook/route.ts`（webhook）の作りを踏襲する。

| ルート                      | メソッド    | 権限                         | 役割                                                                                                                                 |
| --------------------------- | ----------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/calls`                | POST        | admin / teacher / superadmin | 通話を作る。参加者ごとに `scopeByOrganization` を通し、1人でも通らなければ 403。各参加者のチャットに呼び出しカードを書き、FCM を送る |
| `/api/calls/[id]`           | GET / PATCH | 参加者 / 発信者              | 状態取得と終了                                                                                                                       |
| `/api/calls/[id]/decline`   | POST        | 参加者                       | 着信を拒否する                                                                                                                       |
| `/api/livekit/token`        | POST        | 参加者                       | `callId` を受け、`participantUids` に居ることを確認してトークン発行                                                                  |
| `/api/calls/[id]/recording` | POST        | 発信者のみ                   | P2。Egress の開始・停止                                                                                                              |
| `/api/livekit/webhook`      | POST        | 署名検証                     | P2。`egress_ended` / `room_finished`                                                                                                 |

### 5.0 入出力

```
POST /api/calls
  req  { participantUids: string[], sessionId?: string }
  res  201 { callId, roomName, participants }
       403 { error }  参加者に別組織・管理外が混ざっている
       400 { error }  0人、11人以上、自分だけ

POST /api/livekit/token
  req  { callId: string }
  res  200 { token, url, identity, expiresAt }
       403 { error }  participantUids に居ない
       404 { error }  通話が無い / 既に ended
       503 { error }  LiveKit 未設定

GET   /api/calls/[id]          res 200 { call }          参加者のみ
PATCH /api/calls/[id]          req { status: 'ended' }   発信者のみ
POST  /api/calls/[id]/decline  res 200 { ok: true }      参加者のみ。declinedUids に足す
```

クライアントは `calls` に直接書けない（ルールで write 禁止）ため、拒否も API を通す。

トークンの有効期限は10分。入室時にだけ使うもので、通話中は LiveKit 側の接続が維持される。リロード時は取り直す。

補助モジュール。

- `src/lib/livekit/config.ts` — `src/lib/stripe/config.ts` と同型。`isLiveKitConfigured()` を出す
- `src/lib/livekit/token.ts` — `AccessToken` の grant 組み立て。ルートに直書きしない（`src/lib/interview/gemini-live-token.ts` と同じ分離）
- `src/lib/livekit/authz.ts` — 参加者・組織の判定を**純関数**で切り出す。検証スクリプトから直接叩けるようにするため

### 5.1 セキュリティ上の要点

- **ルーム名はサーバでのみ組む。** クライアントから受け取ると任意のルームに入れてしまう。
- **`participantUids` が認可の正本。** セッションの `participantIds` は見ない（§3-2 の穴を継承しないため）。
- **参加者追加時に `organizationId` を照合する。** 別法人の生徒が同じ部屋に入る事故を防ぐ。過去に権限変更で別法人の生徒を見せた事故があるため、ここは静的検証の対象にする。
- **`requireRole` の dev バイパスに注意。** 開発環境で Admin SDK 未設定だと未認証リクエストが admin 扱いになる（`src/lib/api/auth.ts:23-25`）。本番には影響しないが、ローカル検証で穴を見落とさないようにする。

### 5.2 エラーの返し方（既存に合わせる）

| 状況           | コード | body                            |
| -------------- | ------ | ------------------------------- |
| LiveKit 未設定 | 503    | `{error: "..."}`                |
| 上流失敗       | 502    | `{error, detail}`               |
| 権限なし       | 403    | `{error: "権限がありません"}`   |
| `adminDb` なし | 500    | `{error: "サーバー設定エラー"}` |

ログは `[livekit-token]` `[livekit-webhook]` `[calls]` の角括弧つき。

### 5.3 状態遷移

```
[なし] --POST /api/calls--> ringing --最初の1人が入室--> active --最後の1人が退出--> ended
           |                    |                            |
           |                    +--60秒応答なし------------> ended (missed)
           |                    +--発信者が取消------------> ended
           +--参加者0人 -> 400 で作らない
```

- `ringing → active` は **LiveKit の `participant_joined` webhook** で書く。クライアントの申告を信じない。P1 では webhook 未実装のため、トークン発行が成功した時点でサーバが `active` に書く（発行は参加者確認済みなので、なりすましにはならない）。
- `active → ended` は `room_finished` webhook。LiveKit のルームは `emptyTimeout: 60`（秒）で自動的に閉じるので、全員が抜ければ勝手に終わる。P1 では webhook 未実装のため、発信者の PATCH と、`createdAt` から6時間経過した通話を読み取り時に `ended` 扱いする遅延判定で代用する。既存の `shouldMarkEnded()`（`src/lib/types/session.ts:313`）と同じ考え方。
- **未応答のタイムアウトは60秒。** 着信モーダルは60秒で自動的に閉じ、`ended` に落とす。
- 通話は**やり直さない。** 切れたら発信し直す。再入室は同じ `callId` が `active` の間だけ可能。

### 5.4 エッジケース

| 状況                       | 挙動                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| 着信中に別の着信が来る     | 先に来たものだけを出す。後は通知だけ残し、モーダルは重ねない                                |
| 通話中にリロード           | 通話ページで `status` を見て、`active` ならトークンを取り直して自動再入室                   |
| カメラが無い端末           | 音声のみで入室する。`InterviewPreflight` のカメラ確認は必須にせず、拒否でも先へ進める       |
| マイクも拒否された         | 入室させない。許可の取り方を案内する                                                        |
| 回線が切れた               | LiveKit クライアントの自動再接続に任せる。3回失敗したら通話ページにエラーを出して退出させる |
| 生徒が着信を拒否           | `calls` に記録は残すが、発信者には「応答なし」とだけ出す。理由は伝えない                    |
| 参加者が10人を超える指定   | 400 で作らせない                                                                            |
| `ended` の通話ページを開く | 「この通話は終了しています」を出す。トークンは発行しない                                    |
| LiveKit 未設定             | 開始ボタン自体を出さない。既存の `isStripeConfigured()` と同じ判定をクライアントにも渡す    |

### 5.5 非機能

- **対応ブラウザ**は LiveKit クライアントの対応範囲に従う。Chrome / Edge / Safari / Firefox の現行版。iOS Safari は PWA でなくても通話自体は動く（通知だけが制約）。
- **同時通話数**は無料枠で100接続。10人の通話なら同時10本。塾の規模では当面問題にならない。
- **遅延**は LiveKit の日本エッジ経由で100ms 未満が目安。
- **カメラ・マイクの許可**はサイトのポリシー設定で既に自分のサイトへ開放済み（`next.config.ts:15` の `camera=(self), microphone=(self)`）。追加設定は不要。

| ファイル                                       | 役割                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/app/call/[callId]/page.tsx`               | 役割を問わない通話ページ。管理者・講師・生徒が同じ URL を開く                      |
| `src/components/call/CallRoom.tsx`             | `@livekit/components-react` の `LiveKitRoom` + `VideoConference`                   |
| `src/components/call/IncomingCallListener.tsx` | `AppLayout` に置く。自分が参加者の `status:'ringing'` を購読して着信モーダルを出す |
| `src/components/call/StartCallButton.tsx`      | チャット画面のヘッダ。1対1はそのまま発信、グループは参加者選択ダイアログ           |

- 通話前のカメラ・マイク確認は既存の `src/components/interview/InterviewPreflight.tsx` を再利用する。
- 着信モーダルは `src/components/chat/FloatingStudentChat.tsx` の `createPortal` と z-index の作法（下部ナビ `z-50` / フローティング `z-[60]`）に合わせる。
- `ChatThread` にヘッダの差し込み口がないため、開始ボタンは各ページのヘッダ行に置く。`ChatThread` の props は増やさない。

### 6.1 呼び出しカード

`CHAT_REFERENCE_KINDS`（`src/lib/types/feedback.ts:23-34`）に `'call'` を足す。href は `/call/{callId}`。§3-4 のとおり許可リストを**クライアントとサーバの2か所同時に**緩める。

## 7. 費用

60分・5人の授業1回あたりの目安。

| 項目         | 単価                | 1回     |
| ------------ | ------------------- | ------- |
| 接続時間     | $0.0005/分          | 約22円  |
| 通信量(下り) | 無料枠超で $0.12/GB | 約97円  |
| 録画(映像)   | $0.02/分            | 約180円 |

無料枠は接続5,000分・通信50GB・**録画60分**。録画枠が実質ないため、録画を常用するなら有料プラン（月$50）か従量超過が要る。録画を任意開始にしたのはこのため。押さなければ1回あたり約120円。

なお当初「LiveKit は Daily の10分の1」と見積もったが、LiveKit は通信量を別建てで課金するため実際の差はずっと小さい。訂正済み。

## 8. 段階

| 段階   | 内容                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------ |
| **P1** | 型・ルール・インデックス、設定と鍵、トークン発行、通話ページ、着信、チャットのカード、開始ボタン。録画なし               |
| **P2** | Egress の開始と停止、webhook、保存、録画同意の画面、録画の再生                                                           |
| **P3** | 着信通知の作り込み（サービスワーカーの応答・拒否ボタン、鳴り続ける設定、着信音）、録画の文字起こしを既存の授業記録に合流 |

P1 を出して実際に使ってから P2 に進む。

## 9. 録画と同意（実装済み・既定では無効）

**録画は既定で止めてある。** LiveKit の費用の大半が録画で、無料枠が月60分しか
ないため（§7）。`NEXT_PUBLIC_CALL_RECORDING=1` を設定したときだけ有効になる。
未設定なら録画ボタンが出ず、操作ルートと同意ルートは 503 を返す。ボタンを
隠すだけでなくサーバでも断るのは、UI を迂回されても課金が出ないようにするため。

### 9.0 実際の流れ

```
講師が「録画」を押す
  → recording.status = awaiting_consent（まだ録っていない）
  → 参加者全員に同意画面（45秒で自動的に「録画しない」）
       ├ 全員が同意 → Egress 開始 → status = recording（全員に赤い表示）
       ├ 1人でも断る → status = declined（録画されない）
       └ 時間切れ    → status = declined
講師が「停止」
  → stopEgress → status = processing
  → egress_ended webhook → status = done（パスと長さを書き戻す）
```

**発信者は同意の対象外**（自分の判断で録画する側）。同意を送っても 400 で弾く。
「講師が録画に同意した」という記録が残ると、あとから誰の同意か読み違えるため。

**同意の書き込みと集計はトランザクション**で行う。グループ通話では複数人が
ほぼ同時に押すので、素朴な read → write だと最後の同意を取りこぼして
「全員同意したのに始まらない」になる。

### 9.1 再生URLを Firestore に置かない

`calls` ドキュメントは参加者全員が client SDK から直接読める（§4.2）。ここに
署名URLを書くと生徒にも渡ってしまう。パスだけ保存し、再生時に
`GET /api/calls/{id}/recording` で役割を確認してから24時間の署名URLを発行する。
既存のセッション録音が生徒向けレスポンスから落とされているのと同じ扱い。

### 9.2 その他

- 講師が録画を開始した時点で、参加者全員の画面に録画中の表示を出す。
- 既存の `src/components/student/StudentRecordingJoinModal.tsx:63-65` は「マイクの音声のみ・カメラ映像は記録されません」と明記しているため流用できない。映像込みの文言で新規に作る。
- 同意の状態は既存の `researchConsentStatus`（`src/lib/types/user.ts:117-121`）と同じ考え方で持つ。
- 保存先は `calls/{callId}/recording-{ts}.mp4`。Admin SDK が書き、長期署名URLで読ませる（§3-6）。

## 10. 未解決・後で決めること

- **文字起こしの話者ラベル。** 既存の `LessonTranscriptRecord` は `speaker: "teacher" | "student"` の2値に固定されている（`src/lib/types/session.ts:154`）。N人の通話を合流させるには、この union を広げる必要がある。P3 で扱う。
- **同時通話数の上限。** LiveKit の無料枠は同時接続100。塾の規模では当面問題ないが、有料プランへ移る閾値を運用で決める。
- **iOS の着信。** Web Push は PWA としてインストールされていないと届かない（`src/lib/firebase/messaging.ts:80-83`）。アプリを開いている間は Firestore の購読で確実に鳴るため、P1 はそれで足りる。P3 で PWA 導線を検討する。

## 11. 検証方針

このリポジトリにテスト基盤はない。既存の作法（`scripts/verify-*.ts` + `node:assert`）に合わせる。

1. `scripts/verify-call-authz.ts` — 参加者・組織の判定を純関数で検証。別組織の生徒を弾くこと、`participantUids` 外の uid を弾くことを確認する。**この機能で唯一の致命的な穴なので必ず静的検証を置く。**
2. `scripts/check-env.ts` に LiveKit の3変数を追加。
3. `scripts/seed-emulator.ts` に通話を1件追加。エミュレータで管理者と生徒を別ブラウザプロファイルで開き、発信・着信・参加・退出を通しで確認する。
4. webhook はローカルに届かないため、署名を手で作って `curl` で確認する。
5. `npm run build` を通す。

## 12. 環境変数

| 変数                      | 形式           | 備考                                                                                        |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------------- |
| `LIVEKIT_API_KEY`         | Secret Manager | バックエンド `coach-app` に secretAccessor が要る。付け忘れると起動はするが通話だけ動かない |
| `LIVEKIT_API_SECRET`      | Secret Manager | 同上                                                                                        |
| `NEXT_PUBLIC_LIVEKIT_URL` | 平文           | `wss://xxx.livekit.cloud`。クライアントが必要とし、秘匿性はない                             |

**この3つは人が用意する。** LiveKit Cloud のアカウント作成とプロジェクト発行はアカウント登録を伴うため実装側では行わない。鍵が入るまでは `isLiveKitConfigured()` が false を返し、開始ボタンが出ず、トークンルートは 503 を返す。ビルドと既存機能には一切影響しない。

依存パッケージは `@livekit/components-react` `@livekit/components-styles` `livekit-client` `livekit-server-sdk`。React 19 対応済み（peer は `react: >=18`）。
