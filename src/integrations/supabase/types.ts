export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      class_students: {
        Row: {
          class_id: string
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          class_id: string
          created_at: string
          id: string
          name: string
          subject_id: string
          teacher_id: string
          thematic_plan_file_name: string | null
          thematic_plan_file_url: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          name: string
          subject_id: string
          teacher_id: string
          thematic_plan_file_name?: string | null
          thematic_plan_file_url?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          name?: string
          subject_id?: string
          teacher_id?: string
          thematic_plan_file_name?: string | null
          thematic_plan_file_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      educational_goals: {
        Row: {
          class_id: string
          course_id: string | null
          created_at: string
          description: string
          id: string
          subject_id: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          course_id?: string | null
          created_at?: string
          description?: string
          id?: string
          subject_id?: string | null
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          course_id?: string | null
          created_at?: string
          description?: string
          id?: string
          subject_id?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "educational_goals_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "educational_goals_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "educational_goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_criteria: {
        Row: {
          created_at: string
          description: string
          goal_id: string
          id: string
          level_descriptors: Json
          sort_order: number
        }
        Insert: {
          created_at?: string
          description: string
          goal_id: string
          id?: string
          level_descriptors?: Json
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          goal_id?: string
          id?: string
          level_descriptors?: Json
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "educational_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_groups: {
        Row: {
          class_id: string | null
          course_id: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          id: string
          name: string
          teacher_id: string
          type: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          id?: string
          name: string
          teacher_id: string
          type: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          id?: string
          name?: string
          teacher_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_groups_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string
          goal_id: string | null
          group_id: string | null
          id: string
          period: string
          status: string
          student_id: string
          subject: string
          teacher_id: string
          text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_id?: string | null
          group_id?: string | null
          id?: string
          period: string
          status?: string
          student_id: string
          subject: string
          teacher_id: string
          text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_id?: string | null
          group_id?: string | null
          id?: string
          period?: string
          status?: string
          student_id?: string
          subject?: string
          teacher_id?: string
          text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "educational_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "evaluation_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_goals: {
        Row: {
          goal_id: string
          lesson_id: string
        }
        Insert: {
          goal_id: string
          lesson_id: string
        }
        Update: {
          goal_id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_goals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "educational_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_goals_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          class_id: string | null
          course_id: string | null
          created_at: string
          date: string | null
          id: string
          observation_focus: string
          planned_activities: string
          status: string
          subject_id: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          date?: string | null
          id?: string
          observation_focus?: string
          planned_activities?: string
          status?: string
          subject_id?: string | null
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          date?: string | null
          id?: string
          observation_focus?: string
          planned_activities?: string
          status?: string
          subject_id?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proof_goals: {
        Row: {
          goal_id: string
          proof_id: string
        }
        Insert: {
          goal_id: string
          proof_id: string
        }
        Update: {
          goal_id?: string
          proof_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_goals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "educational_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_goals_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: false
            referencedRelation: "proofs_of_learning"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_skills: {
        Row: {
          proof_id: string
          skill_id: string
        }
        Insert: {
          proof_id: string
          skill_id: string
        }
        Update: {
          proof_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_skills_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: false
            referencedRelation: "proofs_of_learning"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_students: {
        Row: {
          id: string
          proof_id: string
          student_id: string
        }
        Insert: {
          id?: string
          proof_id: string
          student_id: string
        }
        Update: {
          id?: string
          proof_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_students_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: false
            referencedRelation: "proofs_of_learning"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      proofs_of_learning: {
        Row: {
          created_at: string
          date: string
          file_name: string | null
          file_url: string | null
          id: string
          lesson_id: string | null
          note: string | null
          teacher_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          lesson_id?: string | null
          note?: string | null
          teacher_id: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          lesson_id?: string | null
          note?: string | null
          teacher_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proofs_of_learning_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          id: string
          name: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          teacher_id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          communication_preferences: string
          created_at: string
          first_name: string
          id: string
          interests: string
          last_name: string
          learning_styles: string
          notes: string
          svp: boolean
          svp_details: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          communication_preferences?: string
          created_at?: string
          first_name: string
          id?: string
          interests?: string
          last_name: string
          learning_styles?: string
          notes?: string
          svp?: boolean
          svp_details?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          communication_preferences?: string
          created_at?: string
          first_name?: string
          id?: string
          interests?: string
          last_name?: string
          learning_styles?: string
          notes?: string
          svp?: boolean
          svp_details?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          name: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
