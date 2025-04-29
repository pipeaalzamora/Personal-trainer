"use client"
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

export default function CartIcon() {
  const { cartCount } = useCart();
  
  return (
    <Link href="/cart" className="hover:underline flex items-center gap-1 relative">
      <ShoppingCart className="h-4 w-4" />
      <span>Carrito</span>
      {cartCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {cartCount}
        </span>
      )}
    </Link>
  );
} 