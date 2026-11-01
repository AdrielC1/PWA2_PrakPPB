import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Plus, Loader, AlertCircle, PackageOpen, CheckCircle2 } from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import Pagination from '../components/common/Pagination'
import ConfirmModal from '../components/modals/ConfirmModal'
import gunService from '../services/gunService'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

const ITEMS_PER_PAGE = 3

/**
 * Catalog page — product listing with both Lazy Load (infinite scroll) and Pagination.
 *
 * Data source priority:
 *   1. Live API via useGuns()
 *   2. Local static array (GUNS_LOCAL) when API is unreachable
 */
export default function Catalog({ onNavigate }) {
  // ---- API data ----
  const { guns: apiGuns, loading, error, refetch } = useGuns({ limit: 50 })
  const [useLocal, setUseLocal] = useState(false)

  // Decide data source
  const rawGuns = useMemo(() => {
    if (useLocal || (error && apiGuns.length === 0)) {
      return GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` }))
    }
    return apiGuns
  }, [apiGuns, error, useLocal])

  // ---- filters / sort ----
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  const categories = useMemo(() => extractCategories(rawGuns), [rawGuns])

  const filteredGuns = useMemo(() => {
    let result = rawGuns.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory),
    )
    return sortItems(result, sortKey, sortOrder)
  }, [rawGuns, search, activeCategory, sortKey, sortOrder])

  // ---- View Mode: 'lazy' (default) vs 'pagination' ----
  const [viewMode, setViewMode] = useState('lazy')

  // ---- Lazy Load state ----
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const sentinelRef = useRef(null)

  // ---- Pagination state ----
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(filteredGuns.length / ITEMS_PER_PAGE))

  // Filter change handlers that reset pagination & visible items
  const handleSearchChange = (val) => {
    setSearch(val)
    setVisibleCount(ITEMS_PER_PAGE)
    setCurrentPage(1)
  }

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat)
    setVisibleCount(ITEMS_PER_PAGE)
    setCurrentPage(1)
  }

  const handleSortChange = ({ key, order }) => {
    setSortKey(key)
    setSortOrder(order)
    setVisibleCount(ITEMS_PER_PAGE)
    setCurrentPage(1)
  }

  // Load more handler for Lazy Load
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || visibleCount >= filteredGuns.length) return
    setIsLoadingMore(true)
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredGuns.length))
      setIsLoadingMore(false)
    }, 200)
  }, [isLoadingMore, visibleCount, filteredGuns.length])

  // IntersectionObserver for automatic infinite-scroll lazy loading
  useEffect(() => {
    if (viewMode !== 'lazy' || visibleCount >= filteredGuns.length) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          handleLoadMore()
        }
      },
      {
        rootMargin: '160px 0px', // trigger before reaching bottom
        threshold: 0.1,
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [viewMode, visibleCount, filteredGuns.length, handleLoadMore])

  // Slice guns depending on active mode
  const displayedGuns = useMemo(() => {
    if (viewMode === 'pagination') {
      const start = (currentPage - 1) * ITEMS_PER_PAGE
      return filteredGuns.slice(start, start + ITEMS_PER_PAGE)
    }
    // Lazy mode: cumulative items
    return filteredGuns.slice(0, visibleCount)
  }, [filteredGuns, viewMode, currentPage, visibleCount])

  // ---- detail view ----
  const [selectedGun, setSelectedGun] = useState(null)

  // ---- delete ----
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      setDeleteError('')
      // Soft delete: moves to Recycle Bin, recoverable from Profile page
      await gunService.softDeleteGun(deleteTarget.id)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  // ---- If viewing a single product detail ----
  if (selectedGun) {
    return (
      <GunDetail
        gun={selectedGun}
        onBack={() => setSelectedGun(null)}
        onEdit={(g) => onNavigate && onNavigate('Edit', g)}
        onDelete={(g) => { setSelectedGun(null); setDeleteTarget(g) }}
      />
    )
  }

  // ---- Main catalog view ----
  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      <section>
        <div className="list-head">
          <div className="list-head-left">
            <h2>Current stock</h2>
            {/* View Mode Toggle */}
            <div className="catalog-mode-toggle" role="group" aria-label="Mode Tampilan Katalog">
              <button
                type="button"
                className={`mode-toggle-btn ${viewMode === 'lazy' ? 'mode-toggle-btn--active' : ''}`}
                onClick={() => setViewMode('lazy')}
                title="Lazy Load (Scroll bertahap)"
              >
                ⚡ Lazy Load
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${viewMode === 'pagination' ? 'mode-toggle-btn--active' : ''}`}
                onClick={() => setViewMode('pagination')}
                title="Paginasi (Per halaman)"
              >
                📄 Paginasi
              </button>
            </div>
          </div>

          <div className="list-head-right">
            <span className="count">
              {viewMode === 'lazy'
                ? `Menampilkan ${displayedGuns.length} dari ${filteredGuns.length} item`
                : `${filteredGuns.length} piece${filteredGuns.length !== 1 ? 's' : ''}`}
            </span>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AdvancedFilter
          search={search}
          onSearch={handleSearchChange}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={handleCategoryChange}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={handleSortChange}
        />

        {/* States */}
        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}

        {!loading && error && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setUseLocal(true)}
              >
                View Local Catalog
              </button>
            </div>
          </div>
        )}

        {!loading && filteredGuns.length === 0 && !error && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>No products match your search.</p>
          </div>
        )}

        {/* Product grid */}
        {displayedGuns.length > 0 && (
          <ul className="stock">
            {displayedGuns.map((gun) => (
              <GunCard
                key={gun.id || gun.name}
                gun={gun}
                onSelect={setSelectedGun}
                onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        )}

        {/* Lazy Load Controls & Status */}
        {viewMode === 'lazy' && filteredGuns.length > 0 && (
          <div className="catalog-lazy-footer">
            {visibleCount < filteredGuns.length ? (
              <div ref={sentinelRef} className="catalog-sentinel">
                {isLoadingMore ? (
                  <div className="catalog-loading-indicator">
                    <Loader size={18} className="spin" />
                    <span>Memuat produk berikutnya…</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn--outline btn--sm catalog-load-more-btn"
                    onClick={handleLoadMore}
                  >
                    Muat Lebih Banyak ({filteredGuns.length - visibleCount} tersisa)
                  </button>
                )}
              </div>
            ) : filteredGuns.length > ITEMS_PER_PAGE ? (
              <div className="catalog-end-message">
                <CheckCircle2 size={16} />
                <span>Semua {filteredGuns.length} produk telah berhasil dimuat</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Pagination Controls */}
        {viewMode === 'pagination' && filteredGuns.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredGuns.length}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={(page) => {
              setCurrentPage(page)
              window.scrollTo({ top: 180, behavior: 'smooth' })
            }}
          />
        )}

        {useLocal && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => { setUseLocal(false); refetch() }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      {/* Delete confirmation — soft delete (recoverable from Profile > Recycle Bin) */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Hapus Produk"
        message={`Produk "${deleteTarget?.name}" akan dipindahkan ke Recycle Bin. Anda dapat memulihkannya melalui halaman Profile. Lanjutkan?`}
        confirmLabel="Hapus (ke Recycle Bin)"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
      />
      {deleteError && (
        <div className="toast toast--error">{deleteError}</div>
      )}
    </>
  )
}
