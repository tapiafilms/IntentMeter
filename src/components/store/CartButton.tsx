'use client'
import { useCartStore } from '@/lib/store/cart'

export default function CartButton() {
  const count = useCartStore(state => state.items.reduce((sum, i) => sum + i.qty, 0))
  const { toggleCart } = useCartStore()

  return (
    <button
      onClick={toggleCart}
      className="relative flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
      {count > 0 && (
        <span
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
          style={{ background: 'var(--color-accent)', color: 'var(--color-brand)' }}
        >
          {count}
        </span>
      )}
    </button>
  )
}