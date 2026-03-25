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
