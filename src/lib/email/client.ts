import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || "CoachFor <noreply@coachfor.jp>";

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  if (!resendApiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(resendApiKey);
  }
  return resendClient;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * メール送信
 * RESEND_API_KEY が未設定の場合はコンソールにログ出力してフォールバック
 */
export async function sendEmail(payload: EmailPayload): Promise<SendEmailResult> {
  const client = getClient();

  if (!client) {
    console.log("[Email Fallback] RESEND_API_KEY not configured. Logging email:");
    console.log(`  To: ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}`);
    console.log(`  Subject: ${payload.subject}`);
    console.log(`  HTML length: ${payload.html.length} chars`);
    return { success: true, id: `fallback_${Date.now()}` };
  }

  try {
    const result = await client.emails.send({
      from: emailFrom,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
    });

    if (result.error) {
      console.error("[Email Error]", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "メール送信に失敗しました";
    console.error("[Email Error]", message);
    return { success: false, error: message };
  }
}

/**
 * 一括メール送信
 * RESEND_API_KEY が未設定の場合はコンソールにログ出力してフォールバック
 */
export async function sendBatchEmails(
  emails: EmailPayload[]
): Promise<SendEmailResult[]> {
  const client = getClient();

  if (!client) {
    console.log(`[Email Fallback] Batch: ${emails.length} emails logged (RESEND_API_KEY not configured)`);
    return emails.map((e) => {
      console.log(`  To: ${Array.isArray(e.to) ? e.to.join(", ") : e.to} | Subject: ${e.subject}`);
      return { success: true, id: `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    });
  }

  try {
    const result = await client.batch.send(
      emails.map((e) => ({
        from: emailFrom,
        to: Array.isArray(e.to) ? e.to : [e.to],
        subject: e.subject,
        html: e.html,
      }))
    );

    if (result.error) {
      console.error("[Email Batch Error]", result.error);
      return emails.map(() => ({
        success: false,
        error: result.error?.message ?? "バッチ送信に失敗しました",
      }));
    }

    const data = result.data?.data ?? [];
    return data.map((d: { id: string }) => ({
      success: true,
      id: d.id,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "バッチメール送信に失敗しました";
    console.error("[Email Batch Error]", message);
    return emails.map(() => ({ success: false, error: message }));
  }
}
