import { useState, useEffect, useCallback, useRef } from 'react'
import gunService from '../services/gunService'
import { queryCache } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// useGuns — fetch the paginated / filtered product list from the API.
//
// Features:
//   - Synchronous cache hydration: renders cached data on the very first frame.
//   - Stale-While-Revalidate:
//       * Fresh (< 2 min): serves from cache, ZERO network calls when navigating tabs.
//       * Stale (2-5 min): serves from cache instantly, refreshes silently in background.
//       * Expired / Missing: displays loading state and queries API.
//   - Force refetch: bypasses cache and updates stores.
//   - Invalidation support for mutations (Create, Edit, Soft Delete, Restore).
// ---------------------------------------------------------------------------

export function useGuns(params = {}) {
  const cacheKey = queryCache.key('guns', params)
  const initialCached = queryCache.get(cacheKey)

  const [guns, setGuns] = useState(() => initialCached?.data || [])
  const [loading, setLoading] = useState(() => !initialCached)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(() => initialCached?.pagination || null)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchGuns = useCallback(
    async ({ force = false } = {}) => {
      // 1. If data is already in cache and still fresh, DO NOT query the network!
      if (!force && queryCache.isFresh(cacheKey)) {
        const cached = queryCache.get(cacheKey)
        if (cached && mountedRef.current) {
          setGuns(cached.data || [])
          setPagination(cached.pagination || null)
          setLoading(false)
          setIsFetching(false)
        }
        console.log(
          '%c⚡ [QueryCache HIT]',
          'color: #27ae60; font-weight: bold;',
          `Menggunakan cache untuk "${cacheKey}" (0 request jaringan)`
        )
        return
      }

      // 2. If data is cached but stale, keep showing it while fetching in background
      const cached = queryCache.get(cacheKey)
      if (cached) {
        if (mountedRef.current) {
          setGuns(cached.data || [])
          setPagination(cached.pagination || null)
          setLoading(false)
          setIsFetching(true)
        }
        console.log(
          '%c🔄 [QueryCache REVALIDATE]',
          'color: #f39c12; font-weight: bold;',
          `Data stale (> 2 mnt), me-refresh di background untuk "${cacheKey}"...`
        )
      } else {
        if (mountedRef.current) {
          setLoading(true)
          setIsFetching(true)
        }
        console.log(
          '%c🌐 [QueryCache FETCH]',
          'color: #e67e22; font-weight: bold;',
          `Mengirim request baru ke database untuk "${cacheKey}"...`
        )
      }

      try {
        setError(null)
        const response = await gunService.getGuns(params)

        if (!mountedRef.current) return

        if (response.success) {
          const freshData = {
            data: response.data || [],
            pagination: response.pagination || null,
          }
          queryCache.set(cacheKey, freshData)
          setGuns(freshData.data)
          setPagination(freshData.pagination)
        } else {
          if (!queryCache.has(cacheKey)) {
            setError(response.message || 'Gagal memuat produk.')
          }
        }
      } catch (err) {
        if (!mountedRef.current) return
        if (!queryCache.has(cacheKey)) {
          setError(err.message || 'Terjadi kesalahan saat memuat produk.')
          setGuns([])
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
          setIsFetching(false)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey]
  )

  useEffect(() => {
    fetchGuns()
  }, [fetchGuns])

  return {
    guns,
    loading,
    isFetching,
    error,
    pagination,
    refetch: () => fetchGuns({ force: true }),
  }
}

// ---------------------------------------------------------------------------
// useGunById — fetch a single product by its UUID with caching.
// ---------------------------------------------------------------------------

export function useGunById(id) {
  const cacheKey = queryCache.key('gun', { id })
  const initialCached = queryCache.get(cacheKey)

  const [gun, setGun] = useState(() => initialCached || null)
  const [loading, setLoading] = useState(() => !initialCached && Boolean(id))
  const [error, setError] = useState(null)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchGun = useCallback(
    async ({ force = false } = {}) => {
      if (!id) {
        setLoading(false)
        return
      }

      // Check if fresh in cache
      if (!force && queryCache.isFresh(cacheKey)) {
        const cached = queryCache.get(cacheKey)
        if (cached && mountedRef.current) {
          setGun(cached)
          setLoading(false)
        }
        console.log(
          '%c⚡ [QueryCache HIT]',
          'color: #27ae60; font-weight: bold;',
          `Menggunakan cache untuk produk ID: ${id}`
        )
        return
      }

      try {
        if (!queryCache.has(cacheKey) && mountedRef.current) {
          setLoading(true)
        }
        setError(null)

        console.log(
          '%c🌐 [QueryCache FETCH]',
          'color: #e67e22; font-weight: bold;',
          `Mengambil rincian produk ID: ${id} dari API...`
        )
        const response = await gunService.getGunById(id)

        if (!mountedRef.current) return

        if (response.success) {
          queryCache.set(cacheKey, response.data)
          setGun(response.data)
        } else {
          setError(response.message || 'Produk tidak ditemukan.')
        }
      } catch (err) {
        if (!mountedRef.current) return
        setError(err.message || 'Gagal memuat rincian produk.')
        setGun(null)
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, cacheKey]
  )

  useEffect(() => {
    fetchGun()
  }, [fetchGun])

  return {
    gun,
    loading,
    error,
    refetch: () => fetchGun({ force: true }),
  }
}

// ---------------------------------------------------------------------------
// useDeletedGuns — fetch soft-deleted products (deleted_at IS NOT NULL)
// with query caching for the Recycle Bin.
// ---------------------------------------------------------------------------

export function useDeletedGuns() {
  const cacheKey = 'deleted_guns:list'
  const initialCached = queryCache.get(cacheKey)

  const [guns, setGuns] = useState(() => initialCached || [])
  const [loading, setLoading] = useState(() => !initialCached)
  const [error, setError] = useState(null)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchDeleted = useCallback(async ({ force = false } = {}) => {
    if (!force && queryCache.isFresh(cacheKey)) {
      const cached = queryCache.get(cacheKey)
      if (cached && mountedRef.current) {
        setGuns(cached)
        setLoading(false)
      }
      return
    }

    try {
      if (!queryCache.has(cacheKey) && mountedRef.current) {
        setLoading(true)
      }
      setError(null)

      const response = await gunService.getDeletedGuns()

      if (!mountedRef.current) return

      if (response.success) {
        const data = response.data || []
        queryCache.set(cacheKey, data, { staleTime: 60 * 1000 })
        setGuns(data)
      } else {
        setError(response.message || 'Gagal memuat recycle bin.')
      }
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Terjadi kesalahan saat memuat recycle bin.')
      setGuns([])
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [cacheKey])

  useEffect(() => {
    fetchDeleted()
  }, [fetchDeleted])

  return {
    guns,
    loading,
    error,
    refetch: () => fetchDeleted({ force: true }),
  }
}
