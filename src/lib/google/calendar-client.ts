import { OAuth2Client } from "google-auth-library";
import { google, type calendar_v3 } from "googleapis";
import type { Firestore } from "firebase-admin/firestore";
import { loadTokens, saveTokens, type GoogleCalendarTokens } from "./token-store";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

function getEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} が設定されていません`);
  return v;
}

export function createOAuthClient(): OAuth2Client {
  return new OAuth2Client({
    clientId: getEnv("GOOGLE_CLIENT_ID"),
    clientSecret: getEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: getEnv("GOOGLE_REDIRECT_URI"),
  });
}

export function generateAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<{ tokens: GoogleCalendarTokens; rawExpiryDate?: number | null }> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error(
      "access_token / refresh_token の取得に失敗しました (prompt=consent を確認)",
    );
  }
  // fetch email
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email;
  if (!email) {
    throw new Error("Google アカウントのメール取得に失敗しました");
  }
  return {
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString(),
      email,
      connectedAt: new Date().toISOString(),
      scope: tokens.scope,
    },
    rawExpiryDate: tokens.expiry_date,
  };
}

export async function getAuthedClient(
  db: Firestore,
  uid: string,
): Promise<{ client: OAuth2Client; tokens: GoogleCalendarTokens } | null> {
  const tokens = await loadTokens(db, uid);
  if (!tokens) return null;
  const client = createOAuthClient();
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: new Date(tokens.expiresAt).getTime(),
    scope: tokens.scope,
  });
  // 自動リフレッシュ時に新しい access_token を保存
  client.on("tokens", async (t) => {
    if (t.access_token) {
      await saveTokens(db, uid, {
        ...tokens,
        accessToken: t.access_token,
        expiresAt: t.expiry_date
          ? new Date(t.expiry_date).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString(),
      });
    }
  });
  return { client, tokens };
}

export async function revokeTokens(tokens: GoogleCalendarTokens): Promise<void> {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: tokens.refreshToken });
  try {
    await client.revokeToken(tokens.refreshToken);
  } catch (err) {
    console.warn("[google-calendar] revoke failed:", err);
  }
}

interface CreateEventInput {
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  timeZone?: string;
  attendeeEmails?: string[];
  /** 未指定なら新 Meet リンク自動生成、指定があれば使う */
  existingMeetLink?: string;
}

export async function createEventWithMeet(
  client: OAuth2Client,
  input: CreateEventInput,
): Promise<{ eventId: string; meetLink: string | null; htmlLink: string | null }> {
  const cal = google.calendar({ version: "v3", auth: client });
  const event: calendar_v3.Schema$Event = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startIso, timeZone: input.timeZone ?? "Asia/Tokyo" },
    end: { dateTime: input.endIso, timeZone: input.timeZone ?? "Asia/Tokyo" },
    attendees: input.attendeeEmails?.map((email) => ({ email })),
    conferenceData: input.existingMeetLink
      ? {
          entryPoints: [
            {
              entryPointType: "video",
              uri: input.existingMeetLink,
              label: "Google Meet",
            },
          ],
        }
      : {
          createRequest: {
            requestId: `coach-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
  };
  const res = await cal.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: event,
  });
  return {
    eventId: res.data.id ?? "",
    meetLink: res.data.hangoutLink ?? null,
    htmlLink: res.data.htmlLink ?? null,
  };
}

interface UpdateEventInput {
  summary?: string;
  description?: string;
  startIso?: string;
  endIso?: string;
  timeZone?: string;
  status?: "confirmed" | "cancelled";
}

export async function updateEvent(
  client: OAuth2Client,
  eventId: string,
  input: UpdateEventInput,
): Promise<void> {
  const cal = google.calendar({ version: "v3", auth: client });
  const patch: calendar_v3.Schema$Event = {};
  if (input.summary !== undefined) patch.summary = input.summary;
  if (input.description !== undefined) patch.description = input.description;
  if (input.startIso)
    patch.start = { dateTime: input.startIso, timeZone: input.timeZone ?? "Asia/Tokyo" };
  if (input.endIso)
    patch.end = { dateTime: input.endIso, timeZone: input.timeZone ?? "Asia/Tokyo" };
  if (input.status) patch.status = input.status;

  await cal.events.patch({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
    requestBody: patch,
  });
}

export async function deleteEvent(
  client: OAuth2Client,
  eventId: string,
): Promise<void> {
  const cal = google.calendar({ version: "v3", auth: client });
  try {
    await cal.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    });
  } catch (err) {
    const anyErr = err as { code?: number };
    if (anyErr?.code === 404 || anyErr?.code === 410) {
      // already gone
      return;
    }
    throw err;
  }
}
