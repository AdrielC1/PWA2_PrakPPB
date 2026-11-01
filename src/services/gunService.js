import { apiClient, IS_SUPABASE } from '../config/api'

// ---------------------------------------------------------------------------
// Normalizer — standardizes product shape whether received from Supabase
// (public.products) or from the university API (/api/v1/recipes).
// ---------------------------------------------------------------------------
export const normalizeProduct = (item) => {
  if (!item) return null

  // Resolve multiple images list
  let imagesList = []
  if (Array.isArray(item.images) && item.images.length > 0) {
    imagesList = item.images.filter(Boolean)
  } else if (typeof item.images === 'string') {
    try {
      const parsed = JSON.parse(item.images)
      if (Array.isArray(parsed) && parsed.length > 0) {
        imagesList = parsed.filter(Boolean)
      } else {
        imagesList = [item.images]
      }
    } catch {
      imagesList = [item.images]
    }
  }

  // Fallback to image_url or image or default
  if (imagesList.length === 0) {
    const fallback = item.image_url || item.image || '/guns/pistol.svg'
    imagesList = [fallback]
  }

  const primaryImage = imagesList[0] || '/guns/pistol.svg'

  // Resolve specifications from Supabase `specs` (text array) or API `ingredients`
  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          return {
            id: `spec-${idx}`,
            name: s.substring(0, colonIndex).trim(),
            quantity: s.substring(colonIndex + 1).trim(),
          }
        }
        return { id: `spec-${idx}`, name: 'Specification', quantity: s.trim() }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }

  // Resolve steps
  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps
      : [
          'Verify firearm is completely unloaded and point in safe direction.',
          'Inspect receiver and mechanism for maintenance.',
        ]

  return {
    ...item,
    id: item.id,
    name: item.name || 'Hardware Piece',
    type: item.type || item.category || 'Hardware',
    category: item.type || item.category || 'Hardware',
    caliber: item.caliber || 'Standard',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    seller_whatsapp: item.seller_whatsapp || item.whatsapp || item.phone || '6281234567890',
    deleted_at: item.deleted_at || null,
    image_url: primaryImage,
    image: primaryImage,
    images: imagesList,
    ingredients: specsList,
    steps: stepsList,
  }
}

// ---------------------------------------------------------------------------
// GunService — wraps backend CRUD endpoints.
// Supports Supabase PostgREST (/rest/v1/products) and standard REST API.
// ---------------------------------------------------------------------------
class GunService {
  /**
   * Fetch active (non-deleted) products list.
   */
  async getGuns(params = {}) {
    if (IS_SUPABASE) {
      const queryParts = ['select=*']

      // Exclude soft-deleted items (if column exists)
      queryParts.push('deleted_at=is.null')

      if (params.search) {
        queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
      }
      if (params.category && params.category !== 'All') {
        queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
      }
      if (params.sort_by) {
        const order = params.order === 'desc' ? 'desc' : 'asc'
        queryParts.push(`order=${encodeURIComponent(params.sort_by)}.${order}`)
      } else {
        queryParts.push('order=created_at.desc')
      }
      if (params.limit) {
        queryParts.push(`limit=${params.limit}`)
      }

      let data
      try {
        data = await apiClient.get(`/rest/v1/products?${queryParts.join('&')}`)
      } catch (err) {
        // Fallback if deleted_at column does not exist yet in Supabase schema (error 42703)
        const isColumnMissing =
          err?.code === '42703' ||
          err?.raw?.code === '42703' ||
          String(err?.message || '').includes('deleted_at') ||
          String(err?.raw?.message || '').includes('deleted_at')

        if (isColumnMissing) {
          const fallbackParts = queryParts.filter((p) => !p.startsWith('deleted_at='))
          data = await apiClient.get(`/rest/v1/products?${fallbackParts.join('&')}`)
        } else {
          throw err
        }
      }

      const list = Array.isArray(data) ? data.map(normalizeProduct) : []

      return {
        success: true,
        data: list,
        pagination: {
          total: list.length,
          page: params.page || 1,
          limit: params.limit || 50,
        },
      }
    }

    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    )
    return apiClient.get('/api/v1/recipes', { params: clean })
  }

  /**
   * Fetch soft-deleted products (Recycle Bin).
   */
  async getDeletedGuns() {
    if (IS_SUPABASE) {
      try {
        const data = await apiClient.get(
          '/rest/v1/products?select=*&deleted_at=not.is.null&order=deleted_at.desc',
        )
        const list = Array.isArray(data) ? data.map(normalizeProduct) : []
        return { success: true, data: list }
      } catch (err) {
        const isColumnMissing =
          err?.code === '42703' ||
          err?.raw?.code === '42703' ||
          String(err?.message || '').includes('deleted_at') ||
          String(err?.raw?.message || '').includes('deleted_at')

        if (isColumnMissing) {
          return { success: true, data: [] }
        }
        throw err
      }
    }
    return { success: true, data: [] }
  }

  /**
   * Fetch a single active product by ID.
   */
  async getGunById(id) {
    if (IS_SUPABASE) {
      const data = await apiClient.get(`/rest/v1/products?id=eq.${id}&select=*`)
      if (Array.isArray(data) && data.length > 0) {
        return { success: true, data: normalizeProduct(data[0]) }
      }
      throw new Error('Hardware item not found.')
    }
    return apiClient.get(`/api/v1/recipes/${id}`)
  }

  /**
   * Create a new product with multiple images support.
   */
  async createGun(data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : []

      const imagesArray = Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : [data.image_url || '/guns/pistol.svg']

      const payload = {
        name: data.name,
        type: data.type || data.category || 'Hardware',
        caliber: data.caliber || 'Standard',
        price: Number(data.price ?? data.cook_time ?? 0),
        description: data.description || '',
        seller_whatsapp: data.seller_whatsapp || '6281234567890',
        specs: specsArray,
        image_url: imagesArray[0],
        images: imagesArray,
      }

      let res
      try {
        res = await apiClient.post('/rest/v1/products', payload, {
          headers: { Prefer: 'return=representation' },
        })
      } catch (err) {
        // If images column does not exist yet in Supabase schema (42703)
        const isColumnMissing =
          err?.code === '42703' ||
          err?.raw?.code === '42703' ||
          String(err?.message || '').includes('images') ||
          String(err?.raw?.message || '').includes('images')

        if (isColumnMissing) {
          const fallbackPayload = { ...payload }
          delete fallbackPayload.images
          res = await apiClient.post('/rest/v1/products', fallbackPayload, {
            headers: { Prefer: 'return=representation' },
          })
        } else {
          throw err
        }
      }

      const created = Array.isArray(res) ? res[0] : res
      return { success: true, data: normalizeProduct(created) }
    }

    const payload = {
      name: data.name,
      category: data.category || 'makanan',
      difficulty: data.difficulty || 'mudah',
      cook_time: Number(data.price || 599),
      servings: 1,
      description: data.description || '',
      image: data.images?.[0] || data.image_url || '/guns/pistol.svg',
      is_featured: false,
      ingredients: (data.ingredients || []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
      })),
      steps: data.steps || [],
    }
    return apiClient.post('/api/v1/recipes', payload)
  }

  /**
   * Full update (PUT/PATCH) with multiple images support.
   */
  async updateGun(id, data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : undefined

      const payload = { updated_at: new Date().toISOString() }
      if (data.name !== undefined) payload.name = data.name
      if (data.type !== undefined) payload.type = data.type
      if (data.caliber !== undefined) payload.caliber = data.caliber
      if (data.price !== undefined || data.cook_time !== undefined) {
        payload.price = Number(data.price ?? data.cook_time ?? 0)
      }
      if (data.description !== undefined) payload.description = data.description
      if (data.seller_whatsapp !== undefined) payload.seller_whatsapp = data.seller_whatsapp
      if (specsArray !== undefined) payload.specs = specsArray

      if (data.images !== undefined) {
        payload.images = data.images
        payload.image_url = data.images[0] || data.image_url || '/guns/pistol.svg'
      } else if (data.image_url !== undefined) {
        payload.image_url = data.image_url
        payload.images = [data.image_url]
      }

      let res
      try {
        res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, {
          headers: { Prefer: 'return=representation' },
        })
      } catch (err) {
        const isColumnMissing =
          err?.code === '42703' ||
          err?.raw?.code === '42703' ||
          String(err?.message || '').includes('images') ||
          String(err?.raw?.message || '').includes('images')

        if (isColumnMissing) {
          const fallbackPayload = { ...payload }
          delete fallbackPayload.images
          res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, fallbackPayload, {
            headers: { Prefer: 'return=representation' },
          })
        } else {
          throw err
        }
      }

      const updated = Array.isArray(res) ? res[0] : res
      return { success: true, data: normalizeProduct(updated) }
    }
    return apiClient.put(`/api/v1/recipes/${id}`, data)
  }

  /**
   * Partial update (PATCH).
   */
  async patchGun(id, data) {
    if (IS_SUPABASE) return this.updateGun(id, data)
    return apiClient.patch(`/api/v1/recipes/${id}`, data)
  }

  /**
   * SOFT DELETE — sets deleted_at to now.
   */
  async softDeleteGun(id) {
    if (IS_SUPABASE) {
      try {
        const res = await apiClient.patch(
          `/rest/v1/products?id=eq.${id}`,
          { deleted_at: new Date().toISOString() },
          { headers: { Prefer: 'return=representation' } },
        )
        const updated = Array.isArray(res) ? res[0] : res
        return { success: true, data: normalizeProduct(updated) }
      } catch (err) {
        const isColumnMissing =
          err?.code === '42703' ||
          err?.raw?.code === '42703' ||
          String(err?.message || '').includes('deleted_at')
        if (isColumnMissing) {
          return this.deleteGun(id)
        }
        throw err
      }
    }
    return this.deleteGun(id)
  }

  /**
   * RESTORE — clears deleted_at, making product visible in catalog again.
   */
  async restoreGun(id) {
    if (IS_SUPABASE) {
      const res = await apiClient.patch(
        `/rest/v1/products?id=eq.${id}`,
        { deleted_at: null, updated_at: new Date().toISOString() },
        { headers: { Prefer: 'return=representation' } },
      )
      const updated = Array.isArray(res) ? res[0] : res
      return { success: true, data: normalizeProduct(updated) }
    }
    return { success: false, message: 'Restore not supported on this backend.' }
  }

  /**
   * HARD DELETE — permanently removes the product row.
   */
  async deleteGun(id) {
    if (IS_SUPABASE) {
      await apiClient.delete(`/rest/v1/products?id=eq.${id}`)
      return { success: true }
    }
    return apiClient.delete(`/api/v1/recipes/${id}`)
  }
}

export default new GunService()
