import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StudentGroup {
  id: string;
  class_id: string;
  teacher_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
  member_ids: string[];
}

export function useStudentGroups(classId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["student_groups", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_groups")
        .select("*, student_group_members(student_id)")
        .eq("class_id", classId!)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data || []).map((g: any) => ({
        id: g.id,
        class_id: g.class_id,
        teacher_id: g.teacher_id,
        name: g.name,
        color: g.color,
        sort_order: g.sort_order,
        created_at: g.created_at,
        member_ids: (g.student_group_members || []).map((m: any) => m.student_id),
      })) as StudentGroup[];
    },
    enabled: !!user && !!classId,
  });
}

export function useCreateStudentGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      classId,
      name,
      color,
      memberIds,
    }: {
      classId: string;
      name: string;
      color?: string;
      memberIds: string[];
    }) => {
      const { data: group, error } = await supabase
        .from("student_groups")
        .insert({ class_id: classId, teacher_id: user!.id, name, color: color || null })
        .select()
        .single();
      if (error) throw error;
      if (memberIds.length > 0) {
        const rows = memberIds.map((sid) => ({ group_id: group.id, student_id: sid }));
        const { error: memErr } = await supabase.from("student_group_members").insert(rows);
        if (memErr) throw memErr;
      }
      return group;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["student_groups", vars.classId] });
    },
  });
}

export function useUpdateStudentGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      classId,
      name,
      color,
      memberIds,
    }: {
      groupId: string;
      classId: string;
      name: string;
      color?: string;
      memberIds: string[];
    }) => {
      const { error } = await supabase
        .from("student_groups")
        .update({ name, color: color || null })
        .eq("id", groupId);
      if (error) throw error;
      // Replace members
      const { error: delErr } = await supabase
        .from("student_group_members")
        .delete()
        .eq("group_id", groupId);
      if (delErr) throw delErr;
      if (memberIds.length > 0) {
        const rows = memberIds.map((sid) => ({ group_id: groupId, student_id: sid }));
        const { error: insErr } = await supabase.from("student_group_members").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["student_groups", vars.classId] });
    },
  });
}

export function useDeleteStudentGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, classId }: { groupId: string; classId: string }) => {
      const { error } = await supabase.from("student_groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["student_groups", vars.classId] });
    },
  });
}
