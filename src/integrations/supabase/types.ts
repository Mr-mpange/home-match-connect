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
      bookings: {
        Row: {
          amount: number
          created_at: string
          id: string
          listing_id: string
          message: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_confirmed: boolean
          user_id: string
          vendor_confirmed: boolean
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_confirmed?: boolean
          user_id: string
          vendor_confirmed?: boolean
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_confirmed?: boolean
          user_id?: string
          vendor_confirmed?: boolean
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          created_at: string
          id: string
          id_document_path: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          selfie_path: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_document_path: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          id_document_path?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          created_at: string
          description: string
          id: string
          images: string[]
          is_active: boolean
          location: string
          price: number
          room_type: Database["public"]["Enums"]["room_type"]
          title: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          images?: string[]
          is_active?: boolean
          location: string
          price: number
          room_type: Database["public"]["Enums"]["room_type"]
          title: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          is_active?: boolean
          location?: string
          price?: number
          room_type?: Database["public"]["Enums"]["room_type"]
          title?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          audit_log: Json
          booking_id: string
          created_at: string
          id: string
          reference: string
          refunded_at: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          amount: number
          audit_log?: Json
          booking_id: string
          created_at?: string
          id?: string
          reference?: string
          refunded_at?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          amount?: number
          audit_log?: Json
          booking_id?: string
          created_at?: string
          id?: string
          reference?: string
          refunded_at?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          budget_max: number | null
          budget_min: number | null
          cleanliness: Database["public"]["Enums"]["cleanliness_level"] | null
          created_at: string
          display_name: string | null
          guest_frequency: Database["public"]["Enums"]["guest_frequency"] | null
          id: string
          phone: string | null
          sleep_schedule: Database["public"]["Enums"]["sleep_schedule"] | null
          smoking: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          budget_max?: number | null
          budget_min?: number | null
          cleanliness?: Database["public"]["Enums"]["cleanliness_level"] | null
          created_at?: string
          display_name?: string | null
          guest_frequency?:
            | Database["public"]["Enums"]["guest_frequency"]
            | null
          id: string
          phone?: string | null
          sleep_schedule?: Database["public"]["Enums"]["sleep_schedule"] | null
          smoking?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          budget_max?: number | null
          budget_min?: number | null
          cleanliness?: Database["public"]["Enums"]["cleanliness_level"] | null
          created_at?: string
          display_name?: string | null
          guest_frequency?:
            | Database["public"]["Enums"]["guest_frequency"]
            | null
          id?: string
          phone?: string | null
          sleep_schedule?: Database["public"]["Enums"]["sleep_schedule"] | null
          smoking?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "vendor" | "admin"
      booking_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
      cleanliness_level: "relaxed" | "average" | "tidy" | "very_tidy"
      guest_frequency: "never" | "rarely" | "sometimes" | "often"
      kyc_status: "pending" | "verified" | "rejected"
      payment_status: "held" | "released" | "refunded" | "failed"
      room_type: "private_room" | "shared_room" | "studio" | "entire_place"
      sleep_schedule: "early_bird" | "average" | "night_owl"
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
      app_role: ["user", "vendor", "admin"],
      booking_status: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
      cleanliness_level: ["relaxed", "average", "tidy", "very_tidy"],
      guest_frequency: ["never", "rarely", "sometimes", "often"],
      kyc_status: ["pending", "verified", "rejected"],
      payment_status: ["held", "released", "refunded", "failed"],
      room_type: ["private_room", "shared_room", "studio", "entire_place"],
      sleep_schedule: ["early_bird", "average", "night_owl"],
    },
  },
} as const
