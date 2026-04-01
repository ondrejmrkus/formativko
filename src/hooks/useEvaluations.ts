import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface EvaluationGroup {
  id: string;
  name: string;
  type: string;
  class_id: string | null;
  date_from: string | null;
  date_to: string | null;
  teacher_id: string;
}

export interface Evaluation {
  id: string;
  student_id: string;
  status: string;
  subject: string;
  period: string;
  text: string | null;
  group_id: string | null;
  teacher_id: string;
}

export function useEvaluationGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["evaluation_groups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluation_groups")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EvaluationGroup[];
    },
    enabled: !!user,
  });
}

export function useEvaluationsByGroup(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["evaluations", "group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("*")
        .eq("group_id", groupId!);
      if (error) throw error;
      return data as Evaluation[];
    },
    enabled: !!user && !!groupId,
  });
}

export function useCreateEvaluationGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, type, classId, courseId, dateFrom, dateTo }: {
      name: string; type: string; classId: string; courseId?: string | null; dateFrom: string; dateTo: string;
    }) => {
      const { data, error } = await supabase
        .from("evaluation_groups")
        .insert({
          name, type, class_id: classId,
          course_id: courseId || null,
          date_from: dateFrom, date_to: dateTo,
          teacher_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation_groups"] });
    },
  });
}

export function useCreateEvaluation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, groupId, subject, period, text, status, goalId, sourceProofIds }: {
      studentId: string; groupId: string; subject: string; period: string; text: string; status?: string; goalId?: string | null; sourceProofIds?: string[] | null;
    }) => {
      const { data, error } = await supabase
        .from("evaluations")
        .insert({
          student_id: studentId, group_id: groupId,
          subject, period, text,
          teacher_id: user!.id, status: status || "waiting",
          goal_id: goalId || null,
          source_proof_ids: sourceProofIds || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}

export function useUpdateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text, status }: { id: string; text?: string; status?: string }) => {
      const updates: any = {};
      if (text !== undefined) updates.text = text;
      if (status !== undefined) updates.status = status;
      const { error } = await supabase.from("evaluations").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}

export function useDeleteEvaluationGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      // Delete evaluations in the group first
      const { error: evErr } = await supabase.from("evaluations").delete().eq("group_id", groupId);
      if (evErr) throw evErr;
      const { error } = await supabase.from("evaluation_groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation_groups"] });
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}

/**
 * Fetches all evaluations with id, group_id, and status (for per-group stats).
 */
/**
 * Fetches source proofs by IDs for an evaluation.
 */
export function useSourceProofs(proofIds: string[]) {
  return useQuery({
    queryKey: ["source_proofs", proofIds],
    queryFn: async () => {
      if (proofIds.length === 0) return [];
      const { data, error } = await supabase
        .from("proofs_of_learning")
        .select("id, title, type, date")
        .in("id", proofIds)
        .order("date");
      if (error) throw error;
      return data || [];
    },
    enabled: proofIds.length > 0,
  });
}

export function useAllEvaluationStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["evaluations", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("id, group_id, status");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
