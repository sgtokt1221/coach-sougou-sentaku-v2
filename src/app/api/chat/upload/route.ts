import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import type { ChatAttachment } from "@/lib/types/feedback";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

// 完全一致の allowlist。SVG (image/svg+xml) はスクリプト埋め込みによる
// Stored XSS を招くため意図的に除外する。
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const ALLOWED = new Set(Object.keys(EXT_BY_TYPE));

/** 先頭バイト(マジックナンバー)が宣言された contentType と一致するか検証 */
function magicMatches(buf: Buffer, contentType: string): boolean {
  if (buf.length < 4) return false;
  const b = buf;
  switch (contentType) {
    case "image/jpeg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png":
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case "image/gif":
      return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46; // GIF
    case "image/webp":
      return (
        b.length >= 12 &&
        b.toString("ascii", 0, 4) === "RIFF" &&
        b.toString("ascii", 8, 12) === "WEBP"
      );
    case "application/pdf":
      return b.toString("ascii", 0, 4) === "%PDF";
    default:
      return false;
  }
}

/**
 * POST /api/chat/upload
 * チャット添付ファイルを Cloud Storage に保存し署名URLを返す。
 * essay/upload と同じく Admin SDK でサーバー側保存 (Storage ルール非依存)。
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, [
    "student",
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const body = await request.json();
    const { fileBase64, fileName, contentType } = body as {
      fileBase64?: string;
      fileName?: string;
      contentType?: string;
    };

    if (!fileBase64 || !contentType) {
      return NextResponse.json(
        { error: "fileBase64 と contentType は必須です" },
        { status: 400 }
      );
    }
    if (!ALLOWED.has(contentType)) {
      return NextResponse.json(
        { error: "JPEG/PNG/GIF/WebP 画像または PDF のみ添付できます" },
        { status: 415 }
      );
    }

    const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "ファイルサイズは10MBまでです" },
        { status: 413 }
      );
    }
    // マジックバイト検証: 宣言された contentType と実体が一致しない偽装を拒否
    if (!magicMatches(buffer, contentType)) {
      return NextResponse.json(
        { error: "ファイル形式が不正です" },
        { status: 415 }
      );
    }

    const ext = EXT_BY_TYPE[contentType];
    const rand = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const path = `chat/${uid}/${rand}.${ext}`;

    let url = "";
    try {
      const { getStorage } = await import("firebase-admin/storage");
      const file = getStorage().bucket().file(path);
      await file.save(buffer, { contentType });
      const [signed] = await file.getSignedUrl({
        action: "read",
        expires: "2030-01-01",
      });
      url = signed;
    } catch (storageErr) {
      console.error("[chat/upload] storage error:", storageErr);
      return NextResponse.json(
        { error: "アップロードに失敗しました" },
        { status: 500 }
      );
    }

    const attachment: ChatAttachment = {
      type: contentType.startsWith("image/") ? "image" : "file",
      url,
      name: fileName?.slice(0, 200) || `file.${ext}`,
      size: buffer.length,
      contentType,
    };

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error("Chat upload error:", error);
    return NextResponse.json(
      { error: "アップロード処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
