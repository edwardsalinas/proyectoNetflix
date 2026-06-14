import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../shared/dynamodb";
import { requireScope, getAuthContext } from "../shared/auth";
import { handleError, formatResponse } from "../shared/errors";
import { randomUUID } from "crypto";

const TABLE_MOVIES = process.env.TABLE_MOVIES;
const TABLE_REVIEWS = process.env.TABLE_REVIEWS;

export const handler = async (event: any) => {
  try {
    // Validate scope
    requireScope(event, "catalog:write");

    const movieId = event.pathParameters?.movieId;
    if (!movieId) {
      throw new Error("Validation: Missing movieId in path parameters");
    }

    const auth = getAuthContext(event);

    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};

      console.log("createReview received body:", JSON.stringify(body));
    
    } catch (parseError) {
      console.error("Failed to parse body:", event.body);
      throw new Error("Invalid JSON in request body");
    }

    const { rating, reviewText, profileId, profileName } = body;
    if (rating === undefined || rating === null) {
      throw new Error("Validation: Missing rating in request body");
    }

    const ratingNum = parseFloat(rating);
    if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 10) {
      throw new Error("Validation: rating must be a number between 0 and 10");
    }

    // 1. Verify movie exists and get current rating data
    const movieResult = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_MOVIES,
        Key: { movieId },
      })
    );

    if (!movieResult.Item) {
      const error: any = new Error(`NotFound: Movie with ID '${movieId}' not found`);
      error.resourceType = "Movie";
      error.resourceId = movieId;
      throw error;
    }

    const currentRatingCount = movieResult.Item.ratingCount || 0;
    const currentRatingSum = (movieResult.Item.rating || 0) * currentRatingCount;
    const newRatingCount = currentRatingCount + 1;
    const newRatingAvg = (currentRatingSum + ratingNum) / newRatingCount;

    const reviewId = randomUUID();
    const now = new Date().toISOString();

    const review = {
      reviewId,
      movieId,
      userId: auth.userId,
      profileId: profileId || "",
      profileName: profileName || "",
      rating: ratingNum,
      reviewText: reviewText || "",
      createdAt: now,
    };

    // 2. Transactional write: insert review + update movie rating average
    await ddbDocClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_REVIEWS!,
              Item: review,
            },
          },
          {
            Update: {
              TableName: TABLE_MOVIES!,
              Key: { movieId },
              UpdateExpression: "SET rating = :newAvg, ratingCount = :newCount, updatedAt = :now",
              ExpressionAttributeValues: {
                ":newAvg": Math.round(newRatingAvg * 100) / 100,
                ":newCount": newRatingCount,
                ":now": now,
              },
            },
          },
        ],
      })
    );

    return formatResponse(201, { review });
  } catch (error) {
    return handleError(error);
  }
};
