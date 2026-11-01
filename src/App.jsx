import { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Catalog from './pages/Catalog.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import CreateGunPage from './pages/CreateGunPage.jsx'
import EditGunPage from './pages/EditGunPage.jsx'
import GunDetail from './components/gun/GunDetail.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import GUNS_LOCAL from './data/guns.js'
import { queryCache } from './utils/queryCache.js'
import './App.css'

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState('list') // 'list' | 'create' | 'edit' | 'detail'
  const [selectedGun, setSelectedGun] = useState(null)
  const [editingGun, setEditingGun] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Deep linking: detect ?product=ID from URL (essential for shared links on Vercel)
  useEffect(() => {
    const handleUrlRoute = async () => {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      const productId = params.get('product') || params.get('id')

      if (productId) {
        setShowSplash(false)

        // 1. Check local items first
        const localMatch = GUNS_LOCAL.find(
          (g, idx) => String(g.id || `local-${idx}`) === String(productId) || g.name === productId
        )
        if (localMatch) {
          setSelectedGun(localMatch)
          setMode('detail')
          return
        }

        // 2. Fetch from API
        try {
          const res = await gunService.getGunById(productId)
          if (res?.success && res.data) {
            setSelectedGun(res.data)
            setMode('detail')
          }
        } catch (err) {
          console.warn('Direct product link not found:', err)
        }
      }
    }

    handleUrlRoute()

    // Handle browser forward / back button
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search)
      const productId = params.get('product') || params.get('id')
      if (!productId) {
        setMode('list')
        setSelectedGun(null)
      } else {
        handleUrlRoute()
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Unified navigation handler with URL pushState
  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      const id = payload?.id || payload?.name
      if (id && typeof window !== 'undefined') {
        window.history.pushState(null, '', `?product=${encodeURIComponent(id)}`)
      }
    } else {
      // Tab change
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      if (typeof window !== 'undefined' && window.location.search) {
        window.history.pushState(null, '', window.location.pathname)
      }
    }
  }

  const handleBackToList = () => {
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.pushState(null, '', window.location.pathname)
    }
  }

  return (
    <div className="shell">
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />

      <main className="main">
        {/* Sub-page views */}
        {mode === 'create' && (
          <CreateGunPage
            onBack={handleBackToList}
            onSuccess={() => {
              queryCache.invalidate('guns')
              handleBackToList()
              setTab('Catalog')
            }}
          />
        )}

        {mode === 'edit' && (
          <EditGunPage
            gun={editingGun}
            gunId={editingGun?.id}
            onBack={handleBackToList}
            onSuccess={() => {
              queryCache.invalidate('guns')
              queryCache.invalidate('gun')
              handleBackToList()
              setTab('Catalog')
            }}
          />
        )}

        {mode === 'detail' && selectedGun && (
          <GunDetail
            gun={selectedGun}
            onBack={handleBackToList}
            onEdit={(g) => handleNavigate('Edit', g)}
            onDelete={(g) => setDeleteTarget(g)}
          />
        )}

        {/* Top-level Tabs */}
        {mode === 'list' && (
          <>
            {tab === 'Catalog' && (
              <Catalog
                onNavigate={(destination, payload) => handleNavigate(destination, payload)}
              />
            )}
            {tab === 'Favorites' && (
              <FavoritesPage
                onSelectGun={(g) => handleNavigate('Detail', g)}
                onNavigateCatalog={() => setTab('Catalog')}
              />
            )}
            {tab === 'Profile' && (
              <ProfilePage
                onReplaySplash={() => setShowSplash(true)}
                onNavigate={(destination, payload) => handleNavigate(destination, payload)}
              />
            )}
          </>
        )}
      </main>

      {/* Global Delete Confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Hardware Record"
        message={`Produk "${deleteTarget?.name}" akan dipindahkan ke Recycle Bin. Dapat dipulihkan dari halaman Profile.`}
        confirmLabel="Hapus (ke Recycle Bin)"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            setDeleting(true)
            await gunService.softDeleteGun(deleteTarget.id)
            queryCache.invalidate('guns')
            setDeleteTarget(null)
            handleBackToList()
            setTab('Catalog')
          } catch (err) {
            alert(err.message || 'Failed to delete record.')
          } finally {
            setDeleting(false)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App
