import { GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../shared/dynamodb";
import { requireScope, validateUserOrAdmin } from "../shared/auth";
import { handleError, formatResponse } from "../shared/errors";

const TABLE_PROFILES = process.env.TABLE_PROFILES;

export const handler = async (event: any) => {
  try {
    // Validate scope
    requireScope(event, "mylist:write");

    const userId = event.pathParameters?.userId;
    const profileId = event.pathParameters?.profileId;
    if (!userId || !profileId) {
      throw new Error("Validation: Missing userId or profileId in path parameters");
    }

    // Enforce owner or admin authorization
    validateUserOrAdmin(event, userId);

    // 1. Verify profile exists and belongs to the user
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

    // 2. Delete the profile
    await ddbDocClient.send(
      new DeleteCommand({
        TableName: TABLE_PROFILES,
        Key: { userId, profileId },
      })
    );

    return formatResponse(204);
  } catch (error) {
    return handleError(error);
  }
};
