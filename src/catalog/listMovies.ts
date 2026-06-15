import { ScanCommand, QueryCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../shared/dynamodb";
import { requireScope } from "../shared/auth";
import { handleError, formatResponse } from "../shared/errors";
import { Client } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws";
import { defaultProvider } from "@aws-sdk/credential-provider-node";

const TABLE_MOVIES = process.env.TABLE_MOVIES;
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT;

let osClient: Client;

function getOpenSearchClient(): Client {
  if (!osClient) {
    osClient = new Client({
      ...AwsSigv4Signer({
        region: process.env.AWS_REGION || "us-east-1",
        getCredentials: () => {
          const credentialsProvider = defaultProvider();
          return credentialsProvider();
        },
      }),
      node: `https://${OPENSEARCH_ENDPOINT}`,
    });
  }
  return osClient;
}

export const handler = async (event: any) => {
  try {
    // Validate scope
    requireScope(event, "catalog:read");

    const queryParams = event.queryStringParameters || {};
    const genre = queryParams.genre;
    const director = queryParams.director;
    const year = queryParams.year ? parseInt(queryParams.year) : undefined;
    const q = queryParams.q;
    const nextToken = queryParams.nextToken;
    const maxResults = parseInt(queryParams.maxResults || "20");

    let exclusiveStartKey = undefined;
    if (nextToken) {
      exclusiveStartKey = JSON.parse(Buffer.from(nextToken, "base64").toString("utf-8"));
    }

    // When search query `q` is present, use OpenSearch for text search
    if (q) {
      try {
        const client = getOpenSearchClient();

        const searchResult = await client.search({
          index: "movies",
          body: {
            size: maxResults,
            query: {
              bool: {
                should: [
                  {
                    multi_match: {
                      query: q,
                      fields: ["title^3", "synopsis", "director^2"],
                      type: "best_fields",
                      fuzziness: "AUTO",
                    }
                  },
                  {
                    multi_match: {
                      query: q,
                      fields: ["title^3", "synopsis", "director^2"],
                      type: "phrase_prefix",
                    }
                  }
                ]
              }
            },
          },
        });

        const hits = searchResult.body.hits.hits || [];
        const movieIds = hits.map((hit: any) => hit._id);

        if (movieIds.length === 0) {
          return formatResponse(200, { items: [], nextToken: undefined });
        }

        // Batch-fetch full items from DynamoDB
        const keys = movieIds.map((id: string) => ({ movieId: id }));
        const batchResult = await ddbDocClient.send(
          new BatchGetCommand({
            RequestItems: {
              [TABLE_MOVIES!]: { Keys: keys },
            },
          })
        );

        const items = batchResult.Responses?.[TABLE_MOVIES!] || [];

        // Preserve OpenSearch relevance order
        const itemMap = new Map(items.map((item: any) => [item.movieId, item]));
        const orderedItems = movieIds
          .map((id: string) => itemMap.get(id))
          .filter((item: any) => item !== undefined);

        return formatResponse(200, {
          items: orderedItems,
          nextToken: undefined,
        });
      } catch (osError) {
        // Fallback to DynamoDB scan if OpenSearch is unavailable
        console.warn("OpenSearch query failed, falling back to DynamoDB scan:", osError);
        const result = await ddbDocClient.send(
          new ScanCommand({
            TableName: TABLE_MOVIES,
            FilterExpression: "contains(#title, :q)",
            ExpressionAttributeNames: { "#title": "title" },
            ExpressionAttributeValues: { ":q": q },
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
      }
    }

    let result;
    if (genre) {
      result = await ddbDocClient.send(
        new QueryCommand({
          TableName: TABLE_MOVIES,
          IndexName: "genre-index",
          KeyConditionExpression: "genreId = :genreId",
          ExpressionAttributeValues: { ":genreId": genre },
          Limit: maxResults,
          ExclusiveStartKey: exclusiveStartKey,
        })
      );
    } else if (director) {
      result = await ddbDocClient.send(
        new QueryCommand({
          TableName: TABLE_MOVIES,
          IndexName: "director-index",
          KeyConditionExpression: "director = :director",
          ExpressionAttributeValues: { ":director": director },
          Limit: maxResults,
          ExclusiveStartKey: exclusiveStartKey,
        })
      );
    } else if (year) {
      result = await ddbDocClient.send(
        new QueryCommand({
          TableName: TABLE_MOVIES,
          IndexName: "year-index",
          KeyConditionExpression: "releaseYear = :releaseYear",
          ExpressionAttributeValues: { ":releaseYear": year },
          Limit: maxResults,
          ExclusiveStartKey: exclusiveStartKey,
        })
      );
    } else {
      result = await ddbDocClient.send(
        new ScanCommand({
          TableName: TABLE_MOVIES,
          Limit: maxResults,
          ExclusiveStartKey: exclusiveStartKey,
        })
      );
    }

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
