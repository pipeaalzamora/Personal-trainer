import type { Database } from '@/types/supabase';

// Re-exportar los tipos de Supabase con nombres más convenientes
export type Course = Database['public']['Tables']['courses']['Row'];
export type CourseInsert = Database['public']['Tables']['courses']['Insert'];
export type CourseUpdate = Database['public']['Tables']['courses']['Update'];

export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];

export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];
export type OrderItemUpdate = Database['public']['Tables']['order_items']['Update'];

export type FileRecord = Database['public']['Tables']['files']['Row'];
export type FileInsert = Database['public']['Tables']['files']['Insert'];
export type FileUpdate = Database['public']['Tables']['files']['Update'];

// Tipos para estados
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

// Tipos para respuestas de API
export type CourseWithFiles = Course & {
  files: FileRecord[];
};

export type OrderWithItems = Order & {
  items: (OrderItem & { course: Course })[];
};

export type UserWithOrders = User & {
  orders: Order[];
}; 