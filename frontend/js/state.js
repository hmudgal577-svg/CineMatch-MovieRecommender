// ============================================================
// AUTH & STATE MANAGER - CineMatch (Full-Stack FastAPI Edition)
// ============================================================

const API_BASE = `${window.location.origin}/api`;

class AppState {
  constructor() {
    this._movies = [];
    this.currentUser = null;
    this.theme = localStorage.getItem('cinematch_theme') || 'dark';
    this._applyTheme();

    // On-demand caches for reviews and average ratings
    this._reviewsCache = {};
    this._avgRatingCache = {};

    // Admin dashboard caches
    this._adminStats = null;
    this._adminUsers = [];
    this._adminReviews = [];

    // Trigger bootstrap sequence
    this.bootstrapped = this.bootstrap();
  }

  async bootstrap() {
    try {
      // 1. Fetch movies from backend
      const res = await fetch(`${API_BASE}/movies`);
      if (!res.ok) throw new Error("Failed to load movies from backend");
      this._movies = await res.json();
      window.MOVIES_DB = this._movies;

      // 2. Initialize Recommendation Engine with live movies list
      window.engine = new RecommendationEngine(this._movies);

      // 3. Restore User Session
      const uid = localStorage.getItem('cinematch_session');
      if (uid) {
        const userRes = await fetch(`${API_BASE}/auth/me/${uid}`);
        if (userRes.ok) {
          this.currentUser = await userRes.json();
        } else {
          // Session expired or invalid
          localStorage.removeItem('cinematch_session');
        }
      }

      // 4. Preload Admin Data if user is admin
      if (this.currentUser?.role === 'admin') {
        await this.refreshAdminData();
      }

      // Hide page loader in index.html once bootstrap is done
      const loader = document.getElementById('page-loader');
      if (loader) {
        loader.classList.add('hidden');
      }

      return true;
    } catch (e) {
      console.error("Bootstrap failed:", e);
      // Fallback: hide loader anyway so app isn't stuck
      const loader = document.getElementById('page-loader');
      if (loader) loader.classList.add('hidden');
      return false;
    }
  }

  getMovies() {
    return this._movies;
  }

  getUsers() {
    return this._adminUsers;
  }

  getGlobalFeedback() {
    return this._adminReviews;
  }

  // AUTH
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || 'Invalid username or password' };
    }

    this.currentUser = data.user;
    localStorage.setItem('cinematch_session', this.currentUser.id);

    if (this.currentUser.role === 'admin') {
      await this.refreshAdminData();
    }

    return { success: true, user: this.currentUser };
  }

  async register(username, password, name) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, name })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || 'Registration failed' };
    }

    this.currentUser = data.user;
    localStorage.setItem('cinematch_session', this.currentUser.id);

    return { success: true, user: this.currentUser };
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('cinematch_session');
    this._adminStats = null;
    this._adminUsers = [];
    this._adminReviews = [];
  }

  // USER DATAPERSISTENCE
  async rateMovie(movieId, rating) {
    if (!this.currentUser) return;
    const res = await fetch(`${API_BASE}/movies/${movieId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: this.currentUser.id, rating })
    });

    if (res.ok) {
      const data = await res.json();
      this.currentUser.ratings = data.ratings;
      
      // Update local rating average cache
      await this.getMovieReviewsAndAverage(movieId);
    }
  }

  async toggleWatchlist(movieId) {
    if (!this.currentUser) return [];
    const res = await fetch(`${API_BASE}/movies/${movieId}/watchlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: this.currentUser.id })
    });

    if (res.ok) {
      const data = await res.json();
      this.currentUser.watchlist = data.watchlist;
      return this.currentUser.watchlist;
    }
    return this.currentUser?.watchlist || [];
  }

  isInWatchlist(movieId) {
    return this.currentUser?.watchlist?.includes(movieId) || false;
  }

  getUserRating(movieId) {
    return this.currentUser?.ratings?.[movieId] || 0;
  }

  // REVIEWS & FEEDBACK
  async getMovieReviewsAndAverage(movieId) {
    try {
      const revRes = await fetch(`${API_BASE}/movies/${movieId}/reviews`);
      const reviews = revRes.ok ? await revRes.json() : [];

      const avgRes = await fetch(`${API_BASE}/movies/${movieId}/average-rating`);
      const avgData = avgRes.ok ? await avgRes.json() : { average: null };

      this._reviewsCache[movieId] = reviews;
      this._avgRatingCache[movieId] = avgData.average;

      return { reviews, avgRating: avgData.average };
    } catch (e) {
      console.error(`Failed to fetch feedback for movie ${movieId}:`, e);
      return { reviews: [], avgRating: null };
    }
  }

  getMovieFeedback(movieId) {
    return this._reviewsCache[movieId] || [];
  }

  getAverageRating(movieId) {
    return this._avgRatingCache[movieId] || null;
  }

  async submitFeedback(movieId, text, rating) {
    if (!this.currentUser) return null;

    const res = await fetch(`${API_BASE}/movies/${movieId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: this.currentUser.id,
        username: this.currentUser.name,
        text,
        rating
      })
    });

    if (res.ok) {
      const data = await res.json();
      const newReview = data.review;

      // Append to reviews cache
      if (!this._reviewsCache[movieId]) this._reviewsCache[movieId] = [];
      this._reviewsCache[movieId].push(newReview);

      // Refresh average rating
      await this.getMovieReviewsAndAverage(movieId);

      return newReview;
    }
    return null;
  }

  // ADMIN PERSISTENCE
  async refreshAdminData() {
    try {
      const statsRes = await fetch(`${API_BASE}/admin/stats`);
      if (statsRes.ok) this._adminStats = await statsRes.json();

      const usersRes = await fetch(`${API_BASE}/admin/users`);
      if (usersRes.ok) this._adminUsers = await usersRes.json();

      const reviewsRes = await fetch(`${API_BASE}/admin/reviews`);
      if (reviewsRes.ok) this._adminReviews = await reviewsRes.json();
    } catch (e) {
      console.error("Failed to load admin panel data:", e);
    }
  }

  getAdminStats() {
    return this._adminStats;
  }

  async addMovie(movieData) {
    const res = await fetch(`${API_BASE}/movies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(movieData)
    });

    if (res.ok) {
      // Refresh local movies collection
      const movieRes = await fetch(`${API_BASE}/movies`);
      if (movieRes.ok) {
        this._movies = await movieRes.json();
        window.MOVIES_DB = this._movies;
        window.engine = new RecommendationEngine(this._movies);
      }
      return await res.json();
    }
    return null;
  }

  async deleteMovie(movieId) {
    const res = await fetch(`${API_BASE}/movies/${movieId}`, {
      method: "DELETE"
    });

    if (res.ok) {
      // Refresh local movies collection
      const movieRes = await fetch(`${API_BASE}/movies`);
      if (movieRes.ok) {
        this._movies = await movieRes.json();
        window.MOVIES_DB = this._movies;
        window.engine = new RecommendationEngine(this._movies);
      }
    }
  }

  // TMDB ENHANCEMENTS
  async getTmdbConfig() {
    try {
      const res = await fetch(`${API_BASE}/admin/config/tmdb`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error("Failed to get TMDB config:", e);
    }
    return { api_key: "" };
  }

  async saveTmdbConfig(apiKey) {
    try {
      const res = await fetch(`${API_BASE}/admin/config/tmdb`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error("Failed to save TMDB config:", e);
    }
    return { success: false };
  }

  async isTmdbConfigured() {
    try {
      const res = await fetch(`${API_BASE}/tmdb/status`);
      if (res.ok) {
        const data = await res.json();
        return data.configured;
      }
    } catch (e) {
      console.error("Failed to check TMDB status:", e);
    }
    return false;
  }

  async searchTmdb(query, page = 1) {
    try {
      const res = await fetch(`${API_BASE}/tmdb/search?query=${encodeURIComponent(query)}&page=${page}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error("Failed to search TMDB:", e);
    }
    return { results: [], total_results: 0 };
  }

  async getTrendingTmdb(page = 1) {
    try {
      const res = await fetch(`${API_BASE}/tmdb/trending?page=${page}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error("Failed to fetch trending from TMDB:", e);
    }
    return { results: [] };
  }

  async importTmdbMovie(tmdbId) {
    try {
      const res = await fetch(`${API_BASE}/tmdb/import/${tmdbId}`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        // Refresh local movies collection
        const movieRes = await fetch(`${API_BASE}/movies`);
        if (movieRes.ok) {
          this._movies = await movieRes.json();
          window.MOVIES_DB = this._movies;
          window.engine = new RecommendationEngine(this._movies);
        }
        return { success: true, movie: data.movie };
      }
      return { success: false, error: data.detail || "Import failed" };
    } catch (e) {
      console.error("Failed to import TMDB movie:", e);
      return { success: false, error: "Network or server error" };
    }
  }

  async getTmdbMovieVideos(tmdbId) {
    try {
      const res = await fetch(`${API_BASE}/tmdb/movie/${tmdbId}/videos`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error("Failed to get TMDB videos:", e);
    }
    return [];
  }

  // THEME
  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('cinematch_theme', this.theme);
    this._applyTheme();
    return this.theme;
  }

  _applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }
}

// Global state
window.appState = new AppState();
