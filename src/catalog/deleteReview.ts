import { GetCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../shared/dynamodb";
import { requireScope, getAuthContext } from "../shared/auth";
import { handleError, formatResponse } from "../shared/errors";

const TABLE_MOVIES = process.env.TABLE_MOVIES;
const TABLE_REVIEWS = process.env.TABLE_REVIEWS;

export const handler = async (event: any) => {
  try {
    // Validate scope
    requireScope(event, "catalog:write");

    const movieId = event.pathParameters?.movieId;
    const reviewId = event.pathParameters?.reviewId;
    if (!movieId || !reviewId) {
      throw new Error("Validation: Missing movieId or reviewId in path parameters");
    }

    const auth = getAuthContext(event);

    // 1. Get the review to verify it exists and check ownership
    const reviewResult = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_REVIEWS,
        Key: { movieId, reviewId },
      })
    );

    if (!reviewResult.Item) {
      const error: any = new Error(`NotFound: Review with ID '${reviewId}' not found`);
      error.resourceType = "Review";
      error.resourceId = reviewId;
      throw error;
    }

    // Only the review author or a super_admin can delete
    const isOwner = reviewResult.Item.userId === auth.userId;
    const isAdmin = auth.roles.includes("super_admin");
    if (!isOwner && !isAdmin) {
      throw new Error("Forbidden: You are not authorized to delete this review");
    }

    const deletedRating = reviewResult.Item.rating || 0;

    // 2. Get current movie rating info to recalculate average
    const movieResult = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_MOVIES,
        Key: { movieId },
      })
    );

    if (movieResult.Item) {
      const currentRatingCount = movieResult.Item.ratingCount || 1;
      const currentRatingAvg = movieResult.Item.rating || 0;
      const currentRatingSum = currentRatingAvg * currentRatingCount;
      const newRatingCount = Math.max(0, currentRatingCount - 1);
      const newRatingAvg = newRatingCount > 0
        ? Math.round(((currentRatingSum - deletedRating) / newRatingCount) * 100) / 100
        : 0;

      const now = new Date().toISOString();

      // Transactional: delete review + update movie rating
      await ddbDocClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Delete: {
                TableName: TABLE_REVIEWS!,
                Key: { movieId, reviewId },
              },
            },
            {
              Update: {
                TableName: TABLE_MOVIES!,
                Key: { movieId },
                UpdateExpression: "SET rating = :newAvg, ratingCount = :newCount, updatedAt = :now",
                ExpressionAttributeValues: {
                  ":newAvg": newRatingAvg,
                  ":newCount": newRatingCount,
                  ":now": now,
                },
              },
            },
          ],
        })
      );
    } else {
      // Movie doesn't exist anymore, just delete the review
      await ddbDocClient.send(
        new DeleteCommand({
          TableName: TABLE_REVIEWS,
          Key: { movieId, reviewId },
        })
      );
    }

    return formatResponse(204);
  } catch (error) {
    return handleError(error);
  }
};
