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

export function useClassStudentCount(classId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["class_student_count", classId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("class_students")
        .select("*", { count: "exact", head: true })
        .eq("class_id", classId!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && !!classId,
  });
}
