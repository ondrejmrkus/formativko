import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { EducationalGoal } from "@/hooks/useGoals";

export interface Lesson {
  id: string;
  title: string;
  class_id: string | null;
  subject_id: string | null;
  course_id: string | null;
  status: string;
  date: string | null;
  planned_activities: string;
  observation_focus: string;
  teacher_id: string;
  subjects?: { id: string; name: string } | null;
}

export function useLessons() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lessons", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, subjects(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!user,
  });
}

export function useLesson(lessonId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lessons", "detail", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, subjects(id, name)")
        .eq("id", lessonId!)
        .single();
      if (error) throw error;
      return data as Lesson;
    },
    enabled: !!user && !!lessonId,
  });
}

export function useLessonGoals(lessonId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lesson_goals", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_goals")
        .select("goal_id, educational_goals(*)")
        .eq("lesson_id", lessonId!);
      if (error) throw error;
      return data.map((r: any) => r.educational_goals).filter(Boolean) as EducationalGoal[];
    },
    enabled: !!user && !!lessonId,
  });
}

export function useCreateLesson() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId, title, subjectId, status, date, plannedActivities, observationFocus, goalIds, courseId,
    }: {
      classId: string; title: string; subjectId: string | null; status: string;
      date: string | null; plannedActivities: string; observationFocus: string;
      goalIds: string[]; courseId?: string | null;
    }) => {
      const { data: lesson, error } = await supabase
        .from("lessons")
        .insert({
          class_id: classId, title, subject_id: subjectId, status,
          date: date || null, planned_activities: plannedActivities,
          observation_focus: observationFocus, teacher_id: user!.id,
          course_id: courseId || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (goalIds.length > 0) {
        const rows = goalIds.map((gid) => ({ lesson_id: lesson.id, goal_id: gid }));
        const { error: err2 } = await supabase.from("lesson_goals").insert(rows);
        if (err2) throw err2;
      }

      return lesson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["lesson_goals"] });
    },
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, classId, title, subjectId, status, date, plannedActivities, observationFocus, goalIds, courseId,
    }: {
      id: string; classId: string; title: string; subjectId: string | null; status: string;
      date: string | null; plannedActivities: string; observationFocus: string;
      goalIds: string[]; courseId?: string | null;
    }) => {
      const { error } = await supabase
        .from("lessons")
        .update({
          class_id: classId, title, subject_id: subjectId, status,
          date: date || null, planned_activities: plannedActivities,
          observation_focus: observationFocus,
          course_id: courseId || null,
        })
        .eq("id", id);
      if (error) throw error;

      // Replace goals
      const { error: delErr } = await supabase.from("lesson_goals").delete().eq("lesson_id", id);
      if (delErr) throw delErr;

      if (goalIds.length > 0) {
        const rows = goalIds.map((gid) => ({ lesson_id: id, goal_id: gid }));
        const { error: insErr } = await supabase.from("lesson_goals").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["lesson_goals"] });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      // Nullify lesson_id on linked proofs
      const { error: pErr } = await supabase
        .from("proofs_of_learning")
        .update({ lesson_id: null })
        .eq("lesson_id", lessonId);
      if (pErr) throw pErr;

      const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["lesson_goals"] });
      queryClient.invalidateQueries({ queryKey: ["proofs"] });
    },
  });
}

export interface StudentGoalCoverage {
  studentId: string;
  goalCounts: Record<string, number>; // goalId -> proof count
}

export function useLessonStudentOverview(classId: string | undefined, goalIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lesson_student_overview", classId, goalIds],
    queryFn: async () => {
      if (!classId || goalIds.length === 0) return [];

      // Fetch students in class
      const { data: csData, error: csErr } = await supabase
        .from("class_students")
        .select("student_id, students(id, first_name, last_name)")
        .eq("class_id", classId);
      if (csErr) throw csErr;
      const students = csData.map((r: any) => r.students).filter(Boolean);

      // Fetch proof_goals for these goals
      const { data: pgData, error: pgErr } = await supabase
        .from("proof_goals")
        .select("proof_id, goal_id")
        .in("goal_id", goalIds);
      if (pgErr) throw pgErr;
      if (!pgData || pgData.length === 0) {
        return students.map((s: any) => ({ student: s, goalCounts: {} }));
      }

      // Fetch proof_students for those proofs
      const proofIds = [...new Set(pgData.map((r) => r.proof_id))];
      const { data: psData, error: psErr } = await supabase
        .from("proof_students")
        .select("proof_id, student_id")
        .in("proof_id", proofIds);
      if (psErr) throw psErr;

      // Build student->proof set
      const proofStudents: Record<string, Set<string>> = {};
      for (const ps of psData || []) {
        if (!proofStudents[ps.proof_id]) proofStudents[ps.proof_id] = new Set();
        proofStudents[ps.proof_id].add(ps.student_id);
      }

      // Build coverage: student -> goal -> count
      const studentIds = new Set(students.map((s: any) => s.id));
      const coverage: Record<string, Record<string, number>> = {};
      for (const pg of pgData) {
        const studentsForProof = proofStudents[pg.proof_id] || new Set();
        for (const sid of studentsForProof) {
          if (!studentIds.has(sid)) continue;
          if (!coverage[sid]) coverage[sid] = {};
          coverage[sid][pg.goal_id] = (coverage[sid][pg.goal_id] || 0) + 1;
        }
      }

      return students.map((s: any) => ({
        student: s,
        goalCounts: coverage[s.id] || {},
      }));
    },
    enabled: !!user && !!classId && goalIds.length > 0,
  });
}

/**
 * Fetches proofs linked to a specific lesson.
 */
export function useLessonProofs(lessonId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lessons", "proofs", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proofs_of_learning")
        .select("id, title, type, date, note")
        .eq("lesson_id", lessonId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!lessonId,
  });
}

/**
 * Fetches proof_goals counts per goal for a set of goal IDs.
 */
export function useLessonGoalProofCounts(goalIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lesson_goal_proof_counts", goalIds],
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
 * Fetches lesson counts per course.
 */
export function useCourseLessonCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["courses", "lesson_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
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
