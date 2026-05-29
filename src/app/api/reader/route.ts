import { NextRequest, NextResponse } from "next/server";
import { extractFromHtml } from "@extractus/article-extractor";
import { requireRole } from "@/lib/api/auth";
import dns from "node:dns";
import { Agent } from "undici";

/**
 * リーダー API。
 * 検索結果などの外部 URL をサーバー側で取得し、本文を抽出して返す。
 * クライアントの iframe では X-Frame-Options によりほぼ全サイトが表示できないため、
 * 本文抽出 (リーダーモード) でパネル内ブラウジングを実現する。
 *
 * セキュリティ:
 * - 認証必須 (オープンプロキシ化の防止)
 * - SSRF 対策: プライベート/ループバック/リンクローカル(クラウドメタデータ含む)を遮断。
 *   リダイレクトは手動追跡し、各ホップを検証する。
 * - サイズ・時間の上限、HTML 以外を拒否
 */

const MAX_BYTES = 3_000_000;
const FETCH_TIMEOUT_MS = 9000;

/** IP アドレス(文字列)がプライベート/ループバック/リンクローカル/マルチキャスト等か */
function isBlockedIp(ip: string): boolean {
  const h = ip.toLowerCase().replace(/^\[|\]$/g, "");
  // IPv4-mapped IPv6 (::ffff:127.0.0.1 等) は内側の IPv4 で判定
  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(h);
  if (mapped) return isBlockedIp(mapped[1]);
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + 169.254.169.254 (cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  // IPv6 ループバック/未指定/リンクローカル/ULA
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

/** ホスト名の早期遮断 (内部向けの名前・IP リテラル)。DNS 解決後の検証は safeLookup で行う */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".internal") ||
    h.endsWith(".local")
  ) {
    return true;
  }
  // IP リテラル(IPv4 / IPv6)はその場で判定
  if (/^[\d.]+$/.test(h) || h.includes(":")) return isBlockedIp(h);
  return false;
}

/**
 * undici の connect で使う DNS lookup。
 * 解決した全 IP を検証し、1つでもプライベート等なら接続を拒否する。
 * 接続は検証済み IP に固定されるため、DNS リバインディング(解決後の再解決)も防げる。
 * リダイレクトの各ホップでもこの lookup が走る。
 */
function safeLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | dns.LookupAddress[],
    family?: number
  ) => void
): void {
  // 検証のため常に全アドレスを取得する
  dns.lookup(hostname, { ...options, all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, "");
    const list = addresses as dns.LookupAddress[];
    if (!list || list.length === 0) {
      return callback(new Error("名前解決に失敗しました") as NodeJS.ErrnoException, "");
    }
    for (const a of list) {
      if (isBlockedIp(a.address)) {
        return callback(
          new Error("内部アドレスへの接続は許可されていません") as NodeJS.ErrnoException,
          ""
        );
      }
    }
    // 呼び出し側 (net.connect) が期待する形で返す
    if (options.all) {
      callback(null, list);
    } else {
      callback(null, list[0].address, list[0].family);
    }
  });
}

/** 接続時に解決 IP を検証する dispatcher (SSRF / DNS リバインディング対策) */
const safeAgent = new Agent({ connect: { lookup: safeLookup } });

function validateTarget(raw: string): URL | { error: string; status: number } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { error: "URL が不正です", status: 400 };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "http/https のみ対応しています", status: 400 };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { error: "このアドレスは取得できません", status: 400 };
  }
  return parsed;
}

/**
 * SSRF 安全な取得。
 * 接続時に解決 IP を検証する dispatcher (safeAgent) を使うため、最初の URL だけでなく
 * リダイレクト先の各ホップも接続時に検証される（プライベート IP に解決される名前・
 * DNS リバインディングを遮断）。
 */
async function safeFetch(start: URL): Promise<Response | { error: string; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(start.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CoachReader/1.0; +https://coach-app--coach-sougou-sentaku.asia-east1.hosted.app)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.8",
      },
      // undici 拡張: 接続する IP を検証する dispatcher
      dispatcher: safeAgent,
    } as RequestInit & { dispatcher: Agent });
    return res;
  } catch {
    return {
      error: "ページの取得に失敗しました（タイムアウト・接続エラー・または許可されないアドレス）",
      status: 502,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** content-type ヘッダ → meta の順で charset を判定 (日本語 Shift_JIS 等に対応) */
function detectCharset(contentType: string, bytes: Uint8Array): string {
  const fromHeader = /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
  if (fromHeader) return normalizeCharset(fromHeader);
  // 先頭 2KB を ascii とみなして meta charset を探す
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 2048));
  const metaCharset =
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ||
    /charset=["']?([\w-]+)/i.exec(head)?.[1];
  return normalizeCharset(metaCharset ?? "utf-8");
}

function normalizeCharset(cs: string): string {
  const c = cs.toLowerCase();
  if (c === "sjis" || c === "x-sjis" || c === "shift-jis" || c === "shift_jis") return "shift_jis";
  if (c === "euc-jp" || c === "eucjp") return "euc-jp";
  if (c === "iso-2022-jp") return "iso-2022-jp";
  return c || "utf-8";
}

export async function GET(request: NextRequest) {
  // 認証必須 (オープンプロキシ化の防止)
  const auth = await requireRole(request, ["student", "teacher", "admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "url は必須です" }, { status: 400 });
  }

  const validated = validateTarget(target);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: validated.status });
  }

  const fetched = await safeFetch(validated);
  if ("error" in fetched) {
    return NextResponse.json({ error: fetched.error }, { status: fetched.status });
  }
  const res = fetched;

  if (!res.ok) {
    return NextResponse.json({ error: `取得に失敗しました (${res.status})` }, { status: 502 });
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!/text\/html|application\/xhtml|\bxml\b/i.test(contentType)) {
    return NextResponse.json(
      { error: "HTML ページではないため表示できません", contentType },
      { status: 415 }
    );
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "ページが大きすぎます" }, { status: 413 });
  }

  let html: string;
  try {
    html = new TextDecoder(detectCharset(contentType, buf)).decode(buf);
  } catch {
    html = new TextDecoder("utf-8").decode(buf);
  }

  const finalUrl = res.url || validated.toString();

  let article: Awaited<ReturnType<typeof extractFromHtml>> = null;
  try {
    article = await extractFromHtml(html, finalUrl);
  } catch {
    article = null;
  }
  if (!article || !article.content) {
    return NextResponse.json(
      { error: "本文を抽出できませんでした。元のページを開いて確認してください。", url: finalUrl },
      { status: 422 }
    );
  }

  return NextResponse.json({
    title: article.title ?? "",
    content: article.content, // article-extractor がサニタイズ済みの HTML
    author: article.author ?? null,
    published: article.published ?? null,
    source: article.source ?? validated.hostname,
    url: finalUrl,
  });
}
