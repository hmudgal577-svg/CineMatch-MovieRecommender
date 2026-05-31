import os
import json
from datetime import datetime
from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Optional

# Import SQLite DB & Recommender Engine
from database import init_db, get_db_connection, get_config, set_config
from recommender import engine
import tmdb_service

app = FastAPI(title="CineMatch API", version="1.0.0")

# Enable CORS for local development with standalone index.html files
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()
    # Load TMDB key if saved in database
    saved_key = get_config("tmdb_api_key")
    if saved_key:
        tmdb_service.TMDB_API_KEY = saved_key
    # Rebuild recommendations engine once db is ready
    engine.rebuild()

# ============================================================
# PYDANTIC SCHEMAS
# ============================================================
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str

class MovieCreateRequest(BaseModel):
    title: str
    year: int
    rating: float
    genres: List[str]
    director: str
    cast: List[str]
    description: str
    language: str
    poster: Optional[str] = ""
    tags: Optional[List[str]] = []

class RatingRequest(BaseModel):
    user_id: int
    rating: int

class ReviewCreateRequest(BaseModel):
    user_id: int
    username: str
    text: str
    rating: int

class PersonalizedRequest(BaseModel):
    watchlist: List[int]
    ratings: Dict[str, int]

class TmdbConfigRequest(BaseModel):
    api_key: str

# ============================================================
# HELPER FUNCTIONS
# ============================================================
def fetch_user_state(user_id: int, cursor):
    """Fetch complete user watchlist and ratings state."""
    # Watchlist
    cursor.execute("SELECT movie_id FROM watchlist WHERE user_id = ?", (user_id,))
    watchlist = [r["movie_id"] for r in cursor.fetchall()]

    # Ratings
    cursor.execute("SELECT movie_id, rating FROM ratings WHERE user_id = ?", (user_id,))
    ratings = {str(r["movie_id"]): r["rating"] for r in cursor.fetchall()}

    return watchlist, ratings

# ============================================================
# AUTHENTICATION ROUTERS
# ============================================================
@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        (req.username.strip(), req.password)
    )
    user_row = cursor.fetchone()

    if not user_row:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user = dict(user_row)
    watchlist, ratings = fetch_user_state(user["id"], cursor)
    conn.close()

    # Form response matching JS currentUser schema
    return {
        "success": True,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "name": user["name"],
            "role": user["role"],
            "avatar": user["avatar"],
            "joinDate": user["join_date"],
            "watchlist": watchlist,
            "ratings": ratings
        }
    }

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    username = req.username.strip()
    name = req.name.strip()
    
    if not username or not req.password or not name:
        raise HTTPException(status_code=400, detail="All fields are required")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if username exists
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")

    # Create new user
    join_date = datetime.now().strftime("%Y-%m-%d")
    avatar = name[0].upper()
    
    cursor.execute(
        "INSERT INTO users (username, password, name, role, avatar, join_date) VALUES (?, ?, ?, 'user', ?, ?)",
        (username, req.password, name, avatar, join_date)
    )
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "user": {
            "id": new_id,
            "username": username,
            "name": name,
            "role": "user",
            "avatar": avatar,
            "joinDate": join_date,
            "watchlist": [],
            "ratings": {}
        }
    }

@app.get("/api/auth/me/{user_id}")
def get_me(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user_row = cursor.fetchone()

    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    user = dict(user_row)
    watchlist, ratings = fetch_user_state(user["id"], cursor)
    conn.close()

    return {
        "id": user["id"],
        "username": user["username"],
        "name": user["name"],
        "role": user["role"],
        "avatar": user["avatar"],
        "joinDate": user["join_date"],
        "watchlist": watchlist,
        "ratings": ratings
    }

# ============================================================
# MOVIE ROUTERS
# ============================================================
@app.get("/api/movies")
def get_movies():
    # Return from our live-updated ML list which parses items from database
    return engine.movies

@app.post("/api/movies")
def add_movie(req: MovieCreateRequest):
    if not req.title or not req.year or not req.director or not req.genres:
        raise HTTPException(status_code=400, detail="Required fields are missing")

    conn = get_db_connection()
    cursor = conn.cursor()

    poster_url = req.poster.strip() if req.poster else f"https://via.placeholder.com/300x450/1a1a2e/e94560?text={req.title}"

    cursor.execute("""
    INSERT INTO movies (title, year, rating, genres, director, cast, description, poster, popularity, language, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 75, ?, ?)
    """, (
        req.title.strip(),
        req.year,
        req.rating,
        json.dumps(req.genres),
        req.director.strip(),
        json.dumps(req.cast),
        req.description.strip() or "No description available.",
        poster_url,
        req.language.strip() or "English",
        json.dumps(req.tags)
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Rebuild the similarity matrices in memory
    engine.rebuild()

    # Return added movie
    return {"id": new_id, "title": req.title}

@app.delete("/api/movies/{movie_id}")
def delete_movie(movie_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM movies WHERE id = ?", (movie_id,))
    conn.commit()
    conn.close()

    # Rebuild the recommendation index
    engine.rebuild()
    return {"success": True, "message": "Movie deleted successfully"}

@app.post("/api/movies/{movie_id}/rate")
def rate_movie(movie_id: int, req: RatingRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Save rating
    cursor.execute("""
    INSERT INTO ratings (user_id, movie_id, rating) VALUES (?, ?, ?)
    ON CONFLICT(user_id, movie_id) DO UPDATE SET rating = excluded.rating
    """, (req.user_id, movie_id, req.rating))
    conn.commit()

    # Fetch updated ratings for user
    _, ratings = fetch_user_state(req.user_id, cursor)
    conn.close()

    return {"success": True, "ratings": ratings}

@app.post("/api/movies/{movie_id}/watchlist")
def toggle_watchlist(movie_id: int, user_id: int = Body(..., embed=True)):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if in watchlist
    cursor.execute("SELECT 1 FROM watchlist WHERE user_id = ? AND movie_id = ?", (user_id, movie_id))
    exists = cursor.fetchone()

    if exists:
        cursor.execute("DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?", (user_id, movie_id))
    else:
        cursor.execute("INSERT INTO watchlist (user_id, movie_id) VALUES (?, ?)", (user_id, movie_id))
    conn.commit()

    # Fetch updated watchlist
    watchlist, _ = fetch_user_state(user_id, cursor)
    conn.close()

    return {"success": True, "watchlist": watchlist}

# ============================================================
# REVIEW & REVIEWS ROUTERS
# ============================================================
@app.post("/api/movies/{movie_id}/reviews")
def submit_review(movie_id: int, req: ReviewCreateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    date_str = datetime.now().strftime("%d %b %Y") # formatted like "27 May 2026"

    cursor.execute("""
    INSERT INTO reviews (user_id, username, movie_id, text, rating, date)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (req.user_id, req.username, movie_id, req.text, req.rating, date_str))
    
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "review": {
            "id": new_id,
            "userId": req.user_id,
            "username": req.username,
            "movieId": movie_id,
            "text": req.text,
            "rating": req.rating,
            "date": date_str,
            "helpful": 0
        }
    }

@app.get("/api/movies/{movie_id}/reviews")
def get_movie_reviews(movie_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reviews WHERE movie_id = ?", (movie_id,))
    rows = cursor.fetchall()
    conn.close()

    reviews = []
    for r in rows:
        reviews.append({
            "id": r["id"],
            "userId": r["user_id"],
            "username": r["username"],
            "movieId": r["movie_id"],
            "text": r["text"],
            "rating": r["rating"],
            "date": r["date"],
            "helpful": r["helpful"]
        })
    return reviews

@app.get("/api/movies/{movie_id}/average-rating")
def get_avg_rating(movie_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT AVG(rating) FROM reviews WHERE movie_id = ? AND rating > 0", (movie_id,))
    avg = cursor.fetchone()[0]
    conn.close()
    
    return {"average": round(avg, 1) if avg else None}

# ============================================================
# RECOMMENDATION ROUTERS
# ============================================================
@app.get("/api/recommendations/trending")
def get_trending(limit: int = 8):
    return engine.get_trending(limit)

@app.get("/api/recommendations/top-rated")
def get_top_rated(limit: int = 8):
    return engine.get_top_rated(limit)

@app.get("/api/recommendations/similar/{movie_id}")
def get_similar(movie_id: int, limit: int = 5):
    return engine.get_similar(movie_id, limit)

@app.post("/api/recommendations/personalized")
def get_personalized(req: PersonalizedRequest, limit: int = 8):
    return engine.get_personalized(req.watchlist, req.ratings, limit)

@app.get("/api/recommendations/genre/{genre}")
def get_by_genre(genre: str, limit: int = 8):
    return engine.get_by_genre(genre, top_n=limit)

# ============================================================
# ADMIN PANEL ROUTERS
# ============================================================
@app.get("/api/admin/stats")
def get_admin_stats():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Simple counts
    cursor.execute("SELECT COUNT(*) FROM movies")
    total_movies = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM reviews")
    total_reviews = cursor.fetchone()[0]

    # Average rating
    cursor.execute("SELECT AVG(rating) FROM movies")
    avg_rating = cursor.fetchone()[0] or 0.0

    # Recent reviews (last 10 reviews)
    cursor.execute("SELECT * FROM reviews ORDER BY id DESC LIMIT 10")
    recent_reviews = [dict(r) for r in cursor.fetchall()]

    conn.close()

    # Genre distribution
    genres_count = {}
    for movie in engine.movies:
        for g in movie["genres"]:
            genres_count[g] = genres_count.get(g, 0) + 1

    return {
        "totalMovies": total_movies,
        "totalUsers": total_users,
        "totalReviews": total_reviews,
        "avgRating": round(avg_rating, 1),
        "recentReviews": recent_reviews,
        "genreDistribution": genres_count
    }

@app.get("/api/admin/users")
def get_admin_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, username, role, join_date FROM users")
    users = [dict(r) for r in cursor.fetchall()]
    
    # Enrich with watchlist and ratings count
    enriched = []
    for u in users:
        watchlist, ratings = fetch_user_state(u["id"], cursor)
        u["watchlist"] = watchlist
        u["ratings"] = ratings
        enriched.append(u)

    conn.close()
    return enriched

@app.get("/api/admin/reviews")
def get_admin_reviews():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reviews ORDER BY id DESC")
    reviews = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return reviews

# ============================================================
# TMDB API ROUTERS
# ============================================================
@app.get("/api/tmdb/status")
def tmdb_status():
    return {"configured": tmdb_service.is_configured()}

@app.get("/api/admin/config/tmdb")
def get_tmdb_config():
    key = get_config("tmdb_api_key", "")
    return {"api_key": key}

@app.post("/api/admin/config/tmdb")
def update_tmdb_config(req: TmdbConfigRequest):
    key_val = req.api_key.strip()
    set_config("tmdb_api_key", key_val)
    tmdb_service.TMDB_API_KEY = key_val
    return {"success": True, "configured": tmdb_service.is_configured()}

@app.get("/api/tmdb/search")
def tmdb_search(query: str, page: int = 1):
    if not tmdb_service.is_configured():
        raise HTTPException(status_code=503, detail="TMDB API key not configured. Set it in backend/tmdb_service.py")
    return tmdb_service.search_movies(query, page)

@app.get("/api/tmdb/movie/{tmdb_id}")
def tmdb_movie_details(tmdb_id: int):
    if not tmdb_service.is_configured():
        raise HTTPException(status_code=503, detail="TMDB API key not configured")
    details = tmdb_service.get_movie_details(tmdb_id)
    if not details:
        raise HTTPException(status_code=404, detail="Movie not found on TMDB")
    return details

@app.get("/api/tmdb/movie/{tmdb_id}/videos")
def tmdb_movie_videos(tmdb_id: int):
    if not tmdb_service.is_configured():
        raise HTTPException(status_code=503, detail="TMDB API key not configured")
    return tmdb_service.get_movie_videos(tmdb_id)

@app.get("/api/tmdb/trending")
def tmdb_trending(page: int = 1):
    if not tmdb_service.is_configured():
        raise HTTPException(status_code=503, detail="TMDB API key not configured")
    return tmdb_service.get_trending_movies(page)

@app.post("/api/tmdb/import/{tmdb_id}")
def tmdb_import_movie(tmdb_id: int):
    """Fetch movie details from TMDB and import into local database."""
    if not tmdb_service.is_configured():
        raise HTTPException(status_code=503, detail="TMDB API key not configured")

    details = tmdb_service.get_movie_details(tmdb_id)
    if not details:
        raise HTTPException(status_code=404, detail="Movie not found on TMDB")

    # Check if movie already exists by tmdb_id
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM movies WHERE tmdb_id = ?", (tmdb_id,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail=f"Movie '{details['title']}' already exists in database")

    # Insert into database
    cursor.execute("""
    INSERT INTO movies (title, year, rating, genres, director, cast, description, poster, tmdb_id, popularity, language, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        details["title"],
        details["year"],
        details["rating"],
        json.dumps(details["genres"]),
        details["director"],
        json.dumps(details["cast"]),
        details["description"],
        details["poster"],
        details["tmdb_id"],
        details["popularity"],
        details["language"],
        json.dumps(details["tags"]),
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Rebuild the recommendation engine
    engine.rebuild()

    return {"success": True, "id": new_id, "title": details["title"], "movie": details}

# ============================================================
# UNIFIED FRONTEND STATIC SERVING
# ============================================================
# Determine paths relative to this backend file
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.dirname(CURRENT_DIR)
FRONTEND_DIR = os.path.join(WORKSPACE_ROOT, "frontend")

# Check if frontend directory exists and mount directories
if os.path.exists(FRONTEND_DIR):
    css_path = os.path.join(FRONTEND_DIR, "css")
    js_path = os.path.join(FRONTEND_DIR, "js")
    data_path = os.path.join(FRONTEND_DIR, "data")

    if os.path.exists(css_path):
        app.mount("/css", StaticFiles(directory=css_path), name="css")
    if os.path.exists(js_path):
        app.mount("/js", StaticFiles(directory=js_path), name="js")
    if os.path.exists(data_path):
        app.mount("/data", StaticFiles(directory=data_path), name="data")

    # Serve the index.html at root url "/"
    @app.get("/")
    def serve_frontend():
        index_file = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"error": f"index.html not found inside {FRONTEND_DIR}"}
else:
    print(f"Warning: Frontend folder not found at '{FRONTEND_DIR}'")

# Main check to allow running via python directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
