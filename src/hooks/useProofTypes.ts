import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { type ProofTypeRow, type ProofFieldKind } from "@/constants/proofTypes";

/** Fetches custom (teacher-created) proof types from DB. */
export function useCustomProofTypes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["proof_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proof_types")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as ProofTypeRow[];
    },
    enabled: !!user,
  });
}

export function useCreateProofType() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      icon,
      color,
      fields,
      sort_order,
    }: {
      name: string;
      description?: string;
      icon: string;
      color: string;
      fields: ProofFieldKind[];
      sort_order: number;
    }) => {
      const { data, error } = await supabase
        .from("proof_types")
        .insert({ teacher_id: user!.id, name, description: description || "", icon, color, fields, sort_order })
        .select()
        .single();
      if (error) throw error;
      return data as ProofTypeRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proof_types"] });
    },
  });
}

export function useUpdateProofType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      icon,
      color,
      fields,
      sort_order,
    }: {
      id: string;
      name?: string;
      description?: string;
      icon?: string;
      color?: string;
      fields?: ProofFieldKind[];
      sort_order?: number;
    }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (icon !== undefined) updates.icon = icon;
      if (color !== undefined) updates.color = color;
      if (fields !== undefined) updates.fields = fields;
      if (sort_order !== undefined) updates.sort_order = sort_order;

      const { error } = await supabase
        .from("proof_types")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proof_types"] });
    },
  });
}

export function useDeleteProofType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proof_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proof_types"] });
    },
  });
}

export function useReorderProofTypes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from("proof_types")
          .update({ sort_order: item.sort_order })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proof_types"] });
    },
  });
}
