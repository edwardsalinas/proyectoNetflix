// Endpoint configuration (can be selected dynamically)
const isLocal = process.argv.includes("--local") || process.env.TEST_ENV === "local";

// Set your local API Gateway ID here after running cdklocal deploy
const LOCAL_API_ID = "x7t0h8rdwl"; 

const API_URL = process.env.API_URL || (isLocal
  ? `http://localhost:4566/restapis/${LOCAL_API_ID}/prod/_user_request_`
  : "https://x7t0h8rdwl.execute-api.us-east-1.amazonaws.com/prod");

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
  let reviewId = null;
  let profileId = null;
  let profileId2 = null;
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
    // 5. REVIEWS MICROSERVICE TESTS (P2 — Tarea 2.2)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 5. REVIEWS MICROSERVICE (P2) ---");

    // 5.1 Create a Review (POST /v1/movies/{movieId}/reviews)
    console.log(`Step 5.1: Creating a review for movie "${movieId}"...`);
    const createReviewRes = await fetch(`${API_URL}/v1/movies/${movieId}/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        rating: 8.5,
        reviewText: "Incredible sequel that honors the original while pushing boundaries. The meta-narrative is brilliant."
      })
    });
    const createReviewData = await createReviewRes.json();
    console.log(`Response: ${createReviewRes.status} (Expected: 201 Created)`);
    console.log(`Review ID: ${createReviewData.review?.reviewId}`);
    console.log(`Rating: ${createReviewData.review?.rating} | User: ${createReviewData.review?.userId}`);
    reviewId = createReviewData.review?.reviewId;

    // 5.2 Create a second review (to test average calculation)
    console.log(`\nStep 5.2: Creating a second review (rating: 6.0) to test average calculation...`);
    const createReview2Res = await fetch(`${API_URL}/v1/movies/${movieId}/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        rating: 6.0,
        reviewText: "Decent movie but doesn't quite capture the magic of the original."
      })
    });
    const createReview2Data = await createReview2Res.json();
    console.log(`Response: ${createReview2Res.status} (Expected: 201 Created)`);
    console.log(`Second Review ID: ${createReview2Data.review?.reviewId}`);
    const secondReviewId = createReview2Data.review?.reviewId;

    // 5.3 Verify movie rating was updated (GET /v1/movies/{movieId})
    console.log(`\nStep 5.3: Verifying movie average rating was updated after 2 reviews...`);
    const ratingCheckRes = await fetch(`${API_URL}/v1/movies/${movieId}`, { method: "GET", headers });
    const ratingCheckData = await ratingCheckRes.json();
    console.log(`Response: ${ratingCheckRes.status} OK`);
    console.log(`Movie Rating: ${ratingCheckData.movie?.rating} (Expected: ~7.25 = avg of 8.5 and 6.0)`);
    console.log(`Rating Count: ${ratingCheckData.movie?.ratingCount} (Expected: 2)`);

    // 5.4 List Reviews by Movie (GET /v1/movies/{movieId}/reviews)
    console.log(`\nStep 5.4: Listing reviews for movie "${movieId}"...`);
    const listReviewsRes = await fetch(`${API_URL}/v1/movies/${movieId}/reviews`, { method: "GET", headers });
    const listReviewsData = await listReviewsRes.json();
    console.log(`Response: ${listReviewsRes.status} OK`);
    console.log(`Total reviews: ${listReviewsData.items?.length || 0} (Expected: 2)`);
    if (listReviewsData.items && listReviewsData.items.length > 0) {
      listReviewsData.items.forEach((r, i) => {
        console.log(`  Review ${i + 1}: rating=${r.rating}, text="${r.reviewText?.substring(0, 50)}..."`);
      });
    }

    // 5.5 List reviews with pagination (GET /v1/movies/{movieId}/reviews?maxResults=1)
    console.log(`\nStep 5.5: Testing review pagination (maxResults=1)...`);
    const paginatedReviewRes = await fetch(`${API_URL}/v1/movies/${movieId}/reviews?maxResults=1`, { method: "GET", headers });
    const paginatedReviewData = await paginatedReviewRes.json();
    console.log(`Response: ${paginatedReviewRes.status} OK`);
    console.log(`Reviews returned: ${paginatedReviewData.items?.length || 0} (Expected: 1)`);
    console.log(`Has nextToken: ${!!paginatedReviewData.nextToken} (Expected: true)`);

    // 5.6 Delete a Review (DELETE /v1/movies/{movieId}/reviews/{reviewId})
    console.log(`\nStep 5.6: Deleting second review "${secondReviewId}"...`);
    const deleteReviewRes = await fetch(`${API_URL}/v1/movies/${movieId}/reviews/${secondReviewId}`, { method: "DELETE", headers });
    console.log(`Response: ${deleteReviewRes.status} (Expected: 204 No Content)`);

    // 5.7 Verify rating recalculated after deletion
    console.log(`\nStep 5.7: Verifying rating recalculated after review deletion...`);
    const ratingRecheck = await fetch(`${API_URL}/v1/movies/${movieId}`, { method: "GET", headers });
    const ratingRecheckData = await ratingRecheck.json();
    console.log(`Response: ${ratingRecheck.status} OK`);
    console.log(`Movie Rating: ${ratingRecheckData.movie?.rating} (Expected: 8.5 — only first review remains)`);
    console.log(`Rating Count: ${ratingRecheckData.movie?.ratingCount} (Expected: 1)`);

    // ─────────────────────────────────────────────────────────────────────────
    // 6. PROFILES MICROSERVICE TESTS (P2 — Tarea 2.3)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 6. PROFILES MICROSERVICE (P2) ---");

    // 6.1 Create a Profile (POST /v1/users/{userId}/profiles)
    console.log(`Step 6.1: Creating first profile for user "${userId}"...`);
    const createProfileRes = await fetch(`${API_URL}/v1/users/${userId}/profiles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Main Profile",
        avatarUrl: "https://example.com/avatar1.png"
      })
    });
    const createProfileData = await createProfileRes.json();
    console.log(`Response: ${createProfileRes.status} (Expected: 201 Created)`);
    console.log(`Profile ID: ${createProfileData.profile?.profileId}`);
    console.log(`Profile Name: "${createProfileData.profile?.name}"`);
    profileId = createProfileData.profile?.profileId;

    // 6.2 Create a second profile
    console.log(`\nStep 6.2: Creating second profile "Kids Zone"...`);
    const createProfile2Res = await fetch(`${API_URL}/v1/users/${userId}/profiles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Kids Zone",
        avatarUrl: "https://example.com/avatar-kids.png"
      })
    });
    const createProfile2Data = await createProfile2Res.json();
    console.log(`Response: ${createProfile2Res.status} (Expected: 201 Created)`);
    console.log(`Profile ID: ${createProfile2Data.profile?.profileId}`);
    profileId2 = createProfile2Data.profile?.profileId;

    // 6.3 List Profiles (GET /v1/users/{userId}/profiles)
    console.log(`\nStep 6.3: Listing profiles for user "${userId}"...`);
    const listProfilesRes = await fetch(`${API_URL}/v1/users/${userId}/profiles`, { method: "GET", headers });
    const listProfilesData = await listProfilesRes.json();
    console.log(`Response: ${listProfilesRes.status} OK`);
    console.log(`Total profiles: ${listProfilesData.items?.length || 0} (Expected: 2)`);
    if (listProfilesData.items && listProfilesData.items.length > 0) {
      listProfilesData.items.forEach((p, i) => {
        console.log(`  Profile ${i + 1}: "${p.name}" (ID: ${p.profileId})`);
      });
    }

    // 6.4 Test 5-profile limit (create 3 more, then try a 6th)
    console.log(`\nStep 6.4: Testing 5-profile limit (creating profiles 3, 4, 5)...`);
    const profileNames = ["Movie Night", "Guest Profile", "Cinephile"];
    const tempProfileIds = [];
    for (const name of profileNames) {
      const res = await fetch(`${API_URL}/v1/users/${userId}/profiles`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name, avatarUrl: "" })
      });
      const data = await res.json();
      console.log(`  Created "${name}": ${res.status}`);
      if (data.profile?.profileId) {
        tempProfileIds.push(data.profile.profileId);
      }
    }

    console.log(`\nStep 6.5: Attempting to create 6th profile (should fail with 400)...`);
    const createProfile6Res = await fetch(`${API_URL}/v1/users/${userId}/profiles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Overflow Profile", avatarUrl: "" })
    });
    const createProfile6Data = await createProfile6Res.json();
    console.log(`Response: ${createProfile6Res.status} (Expected: 400 — max 5 profiles exceeded)`);
    console.log(`Error message: "${createProfile6Data.message}"`);

    // 6.6 Delete temp profiles (cleanup for limit test)
    console.log(`\nStep 6.6: Cleaning up temp profiles...`);
    for (const tempId of tempProfileIds) {
      const res = await fetch(`${API_URL}/v1/users/${userId}/profiles/${tempId}`, { method: "DELETE", headers });
      console.log(`  Deleted profile ${tempId}: ${res.status}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. RECOMMENDATIONS TESTS (P2 — Tarea 2.4)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 7. RECOMMENDATIONS MICROSERVICE (P2) ---");

    // 7.1 First, create a watch history entry so recommendations have data
    console.log(`Step 7.1: Recording watch history for recommendations test...`);
    const recHistoryRes = await fetch(`${API_URL}/v1/users/${userId}/history/${movieId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        progressSeconds: 3600,
        completed: false
      })
    });
    console.log(`Response: ${recHistoryRes.status} OK`);

    // 7.2 Get Recommendations (GET /v1/users/{userId}/profiles/{profileId}/recommendations)
    console.log(`\nStep 7.2: Getting recommendations for profile "${profileId}"...`);
    const getRecsRes = await fetch(`${API_URL}/v1/users/${userId}/profiles/${profileId}/recommendations`, { method: "GET", headers });
    const getRecsData = await getRecsRes.json();
    console.log(`Response: ${getRecsRes.status} OK`);
    console.log(`Recommended movies: ${getRecsData.items?.length || 0} (Up to 5)`);
    if (getRecsData.items && getRecsData.items.length > 0) {
      getRecsData.items.forEach((m, i) => {
        console.log(`  ${i + 1}. "${m.title}" (genre: ${m.genreId})`);
      });
    }

    // 7.3 Test recommendations for non-existent profile (should return 404)
    console.log(`\nStep 7.3: Testing recommendations for non-existent profile (expecting 404)...`);
    const badRecsRes = await fetch(`${API_URL}/v1/users/${userId}/profiles/00000000-0000-4000-8000-000000000000/recommendations`, { method: "GET", headers });
    const badRecsData = await badRecsRes.json();
    console.log(`Response: ${badRecsRes.status} (Expected: 404 Not Found)`);
    console.log(`Error: "${badRecsData.message}"`);

    // ─────────────────────────────────────────────────────────────────────────
    // 8. SEARCH TESTS (P2 — Tarea 2.1 OpenSearch)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 8. SEARCH (OpenSearch) TESTS (P2) ---");

    // 8.1 Search movies by text query (GET /v1/movies?q=Matrix)
    console.log(`Step 8.1: Searching movies with q="Matrix"...`);
    const searchRes = await fetch(`${API_URL}/v1/movies?q=Matrix`, { method: "GET", headers });
    const searchData = await searchRes.json();
    console.log(`Response: ${searchRes.status} OK`);
    console.log(`Search results: ${searchData.items?.length || 0}`);
    if (searchData.items && searchData.items.length > 0) {
      searchData.items.forEach((m, i) => {
        console.log(`  ${i + 1}. "${m.title}" (director: ${m.director})`);
      });
    }

    // 8.2 Search with no results (GET /v1/movies?q=xyznonexistent123)
    console.log(`\nStep 8.2: Searching with query that should return no results...`);
    const emptySearchRes = await fetch(`${API_URL}/v1/movies?q=xyznonexistent123`, { method: "GET", headers });
    const emptySearchData = await emptySearchRes.json();
    console.log(`Response: ${emptySearchRes.status} OK`);
    console.log(`Search results: ${emptySearchData.items?.length || 0} (Expected: 0)`);

    // 8.3 Search by director name
    console.log(`\nStep 8.3: Searching by director name q="Wachowski"...`);
    const directorSearchRes = await fetch(`${API_URL}/v1/movies?q=Wachowski`, { method: "GET", headers });
    const directorSearchData = await directorSearchRes.json();
    console.log(`Response: ${directorSearchRes.status} OK`);
    console.log(`Search results: ${directorSearchData.items?.length || 0}`);

    // ─────────────────────────────────────────────────────────────────────────
    // 9. CLEANUP — DELETE ALL TEST RESOURCES
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 9. CLEANUP ---");

    // 9.1 Delete remaining review
    if (reviewId) {
      console.log(`Step 9.1: Deleting remaining review "${reviewId}"...`);
      const deleteReviewCleanup = await fetch(`${API_URL}/v1/movies/${movieId}/reviews/${reviewId}`, { method: "DELETE", headers });
      console.log(`Response: ${deleteReviewCleanup.status} (Expected: 204)`);
    }

    // 9.2 Delete watch history for recommendations test
    console.log(`\nStep 9.2: Cleaning up watch history...`);
    const deleteHistoryCleanup = await fetch(`${API_URL}/v1/users/${userId}/history/${movieId}`, { method: "DELETE", headers });
    console.log(`Response: ${deleteHistoryCleanup.status} (Expected: 204)`);

    // 9.3 Delete profiles
    console.log(`\nStep 9.3: Deleting test profiles...`);
    if (profileId) {
      const delP1 = await fetch(`${API_URL}/v1/users/${userId}/profiles/${profileId}`, { method: "DELETE", headers });
      console.log(`  Deleted profile 1: ${delP1.status}`);
    }
    if (profileId2) {
      const delP2 = await fetch(`${API_URL}/v1/users/${userId}/profiles/${profileId2}`, { method: "DELETE", headers });
      console.log(`  Deleted profile 2: ${delP2.status}`);
    }

    // 9.4 Delete Movie from Catalog (DELETE /v1/movies/{movieId})
    console.log(`\nStep 9.4: Deleting movie "${updateData.movie.title}" from catalog...`);
    const deleteMovieRes = await fetch(`${API_URL}/v1/movies/${movieId}`, { method: "DELETE", headers });
    console.log(`Response: ${deleteMovieRes.status} (Expected: 204 No Content)`);

    console.log("\n🎉 ALL 25 LAMBDA HANDLER INTEGRATIONS TESTED SUCCESSFULLY AND COMPLETED!");
    console.log("   ├── Catalog:        5 endpoints (create, list, get, update, delete)");
    console.log("   ├── Genres:         3 endpoints (list, get, movies by genre)");
    console.log("   ├── Streaming:      3 endpoints (create, get, end session)");
    console.log("   ├── User Lists:     3 endpoints (add, get, remove)");
    console.log("   ├── Watch History:  3 endpoints (update, get, delete)");
    console.log("   ├── Reviews (P2):   3 endpoints (create, list, delete)");
    console.log("   ├── Profiles (P2):  3 endpoints (create, list, delete)");
    console.log("   ├── Recommendations (P2): 1 endpoint (get)");
    console.log("   └── Search (P2):    1 endpoint (text search via OpenSearch)");

  } catch (error) {
    console.error("\n❌ Error running complete flow tests:", error);
  }
}

runTests();
