export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      generation_sessions: {
        Row: {
          id: string
          user_id: string
          email_preview: string
          content_url: string
          status: string
          current_step: number
          total_steps: number
          extracted_idea: Json | null
          prd_content: string | null
          gtm_content: string | null
          marketing_content: string | null
          quality_score: number | null
          error_message: string | null
          content_source: string | null
          url_fetched_at: string | null
          url_fetch_failed: boolean
          idea_id: string | null
          started_at: string
          completed_at: string | null
          last_updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_preview?: string
          content_url?: string
          status?: string
          current_step?: number
          total_steps?: number
          extracted_idea?: Json | null
          prd_content?: string | null
          gtm_content?: string | null
          marketing_content?: string | null
          quality_score?: number | null
          error_message?: string | null
          content_source?: string | null
          url_fetched_at?: string | null
          url_fetch_failed?: boolean
          idea_id?: string | null
          started_at?: string
          completed_at?: string | null
          last_updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_preview?: string
          content_url?: string
          status?: string
          current_step?: number
          total_steps?: number
          extracted_idea?: Json | null
          prd_content?: string | null
          gtm_content?: string | null
          marketing_content?: string | null
          quality_score?: number | null
          error_message?: string | null
          content_source?: string | null
          url_fetched_at?: string | null
          url_fetch_failed?: boolean
          idea_id?: string | null
          started_at?: string
          completed_at?: string | null
          last_updated_at?: string
          created_at?: string
        }
      }
      ideas: {
        Row: {
          id: string
          title: string
          summary: string | null
          arr_potential: string | null
          pricing: string | null
          target_market: string | null
          market_size: string | null
          time_to_mvp: string | null
          capital_needed: string | null
          competition_level: string | null
          required_skills: string[] | null
          market_type: string | null
          founder_fit_tags: string[] | null
          growth_channels: string | null
          key_risks: string | null
          key_opportunities: string | null
          competitors_mentioned: string | null
          source: string
          date_added: string
          original_link: string | null
          status: string
          quality_score: number | null
          personal_notes: string | null
          prd_content: string | null
          gtm_content: string | null
          marketing_content: string | null
          documents_generated: boolean
          content_source: string
          url_fetched_at: string | null
          url_fetch_failed: boolean
          extraction_cost: number | null
          prd_cost: number | null
          gtm_cost: number | null
          marketing_cost: number | null
          total_cost: number | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          summary?: string | null
          arr_potential?: string | null
          pricing?: string | null
          target_market?: string | null
          market_size?: string | null
          time_to_mvp?: string | null
          capital_needed?: string | null
          competition_level?: string | null
          required_skills?: string[] | null
          market_type?: string | null
          founder_fit_tags?: string[] | null
          growth_channels?: string | null
          key_risks?: string | null
          key_opportunities?: string | null
          competitors_mentioned?: string | null
          source?: string
          date_added?: string
          original_link?: string | null
          status?: string
          quality_score?: number | null
          personal_notes?: string | null
          prd_content?: string | null
          gtm_content?: string | null
          marketing_content?: string | null
          documents_generated?: boolean
          content_source?: string
          url_fetched_at?: string | null
          url_fetch_failed?: boolean
          extraction_cost?: number | null
          prd_cost?: number | null
          gtm_cost?: number | null
          marketing_cost?: number | null
          total_cost?: number | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          summary?: string | null
          arr_potential?: string | null
          pricing?: string | null
          target_market?: string | null
          market_size?: string | null
          time_to_mvp?: string | null
          capital_needed?: string | null
          competition_level?: string | null
          required_skills?: string[] | null
          market_type?: string | null
          founder_fit_tags?: string[] | null
          growth_channels?: string | null
          key_risks?: string | null
          key_opportunities?: string | null
          competitors_mentioned?: string | null
          source?: string
          date_added?: string
          original_link?: string | null
          status?: string
          quality_score?: number | null
          personal_notes?: string | null
          prd_content?: string | null
          gtm_content?: string | null
          marketing_content?: string | null
          documents_generated?: boolean
          content_source?: string
          url_fetched_at?: string | null
          url_fetch_failed?: boolean
          extraction_cost?: number | null
          prd_cost?: number | null
          gtm_cost?: number | null
          marketing_cost?: number | null
          total_cost?: number | null
          user_id?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Idea = Database['public']['Tables']['ideas']['Row'];
export type IdeaInsert = Database['public']['Tables']['ideas']['Insert'];
export type IdeaUpdate = Database['public']['Tables']['ideas']['Update'];

export type GenerationSession = Database['public']['Tables']['generation_sessions']['Row'];
export type GenerationSessionInsert = Database['public']['Tables']['generation_sessions']['Insert'];
export type GenerationSessionUpdate = Database['public']['Tables']['generation_sessions']['Update'];
