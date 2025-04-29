// Definición de tipos para las tablas de Supabase

export interface User {
  id: string;
  email: string;
  created_at: string;
  name?: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  price: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: number;
  user_id: string;
  course_id: number;
  amount: number;
  payment_status: 'pending' | 'completed' | 'failed';
  transaction_id?: string;
  created_at: string;
}

export interface CourseFile {
  id: number;
  course_id: number;
  name: string;
  url: string;
  type: string;
  size: number;
  created_at: string;
} 