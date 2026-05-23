import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../shared/dynamodb";

const TABLE_MOVIES = process.env.TABLE_MOVIES;
const TABLE_VIDEO_ASSETS = process.env.TABLE_VIDEO_ASSETS;
const BUCKET_TRANSCODED_VIDEOS = process.env.BUCKET_TRANSCODED_VIDEOS;

const s3Client = new S3Client({});

export const handler = async (event: any) => {
  console.log("Received S3 upload event:", JSON.stringify(event, null, 2));

  try {
    for (const record of event.Records || []) {
      const bucketName = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

      console.log(`Processing upload from bucket: ${bucketName}, key: ${key}`);

      // Extract movieId from the key.
      // Expected key format: "movies/{movieId}/video.mp4" or "{movieId}.mp4"
      let movieId = "";
      if (key.startsWith("movies/")) {
        const parts = key.split("/");
        movieId = parts[1];
      } else {
        movieId = key.replace(".mp4", "");
      }

      if (!movieId) {
        console.warn(`Could not extract movieId from key: ${key}`);
        continue;
      }

      console.log(`Resolved movieId: ${movieId}`);

      // Verify the movie exists in the database
      const movieResult = await ddbDocClient.send(
        new GetCommand({
          TableName: TABLE_MOVIES,
          Key: { movieId },
        })
      );

      if (!movieResult.Item) {
        console.warn(`Movie with ID ${movieId} not found in DynamoDB. Skipping.`);
        continue;
      }

      console.log(`Found movie: ${movieResult.Item.title}. Simulating transcode...`);

      // Mock transcoding: Generate playlist manifest and upload to S3 transcoded bucket.
      // The manifest points to a public HLS stream to make streaming 100% playable.
      const playlistContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=1280x720
https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8`;

      const manifestKey = `movies/${movieId}/playlist.m3u8`;
      
      console.log(`Uploading mock playlist to S3: ${BUCKET_TRANSCODED_VIDEOS}/${manifestKey}`);
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_TRANSCODED_VIDEOS,
          Key: manifestKey,
          Body: playlistContent,
          ContentType: "application/x-mpegURL",
        })
      );

      // Register video asset qualities in DynamoDB video_assets
      const qualities = ["480p", "720p", "1080p"];
      for (const quality of qualities) {
        await ddbDocClient.send(
          new PutCommand({
            TableName: TABLE_VIDEO_ASSETS,
            Item: {
              movieId,
              quality,
              hlsPlaylistUrl: `https://${BUCKET_TRANSCODED_VIDEOS}.s3.amazonaws.com/${manifestKey}`,
              fileSizeBytes: 104857600, // mock 100MB
              bitrateKbps: quality === "1080p" ? 5000 : quality === "720p" ? 2500 : 1000,
              createdAt: new Date().toISOString(),
            },
          })
        );
      }

      // Update movie status in DynamoDB to "ready"
      console.log(`Updating movie status to ready in DynamoDB...`);
      const updatedMovie = {
        ...movieResult.Item,
        videoStatus: "ready",
        updatedAt: new Date().toISOString(),
      };

      await ddbDocClient.send(
        new PutCommand({
          TableName: TABLE_MOVIES,
          Item: updatedMovie,
        })
      );

      console.log(`Movie ${movieId} is now successfully transcoded and ready for streaming.`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Transcode trigger executed successfully" }),
    };
  } catch (error) {
    console.error("Error in triggerTranscode handler:", error);
    throw error;
  }
};
