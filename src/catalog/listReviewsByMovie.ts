import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../shared/dynamodb";
import { requireScope } from "../shared/auth";
import { handleError, formatResponse } from "../shared/errors";

const TABLE_REVIEWS = process.env.TABLE_REVIEWS;

export const handler = async (event: any) => {
  try {
    // Validate scope
    requireScope(event, "catalog:read");

    const movieId = event.pathParameters?.movieId;
    if (!movieId) {
      throw new Error("Validation: Missing movieId in path parameters");
    }

    const queryParams = event.queryStringParameters || {};
    const nextToken = queryParams.nextToken;
    const maxResults = parseInt(queryParams.maxResults || "20");

    let exclusiveStartKey = undefined;
    if (nextToken) {
      exclusiveStartKey = JSON.parse(Buffer.from(nextToken, "base64").toString("utf-8"));
    }

    const result = await ddbDocClient.send(
      new QueryCommand({
        TableName: TABLE_REVIEWS,
        KeyConditionExpression: "movieId = :movieId",
        ExpressionAttributeValues: {
          ":movieId": movieId,
        },
        ScanIndexForward: false, // Newest reviews first
        Limit: maxResults,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    let responseNextToken = undefined;
    if (result.LastEvaluatedKey) {
      responseNextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64");
    }

    return formatResponse(200, {
      items: result.Items || [],
      nextToken: responseNextToken,
    });
  } catch (error) {
    return handleError(error);
  }
};
