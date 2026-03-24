import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProofOfLearning {
  id: string;
  title: string;
  type: string;
  date: string;
  note: string | null;
  lesson_id: string | null;
  file_name: string | null;
  file_url: string | null;
  teacher_id: string;
}

export interface ProofWithStudents extends ProofOfLearning {
  studentIds: string[];
}

export function useProofsForStudent(studentId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["proofs", "student", studentId],
    queryFn: async () => {
      // Fetch proofs
      const { data, error } = await supabase
        .from("proof_students")
        .select("proof_id, proofs_of_learning(*)")
        .eq("student_id", studentId!);
      if (error) throw error;
      const proofs = data.map((r: any) => r.proofs_of_learning).filter(Boolean) as ProofOfLearning[];
      return proofs;
    },
    enabled: !!user && !!studentId,
  });
}

export function useProof(proofId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["proofs", proofId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proofs_of_learning")
        .select("*")
        .eq("id", proofId!)
        .single();
      if (error) throw error;

      const { data: ps } = await supabase
        .from("proof_students")
        .select("student_id")
        .eq("proof_id", proofId!);

      return {
        ...data,
        studentIds: ps?.map((r) => r.student_id) || [],
      } as ProofWithStudents;
    },
    enabled: !!user && !!proofId,
  });
}

export function useCreateProof() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title, type, note, date, lessonId, studentIds, fileName, fileUrl,
    }: {
      title: string; type: string; note?: string; date: string;
      lessonId?: string | null; studentIds: string[];
      fileName?: string; fileUrl?: string;
    }) => {
      const { data: proof, error } = await supabase
        .from("proofs_of_learning")
        .insert({
          title, type, note: note || "", date,
          lesson_id: lessonId || null, teacher_id: user!.id,
          file_name: fileName || null, file_url: fileUrl || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (studentIds.length > 0) {
        const rows = studentIds.map((sid) => ({ proof_id: proof.id, student_id: sid }));
        const { error: err2 } = await supabase.from("proof_students").insert(rows);
        if (err2) throw err2;
      }

      return proof;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proofs"] });
    },
  });
}

export function useUpdateProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, note, date, lessonId }: {
      id: string; title: string; note: string; date: string; lessonId?: string | null;
    }) => {
      const { error } = await supabase
        .from("proofs_of_learning")
        .update({ title, note, date, lesson_id: lessonId || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proofs"] });
    },
  });
}

export function useDeleteProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: psErr } = await supabase.from("proof_students").delete().eq("proof_id", id);
      if (psErr) throw psErr;
      const { error } = await supabase.from("proofs_of_learning").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proofs"] });
    },
  });
}
