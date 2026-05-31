// ============================================================
// MOVIES DATABASE - CineMatch Recommender System
// ============================================================

const MOVIES_DB = [
  {
    id: 1, title: "Inception", year: 2010, rating: 8.8,
    genres: ["Sci-Fi", "Action", "Thriller"],
    director: "Christopher Nolan",
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Ellen Page", "Tom Hardy"],
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    poster: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    tmdb_id: 27205, popularity: 98, language: "English",
    tags: ["mind-bending", "heist", "dreams", "layered", "complex"]
  },
  {
    id: 2, title: "The Dark Knight", year: 2008, rating: 9.0,
    genres: ["Action", "Crime", "Drama"],
    director: "Christopher Nolan",
    cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart", "Michael Caine"],
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    tmdb_id: 155, popularity: 99, language: "English",
    tags: ["superhero", "villain", "chaos", "justice", "iconic"]
  },
  {
    id: 3, title: "Interstellar", year: 2014, rating: 8.6,
    genres: ["Sci-Fi", "Drama", "Adventure"],
    director: "Christopher Nolan",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine"],
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    tmdb_id: 157336, popularity: 95, language: "English",
    tags: ["space", "time", "love", "science", "emotional"]
  },
  {
    id: 4, title: "Pulp Fiction", year: 1994, rating: 8.9,
    genres: ["Crime", "Drama", "Thriller"],
    director: "Quentin Tarantino",
    cast: ["John Travolta", "Uma Thurman", "Samuel L. Jackson", "Bruce Willis"],
    description: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    tmdb_id: 680, popularity: 94, language: "English",
    tags: ["nonlinear", "dialogue", "cool", "crime", "cult"]
  },
  {
    id: 5, title: "The Shawshank Redemption", year: 1994, rating: 9.3,
    genres: ["Drama", "Crime"],
    director: "Frank Darabont",
    cast: ["Tim Robbins", "Morgan Freeman", "Bob Gunton", "William Sadler"],
    description: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
    poster: "https://image.tmdb.org/t/p/w500/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg",
    tmdb_id: 278, popularity: 96, language: "English",
    tags: ["hope", "friendship", "prison", "freedom", "inspiring"]
  },
  {
    id: 6, title: "Avengers: Endgame", year: 2019, rating: 8.4,
    genres: ["Action", "Sci-Fi", "Adventure"],
    director: "Anthony Russo",
    cast: ["Robert Downey Jr.", "Chris Evans", "Mark Ruffalo", "Chris Hemsworth"],
    description: "After the devastating events of Avengers: Infinity War, the universe is in ruins. The remaining Avengers must assemble once more to reverse Thanos's actions and restore balance.",
    poster: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    tmdb_id: 299534, popularity: 97, language: "English",
    tags: ["superhero", "epic", "emotional", "action", "finale"]
  },
  {
    id: 7, title: "The Godfather", year: 1972, rating: 9.2,
    genres: ["Crime", "Drama"],
    director: "Francis Ford Coppola",
    cast: ["Marlon Brando", "Al Pacino", "James Caan", "Robert Duvall"],
    description: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
    poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsLe1rhdLC2O3.jpg",
    tmdb_id: 238, popularity: 93, language: "English",
    tags: ["mafia", "family", "power", "classic", "legacy"]
  },
  {
    id: 8, title: "Parasite", year: 2019, rating: 8.5,
    genres: ["Drama", "Thriller", "Comedy"],
    director: "Bong Joon-ho",
    cast: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong", "Choi Woo-shik"],
    description: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    poster: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    tmdb_id: 496243, popularity: 91, language: "Korean",
    tags: ["class", "satire", "suspense", "oscar", "foreign"]
  },
  {
    id: 9, title: "Fight Club", year: 1999, rating: 8.8,
    genres: ["Drama", "Thriller"],
    director: "David Fincher",
    cast: ["Brad Pitt", "Edward Norton", "Helena Bonham Carter", "Meat Loaf"],
    description: "An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.",
    poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    tmdb_id: 550, popularity: 92, language: "English",
    tags: ["identity", "anarchism", "twist", "cult", "psychological"]
  },
  {
    id: 10, title: "Forrest Gump", year: 1994, rating: 8.8,
    genres: ["Drama", "Romance", "Comedy"],
    director: "Robert Zemeckis",
    cast: ["Tom Hanks", "Robin Wright", "Gary Sinise", "Sally Field"],
    description: "The presidencies of Kennedy and Johnson, the events of Vietnam, Watergate and other historical events unfold through the perspective of an Alabama man with an IQ of 75.",
    poster: "https://image.tmdb.org/t/p/w500/saHP97rTPS5eLmrLQEcANmKrsFl.jpg",
    tmdb_id: 13, popularity: 95, language: "English",
    tags: ["life", "destiny", "history", "love", "heartwarming"]
  },
  {
    id: 11, title: "The Matrix", year: 1999, rating: 8.7,
    genres: ["Sci-Fi", "Action"],
    director: "Lana Wachowski",
    cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss", "Hugo Weaving"],
    description: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    poster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    tmdb_id: 603, popularity: 94, language: "English",
    tags: ["simulation", "reality", "rebellion", "iconic", "cyber"]
  },
  {
    id: 12, title: "Goodfellas", year: 1990, rating: 8.7,
    genres: ["Crime", "Drama"],
    director: "Martin Scorsese",
    cast: ["Ray Liotta", "Robert De Niro", "Joe Pesci", "Lorraine Bracco"],
    description: "The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners Jimmy Conway and Tommy DeVito.",
    poster: "https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg",
    tmdb_id: 769, popularity: 89, language: "English",
    tags: ["mafia", "rise", "fall", "based on true story", "gritty"]
  },
  {
    id: 13, title: "Spirited Away", year: 2001, rating: 8.6,
    genres: ["Animation", "Adventure", "Fantasy"],
    director: "Hayao Miyazaki",
    cast: ["Daveigh Chase", "Suzanne Pleshette", "Miyu Irino", "Mari Natsuki"],
    description: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.",
    poster: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    tmdb_id: 129, popularity: 88, language: "Japanese",
    tags: ["anime", "fantasy", "coming of age", "spirit world", "magical"]
  },
  {
    id: 14, title: "The Silence of the Lambs", year: 1991, rating: 8.6,
    genres: ["Crime", "Drama", "Thriller"],
    director: "Jonathan Demme",
    cast: ["Jodie Foster", "Anthony Hopkins", "Lawrence A. Bonney", "Kasi Lemmons"],
    description: "A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer.",
    poster: "https://image.tmdb.org/t/p/w500/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg",
    tmdb_id: 274, popularity: 87, language: "English",
    tags: ["horror", "psychological", "serial killer", "thriller", "suspense"]
  },
  {
    id: 15, title: "Schindler's List", year: 1993, rating: 9.0,
    genres: ["Drama", "History", "Biography"],
    director: "Steven Spielberg",
    cast: ["Liam Neeson", "Ralph Fiennes", "Ben Kingsley", "Caroline Goodall"],
    description: "In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.",
    poster: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
    tmdb_id: 424, popularity: 90, language: "English",
    tags: ["holocaust", "war", "humanity", "true story", "masterpiece"]
  },
  {
    id: 16, title: "Dune", year: 2021, rating: 8.0,
    genres: ["Sci-Fi", "Adventure", "Drama"],
    director: "Denis Villeneuve",
    cast: ["Timothée Chalamet", "Rebecca Ferguson", "Zendaya", "Oscar Isaac"],
    description: "Feature adaptation of Frank Herbert's science fiction novel about the son of a noble family entrusted with the protection of the most valuable asset in the galaxy.",
    poster: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
    tmdb_id: 438631, popularity: 92, language: "English",
    tags: ["epic", "desert", "prophecy", "political", "visual"]
  },
  {
    id: 17, title: "Joker", year: 2019, rating: 8.4,
    genres: ["Crime", "Drama", "Thriller"],
    director: "Todd Phillips",
    cast: ["Joaquin Phoenix", "Robert De Niro", "Zazie Beetz", "Frances Conroy"],
    description: "A mentally troubled stand-up comedian embarks on a downward spiral that leads to the creation of an iconic villain.",
    poster: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
    tmdb_id: 475557, popularity: 93, language: "English",
    tags: ["origin story", "dark", "society", "character study", "villain"]
  },
  {
    id: 18, title: "Coco", year: 2017, rating: 8.4,
    genres: ["Animation", "Adventure", "Family"],
    director: "Lee Unkrich",
    cast: ["Anthony Gonzalez", "Gael García Bernal", "Benjamin Bratt", "Alanna Ubach"],
    description: "Aspiring musician Miguel, confronted with his family's ancestral ban on music, enters the Land of the Dead to find his great-great-grandfather.",
    poster: "https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg",
    tmdb_id: 354912, popularity: 88, language: "English",
    tags: ["family", "music", "death", "culture", "heartwarming"]
  },
  {
    id: 19, title: "Whiplash", year: 2014, rating: 8.5,
    genres: ["Drama", "Music"],
    director: "Damien Chazelle",
    cast: ["Miles Teller", "J.K. Simmons", "Melissa Benoist", "Paul Reiser"],
    description: "A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student's potential.",
    poster: "https://image.tmdb.org/t/p/w500/oBzi6YnFqhqYmwjBHORRFcqKMUs.jpg",
    tmdb_id: 244786, popularity: 86, language: "English",
    tags: ["music", "ambition", "obsession", "mentor", "intense"]
  },
  {
    id: 20, title: "La La Land", year: 2016, rating: 8.0,
    genres: ["Drama", "Romance", "Music"],
    director: "Damien Chazelle",
    cast: ["Ryan Gosling", "Emma Stone", "John Legend", "Rosemarie DeWitt"],
    description: "While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.",
    poster: "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
    tmdb_id: 313369, popularity: 87, language: "English",
    tags: ["romance", "music", "dream", "jazz", "bittersweet"]
  },
  {
    id: 21, title: "3 Idiots", year: 2009, rating: 8.4,
    genres: ["Comedy", "Drama", "Romance"],
    director: "Rajkumar Hirani",
    cast: ["Aamir Khan", "R. Madhavan", "Sharman Joshi", "Kareena Kapoor"],
    description: "Two friends are searching for their long lost companion. They revisit their college days and recall the memories of their friend who inspired them to think differently.",
    poster: "https://image.tmdb.org/t/p/w500/66A9MqXOyVFCssoloscw79z8Tew.jpg",
    tmdb_id: 20453, popularity: 89, language: "Hindi",
    tags: ["bollywood", "education", "friendship", "comedy", "inspiring"]
  },
  {
    id: 22, title: "RRR", year: 2022, rating: 7.8,
    genres: ["Action", "Drama", "History"],
    director: "S.S. Rajamouli",
    cast: ["N.T. Rama Rao Jr.", "Ram Charan", "Ajay Devgn", "Alia Bhatt"],
    description: "A fictitious story about two legendary revolutionaries and their journey away from home before they began fighting for their country in the 1920s.",
    poster: "https://image.tmdb.org/t/p/w500/nEufeZlyAOLqO2brrs0yeF1lgXO.jpg",
    tmdb_id: 759764, popularity: 85, language: "Telugu",
    tags: ["indian", "action", "historical", "epic", "blockbuster"]
  },
  {
    id: 23, title: "Spider-Man: Into the Spider-Verse", year: 2018, rating: 8.4,
    genres: ["Animation", "Action", "Adventure"],
    director: "Bob Persichetti",
    cast: ["Shameik Moore", "Jake Johnson", "Hailee Steinfeld", "Mahershala Ali"],
    description: "Teen Miles Morales becomes the Spider-Man of his universe, and must join with five spider-powered individuals from other dimensions to stop a threat for all realities.",
    poster: "https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8MChsmKenwVyV.jpg",
    tmdb_id: 324857, popularity: 90, language: "English",
    tags: ["animation", "superhero", "multiverse", "style", "innovative"]
  },
  {
    id: 24, title: "Get Out", year: 2017, rating: 7.7,
    genres: ["Horror", "Thriller", "Mystery"],
    director: "Jordan Peele",
    cast: ["Daniel Kaluuya", "Allison Williams", "Bradley Whitford", "Catherine Keener"],
    description: "A young African-American visits his white girlfriend's parents for the weekend, where his simmering uneasiness about their reception of him eventually reaches a boiling point.",
    poster: "https://image.tmdb.org/t/p/w500/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg",
    tmdb_id: 419430, popularity: 83, language: "English",
    tags: ["race", "horror", "twist", "social commentary", "suspense"]
  },
  {
    id: 25, title: "Everything Everywhere All at Once", year: 2022, rating: 7.8,
    genres: ["Sci-Fi", "Comedy", "Adventure"],
    director: "Daniel Kwan",
    cast: ["Michelle Yeoh", "Stephanie Hsu", "Ke Huy Quan", "Jamie Lee Curtis"],
    description: "A middle-aged Chinese immigrant is swept up into an insane adventure in which she alone can save existence by exploring other universes.",
    poster: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    tmdb_id: 545611, popularity: 88, language: "English",
    tags: ["multiverse", "family", "absurd", "oscar", "emotional"]
  }
];

// ============================================================
// USERS DB (stored in localStorage in real app)
// ============================================================
const DEFAULT_USERS = [
  {
    id: 1, username: "admin", password: "admin123",
    role: "admin", name: "Admin User",
    avatar: "A", joinDate: "2024-01-01",
    watchlist: [], ratings: {}, feedback: []
  },
  {
    id: 2, username: "user1", password: "user123",
    role: "user", name: "Movie Buff",
    avatar: "M", joinDate: "2024-06-15",
    watchlist: [1, 3, 5], ratings: { 1: 5, 3: 4 }, feedback: []
  }
];

// ============================================================
// ML RECOMMENDATION ENGINE (Content-Based Filtering)
// ============================================================
class RecommendationEngine {
  constructor(movies) {
    this.movies = movies;
    this.tfidfMatrix = this._buildTFIDF();
    this.similarityMatrix = this._computeCosineSimilarity();
  }

  // Build TF-IDF style feature vector for each movie
  _buildTFIDF() {
    return this.movies.map(movie => {
      const features = {};

      // Genre features (weight: 3)
      movie.genres.forEach(g => {
        features[`genre_${g.toLowerCase()}`] = 3;
      });

      // Director feature (weight: 2)
      features[`dir_${movie.director.replace(/\s/g, '_').toLowerCase()}`] = 2;

      // Cast features (weight: 1.5)
      movie.cast.forEach(c => {
        features[`cast_${c.replace(/\s/g, '_').toLowerCase()}`] = 1.5;
      });

      // Tag features (weight: 2)
      movie.tags.forEach(t => {
        features[`tag_${t.replace(/\s/g, '_').toLowerCase()}`] = 2;
      });

      // Language feature (weight: 1)
      features[`lang_${movie.language.toLowerCase()}`] = 1;

      // Year proximity (normalized)
      features['year_normalized'] = (movie.year - 1970) / 60;

      return features;
    });
  }

  // Cosine similarity between two feature vectors
  _cosine(vecA, vecB) {
    const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    let dot = 0, magA = 0, magB = 0;
    allKeys.forEach(key => {
      const a = vecA[key] || 0;
      const b = vecB[key] || 0;
      dot += a * b;
      magA += a * a;
      magB += b * b;
    });
    return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
  }

  // Build full similarity matrix
  _computeCosineSimilarity() {
    const n = this.movies.length;
    const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) { matrix[i][j] = 1; continue; }
        matrix[i][j] = this._cosine(this.tfidfMatrix[i], this.tfidfMatrix[j]);
      }
    }
    return matrix;
  }

  // Get similar movies by movie ID
  getSimilar(movieId, topN = 5) {
    const idx = this.movies.findIndex(m => m.id === movieId);
    if (idx === -1) return [];
    const scores = this.similarityMatrix[idx]
      .map((score, i) => ({ movie: this.movies[i], score }))
      .filter((_, i) => i !== idx)
      .sort((a, b) => b.score - a.score);
    return scores.slice(0, topN).map(s => ({ ...s.movie, similarity: Math.round(s.score * 100) }));
  }

  // Get recommendations by genre
  getByGenre(genre, excludeId = null, topN = 6) {
    return this.movies
      .filter(m => m.genres.includes(genre) && m.id !== excludeId)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, topN);
  }

  // Get recommendations by director
  getByDirector(director, excludeId = null) {
    return this.movies
      .filter(m => m.director === director && m.id !== excludeId)
      .sort((a, b) => b.rating - a.rating);
  }

  // Get recommendations by cast member
  getByCast(actor, excludeId = null) {
    return this.movies
      .filter(m => m.cast.includes(actor) && m.id !== excludeId)
      .sort((a, b) => b.rating - a.rating);
  }

  // Collaborative-style: based on user's watched/rated movies
  getPersonalized(watchlist, ratings, topN = 8) {
    if (!watchlist.length) return this.getTrending(topN);
    const scores = {};
    watchlist.forEach(wid => {
      const similar = this.getSimilar(wid, 10);
      similar.forEach(m => {
        if (!watchlist.includes(m.id)) {
          scores[m.id] = (scores[m.id] || 0) + m.similarity * (ratings[wid] || 3);
        }
      });
    });
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([id]) => this.movies.find(m => m.id === parseInt(id)))
      .filter(Boolean);
  }

  // Trending (by popularity)
  getTrending(topN = 8) {
    return [...this.movies].sort((a, b) => b.popularity - a.popularity).slice(0, topN);
  }

  // Top rated
  getTopRated(topN = 8) {
    return [...this.movies].sort((a, b) => b.rating - a.rating).slice(0, topN);
  }

  // Search
  search(query) {
    const q = query.toLowerCase();
    return this.movies.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.director.toLowerCase().includes(q) ||
      m.cast.some(c => c.toLowerCase().includes(q)) ||
      m.genres.some(g => g.toLowerCase().includes(q)) ||
      m.tags.some(t => t.toLowerCase().includes(q))
    );
  }
}

// Initialize engine
const engine = new RecommendationEngine(MOVIES_DB);

// Export
window.MOVIES_DB = MOVIES_DB;
window.DEFAULT_USERS = DEFAULT_USERS;
window.engine = engine;
