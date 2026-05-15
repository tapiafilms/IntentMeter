// ============================================================
// lib/store/cart.ts
// Estado global del carrito — Zustand
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  productName: string
  variant: string
  price: number
  qty: number
  image?: string
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  // Acciones
  addItem: (item: CartItem) => void
  removeItem: (productId: string, variant: string) => void
  updateQty: (productId: string, variant: string, qty: number) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  // Computed
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) => {
        set(state => {
          const existing = state.items.find(
            i => i.productId === newItem.productId && i.variant === newItem.variant
          )
          if (existing) {
            return {
              items: state.items.map(i =>
                i.productId === newItem.productId && i.variant === newItem.variant
                  ? { ...i, qty: i.qty + newItem.qty }
                  : i
              ),
              isOpen: true,
            }
          }
          return { items: [...state.items, newItem], isOpen: true }
        })
      },

      removeItem: (productId, variant) => {
        set(state => ({
          items: state.items.filter(
            i => !(i.productId === productId && i.variant === variant)
          ),
        }))
      },

      updateQty: (productId, variant, qty) => {
        if (qty <= 0) {
          get().removeItem(productId, variant)
          return
        }
        set(state => ({
          items: state.items.map(i =>
            i.productId === productId && i.variant === variant ? { ...i, qty } : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),
      toggleCart: () => set(state => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
      itemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: 'cart-storage' }
  )
)
