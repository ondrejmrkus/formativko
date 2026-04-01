import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_LEVEL_DESCRIPTORS } from "@/constants/goalLevels";

/**
 * Fetches criteria-based level descriptors for a set of goal IDs.
 * Returns a map of goalId -> level name array.
 */
export function useGoalCriteriaLevels(goalIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["course_goal_criteria", goalIds],
    queryFn: async () => {
      if (goalIds.length === 0) return {};
      const { data, error } = await supabase
        .from("evaluation_criteria")
        .select("goal_id, level_descriptors")
        .in("goal_id", goalIds)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const row of data || []) {
        if (map[row.goal_id]) continue;
        const descriptors = row.level_descriptors as any[];
        if (descriptors?.length > 0) {
          map[row.goal_id] = descriptors.map((ld: any) => ld.level);
        }
      }
      return map;
    },
    enabled: !!user && goalIds.length > 0,
  });
}

/**
 * Fetches proof counts per goal.
 */
export function useGoalProofCounts(goalIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["course_goal_proof_counts", goalIds],
    queryFn: async () => {
      if (goalIds.length === 0) return {};
      const { data, error } = await supabase
        .from("proof_goals")
        .select("goal_id")
        .in("goal_id", goalIds);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data) {
        map[r.goal_id] = (map[r.goal_id] || 0) + 1;
      }
      return map;
    },
    enabled: !!user && goalIds.length > 0,
  });
}

/**
 * Fetches criteria counts per goal.
 */
export function useGoalCriteriaCounts(goalIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["course_goal_criteria_counts", goalIds],
    queryFn: async () => {
      if (goalIds.length === 0) return {};
      const { data, error } = await supabase
        .from("evaluation_criteria")
        .select("goal_id")
        .in("goal_id", goalIds);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data) {
        map[r.goal_id] = (map[r.goal_id] || 0) + 1;
      }
      return map;
    },
    enabled: !!user && goalIds.length > 0,
  });
}

/**
 * Resolves goal levels: uses criteria-based levels when available, falls back to defaults.
 */
export function useResolvedGoalLevels(goalIds: string[]) {
  const { data: goalCriteriaMap = {} } = useGoalCriteriaLevels(goalIds);

  const resolvedGoalLevels = useMemo(() => {
    const defaults = DEFAULT_LEVEL_DESCRIPTORS.map((ld) => ld.level);
    const map: Record<string, string[]> = {};
    for (const gId of goalIds) {
      map[gId] = goalCriteriaMap[gId] || defaults;
    }
    return map;
  }, [goalIds, goalCriteriaMap]);

  return resolvedGoalLevels;
}

/**
 * Fetches goal counts per course.
 */
export function useCourseGoalCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["courses", "goal_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("educational_goals")
        .select("course_id")
        .not("course_id", "is", null);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data) {
        if (r.course_id) map[r.course_id] = (map[r.course_id] || 0) + 1;
      }
      return map;
    },
    enabled: !!user,
  });
}
