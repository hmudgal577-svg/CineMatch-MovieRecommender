import sqlite3
import os
import json
from datetime import datetime

import shutil

BUNDLED_DB = os.path.join(os.path.dirname(__file__), "cinematch.db")
DB_PATH = "/tmp/cinematch.db" if os.environ.get("VERCEL") else BUNDLED_DB

def get_db_connection():
    if os.environ.get("VERCEL") and not os.path.exists(DB_PATH):
        try:
            if os.path.exists(BUNDLED_DB):
                shutil.copy2(BUNDLED_DB, DB_PATH)
        except Exception as e:
            print(f"Error copying bundled DB to /tmp: {e}")
            
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_config(key, default=None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM config WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row["value"] if row else default
    except sqlite3.OperationalError:
        return default

def set_config(key, value):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (key, str(value)))
    conn.commit()
    conn.close()

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create Tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        avatar TEXT NOT NULL,
        join_date TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        year INTEGER NOT NULL,
        rating REAL NOT NULL,
        genres TEXT NOT NULL, -- JSON list
        director TEXT NOT NULL,
        cast TEXT NOT NULL,   -- JSON list
        description TEXT NOT NULL,
        poster TEXT NOT NULL,
        tmdb_id INTEGER,
        popularity INTEGER NOT NULL,
        language TEXT NOT NULL,
        tags TEXT NOT NULL    -- JSON list
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS watchlist (
        user_id INTEGER,
        movie_id INTEGER,
        PRIMARY KEY (user_id, movie_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ratings (
        user_id INTEGER,
        movie_id INTEGER,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        PRIMARY KEY (user_id, movie_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        movie_id INTEGER,
        text TEXT NOT NULL,
        rating INTEGER,
        date TEXT NOT NULL,
        helpful INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (movie_id) REFERENCES movies (id) ON DELETE CASCADE
    )
    """)

    conn.commit()

    # Seed Database if Empty
    cursor.execute("SELECT COUNT(*) FROM movies")
    if cursor.fetchone()[0] == 0:
        print("Seeding database with default CineMatch data...")
        seed_default_data(conn)
    else:
        print("Database already initialized and seeded.")

    conn.close()

def seed_default_data(conn):
    cursor = conn.cursor()

    # Default Users
    default_users = [
        (1, "admin", "admin123", "Admin User", "admin", "A", "2024-01-01"),
        (2, "user1", "user123", "Movie Buff", "user", "M", "2024-06-15")
    ]
    cursor.executemany("""
    INSERT OR IGNORE INTO users (id, username, password, name, role, avatar, join_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, default_users)

    # Default Movies (adapted from JS MOVIES_DB)
    movies_db = [
        {
            "id": 1, "title": "Inception", "year": 2010, "rating": 8.8,
            "genres": ["Sci-Fi", "Action", "Thriller"],
            "director": "Christopher Nolan",
            "cast": ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Ellen Page", "Tom Hardy"],
            "description": "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
            "poster": "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
            "tmdb_id": 27205, "popularity": 98, "language": "English",
            "tags": ["mind-bending", "heist", "dreams", "layered", "complex"]
        },
        {
            "id": 2, "title": "The Dark Knight", "year": 2008, "rating": 9.0,
            "genres": ["Action", "Crime", "Drama"],
            "director": "Christopher Nolan",
            "cast": ["Christian Bale", "Heath Ledger", "Aaron Eckhart", "Michael Caine"],
            "description": "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
            "poster": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
            "tmdb_id": 155, "popularity": 99, "language": "English",
            "tags": ["superhero", "villain", "chaos", "justice", "iconic"]
        },
        {
            "id": 3, "title": "Interstellar", "year": 2014, "rating": 8.6,
            "genres": ["Sci-Fi", "Drama", "Adventure"],
            "director": "Christopher Nolan",
            "cast": ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine"],
            "description": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
            "poster": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
            "tmdb_id": 157336, "popularity": 95, "language": "English",
            "tags": ["space", "time", "love", "science", "emotional"]
        },
        {
            "id": 4, "title": "Pulp Fiction", "year": 1994, "rating": 8.9,
            "genres": ["Crime", "Drama", "Thriller"],
            "director": "Quentin Tarantino",
            "cast": ["John Travolta", "Uma Thurman", "Samuel L. Jackson", "Bruce Willis"],
            "description": "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
            "poster": "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
            "tmdb_id": 680, "popularity": 94, "language": "English",
            "tags": ["nonlinear", "dialogue", "cool", "crime", "cult"]
        },
        {
            "id": 5, "title": "The Shawshank Redemption", "year": 1994, "rating": 9.3,
            "genres": ["Drama", "Crime"],
            "director": "Frank Darabont",
            "cast": ["Tim Robbins", "Morgan Freeman", "Bob Gunton", "William Sadler"],
            "description": "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
            "poster": "https://image.tmdb.org/t/p/w500/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg",
            "tmdb_id": 278, "popularity": 96, "language": "English",
            "tags": ["hope", "friendship", "prison", "freedom", "inspiring"]
        },
        {
            "id": 6, "title": "Avengers: Endgame", "year": 2019, "rating": 8.4,
            "genres": ["Action", "Sci-Fi", "Adventure"],
            "director": "Anthony Russo",
            "cast": ["Robert Downey Jr.", "Chris Evans", "Mark Ruffalo", "Chris Hemsworth"],
            "description": "After the devastating events of Avengers: Infinity War, the universe is in ruins. The remaining Avengers must assemble once more to reverse Thanos's actions and restore balance.",
            "poster": "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
            "tmdb_id": 299534, "popularity": 97, "language": "English",
            "tags": ["superhero", "epic", "emotional", "action", "finale"]
        },
        {
            "id": 7, "title": "The Godfather", "year": 1972, "rating": 9.2,
            "genres": ["Crime", "Drama"],
            "director": "Francis Ford Coppola",
            "cast": ["Marlon Brando", "Al Pacino", "James Caan", "Robert Duvall"],
            "description": "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
            "poster": "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsLe1rhdLC2O3.jpg",
            "tmdb_id": 238, "popularity": 93, "language": "English",
            "tags": ["mafia", "family", "power", "classic", "legacy"]
        },
        {
            "id": 8, "title": "Parasite", "year": 2019, "rating": 8.5,
            "genres": ["Drama", "Thriller", "Comedy"],
            "director": "Bong Joon-ho",
            "cast": ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong", "Choi Woo-shik"],
            "description": "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
            "poster": "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
            "tmdb_id": 496243, "popularity": 91, "language": "Korean",
            "tags": ["class", "satire", "suspense", "oscar", "foreign"]
        },
        {
            "id": 9, "title": "Fight Club", "year": 1999, "rating": 8.8,
            "genres": ["Drama", "Thriller"],
            "director": "David Fincher",
            "cast": ["Brad Pitt", "Edward Norton", "Helena Bonham Carter", "Meat Loaf"],
            "description": "An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.",
            "poster": "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
            "tmdb_id": 550, "popularity": 92, "language": "English",
            "tags": ["identity", "anarchism", "twist", "cult", "psychological"]
        },
        {
            "id": 10, "title": "Forrest Gump", "year": 1994, "rating": 8.8,
            "genres": ["Drama", "Romance", "Comedy"],
            "director": "Robert Zemeckis",
            "cast": ["Tom Hanks", "Robin Wright", "Gary Sinise", "Sally Field"],
            "description": "The presidencies of Kennedy and Johnson, the events of Vietnam, Watergate and other historical events unfold through the perspective of an Alabama man with an IQ of 75.",
            "poster": "https://image.tmdb.org/t/p/w500/saHP97rTPS5eLmrLQEcANmKrsFl.jpg",
            "tmdb_id": 13, "popularity": 95, "language": "English",
            "tags": ["life", "destiny", "history", "love", "heartwarming"]
        },
        {
            "id": 11, "title": "The Matrix", "year": 1999, "rating": 8.7,
            "genres": ["Sci-Fi", "Action"],
            "director": "Lana Wachowski",
            "cast": ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss", "Hugo Weaving"],
            "description": "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
            "poster": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
            "tmdb_id": 603, "popularity": 94, "language": "English",
            "tags": ["simulation", "reality", "rebellion", "iconic", "cyber"]
        },
        {
            "id": 12, "title": "Goodfellas", "year": 1990, "rating": 8.7,
            "genres": ["Crime", "Drama"],
            "director": "Martin Scorsese",
            "cast": ["Ray Liotta", "Robert De Niro", "Joe Pesci", "Lorraine Bracco"],
            "description": "The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners Jimmy Conway and Tommy DeVito.",
            "poster": "https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg",
            "tmdb_id": 769, "popularity": 89, "language": "English",
            "tags": ["mafia", "rise", "fall", "based on true story", "gritty"]
        },
        {
            "id": 13, "title": "Spirited Away", "year": 2001, "rating": 8.6,
            "genres": ["Animation", "Adventure", "Fantasy"],
            "director": "Hayao Miyazaki",
            "cast": ["Daveigh Chase", "Suzanne Pleshette", "Miyu Irino", "Mari Natsuki"],
            "description": "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.",
            "poster": "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
            "tmdb_id": 129, "popularity": 88, "language": "Japanese",
            "tags": ["anime", "fantasy", "coming of age", "spirit world", "magical"]
        },
        {
            "id": 14, "title": "The Silence of the Lambs", "year": 1991, "rating": 8.6,
            "genres": ["Crime", "Drama", "Thriller"],
            "director": "Jonathan Demme",
            "cast": ["Jodie Foster", "Anthony Hopkins", "Lawrence A. Bonney", "Kasi Lemmons"],
            "description": "A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer.",
            "poster": "https://image.tmdb.org/t/p/w500/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg",
            "tmdb_id": 274, "popularity": 87, "language": "English",
            "tags": ["horror", "psychological", "serial killer", "thriller", "suspense"]
        },
        {
            "id": 15, "title": "Schindler's List", "year": 1993, "rating": 9.0,
            "genres": ["Drama", "History", "Biography"],
            "director": "Steven Spielberg",
            "cast": ["Liam Neeson", "Ralph Fiennes", "Ben Kingsley", "Caroline Goodall"],
            "description": "In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.",
            "poster": "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
            "tmdb_id": 424, "popularity": 90, "language": "English",
            "tags": ["holocaust", "war", "humanity", "true story", "masterpiece"]
        },
        {
            "id": 16, "title": "Dune", "year": 2021, "rating": 8.0,
            "genres": ["Sci-Fi", "Adventure", "Drama"],
            "director": "Denis Villeneuve",
            "cast": ["Timothée Chalamet", "Rebecca Ferguson", "Zendaya", "Oscar Isaac"],
            "description": "Feature adaptation of Frank Herbert's science fiction novel about the son of a noble family entrusted with the protection of the most valuable asset in the galaxy.",
            "poster": "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
            "tmdb_id": 438631, "popularity": 92, "language": "English",
            "tags": ["epic", "desert", "prophecy", "political", "visual"]
        },
        {
            "id": 17, "title": "Joker", "year": 2019, "rating": 8.4,
            "genres": ["Crime", "Drama", "Thriller"],
            "director": "Todd Phillips",
            "cast": ["Joaquin Phoenix", "Robert De Niro", "Zazie Beetz", "Frances Conroy"],
            "description": "A mentally troubled stand-up comedian embarks on a downward spiral that leads to the creation of an iconic villain.",
            "poster": "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
            "tmdb_id": 475557, "popularity": 93, "language": "English",
            "tags": ["origin story", "dark", "society", "character study", "villain"]
        },
        {
            "id": 18, "title": "Coco", "year": 2017, "rating": 8.4,
            "genres": ["Animation", "Adventure", "Family"],
            "director": "Lee Unkrich",
            "cast": ["Anthony Gonzalez", "Gael García Bernal", "Benjamin Bratt", "Alanna Ubach"],
            "description": "Aspiring musician Miguel, confronted with his family's ancestral ban on music, enters the Land of the Dead to find his great-great-grandfather.",
            "poster": "https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg",
            "tmdb_id": 354912, "popularity": 88, "language": "English",
            "tags": ["family", "music", "death", "culture", "heartwarming"]
        },
        {
            "id": 19, "title": "Whiplash", "year": 2014, "rating": 8.5,
            "genres": ["Drama", "Music"],
            "director": "Damien Chazelle",
            "cast": ["Miles Teller", "J.K. Simmons", "Melissa Benoist", "Paul Reiser"],
            "description": "A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student's potential.",
            "poster": "https://image.tmdb.org/t/p/w500/oBzi6YnFqhqYmwjBHORRFcqKMUs.jpg",
            "tmdb_id": 244786, "popularity": 86, "language": "English",
            "tags": ["music", "ambition", "obsession", "mentor", "intense"]
        },
        {
            "id": 20, "title": "La La Land", "year": 2016, "rating": 8.0,
            "genres": ["Drama", "Romance", "Music"],
            "director": "Damien Chazelle",
            "cast": ["Ryan Gosling", "Emma Stone", "John Legend", "Rosemarie DeWitt"],
            "description": "While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.",
            "poster": "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
            "tmdb_id": 313369, "popularity": 87, "language": "English",
            "tags": ["romance", "music", "dream", "jazz", "bittersweet"]
        },
        {
            "id": 21, "title": "3 Idiots", "year": 2009, "rating": 8.4,
            "genres": ["Comedy", "Drama", "Romance"],
            "director": "Rajkumar Hirani",
            "cast": ["Aamir Khan", "R. Madhavan", "Sharman Joshi", "Kareena Kapoor"],
            "description": "Two friends are searching for their long lost companion. They revisit their college days and recall the memories of their friend who inspired them to think differently.",
            "poster": "https://image.tmdb.org/t/p/w500/66A9MqXOyVFCssoloscw79z8Tew.jpg",
            "tmdb_id": 20453, "popularity": 89, "language": "Hindi",
            "tags": ["bollywood", "education", "friendship", "comedy", "inspiring"]
        },
        {
            "id": 22, "title": "RRR", "year": 2022, "rating": 7.8,
            "genres": ["Action", "Drama", "History"],
            "director": "S.S. Rajamouli",
            "cast": ["N.T. Rama Rao Jr.", "Ram Charan", "Ajay Devgn", "Alia Bhatt"],
            "description": "A fictitious story about two legendary revolutionaries and their journey away from home before they began fighting for their country in the 1920s.",
            "poster": "https://image.tmdb.org/t/p/w500/nEufeZlyAOLqO2brrs0yeF1lgXO.jpg",
            "tmdb_id": 759764, "popularity": 85, "language": "Telugu",
            "tags": ["indian", "action", "historical", "epic", "blockbuster"]
        },
        {
            "id": 23, "title": "Spider-Man: Into the Spider-Verse", "year": 2018, "rating": 8.4,
            "genres": ["Animation", "Action", "Adventure"],
            "director": "Bob Persichetti",
            "cast": ["Shameik Moore", "Jake Johnson", "Hailee Steinfeld", "Mahershala Ali"],
            "description": "Teen Miles Morales becomes the Spider-Man of his universe, and must join with five spider-powered individuals from other dimensions to stop a threat for all realities.",
            "poster": "https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8MChsmKenwVyV.jpg",
            "tmdb_id": 324857, "popularity": 90, "language": "English",
            "tags": ["animation", "superhero", "multiverse", "style", "innovative"]
        },
        {
            "id": 24, "title": "Get Out", "year": 2017, "rating": 7.7,
            "genres": ["Horror", "Thriller", "Mystery"],
            "director": "Jordan Peele",
            "cast": ["Daniel Kaluuya", "Allison Williams", "Bradley Whitford", "Catherine Keener"],
            "description": "A young African-American visits his white girlfriend's parents for the weekend, where his simmering uneasiness about their reception of him eventually reaches a boiling point.",
            "poster": "https://image.tmdb.org/t/p/w500/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg",
            "tmdb_id": 419430, "popularity": 83, "language": "English",
            "tags": ["race", "horror", "twist", "social commentary", "suspense"]
        },
        {
            "id": 25, "title": "Everything Everywhere All at Once", "year": 2022, "rating": 7.8,
            "genres": ["Sci-Fi", "Comedy", "Adventure"],
            "director": "Daniel Kwan",
            "cast": ["Michelle Yeoh", "Stephanie Hsu", "Ke Huy Quan", "Jamie Lee Curtis"],
            "description": "A middle-aged Chinese immigrant is swept up into an insane adventure in which she alone can save existence by exploring other universes.",
            "poster": "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
            "tmdb_id": 545611, "popularity": 88, "language": "English",
            "tags": ["multiverse", "family", "absurd", "oscar", "emotional"]
        }
    ]

    for m in movies_db:
        cursor.execute("""
        INSERT INTO movies (id, title, year, rating, genres, director, cast, description, poster, tmdb_id, popularity, language, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            m["id"],
            m["title"],
            m["year"],
            m["rating"],
            json.dumps(m["genres"]),
            m["director"],
            json.dumps(m["cast"]),
            m["description"],
            m["poster"],
            m["tmdb_id"],
            m["popularity"],
            m["language"],
            json.dumps(m["tags"])
        ))

    # User 1 ratings: { 1: 5, 3: 4 }
    user_ratings = [
        (2, 1, 5),
        (2, 3, 4)
    ]
    cursor.executemany("""
    INSERT OR IGNORE INTO ratings (user_id, movie_id, rating)
    VALUES (?, ?, ?)
    """, user_ratings)

    # User 1 watchlist: [1, 3, 5]
    user_watchlist = [
        (2, 1),
        (2, 3),
        (2, 5)
    ]
    cursor.executemany("""
    INSERT OR IGNORE INTO watchlist (user_id, movie_id)
    VALUES (?, ?)
    """, user_watchlist)

    conn.commit()
    print("Database seeding completed.")

if __name__ == "__main__":
    init_db()
