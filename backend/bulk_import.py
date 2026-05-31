import sys
import os
import io
import json
import sqlite3
import urllib.request
import urllib.parse
import ssl
import time

# ─── FIX: Force UTF-8 output so special characters don't crash on Windows ───
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Ensure we can import from local files
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(CURRENT_DIR)

from database import get_db_connection, get_config
import tmdb_service

# Create an SSL context that doesn't verify certificates
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE


def _safe_title(title):
    """Return a printable version of a movie title."""
    try:
        return title.encode("ascii", errors="replace").decode("ascii")
    except Exception:
        return "???"


def _fetch_json(url, retries=3):
    """Fetch JSON from a URL with retries."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=15, context=_ssl_ctx) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            if attempt < retries - 1:
                print(f"  Retry {attempt + 1}/{retries} after error: {e}")
                time.sleep(2)
            else:
                print(f"  FAILED after {retries} attempts: {e}")
                return None


def _import_from_endpoint(api_key, endpoint_url_template, existing_ids, target_count, label="movies"):
    """
    Generic importer that pages through a TMDB list endpoint.
    endpoint_url_template must contain {api_key} and {page} placeholders.
    Returns count of newly imported movies.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    imported = 0
    page = 1
    max_pages = 80  # safety cap

    while len(existing_ids) < target_count and page <= max_pages:
        url = endpoint_url_template.format(api_key=api_key, page=page)
        data = _fetch_json(url)
        if not data:
            print(f"  Could not fetch page {page} for {label}. Skipping.")
            page += 1
            continue

        results = data.get("results", [])
        if not results:
            print(f"  No more results for {label} at page {page}.")
            break

        for m in results:
            if len(existing_ids) >= target_count:
                break

            tmdb_id = m.get("id")
            if not tmdb_id or tmdb_id in existing_ids:
                continue

            title = m.get("title", m.get("original_title", "Unknown"))
            print(f"  [{len(existing_ids)+1}/{target_count}] {_safe_title(title)}...")

            details = tmdb_service.get_movie_details(tmdb_id)
            if not details:
                continue

            try:
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
                conn.commit()
                existing_ids.add(tmdb_id)
                imported += 1
                time.sleep(0.12)  # respect API rate limit
            except Exception as e:
                print(f"    DB Error: {e}")
                continue

        page += 1

    conn.close()
    return imported


def bulk_import_movies(target_total=600):
    api_key = get_config("tmdb_api_key")
    if not api_key:
        print("ERROR: TMDB API Key not found in database config.")
        return

    tmdb_service.TMDB_API_KEY = api_key

    # Get existing tmdb_ids
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT tmdb_id FROM movies WHERE tmdb_id IS NOT NULL")
    existing_ids = {row["tmdb_id"] for row in cursor.fetchall()}
    conn.close()

    total_before = len(existing_ids)
    print(f"=== CineMatch Bulk Import ===")
    print(f"Currently in database: {total_before} movies")
    print(f"Target: {target_total} movies")
    print()

    # ─────────────────────────────────────────────────
    # PHASE 1: Popular movies (worldwide)
    # ─────────────────────────────────────────────────
    phase1_target = min(target_total, int(target_total * 0.55))  # ~55% popular worldwide
    if len(existing_ids) < phase1_target:
        print(f"--- Phase 1: Popular Movies (target {phase1_target}) ---")
        url_tpl = "https://api.tmdb.org/3/movie/popular?api_key={api_key}&page={page}&language=en-US"
        n = _import_from_endpoint(api_key, url_tpl, existing_ids, phase1_target, "Popular")
        print(f"  Phase 1 done: +{n} movies (total: {len(existing_ids)})\n")

    # ─────────────────────────────────────────────────
    # PHASE 2: Top Rated movies
    # ─────────────────────────────────────────────────
    phase2_target = min(target_total, int(target_total * 0.70))  # up to 70%
    if len(existing_ids) < phase2_target:
        print(f"--- Phase 2: Top Rated Movies (target {phase2_target}) ---")
        url_tpl = "https://api.tmdb.org/3/movie/top_rated?api_key={api_key}&page={page}&language=en-US"
        n = _import_from_endpoint(api_key, url_tpl, existing_ids, phase2_target, "Top Rated")
        print(f"  Phase 2 done: +{n} movies (total: {len(existing_ids)})\n")

    # ─────────────────────────────────────────────────
    # PHASE 3: BOLLYWOOD Movies (Hindi language, India)
    # ─────────────────────────────────────────────────
    phase3_target = min(target_total, int(target_total * 0.88))  # up to 88%
    if len(existing_ids) < phase3_target:
        print(f"--- Phase 3: Bollywood Movies (target {phase3_target}) ---")
        # Use Discover API: Hindi language, sorted by popularity
        url_tpl = (
            "https://api.tmdb.org/3/discover/movie?api_key={api_key}&page={page}"
            "&with_original_language=hi&sort_by=popularity.desc"
            "&vote_count.gte=50&region=IN"
        )
        n = _import_from_endpoint(api_key, url_tpl, existing_ids, phase3_target, "Bollywood")
        print(f"  Phase 3 done: +{n} movies (total: {len(existing_ids)})\n")

    # ─────────────────────────────────────────────────
    # PHASE 4: Trending this week (fill remaining)
    # ─────────────────────────────────────────────────
    if len(existing_ids) < target_total:
        print(f"--- Phase 4: Trending Movies (target {target_total}) ---")
        url_tpl = "https://api.tmdb.org/3/trending/movie/week?api_key={api_key}&page={page}"
        n = _import_from_endpoint(api_key, url_tpl, existing_ids, target_total, "Trending")
        print(f"  Phase 4 done: +{n} movies (total: {len(existing_ids)})\n")

    # ─────────────────────────────────────────────────
    # Rebuild recommendation engine
    # ─────────────────────────────────────────────────
    print("Rebuilding recommender engine...")
    from recommender import engine
    engine.rebuild()

    total_new = len(existing_ids) - total_before
    print(f"\n=== DONE! Imported {total_new} new movies. Total in DB: {len(existing_ids)} ===")


if __name__ == "__main__":
    target = 600
    if len(sys.argv) > 1:
        try:
            target = int(sys.argv[1])
        except ValueError:
            pass
    bulk_import_movies(target)
