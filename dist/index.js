import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json());
// In-memory storage (replace with DB in production)
const movies = new Map();
const genres = new Map();
const userLists = new Map();
const watchHistory = new Map();
const streamSessions = new Map();
// Initialize sample data
function initializeSampleData() {
    genres.set('action', { genreId: 'action', name: 'Action' });
    genres.set('drama', { genreId: 'drama', name: 'Drama' });
    genres.set('sci-fi', { genreId: 'sci-fi', name: 'Science Fiction' });
    genres.set('comedy', { genreId: 'comedy', name: 'Comedy' });
}
// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred',
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// MOVIE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────
// Create Movie
app.post('/movies', (req, res) => {
    try {
        const input = req.body;
        // Validation
        if (!input.title || !input.synopsis || !input.genreId || !input.director || !input.releaseYear || !input.durationMinutes) {
            res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: 'Missing required fields',
            });
            return;
        }
        // Verify genre exists
        if (!genres.has(input.genreId)) {
            res.status(404).json({
                code: 'NOT_FOUND',
                message: `Genre '${input.genreId}' not found`,
            });
            return;
        }
        const movieId = uuidv4();
        const movie = {
            movieId,
            title: input.title,
            synopsis: input.synopsis,
            genreId: input.genreId,
            director: input.director,
            releaseYear: input.releaseYear,
            durationMinutes: input.durationMinutes,
            rating: input.rating,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        movies.set(movieId, movie);
        res.status(201).json(movie);
    }
    catch (error) {
        res.status(500).json({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create movie',
        });
    }
});
// Get Movie
app.get('/movies/:movieId', (req, res) => {
    const { movieId } = req.params;
    const movie = movies.get(movieId);
    if (!movie) {
        res.status(404).json({
            code: 'NOT_FOUND',
            message: `Movie '${movieId}' not found`,
        });
        return;
    }
    res.json(movie);
});
// List Movies
app.get('/movies', (req, res) => {
    const input = req.query;
    const movieList = Array.from(movies.values());
    const maxResults = input.maxResults || 10;
    const startIdx = 0; // Simplified pagination
    const paginatedMovies = movieList.slice(startIdx, startIdx + maxResults);
    const response = {
        movies: paginatedMovies,
        nextToken: paginatedMovies.length < movieList.length ? 'next-page' : undefined,
    };
    res.json(response);
});
// Update Movie
app.put('/movies/:movieId', (req, res) => {
    const { movieId } = req.params;
    const input = req.body;
    const movie = movies.get(movieId);
    if (!movie) {
        res.status(404).json({
            code: 'NOT_FOUND',
            message: `Movie '${movieId}' not found`,
        });
        return;
    }
    // Verify genre if being updated
    if (input.genreId && !genres.has(input.genreId)) {
        res.status(404).json({
            code: 'NOT_FOUND',
            message: `Genre '${input.genreId}' not found`,
        });
        return;
    }
    const updatedMovie = {
        ...movie,
        ...input,
        updatedAt: new Date(),
    };
    movies.set(movieId, updatedMovie);
    res.json(updatedMovie);
});
// Delete Movie
app.delete('/movies/:movieId', (req, res) => {
    const { movieId } = req.params;
    if (!movies.has(movieId)) {
        res.status(404).json({
            code: 'NOT_FOUND',
            message: `Movie '${movieId}' not found`,
        });
        return;
    }
    movies.delete(movieId);
    res.status(204).send();
});
// ─────────────────────────────────────────────────────────────────────────────
// GENRE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────
// List Genres
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get('/genres', (req, res) => {
    const genreList = Array.from(genres.values());
    res.json({ genres: genreList });
});
// Get Genre
app.get('/genres/:genreId', (req, res) => {
    const { genreId } = req.params;
    const genre = genres.get(genreId);
    if (!genre) {
        res.status(404).json({
            code: 'NOT_FOUND',
            message: `Genre '${genreId}' not found`,
        });
        return;
    }
    res.json(genre);
});
// ─────────────────────────────────────────────────────────────────────────────
// USER LIST OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────
// Create User List
app.post('/user-lists', (req, res) => {
    try {
        const input = req.body;
        if (!input.name) {
            res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: 'List name is required',
            });
            return;
        }
        const listId = uuidv4();
        const userList = {
            userListId: listId,
            name: input.name,
            movies: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        userLists.set(listId, userList);
        res.status(201).json(userList);
    }
    catch (error) {
        res.status(500).json({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user list',
        });
    }
});
// Get User List
app.get('/user-lists/:userListId', (req, res) => {
    const { userListId } = req.params;
    const userList = userLists.get(userListId);
    if (!userList) {
        res.status(404).json({
            code: 'NOT_FOUND',
            message: `User list '${userListId}' not found`,
        });
        return;
    }
    res.json(userList);
});
// Update User List
app.put('/user-lists/:userListId', (req, res) => {
    const { userListId } = req.params;
    const input = req.body;
    const userList = userLists.get(userListId);
    if (!userList) {
        res.status(404).json({
            code: 'NOT_FOUND',
            message: `User list '${userListId}' not found`,
        });
        return;
    }
    const updatedList = {
        ...userList,
        ...(input.name && { name: input.name }),
        ...(input.movies && { movies: input.movies }),
        updatedAt: new Date(),
    };
    userLists.set(userListId, updatedList);
    res.json(updatedList);
});
// Delete User List
app.delete('/user-lists/:userListId', (req, res) => {
    const { userListId } = req.params;
    if (!userLists.has(userListId)) {
        res.status(404).json({
            code: 'NOT_FOUND',
            message: `User list '${userListId}' not found`,
        });
        return;
    }
    userLists.delete(userListId);
    res.status(204).send();
});
// ─────────────────────────────────────────────────────────────────────────────
// WATCH HISTORY OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────
// Record Watch
app.post('/watch-history', (req, res) => {
    try {
        const { movieId, durationWatched } = req.body;
        if (!movieId) {
            res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: 'movieId is required',
            });
            return;
        }
        if (!movies.has(movieId)) {
            res.status(404).json({
                code: 'NOT_FOUND',
                message: `Movie '${movieId}' not found`,
            });
            return;
        }
        const entry = {
            movieId,
            watchedAt: new Date(),
            durationWatched,
        };
        const history = watchHistory.get('default') || [];
        history.push(entry);
        watchHistory.set('default', history);
        res.status(201).json(entry);
    }
    catch (error) {
        res.status(500).json({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to record watch history',
        });
    }
});
// List Watch History
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get('/watch-history', (req, res) => {
    const history = watchHistory.get('default') || [];
    const response = {
        entries: history,
    };
    res.json(response);
});
// ─────────────────────────────────────────────────────────────────────────────
// STREAM SESSION OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────
// Initiate Stream
app.post('/stream-sessions', (req, res) => {
    try {
        const input = req.body;
        if (!input.movieId) {
            res.status(400).json({
                code: 'VALIDATION_ERROR',
                message: 'movieId is required',
            });
            return;
        }
        if (!movies.has(input.movieId)) {
            res.status(404).json({
                code: 'NOT_FOUND',
                message: `Movie '${input.movieId}' not found`,
            });
            return;
        }
        const sessionId = uuidv4();
        const token = Buffer.from(`${sessionId}:${Date.now()}`).toString('base64');
        const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
        const session = {
            sessionId,
            movieId: input.movieId,
            token,
            expiresAt,
        };
        streamSessions.set(sessionId, session);
        res.status(201).json(session);
    }
    catch (error) {
        res.status(500).json({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to initiate stream',
        });
    }
});
// Get Stream Session
app.get('/stream-sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = streamSessions.get(sessionId);
    if (!session) {
        res.status(404).json({
            code: 'NOT_FOUND',
            message: `Stream session '${sessionId}' not found`,
        });
        return;
    }
    // Check if session is expired
    if (new Date() > session.expiresAt) {
        res.status(401).json({
            code: 'UNAUTHORIZED',
            message: 'Stream session has expired',
        });
        return;
    }
    res.json(session);
});
// Health check
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Root endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get('/', (req, res) => {
    res.json({
        name: 'Netflix Clone API',
        version: '1.0.0',
        endpoints: {
            movies: '/movies',
            genres: '/genres',
            userLists: '/user-lists',
            watchHistory: '/watch-history',
            streamSessions: '/stream-sessions',
            health: '/health',
        },
    });
});
// Initialize and start server
initializeSampleData();
app.listen(PORT, () => {
    console.log(`🎬 Netflix API server running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/`);
});
export default app;
//# sourceMappingURL=index.js.map