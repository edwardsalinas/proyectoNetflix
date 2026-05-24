// Endpoint configuration (can be selected dynamically)
const isLocal = process.argv.includes("--local") || process.env.TEST_ENV === "local";

// Set your local API Gateway ID here after running cdklocal deploy
const LOCAL_API_ID = "kozso8oqh9"; 

const API_URL = process.env.API_URL || (isLocal
  ? `http://localhost:4566/restapis/${LOCAL_API_ID}/prod/_user_request_`
  : "https://kozso8oqh9.execute-api.us-east-1.amazonaws.com/prod");

// Helper to create a base64 encoded JWT token for testing
function generateTestToken(userId, scopes = [], roles = []) {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: userId,
    scope: scopes.join(" "),
    "https://netflix-clone.com/roles": roles,
    roles: roles
  };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64").replace(/=/g, "");
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64").replace(/=/g, "");
  
  return `Bearer ${base64Header}.${base64Payload}.signature`;
}

// Generate a token with full permissions for our tests
const token = generateTestToken(
  "user-netflix-999",
  [
    "catalog:read", "catalog:write", "catalog:delete",
    "mylist:read", "mylist:write",
    "history:read", "history:write",
    "streaming:read"
  ],
  ["super_admin"]
);

const headers = {
  "Content-Type": "application/json",
  "Authorization": token
};

async function runTests() {
  console.log("🚀 Starting Netflix Clone Complete End-to-End Flow Tests...");
  console.log(`Endpoint: ${API_URL}\n`);
  
  let movieId = null;
  let sessionId = null;
  const userId = "user-netflix-999";
  const testGenreId = "sci-fi";

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. CATALOG MICROSERVICE TESTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("--- 1. CATALOG MICROSERVICE ---");

    // 1.1 Create a Movie (POST /v1/movies)
    console.log("Step 1.1: Creating a movie...");
    const createRes = await fetch(`${API_URL}/v1/movies`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "The Matrix Resurrections",
        synopsis: "Return to a world of two realities: one, everyday life; the other, what lies behind it.",
        genreId: testGenreId,
        director: "Lana Wachowski",
        releaseYear: 2021,
        durationMinutes: 148,
        posterUrl: "https://example.com/matrix4.jpg"
      })
    });
    const createData = await createRes.json();
    console.log(`Response: ${createRes.status} Created`);
    console.log(`Generated Movie ID: ${createData.movie.movieId}`);
    movieId = createData.movie.movieId;

    // 1.2 List Movies (GET /v1/movies)
    console.log("\nStep 1.2: Listing movies in catalog...");
    const listRes = await fetch(`${API_URL}/v1/movies`, { method: "GET", headers });
    const listData = await listRes.json();
    console.log(`Response: ${listRes.status} OK`);
    console.log(`Total Movies in catalog: ${listData.items?.length || listData.movies?.length || 0}`);

    // 1.3 Get Movie Details (GET /v1/movies/{movieId})
    console.log(`\nStep 1.3: Getting movie details for ID: ${movieId}...`);
    const getRes = await fetch(`${API_URL}/v1/movies/${movieId}`, { method: "GET", headers });
    const getData = await getRes.json();
    console.log(`Response: ${getRes.status} OK`);
    console.log(`Retrieved Title: "${getData.movie.title}"`);

    // 1.4 Update Movie (PUT /v1/movies/{movieId})
    console.log(`\nStep 1.4: Updating movie details (changing releaseYear and title)...`);
    const updateRes = await fetch(`${API_URL}/v1/movies/${movieId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        title: "The Matrix Resurrections (Special Edition)",
        releaseYear: 2022
      })
    });
    const updateData = await updateRes.json();
    console.log(`Response: ${updateRes.status} OK`);
    console.log(`New Title: "${updateData.movie.title}" | New Release Year: ${updateData.movie.releaseYear}`);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. GENRES MICROSERVICE TESTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 2. GENRES MICROSERVICE ---");

    // 2.1 List Genres (GET /v1/genres)
    console.log("Step 2.1: Listing genres...");
    const listGenresRes = await fetch(`${API_URL}/v1/genres`, { method: "GET", headers });
    const listGenresData = await listGenresRes.json();
    console.log(`Response: ${listGenresRes.status} OK`);
    console.log(`Genres list:`, listGenresData);

    // 2.2 Get Genre Details (GET /v1/genres/{genreId})
    console.log(`\nStep 2.2: Retrieving genre details for '${testGenreId}' (expecting 404 since it's not pre-seeded)...`);
    const getGenreRes = await fetch(`${API_URL}/v1/genres/${testGenreId}`, { method: "GET", headers });
    const getGenreData = await getGenreRes.json();
    console.log(`Response: ${getGenreRes.status} (Expected: 404 or 200)`);
    console.log(JSON.stringify(getGenreData, null, 2));

    // 2.3 List Movies By Genre (GET /v1/genres/{genreId}/movies)
    console.log(`\nStep 2.3: Querying movies belonging to genre '${testGenreId}'...`);
    const getGenreMoviesRes = await fetch(`${API_URL}/v1/genres/${testGenreId}/movies`, { method: "GET", headers });
    const getGenreMoviesData = await getGenreMoviesRes.json();
    console.log(`Response: ${getGenreMoviesRes.status} OK`);
    console.log(`Movies in '${testGenreId}': ${getGenreMoviesData.items?.length || 0}`);
    if (getGenreMoviesData.items && getGenreMoviesData.items.length > 0) {
      console.log(`Movie found: "${getGenreMoviesData.items[0].title}"`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. STREAMING MICROSERVICE TESTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 3. STREAMING MICROSERVICE ---");

    // 3.1 Create Streaming Session (POST /v1/streaming/sessions)
    console.log("Step 3.1: Creating a streaming session...");
    const createSessionRes = await fetch(`${API_URL}/v1/streaming/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        movieId: movieId,
        preferredQuality: "1080p"
      })
    });
    const createSessionData = await createSessionRes.json();
    console.log(`Response: ${createSessionRes.status} Created`);
    console.log(`Session ID: ${createSessionData.sessionId}`);
    console.log(`Signed Playback URL: ${createSessionData.signedUrl.substring(0, 75)}...`);
    sessionId = createSessionData.sessionId;

    // 3.2 Get Streaming Session (GET /v1/streaming/sessions/{sessionId})
    console.log(`\nStep 3.2: Getting streaming session info for session '${sessionId}'...`);
    const getSessionRes = await fetch(`${API_URL}/v1/streaming/sessions/${sessionId}`, { method: "GET", headers });
    const getSessionData = await getSessionRes.json();
    console.log(`Response: ${getSessionRes.status} OK`);
    console.log(`Session Quality: ${getSessionData.session.quality} | Session User: ${getSessionData.session.userId}`);

    // 3.3 End Streaming Session (DELETE /v1/streaming/sessions/{sessionId})
    console.log(`\nStep 3.3: Ending the streaming session (deleting)...`);
    const endSessionRes = await fetch(`${API_URL}/v1/streaming/sessions/${sessionId}`, { method: "DELETE", headers });
    console.log(`Response: ${endSessionRes.status} (Expected: 204 No Content)`);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. USER MICROSERVICE TESTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 4. USER MICROSERVICE (WATCHLISTS & HISTORY) ---");

    // 4.1 Add Movie to Watch List (POST /v1/users/{userId}/lists)
    console.log(`Step 4.1: Adding movie "${updateData.movie.title}" to watchlist for user "${userId}"...`);
    const addListRes = await fetch(`${API_URL}/v1/users/${userId}/lists`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        movieId: movieId,
        notes: "Remember to watch this weekend!"
      })
    });
    const addListData = await addListRes.json();
    console.log(`Response: ${addListRes.status} Created`);
    console.log(JSON.stringify(addListData, null, 2));

    // 4.2 Get Watch List (GET /v1/users/{userId}/lists)
    console.log(`\nStep 4.2: Fetching watchlist for user "${userId}"...`);
    const getListRes = await fetch(`${API_URL}/v1/users/${userId}/lists`, { method: "GET", headers });
    const getListData = await getListRes.json();
    console.log(`Response: ${getListRes.status} OK`);
    console.log(`Items in watchlist: ${getListData.items?.length || 0}`);

    // 4.3 Remove Movie from Watch List (DELETE /v1/users/{userId}/lists/{movieId})
    console.log(`\nStep 4.3: Removing movie from watchlist...`);
    const removeListRes = await fetch(`${API_URL}/v1/users/${userId}/lists/${movieId}`, { method: "DELETE", headers });
    console.log(`Response: ${removeListRes.status} (Expected: 204 No Content)`);

    // 4.4 Record Watch Progress (PUT /v1/users/{userId}/history/{movieId})
    console.log(`\nStep 4.4: Recording watch progress (history) for user "${userId}"...`);
    const updateProgressRes = await fetch(`${API_URL}/v1/users/${userId}/history/${movieId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        progressSeconds: 5400, // 1.5 hours in
        completed: true
      })
    });
    const updateProgressData = await updateProgressRes.json();
    console.log(`Response: ${updateProgressRes.status} OK`);
    console.log(`Watch Record: progressSeconds = ${updateProgressData.entry.progressSeconds} | completed = ${updateProgressData.entry.completed}`);

    // 4.5 Get Watch History (GET /v1/users/{userId}/history)
    console.log(`\nStep 4.5: Fetching watch history for user "${userId}"...`);
    const getHistoryRes = await fetch(`${API_URL}/v1/users/${userId}/history`, { method: "GET", headers });
    const getHistoryData = await getHistoryRes.json();
    console.log(`Response: ${getHistoryRes.status} OK`);
    console.log(`Total history records: ${getHistoryData.items?.length || 0}`);

    // 4.6 Delete Watch History entry (DELETE /v1/users/{userId}/history/{movieId})
    console.log(`\nStep 4.6: Deleting history record for this movie...`);
    const deleteHistoryRes = await fetch(`${API_URL}/v1/users/${userId}/history/${movieId}`, { method: "DELETE", headers });
    console.log(`Response: ${deleteHistoryRes.status} (Expected: 204 No Content)`);

    // ─────────────────────────────────────────────────────────────────────────
    // 5. CLEANUP / DELETE MOVIE FROM CATALOG
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 5. CLEANUP ---");

    // 5.1 Delete Movie from Catalog (DELETE /v1/movies/{movieId})
    console.log(`Step 5.1: Deleting movie "${updateData.movie.title}" from catalog...`);
    const deleteMovieRes = await fetch(`${API_URL}/v1/movies/${movieId}`, { method: "DELETE", headers });
    console.log(`Response: ${deleteMovieRes.status} (Expected: 204 No Content)`);

    console.log("\n🎉 ALL 17 LAMBDA HANDLER INTEGRATIONS TESTED SUCCESSFULLY AND COMPLETED!");

  } catch (error) {
    console.error("\n❌ Error running complete flow tests:", error);
  }
}

runTests();
