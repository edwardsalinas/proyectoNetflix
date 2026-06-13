import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../shared/dynamodb";
import { requireScope, validateUserOrAdmin } from "../shared/auth";
import { handleError, formatResponse } from "../shared/errors";
import { randomUUID } from "crypto";

const TABLE_PROFILES = process.env.TABLE_PROFILES;
const MAX_PROFILES_PER_USER = 5;

export const handler = async (event: any) => {
  try {
    // Validate scope
    requireScope(event, "mylist:write");

    const userId = event.pathParameters?.userId;
    if (!userId) {
      throw new Error("Validation: Missing userId in path parameters");
    }

    // Enforce owner or admin authorization
    validateUserOrAdmin(event, userId);

    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    } catch (parseError) {
      console.error("Failed to parse body:", event.body);
      throw new Error("Invalid JSON in request body");
    }

    const { name, avatarUrl } = body;
    if (!name) {
      throw new Error("Validation: Missing profile name in request body");
    }

    // 1. Check current profile count (max 5)
    const existingProfiles = await ddbDocClient.send(
      new QueryCommand({
        TableName: TABLE_PROFILES,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        Select: "COUNT",
      })
    );

    if ((existingProfiles.Count || 0) >= MAX_PROFILES_PER_USER) {
      throw new Error(`Validation: Maximum of ${MAX_PROFILES_PER_USER} profiles per user exceeded`);
    }

    // 2. Create the new profile
    const profileId = randomUUID();
    const now = new Date().toISOString();

    const profile = {
      userId,
      profileId,
      name,
      avatarUrl: avatarUrl || "",
      createdAt: now,
    };

    await ddbDocClient.send(
      new PutCommand({
        TableName: TABLE_PROFILES,
        Item: profile,
      })
    );

    return formatResponse(201, { profile });
  } catch (error) {
    return handleError(error);
  }
};
