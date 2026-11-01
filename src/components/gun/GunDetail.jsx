import { useState } from 'react'
import {
  ArrowLeft,
  Star,
  Send,
  Loader,
  MessageCircle,
  Share2,
  Check,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Trash2,
  X,
  Save,
} from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import ConfirmModal from '../modals/ConfirmModal'
import {
  useReviews,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
} from '../../hooks/useReviews'
import { getUserIdentifier } from '../../services/userService'
import { formatPrice, averageRating, getWhatsAppUrl, shareProduct } from '../../utils/helpers'

/**
 * Full-screen product detail view with interactive multiple images gallery,
 * WhatsApp direct link, Share button, and full Review CRUD + Voting (Thumbs Up / Down).
 */
export default function GunDetail({ gun, onBack, onEdit, onDelete }) {
  const [copied, setCopied] = useState(false)
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0
  const waUrl = getWhatsAppUrl(gun)

  // Multiple Images Gallery
  const rawImages = Array.isArray(gun.images) && gun.images.length > 0
    ? gun.images
    : [gun.image_url || gun.image || '/guns/pistol.svg']
  const images = rawImages.filter(Boolean)
  const [activeImgIdx, setActiveImgIdx] = useState(0)
  const currentImage = images[activeImgIdx] || images[0] || '/guns/pistol.svg'

  // Reviews Hook
  const currentUserId = getUserIdentifier()
  const { reviews, loading: reviewsLoading, refetch: refetchReviews, handleVote } = useReviews(gun.id)
  const { createReview, loading: submitting } = useCreateReview()
  const { updateReview, loading: updatingReview } = useUpdateReview()
  const { deleteReview, loading: deletingReview } = useDeleteReview()

  // New review form state
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  // Edit review state (inline)
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')
  const [editError, setEditError] = useState('')

  // Delete review state
  const [confirmDeleteRev, setConfirmDeleteRev] = useState(null)

  const avgRating = gun.average_rating || averageRating(reviews)
  const reviewCount = gun.review_count ?? reviews.length

  const handleShare = async () => {
    const res = await shareProduct(gun)
    if (res.ok && res.method === 'clipboard') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // Create review handler
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    setReviewSuccess('')

    if (rating < 1 || rating > 5) {
      setReviewError('Rating harus antara 1 sampai 5 bintang.')
      return
    }

    const result = await createReview(gun.id, {
      user_identifier: currentUserId,
      user_id: currentUserId,
      rating,
      comment: comment.trim(),
    })

    if (result) {
      setReviewSuccess('Ulasan Anda berhasil dikirim!')
      setComment('')
      setRating(5)
      refetchReviews()
      setTimeout(() => setReviewSuccess(''), 4000)
    } else {
      setReviewError('Gagal mengirim ulasan. Coba lagi beberapa saat lagi.')
    }
  }

  // Start edit review
  const handleStartEdit = (rev) => {
    setEditingReviewId(rev.id)
    setEditRating(rev.rating || 5)
    setEditComment(rev.comment || '')
    setEditError('')
  }

  // Save edited review
  const handleSaveEdit = async (reviewId) => {
    setEditError('')
    if (editRating < 1 || editRating > 5) {
      setEditError('Rating harus antara 1 sampai 5.')
      return
    }
    const res = await updateReview(reviewId, {
      rating: editRating,
      comment: editComment.trim(),
    })
    if (res) {
      setEditingReviewId(null)
      refetchReviews()
    } else {
      setEditError('Gagal memperbarui ulasan.')
    }
  }

  // Delete review confirmed
  const handleConfirmDelete = async () => {
    if (!confirmDeleteRev) return
    const success = await deleteReview(confirmDeleteRev.id)
    if (success) {
      setConfirmDeleteRev(null)
      refetchReviews()
    } else {
      alert('Gagal menghapus ulasan.')
    }
  }

  return (
    <div className="detail">
      {/* Back button */}
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Kembali ke Katalog
      </button>

      {/* Hero */}
      <div className="detail-hero">
        {/* Interactive Gallery */}
        <div className="gallery-main-wrap">
          <div className="gallery-viewport">
            <img className="detail-img gallery-main-img" src={currentImage} alt={gun.name} />

            {/* Gallery Navigation Overlay (if > 1 image) */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-nav-btn gallery-nav-btn--prev"
                  onClick={() => setActiveImgIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                  aria-label="Gambar Sebelumnya"
                >
                  <ChevronLeft size={22} />
                </button>

                <button
                  type="button"
                  className="gallery-nav-btn gallery-nav-btn--next"
                  onClick={() => setActiveImgIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                  aria-label="Gambar Berikutnya"
                >
                  <ChevronRight size={22} />
                </button>

                <span className="gallery-counter">
                  {activeImgIdx + 1} / {images.length}
                </span>
              </>
            )}
          </div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="gallery-thumbs-row" role="tablist" aria-label="Pilih foto produk">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`gallery-thumb-btn ${idx === activeImgIdx ? 'gallery-thumb-btn--active' : ''}`}
                  onClick={() => setActiveImgIdx(idx)}
                  aria-label={`Lihat gambar ke-${idx + 1}`}
                >
                  <img src={img} alt={`${gun.name} preview ${idx + 1}`} className="gallery-thumb-img" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Info */}
        <div className="detail-info">
          <h1 className="display">{gun.name}</h1>
          <p className="type">
            {category}
            {caliber ? ` · ${caliber}` : ''}
          </p>
          <p className="price detail-price">{formatPrice(price)}</p>

          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviewCount} ulasan)
            </p>
          )}

          {/* Action buttons including WhatsApp and Share */}
          <div className="detail-actions">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--wa"
              title="Hubungi Penjual via WhatsApp"
            >
              <MessageCircle size={18} />
              <span>Hubungi Penjual (WhatsApp)</span>
            </a>

            <button
              type="button"
              className="btn btn--outline btn--share"
              onClick={handleShare}
              title="Bagikan Link Produk"
            >
              {copied ? <Check size={18} className="icon-success" /> : <Share2 size={18} />}
              <span>{copied ? 'Link Disalin!' : 'Bagikan Produk'}</span>
            </button>

            <FavoriteButton gunId={gun.id || gun.name} />

            {onEdit && (
              <button type="button" className="btn btn--outline" onClick={() => onEdit(gun)}>
                Edit Produk
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn--danger" onClick={() => onDelete(gun)}>
                Hapus
              </button>
            )}
          </div>

          {copied && (
            <div className="toast toast--success toast--detail" role="status">
              <Check size={16} />
              <span>Link produk berhasil disalin ke clipboard! Siap dibagikan.</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <section className="detail-section">
        <h2>Deskripsi Hardware</h2>
        <p>{gun.description || 'Tidak ada deskripsi tersedia.'}</p>
      </section>

      {/* Specifications */}
      {gun.ingredients && gun.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Spesifikasi Teknis</h2>
          <ul className="detail-specs">
            {gun.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}</strong> — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Maintenance Steps */}
      {gun.steps && gun.steps.length > 0 && (
        <section className="detail-section">
          <h2>Prosedur Perakitan &amp; Perawatan</h2>
          <ol className="detail-steps">
            {gun.steps.map((step, i) => (
              <li key={step.id || i}>
                {step.instruction || step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ===================================================
          REVIEWS SECTION (CRUD + Thumbs Up / Down)
          =================================================== */}
      <section className="detail-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h2>Ulasan &amp; Rating Operator ({reviewCount})</h2>
          {avgRating > 0 && (
            <span style={{ fontSize: '0.9rem', color: 'var(--steel)' }}>
              Rata-rata: <strong>{avgRating.toFixed(1)} / 5.0</strong>
            </span>
          )}
        </div>

        {/* Submit Review Form */}
        <form className="review-form" onSubmit={handleSubmitReview}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '6px' }}>
            Beri Rating &amp; Field Report:
          </span>
          <div className="review-stars">
            {Array.from({ length: 5 }, (_, i) => {
              const starVal = i + 1
              return (
                <button
                  type="button"
                  key={starVal}
                  className="star-btn"
                  onClick={() => setRating(starVal)}
                  aria-label={`Beri bintang ${starVal}`}
                >
                  <Star
                    size={22}
                    fill={starVal <= rating ? 'var(--brass)' : 'none'}
                    stroke={starVal <= rating ? 'var(--brass)' : 'var(--steel)'}
                  />
                </button>
              )
            })}
          </div>

          <textarea
            className="review-input"
            rows={3}
            placeholder="Tulis ulasan pengalaman pemakaian, akurasi, performa…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <div className="review-submit-row">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader size={16} className="spin" /> Mengirim…
                </>
              ) : (
                <>
                  <Send size={16} /> Kirim Ulasan
                </>
              )}
            </button>
          </div>

          {reviewError && <p className="review-error">{reviewError}</p>}
          {reviewSuccess && <p className="review-success">{reviewSuccess}</p>}
        </form>

        {/* Reviews List */}
        {reviewsLoading ? (
          <p className="detail-loading">Memuat ulasan…</p>
        ) : reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => {
              const isOwner = String(rev.user_id) === String(currentUserId)
              const isEditing = editingReviewId === rev.id

              return (
                <li key={rev.id} className="review-item">
                  <div className="review-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="review-user">{rev.user_identifier || 'Anonymous'}</span>
                      {isOwner && (
                        <span className="mono-badge" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                          Anda
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="review-stars-display">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < (isEditing ? editRating : rev.rating) ? 'var(--brass)' : 'none'}
                            stroke={i < (isEditing ? editRating : rev.rating) ? 'var(--brass)' : 'var(--line)'}
                          />
                        ))}
                      </span>

                      {/* Owner actions: Edit & Delete */}
                      {isOwner && !isEditing && (
                        <div className="review-owner-actions">
                          <button
                            type="button"
                            className="review-act-btn"
                            onClick={() => handleStartEdit(rev)}
                            title="Edit ulasan saya"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            className="review-act-btn review-act-btn--danger"
                            onClick={() => setConfirmDeleteRev(rev)}
                            title="Hapus ulasan saya"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline Edit Form */}
                  {isEditing ? (
                    <div className="review-edit-box">
                      <div className="review-stars" style={{ marginBottom: '8px' }}>
                        {Array.from({ length: 5 }, (_, i) => {
                          const starVal = i + 1
                          return (
                            <button
                              type="button"
                              key={starVal}
                              className="star-btn"
                              onClick={() => setEditRating(starVal)}
                            >
                              <Star
                                size={18}
                                fill={starVal <= editRating ? 'var(--brass)' : 'none'}
                                stroke={starVal <= editRating ? 'var(--brass)' : 'var(--steel)'}
                              />
                            </button>
                          )
                        })}
                      </div>

                      <textarea
                        className="review-input"
                        rows={2}
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        placeholder="Edit komentar Anda..."
                      />

                      {editError && <p className="review-error">{editError}</p>}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => handleSaveEdit(rev.id)}
                          disabled={updatingReview}
                        >
                          <Save size={13} /> {updatingReview ? 'Menyimpan…' : 'Simpan'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => setEditingReviewId(null)}
                          disabled={updatingReview}
                        >
                          <X size={13} /> Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {rev.comment && <p className="review-comment">{rev.comment}</p>}

                      {/* Voting Bar: Thumbs Up & Thumbs Down */}
                      <div className="review-vote-bar">
                        <button
                          type="button"
                          className={`vote-btn ${rev.userVote === 'up' ? 'vote-btn--active-up' : ''}`}
                          onClick={() => handleVote(rev.id, 'up')}
                          title="Membantu (Thumbs Up)"
                        >
                          <ThumbsUp size={14} />
                          <span>{rev.upvotes || 0}</span>
                        </button>

                        <button
                          type="button"
                          className={`vote-btn ${rev.userVote === 'down' ? 'vote-btn--active-down' : ''}`}
                          onClick={() => handleVote(rev.id, 'down')}
                          title="Kurang Membantu (Thumbs Down)"
                        >
                          <ThumbsDown size={14} />
                          <span>{rev.downvotes || 0}</span>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="detail-empty">Belum ada ulasan untuk produk ini. Jadilah yang pertama!</p>
        )}
      </section>

      {/* Modal Confirm Delete Review */}
      <ConfirmModal
        open={Boolean(confirmDeleteRev)}
        title="Hapus Ulasan"
        message="Ulasan dan rating Anda untuk produk ini akan dihapus permanen. Lanjutkan?"
        confirmLabel="Hapus Ulasan"
        danger
        loading={deletingReview}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteRev(null)}
      />
    </div>
  )
}
