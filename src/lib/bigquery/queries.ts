/**
 * Reusable BigQuery analytical query functions.
 *
 * All queries use parameterised queries to prevent SQL injection.
 * When BigQuery is unavailable the functions return empty arrays / null
 * so the calling code can gracefully degrade to mock data.
 */

import { getBigQueryClient, BQ_DATASET_NAME } from "./client";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Filter options shared across most queries.
 */
export interface QueryFilters {
  /** Restrict to a specific student */
  studentId?: string;
  /** Restrict to a specific university */
  universityId?: string;
  /** Restrict to a specific faculty */
  facultyId?: string;
  /** Start of date range (ISO string or YYYY-MM-DD) */
  from?: string;
  /** End of date range (ISO string or YYYY-MM-DD) */
  to?: string;
  /** Maximum number of rows to return (default: 1000) */
  limit?: number;
}

interface BQParam {
  name: string;
  parameterType: { type: string };
  parameterValue: { value: string | number };
}

function buildWhereClause(
  filters: QueryFilters,
  dateField: string
): { clause: string; params: BQParam[] } {
  const conditions: string[] = [];
  const params: BQParam[] = [];

  if (filters.studentId) {
    conditions.push("user_id = @studentId");
    params.push({
      name: "studentId",
      parameterType: { type: "STRING" },
      parameterValue: { value: filters.studentId },
    });
  }
  if (filters.universityId) {
    conditions.push("university_id = @universityId");
    params.push({
      name: "universityId",
      parameterType: { type: "STRING" },
      parameterValue: { value: filters.universityId },
    });
  }
  if (filters.facultyId) {
    conditions.push("faculty_id = @facultyId");
    params.push({
      name: "facultyId",
      parameterType: { type: "STRING" },
      parameterValue: { value: filters.facultyId },
    });
  }
  if (filters.from) {
    conditions.push(`${dateField} >= @fromDate`);
    params.push({
      name: "fromDate",
      parameterType: { type: "TIMESTAMP" },
      parameterValue: { value: filters.from },
    });
  }
  if (filters.to) {
    conditions.push(`${dateField} <= @toDate`);
    params.push({
      name: "toDate",
      parameterType: { type: "TIMESTAMP" },
      parameterValue: { value: filters.to },
    });
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { clause, params };
}

/**
 * Execute a parameterised query against BigQuery.
 * Returns null when BQ is unavailable.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runQuery(sql: string, params: BQParam[]): Promise<any[] | null> {
  const client = getBigQueryClient();
  if (!client) return null;

  try {
    const [rows] = await client.query({
      query: sql,
      params: undefined, // we use namedParams via queryParameters
      useLegacySql: false,
      queryParameters: params.map((p) => ({
        name: p.name,
        parameterType: p.parameterType,
        parameterValue: p.parameterValue,
      })),
    } as Parameters<typeof client.query>[0]);
    return rows;
  } catch (err) {
    console.error("[BQ Query] Failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Essay score trends
// ---------------------------------------------------------------------------

export interface EssayScoreTrendRow {
  period: string; // YYYY-MM-DD
  avg_structure: number;
  avg_logic: number;
  avg_expression: number;
  avg_ap_alignment: number;
  avg_originality: number;
  avg_total: number;
  submission_count: number;
}

/**
 * Get essay score trends aggregated by day.
 */
export async function getEssayScoreTrends(
  filters: QueryFilters = {}
): Promise<EssayScoreTrendRow[] | null> {
  const { clause, params } = buildWhereClause(filters, "submitted_at");
  const limit = filters.limit ?? 1000;

  const sql = `
    SELECT
      DATE(submitted_at) AS period,
      AVG(score_structure)    AS avg_structure,
      AVG(score_logic)        AS avg_logic,
      AVG(score_expression)   AS avg_expression,
      AVG(score_ap_alignment) AS avg_ap_alignment,
      AVG(score_originality)  AS avg_originality,
      AVG(score_total)        AS avg_total,
      COUNT(*)                AS submission_count
    FROM \`${BQ_DATASET_NAME}.essay_submissions\`
    ${clause}
    GROUP BY period
    ORDER BY period ASC
    LIMIT ${limit}
  `;

  return runQuery(sql, params);
}

// ---------------------------------------------------------------------------
// Interview score trends
// ---------------------------------------------------------------------------

export interface InterviewScoreTrendRow {
  period: string;
  avg_clarity: number;
  avg_ap_alignment: number;
  avg_enthusiasm: number;
  avg_specificity: number;
  avg_total: number;
  session_count: number;
}

/**
 * Get interview score trends aggregated by day.
 */
export async function getInterviewScoreTrends(
  filters: QueryFilters = {}
): Promise<InterviewScoreTrendRow[] | null> {
  const { clause, params } = buildWhereClause(filters, "started_at");
  const limit = filters.limit ?? 1000;

  const sql = `
    SELECT
      DATE(started_at)         AS period,
      AVG(score_clarity)       AS avg_clarity,
      AVG(score_ap_alignment)  AS avg_ap_alignment,
      AVG(score_enthusiasm)    AS avg_enthusiasm,
      AVG(score_specificity)   AS avg_specificity,
      AVG(score_total)         AS avg_total,
      COUNT(*)                 AS session_count
    FROM \`${BQ_DATASET_NAME}.interview_sessions\`
    ${clause}
    GROUP BY period
    ORDER BY period ASC
    LIMIT ${limit}
  `;

  return runQuery(sql, params);
}

// ---------------------------------------------------------------------------
// Weakness patterns
// ---------------------------------------------------------------------------

export interface WeaknessPatternRow {
  weakness: string;
  occurrence_count: number;
  student_count: number;
}

/**
 * Get the most common weakness tags across all submissions.
 */
export async function getWeaknessPatterns(
  filters: QueryFilters = {}
): Promise<WeaknessPatternRow[] | null> {
  const limit = filters.limit ?? 50;

  // Build ad-hoc WHERE conditions (we combine both tables via UNION ALL)
  const essayWhere = buildWhereClause(filters, "submitted_at");
  const interviewWhere = buildWhereClause(filters, "started_at");

  // We merge weakness tags from both essay_submissions and interview_sessions
  const sql = `
    WITH all_weaknesses AS (
      SELECT user_id, tag
      FROM \`${BQ_DATASET_NAME}.essay_submissions\`
      ${essayWhere.clause}
      , UNNEST(weakness_tags) AS tag

      UNION ALL

      SELECT user_id, tag
      FROM \`${BQ_DATASET_NAME}.interview_sessions\`
      ${interviewWhere.clause}
      , UNNEST(weakness_tags) AS tag
    )
    SELECT
      tag                         AS weakness,
      COUNT(*)                    AS occurrence_count,
      COUNT(DISTINCT user_id)     AS student_count
    FROM all_weaknesses
    GROUP BY tag
    ORDER BY occurrence_count DESC
    LIMIT ${limit}
  `;

  // Combine params (names are the same, but BQ handles them fine since they
  // reference the same logical value in each sub-query)
  return runQuery(sql, essayWhere.params);
}

// ---------------------------------------------------------------------------
// University performance
// ---------------------------------------------------------------------------

export interface UniversityPerformanceRow {
  faculty_id: string;
  essay_count: number;
  interview_count: number;
  avg_essay_score: number;
  avg_interview_score: number;
}

/**
 * Get performance metrics grouped by faculty for a specific university.
 */
export async function getUniversityPerformance(
  universityId: string
): Promise<UniversityPerformanceRow[] | null> {
  const client = getBigQueryClient();
  if (!client) return null;

  const sql = `
    SELECT
      COALESCE(e.faculty_id, i.faculty_id) AS faculty_id,
      COALESCE(e.essay_count, 0)           AS essay_count,
      COALESCE(i.interview_count, 0)       AS interview_count,
      COALESCE(e.avg_essay_score, 0)       AS avg_essay_score,
      COALESCE(i.avg_interview_score, 0)   AS avg_interview_score
    FROM (
      SELECT
        faculty_id,
        COUNT(*)           AS essay_count,
        AVG(score_total)   AS avg_essay_score
      FROM \`${BQ_DATASET_NAME}.essay_submissions\`
      WHERE university_id = @universityId
      GROUP BY faculty_id
    ) e
    FULL OUTER JOIN (
      SELECT
        faculty_id,
        COUNT(*)           AS interview_count,
        AVG(score_total)   AS avg_interview_score
      FROM \`${BQ_DATASET_NAME}.interview_sessions\`
      WHERE university_id = @universityId
      GROUP BY faculty_id
    ) i
    ON e.faculty_id = i.faculty_id
    ORDER BY faculty_id
  `;

  const params: BQParam[] = [
    {
      name: "universityId",
      parameterType: { type: "STRING" },
      parameterValue: { value: universityId },
    },
  ];

  return runQuery(sql, params);
}

// ---------------------------------------------------------------------------
// Student comparison (student vs. overall average)
// ---------------------------------------------------------------------------

export interface StudentComparisonResult {
  student: {
    essay_count: number;
    interview_count: number;
    avg_essay_score: number;
    avg_interview_score: number;
  };
  overall: {
    essay_count: number;
    interview_count: number;
    avg_essay_score: number;
    avg_interview_score: number;
  };
}

/**
 * Compare a student's aggregate metrics against the platform average.
 */
export async function getStudentComparison(
  studentId: string
): Promise<StudentComparisonResult | null> {
  const client = getBigQueryClient();
  if (!client) return null;

  // Query 1: student stats
  const studentSql = `
    SELECT
      (SELECT COUNT(*) FROM \`${BQ_DATASET_NAME}.essay_submissions\` WHERE user_id = @studentId) AS essay_count,
      (SELECT COUNT(*) FROM \`${BQ_DATASET_NAME}.interview_sessions\` WHERE user_id = @studentId) AS interview_count,
      (SELECT AVG(score_total) FROM \`${BQ_DATASET_NAME}.essay_submissions\` WHERE user_id = @studentId) AS avg_essay_score,
      (SELECT AVG(score_total) FROM \`${BQ_DATASET_NAME}.interview_sessions\` WHERE user_id = @studentId) AS avg_interview_score
  `;

  // Query 2: overall stats
  const overallSql = `
    SELECT
      (SELECT COUNT(*) FROM \`${BQ_DATASET_NAME}.essay_submissions\`) AS essay_count,
      (SELECT COUNT(*) FROM \`${BQ_DATASET_NAME}.interview_sessions\`) AS interview_count,
      (SELECT AVG(score_total) FROM \`${BQ_DATASET_NAME}.essay_submissions\`) AS avg_essay_score,
      (SELECT AVG(score_total) FROM \`${BQ_DATASET_NAME}.interview_sessions\`) AS avg_interview_score
  `;

  const params: BQParam[] = [
    {
      name: "studentId",
      parameterType: { type: "STRING" },
      parameterValue: { value: studentId },
    },
  ];

  try {
    const studentRows = await runQuery(studentSql, params);
    const overallRows = await runQuery(overallSql, []);

    if (!studentRows || !overallRows || studentRows.length === 0 || overallRows.length === 0) {
      return null;
    }

    const s = studentRows[0];
    const o = overallRows[0];

    return {
      student: {
        essay_count: Number(s.essay_count ?? 0),
        interview_count: Number(s.interview_count ?? 0),
        avg_essay_score: Number(s.avg_essay_score ?? 0),
        avg_interview_score: Number(s.avg_interview_score ?? 0),
      },
      overall: {
        essay_count: Number(o.essay_count ?? 0),
        interview_count: Number(o.interview_count ?? 0),
        avg_essay_score: Number(o.avg_essay_score ?? 0),
        avg_interview_score: Number(o.avg_interview_score ?? 0),
      },
    };
  } catch (err) {
    console.error("[BQ] getStudentComparison failed:", err);
    return null;
  }
}
