import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  teacher_id: string;
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

export function getStudentDisplayName(s: { first_name: string; last_name: string }) {
  return `${s.first_name} ${s.last_name}`;
}

export function getStudentShortName(s: { first_name: string; last_name: string }) {
  return `${s.first_name} ${s.last_name.charAt(0)}.`;
}
