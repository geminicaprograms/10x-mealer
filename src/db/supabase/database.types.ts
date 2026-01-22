export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_usage_log: {
        Row: {
          receipt_scan_count: number;
          substitution_count: number;
          usage_date: string;
          user_id: string;
        };
        Insert: {
          receipt_scan_count?: number;
          substitution_count?: number;
          usage_date: string;
          user_id: string;
        };
        Update: {
          receipt_scan_count?: number;
          substitution_count?: number;
          usage_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      inventory_items: {
        Row: {
          created_at: string;
          custom_name: string | null;
          id: string;
          is_available: boolean;
          is_staple: boolean;
          product_id: number | null;
          quantity: number | null;
          unit_id: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          custom_name?: string | null;
          id?: string;
          is_available?: boolean;
          is_staple?: boolean;
          product_id?: number | null;
          quantity?: number | null;
          unit_id?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          custom_name?: string | null;
          id?: string;
          is_available?: boolean;
          is_staple?: boolean;
          product_id?: number | null;
          quantity?: number | null;
          unit_id?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_items_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      product_catalog: {
        Row: {
          aliases: string[];
          category_id: number | null;
          default_unit_id: number | null;
          id: number;
          name_pl: string;
          search_vector: unknown;
        };
        Insert: {
          aliases?: string[];
          category_id?: number | null;
          default_unit_id?: number | null;
          id?: number;
          name_pl: string;
          search_vector?: unknown;
        };
        Update: {
          aliases?: string[];
          category_id?: number | null;
          default_unit_id?: number | null;
          id?: number;
          name_pl?: string;
          search_vector?: unknown;
        };
        Relationships: [
          {
            foreignKeyName: "product_catalog_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_catalog_default_unit_id_fkey";
            columns: ["default_unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      product_categories: {
        Row: {
          display_order: number;
          id: number;
          name_pl: string;
        };
        Insert: {
          display_order?: number;
          id?: number;
          name_pl: string;
        };
        Update: {
          display_order?: number;
          id?: number;
          name_pl?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          allergies: Json;
          created_at: string;
          diets: Json;
          equipment: Json;
          id: string;
          onboarding_status: string;
          updated_at: string;
        };
        Insert: {
          allergies?: Json;
          created_at?: string;
          diets?: Json;
          equipment?: Json;
          id: string;
          onboarding_status?: string;
          updated_at?: string;
        };
        Update: {
          allergies?: Json;
          created_at?: string;
          diets?: Json;
          equipment?: Json;
          id?: string;
          onboarding_status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      staple_definitions: {
        Row: {
          id: number;
          is_active: boolean;
          product_id: number;
        };
        Insert: {
          id?: number;
          is_active?: boolean;
          product_id: number;
        };
        Update: {
          id?: number;
          is_active?: boolean;
          product_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "staple_definitions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: true;
            referencedRelation: "product_catalog";
            referencedColumns: ["id"];
          },
        ];
      };
      system_config: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      units: {
        Row: {
          abbreviation: string;
          base_unit_multiplier: number;
          id: number;
          name_pl: string;
          unit_type: string;
        };
        Insert: {
          abbreviation: string;
          base_unit_multiplier?: number;
          id?: number;
          name_pl: string;
          unit_type: string;
        };
        Update: {
          abbreviation?: string;
          base_unit_multiplier?: number;
          id?: number;
          name_pl?: string;
          unit_type?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_ai_usage: {
        Args: { p_usage_type: string; p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
