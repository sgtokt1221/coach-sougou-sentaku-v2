import { z } from "zod";

export const RequirementsSchema = z.object({
  gpa: z.number().nullable(),
  englishCert: z.string().nullable(),
  otherReqs: z.array(z.string()),
});

export const SelectionMethodSchema = z.object({
  stage: z.number(),
  type: z.enum(["documents", "essay", "interview", "presentation", "test", "other"]),
  details: z.string(),
});

export const ScheduleSchema = z.object({
  applicationStart: z.string(),
  applicationEnd: z.string(),
  examDate: z.string(),
  resultDate: z.string(),
});

export const InterviewTendencySchema = z.object({
  format: z.string(),
  duration: z.string(),
  interviewers: z.string(),
  pressure: z.enum(["low", "medium", "high"]),
  weight: z.string(),
  frequentTopics: z.array(z.string()),
  tips: z.string(),
});

export const FacultySchema = z.object({
  id: z.string(),
  name: z.string(),
  admissionPolicy: z.string(),
  capacity: z.number(),
  requirements: RequirementsSchema,
  selectionMethods: z.array(SelectionMethodSchema),
  schedule: ScheduleSchema,
  interviewTendency: InterviewTendencySchema.optional(),
  academicField: z.string().optional(),
  admissionUrl: z.string().optional(),
  selectionType: z.enum(["comprehensive", "school_recommendation"]).optional(),
});

export const UniversitySchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  group: z.enum([
    "kyutei",
    "soukeijochi",
    "march",
    "kankandouritsu",
    "sankinkohryu",
    "nittoukomasen",
    "seiseimeidoku",
    "sesshintsuitou",
    "national",
    "public",
    "private",
  ]),
  officialUrl: z.string(),
  prefecture: z.string().min(1),
  faculties: z.array(FacultySchema),
});

export const UniversityListSchema = z.array(UniversitySchema);
