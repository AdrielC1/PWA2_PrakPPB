import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Loader,
  Save,
  CheckCircle,
  AlertCircle,
  Star,
  Trash2,
  Images,
} from 'lucide-react'
import gunService from '../services/gunService'
import uploadService from '../services/uploadService'
import {
  saveDraft,
  loadDraft,
  deleteDraft,
  hasDraft,
  getDraftTimestamp,
  formatDraftTime,
} from '../utils/draftStorage'
import ConfirmModal from '../components/modals/ConfirmModal'

/**
 * EditGunPage — Edit an existing weapon / hardware item with Multiple Images support.
 */
export default function EditGunPage({ gun, gunId, onBack, onSuccess }) {
  const targetId = gunId || gun?.id

  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    type: 'Pistol',
    caliber: '9mm',
    category: 'makanan',
    difficulty: 'mudah',
    price: 599,
    description: '',
    seller_whatsapp: '6281234567890',
    servings: 1,
    is_featured: false,
  })

  // Multiple Images State
  const [images, setImages] = useState(['/guns/pistol.svg'])
  const [customImageUrl, setCustomImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  // Specs & Steps
  const [specs, setSpecs] = useState([{ name: '', quantity: '' }])
  const [steps, setSteps] = useState([''])

  // Draft modal
  const [showDraftModal, setShowDraftModal] = useState(() => (targetId ? hasDraft(targetId) : false))
  const [draftTimestamp, setDraftTimestamp] = useState(() => (targetId ? getDraftTimestamp(targetId) : null))

  // Fetch initial data
  useEffect(() => {
    const fetchGun = async () => {
      try {
        setLoading(true)
        setError('')

        let data = gun
        if (!data || !data.ingredients || !data.steps) {
          if (targetId && !String(targetId).startsWith('local-')) {
            const res = await gunService.getGunById(targetId)
            if (res.success && res.data) {
              data = res.data
            }
          }
        }

        if (data) {
          setFormData({
            name: data.name || '',
            type: data.type || (data.category === 'makanan' ? 'Pistol' : 'Rifle'),
            caliber: data.caliber || '9mm',
            category: data.category || 'makanan',
            difficulty: data.difficulty || 'mudah',
            price: data.price ?? data.cook_time ?? 599,
            description: data.description || '',
            seller_whatsapp: data.seller_whatsapp || '6281234567890',
            servings: data.servings || 1,
            is_featured: Boolean(data.is_featured),
          })

          // Extract multiple images
          const rawImgs = Array.isArray(data.images) && data.images.length > 0
            ? data.images
            : [data.image_url || data.image || '/guns/pistol.svg']
          setImages(rawImgs.filter(Boolean))

          if (data.ingredients && data.ingredients.length > 0) {
            setSpecs(data.ingredients.map((ing) => ({
              name: ing.name || '',
              quantity: ing.quantity || '',
            })))
          } else {
            setSpecs([
              { name: 'Platform', quantity: data.type || 'Pistol' },
              { name: 'Caliber', quantity: data.caliber || '9mm' },
            ])
          }

          if (data.steps && data.steps.length > 0) {
            setSteps(data.steps.map((st) => (typeof st === 'string' ? st : st.instruction || '')))
          } else {
            setSteps(['Standard manufacturer maintenance and cleaning protocol.'])
          }

        } else {
          setError('Hardware record could not be loaded.')
        }
      } catch (err) {
        setError(err.message || 'Failed to load hardware record from server.')
      } finally {
        setLoading(false)
      }
    }

    if (targetId) {
      fetchGun()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId])

  // Draft operations
  const handleLoadDraft = () => {
    const draft = loadDraft(targetId)
    if (draft) {
      if (draft.formData) setFormData(draft.formData)
      if (draft.specs) setSpecs(draft.specs)
      if (draft.steps) setSteps(draft.steps)
      if (Array.isArray(draft.images) && draft.images.length > 0) {
        setImages(draft.images)
      }
      setShowDraftModal(false)
      setSuccessMsg('Saved draft restored.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const handleDiscardDraft = () => {
    deleteDraft(targetId)
    setShowDraftModal(false)
    setDraftTimestamp(null)
  }

  const handleManualSaveDraft = () => {
    const draftData = {
      formData,
      specs,
      steps,
      images,
    }
    const saved = saveDraft(draftData, targetId)
    if (saved) {
      const ts = getDraftTimestamp(targetId)
      setDraftTimestamp(ts)
      setSuccessMsg(`Draft saved (${formatDraftTime(ts)})`)
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  // Handle image file upload (supports multiple)
  const handleFilesUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    setError('')

    const newUploaded = []
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`File ${file.name} melebihi 5MB.`)
        continue
      }
      try {
        const res = await uploadService.uploadImage(file)
        if (res.success && res.data?.url) {
          newUploaded.push(res.data.url)
        } else {
          newUploaded.push(URL.createObjectURL(file))
        }
      } catch {
        newUploaded.push(URL.createObjectURL(file))
      }
    }

    if (newUploaded.length > 0) {
      setImages((prev) => [...prev, ...newUploaded])
      setSuccessMsg(`${newUploaded.length} foto baru berhasil ditambahkan.`)
      setTimeout(() => setSuccessMsg(''), 3000)
    }

    setUploading(false)
    e.target.value = ''
  }

  // Add preset image
  const handleAddPreset = (url) => {
    setImages((prev) => [...prev, url])
    setSuccessMsg('Foto preset ditambahkan!')
    setTimeout(() => setSuccessMsg(''), 2000)
  }

  // Add custom URL image
  const handleAddCustomUrl = (e) => {
    e.preventDefault()
    if (!customImageUrl.trim()) return
    setImages((prev) => [...prev, customImageUrl.trim()])
    setCustomImageUrl('')
    setSuccessMsg('URL foto ditambahkan!')
    setTimeout(() => setSuccessMsg(''), 2000)
  }

  // Set image as primary (move to index 0)
  const handleSetPrimary = (idx) => {
    if (idx === 0) return
    setImages((prev) => {
      const copy = [...prev]
      const [selected] = copy.splice(idx, 1)
      return [selected, ...copy]
    })
    setSuccessMsg('Foto utama diperbarui!')
    setTimeout(() => setSuccessMsg(''), 2000)
  }

  // Remove an image from gallery
  const handleRemoveImage = (idx) => {
    if (images.length <= 1) {
      setError('Katalog minimal harus memiliki 1 gambar.')
      setTimeout(() => setError('') , 3000)
      return
    }
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  // Specs & Steps
  const handleSpecChange = (index, field, value) => {
    setSpecs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addSpec = () => setSpecs((prev) => [...prev, { name: '', quantity: '' }])
  const removeSpec = (index) => {
    if (specs.length <= 1) return
    setSpecs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleStepChange = (index, value) => {
    setSteps((prev) => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const addStep = () => setSteps((prev) => [...prev, ''])
  const removeStep = (index) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      setError('Product name must be at least 3 characters.')
      return
    }

    const cleanSpecs = specs
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        quantity: s.quantity.trim() || 'Standard',
      }))

    if (cleanSpecs.length === 0) {
      setError('Please provide at least one specification.')
      return
    }

    const cleanSteps = steps
      .filter((s) => s.trim())
      .map((s) => s.trim())

    if (cleanSteps.length === 0) {
      setError('Please provide at least one maintenance step.')
      return
    }

    const cleanImages = images.filter(Boolean)
    if (cleanImages.length === 0) {
      cleanImages.push('/guns/pistol.svg')
    }

    const payload = {
      name: formData.name.trim(),
      type: formData.type || (formData.category === 'minuman' ? 'Rifle' : 'Pistol'),
      caliber: formData.caliber || '9mm',
      price: Number(formData.price) || 500,
      category: formData.category || 'makanan',
      description: formData.description.trim() || `${formData.type} caliber ${formData.caliber}.`,
      seller_whatsapp: formData.seller_whatsapp || '6281234567890',
      image_url: cleanImages[0],
      images: cleanImages,
      prep_time: 15,
      cook_time: Number(formData.price) || 500,
      servings: Number(formData.servings) || 1,
      difficulty: formData.difficulty || 'mudah',
      is_featured: Boolean(formData.is_featured),
      ingredients: cleanSpecs,
      steps: cleanSteps,
    }

    try {
      setUpdating(true)
      const res = await gunService.updateGun(targetId, payload)
      if (res.success || res.data) {
        deleteDraft(targetId)
        if (onSuccess) {
          onSuccess(res.data)
        } else if (onBack) {
          onBack()
        }
      } else {
        throw new Error(res.message || 'Failed to update record on server.')
      }
    } catch (err) {
      setError(err.message || 'Error occurred while updating record.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="state-box">
        <Loader size={32} className="spin" />
        <p>Loading hardware details for editing…</p>
      </div>
    )
  }

  return (
    <div className="form-page">
      {/* Head */}
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Kembali
        </button>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={handleManualSaveDraft}
          title="Save draft"
        >
          <Save size={14} /> Simpan Draft
        </button>
      </div>

      <section className="masthead">
        <h1 className="display">Edit Hardware #{targetId}</h1>
        <p className="lede">Perbarui detail, spesifikasi, dan kelola banyak foto/gambar produk.</p>
      </section>

      {error && (
        <div className="toast toast--error">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="toast toast--success">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="entry-form">
        {/* ===================================================
            MULTIPLE IMAGERY SECTION
            =================================================== */}
        <div className="card-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h2 className="card-box-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Images size={20} /> Galeri Foto Produk ({images.length})
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--steel)' }}>
              Foto pertama (★ Utama) akan menjadi thumbnail utama di katalog.
            </span>
          </div>

          {/* Current Images Grid */}
          <div className="multi-img-grid">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`multi-img-card ${idx === 0 ? 'multi-img-card--primary' : ''}`}
              >
                {idx === 0 && <span className="multi-img-badge-primary">★ Foto Utama</span>}
                <img src={img} alt={`Asset ${idx + 1}`} className="multi-img-thumb" />
                <div className="multi-img-actions">
                  {idx !== 0 ? (
                    <button
                      type="button"
                      className="multi-img-btn"
                      onClick={() => handleSetPrimary(idx)}
                      title="Jadikan foto utama"
                    >
                      <Star size={12} /> Utama
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--brass)', fontWeight: 700 }}>Utama</span>
                  )}

                  <button
                    type="button"
                    className="multi-img-btn multi-img-btn--danger"
                    onClick={() => handleRemoveImage(idx)}
                    disabled={images.length <= 1}
                    title="Hapus foto ini"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add More Images Controls */}
          <div className="multi-img-add-row">
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Tambah Foto ke Galeri:</span>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <input
                id="edit-multi-file-input"
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFilesUpload}
                className="hidden-file-input"
              />
              <label htmlFor="edit-multi-file-input" className="btn btn--outline btn--sm" style={{ cursor: 'pointer' }}>
                <Upload size={14} /> Upload File dari Komputer
              </label>

              {uploading && (
                <span style={{ fontSize: '0.82rem', color: 'var(--steel)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Loader size={14} className="spin" /> Mengunggah…
                </span>
              )}
            </div>

            {/* Armory Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--steel)' }}>Preset cepat:</span>
              <button type="button" className="pill" onClick={() => handleAddPreset('/guns/pistol.svg')}>+ Pistol</button>
              <button type="button" className="pill" onClick={() => handleAddPreset('/guns/rifle.svg')}>+ Rifle</button>
              <button type="button" className="pill" onClick={() => handleAddPreset('/guns/shotgun.svg')}>+ Shotgun</button>
              <button type="button" className="pill" onClick={() => handleAddPreset('/guns/blueprint.svg')}>+ Blueprint</button>
              <button type="button" className="pill" onClick={() => handleAddPreset('/guns/accessory.svg')}>+ Aksesori</button>
            </div>

            {/* Custom URL Input */}
            <div style={{ display: 'flex', gap: '8px', maxWidth: '420px', marginTop: '4px' }}>
              <input
                type="url"
                placeholder="https://contoh.com/gambar.png"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.82rem', padding: '6px 10px' }}
              />
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={handleAddCustomUrl}
              >
                <Plus size={14} /> Tambah URL
              </button>
            </div>
          </div>
        </div>

        {/* Core fields */}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="edit-name" className="form-label">
              Model Designation <span className="req">*</span>
            </label>
            <input
              id="edit-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-type" className="form-label">
              Weapon Category
            </label>
            <select
              id="edit-type"
              name="type"
              value={formData.type}
              onChange={(e) => {
                const val = e.target.value
                setFormData((p) => ({
                  ...p,
                  type: val,
                  category: val === 'Rifle' ? 'minuman' : 'makanan',
                }))
              }}
              className="form-select"
            >
              <option value="Pistol">Pistol / Handgun</option>
              <option value="Rifle">Rifle / Carbine</option>
              <option value="Shotgun">Shotgun</option>
              <option value="Submachine Gun">Submachine Gun (SMG)</option>
              <option value="Precision">Precision / Sniper</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="edit-caliber" className="form-label">
              Primary Caliber <span className="req">*</span>
            </label>
            <input
              id="edit-caliber"
              type="text"
              name="caliber"
              value={formData.caliber}
              onChange={(e) => setFormData((p) => ({ ...p, caliber: e.target.value }))}
              placeholder="e.g. 9x19mm, 5.56 NATO, 12 GA"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-price" className="form-label">
              Price (USD) <span className="req">*</span>
            </label>
            <input
              id="edit-price"
              type="number"
              name="price"
              min="0"
              step="1"
              value={formData.price}
              onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-wa" className="form-label">
              Nomor WhatsApp Penjual
            </label>
            <input
              id="edit-wa"
              type="text"
              name="seller_whatsapp"
              value={formData.seller_whatsapp}
              onChange={(e) => setFormData((p) => ({ ...p, seller_whatsapp: e.target.value }))}
              placeholder="6281234567890"
              className="form-input"
            />
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="edit-desc" className="form-label">
            Field Description &amp; History
          </label>
          <textarea
            id="edit-desc"
            name="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            className="form-textarea"
          />
        </div>

        {/* Specifications */}
        <div className="card-box">
          <div className="card-box-header">
            <h2 className="card-box-title">Technical Specifications</h2>
            <button type="button" className="btn btn--outline btn--sm" onClick={addSpec}>
              <Plus size={14} /> Add Spec
            </button>
          </div>

          <div className="repeater-list">
            {specs.map((spec, index) => (
              <div key={index} className="repeater-row">
                <input
                  type="text"
                  placeholder="Spec name (e.g. Barrel Length, Action)"
                  value={spec.name}
                  onChange={(e) => handleSpecChange(index, 'name', e.target.value)}
                  className="form-input repeater-input"
                  required
                />
                <input
                  type="text"
                  placeholder="Value (e.g. 16.5 inches, Semi-Auto)"
                  value={spec.quantity}
                  onChange={(e) => handleSpecChange(index, 'quantity', e.target.value)}
                  className="form-input repeater-input"
                />
                <button
                  type="button"
                  className="icon-btn repeater-remove"
                  onClick={() => removeSpec(index)}
                  disabled={specs.length <= 1}
                  title="Remove spec"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance / Assembly Steps */}
        <div className="card-box">
          <div className="card-box-header">
            <h2 className="card-box-title">Maintenance &amp; Assembly Steps</h2>
            <button type="button" className="btn btn--outline btn--sm" onClick={addStep}>
              <Plus size={14} /> Add Step
            </button>
          </div>

          <div className="repeater-list">
            {steps.map((step, index) => (
              <div key={index} className="repeater-row repeater-row--step">
                <span className="step-num">{index + 1}</span>
                <textarea
                  rows={2}
                  placeholder={`Step ${index + 1} instructions...`}
                  value={step}
                  onChange={(e) => handleStepChange(index, e.target.value)}
                  className="form-textarea repeater-input"
                  required
                />
                <button
                  type="button"
                  className="icon-btn repeater-remove"
                  onClick={() => removeStep(index)}
                  disabled={steps.length <= 1}
                  title="Remove step"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit bar */}
        <div className="form-submit-bar">
          <button type="button" className="btn btn--outline" onClick={onBack}>
            Batal
          </button>
          <button type="submit" className="btn btn--primary" disabled={updating}>
            {updating ? (
              <>
                <Loader size={16} className="spin" /> Menyimpan Perubahan…
              </>
            ) : (
              <>
                <Save size={16} /> Simpan Perubahan Hardware
              </>
            )}
          </button>
        </div>
      </form>

      {/* Restore Draft Modal */}
      <ConfirmModal
        open={showDraftModal}
        title="Restore Saved Edit Draft?"
        message={`An unsaved draft for this item was found from ${formatDraftTime(draftTimestamp)}. Would you like to restore it?`}
        confirmLabel="Restore Draft"
        cancelLabel="Discard Draft"
        onConfirm={handleLoadDraft}
        onCancel={handleDiscardDraft}
      />
    </div>
  )
}
