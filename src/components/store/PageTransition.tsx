'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [key, setKey] = useState(pathname)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(false)
    const t1 = setTimeout(() => {
      setKey(pathname)
      setVisible(false)
    }, 50)
    const t2 = setTimeout(() => setVisible(true), 80)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [pathname])

  return (
    <div
      key={key}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      {children}
    </div>
  )
}