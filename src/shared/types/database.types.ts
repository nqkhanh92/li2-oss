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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  agent: {
    Tables: {
      agent_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      agent_feedback: {
        Row: {
          created_at: string
          id: string
          org_id: string
          rating: number
          session_id: string
          turn_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          rating: number
          session_id: string
          turn_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          rating?: number
          session_id?: string
          turn_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          content: Json | null
          id: string
          org_id: string
          session_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json | null
          id?: string
          org_id: string
          session_id?: string | null
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json | null
          id?: string
          org_id?: string
          session_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          model: string | null
          role: string
          seq: number
          session_id: string
          tool_exchange: Json | null
          turn_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          model?: string | null
          role: string
          seq?: number
          session_id: string
          tool_exchange?: Json | null
          turn_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          model?: string | null
          role?: string
          seq?: number
          session_id?: string
          tool_exchange?: Json | null
          turn_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_sessions: {
        Row: {
          created_at: string
          id: string
          org_id: string
          status: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          status?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          status?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_tasks: {
        Row: {
          created_at: string
          id: string
          result_ref: string | null
          session_id: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          result_ref?: string | null
          session_id: string
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          result_ref?: string | null
          session_id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tool_calls: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          input: Json | null
          is_write: boolean
          message_id: string
          output: Json | null
          status: string
          tool_name: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          input?: Json | null
          is_write?: boolean
          message_id: string
          output?: Json | null
          status?: string
          tool_name: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          input?: Json | null
          is_write?: boolean
          message_id?: string
          output?: Json | null
          status?: string
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tool_calls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "agent_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_traces: {
        Row: {
          attributes: Json | null
          ended_at: string | null
          id: string
          parent_span_id: string | null
          session_id: string
          span_name: string
          started_at: string
          status: string
          turn_id: string
        }
        Insert: {
          attributes?: Json | null
          ended_at?: string | null
          id?: string
          parent_span_id?: string | null
          session_id: string
          span_name: string
          started_at?: string
          status?: string
          turn_id: string
        }
        Update: {
          attributes?: Json | null
          ended_at?: string | null
          id?: string
          parent_span_id?: string | null
          session_id?: string
          span_name?: string
          started_at?: string
          status?: string
          turn_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_traces_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_toc: {
        Row: {
          built_at: string
          id: string
          source_rev: string | null
          tree: Json | null
        }
        Insert: {
          built_at?: string
          id?: string
          source_rev?: string | null
          tree?: Json | null
        }
        Update: {
          built_at?: string
          id?: string
          source_rev?: string | null
          tree?: Json | null
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
  logs: {
    Tables: {
      audit_logs: {
        Row: {
          counter_after: number | null
          counter_before: number | null
          created_at: string | null
          error_message: string | null
          event_type: string
          id: number
          ip_address: unknown
          metadata: Json | null
          reason: string | null
          request_id: string | null
          result: string | null
          session_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
          user_sequence_number: number | null
        }
        Insert: {
          counter_after?: number | null
          counter_before?: number | null
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: number
          ip_address?: unknown
          metadata?: Json | null
          reason?: string | null
          request_id?: string | null
          result?: string | null
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
          user_sequence_number?: number | null
        }
        Update: {
          counter_after?: number | null
          counter_before?: number | null
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: number
          ip_address?: unknown
          metadata?: Json | null
          reason?: string | null
          request_id?: string | null
          result?: string | null
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
          user_sequence_number?: number | null
        }
        Relationships: []
      }
      failed_audit_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_data: Json
          failed_at: string
          id: string
          max_retries: number
          next_retry_at: string | null
          permanently_failed: boolean
          retry_count: number
          retry_history: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_data: Json
          failed_at?: string
          id?: string
          max_retries?: number
          next_retry_at?: string | null
          permanently_failed?: boolean
          retry_count?: number
          retry_history?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_data?: Json
          failed_at?: string
          id?: string
          max_retries?: number
          next_retry_at?: string | null
          permanently_failed?: boolean
          retry_count?: number
          retry_history?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      org_audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          metadata: Json | null
          module: string
          organization_id: string
          target_extra: Json | null
          target_id: string | null
          target_name: string | null
          target_table: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          module: string
          organization_id: string
          target_extra?: Json | null
          target_id?: string | null
          target_name?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          module?: string
          organization_id?: string
          target_extra?: Json | null
          target_id?: string | null
          target_name?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      premium_grants_log: {
        Row: {
          created_at: string | null
          device_fp: string | null
          grant_type: string
          granted_at: string
          granted_by: string | null
          id: number
          ip_address: unknown
          premium_expires_at: string | null
          registration_campaign: string | null
          registration_date: string | null
          registration_source: string | null
          request_id: string | null
          sequence_number: number
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fp?: string | null
          grant_type?: string
          granted_at?: string
          granted_by?: string | null
          id?: number
          ip_address?: unknown
          premium_expires_at?: string | null
          registration_campaign?: string | null
          registration_date?: string | null
          registration_source?: string | null
          request_id?: string | null
          sequence_number: number
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fp?: string | null
          grant_type?: string
          granted_at?: string
          granted_by?: string | null
          id?: number
          ip_address?: unknown
          premium_expires_at?: string | null
          registration_campaign?: string | null
          registration_date?: string | null
          registration_source?: string | null
          request_id?: string | null
          sequence_number?: number
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_audit_logs: {
        Args: {
          p_action?: string[]
          p_end_date?: string
          p_module?: string[]
          p_org_id: string
          p_retention_days?: number
          p_search?: string
          p_start_date?: string
          p_target_id?: string
          p_user_id?: string
        }
        Returns: number
      }
      get_audit_log_by_id: {
        Args: { p_log_id: string; p_org_id: string }
        Returns: {
          action: string
          changes: Json
          created_at: string
          id: string
          metadata: Json
          module: string
          organization_id: string
          target_extra: Json
          target_id: string
          target_name: string
          target_table: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_audit_logs_with_users: {
        Args: {
          p_action?: string[]
          p_end_date?: string
          p_limit?: number
          p_module?: string[]
          p_offset?: number
          p_org_id: string
          p_retention_days?: number
          p_search?: string
          p_start_date?: string
          p_target_id?: string
          p_user_id?: string
        }
        Returns: {
          action: string
          changes: Json
          created_at: string
          id: string
          metadata: Json
          module: string
          organization_id: string
          target_extra: Json
          target_id: string
          target_name: string
          target_table: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_destination_history_v2: {
        Args: {
          p_end_time?: string
          p_org_id: string
          p_start_time?: string
          p_timezone?: string
          p_tp_id: string
        }
        Returns: {
          changed_at: string
          destination: string
          segment_type: string
          type: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_provider_keys: {
        Row: {
          api_key: string | null
          created_at: string | null
          description: string | null
          id: string
          key_identifier: string
          last_used_at: string | null
          provider_type: string
          rotation_order: number
          status: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key_identifier: string
          last_used_at?: string | null
          provider_type: string
          rotation_order: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key_identifier?: string
          last_used_at?: string | null
          provider_type?: string
          rotation_order?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      analytics_settings: {
        Row: {
          allowed_hostnames: string[] | null
          auto_events: Json
          created_at: string
          custom_scripts: Json | null
          custom_settings: Json | null
          data_collection_rules: Json
          debug_mode_enabled: boolean | null
          features: Json
          id: string
          organization_id: string
          outbound_domains: string[]
          publishable_key: string
          publishable_key_created_at: string
          tracking: Json
          updated_at: string
        }
        Insert: {
          allowed_hostnames?: string[] | null
          auto_events?: Json
          created_at?: string
          custom_scripts?: Json | null
          custom_settings?: Json | null
          data_collection_rules?: Json
          debug_mode_enabled?: boolean | null
          features?: Json
          id?: string
          organization_id: string
          outbound_domains?: string[]
          publishable_key: string
          publishable_key_created_at?: string
          tracking?: Json
          updated_at?: string
        }
        Update: {
          allowed_hostnames?: string[] | null
          auto_events?: Json
          created_at?: string
          custom_scripts?: Json | null
          custom_settings?: Json | null
          data_collection_rules?: Json
          debug_mode_enabled?: boolean | null
          features?: Json
          id?: string
          organization_id?: string
          outbound_domains?: string[]
          publishable_key?: string
          publishable_key_created_at?: string
          tracking?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_settings_org_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_settings_org_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      anon_touch_points: {
        Row: {
          anon_id: string
          content_type: string
          content_value: string
          created_at: string
          deleted_at: string | null
          id: string
          ip: string
          migrated: boolean
          qr_customize_options: Json | null
          short_code: string
          short_id: number
          short_url: string
          variants_content: Json | null
        }
        Insert: {
          anon_id: string
          content_type: string
          content_value: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          ip: string
          migrated?: boolean
          qr_customize_options?: Json | null
          short_code: string
          short_id: number
          short_url: string
          variants_content?: Json | null
        }
        Update: {
          anon_id?: string
          content_type?: string
          content_value?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          ip?: string
          migrated?: boolean
          qr_customize_options?: Json | null
          short_code?: string
          short_id?: number
          short_url?: string
          variants_content?: Json | null
        }
        Relationships: []
      }
      anon_visits: {
        Row: {
          anon_tp_id: string
          content_value: string | null
          created_at: string
          id: string
          ip: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          anon_tp_id: string
          content_value?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          anon_tp_id?: string
          content_value?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          bot_user_id: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          key_suffix: string
          key_type: Database["public"]["Enums"]["api_key_type"]
          last_used_at: string | null
          name: string
          organization_id: string
          permissions: Json
          salt: string
          updated_at: string
        }
        Insert: {
          bot_user_id?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          key_suffix: string
          key_type?: Database["public"]["Enums"]["api_key_type"]
          last_used_at?: string | null
          name: string
          organization_id: string
          permissions?: Json
          salt: string
          updated_at?: string
        }
        Update: {
          bot_user_id?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          key_suffix?: string
          key_type?: Database["public"]["Enums"]["api_key_type"]
          last_used_at?: string | null
          name?: string
          organization_id?: string
          permissions?: Json
          salt?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      artifact_views: {
        Row: {
          artifact_id: string
          customer_profile_id: string
          first_viewed_at: string
          id: string
          last_viewed_at: string
          organization_id: string
          view_count: number
        }
        Insert: {
          artifact_id: string
          customer_profile_id: string
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          organization_id: string
          view_count?: number
        }
        Update: {
          artifact_id?: string
          customer_profile_id?: string
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          organization_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "artifact_views_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifact_views_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifact_views_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          access_mode: string
          access_version: number
          content_type: string
          created_at: string
          id: string
          kind: string
          name: string
          organization_id: string
          password_hash: string | null
          password_set_at: string | null
          serve_token: string
          size_bytes: number
          status: string
          storage_path: string
          touch_point_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_mode?: string
          access_version?: number
          content_type: string
          created_at?: string
          id?: string
          kind: string
          name: string
          organization_id: string
          password_hash?: string | null
          password_set_at?: string | null
          serve_token: string
          size_bytes: number
          status?: string
          storage_path: string
          touch_point_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_mode?: string
          access_version?: number
          content_type?: string
          created_at?: string
          id?: string
          kind?: string
          name?: string
          organization_id?: string
          password_hash?: string | null
          password_set_at?: string | null
          serve_token?: string
          size_bytes?: number
          status?: string
          storage_path?: string
          touch_point_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_touch_point_id_fkey"
            columns: ["touch_point_id"]
            isOneToOne: true
            referencedRelation: "touch_points"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          archive_retention_months: number
          bot_ips: Json | null
          bot_useragent_patterns: Json | null
          created_at: string
          destination_blacklist: string[]
          id: string
        }
        Insert: {
          archive_retention_months?: number
          bot_ips?: Json | null
          bot_useragent_patterns?: Json | null
          created_at?: string
          destination_blacklist?: string[]
          id?: string
        }
        Update: {
          archive_retention_months?: number
          bot_ips?: Json | null
          bot_useragent_patterns?: Json | null
          created_at?: string
          destination_blacklist?: string[]
          id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string
          id: string
          is_warranty: boolean
          name: string | null
          organization_id: string
          serial_number: string | null
          short_url: string
          status: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_warranty: boolean
          name?: string | null
          organization_id: string
          serial_number?: string | null
          short_url: string
          status?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_warranty?: boolean
          name?: string | null
          organization_id?: string
          serial_number?: string | null
          short_url?: string
          status?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_channels: {
        Row: {
          color: string
          created_at: string | null
          created_by: string
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      campaigns: {
        Row: {
          affected_tag_ids: string[] | null
          created_at: string
          desc: string | null
          edges: Json[] | null
          enabled: boolean
          id: string
          name: string
          nodes: Json[] | null
          organization_id: string
          pre_combination: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affected_tag_ids?: string[] | null
          created_at?: string
          desc?: string | null
          edges?: Json[] | null
          enabled?: boolean
          id?: string
          name: string
          nodes?: Json[] | null
          organization_id: string
          pre_combination?: Json | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          affected_tag_ids?: string[] | null
          created_at?: string
          desc?: string | null
          edges?: Json[] | null
          enabled?: boolean
          id?: string
          name?: string
          nodes?: Json[] | null
          organization_id?: string
          pre_combination?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "v2_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      click_events: {
        Row: {
          click_id: string | null
          created_at: string
          element_classes: string | null
          element_id: string | null
          element_tag: string | null
          element_text: string | null
          form_id: string | null
          id: string
          ip: unknown
          metadata: Json | null
          organization_id: string
          page_title: string | null
          page_url: string | null
          referrer: string | null
          touch_point_id: string | null
          trigger_name: string
          user_agent: string | null
          visit_id: string | null
        }
        Insert: {
          click_id?: string | null
          created_at?: string
          element_classes?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          form_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json | null
          organization_id: string
          page_title?: string | null
          page_url?: string | null
          referrer?: string | null
          touch_point_id?: string | null
          trigger_name: string
          user_agent?: string | null
          visit_id?: string | null
        }
        Update: {
          click_id?: string | null
          created_at?: string
          element_classes?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          form_id?: string | null
          id?: string
          ip?: unknown
          metadata?: Json | null
          organization_id?: string
          page_title?: string | null
          page_url?: string | null
          referrer?: string | null
          touch_point_id?: string | null
          trigger_name?: string
          user_agent?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_click_events_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_click_events_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      collection_members: {
        Row: {
          added_by: string | null
          collection_id: string
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          added_by?: string | null
          collection_id: string
          created_at?: string | null
          id?: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          added_by?: string | null
          collection_id?: string
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_members_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          org_permission: string
          organization_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          org_permission?: string
          organization_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          org_permission?: string
          organization_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_events: {
        Row: {
          amount: number | null
          click_id: string
          created_at: string
          currency: string | null
          customer_profile_id: string | null
          deep_link_event_id: string | null
          event_id: string | null
          event_name: string
          event_type: Database["public"]["Enums"]["conversion_event_type"]
          id: string
          invoice_id: string | null
          ip: unknown
          item_count: number | null
          items: Json | null
          lead_event_id: string | null
          metadata: Json | null
          organization_id: string
          payment_processor: string | null
          referrer: string | null
          session_id: string | null
          touch_point_id: string | null
          transaction_id: string | null
          user_agent: string | null
          visit_id: string | null
          visitor_id: string | null
        }
        Insert: {
          amount?: number | null
          click_id: string
          created_at?: string
          currency?: string | null
          customer_profile_id?: string | null
          deep_link_event_id?: string | null
          event_id?: string | null
          event_name?: string
          event_type?: Database["public"]["Enums"]["conversion_event_type"]
          id?: string
          invoice_id?: string | null
          ip?: unknown
          item_count?: number | null
          items?: Json | null
          lead_event_id?: string | null
          metadata?: Json | null
          organization_id: string
          payment_processor?: string | null
          referrer?: string | null
          session_id?: string | null
          touch_point_id?: string | null
          transaction_id?: string | null
          user_agent?: string | null
          visit_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          amount?: number | null
          click_id?: string
          created_at?: string
          currency?: string | null
          customer_profile_id?: string | null
          deep_link_event_id?: string | null
          event_id?: string | null
          event_name?: string
          event_type?: Database["public"]["Enums"]["conversion_event_type"]
          id?: string
          invoice_id?: string | null
          ip?: unknown
          item_count?: number | null
          items?: Json | null
          lead_event_id?: string | null
          metadata?: Json | null
          organization_id?: string
          payment_processor?: string | null
          referrer?: string | null
          session_id?: string | null
          touch_point_id?: string | null
          transaction_id?: string | null
          user_agent?: string | null
          visit_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_events_customer_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_deep_link_event_id_fkey"
            columns: ["deep_link_event_id"]
            isOneToOne: false
            referencedRelation: "deep_link_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_lead_fkey"
            columns: ["lead_event_id"]
            isOneToOne: false
            referencedRelation: "conversion_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "conversion_events_tp_fkey"
            columns: ["touch_point_id"]
            isOneToOne: false
            referencedRelation: "touch_points"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_events_bkp_20260417_leaddedup: {
        Row: {
          amount: number | null
          click_id: string | null
          created_at: string | null
          currency: string | null
          customer_profile_id: string | null
          event_id: string | null
          event_name: string | null
          event_type:
            | Database["public"]["Enums"]["conversion_event_type"]
            | null
          id: string | null
          invoice_id: string | null
          ip: unknown
          item_count: number | null
          items: Json | null
          lead_event_id: string | null
          metadata: Json | null
          organization_id: string | null
          payment_processor: string | null
          referrer: string | null
          touch_point_id: string | null
          transaction_id: string | null
          user_agent: string | null
          visit_id: string | null
        }
        Insert: {
          amount?: number | null
          click_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_profile_id?: string | null
          event_id?: string | null
          event_name?: string | null
          event_type?:
            | Database["public"]["Enums"]["conversion_event_type"]
            | null
          id?: string | null
          invoice_id?: string | null
          ip?: unknown
          item_count?: number | null
          items?: Json | null
          lead_event_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          payment_processor?: string | null
          referrer?: string | null
          touch_point_id?: string | null
          transaction_id?: string | null
          user_agent?: string | null
          visit_id?: string | null
        }
        Update: {
          amount?: number | null
          click_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_profile_id?: string | null
          event_id?: string | null
          event_name?: string | null
          event_type?:
            | Database["public"]["Enums"]["conversion_event_type"]
            | null
          id?: string | null
          invoice_id?: string | null
          ip?: unknown
          item_count?: number | null
          items?: Json | null
          lead_event_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          payment_processor?: string | null
          referrer?: string | null
          touch_point_id?: string | null
          transaction_id?: string | null
          user_agent?: string | null
          visit_id?: string | null
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          external_id: string | null
          first_click_id: string | null
          first_touch_point_id: string | null
          id: string
          is_anonymous: boolean | null
          last_visit_at: string | null
          lead_count: number | null
          merged_at: string | null
          merged_from_ids: string[] | null
          merged_into_id: string | null
          metadata: Json | null
          name: string | null
          organization_id: string
          phone: string | null
          sale_count: number | null
          total_revenue: number | null
          total_revenue_usd: number | null
          total_revenue_vnd: number | null
          updated_at: string
          visit_count: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          first_click_id?: string | null
          first_touch_point_id?: string | null
          id?: string
          is_anonymous?: boolean | null
          last_visit_at?: string | null
          lead_count?: number | null
          merged_at?: string | null
          merged_from_ids?: string[] | null
          merged_into_id?: string | null
          metadata?: Json | null
          name?: string | null
          organization_id: string
          phone?: string | null
          sale_count?: number | null
          total_revenue?: number | null
          total_revenue_usd?: number | null
          total_revenue_vnd?: number | null
          updated_at?: string
          visit_count?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          first_click_id?: string | null
          first_touch_point_id?: string | null
          id?: string
          is_anonymous?: boolean | null
          last_visit_at?: string | null
          lead_count?: number | null
          merged_at?: string | null
          merged_from_ids?: string[] | null
          merged_into_id?: string | null
          metadata?: Json | null
          name?: string | null
          organization_id?: string
          phone?: string | null
          sale_count?: number | null
          total_revenue?: number | null
          total_revenue_usd?: number | null
          total_revenue_vnd?: number | null
          updated_at?: string
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_first_tp_fkey"
            columns: ["first_touch_point_id"]
            isOneToOne: false
            referencedRelation: "touch_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      dashboard_members: {
        Row: {
          created_at: string
          dashboard_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_members_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_pins: {
        Row: {
          created_at: string
          dashboard_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_pins_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          config: Json
          created_at: string
          dashboard_id: string
          date_override: Json | null
          formula_config: Json | null
          id: string
          name: string
          position: Json
          updated_at: string
          widget_type: string
        }
        Insert: {
          config: Json
          created_at?: string
          dashboard_id: string
          date_override?: Json | null
          formula_config?: Json | null
          id?: string
          name: string
          position?: Json
          updated_at?: string
          widget_type?: string
        }
        Update: {
          config?: Json
          created_at?: string
          dashboard_id?: string
          date_override?: Json | null
          formula_config?: Json | null
          id?: string
          name?: string
          position?: Json
          updated_at?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          access_mode: string
          created_at: string
          created_by: string
          default_role: string
          id: string
          name: string
          organization_id: string
          template_id: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          access_mode?: string
          created_at?: string
          created_by: string
          default_role?: string
          id?: string
          name: string
          organization_id: string
          template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          access_mode?: string
          created_at?: string
          created_by?: string
          default_role?: string
          id?: string
          name?: string
          organization_id?: string
          template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      deep_link_app_meta: {
        Row: {
          app_icon_url: string
          app_name: string
          app_store_id: string
          fetched_at: string
        }
        Insert: {
          app_icon_url?: string
          app_name?: string
          app_store_id: string
          fetched_at?: string
        }
        Update: {
          app_icon_url?: string
          app_name?: string
          app_store_id?: string
          fetched_at?: string
        }
        Relationships: []
      }
      deep_link_events: {
        Row: {
          click_id: string
          created_at: string
          domain_id: string | null
          event_type: string
          id: string
          ip: unknown
          match_method: string | null
          miss_reason: string | null
          organization_id: string
          platform: string | null
          touch_point_id: string | null
          user_agent: string | null
        }
        Insert: {
          click_id: string
          created_at?: string
          domain_id?: string | null
          event_type: string
          id?: string
          ip?: unknown
          match_method?: string | null
          miss_reason?: string | null
          organization_id: string
          platform?: string | null
          touch_point_id?: string | null
          user_agent?: string | null
        }
        Update: {
          click_id?: string
          created_at?: string
          domain_id?: string | null
          event_type?: string
          id?: string
          ip?: unknown
          match_method?: string | null
          miss_reason?: string | null
          organization_id?: string
          platform?: string | null
          touch_point_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deep_link_events_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deep_link_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deep_link_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "deep_link_events_touch_point_id_fkey"
            columns: ["touch_point_id"]
            isOneToOne: false
            referencedRelation: "touch_points"
            referencedColumns: ["id"]
          },
        ]
      }
      device_attestations: {
        Row: {
          created_at: string
          environment: string
          key_id: string
          last_seen: string
          public_key: string
          receipt: string | null
          sign_count: number
        }
        Insert: {
          created_at?: string
          environment: string
          key_id: string
          last_seen?: string
          public_key: string
          receipt?: string | null
          sign_count?: number
        }
        Update: {
          created_at?: string
          environment?: string
          key_id?: string
          last_seen?: string
          public_key?: string
          receipt?: string | null
          sign_count?: number
        }
        Relationships: []
      }
      device_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          key_id: string
          short_url: string
          target_url: string
          tp_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          key_id: string
          short_url: string
          target_url: string
          tp_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          key_id?: string
          short_url?: string
          target_url?: string
          tp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_links_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "device_attestations"
            referencedColumns: ["key_id"]
          },
        ]
      }
      domains: {
        Row: {
          cf_hostname_id: string | null
          created_at: string
          deep_link_apps: Json | null
          deep_link_landing_page: Json | null
          default_selected: boolean | null
          domain: string
          id: string
          is_default: boolean
          is_failed: number
          is_subdomain_claimed: boolean | null
          is_verified: boolean
          last_failed_at: string | null
          last_failed_reason: string | null
          name: string | null
          organization_id: string | null
          txt_code: string | null
          txt_name: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          cf_hostname_id?: string | null
          created_at?: string
          deep_link_apps?: Json | null
          deep_link_landing_page?: Json | null
          default_selected?: boolean | null
          domain: string
          id?: string
          is_default?: boolean
          is_failed?: number
          is_subdomain_claimed?: boolean | null
          is_verified?: boolean
          last_failed_at?: string | null
          last_failed_reason?: string | null
          name?: string | null
          organization_id?: string | null
          txt_code?: string | null
          txt_name?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          cf_hostname_id?: string | null
          created_at?: string
          deep_link_apps?: Json | null
          deep_link_landing_page?: Json | null
          default_selected?: boolean | null
          domain?: string
          id?: string
          is_default?: boolean
          is_failed?: number
          is_subdomain_claimed?: boolean | null
          is_verified?: boolean
          last_failed_at?: string | null
          last_failed_reason?: string | null
          name?: string | null
          organization_id?: string | null
          txt_code?: string | null
          txt_name?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "domains_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rules: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          element_href: string | null
          element_id: string | null
          element_text: string | null
          form_action: string | null
          form_id: string | null
          form_name: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          page_path: string | null
          selector_path: string | null
          source: string
          text_match_mode: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          element_href?: string | null
          element_id?: string | null
          element_text?: string | null
          form_action?: string | null
          form_id?: string | null
          form_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          page_path?: string | null
          selector_path?: string | null
          source?: string
          text_match_mode?: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          element_href?: string | null
          element_id?: string | null
          element_text?: string | null
          form_action?: string | null
          form_id?: string | null
          form_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          page_path?: string | null
          selector_path?: string | null
          source?: string
          text_match_mode?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          rate: number
          rate_date: string
          target_currency: string
        }
        Insert: {
          base_currency: string
          created_at?: string
          id?: string
          rate: number
          rate_date?: string
          target_currency: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          rate?: number
          rate_date?: string
          target_currency?: string
        }
        Relationships: []
      }
      fingerprints: {
        Row: {
          browser_failed: number
          browser_fp: string | null
          canvas_failed: number
          canvas_fp: string | null
          created_at: string
          id: string
        }
        Insert: {
          browser_failed?: number
          browser_fp?: string | null
          canvas_failed?: number
          canvas_fp?: string | null
          created_at?: string
          id?: string
        }
        Update: {
          browser_failed?: number
          browser_fp?: string | null
          canvas_failed?: number
          canvas_fp?: string | null
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      funnel_results: {
        Row: {
          computed_at: string
          conversion_rate: number
          data_version: number
          funnel_id: string
          id: string
          organization_id: string
          period_end: string
          period_start: string
          period_type: string
          step_metrics: Json
          total_conversions: number
          total_entries: number
        }
        Insert: {
          computed_at?: string
          conversion_rate?: number
          data_version?: number
          funnel_id: string
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          period_type: string
          step_metrics: Json
          total_conversions?: number
          total_entries?: number
        }
        Update: {
          computed_at?: string
          conversion_rate?: number
          data_version?: number
          funnel_id?: string
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          step_metrics?: Json
          total_conversions?: number
          total_entries?: number
        }
        Relationships: [
          {
            foreignKeyName: "funnel_results_funnel_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_steps: {
        Row: {
          condition: string
          created_at: string
          event_name: string | null
          funnel_id: string
          id: string
          is_required: boolean | null
          name: string
          pattern: string
          pattern_type: string
          position: number
        }
        Insert: {
          condition: string
          created_at?: string
          event_name?: string | null
          funnel_id: string
          id?: string
          is_required?: boolean | null
          name: string
          pattern: string
          pattern_type: string
          position: number
        }
        Update: {
          condition?: string
          created_at?: string
          event_name?: string | null
          funnel_id?: string
          id?: string
          is_required?: boolean | null
          name?: string
          pattern?: string
          pattern_type?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "funnel_steps_funnel_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnels_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnels_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      geolite: {
        Row: {
          code: string
          continent: string
          continent_code: string
          country: string
          country_code: string
          id: number
          subdivision_name: string
        }
        Insert: {
          code: string
          continent: string
          continent_code: string
          country: string
          country_code: string
          id?: number
          subdivision_name: string
        }
        Update: {
          code?: string
          continent?: string
          continent_code?: string
          country?: string
          country_code?: string
          id?: number
          subdivision_name?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          config: Json | null
          created_at: string
          desc: string | null
          id: string
          name: string
          org_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          desc?: string | null
          id?: string
          name: string
          org_id: string
          type: string
          user_id?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          desc?: string | null
          id?: string
          name?: string
          org_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          element_class: string | null
          element_href: string | null
          element_id: string | null
          element_tag: string | null
          element_text: string | null
          filled_count: number | null
          form_action: string | null
          form_id: string | null
          form_method: string | null
          form_name: string | null
          id: string
          input_count: number | null
          interaction_type: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          page_height: number | null
          page_path: string
          page_url: string
          scroll_depth_percent: number | null
          scroll_direction: string | null
          scroll_y: number | null
          selector_path: string | null
          session_id: string
          target_fixed: boolean | null
          time_at_depth: number | null
          time_on_form: number | null
          timestamp: string
          user_agent: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x: number | null
          y: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          page_height?: number | null
          page_path: string
          page_url: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp: string
          user_agent?: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x?: number | null
          y?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          page_height?: number | null
          page_path?: string
          page_url?: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id?: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp?: string
          user_agent?: string | null
          viewport_height?: number
          viewport_width?: number
          visitor_id?: string
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      interactions_2026_06: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          element_class: string | null
          element_href: string | null
          element_id: string | null
          element_tag: string | null
          element_text: string | null
          filled_count: number | null
          form_action: string | null
          form_id: string | null
          form_method: string | null
          form_name: string | null
          id: string
          input_count: number | null
          interaction_type: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          page_height: number | null
          page_path: string
          page_url: string
          scroll_depth_percent: number | null
          scroll_direction: string | null
          scroll_y: number | null
          selector_path: string | null
          session_id: string
          target_fixed: boolean | null
          time_at_depth: number | null
          time_on_form: number | null
          timestamp: string
          user_agent: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x: number | null
          y: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          page_height?: number | null
          page_path: string
          page_url: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp: string
          user_agent?: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x?: number | null
          y?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          page_height?: number | null
          page_path?: string
          page_url?: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id?: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp?: string
          user_agent?: string | null
          viewport_height?: number
          viewport_width?: number
          visitor_id?: string
          x?: number | null
          y?: number | null
        }
        Relationships: []
      }
      interactions_2026_07: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          element_class: string | null
          element_href: string | null
          element_id: string | null
          element_tag: string | null
          element_text: string | null
          filled_count: number | null
          form_action: string | null
          form_id: string | null
          form_method: string | null
          form_name: string | null
          id: string
          input_count: number | null
          interaction_type: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          page_height: number | null
          page_path: string
          page_url: string
          scroll_depth_percent: number | null
          scroll_direction: string | null
          scroll_y: number | null
          selector_path: string | null
          session_id: string
          target_fixed: boolean | null
          time_at_depth: number | null
          time_on_form: number | null
          timestamp: string
          user_agent: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x: number | null
          y: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          page_height?: number | null
          page_path: string
          page_url: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp: string
          user_agent?: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x?: number | null
          y?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          page_height?: number | null
          page_path?: string
          page_url?: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id?: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp?: string
          user_agent?: string | null
          viewport_height?: number
          viewport_width?: number
          visitor_id?: string
          x?: number | null
          y?: number | null
        }
        Relationships: []
      }
      interactions_2026_08: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          element_class: string | null
          element_href: string | null
          element_id: string | null
          element_tag: string | null
          element_text: string | null
          filled_count: number | null
          form_action: string | null
          form_id: string | null
          form_method: string | null
          form_name: string | null
          id: string
          input_count: number | null
          interaction_type: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          page_height: number | null
          page_path: string
          page_url: string
          scroll_depth_percent: number | null
          scroll_direction: string | null
          scroll_y: number | null
          selector_path: string | null
          session_id: string
          target_fixed: boolean | null
          time_at_depth: number | null
          time_on_form: number | null
          timestamp: string
          user_agent: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x: number | null
          y: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          page_height?: number | null
          page_path: string
          page_url: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp: string
          user_agent?: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x?: number | null
          y?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          page_height?: number | null
          page_path?: string
          page_url?: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id?: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp?: string
          user_agent?: string | null
          viewport_height?: number
          viewport_width?: number
          visitor_id?: string
          x?: number | null
          y?: number | null
        }
        Relationships: []
      }
      interactions_2026_09: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          element_class: string | null
          element_href: string | null
          element_id: string | null
          element_tag: string | null
          element_text: string | null
          filled_count: number | null
          form_action: string | null
          form_id: string | null
          form_method: string | null
          form_name: string | null
          id: string
          input_count: number | null
          interaction_type: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          page_height: number | null
          page_path: string
          page_url: string
          scroll_depth_percent: number | null
          scroll_direction: string | null
          scroll_y: number | null
          selector_path: string | null
          session_id: string
          target_fixed: boolean | null
          time_at_depth: number | null
          time_on_form: number | null
          timestamp: string
          user_agent: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x: number | null
          y: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          page_height?: number | null
          page_path: string
          page_url: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp: string
          user_agent?: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x?: number | null
          y?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          page_height?: number | null
          page_path?: string
          page_url?: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id?: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp?: string
          user_agent?: string | null
          viewport_height?: number
          viewport_width?: number
          visitor_id?: string
          x?: number | null
          y?: number | null
        }
        Relationships: []
      }
      interactions_2026_10: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          element_class: string | null
          element_href: string | null
          element_id: string | null
          element_tag: string | null
          element_text: string | null
          filled_count: number | null
          form_action: string | null
          form_id: string | null
          form_method: string | null
          form_name: string | null
          id: string
          input_count: number | null
          interaction_type: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          page_height: number | null
          page_path: string
          page_url: string
          scroll_depth_percent: number | null
          scroll_direction: string | null
          scroll_y: number | null
          selector_path: string | null
          session_id: string
          target_fixed: boolean | null
          time_at_depth: number | null
          time_on_form: number | null
          timestamp: string
          user_agent: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x: number | null
          y: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          page_height?: number | null
          page_path: string
          page_url: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp: string
          user_agent?: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x?: number | null
          y?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          page_height?: number | null
          page_path?: string
          page_url?: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id?: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp?: string
          user_agent?: string | null
          viewport_height?: number
          viewport_width?: number
          visitor_id?: string
          x?: number | null
          y?: number | null
        }
        Relationships: []
      }
      interactions_archive: {
        Row: {
          archived_at: string
          country: string | null
          created_at: string
          device_type: string | null
          element_class: string | null
          element_href: string | null
          element_id: string | null
          element_tag: string | null
          element_text: string | null
          filled_count: number | null
          form_action: string | null
          form_id: string | null
          form_method: string | null
          form_name: string | null
          id: string
          input_count: number | null
          interaction_type: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          page_height: number | null
          page_path: string
          page_url: string
          scroll_depth_percent: number | null
          scroll_direction: string | null
          scroll_y: number | null
          selector_path: string | null
          session_id: string
          target_fixed: boolean | null
          time_at_depth: number | null
          time_on_form: number | null
          timestamp: string
          user_agent: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x: number | null
          y: number | null
        }
        Insert: {
          archived_at?: string
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          page_height?: number | null
          page_path: string
          page_url: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp: string
          user_agent?: string | null
          viewport_height: number
          viewport_width: number
          visitor_id: string
          x?: number | null
          y?: number | null
        }
        Update: {
          archived_at?: string
          country?: string | null
          created_at?: string
          device_type?: string | null
          element_class?: string | null
          element_href?: string | null
          element_id?: string | null
          element_tag?: string | null
          element_text?: string | null
          filled_count?: number | null
          form_action?: string | null
          form_id?: string | null
          form_method?: string | null
          form_name?: string | null
          id?: string
          input_count?: number | null
          interaction_type?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          page_height?: number | null
          page_path?: string
          page_url?: string
          scroll_depth_percent?: number | null
          scroll_direction?: string | null
          scroll_y?: number | null
          selector_path?: string | null
          session_id?: string
          target_fixed?: boolean | null
          time_at_depth?: number | null
          time_on_form?: number | null
          timestamp?: string
          user_agent?: string | null
          viewport_height?: number
          viewport_width?: number
          visitor_id?: string
          x?: number | null
          y?: number | null
        }
        Relationships: []
      }
      mail_template: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          creator: string | null
          editor: string | null
          id: string
          is_global: boolean
          key: string | null
          respect_preference: boolean | null
          status: number | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          creator?: string | null
          editor?: string | null
          id?: string
          is_global?: boolean
          key?: string | null
          respect_preference?: boolean | null
          status?: number | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          creator?: string | null
          editor?: string | null
          id?: string
          is_global?: boolean
          key?: string | null
          respect_preference?: boolean | null
          status?: number | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mcp_oauth_clients: {
        Row: {
          client_id: string
          client_name: string
          created_at: string
          last_granted_at: string | null
          redirect_uris: string[]
          token_endpoint_auth_method: string
        }
        Insert: {
          client_id: string
          client_name: string
          created_at?: string
          last_granted_at?: string | null
          redirect_uris: string[]
          token_endpoint_auth_method?: string
        }
        Update: {
          client_id?: string
          client_name?: string
          created_at?: string
          last_granted_at?: string | null
          redirect_uris?: string[]
          token_endpoint_auth_method?: string
        }
        Relationships: []
      }
      mcp_oauth_codes: {
        Row: {
          client_id: string
          code_challenge: string
          code_hash: string
          created_at: string
          expires_at: string
          redirect_uri: string
          scopes: string[]
          user_id: string
        }
        Insert: {
          client_id: string
          code_challenge: string
          code_hash: string
          created_at?: string
          expires_at: string
          redirect_uri: string
          scopes: string[]
          user_id: string
        }
        Update: {
          client_id?: string
          code_challenge?: string
          code_hash?: string
          created_at?: string
          expires_at?: string
          redirect_uri?: string
          scopes?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_oauth_tokens: {
        Row: {
          access_token_hash: string
          client_id: string
          created_at: string
          expires_at: string
          grant_id: string
          id: string
          refresh_expires_at: string | null
          refresh_token_hash: string | null
          revoked_at: string | null
          scopes: string[]
          user_id: string
        }
        Insert: {
          access_token_hash: string
          client_id: string
          created_at?: string
          expires_at: string
          grant_id: string
          id?: string
          refresh_expires_at?: string | null
          refresh_token_hash?: string | null
          revoked_at?: string | null
          scopes: string[]
          user_id: string
        }
        Update: {
          access_token_hash?: string
          client_id?: string
          created_at?: string
          expires_at?: string
          grant_id?: string
          id?: string
          refresh_expires_at?: string | null
          refresh_token_hash?: string | null
          revoked_at?: string | null
          scopes?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_store: {
        Row: {
          created_at: string
          creator: string | null
          editor: string | null
          id: string
          serial_number: string
          short_url: string
          status: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          creator?: string | null
          editor?: string | null
          id?: string
          serial_number: string
          short_url: string
          status?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          creator?: string | null
          editor?: string | null
          id?: string
          serial_number?: string
          short_url?: string
          status?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfc_store_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action: Json | null
          category: string
          channels: string[] | null
          created_at: string | null
          data: Json | null
          id: string
          message: string
          metadata: Json | null
          organization_id: string | null
          priority: string
          read_at: string | null
          scope: string
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          action?: Json | null
          category: string
          channels?: string[] | null
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          metadata?: Json | null
          organization_id?: string | null
          priority?: string
          read_at?: string | null
          scope: string
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Json | null
          category?: string
          channels?: string[] | null
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          metadata?: Json | null
          organization_id?: string | null
          priority?: string
          read_at?: string | null
          scope?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: string | null
          created_at: string
          id: string
          order_id: string
          partner_code: string
          plan_id: string | null
          request_id: string
          result_code: number
          retention_days: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: string | null
          created_at?: string
          id?: string
          order_id: string
          partner_code: string
          plan_id?: string | null
          request_id: string
          result_code?: number
          retention_days?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: string | null
          created_at?: string
          id?: string
          order_id?: string
          partner_code?: string
          plan_id?: string | null
          request_id?: string
          result_code?: number
          retention_days?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_credits: {
        Row: {
          ai_credits_balance: number
          ai_credits_last_reset: string
          ai_credits_used_this_month: number
          created_at: string
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          ai_credits_balance?: number
          ai_credits_last_reset?: string
          ai_credits_used_this_month?: number
          created_at?: string
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          ai_credits_balance?: number
          ai_credits_last_reset?: string
          ai_credits_used_this_month?: number
          created_at?: string
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          created_at: string
          email: string
          expired_at: string
          id: string
          invite_by: string
          org_id: string
          resent_at: string
          role_id: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expired_at: string
          id?: string
          invite_by: string
          org_id: string
          resent_at?: string
          role_id?: string
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          email?: string
          expired_at?: string
          id?: string
          invite_by?: string
          org_id?: string
          resent_at?: string
          role_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_invite_by_fkey"
            columns: ["invite_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          invite_by: string | null
          is_bot: boolean | null
          org_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_by?: string | null
          is_bot?: boolean | null
          org_id: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_by?: string | null
          is_bot?: boolean | null
          org_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_invite_by_fkey"
            columns: ["invite_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_quotas: {
        Row: {
          ai_monthly_budget_cents: number | null
          collections: number | null
          created_at: string
          dashboards: number
          domains: number
          event_rules: number
          id: string
          integrations: number
          members: number
          monthly_pageviews: number | null
          monthly_session_recordings: number
          monthly_touch_points: number
          org_id: string
          static_qr: number | null
          tags: number
          touch_points: number
          utm_templates: number
        }
        Insert: {
          ai_monthly_budget_cents?: number | null
          collections?: number | null
          created_at?: string
          dashboards?: number
          domains?: number
          event_rules?: number
          id?: string
          integrations?: number
          members?: number
          monthly_pageviews?: number | null
          monthly_session_recordings?: number
          monthly_touch_points?: number
          org_id: string
          static_qr?: number | null
          tags?: number
          touch_points?: number
          utm_templates?: number
        }
        Update: {
          ai_monthly_budget_cents?: number | null
          collections?: number | null
          created_at?: string
          dashboards?: number
          domains?: number
          event_rules?: number
          id?: string
          integrations?: number
          members?: number
          monthly_pageviews?: number | null
          monthly_session_recordings?: number
          monthly_touch_points?: number
          org_id?: string
          static_qr?: number | null
          tags?: number
          touch_points?: number
          utm_templates?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_quotas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_quotas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_reports: {
        Row: {
          created_at: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          organization_id: string
          recipient_emails: string[] | null
          report_data: Json
          report_period_end: string
          report_period_start: string
          report_type: string
          scheduled_for: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          organization_id: string
          recipient_emails?: string[] | null
          report_data: Json
          report_period_end: string
          report_period_start: string
          report_type: string
          scheduled_for?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          organization_id?: string
          recipient_emails?: string[] | null
          report_data?: Json
          report_period_end?: string
          report_period_start?: string
          report_type?: string
          scheduled_for?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          default_currency: string | null
          default_domain_id: string | null
          id: string
          name: string
          onboarding_state: Json | null
          org_slug: string | null
          setup_completed: boolean | null
          total_collections: number | null
          total_domains: number
          total_integrations: number
          total_members: number
          total_static_qr: number | null
          total_tags: number
          total_touch_points: number
          user_id: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          default_currency?: string | null
          default_domain_id?: string | null
          id?: string
          name: string
          onboarding_state?: Json | null
          org_slug?: string | null
          setup_completed?: boolean | null
          total_collections?: number | null
          total_domains?: number
          total_integrations?: number
          total_members?: number
          total_static_qr?: number | null
          total_tags?: number
          total_touch_points?: number
          user_id?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          default_currency?: string | null
          default_domain_id?: string | null
          id?: string
          name?: string
          onboarding_state?: Json | null
          org_slug?: string | null
          setup_completed?: boolean | null
          total_collections?: number | null
          total_domains?: number
          total_integrations?: number
          total_members?: number
          total_static_qr?: number | null
          total_tags?: number
          total_touch_points?: number
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_default_domain_id_fkey"
            columns: ["default_domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pageviews: {
        Row: {
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_category: string | null
          event_name: string | null
          event_properties: Json | null
          fbclid: string | null
          gclid: string | null
          id: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_hash: string | null
          page_path: string
          page_referrer: string | null
          page_title: string | null
          page_url: string
          region: string | null
          screen_height: number | null
          screen_width: number | null
          search_query: string | null
          session_id: string
          time_on_page: number | null
          timestamp: string
          tp_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_height: number | null
          viewport_width: number | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path: string
          page_referrer?: string | null
          page_title?: string | null
          page_url: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id: string
          time_on_page?: number | null
          timestamp: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path?: string
          page_referrer?: string | null
          page_title?: string | null
          page_url?: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id?: string
          time_on_page?: number | null
          timestamp?: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pageviews_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pageviews_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pageviews_tp_id_fkey"
            columns: ["tp_id"]
            isOneToOne: false
            referencedRelation: "touch_points"
            referencedColumns: ["id"]
          },
        ]
      }
      pageviews_2026_06: {
        Row: {
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_category: string | null
          event_name: string | null
          event_properties: Json | null
          fbclid: string | null
          gclid: string | null
          id: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_hash: string | null
          page_path: string
          page_referrer: string | null
          page_title: string | null
          page_url: string
          region: string | null
          screen_height: number | null
          screen_width: number | null
          search_query: string | null
          session_id: string
          time_on_page: number | null
          timestamp: string
          tp_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_height: number | null
          viewport_width: number | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path: string
          page_referrer?: string | null
          page_title?: string | null
          page_url: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id: string
          time_on_page?: number | null
          timestamp: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path?: string
          page_referrer?: string | null
          page_title?: string | null
          page_url?: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id?: string
          time_on_page?: number | null
          timestamp?: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      pageviews_2026_07: {
        Row: {
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_category: string | null
          event_name: string | null
          event_properties: Json | null
          fbclid: string | null
          gclid: string | null
          id: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_hash: string | null
          page_path: string
          page_referrer: string | null
          page_title: string | null
          page_url: string
          region: string | null
          screen_height: number | null
          screen_width: number | null
          search_query: string | null
          session_id: string
          time_on_page: number | null
          timestamp: string
          tp_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_height: number | null
          viewport_width: number | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path: string
          page_referrer?: string | null
          page_title?: string | null
          page_url: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id: string
          time_on_page?: number | null
          timestamp: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path?: string
          page_referrer?: string | null
          page_title?: string | null
          page_url?: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id?: string
          time_on_page?: number | null
          timestamp?: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      pageviews_2026_08: {
        Row: {
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_category: string | null
          event_name: string | null
          event_properties: Json | null
          fbclid: string | null
          gclid: string | null
          id: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_hash: string | null
          page_path: string
          page_referrer: string | null
          page_title: string | null
          page_url: string
          region: string | null
          screen_height: number | null
          screen_width: number | null
          search_query: string | null
          session_id: string
          time_on_page: number | null
          timestamp: string
          tp_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_height: number | null
          viewport_width: number | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path: string
          page_referrer?: string | null
          page_title?: string | null
          page_url: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id: string
          time_on_page?: number | null
          timestamp: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path?: string
          page_referrer?: string | null
          page_title?: string | null
          page_url?: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id?: string
          time_on_page?: number | null
          timestamp?: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      pageviews_2026_09: {
        Row: {
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_category: string | null
          event_name: string | null
          event_properties: Json | null
          fbclid: string | null
          gclid: string | null
          id: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_hash: string | null
          page_path: string
          page_referrer: string | null
          page_title: string | null
          page_url: string
          region: string | null
          screen_height: number | null
          screen_width: number | null
          search_query: string | null
          session_id: string
          time_on_page: number | null
          timestamp: string
          tp_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_height: number | null
          viewport_width: number | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path: string
          page_referrer?: string | null
          page_title?: string | null
          page_url: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id: string
          time_on_page?: number | null
          timestamp: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path?: string
          page_referrer?: string | null
          page_title?: string | null
          page_url?: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id?: string
          time_on_page?: number | null
          timestamp?: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      pageviews_2026_10: {
        Row: {
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_category: string | null
          event_name: string | null
          event_properties: Json | null
          fbclid: string | null
          gclid: string | null
          id: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_hash: string | null
          page_path: string
          page_referrer: string | null
          page_title: string | null
          page_url: string
          region: string | null
          screen_height: number | null
          screen_width: number | null
          search_query: string | null
          session_id: string
          time_on_page: number | null
          timestamp: string
          tp_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_height: number | null
          viewport_width: number | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path: string
          page_referrer?: string | null
          page_title?: string | null
          page_url: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id: string
          time_on_page?: number | null
          timestamp: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path?: string
          page_referrer?: string | null
          page_title?: string | null
          page_url?: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id?: string
          time_on_page?: number | null
          timestamp?: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      pageviews_archive: {
        Row: {
          archived_at: string
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_category: string | null
          event_name: string | null
          event_properties: Json | null
          fbclid: string | null
          gclid: string | null
          id: string
          ip: unknown
          is_bot: boolean | null
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_hash: string | null
          page_path: string
          page_referrer: string | null
          page_title: string | null
          page_url: string
          region: string | null
          screen_height: number | null
          screen_width: number | null
          search_query: string | null
          session_id: string
          time_on_page: number | null
          timestamp: string
          tp_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_height: number | null
          viewport_width: number | null
          visitor_id: string
        }
        Insert: {
          archived_at?: string
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path: string
          page_referrer?: string | null
          page_title?: string | null
          page_url: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id: string
          time_on_page?: number | null
          timestamp: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id: string
        }
        Update: {
          archived_at?: string
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_category?: string | null
          event_name?: string | null
          event_properties?: Json | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_hash?: string | null
          page_path?: string
          page_referrer?: string | null
          page_title?: string | null
          page_url?: string
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          search_query?: string | null
          session_id?: string
          time_on_page?: number | null
          timestamp?: string
          tp_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          content: Json | null
          created_at: string
          id: number
          order_id: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: number
          order_id?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: number
          order_id?: string | null
        }
        Relationships: []
      }
      plan_logs: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          advanced_features_allowed: string[] | null
          allow_custom_meta_tags: boolean
          allow_custom_utm_tags: boolean
          allowed_tp_types: string[] | null
          amount: string | null
          audit_logs_retention_days: number | null
          created_at: string
          data_retention_days: number | null
          extra_advanced_analytics: boolean
          id: string
          max_ai_credits: number
          max_collections_per_org: number | null
          max_dashboards_per_org: number | null
          max_domains_per_org: number | null
          max_event_rules_per_org: number | null
          max_integrations_per_org: number
          max_members_per_org: number | null
          max_orgs_per_user: number | null
          max_pageviews_per_month: number | null
          max_session_recordings_per_month: number | null
          max_slugs_per_tp: number
          max_static_qr_per_org: number | null
          max_tags_per_org: number | null
          max_tags_per_tp: number | null
          max_tps_per_month: number
          max_tps_per_org: number | null
          max_utm_templates_per_org: number
          name: string | null
          plan_key: string
          yearly_amount: string | null
        }
        Insert: {
          advanced_features_allowed?: string[] | null
          allow_custom_meta_tags?: boolean
          allow_custom_utm_tags?: boolean
          allowed_tp_types?: string[] | null
          amount?: string | null
          audit_logs_retention_days?: number | null
          created_at?: string
          data_retention_days?: number | null
          extra_advanced_analytics?: boolean
          id?: string
          max_ai_credits?: number
          max_collections_per_org?: number | null
          max_dashboards_per_org?: number | null
          max_domains_per_org?: number | null
          max_event_rules_per_org?: number | null
          max_integrations_per_org?: number
          max_members_per_org?: number | null
          max_orgs_per_user?: number | null
          max_pageviews_per_month?: number | null
          max_session_recordings_per_month?: number | null
          max_slugs_per_tp?: number
          max_static_qr_per_org?: number | null
          max_tags_per_org?: number | null
          max_tags_per_tp?: number | null
          max_tps_per_month?: number
          max_tps_per_org?: number | null
          max_utm_templates_per_org?: number
          name?: string | null
          plan_key: string
          yearly_amount?: string | null
        }
        Update: {
          advanced_features_allowed?: string[] | null
          allow_custom_meta_tags?: boolean
          allow_custom_utm_tags?: boolean
          allowed_tp_types?: string[] | null
          amount?: string | null
          audit_logs_retention_days?: number | null
          created_at?: string
          data_retention_days?: number | null
          extra_advanced_analytics?: boolean
          id?: string
          max_ai_credits?: number
          max_collections_per_org?: number | null
          max_dashboards_per_org?: number | null
          max_domains_per_org?: number | null
          max_event_rules_per_org?: number | null
          max_integrations_per_org?: number
          max_members_per_org?: number | null
          max_orgs_per_user?: number | null
          max_pageviews_per_month?: number | null
          max_session_recordings_per_month?: number | null
          max_slugs_per_tp?: number
          max_static_qr_per_org?: number | null
          max_tags_per_org?: number | null
          max_tags_per_tp?: number | null
          max_tps_per_month?: number
          max_tps_per_org?: number | null
          max_utm_templates_per_org?: number
          name?: string | null
          plan_key?: string
          yearly_amount?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          avatar: string | null
          ban_reason: string | null
          banned_at: string | null
          completed_events: string[] | null
          created_at: string | null
          display_name: string | null
          dob: string | null
          email: string | null
          id: string
          is_banned: boolean
          last_logged_in: string
          name: string | null
          signup_fp: string | null
          signup_ip: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string
          avatar?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          completed_events?: string[] | null
          created_at?: string | null
          display_name?: string | null
          dob?: string | null
          email?: string | null
          id: string
          is_banned?: boolean
          last_logged_in?: string
          name?: string | null
          signup_fp?: string | null
          signup_ip?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          avatar?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          completed_events?: string[] | null
          created_at?: string | null
          display_name?: string | null
          dob?: string | null
          email?: string | null
          id?: string
          is_banned?: boolean
          last_logged_in?: string
          name?: string | null
          signup_fp?: string | null
          signup_ip?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          desc: string | null
          id: string
          is_default: boolean
          is_owner_role: boolean | null
          name: string
          org_id: string | null
          permissions: Json[] | null
        }
        Insert: {
          desc?: string | null
          id?: string
          is_default?: boolean
          is_owner_role?: boolean | null
          name: string
          org_id?: string | null
          permissions?: Json[] | null
        }
        Update: {
          desc?: string | null
          id?: string
          is_default?: boolean
          is_owner_role?: boolean | null
          name?: string
          org_id?: string | null
          permissions?: Json[] | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      safety_violations: {
        Row: {
          checked_url: string
          created_at: string
          detected_at: string
          id: string
          organization_id: string
          resolved_at: string | null
          resolved_by: string | null
          source: string
          threat_types: string[]
          touch_point_id: string
        }
        Insert: {
          checked_url: string
          created_at?: string
          detected_at?: string
          id?: string
          organization_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          threat_types: string[]
          touch_point_id: string
        }
        Update: {
          checked_url?: string
          created_at?: string
          detected_at?: string
          id?: string
          organization_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          threat_types?: string[]
          touch_point_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_violations_touch_point_id_fkey"
            columns: ["touch_point_id"]
            isOneToOne: false
            referencedRelation: "touch_points"
            referencedColumns: ["id"]
          },
        ]
      }
      sdk_debug_logs: {
        Row: {
          batch_size: number | null
          client_type: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          ip: string | null
          organization_id: string
          publishable_key: string | null
          referrer: string | null
          request_id: string
          request_payload: Json
          request_type: string
          response_body: Json | null
          response_status: number
          sdk_version: string | null
          user_agent: string | null
        }
        Insert: {
          batch_size?: number | null
          client_type?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          ip?: string | null
          organization_id: string
          publishable_key?: string | null
          referrer?: string | null
          request_id: string
          request_payload: Json
          request_type: string
          response_body?: Json | null
          response_status: number
          sdk_version?: string | null
          user_agent?: string | null
        }
        Update: {
          batch_size?: number | null
          client_type?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          ip?: string | null
          organization_id?: string
          publishable_key?: string | null
          referrer?: string | null
          request_id?: string
          request_payload?: Json
          request_type?: string
          response_body?: Json | null
          response_status?: number
          sdk_version?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      session_funnel_results: {
        Row: {
          completed: boolean
          computed_at: string
          dropped_off: boolean
          funnel_id: string
          id: string
          organization_id: string
          period_end: string
          period_start: string
          reached_step: number
          session_id: string
          total_steps: number
          visitor_id: string
        }
        Insert: {
          completed: boolean
          computed_at?: string
          dropped_off: boolean
          funnel_id: string
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          reached_step: number
          session_id: string
          total_steps: number
          visitor_id: string
        }
        Update: {
          completed?: boolean
          computed_at?: string
          dropped_off?: boolean
          funnel_id?: string
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          reached_step?: number
          session_id?: string
          total_steps?: number
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_funnel_results_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      session_recordings: {
        Row: {
          browser: string | null
          browser_version: string | null
          byte_size: number
          chunk_index: number
          country: string | null
          created_at: string
          device_type: string | null
          ended_at: string
          id: string
          ip: unknown
          is_bot: boolean
          is_first_chunk: boolean
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_url: string
          sdk_version: string | null
          session_id: string
          started_at: string
          storage_path: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_url: string
          sdk_version?: string | null
          session_id: string
          started_at: string
          storage_path?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at?: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_url?: string
          sdk_version?: string | null
          session_id?: string
          started_at?: string
          storage_path?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_session_recordings_session_id"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_recordings_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_recordings_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      session_recordings_2026_06: {
        Row: {
          browser: string | null
          browser_version: string | null
          byte_size: number
          chunk_index: number
          country: string | null
          created_at: string
          device_type: string | null
          ended_at: string
          id: string
          ip: unknown
          is_bot: boolean
          is_first_chunk: boolean
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_url: string
          sdk_version: string | null
          session_id: string
          started_at: string
          storage_path: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_url: string
          sdk_version?: string | null
          session_id: string
          started_at: string
          storage_path?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at?: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_url?: string
          sdk_version?: string | null
          session_id?: string
          started_at?: string
          storage_path?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      session_recordings_2026_07: {
        Row: {
          browser: string | null
          browser_version: string | null
          byte_size: number
          chunk_index: number
          country: string | null
          created_at: string
          device_type: string | null
          ended_at: string
          id: string
          ip: unknown
          is_bot: boolean
          is_first_chunk: boolean
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_url: string
          sdk_version: string | null
          session_id: string
          started_at: string
          storage_path: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_url: string
          sdk_version?: string | null
          session_id: string
          started_at: string
          storage_path?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at?: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_url?: string
          sdk_version?: string | null
          session_id?: string
          started_at?: string
          storage_path?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      session_recordings_2026_08: {
        Row: {
          browser: string | null
          browser_version: string | null
          byte_size: number
          chunk_index: number
          country: string | null
          created_at: string
          device_type: string | null
          ended_at: string
          id: string
          ip: unknown
          is_bot: boolean
          is_first_chunk: boolean
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_url: string
          sdk_version: string | null
          session_id: string
          started_at: string
          storage_path: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_url: string
          sdk_version?: string | null
          session_id: string
          started_at: string
          storage_path?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at?: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_url?: string
          sdk_version?: string | null
          session_id?: string
          started_at?: string
          storage_path?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      session_recordings_2026_09: {
        Row: {
          browser: string | null
          browser_version: string | null
          byte_size: number
          chunk_index: number
          country: string | null
          created_at: string
          device_type: string | null
          ended_at: string
          id: string
          ip: unknown
          is_bot: boolean
          is_first_chunk: boolean
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_url: string
          sdk_version: string | null
          session_id: string
          started_at: string
          storage_path: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_url: string
          sdk_version?: string | null
          session_id: string
          started_at: string
          storage_path?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at?: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_url?: string
          sdk_version?: string | null
          session_id?: string
          started_at?: string
          storage_path?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      session_recordings_2026_10: {
        Row: {
          browser: string | null
          browser_version: string | null
          byte_size: number
          chunk_index: number
          country: string | null
          created_at: string
          device_type: string | null
          ended_at: string
          id: string
          ip: unknown
          is_bot: boolean
          is_first_chunk: boolean
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_url: string
          sdk_version: string | null
          session_id: string
          started_at: string
          storage_path: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_url: string
          sdk_version?: string | null
          session_id: string
          started_at: string
          storage_path?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at?: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_url?: string
          sdk_version?: string | null
          session_id?: string
          started_at?: string
          storage_path?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      session_recordings_archive: {
        Row: {
          archived_at: string
          browser: string | null
          browser_version: string | null
          byte_size: number
          chunk_index: number
          country: string | null
          created_at: string
          device_type: string | null
          ended_at: string
          id: string
          ip: unknown
          is_bot: boolean
          is_first_chunk: boolean
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_url: string
          sdk_version: string | null
          session_id: string
          started_at: string
          storage_path: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          archived_at?: string
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_url: string
          sdk_version?: string | null
          session_id: string
          started_at: string
          storage_path?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          archived_at?: string
          browser?: string | null
          browser_version?: string | null
          byte_size?: number
          chunk_index?: number
          country?: string | null
          created_at?: string
          device_type?: string | null
          ended_at?: string
          id?: string
          ip?: unknown
          is_bot?: boolean
          is_first_chunk?: boolean
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_url?: string
          sdk_version?: string | null
          session_id?: string
          started_at?: string
          storage_path?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          browser: string | null
          browser_version: string | null
          channel: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          duration_ms: number | null
          ended_at: string | null
          entry_page: string | null
          entry_url: string | null
          exit_page: string | null
          exit_url: string | null
          id: string
          ip: unknown
          is_bot: boolean | null
          is_bounce: boolean | null
          last_pageview_at: string | null
          li2_cid: string | null
          organization_id: string
          os: string | null
          os_version: string | null
          page_count: number | null
          recording_duration_ms: number | null
          referrer: string | null
          referrer_domain: string | null
          region: string | null
          session_id: string
          started_at: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          channel?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_ms?: number | null
          ended_at?: string | null
          entry_page?: string | null
          entry_url?: string | null
          exit_page?: string | null
          exit_url?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          is_bounce?: boolean | null
          last_pageview_at?: string | null
          li2_cid?: string | null
          organization_id: string
          os?: string | null
          os_version?: string | null
          page_count?: number | null
          recording_duration_ms?: number | null
          referrer?: string | null
          referrer_domain?: string | null
          region?: string | null
          session_id: string
          started_at: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          channel?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_ms?: number | null
          ended_at?: string | null
          entry_page?: string | null
          entry_url?: string | null
          exit_page?: string | null
          exit_url?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean | null
          is_bounce?: boolean | null
          last_pageview_at?: string | null
          li2_cid?: string | null
          organization_id?: string
          os?: string | null
          os_version?: string | null
          page_count?: number | null
          recording_duration_ms?: number | null
          referrer?: string | null
          referrer_domain?: string | null
          region?: string | null
          session_id?: string
          started_at?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_org_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      slugs: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          slug: string
          tp_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          slug: string
          tp_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          slug?: string
          tp_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slugs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slugs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "slugs_tp_id_fkey"
            columns: ["tp_id"]
            isOneToOne: false
            referencedRelation: "touch_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slugs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_setup_cache: {
        Row: {
          applied_at: string | null
          applied_event_rule_indices: Json | null
          applied_funnel_indices: Json | null
          created_at: string | null
          event_rule_suggestions: Json
          expires_at: string
          first_analyzed_at: string
          funnel_suggestions: Json
          id: string
          locale: string
          organization_id: string
          url: string
          url_hash: string
        }
        Insert: {
          applied_at?: string | null
          applied_event_rule_indices?: Json | null
          applied_funnel_indices?: Json | null
          created_at?: string | null
          event_rule_suggestions?: Json
          expires_at: string
          first_analyzed_at?: string
          funnel_suggestions?: Json
          id?: string
          locale?: string
          organization_id: string
          url: string
          url_hash: string
        }
        Update: {
          applied_at?: string | null
          applied_event_rule_indices?: Json | null
          applied_funnel_indices?: Json | null
          created_at?: string | null
          event_rule_suggestions?: Json
          expires_at?: string
          first_analyzed_at?: string
          funnel_suggestions?: Json
          id?: string
          locale?: string
          organization_id?: string
          url?: string
          url_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_setup_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_setup_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      static_qr: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string
          organization_id: string
          payload: Json
          qr_customize_options: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          organization_id: string
          payload: Json
          qr_customize_options?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          payload?: Json
          qr_customize_options?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "static_qr_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "static_qr_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "static_qr_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subdomain_claims: {
        Row: {
          claimed_at: string
          claimed_domain: string
          created_at: string
          domain_id: string | null
          failure_reason: string | null
          id: string
          organization_id: string
          status: string
          subdomain: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          claimed_at?: string
          claimed_domain: string
          created_at?: string
          domain_id?: string | null
          failure_reason?: string | null
          id?: string
          organization_id: string
          status?: string
          subdomain: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          claimed_at?: string
          claimed_domain?: string
          created_at?: string
          domain_id?: string | null
          failure_reason?: string | null
          id?: string
          organization_id?: string
          status?: string
          subdomain?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_domain_id"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fk_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_counters: {
        Row: {
          counter_type: string | null
          created_at: string | null
          current_value: number | null
          id: number
          is_active: boolean
          max_value: number | null
          updated_at: string | null
        }
        Insert: {
          counter_type?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: number
          is_active?: boolean
          max_value?: number | null
          updated_at?: string | null
        }
        Update: {
          counter_type?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: number
          is_active?: boolean
          max_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_cronjobs: {
        Row: {
          created_at: string
          crontab: string
          editor: string | null
          enabled: boolean
          entry_id: string | null
          id: string
          key: string
          max_retry: number
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crontab: string
          editor?: string | null
          enabled?: boolean
          entry_id?: string | null
          id?: string
          key: string
          max_retry?: number
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crontab?: string
          editor?: string | null
          enabled?: boolean
          entry_id?: string | null
          id?: string
          key?: string
          max_retry?: number
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          desc: string | null
          id: string
          name: string
          organization_id: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          desc?: string | null
          id?: string
          name: string
          organization_id: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          desc?: string | null
          id?: string
          name?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_org_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_org_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_fp_accurate: {
        Row: {
          browser_fp: string | null
          browser_update_count: number
          canvas_fp: string | null
          canvas_update_count: number
          cookies_ls_fail: number
          created_at: string
          id: string
          visit_count: number | null
        }
        Insert: {
          browser_fp?: string | null
          browser_update_count?: number
          canvas_fp?: string | null
          canvas_update_count?: number
          cookies_ls_fail?: number
          created_at?: string
          id?: string
          visit_count?: number | null
        }
        Update: {
          browser_fp?: string | null
          browser_update_count?: number
          canvas_fp?: string | null
          canvas_update_count?: number
          cookies_ls_fail?: number
          created_at?: string
          id?: string
          visit_count?: number | null
        }
        Relationships: []
      }
      touch_points: {
        Row: {
          access_control: Json | null
          asset_id: string | null
          collection_id: string | null
          content_type: string | null
          content_value: string | null
          conversion_tracking: Json | null
          created_at: string
          deleted_at: string | null
          desc: string | null
          domain_id: string | null
          enabled: boolean
          id: string
          integration: Json | null
          is_campaign_based: boolean
          meta_tags: Json | null
          name: string
          organization_id: string
          path_qr_code: string | null
          privacy_security: Json | null
          qr_customize_options: Json | null
          redirect_setting: Json | null
          safety_flagged_at: string | null
          safety_status: string | null
          safety_threat_types: string[] | null
          short_code: string | null
          short_id: number
          short_url: string
          slug: string | null
          suggested_slugs: string[] | null
          targeting: Json | null
          tracking: Json | null
          updated_at: string
          user_id: string
          utm_campaign_id: string | null
          utm_tags: Json | null
          variants_content: Json
        }
        Insert: {
          access_control?: Json | null
          asset_id?: string | null
          collection_id?: string | null
          content_type?: string | null
          content_value?: string | null
          conversion_tracking?: Json | null
          created_at?: string
          deleted_at?: string | null
          desc?: string | null
          domain_id?: string | null
          enabled?: boolean
          id?: string
          integration?: Json | null
          is_campaign_based?: boolean
          meta_tags?: Json | null
          name: string
          organization_id: string
          path_qr_code?: string | null
          privacy_security?: Json | null
          qr_customize_options?: Json | null
          redirect_setting?: Json | null
          safety_flagged_at?: string | null
          safety_status?: string | null
          safety_threat_types?: string[] | null
          short_code?: string | null
          short_id?: number
          short_url?: string
          slug?: string | null
          suggested_slugs?: string[] | null
          targeting?: Json | null
          tracking?: Json | null
          updated_at?: string
          user_id?: string
          utm_campaign_id?: string | null
          utm_tags?: Json | null
          variants_content?: Json
        }
        Update: {
          access_control?: Json | null
          asset_id?: string | null
          collection_id?: string | null
          content_type?: string | null
          content_value?: string | null
          conversion_tracking?: Json | null
          created_at?: string
          deleted_at?: string | null
          desc?: string | null
          domain_id?: string | null
          enabled?: boolean
          id?: string
          integration?: Json | null
          is_campaign_based?: boolean
          meta_tags?: Json | null
          name?: string
          organization_id?: string
          path_qr_code?: string | null
          privacy_security?: Json | null
          qr_customize_options?: Json | null
          redirect_setting?: Json | null
          safety_flagged_at?: string | null
          safety_status?: string | null
          safety_threat_types?: string[] | null
          short_code?: string | null
          short_id?: number
          short_url?: string
          slug?: string | null
          suggested_slugs?: string[] | null
          targeting?: Json | null
          tracking?: Json | null
          updated_at?: string
          user_id?: string
          utm_campaign_id?: string | null
          utm_tags?: Json | null
          variants_content?: Json
        }
        Relationships: [
          {
            foreignKeyName: "touch_points_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touch_points_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touch_points_utm_campaign_id_fkey"
            columns: ["utm_campaign_id"]
            isOneToOne: false
            referencedRelation: "utm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_touch_points_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_touch_points_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_touch_points_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "v2_touch_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      touch_sequences: {
        Row: {
          click_id: string
          created_at: string
          customer_profile_id: string
          id: string
          is_converting: boolean
          occurred_at: string
          organization_id: string
          position: number
          touch_point_id: string
          utm_source: string | null
          visit_id: string
        }
        Insert: {
          click_id: string
          created_at?: string
          customer_profile_id: string
          id?: string
          is_converting?: boolean
          occurred_at: string
          organization_id: string
          position: number
          touch_point_id: string
          utm_source?: string | null
          visit_id: string
        }
        Update: {
          click_id?: string
          created_at?: string
          customer_profile_id?: string
          id?: string
          is_converting?: boolean
          occurred_at?: string
          organization_id?: string
          position?: number
          touch_point_id?: string
          utm_source?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "touch_sequences_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touch_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touch_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "touch_sequences_touch_point_id_fkey"
            columns: ["touch_point_id"]
            isOneToOne: false
            referencedRelation: "touch_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touch_sequences_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      touchpoint_import_tasks: {
        Row: {
          created_at: string | null
          error_message: string | null
          file_path: string
          id: string
          org_id: string
          report_path: string | null
          result: Json | null
          status: string
          transform: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          file_path: string
          id?: string
          org_id: string
          report_path?: string | null
          result?: Json | null
          status?: string
          transform?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          file_path?: string
          id?: string
          org_id?: string
          report_path?: string | null
          result?: Json | null
          status?: string
          transform?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "touchpoint_import_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touchpoint_import_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "touchpoint_import_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tp_tag_links: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          tp_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          tp_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          tp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tp_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tp_tag_links_tp_id_fkey"
            columns: ["tp_id"]
            isOneToOne: false
            referencedRelation: "touch_points"
            referencedColumns: ["id"]
          },
        ]
      }
      user_email_preference: {
        Row: {
          categories: Json | null
          created_at: string | null
          email: string
          id: string
          unsubscribe_reason: string | null
          unsubscribe_token: string
          updated_at: string | null
        }
        Insert: {
          categories?: Json | null
          created_at?: string | null
          email: string
          id?: string
          unsubscribe_reason?: string | null
          unsubscribe_token?: string
          updated_at?: string | null
        }
        Update: {
          categories?: Json | null
          created_at?: string | null
          email?: string
          id?: string
          unsubscribe_reason?: string | null
          unsubscribe_token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string | null
          subscribed_at: string | null
          total_organizations: number
          used_trial: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          subscribed_at?: string | null
          total_organizations?: number
          used_trial?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          subscribed_at?: string | null
          total_organizations?: number
          used_trial?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_campaign_channels: {
        Row: {
          campaign_id: string
          channel_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          campaign_id: string
          channel_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          campaign_id?: string
          channel_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "utm_campaign_channels_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "utm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_campaign_channels_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "campaign_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_campaign_touchpoints: {
        Row: {
          campaign_id: string
          channel_id: string
          created_at: string | null
          id: string
          touchpoint_id: string
          utm_tags: Json | null
        }
        Insert: {
          campaign_id: string
          channel_id: string
          created_at?: string | null
          id?: string
          touchpoint_id: string
          utm_tags?: Json | null
        }
        Update: {
          campaign_id?: string
          channel_id?: string
          created_at?: string | null
          id?: string
          touchpoint_id?: string
          utm_tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_campaign_touchpoints_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "utm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_campaign_touchpoints_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "campaign_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_campaign_touchpoints_touchpoint_id_fkey"
            columns: ["touchpoint_id"]
            isOneToOne: true
            referencedRelation: "touch_points"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_campaigns: {
        Row: {
          created_at: string | null
          created_by: string
          custom_utm_enabled: boolean | null
          end_date: string | null
          id: string
          name: string
          organization_id: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          custom_utm_enabled?: boolean | null
          end_date?: string | null
          id?: string
          name: string
          organization_id: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          custom_utm_enabled?: boolean | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      utm_templates: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      variables: {
        Row: {
          created_at: string
          description: string | null
          element_selector: string | null
          element_type: string | null
          id: string
          key: string
          name: string
          organization_id: string
          page_path: string | null
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          element_selector?: string | null
          element_type?: string | null
          id?: string
          key: string
          name: string
          organization_id: string
          page_path?: string | null
          updated_at?: string
          user_id?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          element_selector?: string | null
          element_type?: string | null
          id?: string
          key?: string
          name?: string
          organization_id?: string
          page_path?: string | null
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "variables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "variables_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_archives: {
        Row: {
          archived_at: string | null
          asn: string | null
          campaign_id: string | null
          city: string | null
          content_value: string | null
          country: string | null
          created_at: string
          fp: string | null
          id: string
          ip: unknown
          is_bot: boolean
          isp: string | null
          organization_id: string | null
          os: string | null
          platform: string | null
          raw_referrer: string | null
          referrer: string | null
          region: string | null
          segment_type: string | null
          tp_id: string | null
          type: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign_id: string | null
          utm_channel_id: string | null
          utm_tags: Json | null
        }
        Insert: {
          archived_at?: string | null
          asn?: string | null
          campaign_id?: string | null
          city?: string | null
          content_value?: string | null
          country?: string | null
          created_at?: string
          fp?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean
          isp?: string | null
          organization_id?: string | null
          os?: string | null
          platform?: string | null
          raw_referrer?: string | null
          referrer?: string | null
          region?: string | null
          segment_type?: string | null
          tp_id?: string | null
          type?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign_id?: string | null
          utm_channel_id?: string | null
          utm_tags?: Json | null
        }
        Update: {
          archived_at?: string | null
          asn?: string | null
          campaign_id?: string | null
          city?: string | null
          content_value?: string | null
          country?: string | null
          created_at?: string
          fp?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean
          isp?: string | null
          organization_id?: string | null
          os?: string | null
          platform?: string | null
          raw_referrer?: string | null
          referrer?: string | null
          region?: string | null
          segment_type?: string | null
          tp_id?: string | null
          type?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign_id?: string | null
          utm_channel_id?: string | null
          utm_tags?: Json | null
        }
        Relationships: []
      }
      visits: {
        Row: {
          asn: string | null
          campaign_id: string | null
          channel: string | null
          city: string | null
          content_value: string | null
          country: string | null
          created_at: string
          fp: string | null
          id: string
          ip: unknown
          is_bot: boolean
          isp: string | null
          li2_cid: string | null
          organization_id: string | null
          os: string | null
          platform: string | null
          raw_referrer: string | null
          referrer: string | null
          region: string | null
          segment_type: string | null
          tp_id: string | null
          type: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign_id: string | null
          utm_channel_id: string | null
          utm_tags: Json | null
          visitor_id: string | null
        }
        Insert: {
          asn?: string | null
          campaign_id?: string | null
          channel?: string | null
          city?: string | null
          content_value?: string | null
          country?: string | null
          created_at?: string
          fp?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean
          isp?: string | null
          li2_cid?: string | null
          organization_id?: string | null
          os?: string | null
          platform?: string | null
          raw_referrer?: string | null
          referrer?: string | null
          region?: string | null
          segment_type?: string | null
          tp_id?: string | null
          type?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign_id?: string | null
          utm_channel_id?: string | null
          utm_tags?: Json | null
          visitor_id?: string | null
        }
        Update: {
          asn?: string | null
          campaign_id?: string | null
          channel?: string | null
          city?: string | null
          content_value?: string | null
          country?: string | null
          created_at?: string
          fp?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean
          isp?: string | null
          li2_cid?: string | null
          organization_id?: string | null
          os?: string | null
          platform?: string | null
          raw_referrer?: string | null
          referrer?: string | null
          region?: string | null
          segment_type?: string | null
          tp_id?: string | null
          type?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign_id?: string | null
          utm_channel_id?: string | null
          utm_tags?: Json | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visits_archive: {
        Row: {
          archived_at: string
          asn: string | null
          campaign_id: string | null
          channel: string | null
          city: string | null
          content_value: string | null
          country: string | null
          created_at: string
          fp: string | null
          id: string
          ip: unknown
          is_bot: boolean
          isp: string | null
          li2_cid: string | null
          organization_id: string | null
          os: string | null
          platform: string | null
          raw_referrer: string | null
          referrer: string | null
          region: string | null
          segment_type: string | null
          tp_id: string | null
          type: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign_id: string | null
          utm_channel_id: string | null
          utm_tags: Json | null
          visitor_id: string | null
        }
        Insert: {
          archived_at?: string
          asn?: string | null
          campaign_id?: string | null
          channel?: string | null
          city?: string | null
          content_value?: string | null
          country?: string | null
          created_at?: string
          fp?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean
          isp?: string | null
          li2_cid?: string | null
          organization_id?: string | null
          os?: string | null
          platform?: string | null
          raw_referrer?: string | null
          referrer?: string | null
          region?: string | null
          segment_type?: string | null
          tp_id?: string | null
          type?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign_id?: string | null
          utm_channel_id?: string | null
          utm_tags?: Json | null
          visitor_id?: string | null
        }
        Update: {
          archived_at?: string
          asn?: string | null
          campaign_id?: string | null
          channel?: string | null
          city?: string | null
          content_value?: string | null
          country?: string | null
          created_at?: string
          fp?: string | null
          id?: string
          ip?: unknown
          is_bot?: boolean
          isp?: string | null
          li2_cid?: string | null
          organization_id?: string | null
          os?: string | null
          platform?: string | null
          raw_referrer?: string | null
          referrer?: string | null
          region?: string | null
          segment_type?: string | null
          tp_id?: string | null
          type?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign_id?: string | null
          utm_channel_id?: string | null
          utm_tags?: Json | null
          visitor_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_report_performance: {
        Row: {
          avg_generation_time_seconds: number | null
          max_generation_time_seconds: number | null
          report_date: string | null
          report_type: string | null
          reports_generated: number | null
        }
        Relationships: []
      }
      v_weekly_report_status: {
        Row: {
          failed_reports: number | null
          generated_reports: number | null
          last_report_generated: string | null
          organization_id: string | null
          organization_name: string | null
          reports_this_week: number | null
          sent_reports: number | null
          total_reports: number | null
        }
        Relationships: []
      }
      visits_by_organization: {
        Row: {
          fp: number | null
          organization_id: string | null
          os: Json | null
          platform: Json | null
          total: number | null
          type: Json | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_report_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      visits_by_tp: {
        Row: {
          fp: number | null
          os: Json | null
          platform: Json | null
          total: number | null
          tp_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_old_free_visits: { Args: never; Returns: undefined }
      archive_old_premium_trial_visits: { Args: never; Returns: undefined }
      /**
       * Khai báo THỦ CÔNG (wave 4 S1). `yarn gen:types` trỏ một project Supabase khác và sẽ xoá
       * nhóm artifact này, nên hàm mới được viết tay ở đây — xem CLAUDE.md và
       * supabase/migrations/20261012000001_artifacts__visit_counts_rpc.sql.
       */
      artifact_visit_counts: {
        Args: { p_tp_ids: string[] }
        Returns: {
          tp_id: string
          visits: number
        }[]
      }
      artifact_create_if_within_quota: {
        Args: {
          p_id: string
          p_org_id: string
          p_user_id: string
          p_name: string
          p_kind: string
          p_serve_token: string
          p_storage_path: string
          p_content_type: string
          p_size_bytes: number
          p_quota_bytes: number
        }
        Returns: {
          access_mode: string
          access_version: number
          content_type: string
          created_at: string
          id: string
          kind: string
          name: string
          organization_id: string
          password_hash: string | null
          password_set_at: string | null
          serve_token: string
          size_bytes: number
          status: string
          storage_path: string
          touch_point_id: string | null
          updated_at: string
          user_id: string
        }[]
      }
      artifact_publish_if_within_quota: {
        Args: {
          p_org_id: string
          p_artifact_id: string
          p_touch_point_id: string
          p_limit: number
        }
        Returns: {
          access_mode: string
          access_version: number
          content_type: string
          created_at: string
          id: string
          kind: string
          name: string
          organization_id: string
          password_hash: string | null
          password_set_at: string | null
          serve_token: string
          size_bytes: number
          status: string
          storage_path: string
          touch_point_id: string | null
          updated_at: string
          user_id: string
        }[]
      }
      artifact_replace_if_within_quota: {
        Args: {
          p_org_id: string
          p_artifact_id: string
          p_kind: string
          p_storage_path: string
          p_content_type: string
          p_size_bytes: number
          p_quota_bytes: number
        }
        Returns: {
          access_mode: string
          access_version: number
          content_type: string
          created_at: string
          id: string
          kind: string
          name: string
          organization_id: string
          password_hash: string | null
          password_set_at: string | null
          serve_token: string
          size_bytes: number
          status: string
          storage_path: string
          touch_point_id: string | null
          updated_at: string
          user_id: string
        }[]
      }
      assign_free_plan: {
        Args: {
          _fp: string
          _ip: string
          _limit: number
          _max_per_fp: number
          _max_per_ip: number
          _plan_id: string
          _user_id: string
        }
        Returns: Json
      }
      backfill_touch_sequences: {
        Args: {
          _customer_profile_ids?: string[]
          _mode?: string
          _organization_id?: string
        }
        Returns: {
          customers_processed: number
          mode_executed: string
          rows_inserted: number
          rows_skipped_unresolvable: number
        }[]
      }
      check_fingerprint: {
        Args: { _browser_fp: string; _canvas_fp: string }
        Returns: {
          browser_failed: number
          browser_fp: string | null
          canvas_failed: number
          canvas_fp: string | null
          created_at: string
          id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "fingerprints"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      classify_channel: {
        Args: {
          p_campaign: string
          p_medium: string
          p_referrer: string
          p_source: string
        }
        Returns: string
      }
      cleanup_old_reports: { Args: never; Returns: number }
      count_touch_points_by_type: {
        Args: never
        Returns: {
          count: number
          type: string
        }[]
      }
      export_all_profiles: {
        Args: {
          created_from?: string
          created_to?: string
          filter_plan?: string
          search_column?: string
          search_value?: string
        }
        Returns: Json
      }
      generate_all_weekly_reports: {
        Args: { target_week?: string }
        Returns: {
          error_message: string
          organization_id: string
          organization_name: string
          report_generated: boolean
          report_id: string
        }[]
      }
      generate_weekly_report: {
        Args: { report_week_start?: string; target_organization_id: string }
        Returns: Json
      }
      geolite_lookup: {
        Args: {
          _continent_codes?: string[]
          _country_codes?: string[]
          _type: string
        }
        Returns: {
          label: string
          value: string
        }[]
      }
      get_acquisition_campaign_performance: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_acquisition_campaign_performance_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_acquisition_channel_attribution: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_acquisition_growth_trends: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_acquisition_growth_trends_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_acquisition_touchpoint_attribution: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_acquisition_touchpoint_attribution_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_acquisition_traffic_sources: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_acquisition_traffic_sources_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_ai_provider_active_key: {
        Args: { p_provider_types: string[] }
        Returns: {
          api_key: string
          key_identifier: string
          provider_type: string
        }[]
      }
      get_attribution_by_model: {
        Args: {
          _collection_ids?: string[]
          _end_time?: string
          _exclude_bot?: boolean
          _half_life_days?: number
          _include_null_collection?: boolean
          _interaction_types?: string[]
          _model?: string
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _user_id?: string
          _utm_campaign_values?: string[]
          _utm_medium_values?: string[]
          _utm_source_values?: string[]
        }
        Returns: Json
      }
      get_audience_behavior_segments: {
        Args: {
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_audience_device_analysis: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_audience_device_analysis_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_audience_geographic_distribution: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_audience_geographic_distribution_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_batch_touch_point_ids: {
        Args: { batch_size: number }
        Returns: {
          id: number
        }[]
      }
      get_behavior_interaction_frequency: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_behavior_interaction_frequency_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_behavior_temporal_patterns: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_behavior_temporal_patterns_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_behavior_user_journeys: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_behavior_user_journeys_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_campaign_analytic: {
        Args: { p_campaign_id: string }
        Returns: {
          date: string
          os: Json[]
          platform: Json[]
          total: number
          type: Json[]
          unique_visit: Json[]
        }[]
      }
      get_campaigns_from_touch_point: {
        Args: { tp_id: string }
        Returns: {
          affected_tag_ids: string[] | null
          created_at: string
          desc: string | null
          edges: Json[] | null
          enabled: boolean
          id: string
          name: string
          nodes: Json[] | null
          organization_id: string
          pre_combination: Json | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "campaigns"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_conversion_stats: {
        Args: {
          _collection_ids?: string[]
          _end_date?: string
          _exclude_bot?: boolean
          _organization_id: string
          _source?: string
          _start_date?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _viewable_tp_ids?: string[]
        }
        Returns: Json
      }
      get_conversion_stats_v2: {
        Args: {
          _collection_ids?: string[]
          _end_date?: string
          _event_names?: string[]
          _exclude_bot?: boolean
          _organization_id: string
          _source?: string
          _start_date?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _viewable_tp_ids?: string[]
        }
        Returns: Json
      }
      get_conversion_stats_v3: {
        Args: {
          _channels?: string[]
          _collection_ids?: string[]
          _end_date?: string
          _event_names?: string[]
          _exclude_bot?: boolean
          _organization_id: string
          _source?: string
          _start_date?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _utm_sources?: string[]
          _viewable_tp_ids?: string[]
        }
        Returns: Json
      }
      get_dashboard_analytics: {
        Args: {
          _collection_ids?: string[]
          _include_null_collection?: boolean
          _organization_id: string
          _timezone?: string
        }
        Returns: Json
      }
      get_dashboard_analytics_old: {
        Args: { _organization_id: string; _timezone?: string }
        Returns: Json
      }
      get_dashboard_analytics_v2: {
        Args: {
          _collection_ids?: string[]
          _include_null_collection?: boolean
          _organization_id: string
          _timezone?: string
          _user_id?: string
        }
        Returns: Json
      }
      get_dashboard_analytics_v3: {
        Args: {
          _collection_ids?: string[]
          _exclude_bot?: boolean
          _include_null_collection?: boolean
          _organization_id: string
          _timezone?: string
          _user_id?: string
        }
        Returns: Json
      }
      get_deep_link_click_summary: {
        Args: {
          _collection_ids?: string[]
          _end_date?: string
          _exclude_bot?: boolean
          _organization_id: string
          _start_date?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _utm_campaigns?: string[]
          _utm_mediums?: string[]
          _utm_sources?: string[]
          _viewable_tp_ids?: string[]
        }
        Returns: {
          by_channel: Json
          by_segment_type: Json
          clicks: number
        }[]
      }
      get_deep_link_click_timeseries: {
        Args: {
          _bucket?: string
          _collection_ids?: string[]
          _end_date?: string
          _exclude_bot?: boolean
          _organization_id: string
          _start_date?: string
          _tag_ids?: string[]
          _timezone?: string
          _tp_ids?: string[]
          _utm_campaigns?: string[]
          _utm_mediums?: string[]
          _utm_sources?: string[]
          _viewable_tp_ids?: string[]
        }
        Returns: {
          bucket: string
          clicks: number
        }[]
      }
      get_deep_link_ranking: {
        Args: {
          _collection_ids?: string[]
          _end_date?: string
          _exclude_bot?: boolean
          _group_by: string
          _organization_id: string
          _start_date?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _utm_campaigns?: string[]
          _utm_mediums?: string[]
          _utm_sources?: string[]
          _viewable_tp_ids?: string[]
        }
        Returns: Json
      }
      get_deep_link_summary: {
        Args: {
          _collection_ids?: string[]
          _end_date?: string
          _exclude_bot?: boolean
          _organization_id: string
          _start_date?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _utm_campaigns?: string[]
          _utm_mediums?: string[]
          _utm_sources?: string[]
          _viewable_tp_ids?: string[]
        }
        Returns: {
          app_opens: number
          by_method: Json
          by_miss_reason: Json
          by_platform: Json
          deferred_matches: number
          deferred_misses: number
          match_rate: number
        }[]
      }
      get_deep_link_timeseries: {
        Args: {
          _bucket?: string
          _collection_ids?: string[]
          _end_date?: string
          _exclude_bot?: boolean
          _organization_id: string
          _start_date?: string
          _tag_ids?: string[]
          _timezone?: string
          _tp_ids?: string[]
          _utm_campaigns?: string[]
          _utm_mediums?: string[]
          _utm_sources?: string[]
          _viewable_tp_ids?: string[]
        }
        Returns: {
          app_opens: number
          bucket: string
          deferred_matches: number
          deferred_misses: number
        }[]
      }
      get_distinct_event_names: {
        Args: { _org_id: string }
        Returns: {
          event_name: string
        }[]
      }
      get_distinct_utm_values: {
        Args: {
          _campaign_ids?: string[]
          _collection_ids?: string[]
          _end_time?: string
          _exclude_bot?: boolean
          _include_null_collection?: boolean
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
        }
        Returns: Json
      }
      get_fingerprint: {
        Args: { _browser_fp: string; _canvas_fp: string; _client_key: string }
        Returns: {
          browser_failed: number
          browser_fp: string | null
          canvas_failed: number
          canvas_fp: string | null
          created_at: string
          id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "fingerprints"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_forms_daily:
        | {
            Args: {
              _form_id?: string
              _form_name?: string
              _from: string
              _org_id: string
              _page_path?: string
              _to: string
            }
            Returns: {
              day: string
              fills: number
              submits: number
            }[]
          }
        | {
            Args: {
              _form_id?: string
              _form_name?: string
              _from: string
              _hostname?: string
              _org_id: string
              _page_path?: string
              _to: string
            }
            Returns: {
              day: string
              fills: number
              submits: number
            }[]
          }
      get_forms_overview:
        | {
            Args: { _from: string; _org_id: string; _to: string }
            Returns: {
              avg_time_on_form: number
              completion_pct: number
              fills: number
              form_action: string
              form_id: string
              form_name: string
              page_path: string
              submits: number
            }[]
          }
        | {
            Args: {
              _from: string
              _hostname?: string
              _org_id: string
              _to: string
            }
            Returns: {
              avg_time_on_form: number
              completion_pct: number
              fills: number
              form_action: string
              form_id: string
              form_name: string
              page_path: string
              submits: number
            }[]
          }
      get_funnel_data: {
        Args: {
          _collection_ids?: string[]
          _end_date?: string
          _exclude_bot?: boolean
          _organization_id: string
          _start_date?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _viewable_tp_ids?: string[]
        }
        Returns: Json
      }
      get_funnel_data_v2: {
        Args: {
          _collection_ids?: string[]
          _end_date?: string
          _event_names?: string[]
          _exclude_bot?: boolean
          _organization_id: string
          _start_date?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _viewable_tp_ids?: string[]
        }
        Returns: Json
      }
      get_funnel_data_v3: {
        Args: {
          _channels?: string[]
          _collection_ids?: string[]
          _end_date?: string
          _event_names?: string[]
          _exclude_bot?: boolean
          _organization_id: string
          _start_date?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _utm_sources?: string[]
          _viewable_tp_ids?: string[]
        }
        Returns: Json
      }
      get_funnel_list_stats: {
        Args: { p_org_id: string }
        Returns: {
          biggest_dropoff_drop_offs: number
          biggest_dropoff_next_step_name: string
          biggest_dropoff_rate: number
          biggest_dropoff_step_name: string
          biggest_dropoff_step_position: number
          conversion_rate: number
          cvr_trend: number
          funnel_id: string
          total_conversions: number
          total_entries: number
        }[]
      }
      get_group_analytic: {
        Args: { p_org_id: string }
        Returns: {
          fp: number[]
          os: Json[]
          platform: Json[]
          total: number[]
          type: Json[]
        }[]
      }
      get_group_analytic_overtime: {
        Args: {
          p_group_id?: string
          p_location_id?: string
          p_org_id?: string
          p_tp_id?: string
        }
        Returns: {
          date: string
          os: Json[]
          platform: Json[]
          total: number
          type: Json[]
          unique_visit: Json[]
        }[]
      }
      get_heatmap_clicks: {
        Args: {
          _device_type?: string
          _from: string
          _grid_size?: number
          _hostname?: string
          _org_id: string
          _page_path: string
          _target_width?: number
          _to: string
          _tp_id?: string
        }
        Returns: Json
      }
      get_heatmap_clicks_v2: {
        Args: {
          _device_type?: string
          _from: string
          _grid_size?: number
          _hostname?: string
          _org_id: string
          _page_path: string
          _target_height?: number
          _target_width?: number
          _to: string
          _tp_id?: string
        }
        Returns: Json
      }
      get_last_day_report: { Args: never; Returns: Json }
      get_link_journey_behavioral: {
        Args: {
          _end_date: string
          _org_id: string
          _start_date: string
          _tp_id: string
        }
        Returns: Json
      }
      get_link_journey_conversions: {
        Args: {
          _end_date: string
          _org_id: string
          _start_date: string
          _tp_id: string
        }
        Returns: Json
      }
      get_link_journey_page_flow: {
        Args: {
          _end_date: string
          _limit?: number
          _org_id: string
          _start_date: string
          _tp_id: string
        }
        Returns: Json
      }
      get_link_journey_touch_points: {
        Args: { _org_id: string }
        Returns: Json
      }
      get_link_journey_traffic_summary: {
        Args: {
          _end_date: string
          _org_id: string
          _start_date: string
          _tp_id: string
        }
        Returns: Json
      }
      get_next_touch_point_short_id: { Args: never; Returns: number }
      get_org_plan: { Args: { org_id: string }; Returns: Json }
      get_org_summary: { Args: { _organization_id: string }; Returns: Json }
      get_org_visitors: {
        Args: {
          p_country?: string
          p_device_type?: string
          p_org_id: string
          p_page_index?: number
          p_page_size?: number
          p_search?: string
          p_sort_desc?: boolean
          p_started_at_from?: string
          p_started_at_to?: string
        }
        Returns: {
          browser: string
          city: string
          country: string
          device_type: string
          first_visit_at: string
          last_visit_at: string
          li2_cid: string
          os: string
          region: string
          session_count: number
          total_count: number
          total_pages: number
          visitor_id: string
        }[]
      }
      get_organization_details: {
        Args: { org_id: string }
        Returns: {
          allow_custom_meta_tags: boolean
          allow_custom_utm_tags: boolean
          allowed_tp_types: string[]
          id: string
          max_domains_per_org: number
          max_integrations_per_org: number
          max_members_per_org: number
          max_slugs_per_tp: number
          max_tags_per_org: number
          max_tags_per_tp: number
          max_tps_per_org: number
          name: string
          total_domains: number
          total_integrations: number
          total_members: number
          total_tags: number
          total_touch_points: number
          user_id: string
        }[]
      }
      get_organization_details_backup: {
        Args: { org_id: string }
        Returns: {
          allowed_tp_types: string[]
          id: string
          max_domains_per_org: number
          max_members_per_org: number
          max_tags_per_org: number
          max_tags_per_tp: number
          max_tps_per_org: number
          name: string
          total_domains: number
          total_members: number
          total_tags: number
          total_touch_points: number
          user_id: string
        }[]
      }
      get_organization_reports: {
        Args: {
          limit_count?: number
          report_type_filter?: string
          requesting_user_id: string
          target_organization_id?: string
        }
        Returns: {
          generated_at: string
          organization_id: string
          organization_name: string
          report_id: string
          report_period_end: string
          report_period_start: string
          report_type: string
          status: string
        }[]
      }
      get_overview_daily_trend: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_overview_daily_trend_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_overview_data: {
        Args: {
          _collection_ids?: string[]
          _exclude_bot?: boolean
          _include_null_collection?: boolean
          _include_pro?: boolean
          _organization_id: string
          _timezone?: string
          _user_id?: string
        }
        Returns: Json
      }
      get_overview_peak_heatmap: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_overview_peak_heatmap_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_overview_stats_panel: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_overview_stats_panel_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_overview_top_touchpoints: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_overview_top_touchpoints_old: {
        Args: {
          p_is_premium?: boolean
          p_organization_id: string
          p_period_days: number
          p_tag_ids?: string[]
          p_timezone?: string
          p_touchpoint_ids?: string[]
        }
        Returns: Json
      }
      get_paginated_data: {
        Args: {
          filter_column?: string
          filter_value?: string
          page_num: number
          page_size: number
          search_column?: string
          search_value?: string
          table_name: string
        }
        Returns: Json[]
      }
      get_profile_visits: {
        Args: { _from: string; _limit?: number; _to: string }
        Returns: {
          email: string
          total_clicks: number
          total_scans: number
          total_visits: number
          unique_visits: number
        }[]
      }
      get_profiles_list: {
        Args: {
          created_from?: string
          created_to?: string
          filter_plan?: string
          page_num: number
          page_size: number
          search_column?: string
          search_value?: string
        }
        Returns: Json
      }
      get_rage_click_summary: {
        Args: {
          _device_type?: string
          _from: string
          _hostname?: string
          _limit?: number
          _org_id: string
          _page_path: string
          _to: string
          _tp_id?: string
        }
        Returns: Json
      }
      get_ranking_by_destinations: {
        Args: {
          _campaign_ids?: string[]
          _collection_ids?: string[]
          _end_time?: string
          _exclude_bot?: boolean
          _include_null_collection?: boolean
          _interaction_types?: string[]
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _type: string
          _user_id?: string
          _utm_campaign_values?: string[]
          _utm_medium_values?: string[]
          _utm_source_values?: string[]
        }
        Returns: Json
      }
      get_ranking_by_links: {
        Args: {
          _campaign_ids?: string[]
          _collection_ids?: string[]
          _end_time?: string
          _exclude_bot?: boolean
          _include_null_collection?: boolean
          _interaction_types?: string[]
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _type: string
          _user_id?: string
          _utm_campaign_values?: string[]
          _utm_medium_values?: string[]
          _utm_source_values?: string[]
        }
        Returns: Json
      }
      get_ranking_by_referrers: {
        Args: {
          _collection_ids?: string[]
          _end_time?: string
          _exclude_bot?: boolean
          _include_null_collection?: boolean
          _interaction_types?: string[]
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _type: string
          _user_id?: string
          _utm_campaign_values?: string[]
          _utm_medium_values?: string[]
          _utm_source_values?: string[]
        }
        Returns: Json
      }
      get_ranking_by_utm_parameters:
        | {
            Args: {
              _campaign_ids?: string[]
              _collection_ids?: string[]
              _end_time?: string
              _exclude_bot?: boolean
              _interaction_types?: string[]
              _organization_id: string
              _start_time?: string
              _tp_ids?: string[]
              _type: string
              _utm_campaign_values?: string[]
              _utm_medium_values?: string[]
              _utm_source_values?: string[]
            }
            Returns: Json
          }
        | {
            Args: {
              _collection_ids?: string[]
              _end_time?: string
              _exclude_bot?: boolean
              _include_null_collection?: boolean
              _interaction_types?: string[]
              _organization_id: string
              _start_time?: string
              _tag_ids?: string[]
              _tp_ids?: string[]
              _type: string
              _user_id?: string
              _utm_campaign_values?: string[]
              _utm_medium_values?: string[]
              _utm_source_values?: string[]
            }
            Returns: Json
          }
      get_raw_visit_data: {
        Args: {
          p_collection_ids?: string[]
          p_end_time?: string
          p_exclude_bot?: boolean
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_last_hours: number
          p_limit?: number
          p_offset?: number
          p_organization_id: string
          p_start_time?: string
          p_tag_ids?: string[]
          p_timezone?: string
          p_tp_ids?: string[]
          p_utm_campaign_values?: string[]
          p_utm_medium_values?: string[]
          p_utm_source_values?: string[]
        }
        Returns: {
          channel: string
          city: string
          country: string
          created_at: string
          id: string
          ip: string
          isp: string
          os: string
          platform: string
          referrer: string
          total_count: number
          touchpoint_id: string
          touchpoint_name: string
        }[]
      }
      get_raw_visit_data_old: {
        Args: {
          p_end_time?: string
          p_exclude_bot?: boolean
          p_is_premium?: boolean
          p_last_hours: number
          p_limit?: number
          p_offset?: number
          p_organization_id: string
          p_start_time?: string
          p_tag_ids?: string[]
          p_timezone?: string
          p_tp_ids?: string[]
        }
        Returns: {
          channel: string
          city: string
          country: string
          created_at: string
          id: string
          ip: string
          isp: string
          os: string
          platform: string
          referrer: string
          total_count: number
          touchpoint_id: string
          touchpoint_name: string
        }[]
      }
      get_raw_visit_data_v2: {
        Args: {
          p_collection_ids?: string[]
          p_end_time?: string
          p_exclude_bot?: boolean
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_last_hours: number
          p_limit?: number
          p_offset?: number
          p_organization_id: string
          p_start_time?: string
          p_tag_ids?: string[]
          p_timezone?: string
          p_tp_ids?: string[]
          p_user_id?: string
          p_utm_campaign_values?: string[]
          p_utm_medium_values?: string[]
          p_utm_source_values?: string[]
        }
        Returns: {
          channel: string
          city: string
          country: string
          created_at: string
          id: string
          ip: string
          isp: string
          os: string
          platform: string
          referrer: string
          total_count: number
          touchpoint_id: string
          touchpoint_name: string
        }[]
      }
      get_raw_visit_data_v3: {
        Args: {
          p_collection_ids?: string[]
          p_end_time?: string
          p_exclude_bot?: boolean
          p_include_null_collection?: boolean
          p_interaction_types?: string[]
          p_is_premium?: boolean
          p_last_hours: number
          p_limit?: number
          p_offset?: number
          p_organization_id: string
          p_start_time?: string
          p_tag_ids?: string[]
          p_timezone?: string
          p_tp_ids?: string[]
          p_user_id?: string
          p_utm_campaign_values?: string[]
          p_utm_medium_values?: string[]
          p_utm_source_values?: string[]
        }
        Returns: {
          channel: string
          city: string
          country: string
          created_at: string
          id: string
          ip: string
          isp: string
          os: string
          platform: string
          referrer: string
          total_count: number
          touchpoint_id: string
          touchpoint_name: string
        }[]
      }
      get_raw_visit_data_v4: {
        Args: {
          p_collection_ids?: string[]
          p_end_time?: string
          p_exclude_bot?: boolean
          p_include_null_collection?: boolean
          p_interaction_types?: string[]
          p_is_premium?: boolean
          p_last_hours: number
          p_limit?: number
          p_offset?: number
          p_organization_id: string
          p_start_time?: string
          p_tag_ids?: string[]
          p_timezone?: string
          p_tp_ids?: string[]
          p_user_id?: string
          p_utm_campaign_values?: string[]
          p_utm_medium_values?: string[]
          p_utm_source_values?: string[]
        }
        Returns: {
          channel: string
          city: string
          country: string
          created_at: string
          customer_email: string
          customer_external_id: string
          customer_name: string
          customer_profile_id: string
          id: string
          ip: string
          isp: string
          os: string
          platform: string
          referrer: string
          total_count: number
          touchpoint_id: string
          touchpoint_name: string
          visitor_id: string
        }[]
      }
      get_realtime_data: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_last_hours: number
          p_organization_id: string
          p_timezone?: string
        }
        Returns: {
          channel: string
          city: string
          country: string
          created_at: string
          id: string
          ip: string
          isp: string
          os: string
          platform: string
          referrer: string
          touchpoint_id: string
          touchpoint_name: string
        }[]
      }
      get_realtime_data_old: {
        Args: {
          p_is_premium?: boolean
          p_last_hours: number
          p_organization_id: string
          p_timezone?: string
        }
        Returns: {
          channel: string
          city: string
          country: string
          created_at: string
          id: string
          ip: string
          isp: string
          os: string
          platform: string
          referrer: string
          touchpoint_id: string
          touchpoint_name: string
        }[]
      }
      get_realtime_data_v2: {
        Args: {
          p_collection_ids?: string[]
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_last_hours: number
          p_organization_id: string
          p_timezone?: string
          p_user_id?: string
        }
        Returns: {
          channel: string
          city: string
          country: string
          created_at: string
          id: string
          ip: string
          isp: string
          os: string
          platform: string
          referrer: string
          touchpoint_id: string
          touchpoint_name: string
        }[]
      }
      get_realtime_data_v3: {
        Args: {
          p_collection_ids?: string[]
          p_exclude_bot?: boolean
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_last_hours: number
          p_organization_id: string
          p_timezone?: string
          p_user_id?: string
        }
        Returns: {
          channel: string
          city: string
          country: string
          created_at: string
          id: string
          ip: string
          isp: string
          os: string
          platform: string
          referrer: string
          touchpoint_id: string
          touchpoint_name: string
        }[]
      }
      get_realtime_data_v4: {
        Args: {
          p_collection_ids?: string[]
          p_exclude_bot?: boolean
          p_include_null_collection?: boolean
          p_is_premium?: boolean
          p_last_hours: number
          p_organization_id: string
          p_timezone?: string
          p_user_id?: string
        }
        Returns: {
          channel: string
          city: string
          country: string
          created_at: string
          customer_email: string
          customer_external_id: string
          customer_name: string
          customer_profile_id: string
          id: string
          ip: string
          isp: string
          os: string
          platform: string
          referrer: string
          touchpoint_id: string
          touchpoint_name: string
          visitor_id: string
        }[]
      }
      get_realtime_summary: {
        Args: {
          p_collection_ids?: string[]
          p_exclude_bot?: boolean
          p_include_null_collection?: boolean
          p_last_hours?: number
          p_organization_id: string
          p_timezone?: string
          p_user_id?: string
        }
        Returns: {
          active_visitors_5min: number
          clicks_1hr: number
          clicks_24hr: number
          clicks_prev_24hr: number
          top_channel: string
        }[]
      }
      get_realtime_top_links: {
        Args: {
          p_collection_ids?: string[]
          p_exclude_bot?: boolean
          p_include_null_collection?: boolean
          p_last_hours?: number
          p_limit?: number
          p_organization_id: string
          p_timezone?: string
          p_user_id?: string
        }
        Returns: {
          click_count: number
          link_count: number
          nfc_count: number
          qr_count: number
          short_url: string
          touchpoint_id: string
          touchpoint_name: string
        }[]
      }
      get_scroll_heatmap: {
        Args: {
          p_device_type?: string
          p_from?: string
          p_hostname?: string
          p_organization_id: string
          p_page_path?: string
          p_to?: string
        }
        Returns: {
          avg_time_at_depth: number
          scroll_depth_percent: number
          sessions_reached: number
        }[]
      }
      get_scroll_heatmap_v2: {
        Args: {
          p_device_type?: string
          p_from?: string
          p_hostname?: string
          p_organization_id: string
          p_page_path?: string
          p_to?: string
        }
        Returns: {
          avg_time_at_depth: number
          scroll_depth_percent: number
          sessions_reached: number
          total_sessions: number
        }[]
      }
      get_session_analytics: {
        Args: {
          _from: string
          _hostname?: string
          _org_id: string
          _page_path?: string
          _to: string
        }
        Returns: Json
      }
      get_site_page_sessions: {
        Args: { _from: string; _limit?: number; _org_id: string; _to: string }
        Returns: Json
      }
      get_statistic: {
        Args: { p_key: string }
        Returns: {
          analyze_link: Json
          analyze_visit: Json
          created_at: string
          id: string
          updated_at: string
        }[]
      }
      get_step_visitors: {
        Args: {
          _filter?: string
          _funnel_id: string
          _limit?: number
          _org_id: string
          _page?: number
          _period_end: string
          _period_start: string
          _step_position: number
        }
        Returns: {
          browser: string
          city: string
          completed: boolean
          country: string
          device_type: string
          dropped_off: boolean
          os: string
          reached_step: number
          referrer_domain: string
          session_id: string
          started_at: string
          total_count: number
          total_steps: number
          visitor_id: string
        }[]
      }
      get_top_interaction_pages: {
        Args: {
          _from: string
          _limit?: number
          _org_id: string
          _to: string
          _tp_id?: string
        }
        Returns: Json
      }
      get_total_count: {
        Args: {
          filter_user_id?: string
          search_column?: string
          search_value?: string
          table_name: string
        }
        Returns: number
      }
      get_total_list: {
        Args: {
          created_from?: string
          created_to?: string
          filter_plan?: string
          search_column?: string
          search_value?: string
        }
        Returns: number
      }
      get_touchpoint_attribution_full: {
        Args: {
          _collection_ids?: string[]
          _end_time?: string
          _exclude_bot?: boolean
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _viewable_tp_ids: string[]
        }
        Returns: Json
      }
      get_touchpoint_attribution_full_v2: {
        Args: {
          _collection_ids?: string[]
          _end_time?: string
          _event_names?: string[]
          _exclude_bot?: boolean
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _viewable_tp_ids: string[]
        }
        Returns: Json
      }
      get_touchpoint_attribution_full_v3: {
        Args: {
          _channels?: string[]
          _collection_ids?: string[]
          _end_time?: string
          _event_names?: string[]
          _exclude_bot?: boolean
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _utm_sources?: string[]
          _viewable_tp_ids: string[]
        }
        Returns: Json
      }
      get_touchpoint_summary: {
        Args: { p_campaign_id: string }
        Returns: {
          count: number
          type: string
        }[]
      }
      get_tp_analytic: {
        Args: { tp_id: string }
        Returns: {
          date: string
          os: Json[]
          platform: Json[]
          total: number
          type: Json[]
          unique_visit: Json[]
        }[]
      }
      get_tp_details: {
        Args: { tp_ids: string[] }
        Returns: {
          total_tag: number
          tp_id: string
        }[]
      }
      get_traffic_sources: {
        Args: {
          _end_time?: string
          _exclude_bot?: boolean
          _organization_id: string
          _start_time?: string
          _type: string
        }
        Returns: Json
      }
      get_utm_campaign_analytics: {
        Args: {
          _channel_ids?: string[]
          _end_time?: string
          _exclude_bot?: boolean
          _organization_id: string
          _start_time?: string
          _tp_ids?: string[]
          _utm_campaign_id: string
        }
        Returns: Json
      }
      get_visits_analytics: {
        Args: {
          _campaign_ids?: string[]
          _collection_ids?: string[]
          _end_time?: string
          _exclude_bot?: boolean
          _include_null_collection?: boolean
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _utm_campaign_values?: string[]
          _utm_medium_values?: string[]
          _utm_source_values?: string[]
        }
        Returns: Json
      }
      get_visits_analytics_old: {
        Args: {
          _campaign_ids?: string[]
          _end_time?: string
          _exclude_bot?: boolean
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
        }
        Returns: Json
      }
      get_visits_analytics_v2: {
        Args: {
          _campaign_ids?: string[]
          _collection_ids?: string[]
          _end_time?: string
          _exclude_bot?: boolean
          _include_null_collection?: boolean
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _user_id?: string
          _utm_campaign_values?: string[]
          _utm_medium_values?: string[]
          _utm_source_values?: string[]
        }
        Returns: Json
      }
      get_visits_analytics_v3: {
        Args: {
          _campaign_ids?: string[]
          _collection_ids?: string[]
          _end_time?: string
          _exclude_bot?: boolean
          _include_null_collection?: boolean
          _interaction_types?: string[]
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _user_id?: string
          _utm_campaign_values?: string[]
          _utm_medium_values?: string[]
          _utm_source_values?: string[]
        }
        Returns: Json
      }
      get_visits_analytics_v4: {
        Args: {
          _campaign_ids?: string[]
          _collection_ids?: string[]
          _end_time?: string
          _exclude_bot?: boolean
          _include_null_collection?: boolean
          _interaction_types?: string[]
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _user_id?: string
          _utm_campaign_values?: string[]
          _utm_medium_values?: string[]
          _utm_source_values?: string[]
        }
        Returns: Json
      }
      get_visits_geo_breakdown: {
        Args: {
          _collection_ids?: string[]
          _country?: string
          _end_time?: string
          _exclude_bot?: boolean
          _include_null_collection?: boolean
          _interaction_types?: string[]
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
          _user_id?: string
        }
        Returns: {
          city: string | null
          count: number
          country: string | null
          region: string | null
          region_iso: string | null
        }[]
      }
      get_visits_by_country: {
        Args: { _from: string; _to: string }
        Returns: {
          country: string
          top_cities: Json
          total_visits: number
          unique_visits: number
        }[]
      }
      get_visits_by_country_and_city: {
        Args: {
          _campaign_ids?: string[]
          _end_time?: string
          _organization_id: string
          _start_time?: string
          _tag_ids?: string[]
          _tp_ids?: string[]
        }
        Returns: Json
      }
      get_visits_by_destinations_v2: {
        Args: {
          p_collection_ids?: string[]
          p_end_time?: string
          p_exclude_bot?: boolean
          p_include_null_collection?: boolean
          p_org_id: string
          p_start_time?: string
          p_timezone?: string
          p_tp_id: string
          p_utm_campaign_values?: string[]
          p_utm_medium_values?: string[]
          p_utm_source_values?: string[]
        }
        Returns: {
          destination: string
          segment_type: string
          total_visits: number
          unique_visits: number
        }[]
      }
      get_visits_by_destinations_v2_old: {
        Args: {
          p_end_time?: string
          p_exclude_bot?: boolean
          p_org_id: string
          p_start_time?: string
          p_timezone?: string
          p_tp_id: string
        }
        Returns: {
          destination: string
          segment_type: string
          total_visits: number
          unique_visits: number
        }[]
      }
      get_widget_data_conversions: {
        Args: {
          _date_from?: string
          _date_to?: string
          _filters?: Json
          _group_by: string
          _limit?: number
          _metric: string
          _organization_id: string
          _target_currency?: string
        }
        Returns: Json
      }
      get_widget_data_events: {
        Args: {
          _date_from?: string
          _date_to?: string
          _filters?: Json
          _group_by: string
          _limit?: number
          _metric: string
          _organization_id: string
        }
        Returns: Json
      }
      get_widget_data_interactions: {
        Args: {
          _date_from?: string
          _date_to?: string
          _filters?: Json
          _group_by: string
          _limit?: number
          _metric: string
          _organization_id: string
        }
        Returns: Json
      }
      get_widget_data_pageviews: {
        Args: {
          _date_from?: string
          _date_to?: string
          _exclude_bot?: boolean
          _filters?: Json
          _group_by: string
          _limit?: number
          _metric: string
          _organization_id: string
        }
        Returns: Json
      }
      get_widget_data_visits: {
        Args: {
          _date_from?: string
          _date_to?: string
          _filters?: Json
          _group_by: string
          _limit?: number
          _metric: string
          _organization_id: string
        }
        Returns: Json
      }
      grant_premium_to_first_200: {
        Args: {
          _registration_campaign?: string
          _registration_source?: string
          _request_id?: string
          _session_id?: string
          _signup_fp: string
          _signup_ip: unknown
          _user_agent: string
          _user_email: string
          _user_id: string
        }
        Returns: Json
      }
      handle_fp: {
        Args: {
          input_browser_fp: string
          input_canvas_fp: string
          input_id: string
        }
        Returns: {
          browser_fp: string
          browser_update_count: number
          canvas_fp: string
          canvas_update_count: number
          cookies_ls_fail: number
          id: string
          visit_count: number
        }[]
      }
      increment_customer_lead_count: {
        Args: { customer_id: string }
        Returns: undefined
      }
      increment_customer_sale:
        | {
            Args: { customer_id: string; sale_amount: number }
            Returns: undefined
          }
        | {
            Args: {
              customer_id: string
              sale_amount: number
              sale_currency?: string
            }
            Returns: undefined
          }
      lookup_asn: {
        Args: { ip: string }
        Returns: {
          asn: string
          country_code: string
          domain: string
          id: number
          name: string
          network: unknown
          org: string
        }[]
      }
      merge_customer_profiles: {
        Args: { p_anonymous_ids: string[]; p_identified_id: string }
        Returns: undefined
      }
      reduce_ai_credits: {
        Args: { p_amount: number; p_org_id: string }
        Returns: {
          ai_credits_balance: number
          ai_credits_used_this_month: number
        }[]
      }
      requesting_user_email: { Args: never; Returns: string }
      requesting_user_id: { Args: never; Returns: string }
      rerank_touch_sequences: {
        Args: { _customer_ids: string[] }
        Returns: undefined
      }
      reset_all_org_credits: { Args: never; Returns: undefined }
      reset_org_credits_by_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      schedule_weekly_reports: {
        Args: never
        Returns: {
          execution_summary: string
          scheduled_count: number
        }[]
      }
      update_touch_points_short_urls: {
        Args: { data: Json }
        Returns: undefined
      }
      update_tp_tag_links: {
        Args: { input_tag_ids: string[]; input_tp_id: string }
        Returns: undefined
      }
      write_audit_log: {
        Args: {
          p_event_type: string
          p_metadata: Json
          p_reason: string
          p_request_id: string
          p_result: string
          p_timestamp: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      api_key_type: "user" | "bot"
      conversion_event_type: "lead" | "sale"
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
  agent: {
    Enums: {},
  },
  logs: {
    Enums: {},
  },
  public: {
    Enums: {
      api_key_type: ["user", "bot"],
      conversion_event_type: ["lead", "sale"],
    },
  },
} as const
