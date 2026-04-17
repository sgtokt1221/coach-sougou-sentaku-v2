"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InterviewSkillCheckRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student/skill-check?tab=interview");
  }, [router]);

  return null;
}
