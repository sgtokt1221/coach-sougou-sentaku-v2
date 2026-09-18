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
export async function sendEmail(
  payload: EmailPayload
): Promise<SendEmailResult> {
  const client = getClient();

  /**
   * 鍵が無いときは「送った」と言わない。
   *
   * 以前はログに出して success:true を返していた。本番の apphosting.yaml に
   * RESEND_API_KEY が無いため、書類期限のリマインドも要注意ダイジェストも
   * 1通も届いていないのに、管理画面には「送信しました」と出ていた。
   */
  if (!client) {
    console.error(
      `[Email] RESEND_API_KEY が未設定のため送信していません: ${payload.subject}`
    );
    return {
      success: false,
      error: "メール送信が未設定です（RESEND_API_KEY）",
    };
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
    const message =
      error instanceof Error ? error.message : "メール送信に失敗しました";
    console.error("[Email Error]", message);
    return { success: false, error: message };
  }
}

/**
 * 一括メール送信。
 * 鍵が無いときは失敗として返す（送っていないものを成功と報告しない）。
 */
export async function sendBatchEmails(
  emails: EmailPayload[]
): Promise<SendEmailResult[]> {
  const client = getClient();

  if (!client) {
    console.error(
      `[Email] RESEND_API_KEY が未設定のため ${emails.length} 通を送信していません`
    );
    return emails.map(() => ({
      success: false,
      error: "メール送信が未設定です（RESEND_API_KEY）",
    }));
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
    const message =
      error instanceof Error ? error.message : "バッチメール送信に失敗しました";
    console.error("[Email Batch Error]", message);
    return emails.map(() => ({ success: false, error: message }));
  }
}
