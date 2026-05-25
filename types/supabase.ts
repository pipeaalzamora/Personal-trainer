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
          category: string | null
          is_female: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          price: number
          category?: string | null
          is_female?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          price?: number
          category?: string | null
          is_female?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "files_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
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
          emails_sent: boolean | null
          emails_sent_at: string | null
          created_at: string
          updated_at: string | null
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
          emails_sent?: boolean
          emails_sent_at?: string | null
          created_at?: string
          updated_at?: string | null
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
          emails_sent?: boolean
          emails_sent_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          course_id: string
          price: number
          is_part_of_pack: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          course_id: string
          price: number
          is_part_of_pack?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          course_id?: string
          price?: number
          is_part_of_pack?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      order_transaction_history: {
        Row: {
          id: string
          order_id: string
          status: string
          data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          status: string
          data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          status?: string
          data?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_transaction_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
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
  }
}
