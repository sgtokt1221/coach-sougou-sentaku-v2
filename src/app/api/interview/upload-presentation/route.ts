import { NextRequest, NextResponse } from "next/server";

async function extractFromPptx(buffer: Buffer): Promise<{ text: string; slideCount: number }> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const slides: string[] = [];

  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] ?? "0");
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] ?? "0");
      return numA - numB;
    });

  for (const slideFile of slideFiles) {
    const xml = await zip.file(slideFile)!.async("text");
    const texts: string[] = [];
    const regex = /<a:t>([^<]*)<\/a:t>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      if (match[1].trim()) texts.push(match[1]);
    }
    if (texts.length > 0) {
      const slideNum = slides.length + 1;
      slides.push(`[スライド${slideNum}]\n${texts.join("\n")}`);
    }
  }

  return { text: slides.join("\n\n"), slideCount: slides.length };
}

async function extractFromPdf(buffer: Buffer): Promise<{ text: string; slideCount: number }> {
  // @ts-expect-error pdf-parse ESM export type mismatch
  const pdfParse = (await import("pdf-parse")).default ?? (await import("pdf-parse"));
  const data = await pdfParse(buffer);
  return { text: data.text, slideCount: data.numpages };
}

async function extractFromKeynote(buffer: Buffer): Promise<{ text: string; slideCount: number }> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);

  const imageFiles = Object.keys(zip.files)
    .filter((f) => /\.(jpg|jpeg|png)$/i.test(f) && !zip.files[f].dir)
    .sort();

  if (imageFiles.length === 0) {
    return { text: "(Keynoteファイルからテキストを抽出できませんでした。PDFに変換してアップロードしてください)", slideCount: 0 };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return { text: "(APIキー未設定のためKeynoteの解析ができません)", slideCount: 0 };
  }

  const slides: string[] = [];
  const maxSlides = Math.min(imageFiles.length, 10);

  for (let i = 0; i < maxSlides; i++) {
    const imgData = await zip.file(imageFiles[i])!.async("base64");
    const fileExt = imageFiles[i].split(".").pop()?.toLowerCase();
    const mediaType = fileExt === "png" ? "image/png" : "image/jpeg";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imgData } },
            { type: "text", text: "このスライド画像のテキスト内容を正確に書き起こしてください。レイアウトは無視して、テキストのみ抽出してください。" },
          ],
        }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "";
      if (text.trim()) slides.push(`[スライド${i + 1}]\n${text}`);
    }
  }

  return { text: slides.join("\n\n"), slideCount: slides.length };
}

async function extractFromImage(base64: string, mediaType: string): Promise<{ text: string; slideCount: number }> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return { text: "(APIキー未設定のため画像の解析ができません)", slideCount: 1 };
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "この画像の内容を詳しく説明してください。テキストがあれば正確に書き起こしてください。" },
        ],
      }],
    }),
  });

  if (!res.ok) {
    return { text: "(画像の解析に失敗しました)", slideCount: 1 };
  }

  const data = await res.json();
  return { text: data.content?.[0]?.text ?? "", slideCount: 1 };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileBase64, fileName, mimeType } = body as {
      fileBase64: string;
      fileName: string;
      mimeType: string;
    };

    if (!fileBase64 || !fileName) {
      return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });
    }

    const buffer = Buffer.from(fileBase64, "base64");
    const ext = fileName.split(".").pop()?.toLowerCase();

    let result: { text: string; slideCount: number };

    if (ext === "pptx") {
      result = await extractFromPptx(buffer);
    } else if (ext === "pdf") {
      result = await extractFromPdf(buffer);
    } else if (ext === "key") {
      result = await extractFromKeynote(buffer);
    } else if (["png", "jpg", "jpeg"].includes(ext ?? "")) {
      result = await extractFromImage(fileBase64, mimeType || "image/jpeg");
    } else {
      return NextResponse.json(
        { error: "対応していないファイル形式です。PPTX, Keynote, PDF, 画像に対応しています。" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      extractedText: result.text,
      slideCount: result.slideCount,
      fileName,
    });
  } catch (error) {
    console.error("Presentation upload error:", error);
    return NextResponse.json(
      { error: "ファイルの処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
