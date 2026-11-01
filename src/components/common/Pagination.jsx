import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Pagination component with page numbers, prev/next buttons, and record summary.
 *
 * @param {Object} props
 * @param {number} props.currentPage - current active page (1-based)
 * @param {number} props.totalPages - total number of pages
 * @param {Function} props.onPageChange - callback when page is clicked
 * @param {number} [props.totalItems] - total count of items
 * @param {number} [props.pageSize] - items per page
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}) {
  if (totalPages <= 1) return null

  // Calculate displayed range: e.g. "Menampilkan 1–6 dari 12 produk"
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems || 0)

  // Generate page numbers with intelligent truncation (e.g. 1 2 ... 5)
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) {
        pages.push('...')
      }
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) {
        pages.push('...')
      }
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <nav className="catalog-pagination" aria-label="Navigasi Halaman Katalog">
      {totalItems !== undefined && (
        <span className="pagination-summary">
          Menampilkan <strong>{startItem}–{endItem}</strong> dari <strong>{totalItems}</strong> produk
        </span>
      )}

      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn--outline btn--sm pagination-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Halaman Sebelumnya"
        >
          <ChevronLeft size={16} />
          <span>Sebelumnya</span>
        </button>

        <div className="pagination-numbers">
          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`dots-${idx}`} className="pagination-ellipsis">
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                className={`pagination-num-btn ${
                  currentPage === page ? 'pagination-num-btn--active' : ''
                }`}
                onClick={() => onPageChange(page)}
                aria-current={currentPage === page ? 'page' : undefined}
                aria-label={`Halaman ${page}`}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="btn btn--outline btn--sm pagination-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Halaman Selanjutnya"
        >
          <span>Selanjutnya</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}

