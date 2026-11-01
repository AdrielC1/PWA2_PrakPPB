import { useState, useCallback } from 'react'
import {
  Shield,
  Copy,
  Check,
  Heart,
  FileText,
  Camera,
  Play,
  ChevronDown,
  ChevronUp,
  Trash2,
  RotateCcw,
  AlertTriangle,
  MessageCircle,
  Info,
  Phone,
  FileEdit,
  User,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import { useDeletedGuns } from '../hooks/useGuns'
import gunService from '../services/gunService'
import { queryCache } from '../utils/queryCache'
import {
  getAllDraftIds,
  loadDraft,
  deleteDraft,
  formatDraftTime,
  getDraftTimestamp,
  clearAllDrafts,
} from '../utils/draftStorage'
import { formatPrice } from '../utils/helpers'
import ConfirmModal from '../components/modals/ConfirmModal'
import EditProfileModal from '../components/modals/EditProfileModal'

// ---- Helpers ----
const getDraftLabel = (id) => {
  if (id === 'create') return '✨ Draft Tambah Produk Baru'
  const draft = loadDraft(id)
  return draft?.name ? `📝 Draft Edit: "${draft.name}"` : `📝 Draft Edit (ID: ${id})`
}

// ---- Collapsible Section ----
function ProfileSection({ icon: Icon, title, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`profile-section-card ${open ? 'profile-section-card--open' : ''}`}>
      <button
        type="button"
        className="profile-section-header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="profile-section-header-left">
          <Icon size={18} className="profile-section-icon" />
          <span className="profile-section-title">{title}</span>
          {badge !== undefined && badge !== null && (
            <span className="profile-section-badge">{badge}</span>
          )}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="profile-section-body">{children}</div>}
    </div>
  )
}

/**
 * ProfilePage — Operator Profile with:
 *  - Profile summary card + "Edit Profil" button that opens EditProfileModal popup
 *  - Section 1: Drafts (saved form drafts from Add/Edit Gun pages, click to resume)
 *  - Section 2: Recycle Bin (soft-deleted products, restore or hard delete)
 *  - Section 3: Tentang & Kontak (app info & contact)
 */
export default function ProfilePage({ onReplaySplash, onNavigate }) {
  // ---- User profile ----
  const [profile, setProfile] = useState(() => userService.getUserProfile())
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)

  // ---- Favorites ----
  const { favorites } = useFavorites()

  // ---- Drafts ----
  const [draftIds, setDraftIds] = useState(() => getAllDraftIds())
  const [confirmClearDrafts, setConfirmClearDrafts] = useState(false)

  const handleDeleteOneDraft = (id) => {
    deleteDraft(id)
    setDraftIds(getAllDraftIds())
  }

  const handleClearAllDrafts = () => {
    clearAllDrafts()
    setDraftIds([])
    setConfirmClearDrafts(false)
  }

  // ---- Recycle Bin ----
  const { guns: deletedGuns, loading: recycleBinLoading, refetch: refetchDeleted } = useDeletedGuns()
  const [restoring, setRestoring] = useState(null)
  const [hardDeleting, setHardDeleting] = useState(null)
  const [confirmHardDelete, setConfirmHardDelete] = useState(null)
  const [binActionError, setBinActionError] = useState('')

  const handleRestore = useCallback(async (gun) => {
    try {
      setRestoring(gun.id)
      setBinActionError('')
      await gunService.restoreGun(gun.id)
      queryCache.invalidate('guns')
      refetchDeleted()
    } catch (err) {
      setBinActionError(err.message || 'Gagal memulihkan produk.')
    } finally {
      setRestoring(null)
    }
  }, [refetchDeleted])

  const handleHardDelete = useCallback(async () => {
    if (!confirmHardDelete) return
    try {
      setHardDeleting(confirmHardDelete.id)
      setBinActionError('')
      await gunService.deleteGun(confirmHardDelete.id)
      queryCache.invalidate('guns')
      refetchDeleted()
      setConfirmHardDelete(null)
    } catch (err) {
      setBinActionError(err.message || 'Gagal menghapus permanen.')
    } finally {
      setHardDeleting(null)
    }
  }, [confirmHardDelete, refetchDeleted])

  // ---- Quick Avatar Upload on Card ----
  const handleQuickAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setFeedback('Avatar harus di bawah 2MB.')
      setTimeout(() => setFeedback(''), 3000)
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target.result
      const updated = { ...profile, avatar: base64 }
      userService.updateAvatar(base64)
      setProfile(updated)
      setFeedback('Avatar diperbarui!')
      setTimeout(() => setFeedback(''), 3000)
    }
    reader.readAsDataURL(file)
  }

  // ---- Copy UID ----
  const handleCopyId = () => {
    if (profile.userId && navigator.clipboard) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // ---- Save from Modal Popup ----
  const handleSaveProfileFromModal = (updatedData) => {
    const result = userService.saveUserProfile(updatedData)
    if (result.success) {
      setProfile(result.data)
      setShowEditModal(false)
      setFeedback('Profil berhasil disimpan!')
      setTimeout(() => setFeedback(''), 3000)
    } else {
      setFeedback('Gagal menyimpan profil.')
    }
  }

  return (
    <div className="profile-page">

      {/* ---- Masthead ---- */}
      <section className="masthead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="display">Operator Profile</h1>
          <p className="lede">Pengaturan profil, draft tersimpan, recycle bin, dan info aplikasi.</p>
        </div>
        {onReplaySplash && (
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={onReplaySplash}
            title="Replay splash intro"
          >
            <Play size={14} /> Replay Intro
          </button>
        )}
      </section>

      {/* ---- Feedback Toast ---- */}
      {feedback && (
        <div className="toast toast--success" role="status">
          <Check size={18} /> {feedback}
        </div>
      )}

      {/* ---- Profile Summary Card ---- */}
      <div className="profile-card">
        <div className="profile-card-top" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div className="avatar-wrap">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={36} stroke="var(--brass)" />
              </div>
            )}
            <label htmlFor="avatar-file-input" className="avatar-upload-btn" title="Ganti avatar cepat">
              <Camera size={14} />
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleQuickAvatarChange}
                className="hidden-file-input"
              />
            </label>
          </div>

          <div className="profile-identity" style={{ flex: 1, minWidth: '180px' }}>
            <h2 className="display">{profile.username || 'Shooter'}</h2>
            <div className="profile-id-row">
              <span className="mono-badge">{profile.userId}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCopyId}
                title="Salin User ID"
              >
                {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
              </button>
            </div>
            {profile.defaultWa && (
              <span style={{ fontSize: '0.8rem', color: 'var(--steel)', display: 'block', marginTop: '2px' }}>
                WA: +{profile.defaultWa}
              </span>
            )}
            {profile.bio && <p className="profile-bio-preview">{profile.bio}</p>}
          </div>

          {/* Edit Profile Button (Opens Modal) */}
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setShowEditModal(true)}
            style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <User size={15} /> Edit Profil
          </button>
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="stat-item">
            <Heart size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Produk Favorit</div>
          </div>
          <div className="stat-item">
            <FileText size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{draftIds.length}</div>
            <div className="stat-label">Draft Tersimpan</div>
          </div>
          <div className="stat-item">
            <Trash2 size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{deletedGuns.length}</div>
            <div className="stat-label">Recycle Bin</div>
          </div>
        </div>
      </div>

      {/* ===================================================
          SECTION 1: DRAFTS
          =================================================== */}
      <ProfileSection
        icon={FileEdit}
        title="Draft Tersimpan"
        badge={draftIds.length || null}
        defaultOpen={draftIds.length > 0}
      >
        {draftIds.length === 0 ? (
          <p className="profile-empty-state">
            Belum ada draft tersimpan. Draft otomatis tersimpan saat Anda mengisi form Add/Edit produk.
          </p>
        ) : (
          <>
            <ul className="draft-list">
              {draftIds.map((id) => {
                const ts = getDraftTimestamp(id)
                return (
                  <li key={id} className="draft-item">
                    <div
                      className="draft-item-info"
                      style={{ cursor: onNavigate ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (!onNavigate) return
                        if (id === 'create') {
                          onNavigate('Create')
                        } else {
                          onNavigate('Edit', { id })
                        }
                      }}
                      title={onNavigate ? 'Klik untuk melanjutkan edit draft ini' : undefined}
                    >
                      <span className="draft-item-label">{getDraftLabel(id)}</span>
                      {ts && (
                        <span className="draft-item-ts">
                          Disimpan: {formatDraftTime(ts)} {onNavigate && '• (Klik untuk melanjutkan)'}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn--outline btn--sm draft-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteOneDraft(id)
                      }}
                      title="Hapus draft ini"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="draft-footer">
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => setConfirmClearDrafts(true)}
              >
                <Trash2 size={14} /> Hapus Semua Draft
              </button>
            </div>
          </>
        )}

        <ConfirmModal
          open={confirmClearDrafts}
          title="Hapus Semua Draft"
          message="Semua draft yang tersimpan akan dihapus permanen. Lanjutkan?"
          confirmLabel="Hapus Semua"
          danger
          loading={false}
          onConfirm={handleClearAllDrafts}
          onCancel={() => setConfirmClearDrafts(false)}
        />
      </ProfileSection>

      {/* ===================================================
          SECTION 2: RECYCLE BIN
          =================================================== */}
      <ProfileSection
        icon={Trash2}
        title="Recycle Bin"
        badge={deletedGuns.length || null}
        defaultOpen={deletedGuns.length > 0}
      >
        {binActionError && (
          <div className="toast toast--error" role="alert">
            <AlertTriangle size={16} /> {binActionError}
          </div>
        )}

        {recycleBinLoading ? (
          <p className="profile-empty-state">Memuat recycle bin…</p>
        ) : deletedGuns.length === 0 ? (
          <p className="profile-empty-state">
            Recycle bin kosong. Produk yang dihapus dari katalog akan muncul di sini dan dapat dipulihkan.
          </p>
        ) : (
          <>
            <p className="profile-bin-hint">
              <Info size={14} /> Produk di sini tidak muncul di katalog. Pulihkan untuk menampilkan kembali, atau hapus permanen.
            </p>
            <ul className="recycle-bin-list">
              {deletedGuns.map((gun) => (
                <li key={gun.id} className="recycle-bin-item">
                  <img
                    src={gun.image_url || '/guns/pistol.svg'}
                    alt={gun.name}
                    className="recycle-bin-img"
                  />
                  <div className="recycle-bin-info">
                    <span className="recycle-bin-name">{gun.name}</span>
                    <span className="recycle-bin-meta">
                      {gun.type} · {gun.caliber} · {formatPrice(gun.price)}
                    </span>
                    {gun.deleted_at && (
                      <span className="recycle-bin-ts">
                        Dihapus: {new Date(gun.deleted_at).toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                  <div className="recycle-bin-actions">
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={() => handleRestore(gun)}
                      disabled={restoring === gun.id}
                      title="Pulihkan ke katalog"
                    >
                      <RotateCcw size={14} />
                      <span>{restoring === gun.id ? 'Memulihkan…' : 'Pulihkan'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => setConfirmHardDelete(gun)}
                      disabled={hardDeleting === gun.id}
                      title="Hapus permanen"
                    >
                      <Trash2 size={14} />
                      <span>Hapus Permanen</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <ConfirmModal
          open={!!confirmHardDelete}
          title="Hapus Permanen"
          message={`Produk "${confirmHardDelete?.name}" akan dihapus selamanya dari database dan tidak dapat dipulihkan. Yakin?`}
          confirmLabel="Hapus Permanen"
          danger
          loading={hardDeleting !== null}
          onConfirm={handleHardDelete}
          onCancel={() => setConfirmHardDelete(null)}
        />
      </ProfileSection>

      {/* ===================================================
          SECTION 3: TENTANG & KONTAK
          =================================================== */}
      <ProfileSection icon={Info} title="Tentang & Kontak" defaultOpen={false}>
        <div className="about-contact-grid">
          <div className="about-block">
            <h3 className="about-block-title">
              <Info size={16} /> Tentang Aplikasi
            </h3>
            <p>
              <strong>Bore &amp; Barrel</strong> adalah katalog toko senjata demo yang dibangun
              sebagai Progressive Web App (PWA). Dapat diinstal di perangkat Anda dan berfungsi
              secara offline dengan service worker.
            </p>
            <ul className="about-features-list">
              <li>📦 Katalog produk dengan filter, sort, dan pencarian</li>
              <li>⚡ Lazy loading &amp; paginasi</li>
              <li>💾 Caching data (in-memory, 2 menit TTL)</li>
              <li>🗑️ Soft delete dengan Recycle Bin</li>
              <li>💚 Tombol kontak WhatsApp penjual</li>
              <li>🔗 Deep link produk untuk berbagi</li>
              <li>❤️ Sistem favorit berbasis UUID anonim</li>
              <li>⭐ Ulasan &amp; rating produk</li>
              <li>📝 Auto-save draft form Add/Edit</li>
              <li>🌐 PWA: installable, offline-ready</li>
            </ul>
          </div>

          <div className="about-block">
            <h3 className="about-block-title">
              <Phone size={16} /> Kontak Toko
            </h3>
            <p>
              <strong>Bore &amp; Barrel Armory</strong><br />
              123 Range Road, Semarang<br />
              Buka Selasa–Sabtu, 10.00–18.00
            </p>
            <p>
              📞 (555) 010-0100
            </p>
            <a
              href="https://wa.me/6281234567890?text=Halo%20Bore%20%26%20Barrel%2C%20saya%20ingin%20bertanya%20tentang%20produk."
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--wa btn--sm"
              style={{ marginTop: '8px', display: 'inline-flex' }}
            >
              <MessageCircle size={16} /> Chat via WhatsApp
            </a>
          </div>
        </div>
      </ProfileSection>

      {/* ===================================================
          MODAL POPUP: EDIT PROFILE
          =================================================== */}
      <EditProfileModal
        open={showEditModal}
        profile={profile}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveProfileFromModal}
      />

    </div>
  )
}
