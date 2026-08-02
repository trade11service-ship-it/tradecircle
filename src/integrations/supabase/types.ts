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
      advisor_applications: {
        Row: {
          address: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          pan_number: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sebi_number: string
          status: string
          strategy_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          pan_number?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sebi_number: string
          status?: string
          strategy_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          pan_number?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sebi_number?: string
          status?: string
          strategy_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          referral_gross: number
          referral_subs_count: number
          standard_gross: number
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
          referral_gross?: number
          referral_subs_count?: number
          standard_gross?: number
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
          referral_gross?: number
          referral_subs_count?: number
          standard_gross?: number
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
          advisor_id: string | null
          application_id: string | null
          checkbox_1_accepted_at: string
          checkbox_1_sebi_responsibility: boolean
          checkbox_1_text: string
          checkbox_2_accepted_at: string
          checkbox_2_indemnity: boolean
          checkbox_2_text: string
          checkbox_3_accepted_at: string | null
          checkbox_3_dpdp_consent: boolean
          checkbox_3_text: string | null
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
          user_id: string | null
        }
        Insert: {
          advisor_id?: string | null
          application_id?: string | null
          checkbox_1_accepted_at?: string
          checkbox_1_sebi_responsibility?: boolean
          checkbox_1_text: string
          checkbox_2_accepted_at?: string
          checkbox_2_indemnity?: boolean
          checkbox_2_text: string
          checkbox_3_accepted_at?: string | null
          checkbox_3_dpdp_consent?: boolean
          checkbox_3_text?: string | null
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
          user_id?: string | null
        }
        Update: {
          advisor_id?: string | null
          application_id?: string | null
          checkbox_1_accepted_at?: string
          checkbox_1_sebi_responsibility?: boolean
          checkbox_1_text?: string
          checkbox_2_accepted_at?: string
          checkbox_2_indemnity?: boolean
          checkbox_2_text?: string
          checkbox_3_accepted_at?: string | null
          checkbox_3_dpdp_consent?: boolean
          checkbox_3_text?: string | null
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
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_legal_acceptances_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_legal_acceptances_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "advisor_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      advisors: {
        Row: {
          address: string | null
          bank_account_holder_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          email: string
          encrypted_pan: string | null
          full_name: string
          id: string
          is_public_featured: boolean | null
          kyc_rejection_reason: string | null
          kyc_status: string
          kyc_updated_at: string | null
          pan_masked: string | null
          pan_no: string | null
          pan_photo_url: string | null
          payout_vendor_id: string | null
          phone: string | null
          preferred_trading_hours: string | null
          profile_photo_url: string | null
          public_description: string | null
          public_sort_order: number | null
          public_tagline: string | null
          public_years_experience: number | null
          rejection_reason: string | null
          risk_level: string | null
          sebi_reg_no: string
          status: string | null
          strategy_type: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          bank_account_holder_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          email: string
          encrypted_pan?: string | null
          full_name: string
          id?: string
          is_public_featured?: boolean | null
          kyc_rejection_reason?: string | null
          kyc_status?: string
          kyc_updated_at?: string | null
          pan_masked?: string | null
          pan_no?: string | null
          pan_photo_url?: string | null
          payout_vendor_id?: string | null
          phone?: string | null
          preferred_trading_hours?: string | null
          profile_photo_url?: string | null
          public_description?: string | null
          public_sort_order?: number | null
          public_tagline?: string | null
          public_years_experience?: number | null
          rejection_reason?: string | null
          risk_level?: string | null
          sebi_reg_no: string
          status?: string | null
          strategy_type?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          bank_account_holder_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          email?: string
          encrypted_pan?: string | null
          full_name?: string
          id?: string
          is_public_featured?: boolean | null
          kyc_rejection_reason?: string | null
          kyc_status?: string
          kyc_updated_at?: string | null
          pan_masked?: string | null
          pan_no?: string | null
          pan_photo_url?: string | null
          payout_vendor_id?: string | null
          phone?: string | null
          preferred_trading_hours?: string | null
          profile_photo_url?: string | null
          public_description?: string | null
          public_sort_order?: number | null
          public_tagline?: string | null
          public_years_experience?: number | null
          rejection_reason?: string | null
          risk_level?: string | null
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
      client_onboarding: {
        Row: {
          advisor_id: string | null
          consent_given: boolean
          consent_ip_address: string | null
          consent_timestamp: string | null
          consent_user_agent: string | null
          created_at: string
          encrypted_pan: string | null
          group_id: string
          id: string
          kra_status: string | null
          kyc_reference_id: string | null
          kyc_verified: boolean
          mitc_version: string | null
          pan_masked: string | null
          payment_reference_id: string | null
          payment_status: string
          pdf_vault_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          advisor_id?: string | null
          consent_given?: boolean
          consent_ip_address?: string | null
          consent_timestamp?: string | null
          consent_user_agent?: string | null
          created_at?: string
          encrypted_pan?: string | null
          group_id: string
          id?: string
          kra_status?: string | null
          kyc_reference_id?: string | null
          kyc_verified?: boolean
          mitc_version?: string | null
          pan_masked?: string | null
          payment_reference_id?: string | null
          payment_status?: string
          pdf_vault_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          advisor_id?: string | null
          consent_given?: boolean
          consent_ip_address?: string | null
          consent_timestamp?: string | null
          consent_user_agent?: string | null
          created_at?: string
          encrypted_pan?: string | null
          group_id?: string
          id?: string
          kra_status?: string | null
          kyc_reference_id?: string | null
          kyc_verified?: boolean
          mitc_version?: string | null
          pan_masked?: string | null
          payment_reference_id?: string | null
          payment_status?: string
          pdf_vault_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_onboarding_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_logs: {
        Row: {
          client_email: string | null
          created_at: string
          event_type: string
          id: string
          metadata_json: Json
          onboarding_id: string | null
          ra_id: string | null
          user_id: string | null
        }
        Insert: {
          client_email?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata_json?: Json
          onboarding_id?: string | null
          ra_id?: string | null
          user_id?: string | null
        }
        Update: {
          client_email?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata_json?: Json
          onboarding_id?: string | null
          ra_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_logs_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "client_onboarding"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          content_type: string
          course_id: string
          created_at: string
          duration_label: string | null
          file_storage_path: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          content_type: string
          course_id: string
          created_at?: string
          duration_label?: string | null
          file_storage_path: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          content_type?: string
          course_id?: string
          created_at?: string
          duration_label?: string | null
          file_storage_path?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_purchases: {
        Row: {
          course_id: string
          creator_id: string | null
          creator_payout_amount: number
          id: string
          payment_reference_id: string | null
          payment_status: string
          platform_fee_amount: number
          purchase_ip_address: string | null
          purchase_timestamp: string
          split_transfer_id: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          course_id: string
          creator_id?: string | null
          creator_payout_amount: number
          id?: string
          payment_reference_id?: string | null
          payment_status?: string
          platform_fee_amount: number
          purchase_ip_address?: string | null
          purchase_timestamp?: string
          split_transfer_id?: string | null
          total_amount: number
          user_id: string
        }
        Update: {
          course_id?: string
          creator_id?: string | null
          creator_payout_amount?: number
          id?: string
          payment_reference_id?: string | null
          payment_status?: string
          platform_fee_amount?: number
          purchase_ip_address?: string | null
          purchase_timestamp?: string
          split_transfer_id?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_purchases_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          course_type: string
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_visible: boolean
          platform_commission_percent: number
          price: number
          rejection_reason: string | null
          review_status: Database["public"]["Enums"]["course_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          course_type?: string
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_visible?: boolean
          platform_commission_percent?: number
          price?: number
          rejection_reason?: string | null
          review_status?: Database["public"]["Enums"]["course_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          course_type?: string
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          platform_commission_percent?: number
          price?: number
          rejection_reason?: string | null
          review_status?: Database["public"]["Enums"]["course_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_ledger: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          id: string
          purchase_id: string | null
          settled_at: string | null
          status: Database["public"]["Enums"]["payout_ledger_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          id?: string
          purchase_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["payout_ledger_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          id?: string
          purchase_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["payout_ledger_status"]
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_ledger_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payout_ledger_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "course_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          bank_account_holder_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          created_at: string
          email: string | null
          encrypted_pan: string | null
          full_legal_name: string
          id: string
          instagram_handle: string | null
          kyc_status: Database["public"]["Enums"]["creator_kyc_status"]
          pan_masked: string | null
          payout_vendor_id: string | null
          phone: string | null
          rejection_reason: string | null
          updated_at: string
          user_id: string
          youtube_channel: string | null
        }
        Insert: {
          bank_account_holder_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          created_at?: string
          email?: string | null
          encrypted_pan?: string | null
          full_legal_name: string
          id?: string
          instagram_handle?: string | null
          kyc_status?: Database["public"]["Enums"]["creator_kyc_status"]
          pan_masked?: string | null
          payout_vendor_id?: string | null
          phone?: string | null
          rejection_reason?: string | null
          updated_at?: string
          user_id: string
          youtube_channel?: string | null
        }
        Update: {
          bank_account_holder_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          created_at?: string
          email?: string | null
          encrypted_pan?: string | null
          full_legal_name?: string
          id?: string
          instagram_handle?: string | null
          kyc_status?: Database["public"]["Enums"]["creator_kyc_status"]
          pan_masked?: string | null
          payout_vendor_id?: string | null
          phone?: string | null
          rejection_reason?: string | null
          updated_at?: string
          user_id?: string
          youtube_channel?: string | null
        }
        Relationships: []
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      financial_compliance_archive: {
        Row: {
          amount_paid: number | null
          archived_at: string
          consent_ip: string | null
          consent_timestamp: string | null
          email: string | null
          full_name: string | null
          id: string
          pan_number: string | null
          phone: string | null
          razorpay_payment_id: string | null
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          archived_at?: string
          consent_ip?: string | null
          consent_timestamp?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          pan_number?: string | null
          phone?: string | null
          razorpay_payment_id?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          archived_at?: string
          consent_ip?: string | null
          consent_timestamp?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          pan_number?: string | null
          phone?: string | null
          razorpay_payment_id?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_compliance_archive_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_feed_events: {
        Row: {
          created_at: string
          event_type: string
          group_id: string
          id: number
          signal_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          group_id: string
          id?: number
          signal_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          group_id?: string
          id?: number
          signal_id?: string
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
          {
            foreignKeyName: "group_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_payment_credentials: {
        Row: {
          advisor_merchant_key_id: string | null
          advisor_merchant_key_secret: string | null
          advisor_payment_url: string | null
          created_at: string
          group_id: string
          updated_at: string
        }
        Insert: {
          advisor_merchant_key_id?: string | null
          advisor_merchant_key_secret?: string | null
          advisor_payment_url?: string | null
          created_at?: string
          group_id: string
          updated_at?: string
        }
        Update: {
          advisor_merchant_key_id?: string | null
          advisor_merchant_key_secret?: string | null
          advisor_payment_url?: string | null
          created_at?: string
          group_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_payment_credentials_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
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
          duration_days: number
          id: string
          is_active: boolean | null
          monthly_price: number
          name: string
          payment_mode: string
          razorpay_payment_link: string | null
          strategy_category: string | null
        }
        Insert: {
          advisor_id: string
          created_at?: string | null
          description?: string | null
          dp_url?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          monthly_price: number
          name: string
          payment_mode?: string
          razorpay_payment_link?: string | null
          strategy_category?: string | null
        }
        Update: {
          advisor_id?: string
          created_at?: string | null
          description?: string | null
          dp_url?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          name?: string
          payment_mode?: string
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
      kyc_audit_events: {
        Row: {
          check_type: string
          created_at: string
          id: string
          provider: string
          status_verdict: string
          subject_id: string | null
          subject_type: string
          transaction_id: string | null
        }
        Insert: {
          check_type: string
          created_at?: string
          id?: string
          provider?: string
          status_verdict: string
          subject_id?: string | null
          subject_type: string
          transaction_id?: string | null
        }
        Update: {
          check_type?: string
          created_at?: string
          id?: string
          provider?: string
          status_verdict?: string
          subject_id?: string | null
          subject_type?: string
          transaction_id?: string | null
        }
        Relationships: []
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
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          telegram_username: string | null
          user_type: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          telegram_username?: string | null
          user_type?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          telegram_username?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      referral_links: {
        Row: {
          advisor_id: string
          created_at: string | null
          group_id: string | null
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
          group_id?: string | null
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
          group_id?: string | null
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
      rejected_advisor_applications: {
        Row: {
          bio: string | null
          email: string | null
          full_name: string | null
          id: string
          original_advisor_id: string | null
          original_created_at: string | null
          pan_no: string | null
          phone: string | null
          rejected_at: string
          rejected_by: string | null
          rejection_reason: string | null
          sebi_reg_no: string | null
          strategy_type: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          original_advisor_id?: string | null
          original_created_at?: string | null
          pan_no?: string | null
          phone?: string | null
          rejected_at?: string
          rejected_by?: string | null
          rejection_reason?: string | null
          sebi_reg_no?: string | null
          strategy_type?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          original_advisor_id?: string | null
          original_created_at?: string | null
          pan_no?: string | null
          phone?: string | null
          rejected_at?: string
          rejected_by?: string | null
          rejection_reason?: string | null
          sebi_reg_no?: string | null
          strategy_type?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          target_price_2: number | null
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
          target_price_2?: number | null
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
          target_price_2?: number | null
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
          consent_given: boolean | null
          consent_ip: string | null
          consent_text_version: string | null
          consent_timestamp: string | null
          consent_user_agent: string | null
          created_at: string | null
          end_date: string | null
          from_referral: boolean | null
          group_id: string
          id: string
          onboarding_id: string | null
          pan_number: string | null
          platform_fee_percent: number | null
          razorpay_payment_id: string | null
          referral_advisor_id: string | null
          referral_code: string | null
          start_date: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          advisor_id: string
          amount_paid?: number | null
          consent_given?: boolean | null
          consent_ip?: string | null
          consent_text_version?: string | null
          consent_timestamp?: string | null
          consent_user_agent?: string | null
          created_at?: string | null
          end_date?: string | null
          from_referral?: boolean | null
          group_id: string
          id?: string
          onboarding_id?: string | null
          pan_number?: string | null
          platform_fee_percent?: number | null
          razorpay_payment_id?: string | null
          referral_advisor_id?: string | null
          referral_code?: string | null
          start_date?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          advisor_id?: string
          amount_paid?: number | null
          consent_given?: boolean | null
          consent_ip?: string | null
          consent_text_version?: string | null
          consent_timestamp?: string | null
          consent_user_agent?: string | null
          created_at?: string | null
          end_date?: string | null
          from_referral?: boolean | null
          group_id?: string
          id?: string
          onboarding_id?: string | null
          pan_number?: string | null
          platform_fee_percent?: number | null
          razorpay_payment_id?: string | null
          referral_advisor_id?: string | null
          referral_code?: string | null
          start_date?: string | null
          status?: string | null
          user_id?: string | null
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
            foreignKeyName: "subscriptions_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "client_onboarding"
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_anonymize_profile: {
        Args: { _user_id: string }
        Returns: undefined
      }
      admin_approve_application: { Args: { _app_id: string }; Returns: string }
      admin_list_advisors: {
        Args: { _status?: string }
        Returns: {
          address: string | null
          bank_account_holder_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          email: string
          encrypted_pan: string | null
          full_name: string
          id: string
          is_public_featured: boolean | null
          kyc_rejection_reason: string | null
          kyc_status: string
          kyc_updated_at: string | null
          pan_masked: string | null
          pan_no: string | null
          pan_photo_url: string | null
          payout_vendor_id: string | null
          phone: string | null
          preferred_trading_hours: string | null
          profile_photo_url: string | null
          public_description: string | null
          public_sort_order: number | null
          public_tagline: string | null
          public_years_experience: number | null
          rejection_reason: string | null
          risk_level: string | null
          sebi_reg_no: string
          status: string | null
          strategy_type: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "advisors"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_awaiting_kyc_advisors: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          kyc_rejection_reason: string
          kyc_status: string
          sebi_reg_no: string
        }[]
      }
      admin_list_pending_applications: {
        Args: never
        Returns: {
          address: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          pan_number: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sebi_number: string
          status: string
          strategy_type: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "advisor_applications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_pending_courses: {
        Args: never
        Returns: {
          category: string | null
          course_type: string
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_visible: boolean
          platform_commission_percent: number
          price: number
          rejection_reason: string | null
          review_status: Database["public"]["Enums"]["course_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "courses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_rejected_applications: {
        Args: never
        Returns: {
          bio: string | null
          email: string | null
          full_name: string | null
          id: string
          original_advisor_id: string | null
          original_created_at: string | null
          pan_no: string | null
          phone: string | null
          rejected_at: string
          rejected_by: string | null
          rejection_reason: string | null
          sebi_reg_no: string | null
          strategy_type: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "rejected_advisor_applications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_pre_approve_application: {
        Args: { _app_id: string }
        Returns: string
      }
      admin_reject_advisor: {
        Args: { _advisor_id: string; _reason: string }
        Returns: undefined
      }
      admin_reject_application: {
        Args: { _app_id: string; _reason: string }
        Returns: undefined
      }
      admin_review_course: {
        Args: { _approve: boolean; _course_id: string; _reason?: string }
        Returns: undefined
      }
      current_creator_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_kyc_files_for_user: {
        Args: { _user_id: string }
        Returns: undefined
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_stale_applications: { Args: never; Returns: number }
      get_advisor_earnings: {
        Args: { _advisor_id: string; _month?: string }
        Returns: Json
      }
      get_advisor_full: {
        Args: { _advisor_id: string }
        Returns: {
          address: string | null
          bank_account_holder_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          email: string
          encrypted_pan: string | null
          full_name: string
          id: string
          is_public_featured: boolean | null
          kyc_rejection_reason: string | null
          kyc_status: string
          kyc_updated_at: string | null
          pan_masked: string | null
          pan_no: string | null
          pan_photo_url: string | null
          payout_vendor_id: string | null
          phone: string | null
          preferred_trading_hours: string | null
          profile_photo_url: string | null
          public_description: string | null
          public_sort_order: number | null
          public_tagline: string | null
          public_years_experience: number | null
          rejection_reason: string | null
          risk_level: string | null
          sebi_reg_no: string
          status: string | null
          strategy_type: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "advisors"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_advisor_full_by_user: {
        Args: { _user_id: string }
        Returns: {
          address: string | null
          bank_account_holder_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          email: string
          encrypted_pan: string | null
          full_name: string
          id: string
          is_public_featured: boolean | null
          kyc_rejection_reason: string | null
          kyc_status: string
          kyc_updated_at: string | null
          pan_masked: string | null
          pan_no: string | null
          pan_photo_url: string | null
          payout_vendor_id: string | null
          phone: string | null
          preferred_trading_hours: string | null
          profile_photo_url: string | null
          public_description: string | null
          public_sort_order: number | null
          public_tagline: string | null
          public_years_experience: number | null
          rejection_reason: string | null
          risk_level: string | null
          sebi_reg_no: string
          status: string | null
          strategy_type: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "advisors"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_advisor_live_stats: { Args: { _advisor_id: string }; Returns: Json }
      get_advisor_referral_dashboard: {
        Args: { _advisor_id: string }
        Returns: Json
      }
      get_advisor_signal_stats: { Args: { _advisor_id: string }; Returns: Json }
      get_advisor_subscriber_count: {
        Args: { _advisor_id: string }
        Returns: number
      }
      get_course_syllabus: {
        Args: { _course_id: string }
        Returns: {
          content_type: string
          duration_label: string
          id: string
          sort_order: number
          title: string
        }[]
      }
      get_group_feed_posts: {
        Args: { _group_id: string; _limit?: number }
        Returns: {
          advisor_id: string
          created_at: string
          entry_price: number
          group_id: string
          id: string
          image_url: string
          instrument: string
          is_public: boolean
          message_text: string
          notes: string
          post_type: string
          result: string
          signal_date: string
          signal_type: string
          stop_loss: number
          target_price: number
          timeframe: string
        }[]
      }
      get_public_course: {
        Args: { _course_id: string }
        Returns: {
          category: string
          course_type: string
          cover_image_url: string
          created_at: string
          creator_id: string
          creator_name: string
          description: string
          id: string
          instagram_handle: string
          price: number
          title: string
          youtube_channel: string
        }[]
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
      is_auth_user_email_verified: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_live_creator: { Args: { _creator_id: string }; Returns: boolean }
      list_public_courses: {
        Args: never
        Returns: {
          category: string
          course_type: string
          cover_image_url: string
          created_at: string
          creator_id: string
          creator_name: string
          description: string
          id: string
          module_count: number
          price: number
          purchase_count: number
          title: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      scrub_stale_kyc: { Args: never; Returns: number }
    }
    Enums: {
      course_review_status: "pending_review" | "approved" | "rejected" | "draft"
      creator_kyc_status: "unverified" | "pending" | "approved" | "rejected"
      payout_ledger_status: "accrued" | "paid"
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
      course_review_status: ["pending_review", "approved", "rejected", "draft"],
      creator_kyc_status: ["unverified", "pending", "approved", "rejected"],
      payout_ledger_status: ["accrued", "paid"],
    },
  },
} as const
