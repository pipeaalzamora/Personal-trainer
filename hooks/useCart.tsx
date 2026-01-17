"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Course } from './useCourses';
import { saveCartData, getCartData, clearCartData } from '@/lib/secure-storage';

interface CartContextType {
  cart: Course[];
  addToCart: (course: Course) => boolean;
  removeFromCart: (courseId: number) => void;
  clearCart: () => void;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Course[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    // Cargar el carrito desde cookies al iniciar
    const savedCart = getCartData();
    setCart(savedCart);
    setIsInitialized(true);
  }, []);

  // Guardar en cookies cuando cambia el carrito (solo después de inicializar)
  useEffect(() => {
    if (isInitialized) {
      saveCartData(cart);
    }
  }, [cart, isInitialized]);

  const addToCart = (course: Course): boolean => {
    // Verificar si el curso ya está en el carrito
    if (cart.some(item => item.id === course.id)) {
      return false;
    }
    
    // Agregar el curso al carrito
    const updatedCart = [...cart, course];
    setCart(updatedCart);
    return true;
  };

  const removeFromCart = (courseId: number) => {
    const updatedCart = cart.filter(course => Number(course.id) !== courseId);
    setCart(updatedCart);
  };

  const clearCart = () => {
    setCart([]);
    clearCartData();
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
