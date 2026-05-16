'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { IntentType } from '@/lib/supabase/types'
import { evaluateTrigger } from '@/lib/intent/triggers'
import { useCartStore } from '@/lib/store/cart'
import TypingText from './TypingText'
import ProductComparisonOverlay from './ProductComparisonOverlay'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isNew?: boolean
}

interface IntentState {
  score: number
  type: IntentType
}

interface PendingProduct {
  slug: string
  name: string
  price: number
  productId: string
}

const STORAGE_KEY = 'ti_intent'

function getIntent(): IntentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { score: 0, type: 'curious' }
}

function saveIntent(state: IntentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export default function AIWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTypingEffect, setIsTypingEffect] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [intentState, setIntentState] = useState<IntentState>({ score: 0, type: 'curious' })
  const [currentProduct, setCurrentProduct] = useState<string>()
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigationTarget, setNavigationTarget] = useState<{ slug: string; askAddToCart: boolean } | null>(null)
  const [pendingProduct, setPendingProduct] = useState<PendingProduct | null>(null)
  const [compareProducts, setCompareProducts] = useState<string[] | null>(null)
  const lastProcessedSlug = useRef<string | null>(null)
  const navigationTargetRef = useRef<{ slug: string; askAddToCart: boolean } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { addItem, openCart } = useCartStore()

  // Mantener ref sincronizado con el estado
  useEffect(() => {
    navigationTargetRef.current = navigationTarget
  }, [navigationTarget])

  useEffect(() => {
  const intent = getIntent()
  setIntentState(intent)
  // Cerrar Sofía al navegar a otra página
  if (isOpen) {
    closeChat()
  }
}, [pathname])

  useEffect(() => {
    if (pathname.includes('/producto/')) {
      const slug = pathname.split('/producto/')[1]
      setCurrentProduct(slug?.replace(/-/g, ' '))
      // Resetear mensajes al cambiar de producto
    setMessages([])
    setGreeting('')

      const target = navigationTargetRef.current
      if (target && slug === target.slug && lastProcessedSlug.current !== slug) {
        lastProcessedSlug.current = slug
        setIsNavigating(false)
        setNavigationTarget(null)
        navigationTargetRef.current = null

        setTimeout(async () => {
          try {
            const res = await fetch(`/api/product?slug=${slug}`)
            const product = await res.json()
            if (product) {
              const detail = product.description
                ? product.description.split('.')[0]
                : 'Es una pieza increíble de nuestra colección'
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `${detail}. ¿Te gusta cómo se ve? ✨`,
                isNew: true
              }])
              setIsTypingEffect(true)
            }
          } catch (err) {
            console.error('Error fetching product details for Sofia:', err)
          }
        }, 2000)
      }
    } else {
      setCurrentProduct(undefined)
      lastProcessedSlug.current = null
    }
  }, [pathname])

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { type, payload, score, intentType } = e.detail
      const newIntent = { score, type: intentType as IntentType }
      setIntentState(newIntent)
      saveIntent(newIntent)

      if (isOpen) return

      const result = evaluateTrigger(type, score, intentType, payload, currentProduct)
      if (result.shouldOpen) {
        setGreeting(result.greeting)
        setMessages([{ role: 'assistant', content: result.greeting, isNew: true }])
        setIsTypingEffect(true)
        setTimeout(() => setIsOpen(true), 800)
      }
    }

    window.addEventListener('ti:track' as any, handler as any)
    return () => window.removeEventListener('ti:track' as any, handler as any)
  }, [isOpen, currentProduct])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, isTypingEffect])

  const handleAddToCart = () => {
    if (!pendingProduct) return
    addItem({
      productId: pendingProduct.productId,
      productName: pendingProduct.name,
      variant: 'Único',
      price: pendingProduct.price,
      qty: 1,
    })
    openCart()
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `¡Listo! Agregué ${pendingProduct.name} a tu carrito 🎉 ¿Necesitas algo más?`,
      isNew: true
    }])
    setIsTypingEffect(true)
    setPendingProduct(null)
  }

  const handleCompareSelect = (slug: string, product: { name: string; price: number; id: string }) => {
    setCompareProducts(null)
    setIsNavigating(true)
    setNavigationTarget({ slug, askAddToCart: true })
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `¡Excelente elección! Te llevo a ver ${product.name} ahora ✨`,
      isNew: true
    }])
    setIsTypingEffect(true)
    setPendingProduct({
      slug,
      name: product.name,
      price: product.price,
      productId: product.id,
    })
    setTimeout(() => {
      router.push(`/producto/${slug}`)
    }, 1800)
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isTypingEffect) return

    useCartStore.getState().closeCart()

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: {
            intentType: intentState.type,
            intentScore: intentState.score,
            currentProduct,
            triggerReason: greeting,
          },
        }),
      })
      const data = await res.json()
      console.log('Chat response:', data)
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, isNew: true }])
      setIsTypingEffect(true)

      // Comparativa de productos
      if (data.compare_products && data.compare_products.length >= 2) {
        setTimeout(() => setCompareProducts(data.compare_products), 800)
        setIsLoading(false)
        return
      }

      // Navegar a producto específico
      if (data.redirect_to) {
        const typingDuration = data.message.length * 25 + 500
        setTimeout(() => {
          setIsNavigating(true)
          setNavigationTarget({
            slug: data.redirect_to,
            askAddToCart: !!data.ask_add_to_cart
          })
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Buscando... 🔍`,
            isNew: true
          }])
          setIsTypingEffect(true)

          if (data.ask_add_to_cart) {
            fetch(`/api/product?slug=${data.redirect_to}`)
              .then(res => res.json())
              .then(productData => {
                if (productData) {
                  setPendingProduct({
                    slug: data.redirect_to,
                    name: productData.name,
                    price: productData.price,
                    productId: productData.id,
                  })
                }
              })
              .catch(() => {})
          }

          setTimeout(() => {
            router.push(`/producto/${data.redirect_to}`)
          }, 1500)
        }, typingDuration)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, tuve un problema. ¿Puedo ayudarte en algo más?',
        isNew: true
      }])
      setIsTypingEffect(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTypingComplete = (index: number) => {
    setMessages(prev => prev.map((msg, i) => i === index ? { ...msg, isNew: false } : msg))
    if (index === messages.length - 1) {
      setIsTypingEffect(false)
    }
  }

  const closeChat = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
    }, 600)
  }

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')

  return (
    <>
      {/* Overlay navegación */}
      {isNavigating && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 transition-opacity duration-500"
          style={{ background: 'rgba(26,26,46,0.75)', backdropFilter: 'blur(6px)' }}
        >
          <div className="relative w-32 h-32 mb-2 rounded-full overflow-hidden border-4 border-white/20">
            <video
              src="/avatar2.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-4xl animate-bounce">✨</div>
          <p className="text-white text-lg font-semibold">Buscando tu prenda perfecta...</p>
          <p className="text-white/60 text-sm">Sofía te está llevando al producto</p>
        </div>
      )}

      {/* Overlay comparativa */}
      {compareProducts && (
        <ProductComparisonOverlay
          slugs={compareProducts}
          onSelect={handleCompareSelect}
          onClose={() => {
            setCompareProducts(null)
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: '¡Sin problema! ¿Hay algo más en lo que pueda ayudarte?',
              isNew: true
            }])
            setIsTypingEffect(true)
          }}
        />
      )}

      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={() => {
            if (messages.length === 0) {
              setMessages([{
                role: 'assistant',
                content: '¡Hola! 👋 Soy Sofía, tu asesora de moda. ¿En qué puedo ayudarte hoy?',
                isNew: true
              }])
              setIsTypingEffect(true)
            }
            setIsOpen(true)
          }}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-lg overflow-hidden transition-transform hover:scale-110 border-2 border-white/20 bg-[#1a1a2e]"
        >
          <video
            src="/avatar1.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ mixBlendMode: 'screen' }}
          />
        </button>
      )}

      {/* Widget chat horizontal pegado al borde derecho */}
      {isOpen && (
        <div
          className={`fixed bottom-4 right-0 md:bottom-6 z-50 flex flex-row items-center gap-2 p-4 rounded-l-[30px] md:rounded-l-[40px] overflow-hidden ${isClosing ? 'animate-sofia-out' : 'animate-sofia-in'}`}
          style={{
            background: 'rgb(26, 26, 46)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            width: 'calc(100% - 1rem)',
            maxWidth: '520px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Avatar integrado a la izquierda (reducido un 30%) */}
          <div className="flex flex-col items-center flex-shrink-0 scale-90 md:scale-100">
            <div className="relative w-16 h-16 md:w-20 md:h-20 overflow-hidden bg-[#1a1a2e] -mt-2">
              <video
                src={isNavigating || isTypingEffect ? "/avatar2.mp4" : "/avatar1.mp4"}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                key={isNavigating || isTypingEffect ? "writing" : "idle"}
                style={{ mixBlendMode: 'screen' }}
              />
            </div>
            <div className="text-center mt-0">
              <p className="text-sm font-bold text-white">Sofía</p>
              <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">EN LÍNEA</p>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="bg-transparent border-none p-2 min-h-[60px] flex items-center relative group">
              <button 
                onClick={closeChat}
                className="absolute -top-2 -right-2 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              
              <div 
                className="text-white w-full"
                style={{ fontSize: '14px', lineHeight: '18px' }}
              >
                {isLoading ? (
                  <div className="dot-typing" style={{ color: '#22d3ee' }}>
                    <span></span><span></span><span></span>
                  </div>
                ) : lastAssistantMessage?.isNew ? (
                  <TypingText
                    text={lastAssistantMessage.content}
                    onComplete={() => handleTypingComplete(messages.indexOf(lastAssistantMessage))}
                  />
                ) : (
                  lastAssistantMessage?.content || '¿En qué puedo ayudarte?'
                )}
              </div>
            </div>

            {/* Input */}
            <div className="relative flex items-center border border-white/20 rounded-full px-3 md:px-5 py-1.5 md:py-2 bg-transparent hover:border-white/40 transition-all focus-within:border-white/50">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Escribe tu mensaje..."
                className="w-full text-[13px] md:text-sm outline-none bg-transparent text-white placeholder-white/30 py-1"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim() || isNavigating || isTypingEffect}
                className="ml-2 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white/5 text-white disabled:opacity-20 hover:bg-white/10"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
