import { useState, useEffect, useRef } from 'react'
import { ImageOff } from 'lucide-react'

/**
 * LazyImage — Progressive image loader with skeleton shimmer and fallback support.
 * Only requests and renders the image when it is near or inside the viewport.
 *
 * @param {Object} props
 * @param {string} props.src - image URL
 * @param {string} props.alt - image alt text
 * @param {string} [props.className] - additional CSS class for wrapper
 * @param {string} [props.fallbackSrc] - fallback image if source fails
 * @param {number|string} [props.width] - image width
 * @param {number|string} [props.height] - image height
 */
export default function LazyImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = '/guns/pistol.svg',
  width,
  height,
}) {
  const [isInView, setIsInView] = useState(() => {
    return typeof window !== 'undefined' && !('IntersectionObserver' in window)
  })
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [prevSrc, setPrevSrc] = useState(src)

  const wrapperRef = useRef(null)

  // Adjust state during render when prop changes (React 19 recommended pattern)
  if (src !== prevSrc) {
    setPrevSrc(src)
    setIsLoaded(false)
    setIsError(false)
  }

  // Observe element viewport entrance
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          if (wrapperRef.current) {
            observer.unobserve(wrapperRef.current)
          }
        }
      },
      {
        rootMargin: '120px 0px', // preload 120px before entering screen
        threshold: 0.01,
      }
    )

    const el = wrapperRef.current
    if (el) {
      observer.observe(el)
    }

    return () => {
      if (el) observer.unobserve(el)
    }
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setIsError(true)
    setIsLoaded(true)
  }

  const currentSrc = isError ? fallbackSrc : (isInView ? src : undefined)

  const inlineStyle = {}
  if (width !== undefined) inlineStyle.width = typeof width === 'number' ? `${width}px` : width
  if (height !== undefined) inlineStyle.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      ref={wrapperRef}
      className={`lazy-img-wrap ${className}`}
      style={inlineStyle}
    >
      {/* Skeleton Shimmer while loading */}
      {!isLoaded && (
        <div className="lazy-img-skeleton" aria-hidden="true">
          <div className="lazy-img-shimmer" />
        </div>
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={`lazy-img ${isLoaded ? 'lazy-img--loaded' : 'lazy-img--loading'}`}
        />
      )}

      {/* Error indicator badge */}
      {isError && (
        <div className="lazy-img-error-badge" title="Gambar alternatif ditampilkan">
          <ImageOff size={14} />
        </div>
      )}
    </div>
  )
}
