import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { LevelDescriptor } from "@/constants/goalLevels";

export interface EvaluationCriterion {
  id: string;
  goal_id: string;
  description: string;
  level_descriptors: LevelDescriptor[];
  sort_order: number;
}

export interface EducationalGoal {
  id: string;
  teacher_id: string;
  class_id: string;
  title: string;
  description: string;
  subject_id: string | null;
  course_id: string | null;
  created_at: string;
  updated_at: string;
  subjects?: { id: string; name: string } | null;
}

export interface GoalWithCriteria extends EducationalGoal {
  evaluation_criteria: EvaluationCriterion[];
}

export function useGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("educational_goals")
        .select("*, subjects(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EducationalGoal[];
    },
    enabled: !!user,
  });
}

export function useGoalsForClass(classId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goals", "class", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("educational_goals")
        .select("*, subjects(id, name)")
        .eq("class_id", classId!)
        .order("title");
      if (error) throw error;
      return (data as EducationalGoal[]).sort((a, b) => {
        const aName = a.subjects?.name || "";
        const bName = b.subjects?.name || "";
        return aName.localeCompare(bName) || a.title.localeCompare(b.title);
      });
    },
    enabled: !!user && !!classId,
  });
}

export function useGoalsForCourse(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goals", "course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("educational_goals")
        .select("*, subjects(id, name), evaluation_criteria(*)")
        .eq("course_id", courseId!)
        .order("title");
      if (error) throw error;
      return (data as GoalWithCriteria[]).map((g) => {
        g.evaluation_criteria.sort((a, b) => a.sort_order - b.sort_order);
        return g;
      });
    },
    enabled: !!user && !!courseId,
  });
}

export function useGoal(goalId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goals", "detail", goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("educational_goals")
        .select("*, subjects(id, name), evaluation_criteria(*)")
        .eq("id", goalId!)
        .single();
      if (error) throw error;
      const goal = data as GoalWithCriteria;
      goal.evaluation_criteria.sort((a, b) => a.sort_order - b.sort_order);
      return goal;
    },
    enabled: !!user && !!goalId,
  });
}

export function useCreateGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId, title, description, subjectId, criteria, courseId,
    }: {
      classId: string; title: string; description: string; subjectId: string | null;
      criteria: { description: string; level_descriptors: LevelDescriptor[]; sort_order: number }[];
      courseId?: string | null;
    }) => {
      const { data: goal, error } = await supabase
        .from("educational_goals")
        .insert({ class_id: classId, title, description, subject_id: subjectId, teacher_id: user!.id, course_id: courseId || null })
        .select()
        .single();
      if (error) throw error;

      if (criteria.length > 0) {
        const rows = criteria.map((c) => ({
          goal_id: goal.id,
          description: c.description,
          level_descriptors: c.level_descriptors,
          sort_order: c.sort_order,
        }));
        const { error: err2 } = await supabase.from("evaluation_criteria").insert(rows);
        if (err2) throw err2;
      }

      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, classId, title, description, subjectId, criteria, courseId,
    }: {
      id: string; classId: string; title: string; description: string; subjectId: string | null;
      criteria: { description: string; level_descriptors: LevelDescriptor[]; sort_order: number }[];
      courseId?: string | null;
    }) => {
      const { error } = await supabase
        .from("educational_goals")
        .update({ class_id: classId, title, description, subject_id: subjectId, course_id: courseId || null })
        .eq("id", id);
      if (error) throw error;

      // Replace criteria: delete all, then insert new
      const { error: delErr } = await supabase
        .from("evaluation_criteria")
        .delete()
        .eq("goal_id", id);
      if (delErr) throw delErr;

      if (criteria.length > 0) {
        const rows = criteria.map((c) => ({
          goal_id: id,
          description: c.description,
          level_descriptors: c.level_descriptors,
          sort_order: c.sort_order,
        }));
        const { error: insErr } = await supabase.from("evaluation_criteria").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from("educational_goals")
        .delete()
        .eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["proof_goals"] });
    },
  });
}

/**
 * Fetches criteria counts for all goals (used by G01Goals list page).
 */
export function useAllGoalCriteriaCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goals", "criteria_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluation_criteria")
        .select("goal_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data) {
        map[r.goal_id] = (map[r.goal_id] || 0) + 1;
      }
      return map;
    },
    enabled: !!user,
  });
}

/**
 * Fetches proof counts for all goals (used by G01Goals list page).
 */
export function useAllGoalProofCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goals", "proof_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proof_goals")
        .select("goal_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data) {
        map[r.goal_id] = (map[r.goal_id] || 0) + 1;
      }
      return map;
    },
    enabled: !!user,
  });
}

/**
 * Fetches linked proofs with student info for a specific goal.
 */
export function useGoalLinkedProofs(goalId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goals", "linked_proofs", goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proof_goals")
        .select("proof_id, proofs_of_learning(id, title, type, date, note)")
        .eq("goal_id", goalId!);
      if (error) throw error;

      const proofs = data.map((r: any) => r.proofs_of_learning).filter(Boolean);
      const proofIds = proofs.map((p: any) => p.id);
      if (proofIds.length === 0) return [];

      const { data: ps } = await supabase
        .from("proof_students")
        .select("proof_id, student_id, students(id, first_name, last_name)")
        .in("proof_id", proofIds);

      const studentMap: Record<string, any[]> = {};
      for (const link of ps || []) {
        if (!studentMap[link.proof_id]) studentMap[link.proof_id] = [];
        if (link.students) studentMap[link.proof_id].push(link.students);
      }

      return proofs.map((p: any) => ({
        ...p,
        students: studentMap[p.id] || [],
      }));
    },
    enabled: !!user && !!goalId,
  });
}

export function useProofGoals(proofId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["proof_goals", proofId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proof_goals")
        .select("goal_id")
        .eq("proof_id", proofId!);
      if (error) throw error;
      return data.map((r) => r.goal_id);
    },
    enabled: !!user && !!proofId,
  });
}

export function useSetProofGoals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ proofId, goalIds }: { proofId: string; goalIds: string[] }) => {
      const { error: delErr } = await supabase
        .from("proof_goals")
        .delete()
        .eq("proof_id", proofId);
      if (delErr) throw delErr;

      if (goalIds.length > 0) {
        const rows = goalIds.map((gid) => ({ proof_id: proofId, goal_id: gid }));
        const { error: insErr } = await supabase.from("proof_goals").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proof_goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export interface GoalCoverage {
  goal: EducationalGoal;
  proofCount: number;
  /** Ordered level names from the goal's criteria (e.g. ["Začínám", "Rozvíjím se", "Ovládám"]) */
  levelNames: string[];
}

export function useGoalCoverageForStudent(studentId: string | undefined, classIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goal_coverage", studentId, classIds],
    queryFn: async () => {
      if (classIds.length === 0) return [];

      // Fetch all goals for the student's classes
      const { data: goals, error: goalsErr } = await supabase
        .from("educational_goals")
        .select("*, subjects(id, name)")
        .in("class_id", classIds)
        .order("title");
      if (goalsErr) throw goalsErr;
      if (!goals || goals.length === 0) return [];

      const goalIds = goals.map((g) => g.id);

      // Fetch first criterion per goal to get level names
      const { data: criteria, error: critErr } = await supabase
        .from("evaluation_criteria")
        .select("goal_id, level_descriptors, sort_order")
        .in("goal_id", goalIds)
        .order("sort_order", { ascending: true });
      if (critErr) throw critErr;

      const goalLevelNames: Record<string, string[]> = {};
      for (const c of criteria || []) {
        if (!goalLevelNames[c.goal_id] && c.level_descriptors) {
          const descriptors = c.level_descriptors as { level: string; description: string }[];
          goalLevelNames[c.goal_id] = descriptors.map((ld) => ld.level);
        }
      }

      // Fetch student's proof IDs
      const { data: proofLinks, error: plErr } = await supabase
        .from("proof_students")
        .select("proof_id")
        .eq("student_id", studentId!);
      if (plErr) throw plErr;
      const proofIds = (proofLinks || []).map((r) => r.proof_id);

      if (proofIds.length === 0) {
        return goals.map((g) => ({
          goal: g as EducationalGoal,
          proofCount: 0,
          levelNames: goalLevelNames[g.id] || [],
        }));
      }

      // Fetch proof-goal links for those proofs
      const { data: pgLinks, error: pgErr } = await supabase
        .from("proof_goals")
        .select("proof_id, goal_id")
        .in("proof_id", proofIds);
      if (pgErr) throw pgErr;

      // Count per goal
      const countMap: Record<string, number> = {};
      for (const link of pgLinks || []) {
        countMap[link.goal_id] = (countMap[link.goal_id] || 0) + 1;
      }

      return goals.map((g) => ({
        goal: g as EducationalGoal,
        proofCount: countMap[g.id] || 0,
        levelNames: goalLevelNames[g.id] || [],
      }));
    },
    enabled: !!user && !!studentId && classIds.length > 0,
  });
}
