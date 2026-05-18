'use client'
import { useState } from 'react'
import Image from 'next/image'

interface ImageWithFadeProps {
  src: string
  alt: string
  fill?: boolean
  className?: string
  sizes?: string
  priority?: boolean
  onLoadingComplete?: () => void
}

const loadingStyles = `
  @keyframes fadeInImage {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  
  .image-loading-skeleton {
    background: linear-gradient(
      90deg,
      var(--color-surface-2) 0%,
      var(--color-border) 50%,
      var(--color-surface-2) 100%
    );
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
  }
  
  .image-fade-in {
    animation: fadeInImage 0.6s ease-in forwards;
  }
`

export default function ImageWithFade({
  src,
  alt,
  fill = false,
  className = '',
  sizes,
  priority = false,
  onLoadingComplete,
}: ImageWithFadeProps) {
  const [isLoading, setIsLoading] = useState(true)

  const handleLoadingComplete = () => {
    setIsLoading(false)
    onLoadingComplete?.()
  }

  return (
    <>
      <style>{loadingStyles}</style>
      
      {/* Skeleton de carga */}
      {isLoading && (
        <div className="absolute inset-0 image-loading-skeleton" />
      )}
      
      {/* Imagen con fade */}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        className={`${className} ${!isLoading ? 'image-fade-in' : 'opacity-0'}`}
        sizes={sizes}
        priority={priority}
        onLoad={handleLoadingComplete}
      />
    </>
  )
}
