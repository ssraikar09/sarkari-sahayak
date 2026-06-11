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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assistant_queries: {
        Row: {
          citizen_profile_id: string | null
          created_at: string
          id: string
          query: string
          retrieved_scheme_ids: string[]
        }
        Insert: {
          citizen_profile_id?: string | null
          created_at?: string
          id?: string
          query: string
          retrieved_scheme_ids?: string[]
        }
        Update: {
          citizen_profile_id?: string | null
          created_at?: string
          id?: string
          query?: string
          retrieved_scheme_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "assistant_queries_citizen_profile_id_fkey"
            columns: ["citizen_profile_id"]
            isOneToOne: false
            referencedRelation: "citizen_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      citizen_profiles: {
        Row: {
          age: number
          annual_income: string
          created_at: string
          disability_status: boolean
          district: string
          education_level: string
          family_members: number
          full_name: string
          gender: string
          id: string
          occupation: string
          preferred_language: string
          state: string
        }
        Insert: {
          age: number
          annual_income: string
          created_at?: string
          disability_status?: boolean
          district: string
          education_level: string
          family_members: number
          full_name: string
          gender: string
          id?: string
          occupation: string
          preferred_language: string
          state: string
        }
        Update: {
          age?: number
          annual_income?: string
          created_at?: string
          disability_status?: boolean
          district?: string
          education_level?: string
          family_members?: number
          full_name?: string
          gender?: string
          id?: string
          occupation?: string
          preferred_language?: string
          state?: string
        }
        Relationships: []
      }
      eligibility_assessments: {
        Row: {
          assessment_date: string
          citizen_profile_id: string
          created_at: string
          id: string
          recommended_scheme_ids: string[]
        }
        Insert: {
          assessment_date?: string
          citizen_profile_id: string
          created_at?: string
          id?: string
          recommended_scheme_ids?: string[]
        }
        Update: {
          assessment_date?: string
          citizen_profile_id?: string
          created_at?: string
          id?: string
          recommended_scheme_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_assessments_citizen_profile_id_fkey"
            columns: ["citizen_profile_id"]
            isOneToOne: false
            referencedRelation: "citizen_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          age: number
          annual_income: string
          citizen_profile_id: string
          created_at: string
          disability_status: boolean
          education_level: string
          full_name: string
          gender: string
          id: string
          occupation: string
          relationship: string
        }
        Insert: {
          age: number
          annual_income: string
          citizen_profile_id: string
          created_at?: string
          disability_status?: boolean
          education_level: string
          full_name: string
          gender: string
          id?: string
          occupation: string
          relationship: string
        }
        Update: {
          age?: number
          annual_income?: string
          citizen_profile_id?: string
          created_at?: string
          disability_status?: boolean
          education_level?: string
          full_name?: string
          gender?: string
          id?: string
          occupation?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_citizen_profile_id_fkey"
            columns: ["citizen_profile_id"]
            isOneToOne: false
            referencedRelation: "citizen_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      government_schemes: {
        Row: {
          application_process: string | null
          benefits: string
          category: string
          contact_info: string | null
          created_at: string
          description: string
          eligibility_criteria: string
          id: string
          important_dates: string | null
          last_updated: string
          official_link: string | null
          required_documents: string
          scheme_name: string
          scheme_scope: string
          state: string
        }
        Insert: {
          application_process?: string | null
          benefits: string
          category: string
          contact_info?: string | null
          created_at?: string
          description: string
          eligibility_criteria: string
          id?: string
          important_dates?: string | null
          last_updated?: string
          official_link?: string | null
          required_documents: string
          scheme_name: string
          scheme_scope?: string
          state: string
        }
        Update: {
          application_process?: string | null
          benefits?: string
          category?: string
          contact_info?: string | null
          created_at?: string
          description?: string
          eligibility_criteria?: string
          id?: string
          important_dates?: string | null
          last_updated?: string
          official_link?: string | null
          required_documents?: string
          scheme_name?: string
          scheme_scope?: string
          state?: string
        }
        Relationships: []
      }
      scheme_search_logs: {
        Row: {
          created_at: string
          id: string
          search_query: string
          state_selected: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          search_query: string
          state_selected?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          search_query?: string
          state_selected?: string | null
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
