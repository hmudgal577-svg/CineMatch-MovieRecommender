// ============================================================
// UI RENDERER — CineMatch
// ============================================================

// ── Utility: Toast Notifications ──
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Utility: Render Stars ──
function renderStars(rating, interactive = false, movieId = null, size = '') {
  const stars = [1,2,3,4,5];
  const filled = Math.round(rating);
  let html = `<div class="star-rating ${size ? 'star-rating-' + size : ''}" ${interactive ? `data-movie-id="${movieId}"` : ''}>`;
  stars.forEach(s => {
    html += `<span class="star ${s <= filled ? 'active' : ''}" 
      ${interactive ? `data-val="${s}" onclick="handleStarClick(this, ${movieId}, ${s})" onmouseenter="hoverStars(this)" onmouseleave="resetStarHover(this)"` : ''}
    >★</span>`;
  });
  html += '</div>';
  return html;
}

function hoverStars(el) {
  const val = parseInt(el.dataset.val);
  const container = el.parentElement;
  container.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('hover', parseInt(s.dataset.val) <= val);
  });
}
function resetStarHover(el) {
  const container = el.parentElement;
  const rated = parseInt(container.dataset.movieId);
  const userRating = appState.getUserRating(rated);
  container.querySelectorAll('.star').forEach(s => {
    s.classList.remove('hover');
    s.classList.toggle('active', parseInt(s.dataset.val) <= userRating);
  });
}
function handleStarClick(el, movieId, val) {
  if (!appState.currentUser) { openAuthModal(); showToast('Login to rate movies', 'info'); return; }
  appState.rateMovie(movieId, val).then(() => {
    el.parentElement.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.val) <= val);
    });
    showToast(`Rated ${val}/5 ★`, 'success');
    if (document.getElementById('movie-detail-modal').classList.contains('active')) {
      openMovieDetail(movieId);
    }
  });
}

// ── Utility: Watchlist Toggle ──
function toggleWatchlist(e, movieId) {
  e.stopPropagation();
  if (!appState.currentUser) { openAuthModal(); showToast('Login to save to watchlist', 'info'); return; }
  appState.toggleWatchlist(movieId).then(wl => {
    const inWl = wl.includes(movieId);
    document.querySelectorAll(`.card-watchlist[data-id="${movieId}"]`).forEach(btn => {
      btn.classList.toggle('active', inWl);
      btn.innerHTML = inWl ? '🔖' : '＋';
      btn.title = inWl ? 'Remove from watchlist' : 'Add to watchlist';
    });
    showToast(inWl ? 'Added to watchlist' : 'Removed from watchlist', 'success');
    if (document.getElementById('page-watchlist').classList.contains('active')) {
      renderWatchlistPage();
    }
  });
}

// ── Movie Card Builder ──
function buildMovieCard(movie, badge = null) {
  const inWl = appState.isInWatchlist(movie.id);
  return `
    <div class="movie-card" onclick="openMovieDetail(${movie.id})" data-id="${movie.id}">
      ${badge ? `<div class="card-badge">${badge}</div>` : ''}
      <button class="card-watchlist ${inWl ? 'active' : ''}" data-id="${movie.id}"
        title="${inWl ? 'Remove from watchlist' : 'Add to watchlist'}"
        onclick="toggleWatchlist(event, ${movie.id})">
        ${inWl ? '🔖' : '＋'}
      </button>
      <img class="card-poster" src="${movie.poster}" alt="${movie.title}" 
           onerror="this.src='https://via.placeholder.com/300x450/1a1a2e/e94560?text=${encodeURIComponent(movie.title)}'">
      <div class="card-overlay">
        <div class="card-play">▶</div>
      </div>
      <div class="card-info">
        <div class="card-title">${movie.title}</div>
        <div class="card-meta">
          <span>${movie.year}</span>
          <div class="card-rating">★ ${movie.rating}</div>
        </div>
      </div>
    </div>`;
}

// ── Movie Row Builder ──
function buildMovieRow(movies, badge = null) {
  if (!movies.length) return '<div class="empty-state"><div class="empty-state-icon">🎬</div><div class="empty-state-title">No movies found</div></div>';
  return `<div class="movies-row">${movies.map(m => buildMovieCard(m, badge)).join('')}</div>`;
}

function buildMovieGrid(movies) {
  if (!movies.length) return '<div class="empty-state"><div class="empty-state-icon">🎬</div><div class="empty-state-title">No movies found</div></div>';
  return `<div class="movies-grid">${movies.map(m => buildMovieCard(m)).join('')}</div>`;
}

// ── PAGES ──

// HOME PAGE
function renderHomePage() {
  const allMovies = appState.getMovies();
  const eng = window.engine;

  // Hero
  const trending = eng.getTrending(1)[0];
  document.getElementById('hero-bg').style.backgroundImage = `url(${trending.poster})`;
  document.getElementById('hero-badge').textContent = '🔥 Trending Now';
  document.getElementById('hero-title').textContent = trending.title;
  document.getElementById('hero-year').textContent = trending.year;
  document.getElementById('hero-genre').textContent = trending.genres.join(' · ');
  document.getElementById('hero-rating').textContent = `★ ${trending.rating}`;
  document.getElementById('hero-desc').textContent = trending.description;
  document.getElementById('hero-watch-btn').onclick = () => openMovieDetail(trending.id);
  document.getElementById('hero-wl-btn').onclick = (e) => toggleWatchlist(e, trending.id);

  // Personalized (or trending)
  const user = appState.currentUser;
  const personalized = user && user.watchlist.length
    ? eng.getPersonalized(user.watchlist, user.ratings, 8)
    : eng.getTrending(8);
  document.getElementById('section-personalized-title').innerHTML =
    user && user.watchlist.length ? 'Recommended <span>For You</span>' : 'Trending <span>Now</span>';
  document.getElementById('section-personalized').innerHTML = buildMovieRow(personalized);

  // Top Rated
  document.getElementById('section-toprated').innerHTML = buildMovieRow(eng.getTopRated(8), '⭐ Top');

  // Genre sections
  const genreSections = [
    { genre: 'Action', id: 'section-action' },
    { genre: 'Sci-Fi', id: 'section-scifi' },
    { genre: 'Drama', id: 'section-drama' },
  ];
  genreSections.forEach(({ genre, id }) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = buildMovieRow(eng.getByGenre(genre, null, 8));
  });
}

// BROWSE PAGE
let browseCurrentGenre = 'All';
let browseSort = 'popularity';

function renderBrowsePage() {
  filterAndRenderBrowse();
}

function filterAndRenderBrowse() {
  let movies = appState.getMovies();
  const q = document.getElementById('browse-search')?.value?.toLowerCase() || '';
  if (q) movies = window.engine.search(q);
  if (browseCurrentGenre !== 'All') {
    movies = movies.filter(m => m.genres.includes(browseCurrentGenre));
  }
  const lang = document.getElementById('filter-lang')?.value;
  if (lang && lang !== 'all') movies = movies.filter(m => m.language.toLowerCase() === lang);
  const yr = document.getElementById('filter-year')?.value;
  if (yr && yr !== 'all') {
    const [from, to] = yr.split('-').map(Number);
    movies = movies.filter(m => m.year >= from && m.year <= (to || 9999));
  }
  // Sort
  if (browseSort === 'rating') movies = [...movies].sort((a, b) => b.rating - a.rating);
  else if (browseSort === 'year') movies = [...movies].sort((a, b) => b.year - a.year);
  else if (browseSort === 'title') movies = [...movies].sort((a, b) => a.title.localeCompare(b.title));
  else movies = [...movies].sort((a, b) => b.popularity - a.popularity);

  document.getElementById('browse-grid').innerHTML = buildMovieGrid(movies);
  document.getElementById('browse-count').textContent = `${movies.length} movies`;
}

function setBrowseGenre(genre, el) {
  browseCurrentGenre = genre;
  document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  filterAndRenderBrowse();
}

// WATCHLIST PAGE
function renderWatchlistPage() {
  const container = document.getElementById('watchlist-container');
  if (!appState.currentUser) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🔐</div>
      <div class="empty-state-title">Login to see your watchlist</div>
      <div class="empty-state-desc">Save movies you want to watch later</div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="openAuthModal()">Login</button>
    </div>`;
    return;
  }
  const wl = appState.currentUser.watchlist;
  if (!wl.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-title">Your watchlist is empty</div>
      <div class="empty-state-desc">Browse movies and add them to your watchlist</div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="navigateTo('browse')">Browse Movies</button>
    </div>`;
    return;
  }
  const movies = appState.getMovies().filter(m => wl.includes(m.id));
  container.innerHTML = `<div class="watchlist-grid">${movies.map(m => `
    <div class="watchlist-card" onclick="openMovieDetail(${m.id})">
      <img src="${m.poster}" alt="${m.title}" onerror="this.src='https://via.placeholder.com/60x90/1a1a2e/e94560?text=?'">
      <div class="watchlist-info">
        <div class="watchlist-title">${m.title}</div>
        <div class="watchlist-meta">${m.year} · ${m.genres[0]}</div>
        ${renderStars(appState.getUserRating(m.id), true, m.id, 'sm')}
      </div>
      <button class="card-watchlist active" data-id="${m.id}" onclick="toggleWatchlist(event,${m.id});renderWatchlistPage();" style="position:static;border-radius:8px;width:32px;height:32px;margin-left:auto">🗑️</button>
    </div>`).join('')}</div>`;
}

// PROFILE PAGE
function renderProfilePage() {
  const user = appState.currentUser;
  if (!user) {
    document.getElementById('profile-content').innerHTML = `<div class="empty-state" style="padding:80px 20px">
      <div class="empty-state-icon">👤</div>
      <div class="empty-state-title">Please login to view your profile</div>
      <button class="btn btn-primary" style="margin-top:16px" onclick="openAuthModal()">Login</button>
    </div>`;
    return;
  }
  const movies = appState.getMovies();
  const ratedMovies = Object.entries(user.ratings || {}).map(([id, r]) => ({
    movie: movies.find(m => m.id === parseInt(id)),
    rating: r
  })).filter(x => x.movie);

  document.getElementById('profile-content').innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${user.avatar}</div>
      <div>
        <div class="profile-name">${user.name}</div>
        <span class="profile-role role-${user.role}">${user.role}</span>
        <div style="font-size:0.8rem;color:var(--text3);margin-top:6px">@${user.username} · Joined ${user.joinDate}</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:10px;flex-wrap:wrap">
        ${user.role === 'admin' ? `<button class="btn btn-outline btn-sm" onclick="navigateTo('admin')">⚙️ Admin Panel</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="appState.logout();updateNavState();renderHomePage();navigateTo('home');showToast('Logged out','info')">Logout</button>
      </div>
    </div>
    <div class="section">
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-card"><div class="stat-value">${user.watchlist.length}</div><div class="stat-label">Watchlist</div></div>
        <div class="stat-card"><div class="stat-value">${Object.keys(user.ratings||{}).length}</div><div class="stat-label">Rated</div></div>
        <div class="stat-card"><div class="stat-value">${ratedMovies.reduce((s,x)=>s+x.rating,0)||0}</div><div class="stat-label">Total Stars</div></div>
      </div>
      ${ratedMovies.length ? `
        <div class="section-header"><div class="section-title">Your <span>Ratings</span></div></div>
        <div class="watchlist-grid">${ratedMovies.map(({movie,rating}) => `
          <div class="watchlist-card" onclick="openMovieDetail(${movie.id})">
            <img src="${movie.poster}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/60x90/1a1a2e/e94560?text=?'">
            <div class="watchlist-info">
              <div class="watchlist-title">${movie.title}</div>
              <div class="watchlist-meta">${movie.year}</div>
              ${renderStars(rating, false, movie.id, 'xs')}
            </div>
          </div>`).join('')}
        </div>` : ''}
    </div>`;
}

// ADMIN PAGE
function renderAdminPage() {
  if (!appState.currentUser || appState.currentUser.role !== 'admin') {
    document.getElementById('admin-content').innerHTML = `<div class="empty-state" style="padding:80px 20px">
      <div class="empty-state-icon">🔒</div>
      <div class="empty-state-title">Admin access required</div>
    </div>`;
    return;
  }
  renderAdminTab('stats');
}

function renderAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const movies = appState.getMovies();
  const users = appState.getUsers();
  const feedback = appState.getGlobalFeedback();
  const el = document.getElementById('admin-content');

  if (tab === 'stats') {
    el.innerHTML = `
      <!-- TMDB API Dynamic Configuration -->
      <div class="admin-card">
        <div class="admin-card-title">🔌 TMDB API Dynamic Connection</div>
        <div class="config-container">
          <div style="flex: 1;">
            <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 4px; color: var(--text);">Dynamic API Integration Status</div>
            <div style="font-size: 0.8rem; color: var(--text3);">Provide your personal TMDB API Key to enable real-time imports, live metadata lookups, and trailer links.</div>
          </div>
          <div id="tmdb-status-badge-container">
            <span class="config-status-badge config-status-unconfigured" id="tmdb-status-badge">Unconfigured</span>
          </div>
        </div>
        <div style="display: flex; gap: 12px; margin-top: 12px;">
          <input type="password" id="tmdb-config-key" class="filter-select" style="flex: 1; border-radius: var(--radius); padding: 10px 14px; min-width: 0;" placeholder="Enter your TMDB API Key (v3 auth)...">
          <button class="btn btn-primary" onclick="saveTmdbKey()">💾 Save Key</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${movies.length}</div><div class="stat-label">Total Movies</div></div>
        <div class="stat-card"><div class="stat-value">${users.length}</div><div class="stat-label">Users</div></div>
        <div class="stat-card"><div class="stat-value">${feedback.length}</div><div class="stat-label">Reviews</div></div>
        <div class="stat-card"><div class="stat-value">${movies.length ? (movies.reduce((s,m)=>s+m.rating,0)/movies.length).toFixed(1) : '0.0'}</div><div class="stat-label">Avg Rating</div></div>
      </div>

      <!-- Charts Container Grid -->
      <div class="charts-container-grid">
        <div class="chart-card">
          <div class="admin-card-title" style="margin-bottom: 12px;">Genre Distribution</div>
          <div class="chart-wrapper">
            <canvas id="genreDistributionChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <div class="admin-card-title" style="margin-bottom: 12px;">Reviews Rating Distribution</div>
          <div class="chart-wrapper">
            <canvas id="ratingDistributionChart"></canvas>
          </div>
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-card-title">Recent Reviews</div>
        ${feedback.slice(-5).reverse().map(f => `
          <div style="border-bottom:1px solid var(--border);padding:10px 0;font-size:0.85rem">
            <strong>${f.username}</strong> on <em>${movies.find(m=>m.id===f.movieId)?.title||'Unknown'}</em>
            <span style="float:right;color:var(--accent2)">★${f.rating||'-'}</span>
            <div style="color:var(--text2);margin-top:4px">${f.text}</div>
          </div>`).join('') || '<div style="color:var(--text3)">No reviews yet</div>'}
      </div>`;

      // Fetch dynamic configuration
      appState.getTmdbConfig().then(config => {
        const keyInput = document.getElementById('tmdb-config-key');
        if (keyInput) keyInput.value = config.api_key || '';
        const badge = document.getElementById('tmdb-status-badge');
        if (badge) {
          const hasKey = !!config.api_key;
          badge.textContent = hasKey ? 'Connected' : 'Unconfigured';
          badge.className = `config-status-badge ${hasKey ? 'config-status-connected' : 'config-status-unconfigured'}`;
        }
      });

      // Initialize the charts
      setTimeout(initDashboardCharts, 50);
  }

  if (tab === 'movies') {
    el.innerHTML = `
      <!-- Real-Time TMDB Search & Import -->
      <div class="admin-card">
        <div class="admin-card-title">🔍 Real-Time TMDB Movie Search & Import</div>
        <div style="font-size: 0.8rem; color: var(--text3); margin-bottom: 12px;">Search from TMDB's library of 1M+ movies and instantly import them into CineMatch.</div>
        <div class="tmdb-search-box">
          <input type="text" id="tmdb-search-input" placeholder="Search any movie on TMDB (e.g. Tenet, Avatar, Oppenheimer)..." onkeypress="if(event.key==='Enter')searchTmdbMovies()">
          <button class="btn btn-primary" onclick="searchTmdbMovies()">Search TMDB</button>
        </div>
        <div id="tmdb-search-results" class="tmdb-grid">
          <div style="grid-column: 1/-1; text-align: center; color: var(--text3); font-size: 0.85rem; padding: 20px;">Enter search term and press Search TMDB.</div>
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-card-title">Add New Movie Manually</div>
        <div class="admin-form-grid">
          <div class="form-group"><label>Title *</label><input id="add-title" placeholder="Movie title"></div>
          <div class="form-group"><label>Year *</label><input id="add-year" type="number" placeholder="2024" min="1900" max="2030"></div>
          <div class="form-group"><label>IMDb Rating</label><input id="add-rating" type="number" step="0.1" min="0" max="10" placeholder="7.5"></div>
          <div class="form-group"><label>Director *</label><input id="add-director" placeholder="Director name"></div>
          <div class="form-group admin-form-full"><label>Genres (comma-separated) *</label><input id="add-genres" placeholder="Action, Drama, Sci-Fi"></div>
          <div class="form-group admin-form-full"><label>Cast (comma-separated)</label><input id="add-cast" placeholder="Actor 1, Actor 2, Actor 3"></div>
          <div class="form-group admin-form-full"><label>Tags (comma-separated)</label><input id="add-tags" placeholder="action, epic, twist"></div>
          <div class="form-group admin-form-full"><label>Description</label><textarea id="add-desc" style="width:100%;background:var(--input-bg);border:1px solid var(--border);border-radius:var(--radius);padding:10px;color:var(--text);font-size:0.88rem;resize:vertical;min-height:80px;outline:none" placeholder="Movie description..."></textarea></div>
          <div class="form-group"><label>Language</label><input id="add-lang" placeholder="English"></div>
          <div class="form-group"><label>Poster URL</label><input id="add-poster" placeholder="https://..."></div>
        </div>
        <button class="btn btn-primary" style="margin-top:12px" onclick="adminAddMovie()">➕ Add Movie</button>
      </div>
      <div class="admin-card">
        <div class="admin-card-title">All Movies (${movies.length})</div>
        <div style="overflow-x:auto">
          <table class="movies-table">
            <thead><tr><th>Poster</th><th>Title</th><th>Year</th><th>Director</th><th>Rating</th><th>Genres</th><th>Action</th></tr></thead>
            <tbody>${movies.map(m => `
              <tr>
                <td><img src="${m.poster}" alt="${m.title}" onerror="this.src='https://via.placeholder.com/36x54/1a1a2e/e94560?text=?'"></td>
                <td><strong>${m.title}</strong></td>
                <td>${m.year}</td>
                <td>${m.director}</td>
                <td>⭐ ${m.rating}</td>
                <td>${m.genres.map(g=>`<span style="font-size:0.72rem;padding:2px 6px;background:var(--surface);border-radius:99px;margin:2px;display:inline-block">${g}</span>`).join('')}</td>
                <td><button class="btn btn-danger btn-sm" onclick="adminDeleteMovie(${m.id})">🗑️</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  if (tab === 'users') {
    el.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-title">All Users (${users.length})</div>
        <table class="movies-table">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Joined</th><th>Watchlist</th><th>Ratings</th></tr></thead>
          <tbody>${users.map(u => `
            <tr>
              <td><strong>${u.name}</strong></td>
              <td>@${u.username}</td>
              <td><span class="profile-role role-${u.role}" style="font-size:0.7rem">${u.role}</span></td>
              <td>${u.joinDate}</td>
              <td>${(u.watchlist||[]).length}</td>
              <td>${Object.keys(u.ratings||{}).length}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  if (tab === 'feedback') {
    el.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-title">All Reviews (${feedback.length})</div>
        <div class="feedback-list">${feedback.length ? feedback.map(f => `
          <div class="feedback-item">
            <div class="feedback-item-header">
              <div class="feedback-user">
                <div class="feedback-avatar">${f.username[0]}</div>
                <div><div class="feedback-username">${f.username}</div><div class="feedback-date">${f.date}</div></div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:0.82rem;color:var(--text3)">on <strong>${appState.getMovies().find(m=>m.id===f.movieId)?.title||'Unknown'}</strong></span>
                ${f.rating ? `<span style="color:var(--accent2);font-weight:700">★${f.rating}</span>` : ''}
              </div>
            </div>
            <div class="feedback-text">${f.text}</div>
          </div>`).join('') : '<div style="color:var(--text3)">No reviews yet</div>'}
        </div>
      </div>`;
  }
}

function adminAddMovie() {
  const title = document.getElementById('add-title').value.trim();
  const year = parseInt(document.getElementById('add-year').value);
  const director = document.getElementById('add-director').value.trim();
  const genres = document.getElementById('add-genres').value.split(',').map(s=>s.trim()).filter(Boolean);
  if (!title || !year || !director || !genres.length) {
    showToast('Please fill in required fields', 'error'); return;
  }
  const newMovie = {
    title, year, director, genres,
    rating: parseFloat(document.getElementById('add-rating').value) || 7.0,
    cast: document.getElementById('add-cast').value.split(',').map(s=>s.trim()).filter(Boolean),
    tags: document.getElementById('add-tags').value.split(',').map(s=>s.trim()).filter(Boolean),
    description: document.getElementById('add-desc').value.trim() || 'No description available.',
    language: document.getElementById('add-lang').value.trim() || 'English',
    poster: document.getElementById('add-poster').value.trim(),
  };
  appState.addMovie(newMovie).then(() => {
    showToast(`"${title}" added successfully!`, 'success');
    appState.refreshAdminData().then(() => {
      renderAdminTab('movies');
    });
  });
}

function adminDeleteMovie(id) {
  if (!confirm('Delete this movie?')) return;
  appState.deleteMovie(id).then(() => {
    showToast('Movie deleted', 'info');
    appState.refreshAdminData().then(() => {
      renderAdminTab('movies');
    });
  });
}

// ── MOVIE DETAIL MODAL ──
function openMovieDetail(movieId) {
  const movie = appState.getMovies().find(m => m.id === movieId);
  if (!movie) return;

  const feedbackPromise = appState.getMovieReviewsAndAverage(movieId);
  const trailerPromise = movie.tmdb_id ? appState.getTmdbMovieVideos(movie.tmdb_id) : Promise.resolve([]);

  Promise.all([feedbackPromise, trailerPromise]).then(([{ reviews, avgRating }, videos]) => {
    const eng = window.engine;
    const similar = eng.getSimilar(movieId, 5);
    const byDirector = eng.getByDirector(movie.director, movieId);
    const userRating = appState.getUserRating(movieId);
    const feedback = appState.getMovieFeedback(movieId);
    const inWl = appState.isInWatchlist(movieId);

    // Find official trailer or teaser
    const trailer = videos.find(v => v.type === 'Trailer' || v.type === 'Teaser');
    const trailerKey = trailer ? trailer.key : (videos[0] ? videos[0].key : null);

    const modal = document.getElementById('movie-detail-modal');
    const body = document.getElementById('movie-detail-body');

    body.innerHTML = `
      <div class="movie-detail-header">
        <img class="movie-detail-backdrop" src="${movie.poster}" alt="${movie.title}" 
             onerror="this.src='https://via.placeholder.com/900x300/1a1a2e/e94560?text=${encodeURIComponent(movie.title)}'">
        <div class="movie-detail-gradient"></div>
        <img class="movie-detail-poster" src="${movie.poster}" alt="${movie.title}"
             onerror="this.src='https://via.placeholder.com/100x150/1a1a2e/e94560?text=?'">
        <button class="modal-close" onclick="closeModal('movie-detail-modal')">✕</button>
      </div>
      <div class="movie-detail-body">
        <div class="detail-title">${movie.title}</div>
        <div class="detail-meta">
          <span>${movie.year}</span>
          <div class="dot"></div>
          <span>${movie.language}</span>
          <div class="dot"></div>
          <div class="detail-rating-badge">★ ${movie.rating}</div>
          ${avgRating ? `<div class="dot"></div><span style="color:var(--accent2)">User: ★ ${avgRating}</span>` : ''}
        </div>
        <div class="detail-genres">
          ${movie.genres.map(g => `<span class="detail-genre-tag" style="cursor:pointer" onclick="closeModal('movie-detail-modal');setBrowseGenreFromDetail('${g}')">${g}</span>`).join('')}
        </div>
        <p class="detail-desc">${movie.description}</p>
        <div class="detail-crew">
          <div class="crew-item"><label>Director</label><span style="cursor:pointer;color:var(--accent)" onclick="closeModal('movie-detail-modal');searchByDirector('${movie.director}')">${movie.director}</span></div>
          <div class="crew-item"><label>Language</label><span>${movie.language}</span></div>
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text3);margin-bottom:6px">Cast</div>
          <div class="detail-cast">
            ${movie.cast.map(c => `<span class="cast-chip" onclick="closeModal('movie-detail-modal');searchByCast('${c}')">${c}</span>`).join('')}
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-primary" onclick="toggleWatchlist(event,${movie.id});this.textContent=appState.isInWatchlist(${movie.id})?'✓ In Watchlist':'+ Watchlist';this.className='btn '+(appState.isInWatchlist(${movie.id})?'btn-outline':'btn-primary')">
            ${inWl ? '✓ In Watchlist' : '+ Watchlist'}
          </button>
          ${trailerKey ? `<button class="btn btn-watch-trailer" onclick="openTrailerModal('${trailerKey}')">🎬 Watch Trailer</button>` : ''}
          <button class="btn btn-outline" onclick="shareMovie(${movie.id})">Share</button>
        </div>
        
        <!-- Your Rating -->
        <div style="margin-bottom:24px">
          <div style="font-size:0.85rem;color:var(--text2);margin-bottom:8px">Your Rating:</div>
          ${renderStars(userRating, true, movie.id)}
        </div>

        <!-- Similar Movies -->
        ${similar.length ? `
          <div class="section-header"><div class="section-title">Similar <span>Movies</span></div></div>
          <div class="movies-row" style="margin-bottom:24px">
            ${similar.map(m => `<div style="flex-shrink:0">
              ${buildMovieCard({...m}, `${m.similarity}% Match`)}
            </div>`).join('')}
          </div>` : ''}
        
        <!-- By Same Director -->
        ${byDirector.length ? `
          <div class="section-header"><div class="section-title">More by <span>${movie.director.split(' ').pop()}</span></div></div>
          <div class="movies-row" style="margin-bottom:24px">
            ${byDirector.map(m => buildMovieCard(m)).join('')}
          </div>` : ''}

        <!-- Feedback Section -->
        <div class="feedback-section">
          <div class="feedback-title">Reviews <span style="color:var(--accent)">(${feedback.length})</span></div>
          ${appState.currentUser ? `
            <div class="feedback-form">
              <div style="font-size:0.85rem;color:var(--text2);margin-bottom:8px">Rate & Review:</div>
              ${renderStars(0, true, movie.id + '_fb')}
              <textarea id="feedback-text-${movie.id}" placeholder="Share your thoughts about this movie..." style="margin-top:12px"></textarea>
              <div class="feedback-form-row">
                <button class="btn btn-primary btn-sm" onclick="submitFeedback(${movie.id})">Post Review</button>
                <span class="feedback-label">Your review helps others discover great movies</span>
              </div>
            </div>` : `<div style="padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);font-size:0.88rem;color:var(--text2);margin-bottom:16px">
              <a style="color:var(--accent);cursor:pointer" onclick="closeModal('movie-detail-modal');openAuthModal()">Login</a> to write a review
            </div>`}
          <div class="feedback-list" id="feedback-list-${movie.id}">
            ${renderFeedbackList(feedback)}
          </div>
        </div>
      </div>`;

    openModal('movie-detail-modal');
  });
}

function renderFeedbackList(feedback) {
  if (!feedback.length) return `<div class="empty-state"><div class="empty-state-icon">💬</div><div class="empty-state-title">No reviews yet</div><div class="empty-state-desc">Be the first to review this movie</div></div>`;
  return feedback.slice().reverse().map(f => `
    <div class="feedback-item">
      <div class="feedback-item-header">
        <div class="feedback-user">
          <div class="feedback-avatar">${f.username[0]}</div>
          <div>
            <div class="feedback-username">${f.username}</div>
            <div class="feedback-date">${f.date}</div>
          </div>
        </div>
        ${f.rating ? `<div>${renderStars(f.rating, false, null, 'xs')}</div>` : ''}
      </div>
      <div class="feedback-text">${f.text}</div>
    </div>`).join('');
}

function submitFeedback(movieId) {
  const text = document.getElementById(`feedback-text-${movieId}`)?.value?.trim();
  if (!text) { showToast('Please write a review', 'error'); return; }
  const fbRating = parseInt(document.querySelector(`[data-movie-id="${movieId}_fb"] .star.active:last-of-type`)?.dataset?.val || 0);
  appState.submitFeedback(movieId, text, fbRating).then(fb => {
    document.getElementById(`feedback-text-${movieId}`).value = '';
    const list = document.getElementById(`feedback-list-${movieId}`);
    if (list) list.innerHTML = renderFeedbackList(appState.getMovieFeedback(movieId));
    showToast('Review posted!', 'success');
    openMovieDetail(movieId);
  });
}

function setBrowseGenreFromDetail(genre) {
  navigateTo('browse');
  browseCurrentGenre = genre;
  document.querySelectorAll('.genre-chip').forEach(c => {
    c.classList.toggle('active', c.textContent.trim() === genre);
  });
  filterAndRenderBrowse();
}

function searchByDirector(director) {
  navigateTo('browse');
  document.getElementById('browse-search').value = director;
  filterAndRenderBrowse();
}
function searchByCast(actor) {
  navigateTo('browse');
  document.getElementById('browse-search').value = actor;
  filterAndRenderBrowse();
}

function shareMovie(movieId) {
  const movie = appState.getMovies().find(m => m.id === movieId);
  if (navigator.share) {
    navigator.share({ title: movie.title, text: `Check out "${movie.title}" on CineMatch!`, url: window.location.href });
  } else {
    navigator.clipboard.writeText(`Check out "${movie.title}" on CineMatch!`).then(() => showToast('Link copied!', 'success'));
  }
}

// ── AUTH MODAL ──
let authMode = 'login';
function openAuthModal() {
  const loginUser = document.getElementById('login-username');
  const loginPass = document.getElementById('login-password');
  const regName = document.getElementById('reg-name');
  const regUser = document.getElementById('reg-username');
  const regPass = document.getElementById('reg-password');
  if (loginUser) loginUser.value = '';
  if (loginPass) loginPass.value = '';
  if (regName) regName.value = '';
  if (regUser) regUser.value = '';
  if (regPass) regPass.value = '';

  document.getElementById('auth-modal').querySelector('.modal').classList.add('auth-modal');
  openModal('auth-modal');
  setAuthTab('login');
}
function setAuthTab(tab) {
  authMode = tab;
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('auth-login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('auth-register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
}
function handleLogin() {
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  appState.login(u, p).then(res => {
    if (!res.success) { err.textContent = res.error; err.classList.add('show'); return; }
    err.classList.remove('show');
    closeModal('auth-modal');
    updateNavState();
    renderHomePage();
    showToast(`Welcome back, ${res.user.name}!`, 'success');
  }).catch(e => {
    err.textContent = e.message || 'Login failed';
    err.classList.add('show');
  });
}
function handleRegister() {
  const u = document.getElementById('reg-username').value.trim();
  const p = document.getElementById('reg-password').value;
  const n = document.getElementById('reg-name').value.trim();
  const err = document.getElementById('reg-error');
  if (!u || !p || !n) { err.textContent = 'All fields required'; err.classList.add('show'); return; }
  if (p.length < 6) { err.textContent = 'Password must be 6+ characters'; err.classList.add('show'); return; }
  appState.register(u, p, n).then(res => {
    if (!res.success) { err.textContent = res.error; err.classList.add('show'); return; }
    err.classList.remove('show');
    closeModal('auth-modal');
    updateNavState();
    renderHomePage();
    showToast(`Welcome to CineMatch, ${res.user.name}!`, 'success');
  }).catch(e => {
    err.textContent = e.message || 'Registration failed';
    err.classList.add('show');
  });
}

// ── MODAL HELPERS ──
function openModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }

// ── NAV STATE ──
function updateNavState() {
  const user = appState.currentUser;
  const loginBtn = document.getElementById('nav-login-btn');
  const avatarBtn = document.getElementById('nav-avatar-btn');
  if (user) {
    loginBtn.style.display = 'none';
    avatarBtn.style.display = 'flex';
    avatarBtn.textContent = user.avatar;
    avatarBtn.title = user.name;
  } else {
    loginBtn.style.display = 'inline-flex';
    avatarBtn.style.display = 'none';
  }
}

// ── NAVIGATION ──
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  window.scrollTo(0, 0);
  if (page === 'home') renderHomePage();
  if (page === 'browse') renderBrowsePage();
  if (page === 'watchlist') renderWatchlistPage();
  if (page === 'profile') renderProfilePage();
  if (page === 'admin' && appState.currentUser?.role === 'admin') renderAdminPage();
}

// ── SEARCH ──
function handleSearch(val) {
  const dropdown = document.getElementById('search-dropdown');
  if (!val.trim()) { dropdown.classList.remove('active'); return; }
  const results = window.engine.search(val).slice(0, 6);
  if (!results.length) { dropdown.classList.remove('active'); return; }
  dropdown.innerHTML = results.map(m => `
    <div class="search-item" onclick="dropdown.classList.remove('active');document.querySelector('.search-bar input').value='';openMovieDetail(${m.id})">
      <img src="${m.poster}" alt="${m.title}" onerror="this.src='https://via.placeholder.com/36x54'">
      <div class="search-item-info">
        <div class="search-item-title">${m.title}</div>
        <div class="search-item-meta">${m.year} · ${m.genres[0]} · ★${m.rating}</div>
      </div>
    </div>`).join('');
  dropdown.classList.add('active');
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  // Hide loader
  setTimeout(() => {
    document.getElementById('page-loader').classList.add('hidden');
  }, 1200);

  // Initial render
  updateNavState();
  renderHomePage();
  navigateTo('home');

  // Search
  const searchInput = document.querySelector('.search-bar input');
  searchInput?.addEventListener('input', e => handleSearch(e.target.value));
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-bar')) {
      document.getElementById('search-dropdown').classList.remove('active');
    }
  });

  // Modal close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        if (overlay.id === 'trailer-modal') {
          closeTrailerModal();
        } else {
          closeModal(overlay.id);
        }
      }
    });
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal-overlay.active');
      if (activeModal) {
        if (activeModal.id === 'trailer-modal') {
          closeTrailerModal();
        } else {
          closeModal(activeModal.id);
        }
      }
    }
  });
});

// ── TRAILER MODAL HELPERS ──
function openTrailerModal(key) {
  const iframe = document.getElementById('trailer-iframe');
  if (iframe) {
    iframe.src = `https://www.youtube.com/embed/${key}?autoplay=1`;
  }
  openModal('trailer-modal');
}

function closeTrailerModal() {
  const iframe = document.getElementById('trailer-iframe');
  if (iframe) {
    iframe.src = '';
  }
  closeModal('trailer-modal');
}

// ── TMDB CONFIG AND IMPORT HELPERS ──
function saveTmdbKey() {
  const keyInput = document.getElementById('tmdb-config-key');
  if (!keyInput) return;
  const apiKey = keyInput.value.trim();
  if (!apiKey) {
    showToast('Please enter a valid API key', 'error');
    return;
  }
  appState.saveTmdbConfig(apiKey).then(res => {
    if (res.success) {
      showToast('TMDB API Key saved successfully!', 'success');
      const badge = document.getElementById('tmdb-status-badge');
      if (badge) {
        badge.textContent = 'Connected';
        badge.className = 'config-status-badge config-status-connected';
      }
    } else {
      showToast('Failed to save API Key', 'error');
    }
  });
}

function searchTmdbMovies() {
  const input = document.getElementById('tmdb-search-input');
  const resultsContainer = document.getElementById('tmdb-search-results');
  if (!input || !resultsContainer) return;
  
  const query = input.value.trim();
  if (!query) {
    showToast('Please enter a search query', 'error');
    return;
  }
  
  resultsContainer.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 20px;">
      <div style="color: var(--text3); font-size: 0.85rem;">Searching TMDB...</div>
    </div>
  `;

  appState.searchTmdb(query).then(data => {
    if (!data.results || data.results.length === 0) {
      resultsContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text3); font-size: 0.85rem; padding: 20px;">
          No movies found on TMDB for "${query}". Check API key and spelling.
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = data.results.map(m => {
      const localMovies = appState.getMovies();
      const existsLocally = localMovies.some(lm => lm.tmdb_id === m.tmdb_id);

      return `
        <div class="tmdb-card" data-tmdb-id="${m.tmdb_id}">
          <img class="tmdb-card-poster" src="${m.poster}" alt="${m.title}" onerror="this.src='https://via.placeholder.com/80x120/1a1a2e/e94560?text=?'">
          <div class="tmdb-card-info">
            <div style="min-width: 0;">
              <div class="tmdb-card-title" title="${m.title}">${m.title}</div>
              <div class="tmdb-card-meta">${m.year || 'N/A'} · ★ ${m.rating}</div>
              <div class="tmdb-card-overview" title="${m.overview}">${m.overview || 'No overview available.'}</div>
            </div>
            ${existsLocally 
              ? `<button class="btn btn-outline btn-sm tmdb-import-btn" style="border-color: #22c55e; color: #22c55e;" disabled>✓ Imported</button>`
              : `<button class="btn btn-primary btn-sm tmdb-import-btn" onclick="importMovie(${m.tmdb_id}, this)">Import</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  });
}

function importMovie(tmdbId, buttonEl) {
  if (!buttonEl) return;
  buttonEl.disabled = true;
  buttonEl.textContent = 'Importing...';
  
  appState.importTmdbMovie(tmdbId).then(res => {
    if (res.success) {
      showToast(`"${res.movie.title}" successfully imported!`, 'success');
      buttonEl.textContent = '✓ Imported';
      buttonEl.className = 'btn btn-outline btn-sm tmdb-import-btn';
      buttonEl.style.borderColor = '#22c55e';
      buttonEl.style.color = '#22c55e';
      buttonEl.disabled = true;
      
      // Refresh user stats in state
      appState.refreshAdminData();
    } else {
      showToast(res.error || 'Import failed', 'error');
      buttonEl.disabled = false;
      buttonEl.textContent = 'Import';
    }
  });
}

// ── CHART.JS CONFIGURATION ──
let genreChartInstance = null;
let ratingChartInstance = null;

function initDashboardCharts() {
  const movies = appState.getMovies();
  const reviews = appState.getGlobalFeedback();

  // 1. Genre Distribution Data
  const genresCount = {};
  movies.forEach(movie => {
    movie.genres.forEach(g => {
      genresCount[g] = (genresCount[g] || 0) + 1;
    });
  });

  const genreLabels = Object.keys(genresCount);
  const genreData = Object.values(genresCount);

  // 2. Rating Distribution Data
  const ratingsCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingsCount[r.rating]++;
    }
  });

  if (reviews.length === 0) {
    movies.forEach(m => {
      const rounded = Math.round(m.rating / 2);
      if (rounded >= 1 && rounded <= 5) {
        ratingsCount[rounded]++;
      }
    });
  }

  const ratingLabels = ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'];
  const ratingData = [ratingsCount[1], ratingsCount[2], ratingsCount[3], ratingsCount[4], ratingsCount[5]];

  if (genreChartInstance) genreChartInstance.destroy();
  if (ratingChartInstance) ratingChartInstance.destroy();

  const ctxGenre = document.getElementById('genreDistributionChart');
  if (ctxGenre) {
    genreChartInstance = new Chart(ctxGenre, {
      type: 'doughnut',
      data: {
        labels: genreLabels,
        datasets: [{
          data: genreData,
          backgroundColor: [
            '#e94560', '#f5a623', '#4a90e2', '#50e3c2', '#b8e986',
            '#9013fe', '#f8e71c', '#7ed321', '#bd10e0'
          ],
          borderWidth: 1,
          borderColor: '#1a1a2e'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#fff',
              font: { size: 10 }
            }
          }
        }
      }
    });
  }

  const ctxRating = document.getElementById('ratingDistributionChart');
  if (ctxRating) {
    ratingChartInstance = new Chart(ctxRating, {
      type: 'bar',
      data: {
        labels: ratingLabels,
        datasets: [{
          label: 'Reviews',
          data: ratingData,
          backgroundColor: 'rgba(245, 166, 35, 0.75)',
          borderColor: '#f5a623',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#8e9bb0' }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: { color: '#8e9bb0', precision: 0 }
          }
        }
      }
    });
  }
}

// ── 3D INTERACTIVE TILT & GLARE EFFECT ──
document.addEventListener('mousemove', (e) => {
  const card = e.target.closest('.movie-card, .watchlist-card, .tmdb-card, .stat-card, .chart-card');
  if (!card) return;

  // Add the moving class to disable transitions and follow mouse instantly
  card.classList.add('moving');

  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const xc = rect.width / 2;
  const yc = rect.height / 2;

  // Max tilt angle: 8deg for larger panels, 12deg for standard cards
  const isLarge = card.classList.contains('chart-card') || card.classList.contains('tmdb-card');
  const maxTilt = isLarge ? 8 : 12;

  const angleX = ((yc - y) / yc) * maxTilt;
  const angleY = ((x - xc) / xc) * maxTilt;

  card.style.setProperty('--rx', `${angleX}deg`);
  card.style.setProperty('--ry', `${angleY}deg`);

  // Shadow displacement
  const shadowX = -angleY * 1.5;
  const shadowY = angleX * 1.5;
  card.style.setProperty('--shadow-x', `${shadowX}px`);
  card.style.setProperty('--shadow-y', `${shadowY}px`);

  // Glare position
  const px = (x / rect.width) * 100;
  const py = (y / rect.height) * 100;
  card.style.setProperty('--glare-x', `${px}%`);
  card.style.setProperty('--glare-y', `${py}%`);
});

document.addEventListener('mouseout', (e) => {
  const card = e.target.closest('.movie-card, .watchlist-card, .tmdb-card, .stat-card, .chart-card');
  if (!card) return;

  // Verify mouse actually left the card container boundaries
  if (!e.relatedTarget || !card.contains(e.relatedTarget)) {
    card.classList.remove('moving');
    card.style.removeProperty('--rx');
    card.style.removeProperty('--ry');
    card.style.removeProperty('--shadow-x');
    card.style.removeProperty('--shadow-y');
    card.style.removeProperty('--glare-x');
    card.style.removeProperty('--glare-y');
  }
});

// ── 3D HERO PARALLAX EFFECT (Video + BG + Content) ──
document.addEventListener('mousemove', (e) => {
  const hero = e.target.closest('.hero');
  if (!hero) return;

  hero.classList.add('moving');

  const video = hero.querySelector('.hero-video');
  const bg = hero.querySelector('.hero-bg');
  const content = hero.querySelector('.hero-content');

  const rect = hero.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const xc = rect.width / 2;
  const yc = rect.height / 2;

  const dx = (x - xc) / xc;
  const dy = (y - yc) / yc;

  // Video layer: deepest parallax (inverse movement)
  if (video) {
    video.style.transform = `scale(1.12) translate(${dx * -20}px, ${dy * -20}px)`;
  }
  // Poster fallback layer
  if (bg) {
    bg.style.transform = `scale(1.08) translate(${dx * -15}px, ${dy * -15}px)`;
  }
  // Content: forward float towards cursor
  if (content) {
    content.style.transform = `translate(${dx * 14}px, ${dy * 14}px)`;
  }
});

document.addEventListener('mouseout', (e) => {
  const hero = e.target.closest('.hero');
  if (!hero) return;

  if (!e.relatedTarget || !hero.contains(e.relatedTarget)) {
    hero.classList.remove('moving');
    const video = hero.querySelector('.hero-video');
    const bg = hero.querySelector('.hero-bg');
    const content = hero.querySelector('.hero-content');
    if (video) video.style.transform = 'scale(1.08)';
    if (bg) bg.style.transform = 'scale(1.05)';
    if (content) content.style.transform = '';
  }
});

// ── FLOATING 3D PARTICLES GENERATOR ──
function createHeroParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;
  container.innerHTML = ''; // Clear existing

  const count = 25;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    
    // Randomize size (2px - 6px)
    const size = 2 + Math.random() * 4;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;

    // Random horizontal position
    p.style.left = `${Math.random() * 100}%`;

    // Random start position along the vertical axis
    p.style.bottom = `${-10 - Math.random() * 20}%`;

    // Random drift (horizontal movement during float)
    const drift = -60 + Math.random() * 120;
    p.style.setProperty('--drift', `${drift}px`);

    // Random z-depth for 3D effect
    const depth = -30 + Math.random() * 100;
    p.style.setProperty('--depth', `${depth}px`);

    // Random animation duration (8 - 18 seconds)
    const duration = 8 + Math.random() * 10;
    p.style.animationDuration = `${duration}s`;

    // Random delay so particles don't all start at once
    const delay = Math.random() * duration;
    p.style.animationDelay = `${delay}s`;

    container.appendChild(p);
  }
}

// Initialize particles on load and when home page renders
const _origRenderHome = renderHomePage;
renderHomePage = function() {
  _origRenderHome();
  createHeroParticles();
};

// Create initial particles after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(createHeroParticles, 100);
});

// ── SCROLL REVEAL ANIMATIONS ──
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

// Observe sections for scroll reveal
function observeSections() {
  document.querySelectorAll('.section, .admin-card, .chart-card').forEach(el => {
    if (!el.classList.contains('reveal-target')) {
      el.classList.add('reveal-target');
      revealObserver.observe(el);
    }
  });
}

// Hook into navigation to observe new sections
const _origNavigateTo = navigateTo;
navigateTo = function(page) {
  _origNavigateTo(page);
  setTimeout(observeSections, 100);
};

// Initial observation
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(observeSections, 200);
});

