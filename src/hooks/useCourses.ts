import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Course {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  name: string;
  thematic_plan_file_name: string | null;
  thematic_plan_file_url: string | null;
  created_at: string;
  updated_at: string;
  classes?: { id: string; name: string } | null;
  subjects?: { id: string; name: string } | null;
}

export function useCourses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, classes(id, name), subjects(id, name)")
        .order("name");
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!user,
  });
}

export function useCourse(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["courses", "detail", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, classes(id, name), subjects(id, name)")
        .eq("id", courseId!)
        .single();
      if (error) throw error;
      return data as Course;
    },
    enabled: !!user && !!courseId,
  });
}

export function useCourseLessons(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["courses", "lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, subjects(id, name)")
        .eq("course_id", courseId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!courseId,
  });
}

export function useCourseGoals(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["courses", "goals", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("educational_goals")
        .select("*, subjects(id, name)")
        .eq("course_id", courseId!)
        .order("title");
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!courseId,
  });
}

export function useCreateCourse() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name, classId, subjectId,
      thematicPlanFileName, thematicPlanFileUrl,
    }: {
      name: string; classId: string; subjectId: string;
      thematicPlanFileName?: string | null; thematicPlanFileUrl?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          name,
          class_id: classId,
          subject_id: subjectId,
          teacher_id: user!.id,
          thematic_plan_file_name: thematicPlanFileName || null,
          thematic_plan_file_url: thematicPlanFileUrl || null,
        })
        .select("*, classes(id, name), subjects(id, name)")
        .single();
      if (error) throw error;
      return data as Course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, name, classId, subjectId,
      thematicPlanFileName, thematicPlanFileUrl,
    }: {
      id: string; name: string; classId: string; subjectId: string;
      thematicPlanFileName?: string | null; thematicPlanFileUrl?: string | null;
    }) => {
      const update: Record<string, any> = {
        name,
        class_id: classId,
        subject_id: subjectId,
      };
      if (thematicPlanFileName !== undefined) {
        update.thematic_plan_file_name = thematicPlanFileName;
        update.thematic_plan_file_url = thematicPlanFileUrl || null;
      }
      const { error } = await supabase
        .from("courses")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useLinkGoalToCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, courseId }: { goalId: string; courseId: string }) => {
      const { error } = await supabase
        .from("educational_goals")
        .update({ course_id: courseId })
        .eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useLinkLessonToCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, courseId }: { lessonId: string; courseId: string }) => {
      const { error } = await supabase
        .from("lessons")
        .update({ course_id: courseId })
        .eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

// --- Course seating positions ---

export interface CourseSeat {
  student_id: string;
  seat_row: number;
  seat_col: number;
}

export function useCourseSeating(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["course_seating", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_student_seats")
        .select("student_id, seat_row, seat_col")
        .eq("course_id", courseId!);
      if (error) throw error;
      return (data || []) as CourseSeat[];
    },
    enabled: !!user && !!courseId,
  });
}

export function useSaveCourseSeating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      courseId,
      positions,
    }: {
      courseId: string;
      positions: { studentId: string; row: number | null; col: number | null }[];
    }) => {
      // Delete all existing seats for this course
      const { error: delErr } = await supabase
        .from("course_student_seats")
        .delete()
        .eq("course_id", courseId);
      if (delErr) throw delErr;
      // Insert only positioned students
      const rows = positions
        .filter((p) => p.row != null && p.col != null)
        .map((p) => ({
          course_id: courseId,
          student_id: p.studentId,
          seat_row: p.row!,
          seat_col: p.col!,
        }));
      if (rows.length > 0) {
        const { error: insErr } = await supabase
          .from("course_student_seats")
          .insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["course_seating", vars.courseId] });
    },
  });
}
