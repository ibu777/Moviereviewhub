import { useEffect, useMemo, useState } from 'react';
import { loadSavedRatings, mergeMoviesWithRatings, saveRatings } from './utils/reviewStorage';

function StarRating({ value, onRate }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate(star)}
          className={`text-xl transition ${star <= value ? 'text-yellow-400' : 'text-slate-600'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function App() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedRatings = loadSavedRatings();

    async function fetchMovies() {
      try {
        const searchResponse = await fetch('https://www.omdbapi.com/?s=movie&type=movie&apikey=trilogy');
        if (!searchResponse.ok) throw new Error('Failed to load movies');

        const searchData = await searchResponse.json();
        if (searchData.Response === 'False') throw new Error(searchData.Error || 'Unable to load movies');

        const movieIds = searchData.Search.slice(0, 4).map((movie) => movie.imdbID);
        const detailResponses = await Promise.all(
          movieIds.map((id) => fetch(`https://www.omdbapi.com/?i=${id}&plot=short&apikey=trilogy`))
        );

        const detailData = await Promise.all(detailResponses.map((response) => response.json()));
        const mappedMovies = detailData.map((movie, index) => ({
          id: movie.imdbID || `${index + 1}`,
          title: movie.Title || 'Untitled Movie',
          year: Number(movie.Year?.match(/\d{4}/)?.[0]) || 2020 + index,
          genre: movie.Genre?.split(',')[0] || 'Movie',
          poster: movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : `https://placehold.co/500x750?text=${encodeURIComponent(movie.Title || 'Movie')}`,
          description: movie.Plot || 'No description available.',
          cast: movie.Actors ? movie.Actors.split(',').slice(0, 3) : ['OMDb data', 'Movie review', 'Community'],
          releaseDate: movie.Released || 'Released info unavailable',
          rating: Number((4 + index * 0.2).toFixed(1)),
          userRating: 0,
        }));

        const moviesWithRatings = mergeMoviesWithRatings(mappedMovies, savedRatings);
        setMovies(moviesWithRatings);
        setSelectedMovie(moviesWithRatings[0] || null);
      } catch (err) {
        setError(err.message || 'Unable to load movies');
      } finally {
        setLoading(false);
      }
    }

    fetchMovies();
  }, []);

  const genres = useMemo(() => ['All', ...new Set(movies.map((movie) => movie.genre))], [movies]);
  const years = useMemo(() => ['All', ...new Set(movies.map((movie) => movie.year))], [movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const matchesSearch = movie.title.toLowerCase().includes(search.toLowerCase());
      const matchesGenre = selectedGenre === 'All' || movie.genre === selectedGenre;
      const matchesYear = selectedYear === 'All' || movie.year === Number(selectedYear);
      return matchesSearch && matchesGenre && matchesYear;
    });
  }, [movies, search, selectedGenre, selectedYear]);

  const handleRate = (movieId, rating) => {
    setMovies((prev) => {
      const updatedMovies = prev.map((movie) => (movie.id === movieId ? { ...movie, userRating: rating } : movie));
      const nextRatings = updatedMovies.reduce((acc, movie) => {
        acc[movie.id] = movie.userRating;
        return acc;
      }, {});
      saveRatings(nextRatings);
      return updatedMovies;
    });

    setSelectedMovie((prev) => (prev && prev.id === movieId ? { ...prev, userRating: rating } : prev));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h1 className="text-3xl font-bold">Movie Review App</h1>
          <p className="mt-2 text-slate-400">Browse movie data from OMDb</p>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          />

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          >
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre === 'All' ? 'All Genres' : genre}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year === 'All' ? 'All Years' : year}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {loading && <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-slate-300">Loading movies...</div>}
            {error && <div className="rounded-2xl border border-rose-700 bg-rose-950/50 p-6 text-rose-200">{error}</div>}
            {!loading && !error && filteredMovies.map((movie) => (
              <button
                key={movie.id}
                type="button"
                onClick={() => setSelectedMovie(movie)}
                className={`flex w-full flex-col overflow-hidden rounded-2xl border text-left sm:flex-row ${
                  selectedMovie?.id === movie.id
                    ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                    : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                <img src={movie.poster} alt={movie.title} className="h-48 w-full object-cover sm:h-auto sm:w-36" />
                <div className="flex-1 bg-slate-900/80 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{movie.title}</h2>
                    <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400">
                      {movie.genre}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{movie.year} • {movie.releaseDate}</p>
                  <p className="mt-3 text-sm text-slate-300">{movie.description}</p>
                </div>
              </button>
            ))}
          </div>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            {selectedMovie && (
              <>
                <img src={selectedMovie.poster} alt={selectedMovie.title} className="mb-4 h-72 w-full rounded-xl object-cover" />
                <h2 className="text-2xl font-semibold">{selectedMovie.title}</h2>
                <p className="mt-2 text-slate-400">{selectedMovie.genre} • {selectedMovie.year}</p>
                <p className="mt-4 text-sm leading-7 text-slate-300">{selectedMovie.description}</p>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Cast</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedMovie.cast.map((actor) => (
                      <span key={actor} className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Your Rating</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <StarRating value={selectedMovie.userRating} onRate={(rating) => handleRate(selectedMovie.id, rating)} />
                    <span className="text-sm text-slate-400">
                      {selectedMovie.userRating ? `${selectedMovie.userRating}/5` : 'Not rated yet'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    Average: <span className="text-yellow-400">{selectedMovie.rating.toFixed(1)} / 5</span>
                  </p>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export default App;