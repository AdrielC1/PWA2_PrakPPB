import { useState, useEffect, useCallback } from 'react'
import reviewService from '../services/reviewService'
import { getUserIdentifier } from '../services/userService'

const getVoteStorageKey = (userId) => `bore_barrel_votes_${userId}`

const readUserVotes = (userId) => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(getVoteStorageKey(userId))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const saveUserVotes = (userId, votes) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getVoteStorageKey(userId), JSON.stringify(votes))
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// useReviews — fetch reviews for a specific product with Voting support.
// ---------------------------------------------------------------------------

export function useReviews(gunId) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currentUserId = getUserIdentifier()

  const fetchReviews = useCallback(async () => {
    if (!gunId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      const response = await reviewService.getReviews(gunId)

      if (response.success) {
        const userVotes = readUserVotes(currentUserId)
        const enriched = (response.data || []).map((rev) => {
          const userVote = userVotes[rev.id] || null
          return {
            ...rev,
            userVote,
          }
        })
        setReviews(enriched)
      } else {
        setError(response.message || 'Failed to fetch reviews.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching reviews.')
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [gunId, currentUserId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  /**
   * Vote handler for Thumbs Up / Thumbs Down.
   */
  const handleVote = async (reviewId, direction) => {
    const userVotes = readUserVotes(currentUserId)
    const currentVote = userVotes[reviewId] || null

    let newVote = direction
    let upDelta = 0
    let downDelta = 0

    if (currentVote === direction) {
      // Toggle off
      newVote = null
      if (direction === 'up') upDelta = -1
      if (direction === 'down') downDelta = -1
    } else if (currentVote === 'up' && direction === 'down') {
      // Switch up -> down
      upDelta = -1
      downDelta = 1
    } else if (currentVote === 'down' && direction === 'up') {
      // Switch down -> up
      upDelta = 1
      downDelta = -1
    } else {
      // New vote
      if (direction === 'up') upDelta = 1
      if (direction === 'down') downDelta = 1
    }

    // Update local state optimistically
    if (newVote) {
      userVotes[reviewId] = newVote
    } else {
      delete userVotes[reviewId]
    }
    saveUserVotes(currentUserId, userVotes)

    let finalUpvotes = 0
    let finalDownvotes = 0

    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === reviewId) {
          finalUpvotes = Math.max(0, (r.upvotes || 0) + upDelta)
          finalDownvotes = Math.max(0, (r.downvotes || 0) + downDelta)
          return {
            ...r,
            upvotes: finalUpvotes,
            downvotes: finalDownvotes,
            userVote: newVote,
          }
        }
        return r
      })
    )

    // Sync with backend
    try {
      await reviewService.voteReview(reviewId, {
        upvotes: finalUpvotes,
        downvotes: finalDownvotes,
      })
    } catch (err) {
      console.warn('Failed to sync vote with server:', err)
    }
  }

  return { reviews, loading, error, refetch: fetchReviews, handleVote }
}

// ---------------------------------------------------------------------------
// useCreateReview — submit a new review for a product.
// ---------------------------------------------------------------------------

export function useCreateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const createReview = async (gunId, reviewData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await reviewService.createReview(gunId, reviewData)

      if (response.success) {
        setSuccess(true)
        return response.data
      } else {
        setError(response.message || 'Failed to submit review.')
        return null
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createReview, loading, error, success }
}

// ---------------------------------------------------------------------------
// useUpdateReview — update an existing review.
// ---------------------------------------------------------------------------

export function useUpdateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const updateReview = async (reviewId, reviewData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await reviewService.updateReview(reviewId, reviewData)
      if (response.success) {
        return response.data
      }
      throw new Error(response.message || 'Failed to update review.')
    } catch (err) {
      setError(err.message || 'Error updating review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { updateReview, loading, error }
}

// ---------------------------------------------------------------------------
// useDeleteReview — delete an existing review.
// ---------------------------------------------------------------------------

export function useDeleteReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const deleteReview = async (reviewId) => {
    try {
      setLoading(true)
      setError(null)

      const response = await reviewService.deleteReview(reviewId)
      if (response.success) {
        return true
      }
      throw new Error(response.message || 'Failed to delete review.')
    } catch (err) {
      setError(err.message || 'Error deleting review.')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { deleteReview, loading, error }
}
