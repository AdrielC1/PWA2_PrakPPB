import { useState } from 'react'
import { Share2, MessageCircle, Check, Images } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import LazyImage from '../common/LazyImage'
import { formatPrice, truncate, getWhatsAppUrl, shareProduct } from '../../utils/helpers'

/**
 * Product card used in the catalog grid with WhatsApp direct link and Share button.
 *
 * @param {Object}   props
 * @param {Object}   props.gun        — product data
 * @param {Function} props.onSelect   — called with the gun when clicked
 * @param {Function} [props.onEdit]   — called when Edit is clicked (admin)
 * @param {Function} [props.onDelete] — called when Delete is clicked (admin)
 */
export default function GunCard({ gun, onSelect, onEdit, onDelete }) {
  const [copied, setCopied] = useState(false)

  const imgSrc = gun.image_url || gun.image || '/guns/pistol.svg'
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0
  const waUrl = getWhatsAppUrl(gun)
  const imageCount = Array.isArray(gun.images) ? gun.images.length : (gun.image_url ? 1 : 0)

  const handleShare = async (e) => {
    e.stopPropagation()
    const res = await shareProduct(gun)
    if (res.ok && res.method === 'clipboard') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <li className="card">
      <button
        type="button"
        className="card-btn"
        onClick={() => onSelect(gun)}
        aria-label={`View ${gun.name}`}
      >
        <div className="card-img-container">
          <LazyImage
            className="card-img"
            src={imgSrc}
            alt={gun.name}
            fallbackSrc="/guns/pistol.svg"
          />
          {imageCount > 1 && (
            <span className="card-images-badge" title={`${imageCount} foto tersedia`}>
              <Images size={12} />
              <span>{imageCount}</span>
            </span>
          )}
        </div>

        <span className="name display">{gun.name}</span>

        <span className="type">
          {category}
          {caliber ? ` · ${caliber}` : ''}
        </span>

        {gun.description && (
          <span className="card-desc">{truncate(gun.description, 72)}</span>
        )}

        <span className="price">{formatPrice(price)}</span>
      </button>

      {/* Floating actions row */}
      <div className="card-actions">
        <FavoriteButton gunId={gun.id || gun.name} />

        <button
          type="button"
          className="card-act-btn"
          onClick={handleShare}
          aria-label={`Bagikan ${gun.name}`}
          title={copied ? 'Link Disalin!' : 'Bagikan Link Produk'}
        >
          {copied ? <Check size={14} className="icon-success" /> : <Share2 size={14} />}
        </button>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="card-act-btn card-act-btn--wa"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Hubungi via WhatsApp untuk ${gun.name}`}
          title="Hubungi Penjual via WhatsApp"
        >
          <MessageCircle size={14} />
        </a>

        {onEdit && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => { e.stopPropagation(); onEdit(gun) }}
            aria-label={`Edit ${gun.name}`}
            title="Edit"
          >
            ✏️
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            className="card-act-btn card-act-btn--danger"
            onClick={(e) => { e.stopPropagation(); onDelete(gun) }}
            aria-label={`Delete ${gun.name}`}
            title="Delete"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Card bottom direct actions */}
      <div className="card-quick-actions">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="card-quick-btn card-quick-btn--wa"
          onClick={(e) => e.stopPropagation()}
          title="Tanya ketersediaan produk via WhatsApp"
        >
          <MessageCircle size={14} />
          <span>Hubungi WA</span>
        </a>

        <button
          type="button"
          className="card-quick-btn card-quick-btn--share"
          onClick={handleShare}
          title="Bagikan link produk ini"
        >
          {copied ? <Check size={14} /> : <Share2 size={14} />}
          <span>{copied ? 'Tersalin!' : 'Bagikan'}</span>
        </button>
      </div>
    </li>
  )
}
