"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Course } from '../lib/courses';

interface CartContextType {
  cart: Course[];
  addToCart: (course: Course) => void;
  removeFromCart: (courseId: number) => void;
  clearCart: () => void;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Course[]>([]);
  
  useEffect(() => {
    // Cargar el carrito desde localStorage al iniciar
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }, []);

  const addToCart = (course: Course) => {
    // Verificar si el curso ya está en el carrito
    if (cart.some(item => item.id === course.id)) {
      return false;
    }
    
    // Agregar el curso al carrito
    const updatedCart = [...cart, course];
    setCart(updatedCart);
    
    // Guardar en localStorage
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    return true;
  };

  const removeFromCart = (courseId: number) => {
    const updatedCart = cart.filter(course => Number(course.id) !== courseId);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('cart');
  };

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart,
      clearCart,
      cartCount: cart.length 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 