/**
 * Environment Variable Validation Script
 *
 * Usage: npx tsx scripts/check-env.ts
 *
 * Checks all required/optional env vars and reports what will work.
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

interface EnvVar {
  key: string;
  required: boolean;
  description: string;
  affects: string[];
}

const ENV_VARS: EnvVar[] = [
  // Firebase Client
  {
    key: "NEXT_PUBLIC_FIREBASE_API_KEY",
    required: true,
    description: "Firebase Client SDK API Key",
    affects: ["Authentication", "Firestore", "Storage"],
  },
  {
    key: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    required: true,
    description: "Firebase Auth Domain",
    affects: ["Authentication"],
  },
  {
    key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    required: true,
    description: "Firebase Project ID",
    affects: ["All Firebase services"],
  },
  {
    key: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    required: true,
    description: "Firebase Storage Bucket",
    affects: ["Essay image upload"],
  },
  {
    key: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    required: true,
    description: "Firebase Messaging Sender ID",
    affects: ["Firebase initialization"],
  },
  {
    key: "NEXT_PUBLIC_FIREBASE_APP_ID",
    required: true,
    description: "Firebase App ID",
    affects: ["Firebase initialization"],
  },
  // Firebase Admin
  {
    key: "FIREBASE_ADMIN_CLIENT_EMAIL",
    required: true,
    description: "Firebase Admin SDK Service Account Email",
    affects: ["/api/auth/*", "/api/superadmin/*", "/api/admin/*"],
  },
  {
    key: "FIREBASE_ADMIN_PRIVATE_KEY",
    required: true,
    description: "Firebase Admin SDK Private Key",
    affects: ["/api/auth/*", "/api/superadmin/*", "/api/admin/*"],
  },
  // AI APIs
  {
    key: "ANTHROPIC_API_KEY",
    required: false,
    description: "Anthropic Claude API Key",
    affects: [
      "essay/review",
      "essay/upload",
      "interview/*",
      "documents/review",
      "activities/interview",
      "activities/optimize",
      "summary/generate",
    ],
  },
  {
    key: "OPENAI_API_KEY",
    required: false,
    description: "OpenAI API Key (TTS/Whisper)",
    affects: ["interview/tts", "interview/voice-message", "transcribe"],
  },
  // BigQuery
  {
    key: "GOOGLE_CLOUD_PROJECT_ID",
    required: false,
    description: "GCP Project ID for BigQuery",
    affects: ["passed-data analytics"],
  },
  {
    key: "BIGQUERY_DATASET",
    required: false,
    description: "BigQuery Dataset Name",
    affects: ["passed-data analytics"],
  },
];

function checkEnv() {
  console.log("=== CoachFor Environment Check ===\n");

  const missing: string[] = [];
  const optional: string[] = [];
  let setCount = 0;

  for (const v of ENV_VARS) {
    const value = process.env[v.key];
    const isSet = !!value && value !== "" && !value.startsWith("xxxxx");
    const icon = isSet ? "\x1b[32m[OK]\x1b[0m" : v.required ? "\x1b[31m[NG]\x1b[0m" : "\x1b[33m[--]\x1b[0m";

    console.log(`${icon} ${v.key}`);
    console.log(`     ${v.description}`);
    console.log(`     Affects: ${v.affects.join(", ")}`);
    console.log();

    if (isSet) {
      setCount++;
    } else if (v.required) {
      missing.push(v.key);
    } else {
      optional.push(v.key);
    }
  }

  console.log("=== Summary ===\n");
  console.log(`Set: ${setCount}/${ENV_VARS.length}`);

  if (missing.length > 0) {
    console.log(
      `\n\x1b[31mMissing required (${missing.length}):\x1b[0m`
    );
    missing.forEach((k) => console.log(`  - ${k}`));
  }

  if (optional.length > 0) {
    console.log(
      `\n\x1b[33mOptional not set (${optional.length}):\x1b[0m`
    );
    optional.forEach((k) => console.log(`  - ${k}`));
  }

  if (missing.length === 0) {
    console.log("\n\x1b[32mAll required variables are set!\x1b[0m");
  }

  console.log("\n=== Feature Status ===\n");

  const firebase = !missing.some((k) => k.startsWith("NEXT_PUBLIC_FIREBASE"));
  const adminSdk = !missing.some((k) => k.startsWith("FIREBASE_ADMIN"));
  const claude = !optional.includes("ANTHROPIC_API_KEY") && !missing.includes("ANTHROPIC_API_KEY");
  const openai = !optional.includes("OPENAI_API_KEY") && !missing.includes("OPENAI_API_KEY");

  const status = (ok: boolean) => ok ? "\x1b[32mREADY\x1b[0m" : "\x1b[33mMOCK\x1b[0m";
  console.log(`  Firebase Auth/Firestore: ${status(firebase)}`);
  console.log(`  Admin SDK (API routes):  ${status(adminSdk)}`);
  console.log(`  AI Essay/Interview:      ${status(claude)}`);
  console.log(`  Voice Interview (TTS):   ${status(openai)}`);
  console.log(`  BigQuery Analytics:      ${status(false)}`);
  console.log();

  process.exit(missing.length > 0 ? 1 : 0);
}

checkEnv();
