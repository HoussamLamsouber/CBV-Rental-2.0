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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      active_localisations: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          localisation_type: string
          localisation_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          localisation_type: string
          localisation_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          localisation_type?: string
          localisation_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cars: {
        Row: {
          available: boolean | null
          category: string
          created_at: string
          deleted_at: string | null
          fuel: string | null
          id: string
          image_url: string | null
          is_deleted: boolean | null
          name: string
          price: number
          quantity: number
          registration_number: string | null
          seats: number | null
          transmission: string | null
          updated_at: string
        }
        Insert: {
          available?: boolean | null
          category: string
          created_at?: string
          deleted_at?: string | null
          fuel?: string | null
          id: string
          image_url?: string | null
          is_deleted?: boolean | null
          name: string
          price: number
          quantity?: number
          registration_number?: string | null
          seats?: number | null
          transmission?: string | null
          updated_at?: string
        }
        Update: {
          available?: boolean | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          fuel?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          name?: string
          price?: number
          quantity?: number
          registration_number?: string | null
          seats?: number | null
          transmission?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      depot_translations: {
        Row: {
          address: string
          city: string
          created_at: string | null
          depot_id: string
          id: string
          language_code: string
          name: string
          updated_at: string | null
        }
        Insert: {
          address: string
          city: string
          created_at?: string | null
          depot_id: string
          id?: string
          language_code: string
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string | null
          depot_id?: string
          id?: string
          language_code?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "depot_translations_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
        ]
      }
      depots: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      localisation_translations: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          language: string
          localisation_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          language: string
          localisation_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          language?: string
          localisation_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "localisation_translations_localisation_id_fkey"
            columns: ["localisation_id"]
            isOneToOne: false
            referencedRelation: "active_localisations"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          car_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_deleted: boolean | null
          period: string
          price: number
          price_label_en: string | null
          price_label_fr: string | null
          updated_at: string | null
        }
        Insert: {
          car_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          period: string
          price: number
          price_label_en?: string | null
          price_label_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          car_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          period?: string
          price?: number
          price_label_en?: string | null
          price_label_fr?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          adresse: string | null
          created_at: string
          dateNaissance: string | null
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          dateNaissance?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          dateNaissance?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          assigned_vehicle_id: string | null
          car_category: string
          car_id: string
          car_image: string | null
          car_name: string
          car_price: number
          created_at: string
          date: string | null
          deleted_at: string | null
          id: string
          pickup_date: string
          pickup_location: string | null
          pickup_time: string
          rejection_reason: string | null
          return_date: string
          return_location: string | null
          return_time: string
          status: string
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_vehicle_id?: string | null
          car_category: string
          car_id: string
          car_image?: string | null
          car_name: string
          car_price: number
          created_at?: string
          date?: string | null
          deleted_at?: string | null
          id?: string
          pickup_date: string
          pickup_location?: string | null
          pickup_time: string
          rejection_reason?: string | null
          return_date: string
          return_location?: string | null
          return_time: string
          status?: string
          total_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_vehicle_id?: string | null
          car_category?: string
          car_id?: string
          car_image?: string | null
          car_name?: string
          car_price?: number
          created_at?: string
          date?: string | null
          deleted_at?: string | null
          id?: string
          pickup_date?: string
          pickup_location?: string | null
          pickup_time?: string
          rejection_reason?: string | null
          return_date?: string
          return_location?: string | null
          return_time?: string
          status?: string
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_assigned_vehicle_id_fkey"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_pickup_location_fkey"
            columns: ["pickup_location"]
            isOneToOne: false
            referencedRelation: "active_localisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_return_location_fkey"
            columns: ["return_location"]
            isOneToOne: false
            referencedRelation: "active_localisations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          car_id: string
          created_at: string | null
          date_obd: string | null
          deleted_at: string | null
          depot_id: string | null
          id: string
          is_deleted: boolean | null
          matricule: string
          obd: string | null
          objet: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          car_id: string
          created_at?: string | null
          date_obd?: string | null
          deleted_at?: string | null
          depot_id?: string | null
          id?: string
          is_deleted?: boolean | null
          matricule: string
          obd?: string | null
          objet?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          car_id?: string
          created_at?: string | null
          date_obd?: string | null
          deleted_at?: string | null
          depot_id?: string | null
          id?: string
          is_deleted?: boolean | null
          matricule?: string
          obd?: string | null
          objet?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_user_deletion: { Args: { user_id: string }; Returns: undefined }
      create_guest_reservation: {
        Args: {
          p_car_category: string
          p_car_id: string
          p_car_image?: string
          p_car_name: string
          p_car_price: number
          p_date?: string
          p_guest_email: string
          p_guest_name: string
          p_guest_phone: string
          p_pickup_date: string
          p_pickup_location: string
          p_pickup_time: string
          p_return_date: string
          p_return_location: string
          p_return_time: string
          p_total_price: number
        }
        Returns: string
      }
      delete_user_profile: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      demote_admin: { Args: { user_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      migrate_location: { Args: { old_location: string }; Returns: string }
      promote_to_admin: { Args: { user_email: string }; Returns: undefined }
      soft_delete_user: { Args: { user_id: string }; Returns: undefined }
      sync_all_car_quantities: { Args: never; Returns: undefined }
      update_reservation_status: {
        Args: { new_status: string; reservation_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "client" | "admin"
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
    Enums: {
      app_role: ["client", "admin"],
    },
  },
} as const
