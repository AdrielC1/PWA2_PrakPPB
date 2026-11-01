// ---------------------------------------------------------------------------
// helpers.js — pure utility functions used across the application.
// ---------------------------------------------------------------------------

/**
 * Format a numeric price as "$1,234".
 */
export const formatPrice = (price) => {
  const num = Number(price)
  if (Number.isNaN(num)) return '$0'
  return `$${num.toLocaleString()}`
}

/**
 * Client-side text search — case-insensitive match against name and
 * description.
 */
export const matchesSearch = (item, query) => {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    (item.name || '').toLowerCase().includes(q) ||
    (item.description || '').toLowerCase().includes(q)
  )
}

/**
 * Client-side category / type filter.
 * `category` of '' or 'All' matches everything.
 */
export const matchesCategory = (item, category) => {
  if (!category || category === 'All') return true
  // Support both the local `type` field and the backend `category` field
  return (
    (item.type || '').toLowerCase() === category.toLowerCase() ||
    (item.category || '').toLowerCase() === category.toLowerCase()
  )
}

/**
 * Sort an array of items by a given key.
 * @param {'name'|'price'} key
 * @param {'asc'|'desc'}   order
 */
export const sortItems = (items, key = 'name', order = 'asc') => {
  const sorted = [...items].sort((a, b) => {
    if (key === 'price') return (Number(a.price) || 0) - (Number(b.price) || 0)
    return String(a[key] || '').localeCompare(String(b[key] || ''))
  })
  return order === 'desc' ? sorted.reverse() : sorted
}

/**
 * Truncate a string to `max` characters, adding "…" when clipped.
 */
export const truncate = (str, max = 100) => {
  if (!str || str.length <= max) return str || ''
  return str.slice(0, max).trimEnd() + '…'
}

/**
 * Extract unique category values from a list of items.
 * Returns ['All', ...categories].
 */
export const extractCategories = (items) => {
  const set = new Set()
  items.forEach((i) => {
    const cat = i.type || i.category
    if (cat) set.add(cat)
  })
  return ['All', ...Array.from(set).sort()]
}

/**
 * Compute average rating from an array of review objects that each have a
 * numeric `rating` property.  Returns 0 when empty.
 */
export const averageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

/**
 * Format and normalize phone number for WhatsApp link (e.g. 0812... -> 62812...).
 */
export const normalizeWhatsAppNumber = (phone) => {
  if (!phone) return '6281234567890'
  const clean = String(phone).replace(/[^0-9]/g, '')
  if (clean.startsWith('0')) {
    return '62' + clean.slice(1)
  }
  if (clean.startsWith('8')) {
    return '62' + clean
  }
  return clean || '6281234567890'
}

/**
 * Generate full share URL for a product, compatible with Vercel deployment.
 */
export const getProductShareUrl = (productId) => {
  if (typeof window === 'undefined') return ''
  const origin = window.location.origin
  const pathname = window.location.pathname
  return `${origin}${pathname}?product=${encodeURIComponent(productId)}`
}

/**
 * Build WhatsApp click-to-chat URL with pre-filled product inquiry message.
 */
export const getWhatsAppUrl = (product, customPhone) => {
  if (!product) return '#'

  // Fallback to default user profile WA if available
  let fallbackWa = '6281234567890'
  if (typeof window !== 'undefined') {
    try {
      const p = JSON.parse(localStorage.getItem('bore_barrel_user_profile') || '{}')
      if (p.defaultWa) fallbackWa = p.defaultWa
    } catch {
      /* ignore */
    }
  }

  const phone = normalizeWhatsAppNumber(
    customPhone || product.seller_whatsapp || product.phone || fallbackWa,
  )
  const shareUrl = getProductShareUrl(product.id || product.name)
  const priceFormatted = formatPrice(product.price)

  const message = [
    `Halo Admin, saya tertarik dengan produk di katalog Bore & Barrel:`,
    `*${product.name}*`,
    `- Kategori: ${product.type || product.category || 'Hardware'}`,
    product.caliber ? `- Kaliber: ${product.caliber}` : null,
    `- Harga: ${priceFormatted}`,
    shareUrl ? `Link Produk: ${shareUrl}` : null,
    `\nApakah unit ini masih tersedia? Terima kasih!`,
  ]
    .filter(Boolean)
    .join('\n')

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/**
 * Native share or clipboard copy utility for products.
 */
export const shareProduct = async (product) => {
  if (!product) return { ok: false }
  const shareUrl = getProductShareUrl(product.id || product.name)
  const title = product.name
  const text = `Lihat spesifikasi ${product.name} di Bore & Barrel Armory: ${shareUrl}`

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: shareUrl,
      })
      return { ok: true, method: 'native' }
    } catch (err) {
      if (err.name === 'AbortError') {
        return { ok: false, method: 'cancelled' }
      }
    }
  }

  // Fallback to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(shareUrl)
      return { ok: true, method: 'clipboard' }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  return { ok: false }
}
