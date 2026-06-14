import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../shared/dynamodb";
import { requireScope, getAuthContext } from "../shared/auth";
import { handleError, formatResponse } from "../shared/errors";
import { randomUUID, createSign } from "crypto";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const TABLE_MOVIES = process.env.TABLE_MOVIES;
const TABLE_STREAM_SESSIONS = process.env.TABLE_STREAM_SESSIONS;

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || "cdn.netflix-clone.com";
const CLOUDFRONT_KEY_PAIR_ID = process.env.CLOUDFRONT_KEY_PAIR_ID;
const CLOUDFRONT_PRIVATE_KEY_SECRET_ARN = process.env.CLOUDFRONT_PRIVATE_KEY_SECRET_ARN;

const secretsClient = new SecretsManagerClient({});
let cachedPrivateKey: string | null = null;

async function getPrivateKey(): Promise<string> {
  if (cachedPrivateKey) return cachedPrivateKey;
  if (!CLOUDFRONT_PRIVATE_KEY_SECRET_ARN) {
    throw new Error("Missing environment variable: CLOUDFRONT_PRIVATE_KEY_SECRET_ARN");
  }
  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: CLOUDFRONT_PRIVATE_KEY_SECRET_ARN })
  );
  if (!response.SecretString) {
    throw new Error("SecretString is empty in private key secret");
  }
  cachedPrivateKey = response.SecretString;
  return response.SecretString;
}

function signUrl(resourceUrl: string, expiresEpoch: number, keyPairId: string, privateKey: string): string {
  // Generate wildcard resource URL for the movie directory (e.g. movies/m1/*)
  const wildcardResourceUrl = resourceUrl.substring(0, resourceUrl.lastIndexOf("/")) + "/*";

  const policy = JSON.stringify({
    Statement: [
      {
        Resource: wildcardResourceUrl,
        Condition: {
          DateLessThan: {
            "AWS:EpochTime": expiresEpoch,
          },
        },
      },
    ],
  });

  const safePolicy = Buffer.from(policy, "utf-8").toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "~")
    .replace(/=/g, "_");

  const sign = createSign("RSA-SHA1");
  sign.update(policy);
  const signature = sign.sign(privateKey, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "~")
    .replace(/=/g, "_");

  return `${resourceUrl}?Policy=${safePolicy}&Signature=${signature}&Key-Pair-Id=${keyPairId}`;
}

export const handler = async (event: any) => {
  try {
    // Validate scope and get auth context
    requireScope(event, "catalog:read");
    const auth = getAuthContext(event);

    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    } catch (parseError) {
      console.error("Failed to parse body:", event.body);
      throw new Error("Invalid JSON in request body");
    }
    
    const { movieId, preferredQuality } = body;
    if (!movieId) {
      throw new Error("Validation: Missing movieId in request body");
    }

    // 1. Verify movie exists
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

    // 2. Determine video quality
    const quality = preferredQuality || "1080p";

    // 3. Retrieve actual HLS playlist URL from DynamoDB video_assets if registered
    let playlistUrl = "";
    try {
      const assetResult = await ddbDocClient.send(
        new GetCommand({
          TableName: process.env.TABLE_VIDEO_ASSETS,
          Key: { movieId, quality },
        })
      );
      if (assetResult.Item && assetResult.Item.hlsPlaylistUrl) {
        playlistUrl = assetResult.Item.hlsPlaylistUrl;
      }
    } catch (dbErr) {
      console.warn("Failed to retrieve asset from video_assets table:", dbErr);
    }

    const now = new Date();
    const expiresDate = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours TTL
    const expiresEpoch = Math.floor(expiresDate.getTime() / 1000);

    // Map playlist URL to CloudFront distribution domain
    let resourceUrl = "";
    if (playlistUrl) {
      try {
        const urlObj = new URL(playlistUrl);
        resourceUrl = `https://${CLOUDFRONT_DOMAIN}${urlObj.pathname}`;
      } catch {
        resourceUrl = `https://${CLOUDFRONT_DOMAIN}/${playlistUrl.replace(/^\/+/, "")}`;
      }
    } else {
      resourceUrl = `https://${CLOUDFRONT_DOMAIN}/movies/${movieId}/${quality}/playlist.m3u8`;
    }

    // Sign the CloudFront URL using the private key
    let signedUrl = "";
    try {
      const privateKey = await getPrivateKey();
      if (CLOUDFRONT_KEY_PAIR_ID && privateKey && privateKey !== "MOCK_PRIVATE_KEY") {
        signedUrl = signUrl(resourceUrl, expiresEpoch, CLOUDFRONT_KEY_PAIR_ID, privateKey);
      } else {
        signedUrl = `${resourceUrl}?Expires=${expiresEpoch}&Signature=mock_sig_${randomUUID()}&Key-Pair-Id=K123456789`;
      }
    } catch (err) {
      console.warn("Failed to sign CloudFront URL, returning mock signed fallback:", err);
      signedUrl = `${resourceUrl}?Expires=${expiresEpoch}&Signature=mock_sig_${randomUUID()}&Key-Pair-Id=K123456789`;
    }

    const sessionId = randomUUID();

    const session = {
      sessionId,
      userId: auth.userId,
      movieId,
      signedUrl,
      quality,
      expiresAt: expiresDate.toISOString(),
      createdAt: now.toISOString(),
    };

    // 4. Save stream session in DynamoDB
    await ddbDocClient.send(
      new PutCommand({
        TableName: TABLE_STREAM_SESSIONS,
        Item: session,
      })
    );

    return formatResponse(201, {
      sessionId,
      signedUrl,
      quality,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    return handleError(error);
  }
};
