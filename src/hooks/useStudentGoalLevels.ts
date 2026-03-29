import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StudentGoalLevel {
  id: string;
  student_id: string;
  goal_id: string;
  level: string;
}

/**
 * Fetch all student-goal levels for a set of goals (e.g. all goals in a course).
 * Returns a map: studentId -> goalId -> level string.
 */
export function useStudentGoalLevels(goalIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student_goal_levels", goalIds],
    queryFn: async () => {
      if (goalIds.length === 0) return {} as Record<string, Record<string, string>>;
      const { data, error } = await supabase
        .from("student_goal_levels")
        .select("student_id, goal_id, level")
        .in("goal_id", goalIds);
      if (error) throw error;

      const map: Record<string, Record<string, string>> = {};
      for (const row of data || []) {
        if (!map[row.student_id]) map[row.student_id] = {};
        map[row.student_id][row.goal_id] = row.level;
      }
      return map;
    },
    enabled: !!user && goalIds.length > 0,
  });
}

/**
 * Upsert a student's level for a goal.
 * Pass level = null to remove the level.
 */
export function useSetStudentGoalLevel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      goalId,
      level,
    }: {
      studentId: string;
      goalId: string;
      level: string | null;
    }) => {
      if (level === null) {
        // Remove
        const { error } = await supabase
          .from("student_goal_levels")
          .delete()
          .eq("student_id", studentId)
          .eq("goal_id", goalId);
        if (error) throw error;
      } else {
        // Upsert
        const { error } = await supabase
          .from("student_goal_levels")
          .upsert(
            {
              student_id: studentId,
              goal_id: goalId,
              level,
              teacher_id: user!.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "student_id,goal_id" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student_goal_levels"] });
    },
  });
}
