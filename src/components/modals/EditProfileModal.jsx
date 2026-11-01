import { useState } from 'react'
import { X, Save, Camera, Shield, User } from 'lucide-react'

export default function EditProfileModal({ open, profile, onClose, onSave }) {
  const [username, setUsername] = useState(profile?.username || 'Shooter')
  const [bio, setBio] = useState(profile?.bio || '')
  const [defaultWa, setDefaultWa] = useState(profile?.defaultWa || '6281234567890')
  const [avatar, setAvatar] = useState(profile?.avatar || null)
  const [errorMsg, setErrorMsg] = useState('')

  if (!open) return null

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Ukuran avatar harus di bawah 2MB.')
      setTimeout(() => setErrorMsg(''), 3000)
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatar(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      username: username.trim() || 'Shooter',
      bio: bio.trim(),
      defaultWa: defaultWa.trim() || '6281234567890',
      avatar,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box edit-profile-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 id="edit-profile-title" className="modal-title display" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <User size={20} /> Edit Profil
          </h3>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title="Tutup popup"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="toast toast--error" style={{ margin: '4px 0' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-section-form" style={{ marginTop: '8px' }}>
          {/* Avatar edit in modal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div className="avatar-wrap" style={{ width: '64px', height: '64px' }}>
              {avatar ? (
                <img src={avatar} alt={username} className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">
                  <Shield size={28} stroke="var(--brass)" />
                </div>
              )}
              <label htmlFor="modal-avatar-input" className="avatar-upload-btn" title="Ganti avatar">
                <Camera size={13} />
                <input
                  id="modal-avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden-file-input"
                />
              </label>
            </div>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Foto Profil</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--steel)' }}>Klik ikon kamera untuk mengganti (maks 2MB)</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="modal-prof-name" className="form-label">
              Nama / Callsign
            </label>
            <input
              id="modal-prof-name"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: Operator Delta, Admin Armory"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="modal-prof-wa" className="form-label">
              Nomor WhatsApp Default Penjual
            </label>
            <input
              id="modal-prof-wa"
              type="text"
              value={defaultWa}
              onChange={(e) => setDefaultWa(e.target.value)}
              placeholder="6281234567890"
              className="form-input"
            />
            <p className="form-hint">
              Nomor fallback untuk tombol "Hubungi Penjual" jika produk belum memiliki nomor khusus.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="modal-prof-bio" className="form-label">
              Bio / Catatan Armory
            </label>
            <textarea
              id="modal-prof-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Spesialisasi senjata, kaliber favorit, catatan..."
              rows={3}
              className="form-textarea"
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '12px' }}>
            <button
              type="button"
              className="modal-btn modal-btn--cancel"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="submit"
              className="modal-btn modal-btn--confirm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={15} /> Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
