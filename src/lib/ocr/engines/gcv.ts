import * as crypto from "crypto";
import type { OcrEngine, OcrEngineResult } from "@/lib/types/ocr";

function createJwt(clientEmail: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-vision",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  })).toString("base64url");
  const signInput = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signInput);
  return `${signInput}.${sign.sign(privateKey, "base64url")}`;
}

async function getAccessToken(): Promise<string | null> {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${createJwt(clientEmail, privateKey)}`,
  });
  if (!res.ok) return null;
  return (await res.json()).access_token ?? null;
}

/** Google Cloud Vision DOCUMENT_TEXT_DETECTION エンジン */
export const gcvEngine: OcrEngine = {
  id: "gcv",
  model: "gcv-document-text",
  promptVersion: "gcv-v1",
  async run({ base64 }): Promise<OcrEngineResult> {
    const start = Date.now();
    try {
      const token = await getAccessToken();
      if (!token) return { text: "", confidence: null, latencyMs: Date.now() - start, costUsd: null, error: "no-token" };
      const res = await fetch("https://vision.googleapis.com/v1/images:annotate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{ image: { content: base64 }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }], imageContext: { languageHints: ["ja"] } }],
        }),
      });
      if (!res.ok) return { text: "", confidence: null, latencyMs: Date.now() - start, costUsd: null, error: `http-${res.status}` };
      const data = await res.json();
      const text = data.responses?.[0]?.fullTextAnnotation?.text ?? "";
      return { text, confidence: null, latencyMs: Date.now() - start, costUsd: 0.0015 };
    } catch (err) {
      return { text: "", confidence: null, latencyMs: Date.now() - start, costUsd: null, error: String(err) };
    }
  },
};
