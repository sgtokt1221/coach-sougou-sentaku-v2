/**
 * Firebase エミュレータに、UI 検証用の最小データを投入する。
 *
 *   npm run emu        # 別ターミナルでエミュレータを起動
 *   npm run seed:emu
 *   npm run dev:emu    # http://localhost:3000/login から下記アカウントでログイン
 *
 * 実プロジェクトには一切触れない（FIRESTORE_EMULATOR_HOST 必須。未設定なら中断）。
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const STUDENT_EMAIL = "student@example.com";
const STUDENT_PASSWORD = "password";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-coach";

/** 目標800字に対して超過している志望理由書。AI書き換えの字数警告をそのまま再現できる。 */
const OVER_LIMIT_STATEMENT = `私が立命館大学薬学部を志望する理由は、薬剤耐性菌の問題に取り組める薬剤師になりたいからです。高校二年生のとき、祖母が肺炎で入院しました。抗菌薬がなかなか効かず、担当の薬剤師の方が何度も処方を検討し直している姿を病室で見ました。そのとき初めて、薬剤師が単に薬を渡す人ではなく、治療そのものを設計する専門職なのだと知りました。

祖母の退院後、私は薬剤耐性（AMR）について自分で調べ始めました。世界保健機関の報告書を読み、二〇五〇年には薬剤耐性菌による死者が年間一千万人に達する可能性があると知って強い衝撃を受けました。学校の課題研究では「身近な環境における耐性菌の広がり」をテーマに選び、文献調査をもとに校内で発表を行いました。準備の過程で、微生物学と有機化学の両方の知識が必要になることを痛感し、基礎からしっかり学びたいと考えるようになりました。

課題研究では、学校図書館の資料だけでは足りず、大学の公開講座にも参加しました。講師の先生に質問をしたところ、耐性菌は病院の中だけの問題ではなく、家畜への抗菌薬使用や排水を通じて社会全体に広がっているのだと教わりました。自分が想像していたよりもずっと広い問題であることを知り、薬学は化学と医療だけでなく、環境や社会制度にもつながる学問なのだと考えるようになりました。

貴学の薬学部を志望するのは、六年制課程のなかで早期から医療現場に触れる実習が組まれており、チーム医療を実践的に学べるからです。また、感染制御に関する研究室があり、私の関心を深く掘り下げられる環境が整っていると感じました。オープンキャンパスで研究室を訪問した際、大学院生の方から抗菌薬の適正使用について伺い、臨床と研究の両方に軸足を置く姿勢に強く惹かれました。

入学後は、まず有機化学と微生物学の基礎を固め、実習には積極的に参加します。将来は病院薬剤師として感染制御チームに加わり、抗菌薬の適正使用を現場から支えたいと考えています。祖母の入院時に見たあの薬剤師の姿に、私はいつか自分自身が近づきたいのです。`;

/** 【】プレースホルダー入りの下書き。書き換えのプレースホルダー警告を再現できる。 */
const PLACEHOLDER_STATEMENT = `私が総合型選抜で貴学を志望する理由は、【原体験を入力】という経験から、地域医療の課題に取り組みたいと考えるようになったからです。

高校では探究活動に取り組み、【グローバルに関する経験を入力】。この活動を通じて、課題を自分の言葉で定義し直すことの大切さを学びました。

貴学のアドミッションポリシーは主体的に学び続ける姿勢を求めています。【AP確認後に接続を書く】。

入学後は基礎科目を固めたうえで、【原体験】で感じた疑問を研究として掘り下げたいと考えています。`;

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.error(
      "FIRESTORE_EMULATOR_HOST が未設定です。npm run seed:emu から実行してください（実プロジェクトへの誤投入を防ぐため中断します）。"
    );
    process.exit(1);
  }

  if (getApps().length === 0) initializeApp({ projectId: PROJECT_ID });
  const auth = getAuth();
  const db = getFirestore();

  // 生徒アカウント
  let uid: string;
  try {
    uid = (await auth.getUserByEmail(STUDENT_EMAIL)).uid;
    await auth.updateUser(uid, { password: STUDENT_PASSWORD });
  } catch {
    uid = (
      await auth.createUser({
        email: STUDENT_EMAIL,
        password: STUDENT_PASSWORD,
        displayName: "検証 太郎",
      })
    ).uid;
  }

  await db.doc(`users/${uid}`).set(
    {
      email: STUDENT_EMAIL,
      name: "検証 太郎",
      role: "student",
      grade: 3,
      // 機能ゲート（requireFeature）を全部通すため
      plan: "standard",
      documentPackage: { purchased: true },
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // 大学（AP を使う画面のため最低1校）
  await db.doc("universities/ritsumeikan-u").set(
    {
      id: "ritsumeikan-u",
      name: "立命館大学",
      faculties: [
        {
          id: "pharmacy",
          name: "薬学部",
          admissionPolicy:
            "薬学と医療に強い関心を持ち、生命科学の基礎学力を備え、チーム医療の一員として主体的に学び続ける意欲のある人を求めます。",
        },
      ],
    },
    { merge: true }
  );

  // 書類2件（字数警告 / プレースホルダー警告）
  const docs = [
    {
      id: "emu-doc-over-limit",
      title: "立命館大学薬学部 志望理由書（字数超過）",
      content: OVER_LIMIT_STATEMENT,
    },
    {
      id: "emu-doc-placeholder",
      title: "立命館大学薬学部 志望理由書（プレースホルダー入り）",
      content: PLACEHOLDER_STATEMENT,
    },
  ];
  for (const d of docs) {
    await db.doc(`documents/${d.id}`).set(
      {
        userId: uid,
        type: "志望理由書",
        title: d.title,
        content: d.content,
        targetWordCount: 800,
        status: "draft",
        universityId: "ritsumeikan-u",
        facultyId: "pharmacy",
        universityName: "立命館大学",
        facultyName: "薬学部",
        versions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  // 小論文の下書き（一覧のテーマ名表示の確認用）
  await db.doc(`users/${uid}/essayDrafts/emu-draft-theme`).set(
    {
      directText: "書きかけの本文です。",
      topic: "",
      themeId: "society-001",
      universityId: "ritsumeikan-u",
      facultyId: "pharmacy",
      selectedCompoundId: "ritsumeikan-u:pharmacy",
      universityName: "立命館大学",
      facultyName: "薬学部",
      inputMode: "text",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  console.log("投入しました。");
  console.log(`  ログイン: ${STUDENT_EMAIL} / ${STUDENT_PASSWORD}`);
  console.log(`  uid: ${uid}`);
  console.log("  /student/documents/emu-doc-over-limit   … 字数警告の確認");
  console.log("  /student/documents/emu-doc-placeholder  … プレースホルダー警告の確認");
  console.log("  /student/essay/history                  … 下書きのテーマ名表示");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
