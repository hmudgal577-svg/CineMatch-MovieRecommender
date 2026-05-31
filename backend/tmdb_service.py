import urllib.request
import urllib.parse
import json
import ssl

# ============================================================
# TMDB API Configuration
# Get your free API key at: https://www.themoviedb.org/settings/api
# ============================================================
TMDB_API_KEY = "a705b92ebbac7f760b1e50d4e5c06a3f"
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

# Create an SSL context that doesn't verify certificates (for development)
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE


def _tmdb_request(endpoint, params=None):
    """Make a GET request to the TMDB API."""
    if params is None:
        params = {}
    params["api_key"] = TMDB_API_KEY

    url = f"{TMDB_BASE_URL}{endpoint}?{urllib.parse.urlencode(params)}"

    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10, context=_ssl_ctx) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"TMDB API Error: {e}")
        return None


def is_configured():
    """Check if TMDB API key is configured."""
    return TMDB_API_KEY and TMDB_API_KEY != "YOUR_TMDB_API_KEY_HERE"


def search_movies(query, page=1):
    """Search for movies on TMDB."""
    if not is_configured():
        return {"results": [], "total_results": 0, "error": "TMDB API key not configured"}

    data = _tmdb_request("/search/movie", {"query": query, "page": page, "include_adult": "false"})
    if not data:
        return {"results": [], "total_results": 0}

    results = []
    for movie in data.get("results", [])[:20]:
        results.append({
            "tmdb_id": movie["id"],
            "title": movie.get("title", "Unknown"),
            "year": movie.get("release_date", "")[:4] if movie.get("release_date") else "",
            "rating": round(movie.get("vote_average", 0), 1),
            "overview": movie.get("overview", ""),
            "poster": f"{TMDB_IMAGE_BASE}{movie['poster_path']}" if movie.get("poster_path") else "",
            "popularity": round(movie.get("popularity", 0)),
            "language": movie.get("original_language", "en"),
        })

    return {
        "results": results,
        "total_results": data.get("total_results", 0),
        "page": data.get("page", 1),
        "total_pages": data.get("total_pages", 1),
    }


def get_movie_details(tmdb_id):
    """Fetch full movie details from TMDB including credits."""
    if not is_configured():
        return None

    # Fetch movie details with credits appended
    data = _tmdb_request(f"/movie/{tmdb_id}", {"append_to_response": "credits"})
    if not data:
        return None

    # Extract director
    director = "Unknown"
    credits = data.get("credits", {})
    crew = credits.get("crew", [])
    for person in crew:
        if person.get("job") == "Director":
            director = person.get("name", "Unknown")
            break

    # Extract top 4 cast members
    cast_list = []
    for person in credits.get("cast", [])[:4]:
        cast_list.append(person.get("name", "Unknown"))

    # Extract genres
    genres = [g["name"] for g in data.get("genres", [])]

    # Map TMDB language codes to full names
    lang_map = {
        "en": "English", "hi": "Hindi", "ko": "Korean", "ja": "Japanese",
        "te": "Telugu", "ta": "Tamil", "es": "Spanish", "fr": "French",
        "de": "German", "it": "Italian", "pt": "Portuguese", "ru": "Russian",
        "zh": "Chinese", "ar": "Arabic", "bn": "Bengali", "ml": "Malayalam",
        "kn": "Kannada", "mr": "Marathi", "pa": "Punjabi",
    }
    language = lang_map.get(data.get("original_language", "en"), data.get("original_language", "English").capitalize())

    # Build tags from genres + keywords
    tags = [g.lower() for g in genres[:3]]
    if data.get("tagline"):
        tags.append(data["tagline"].lower().split()[0] if data["tagline"] else "")
    tags = [t for t in tags if t][:5]

    return {
        "tmdb_id": data["id"],
        "title": data.get("title", "Unknown"),
        "year": int(data.get("release_date", "0000")[:4]) if data.get("release_date") else 2024,
        "rating": round(data.get("vote_average", 7.0), 1),
        "genres": genres,
        "director": director,
        "cast": cast_list,
        "description": data.get("overview", "No description available."),
        "poster": f"{TMDB_IMAGE_BASE}{data['poster_path']}" if data.get("poster_path") else "",
        "popularity": min(99, max(50, int(data.get("popularity", 50)))),
        "language": language,
        "tags": tags,
    }


def get_movie_videos(tmdb_id):
    """Fetch movie trailers/videos from TMDB."""
    if not is_configured():
        return []

    data = _tmdb_request(f"/movie/{tmdb_id}/videos")
    if not data:
        return []

    videos = []
    for video in data.get("results", []):
        if video.get("site") == "YouTube":
            videos.append({
                "key": video["key"],
                "name": video.get("name", "Trailer"),
                "type": video.get("type", "Trailer"),
                "official": video.get("official", False),
            })

    # Sort: official trailers first, then teasers, then others
    type_order = {"Trailer": 0, "Teaser": 1, "Clip": 2, "Featurette": 3}
    videos.sort(key=lambda v: (not v["official"], type_order.get(v["type"], 9)))

    return videos


def get_trending_movies(page=1):
    """Fetch currently trending movies from TMDB."""
    if not is_configured():
        return {"results": []}

    data = _tmdb_request("/trending/movie/week", {"page": page})
    if not data:
        return {"results": []}

    results = []
    for movie in data.get("results", [])[:20]:
        results.append({
            "tmdb_id": movie["id"],
            "title": movie.get("title", "Unknown"),
            "year": movie.get("release_date", "")[:4] if movie.get("release_date") else "",
            "rating": round(movie.get("vote_average", 0), 1),
            "overview": movie.get("overview", ""),
            "poster": f"{TMDB_IMAGE_BASE}{movie['poster_path']}" if movie.get("poster_path") else "",
            "popularity": round(movie.get("popularity", 0)),
        })

    return {"results": results}
