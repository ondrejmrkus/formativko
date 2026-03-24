import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  teacher_id: string;
  svp: boolean;
  notes: string;
}

export function useStudents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["students", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!user,
  });
}

export function useStudent(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["students", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Student;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateStudents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (students: { first_name: string; last_name: string }[]) => {
      const rows = students.map((s) => ({ ...s, teacher_id: user!.id }));
      const { data, error } = await supabase.from("students").insert(rows).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, first_name, last_name, svp, notes }: { id: string; first_name: string; last_name: string; svp?: boolean; notes?: string }) => {
      const { error } = await supabase
        .from("students")
        .update({ first_name, last_name, svp: svp ?? false, notes: notes ?? "" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete related records first
      const { error: psErr } = await supabase.from("proof_students").delete().eq("student_id", id);
      if (psErr) throw psErr;
      const { error: csErr } = await supabase.from("class_students").delete().eq("student_id", id);
      if (csErr) throw csErr;
      const { error: evErr } = await supabase.from("evaluations").delete().eq("student_id", id);
      if (evErr) throw evErr;
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["class_students"] });
      queryClient.invalidateQueries({ queryKey: ["all_class_students"] });
    },
  });
}

export function getStudentDisplayName(s: { first_name: string; last_name: string }) {
  return s.last_name ? `${s.first_name} ${s.last_name.charAt(0)}.` : s.first_name;
}

export function getStudentShortName(s: { first_name: string; last_name: string }) {
  return `${s.first_name} ${s.last_name.charAt(0)}.`;
}
