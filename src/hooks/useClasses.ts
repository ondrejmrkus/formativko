import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SchoolClass {
  id: string;
  name: string;
  teacher_id: string;
}

export function useClasses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["classes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as SchoolClass[];
    },
    enabled: !!user,
  });
}

export function useClassStudents(classId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["class_students", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_students")
        .select("student_id, students(id, first_name, last_name, teacher_id)")
        .eq("class_id", classId!);
      if (error) throw error;
      return data.map((r: any) => r.students).filter(Boolean);
    },
    enabled: !!user && !!classId,
  });
}

export function useStudentClasses(studentId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student_classes", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_students")
        .select("class_id, classes(id, name)")
        .eq("student_id", studentId!);
      if (error) throw error;
      return data.map((r: any) => r.classes).filter(Boolean) as SchoolClass[];
    },
    enabled: !!user && !!studentId,
  });
}

export function useCreateClass() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, studentIds }: { name: string; studentIds: string[] }) => {
      const { data: cls, error } = await supabase
        .from("classes")
        .insert({ name, teacher_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      if (studentIds.length > 0) {
        const rows = studentIds.map((sid) => ({ class_id: cls.id, student_id: sid }));
        const { error: err2 } = await supabase.from("class_students").insert(rows);
        if (err2) throw err2;
      }
      return cls;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["class_students"] });
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ classId, name, studentIds }: { classId: string; name: string; studentIds: string[] }) => {
      const { error } = await supabase.from("classes").update({ name }).eq("id", classId);
      if (error) throw error;
      const { error: delErr } = await supabase.from("class_students").delete().eq("class_id", classId);
      if (delErr) throw delErr;
      if (studentIds.length > 0) {
        const rows = studentIds.map((sid) => ({ class_id: classId, student_id: sid }));
        const { error: insErr } = await supabase.from("class_students").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["class_students"] });
      queryClient.invalidateQueries({ queryKey: ["student_classes"] });
      queryClient.invalidateQueries({ queryKey: ["all_class_students"] });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (classId: string) => {
      const { error: csErr } = await supabase.from("class_students").delete().eq("class_id", classId);
      if (csErr) throw csErr;
      // Unlink evaluation groups
      const { error: egErr } = await supabase.from("evaluation_groups").update({ class_id: null }).eq("class_id", classId);
      if (egErr) throw egErr;
      // Unlink lessons
      const { error: lErr } = await supabase.from("lessons").update({ class_id: null }).eq("class_id", classId);
      if (lErr) throw lErr;
      const { error } = await supabase.from("classes").delete().eq("id", classId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["class_students"] });
      queryClient.invalidateQueries({ queryKey: ["all_class_students"] });
      queryClient.invalidateQueries({ queryKey: ["student_classes"] });
    },
  });
}

/**
 * Fetches all class_students mappings in bulk (student_id + class_id).
 * Used by B01StudentProfiles and F01Classes.
 */
export function useAllClassStudents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all_class_students", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_students")
        .select("student_id, class_id");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

/**
 * Fetches class_id counts for class_students (used by E01CaptureToolChooseClass).
 */
export function useClassStudentCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["class_student_counts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_students")
        .select("class_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      data.forEach((r) => { map[r.class_id] = (map[r.class_id] || 0) + 1; });
      return map;
    },
    enabled: !!user,
  });
}