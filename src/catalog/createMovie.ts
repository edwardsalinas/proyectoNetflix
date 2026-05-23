import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../shared/dynamodb";
import { requireScope, requireRole } from "../shared/auth";
import { handleError, formatResponse } from "../shared/errors";
import { randomUUID } from "crypto";

const TABLE_MOVIES = process.env.TABLE_MOVIES;

export const handler = async (event: any) => {
  try {
    // Validate scope and role
    requireScope(event, "catalog:write");
    requireRole(event, ["content_admin", "super_admin"]);

    let body;
    try {
      // Handle both string and object body (API Gateway may pass already parsed)
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    } catch (parseError) {
      console.error("Failed to parse body:", event.body);
      throw new Error("Invalid JSON in request body");
    }
    
    const { title, synopsis, genreId, director, releaseYear, durationMinutes, posterUrl } = body;

    if (!title || !synopsis || !genreId || !director || !releaseYear || !durationMinutes) {
      throw new Error("Validation: Missing required fields (title, synopsis, genreId, director, releaseYear, durationMinutes)");
    }

    const movieId = randomUUID();
    const now = new Date().toISOString();

    const movie = {
      movieId,
      title,
      synopsis,
      genreId,
      director,
      releaseYear: parseInt(releaseYear),
      durationMinutes: parseInt(durationMinutes),
      posterUrl: posterUrl || "",
      videoStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };

    await ddbDocClient.send(
      new PutCommand({
        TableName: TABLE_MOVIES,
        Item: movie,
      })
    );

    return formatResponse(201, { movie });
  } catch (error) {
    return handleError(error);
  }
};
