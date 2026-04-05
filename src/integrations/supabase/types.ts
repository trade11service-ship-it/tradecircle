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
      advisor_daily_earnings: {
        Row: {
          advisor_id: string
          created_at: string | null
          earning_date: string
          gross_revenue: number
          gst_amount: number
          id: string
          net_earning: number
          platform_fee: number
          subscription_count: number
        }
        Insert: {
          advisor_id: string
          created_at?: string | null
          earning_date?: string
          gross_revenue?: number
          gst_amount?: number
          id?: string
          net_earning?: number
          platform_fee?: number
          subscription_count?: number
        }
        Update: {
          advisor_id?: string
          created_at?: string | null
          earning_date?: string
          gross_revenue?: number
          gst_amount?: number
          id?: string
          net_earning?: number
          platform_fee?: number
          subscription_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "advisor_daily_earnings_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_legal_acceptances: {
        Row: {
          advisor_id: string
          checkbox_1_accepted_at: string
          checkbox_1_sebi_responsibility: boolean
          checkbox_1_text: string
          checkbox_2_accepted_at: string
          checkbox_2_indemnity: boolean
          checkbox_2_text: string
          company_cin: string
          device_info: string | null
          form_submitted_at: string
          full_name: string
          id: string
          ip_address: string | null
          pan_no: string | null
          sebi_reg_no: string
          status: string
          user_agent: string | null
        }
        Insert: {
          advisor_id: string
          checkbox_1_accepted_at?: string
          checkbox_1_sebi_responsibility?: boolean
          checkbox_1_text: string
          checkbox_2_accepted_at?: string
          checkbox_2_indemnity?: boolean
          checkbox_2_text: string
          company_cin?: string
          device_info?: string | null
          form_submitted_at?: string
          full_name: string
          id?: string
          ip_address?: string | null
          pan_no?: string | null
          sebi_reg_no: string
          status?: string
          user_agent?: string | null
        }
        Update: {
          advisor_id?: string
          checkbox_1_accepted_at?: string
          checkbox_1_sebi_responsibility?: boolean
          checkbox_1_text?: string
          checkbox_2_accepted_at?: string
          checkbox_2_indemnity?: boolean
          checkbox_2_text?: string
          company_cin?: string
          device_info?: string | null
          form_submitted_at?: string
          full_name?: string
          id?: string
          ip_address?: string | null
          pan_no?: string | null
          sebi_reg_no?: string
          status?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_legal_acceptances_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      advisors: {
        Row: {
          aadhaar_no: string | null
          aadhaar_photo_url: string | null
          address: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_public_featured: boolean | null
          pan_no: string | null
          pan_photo_url: string | null
          phone: string | null
          profile_photo_url: string | null
          public_description: string | null
          public_sort_order: number | null
          public_tagline: string | null
          public_years_experience: number | null
          rejection_reason: string | null
          sebi_reg_no: string
          status: string | null
          strategy_type: string | null
          user_id: string
        }
        Insert: {
          aadhaar_no?: string | null
          aadhaar_photo_url?: string | null
          address?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_public_featured?: boolean | null
          pan_no?: string | null
          pan_photo_url?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          public_description?: string | null
          public_sort_order?: number | null
          public_tagline?: string | null
          public_years_experience?: number | null
          rejection_reason?: string | null
          sebi_reg_no: string
          status?: string | null
          strategy_type?: string | null
          user_id: string
        }
        Update: {
          aadhaar_no?: string | null
          aadhaar_photo_url?: string | null
          address?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_public_featured?: boolean | null
          pan_no?: string | null
          pan_photo_url?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          public_description?: string | null
          public_sort_order?: number | null
          public_tagline?: string | null
          public_years_experience?: number | null
          rejection_reason?: string | null
          sebi_reg_no?: string
          status?: string | null
          strategy_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_requests: {
        Row: {
          admin_notes: string | null
          advisor_name: string | null
          created_at: string
          email: string | null
          group_id: string | null
          group_name: string | null
          id: string
          reason: string | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          advisor_name?: string | null
          created_at?: string
          email?: string | null
          group_id?: string | null
          group_name?: string | null
          id?: string
          reason?: string | null
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          advisor_name?: string | null
          created_at?: string
          email?: string | null
          group_id?: string | null
          group_name?: string | null
          id?: string
          reason?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      group_follows: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_follows_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          advisor_id: string
          created_at: string | null
          description: string | null
          dp_url: string | null
          id: string
          is_active: boolean | null
          monthly_price: number
          name: string
          razorpay_payment_link: string | null
          strategy_category: string | null
        }
        Insert: {
          advisor_id: string
          created_at?: string | null
          description?: string | null
          dp_url?: string | null
          id?: string
          is_active?: boolean | null
          monthly_price: number
          name: string
          razorpay_payment_link?: string | null
          strategy_category?: string | null
        }
        Update: {
          advisor_id?: string
          created_at?: string | null
          description?: string | null
          dp_url?: string | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          name?: string
          razorpay_payment_link?: string | null
          strategy_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          advisor_id: string
          document_type: string
          file_url: string
          id: string
          uploaded_at: string | null
        }
        Insert: {
          advisor_id: string
          document_type: string
          file_url: string
          id?: string
          uploaded_at?: string | null
        }
        Update: {
          advisor_id?: string
          document_type?: string
          file_url?: string
          id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          telegram_username: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          telegram_username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          telegram_username?: string | null
        }
        Relationships: []
      }
      referral_links: {
        Row: {
          advisor_id: string
          created_at: string | null
          group_id: string
          id: string
          is_active: boolean | null
          referral_code: string
          total_clicks: number | null
          total_conversions: number | null
          total_revenue_generated: number | null
          total_signups: number | null
        }
        Insert: {
          advisor_id: string
          created_at?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          referral_code: string
          total_clicks?: number | null
          total_conversions?: number | null
          total_revenue_generated?: number | null
          total_signups?: number | null
        }
        Update: {
          advisor_id?: string
          created_at?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          referral_code?: string
          total_clicks?: number | null
          total_conversions?: number | null
          total_revenue_generated?: number | null
          total_signups?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_links_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_links_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_signups: {
        Row: {
          advisor_id: string
          converted_to_paid: boolean | null
          group_id: string
          id: string
          is_referral_active: boolean | null
          platform_fee_percent: number | null
          referral_code: string
          signed_up_at: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          advisor_id: string
          converted_to_paid?: boolean | null
          group_id: string
          id?: string
          is_referral_active?: boolean | null
          platform_fee_percent?: number | null
          referral_code: string
          signed_up_at?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          advisor_id?: string
          converted_to_paid?: boolean | null
          group_id?: string
          id?: string
          is_referral_active?: boolean | null
          platform_fee_percent?: number | null
          referral_code?: string
          signed_up_at?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_signups_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_signups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_signups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_visits: {
        Row: {
          advisor_id: string
          converted_to_paid: boolean | null
          converted_to_signup: boolean | null
          group_id: string
          id: string
          referral_code: string
          user_agent: string | null
          user_id: string | null
          visited_at: string | null
          visitor_ip: string | null
        }
        Insert: {
          advisor_id: string
          converted_to_paid?: boolean | null
          converted_to_signup?: boolean | null
          group_id: string
          id?: string
          referral_code: string
          user_agent?: string | null
          user_id?: string | null
          visited_at?: string | null
          visitor_ip?: string | null
        }
        Update: {
          advisor_id?: string
          converted_to_paid?: boolean | null
          converted_to_signup?: boolean | null
          group_id?: string
          id?: string
          referral_code?: string
          user_agent?: string | null
          user_id?: string | null
          visited_at?: string | null
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_visits_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_visits_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_visits_referral_code_fkey"
            columns: ["referral_code"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["referral_code"]
          },
          {
            foreignKeyName: "referral_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_deliveries: {
        Row: {
          advisor_id: string
          delivered_at: string
          delivery_method: string
          group_id: string
          id: string
          signal_id: string
          status: string
          user_id: string
        }
        Insert: {
          advisor_id: string
          delivered_at?: string
          delivery_method?: string
          group_id: string
          id?: string
          signal_id: string
          status?: string
          user_id: string
        }
        Update: {
          advisor_id?: string
          delivered_at?: string
          delivery_method?: string
          group_id?: string
          id?: string
          signal_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_deliveries_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_deliveries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_deliveries_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          advisor_id: string
          created_at: string | null
          entry_price: number | null
          group_id: string
          id: string
          image_url: string | null
          instrument: string | null
          is_public: boolean
          message_text: string | null
          notes: string | null
          post_type: string
          result: string | null
          signal_date: string | null
          signal_type: string | null
          stop_loss: number | null
          target_price: number | null
          timeframe: string | null
        }
        Insert: {
          advisor_id: string
          created_at?: string | null
          entry_price?: number | null
          group_id: string
          id?: string
          image_url?: string | null
          instrument?: string | null
          is_public?: boolean
          message_text?: string | null
          notes?: string | null
          post_type?: string
          result?: string | null
          signal_date?: string | null
          signal_type?: string | null
          stop_loss?: number | null
          target_price?: number | null
          timeframe?: string | null
        }
        Update: {
          advisor_id?: string
          created_at?: string | null
          entry_price?: number | null
          group_id?: string
          id?: string
          image_url?: string | null
          instrument?: string | null
          is_public?: boolean
          message_text?: string | null
          notes?: string | null
          post_type?: string
          result?: string | null
          signal_date?: string | null
          signal_type?: string | null
          stop_loss?: number | null
          target_price?: number | null
          timeframe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signals_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          advisor_id: string
          amount_paid: number | null
          created_at: string | null
          end_date: string | null
          from_referral: boolean | null
          group_id: string
          id: string
          platform_fee_percent: number | null
          razorpay_payment_id: string | null
          referral_advisor_id: string | null
          referral_code: string | null
          start_date: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          advisor_id: string
          amount_paid?: number | null
          created_at?: string | null
          end_date?: string | null
          from_referral?: boolean | null
          group_id: string
          id?: string
          platform_fee_percent?: number | null
          razorpay_payment_id?: string | null
          referral_advisor_id?: string | null
          referral_code?: string | null
          start_date?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          advisor_id?: string
          amount_paid?: number | null
          created_at?: string | null
          end_date?: string | null
          from_referral?: boolean | null
          group_id?: string
          id?: string
          platform_fee_percent?: number | null
          razorpay_payment_id?: string | null
          referral_advisor_id?: string | null
          referral_code?: string | null
          start_date?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_settings: {
        Row: {
          bot_started: boolean | null
          created_at: string | null
          group_id: string
          id: string
          is_active: boolean | null
          telegram_chat_id: string | null
          telegram_username: string | null
          user_id: string
        }
        Insert: {
          bot_started?: boolean | null
          created_at?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          user_id: string
        }
        Update: {
          bot_started?: boolean | null
          created_at?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          telegram_chat_id?: string | null
          telegram_username?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_settings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_legal_acceptances: {
        Row: {
          acceptance_type: string
          accepted: boolean
          accepted_at: string
          checkbox_text: string
          company_cin: string
          device_info: string | null
          email: string | null
          full_name: string | null
          id: string
          ip_address: string | null
          page_url: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acceptance_type: string
          accepted?: boolean
          accepted_at?: string
          checkbox_text: string
          company_cin?: string
          device_info?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          page_url?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acceptance_type?: string
          accepted?: boolean
          accepted_at?: string
          checkbox_text?: string
          company_cin?: string
          device_info?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          page_url?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_legal_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_advisor_earnings: {
        Args: { _advisor_id: string; _month?: string }
        Returns: Json
      }
      get_advisor_signal_stats: { Args: { _advisor_id: string }; Returns: Json }
      get_advisor_subscriber_count: {
        Args: { _advisor_id: string }
        Returns: number
      }
      get_referral_link_by_code: {
        Args: { _code: string }
        Returns: {
          advisor_id: string
          group_id: string
          is_active: boolean
          referral_code: string
        }[]
      }
      increment_referral_clicks: { Args: { _code: string }; Returns: undefined }
      increment_referral_conversions: {
        Args: { _code: string; _revenue: number }
        Returns: undefined
      }
      increment_referral_signups: {
        Args: { _code: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
