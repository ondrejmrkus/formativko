import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Lesson {
  id: string;
  title: string;
  class_id: string | null;
  subject: string;
  status: string;
  date: string | null;
  teacher_id: string;
}

export function useLessons() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lessons", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!user,
  });
}
