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
      courses: {
        Row: {
          id: string
          title: string
          description: string
          price: number
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          price: number
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          price?: number
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      files: {
        Row: {
          id: string
          course_id: string
          name: string
          path: string
          type: string
          size: number
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          name: string
          path: string
          type: string
          size: number
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          name?: string
          path?: string
          type?: string
          size?: number
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          total_amount: number
          status: string
          buy_order: string
          session_id: string
          transaction_token: string | null
          transaction_response: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_amount: number
          status: string
          buy_order: string
          session_id: string
          transaction_token?: string | null
          transaction_response?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_amount?: number
          status?: string
          buy_order?: string
          session_id?: string
          transaction_token?: string | null
          transaction_response?: Json | null
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          course_id: string
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          course_id: string
          price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          course_id?: string
          price?: number
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          verified: boolean
          verification_token: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          verified?: boolean
          verification_token?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          verified?: boolean
          verification_token?: string | null
          created_at?: string
        }
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
  }
} 