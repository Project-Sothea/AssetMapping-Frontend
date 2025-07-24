export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      forms: {
        Row: {
          brush_teeth: string | null
          can_attend: string | null
          cholesterol: string | null
          cholesterol_action: string[] | null
          cold_action: string[] | null
          cold_look_like: string | null
          condition_details: string | null
          created_at: string
          deleted_at: string | null
          diabetes: string | null
          diabetes_action: string[] | null
          diarrhoea: string | null
          diarrhoea_action: string | null
          eat_clean_food: string | null
          hand_after_toilet: string | null
          hand_before_meal: string | null
          have_toothbrush: string | null
          hypertension: string | null
          hypertension_action: string[] | null
          id: string
          know_doctor: string | null
          know_water_filters: string | null
          long_term_conditions: string[] | null
          management_methods: string[] | null
          msk_action: string[] | null
          msk_injury: string | null
          not_using_water_filter: string[] | null
          other_brush_teeth: string | null
          other_buy_medicine: string | null
          other_condition: string | null
          other_learning: string | null
          other_management: string | null
          other_sick_action: string | null
          other_water_filter_reason: string | null
          other_water_source: string | null
          own_transport: string | null
          pin_id: string | null
          poverty_card: string | null
          unsafe_water: string[] | null
          updated_at: string | null
          village: string | null
          village_id: string | null
          water_sources: string[] | null
          what_do_when_sick: string[] | null
          where_buy_medicine: string | null
        }
        Insert: {
          brush_teeth?: string | null
          can_attend?: string | null
          cholesterol?: string | null
          cholesterol_action?: string[] | null
          cold_action?: string[] | null
          cold_look_like?: string | null
          condition_details?: string | null
          created_at?: string
          deleted_at?: string | null
          diabetes?: string | null
          diabetes_action?: string[] | null
          diarrhoea?: string | null
          diarrhoea_action?: string | null
          eat_clean_food?: string | null
          hand_after_toilet?: string | null
          hand_before_meal?: string | null
          have_toothbrush?: string | null
          hypertension?: string | null
          hypertension_action?: string[] | null
          id?: string
          know_doctor?: string | null
          know_water_filters?: string | null
          long_term_conditions?: string[] | null
          management_methods?: string[] | null
          msk_action?: string[] | null
          msk_injury?: string | null
          not_using_water_filter?: string[] | null
          other_brush_teeth?: string | null
          other_buy_medicine?: string | null
          other_condition?: string | null
          other_learning?: string | null
          other_management?: string | null
          other_sick_action?: string | null
          other_water_filter_reason?: string | null
          other_water_source?: string | null
          own_transport?: string | null
          pin_id?: string | null
          poverty_card?: string | null
          unsafe_water?: string[] | null
          updated_at?: string | null
          village?: string | null
          village_id?: string | null
          water_sources?: string[] | null
          what_do_when_sick?: string[] | null
          where_buy_medicine?: string | null
        }
        Update: {
          brush_teeth?: string | null
          can_attend?: string | null
          cholesterol?: string | null
          cholesterol_action?: string[] | null
          cold_action?: string[] | null
          cold_look_like?: string | null
          condition_details?: string | null
          created_at?: string
          deleted_at?: string | null
          diabetes?: string | null
          diabetes_action?: string[] | null
          diarrhoea?: string | null
          diarrhoea_action?: string | null
          eat_clean_food?: string | null
          hand_after_toilet?: string | null
          hand_before_meal?: string | null
          have_toothbrush?: string | null
          hypertension?: string | null
          hypertension_action?: string[] | null
          id?: string
          know_doctor?: string | null
          know_water_filters?: string | null
          long_term_conditions?: string[] | null
          management_methods?: string[] | null
          msk_action?: string[] | null
          msk_injury?: string | null
          not_using_water_filter?: string[] | null
          other_brush_teeth?: string | null
          other_buy_medicine?: string | null
          other_condition?: string | null
          other_learning?: string | null
          other_management?: string | null
          other_sick_action?: string | null
          other_water_filter_reason?: string | null
          other_water_source?: string | null
          own_transport?: string | null
          pin_id?: string | null
          poverty_card?: string | null
          unsafe_water?: string[] | null
          updated_at?: string | null
          village?: string | null
          village_id?: string | null
          water_sources?: string[] | null
          what_do_when_sick?: string[] | null
          where_buy_medicine?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
      }
      pins: {
        Row: {
          address: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          images: string[] | null
          lat: number | null
          lng: number | null
          name: string | null
          postal_code: string | null
          state_province: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          postal_code?: string | null
          state_province?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          postal_code?: string | null
          state_province?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
