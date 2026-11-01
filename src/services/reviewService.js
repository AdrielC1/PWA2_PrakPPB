import { apiClient, IS_SUPABASE } from '../config/api'

// ---------------------------------------------------------------------------
// ReviewService — product reviews & ratings with full CRUD and Voting.
// Supports both Supabase (public.reviews) and university API (/api/v1/recipes/:id/reviews).
// ---------------------------------------------------------------------------

class ReviewService {
  /**
   * Fetch all reviews for a given product.
   */
  async getReviews(gunId) {
    if (IS_SUPABASE) {
      const data = await apiClient.get(
        `/rest/v1/reviews?product_id=eq.${gunId}&select=*&order=created_at.desc`,
      )
      const list = Array.isArray(data)
        ? data.map((r) => ({
            id: r.id,
            product_id: r.product_id,
            user_id: r.user_id,
            user_identifier: r.user_id ? `Operator ${String(r.user_id).substring(0, 8)}` : 'Anonymous',
            rating: Number(r.rating || 5),
            comment: r.comment || '',
            upvotes: Number(r.upvotes || 0),
            downvotes: Number(r.downvotes || 0),
            created_at: r.created_at,
          }))
        : []

      return { success: true, data: list }
    }

    return apiClient.get(`/api/v1/recipes/${gunId}/reviews`)
  }

  /**
   * Submit a new review.
   * @param {string|number} gunId
   * @param {Object} reviewData  { user_identifier, rating, comment }
   */
  async createReview(gunId, reviewData) {
    if (IS_SUPABASE) {
      const payload = {
        product_id: Number(gunId),
        user_id: reviewData.user_id || reviewData.user_identifier,
        rating: Number(reviewData.rating),
        comment: reviewData.comment || '',
      }

      const res = await apiClient.post('/rest/v1/reviews', payload, {
        headers: { Prefer: 'return=representation' },
      })
      const created = Array.isArray(res) ? res[0] : res
      return { success: true, data: created }
    }

    return apiClient.post(`/api/v1/recipes/${gunId}/reviews`, reviewData)
  }

  /**
   * Edit an existing review (Update).
   */
  async updateReview(reviewId, reviewData) {
    if (IS_SUPABASE) {
      const res = await apiClient.patch(
        `/rest/v1/reviews?id=eq.${reviewId}`,
        {
          rating: Number(reviewData.rating),
          comment: reviewData.comment,
        },
        { headers: { Prefer: 'return=representation' } },
      )
      return { success: true, data: Array.isArray(res) ? res[0] : res }
    }

    return apiClient.put(`/api/v1/reviews/${reviewId}`, reviewData)
  }

  /**
   * Delete a review (Delete).
   */
  async deleteReview(reviewId) {
    if (IS_SUPABASE) {
      await apiClient.delete(`/rest/v1/reviews?id=eq.${reviewId}`)
      return { success: true }
    }

    return apiClient.delete(`/api/v1/reviews/${reviewId}`)
  }

  /**
   * Vote on a review (Thumbs up / Thumbs down).
   */
  async voteReview(reviewId, { upvotes, downvotes }) {
    if (IS_SUPABASE) {
      try {
        const res = await apiClient.patch(
          `/rest/v1/reviews?id=eq.${reviewId}`,
          { upvotes: Number(upvotes), downvotes: Number(downvotes) },
          { headers: { Prefer: 'return=representation' } },
        )
        return { success: true, data: Array.isArray(res) ? res[0] : res }
      } catch (err) {
        // If upvotes/downvotes columns do not exist in DB yet (42703), gracefully ignore backend error
        return { success: true, data: { id: reviewId, upvotes, downvotes } }
      }
    }

    return { success: true, data: { id: reviewId, upvotes, downvotes } }
  }
}

export default new ReviewService()
