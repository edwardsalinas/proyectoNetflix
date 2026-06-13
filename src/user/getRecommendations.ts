import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../shared/dynamodb";
import { requireScope, validateUserOrAdmin } from "../shared/auth";
import { handleError, formatResponse } from "../shared/errors";

const TABLE_MOVIES = process.env.TABLE_MOVIES;
const TABLE_WATCH_HISTORY = process.env.TABLE_WATCH_HISTORY;
const TABLE_PROFILES = process.env.TABLE_PROFILES;

export const handler = async (event: any) => {
  try {
    // Validate scope
    requireScope(event, "catalog:read");

    const userId = event.pathParameters?.userId;
    const profileId = event.pathParameters?.profileId;
    if (!userId || !profileId) {
      throw new Error("Validation: Missing userId or profileId in path parameters");
    }

    // Enforce owner or admin authorization
    validateUserOrAdmin(event, userId);

    // 1. Verify profile exists
    const profileResult = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_PROFILES,
        Key: { userId, profileId },
      })
    );

    if (!profileResult.Item) {
      const error: any = new Error(`NotFound: Profile with ID '${profileId}' not found`);
      error.resourceType = "Profile";
      error.resourceId = profileId;
      throw error;
    }

    // 2. Get watch history for this user to determine most-watched genre
    const historyResult = await ddbDocClient.send(
      new QueryCommand({
        TableName: TABLE_WATCH_HISTORY,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
    );

    const watchedMovies = historyResult.Items || [];

    if (watchedMovies.length === 0) {
      // No watch history — return popular movies from any genre
      const fallbackResult = await ddbDocClient.send(
        new QueryCommand({
          TableName: TABLE_MOVIES,
          IndexName: "genre-index",
          KeyConditionExpression: "genreId = :genreId",
          ExpressionAttributeValues: { ":genreId": "action" },
          Limit: 5,
        })
      );

      return formatResponse(200, {
        items: fallbackResult.Items || [],
      });
    }

    // 3. Count genres from watched movies
    const genreCount: Record<string, number> = {};
    const completedMovieIds = new Set<string>();

    for (const entry of watchedMovies) {
      if (entry.completed) {
        completedMovieIds.add(entry.movieId);
      }

      // Get movie details to find genre
      const movieResult = await ddbDocClient.send(
        new GetCommand({
          TableName: TABLE_MOVIES,
          Key: { movieId: entry.movieId },
          ProjectionExpression: "genreId",
        })
      );

      if (movieResult.Item?.genreId) {
        const genre = movieResult.Item.genreId;
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      }
    }

    // 4. Find the most-watched genre
    let topGenre = "";
    let maxCount = 0;
    for (const [genre, count] of Object.entries(genreCount)) {
      if (count > maxCount) {
        maxCount = count;
        topGenre = genre;
      }
    }

    if (!topGenre) {
      return formatResponse(200, { items: [] });
    }

    // 5. Query movies from the top genre
    const genreMoviesResult = await ddbDocClient.send(
      new QueryCommand({
        TableName: TABLE_MOVIES,
        IndexName: "genre-index",
        KeyConditionExpression: "genreId = :genreId",
        ExpressionAttributeValues: { ":genreId": topGenre },
        Limit: 20, // Fetch more to filter out completed ones
      })
    );

    // 6. Filter out movies the user has already completed
    const recommendations = (genreMoviesResult.Items || [])
      .filter((movie: any) => !completedMovieIds.has(movie.movieId))
      .slice(0, 5);

    return formatResponse(200, {
      items: recommendations,
    });
  } catch (error) {
    return handleError(error);
  }
};
