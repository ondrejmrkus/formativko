import { useQuery } from "@tanstack/react-query";
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
