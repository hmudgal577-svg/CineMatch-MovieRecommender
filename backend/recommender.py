import math
import json
from database import get_db_connection

class RecommendationEngine:
    def __init__(self):
        self.movies = []
        self.tfidf_matrix = []
        self.similarity_matrix = {} # Key: movie_id, Value: dict of {other_movie_id: score}
        try:
            self.rebuild()
        except Exception as e:
            print("Database not initialized yet. Recommendation engine will be rebuilt on startup.")

    def rebuild(self):
        """Fetch all movies from SQLite database and rebuild similarity matrices."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM movies")
        rows = cursor.fetchall()
        conn.close()

        self.movies = []
        for row in rows:
            movie = dict(row)
            # Parse JSON lists stored as strings
            movie["genres"] = json.loads(movie["genres"])
            movie["cast"] = json.loads(movie["cast"])
            movie["tags"] = json.loads(movie["tags"])
            self.movies.append(movie)

        self.tfidf_matrix = self._build_tfidf()
        self._compute_cosine_similarity()
        print(f"ML Recommendation Matrix rebuilt successfully for {len(self.movies)} movies.")

    def _build_tfidf(self):
        """Build TF-IDF style feature vectors for each movie."""
        tfidf = []
        for movie in self.movies:
            features = {}

            # Genre features (weight: 3)
            for g in movie["genres"]:
                features[f"genre_{g.lower().strip()}"] = 3.0

            # Director feature (weight: 2)
            dir_slug = movie["director"].replace(" ", "_").lower().strip()
            features[f"dir_{dir_slug}"] = 2.0

            # Cast features (weight: 1.5)
            for c in movie["cast"]:
                cast_slug = c.replace(" ", "_").lower().strip()
                features[f"cast_{cast_slug}"] = 1.5

            # Tag features (weight: 2)
            for t in movie["tags"]:
                tag_slug = t.replace(" ", "_").lower().strip()
                features[f"tag_{tag_slug}"] = 2.0

            # Language feature (weight: 1)
            features[f"lang_{movie['language'].lower().strip()}"] = 1.0

            # Year normalized (weight: 1)
            # Reference 1970 as base, span 60 years
            features["year_normalized"] = (movie["year"] - 1970) / 60.0

            tfidf.append((movie["id"], features))
        return tfidf

    def _cosine(self, vec_a, vec_b):
        """Compute Cosine Similarity between two feature dictionaries."""
        all_keys = set(vec_a.keys()).union(set(vec_b.keys()))
        dot = 0.0
        mag_a = 0.0
        mag_b = 0.0

        for key in all_keys:
            val_a = vec_a.get(key, 0.0)
            val_b = vec_b.get(key, 0.0)
            dot += val_a * val_b
            mag_a += val_a * val_a
            mag_b += val_b * val_b

        if mag_a > 0 and mag_b > 0:
            return dot / (math.sqrt(mag_a) * math.sqrt(mag_b))
        return 0.0

    def _compute_cosine_similarity(self):
        """Precompute the similarity scores between all pairs of movies."""
        self.similarity_matrix = {}
        n = len(self.tfidf_matrix)

        for i in range(n):
            id_a, vec_a = self.tfidf_matrix[i]
            self.similarity_matrix[id_a] = {}
            for j in range(n):
                id_b, vec_b = self.tfidf_matrix[j]
                if id_a == id_b:
                    self.similarity_matrix[id_a][id_b] = 1.0
                else:
                    self.similarity_matrix[id_a][id_b] = self._cosine(vec_a, vec_b)

    def get_similar(self, movie_id, top_n=5):
        """Get similar movies sorted by cosine score, excluding the query movie."""
        if movie_id not in self.similarity_matrix:
            return []

        scores = self.similarity_matrix[movie_id]
        sorted_scores = sorted(
            [(other_id, score) for other_id, score in scores.items() if other_id != movie_id],
            key=lambda x: x[1],
            reverse=True
        )

        similar_movies = []
        for other_id, score in sorted_scores[:top_n]:
            movie = self._get_movie_by_id(other_id)
            if movie:
                # Add similarity score as % Match (matching JS output)
                movie_copy = dict(movie)
                movie_copy["similarity"] = int(round(score * 100))
                similar_movies.append(movie_copy)

        return similar_movies

    def get_by_genre(self, genre, exclude_id=None, top_n=6):
        """Get movies of a certain genre sorted by IMDb rating."""
        genre_lower = genre.lower().strip()
        matched = [
            m for m in self.movies 
            if any(g.lower().strip() == genre_lower for g in m["genres"]) and m["id"] != exclude_id
        ]
        return sorted(matched, key=lambda x: x["rating"], reverse=True)[:top_n]

    def get_by_director(self, director, exclude_id=None):
        """Get movies by a director sorted by IMDb rating."""
        dir_lower = director.lower().strip()
        matched = [
            m for m in self.movies
            if m["director"].lower().strip() == dir_lower and m["id"] != exclude_id
        ]
        return sorted(matched, key=lambda x: x["rating"], reverse=True)

    def get_by_cast(self, actor, exclude_id=None):
        """Get movies starring an actor sorted by IMDb rating."""
        actor_lower = actor.lower().strip()
        matched = [
            m for m in self.movies
            if any(c.lower().strip() == actor_lower for c in m["cast"]) and m["id"] != exclude_id
        ]
        return sorted(matched, key=lambda x: x["rating"], reverse=True)

    def get_personalized(self, watchlist, ratings, top_n=8):
        """Generate collaborative-style hybrid recommendations based on watchlist and ratings."""
        if not watchlist:
            return self.get_trending(top_n)

        scores = {}
        for wid in watchlist:
            # Get up to 10 similar movies for each movie in watchlist
            similar = self.get_similar(wid, 10)
            user_rating = ratings.get(str(wid), 3) # default weight of 3 if not rated
            
            for m in similar:
                mid = m["id"]
                if mid not in watchlist:
                    # Weight by similarity score * rating
                    score_contrib = m["similarity"] * user_rating
                    scores[mid] = scores.get(mid, 0) + score_contrib

        sorted_ids = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        personalized_movies = []
        for mid, _ in sorted_ids[:top_n]:
            movie = self._get_movie_by_id(mid)
            if movie:
                personalized_movies.append(movie)

        # Fallback to trending if not enough personalized results
        if len(personalized_movies) < top_n:
            trending = self.get_trending(top_n * 2)
            for m in trending:
                if m["id"] not in watchlist and m not in personalized_movies:
                    personalized_movies.append(m)
                    if len(personalized_movies) == top_n:
                        break

        return personalized_movies[:top_n]

    def get_trending(self, top_n=8):
        """Get trending movies sorted by popularity score."""
        return sorted(self.movies, key=lambda x: x["popularity"], reverse=True)[:top_n]

    def get_top_rated(self, top_n=8):
        """Get top-rated movies sorted by rating."""
        return sorted(self.movies, key=lambda x: x["rating"], reverse=True)[:top_n]

    def search(self, query):
        """Search movies by title, director, cast, genres, or tags."""
        q = query.lower().strip()
        if not q:
            return []
            
        matched = []
        for m in self.movies:
            title_match = q in m["title"].lower()
            director_match = q in m["director"].lower()
            cast_match = any(q in c.lower() for c in m["cast"])
            genre_match = any(q in g.lower() for g in m["genres"])
            tag_match = any(q in t.lower() for t in m["tags"])

            if title_match or director_match or cast_match or genre_match or tag_match:
                matched.append(m)
        return matched

    def _get_movie_by_id(self, movie_id):
        """Helper to get movie by ID from current local memory list."""
        for m in self.movies:
            if m["id"] == movie_id:
                return m
        return None

# Global Singleton Instance
engine = RecommendationEngine()
