import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Subject {
  id: string;
  teacher_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function useSubjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Subject[];
    },
    enabled: !!user,
  });
}

export function useSubject(subjectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subjects", "detail", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", subjectId!)
        .single();
      if (error) throw error;
      return data as Subject;
    },
    enabled: !!user && !!subjectId,
  });
}

export function useCreateSubject() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const { data, error } = await supabase
        .from("subjects")
        .insert({ name, teacher_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Subject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("subjects")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subjectId: string) => {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", subjectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
