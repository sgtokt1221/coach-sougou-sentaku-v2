import { useAuthSWR } from "@/lib/api/swr";
import type { WritingStreak } from "@/lib/types/writing-streak";

export function useWritingStreak() {
  const { data: streak, error, isLoading, mutate } = useAuthSWR<WritingStreak>(
    "/api/streak"
  );

  return {
    streak,
    isLoading,
    error,
    mutate,
  };
}
