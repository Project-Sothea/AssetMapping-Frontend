export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Form = Database['public']['Tables']['forms']['Row'];
export type Pin = Database['public']['Tables']['pins']['Row'];

export type Database = {
  public: {
    Tables: {
      forms: {
        Row: {
          brush_teeth: string | null;
          can_attend: string;
          cholesterol: string | null;
          cholesterol_action: string[] | null;
          cold_action: string[] | null;
          cold_look_like: string | null;
          condition_details: string | null;
          created_at: string;
          deleted_at: string | null;
          diabetes: string | null;
          diabetes_action: string[] | null;
          diarrhoea: string | null;
          diarrhoea_action: string | null;
          eat_clean_food: string | null;
          hand_after_toilet: string | null;
          hand_before_meal: string | null;
          have_toothbrush: string | null;
          hypertension: string | null;
          hypertension_action: string[] | null;
          id: string;
          is_active: boolean;
          know_doctor: string | null;
          know_water_filters: string | null;
          last_modified_by: string;
          long_term_conditions: string[] | null;
          management_methods: string[] | null;
          msk_action: string[] | null;
          msk_injury: string | null;
          not_using_water_filter: string[] | null;
          other_brush_teeth: string | null;
          other_buy_medicine: string | null;
          other_condition: string | null;
          other_learning: string | null;
          other_management: string | null;
          other_sick_action: string | null;
          other_water_filter_reason: string | null;
          other_water_source: string | null;
          own_transport: string | null;
          pin_id: string | null;
          poverty_card: string | null;
          unsafe_water: string[] | null;
          updated_at: string | null;
          village: string;
          village_id: string;
          water_sources: string[] | null;
          what_do_when_sick: string[] | null;
          where_buy_medicine: string | null;
        };
        Insert: {
          brush_teeth?: string | null;
          can_attend: string;
          cholesterol?: string | null;
          cholesterol_action?: string[] | null;
          cold_action?: string[] | null;
          cold_look_like?: string | null;
          condition_details?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          diabetes?: string | null;
          diabetes_action?: string[] | null;
          diarrhoea?: string | null;
          diarrhoea_action?: string | null;
          eat_clean_food?: string | null;
          hand_after_toilet?: string | null;
          hand_before_meal?: string | null;
          have_toothbrush?: string | null;
          hypertension?: string | null;
          hypertension_action?: string[] | null;
          id?: string;
          is_active?: boolean;
          know_doctor?: string | null;
          know_water_filters?: string | null;
          last_modified_by: string;
          long_term_conditions?: string[] | null;
          management_methods?: string[] | null;
          msk_action?: string[] | null;
          msk_injury?: string | null;
          not_using_water_filter?: string[] | null;
          other_brush_teeth?: string | null;
          other_buy_medicine?: string | null;
          other_condition?: string | null;
          other_learning?: string | null;
          other_management?: string | null;
          other_sick_action?: string | null;
          other_water_filter_reason?: string | null;
          other_water_source?: string | null;
          own_transport?: string | null;
          pin_id?: string | null;
          poverty_card?: string | null;
          unsafe_water?: string[] | null;
          updated_at?: string | null;
          village: string;
          village_id: string;
          water_sources?: string[] | null;
          what_do_when_sick?: string[] | null;
          where_buy_medicine?: string | null;
        };
        Update: {
          brush_teeth?: string | null;
          can_attend?: string;
          cholesterol?: string | null;
          cholesterol_action?: string[] | null;
          cold_action?: string[] | null;
          cold_look_like?: string | null;
          condition_details?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          diabetes?: string | null;
          diabetes_action?: string[] | null;
          diarrhoea?: string | null;
          diarrhoea_action?: string | null;
          eat_clean_food?: string | null;
          hand_after_toilet?: string | null;
          hand_before_meal?: string | null;
          have_toothbrush?: string | null;
          hypertension?: string | null;
          hypertension_action?: string[] | null;
          id?: string;
          is_active?: boolean;
          know_doctor?: string | null;
          know_water_filters?: string | null;
          last_modified_by?: string;
          long_term_conditions?: string[] | null;
          management_methods?: string[] | null;
          msk_action?: string[] | null;
          msk_injury?: string | null;
          not_using_water_filter?: string[] | null;
          other_brush_teeth?: string | null;
          other_buy_medicine?: string | null;
          other_condition?: string | null;
          other_learning?: string | null;
          other_management?: string | null;
          other_sick_action?: string | null;
          other_water_filter_reason?: string | null;
          other_water_source?: string | null;
          own_transport?: string | null;
          pin_id?: string | null;
          poverty_card?: string | null;
          unsafe_water?: string[] | null;
          updated_at?: string | null;
          village?: string;
          village_id?: string;
          water_sources?: string[] | null;
          what_do_when_sick?: string[] | null;
          where_buy_medicine?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'forms_last_modified_by_fkey';
            columns: ['last_modified_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'forms_pin_id_fkey';
            columns: ['pin_id'];
            isOneToOne: false;
            referencedRelation: 'pins';
            referencedColumns: ['id'];
          },
        ];
      };
      pins: {
        Row: {
          address: string | null;
          country: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          form_id: string | null;
          id: string;
          is_active: boolean;
          last_modified_by: string;
          lat: number;
          lng: number;
          location_name: string;
          metadata: Json | null;
          postal_code: string | null;
          state_province: string | null;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          country?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          form_id?: string | null;
          id: string;
          is_active?: boolean;
          last_modified_by: string;
          lat: number;
          lng: number;
          location_name: string;
          metadata?: Json | null;
          postal_code?: string | null;
          state_province?: string | null;
          type: string;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          country?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          form_id?: string | null;
          id?: string;
          is_active?: boolean;
          last_modified_by?: string;
          lat?: number;
          lng?: number;
          location_name?: string;
          metadata?: Json | null;
          postal_code?: string | null;
          state_province?: string | null;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pin_form_id_fkey';
            columns: ['form_id'];
            isOneToOne: false;
            referencedRelation: 'forms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pin_last_modified_by_fkey';
            columns: ['last_modified_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
