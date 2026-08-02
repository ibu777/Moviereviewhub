const STORAGE_KEY = 'movie-review-ratings-v1'

export function loadSavedRatings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch (error) {
    console.error('Unable to load saved ratings', error)
    return {}
  }
}

export function saveRatings(ratings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings))
  } catch (error) {
    console.error('Unable to save ratings', error)
  }
}

export function mergeMoviesWithRatings(movies, savedRatings) {
  return movies.map((movie) => ({
    ...movie,
    userRating: savedRatings[movie.id] ?? movie.userRating ?? 0,
  }))
}
