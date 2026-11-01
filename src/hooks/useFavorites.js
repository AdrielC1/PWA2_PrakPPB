import { useState, useEffect, useCallback } from 'react'
import favoriteService from '../services/favoriteService'
import { getUserIdentifier } from '../services/userService'
import { queryCache } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// localStorage fallback — used when the backend is unavailable so that
// favourites are still fully functional offline.
// ---------------------------------------------------------------------------

const LOCAL_KEY = 'bore_barrel_favorites'

const readLocalFavs = () => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeLocalFavs = (ids) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids))
  } catch {
    /* quota exceeded — silently fail */
  }
}

// ---------------------------------------------------------------------------
// useFavorites — list all favourited product IDs with Query Caching.
//
// First attempts the server; on failure uses localStorage.
// ---------------------------------------------------------------------------

export function useFavorites() {
  const userIdentifier = getUserIdentifier()
  const cacheKey = queryCache.key('favorites', { userIdentifier })
  const initialCached = queryCache.get(cacheKey)

  const [favorites, setFavorites] = useState(() => initialCached || readLocalFavs())
  const [loading, setLoading] = useState(() => !initialCached)
  const [error, setError] = useState(null)
  const [isLocal, setIsLocal] = useState(false)

  const fetchFavorites = useCallback(
    async ({ force = false } = {}) => {
      // 1. If data is fresh in cache, skip network request!
      if (!force && queryCache.isFresh(cacheKey)) {
        const cached = queryCache.get(cacheKey)
        if (cached) {
          setFavorites(cached)
          setLoading(false)
          console.log('%c⚡ [QueryCache HIT]', 'color: #27ae60; font-weight: bold;', 'Favorites dari cache (0 request)')
          return
        }
      }

      try {
        if (!queryCache.has(cacheKey)) {
          setLoading(true)
        }
        setError(null)

        const response = await favoriteService.getFavorites(userIdentifier)

        if (response.success) {
          const list = response.data || []
          queryCache.set(cacheKey, list, { staleTime: 2 * 60 * 1000 })
          setFavorites(list)
          setIsLocal(false)
        } else {
          throw new Error(response.message)
        }
      } catch {
        // Fallback to localStorage
        const localList = readLocalFavs()
        setFavorites(localList)
        setIsLocal(true)
      } finally {
        setLoading(false)
      }
    },
    [userIdentifier, cacheKey]
  )

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  return {
    favorites,
    loading,
    error,
    isLocal,
    refetch: () => fetchFavorites({ force: true }),
  }
}

// ---------------------------------------------------------------------------
// useToggleFavorite — toggle a product in/out of favourites.
// ---------------------------------------------------------------------------

export function useToggleFavorite() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const userIdentifier = getUserIdentifier()

  const toggleFavorite = async (gunId) => {
    try {
      setLoading(true)
      setError(null)

      const response = await favoriteService.toggleFavorite({
        recipe_id: gunId,
        user_identifier: userIdentifier,
      })

      // Invalidate favorites cache so all hooks update
      queryCache.invalidate('favorites')

      if (response.success) {
        return response.data
      }
      throw new Error(response.message)
    } catch {
      // Fallback: toggle in localStorage
      const current = readLocalFavs()
      const idx = current.findIndex((id) => String(id) === String(gunId))
      let isFavorited

      if (idx === -1) {
        current.push(gunId)
        isFavorited = true
      } else {
        current.splice(idx, 1)
        isFavorited = false
      }
      writeLocalFavs(current)
      queryCache.invalidate('favorites')
      return { is_favorited: isFavorited }
    } finally {
      setLoading(false)
    }
  }

  return { toggleFavorite, loading, error }
}

// ---------------------------------------------------------------------------
// useIsFavorited — convenience wrapper for a single product.
// ---------------------------------------------------------------------------

export function useIsFavorited(gunId) {
  const { favorites, loading: fetchLoading, refetch } = useFavorites()
  const { toggleFavorite: toggle, loading: toggleLoading } = useToggleFavorite()

  // Check both server-format (objects with .id) and local-format (plain ids)
  const isFavorited = favorites.some((fav) => {
    const favId = typeof fav === 'object' && fav !== null ? (fav.id ?? fav.product_id ?? fav.recipe_id) : fav
    return String(favId) === String(gunId)
  })

  const toggleFavorite = async () => {
    const result = await toggle(gunId)
    if (result) await refetch()
    return result
  }

  return {
    isFavorited,
    loading: fetchLoading || toggleLoading,
    toggleFavorite,
  }
}

export { getUserIdentifier }
