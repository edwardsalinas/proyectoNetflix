import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Client } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws";
import { defaultProvider } from "@aws-sdk/credential-provider-node";

const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT;
const INDEX_NAME = "movies";

let client: Client;

function getClient(): Client {
  if (!client) {
    client = new Client({
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
  return client;
}

export const handler = async (event: any) => {
  const osClient = getClient();

  // Ensure the index exists
  try {
    const indexExists = await osClient.indices.exists({ index: INDEX_NAME });
    if (!indexExists.body) {
      await osClient.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              movieId: { type: "keyword" },
              title: { type: "text", analyzer: "standard" },
              synopsis: { type: "text", analyzer: "standard" },
              genreId: { type: "keyword" },
              director: { type: "text", analyzer: "standard" },
              releaseYear: { type: "integer" },
            },
          },
        },
      });
      console.log(`Index '${INDEX_NAME}' created successfully`);
    }
  } catch (indexError: any) {
    // Ignore if index already exists (race condition between stream events)
    if (indexError.statusCode !== 400) {
      console.error("Error checking/creating index:", indexError);
    }
  }

  for (const record of event.Records) {
    const eventName = record.eventName;
    const dynamoRecord = record.dynamodb;

    try {
      if (eventName === "INSERT" || eventName === "MODIFY") {
        const newImage = unmarshall(dynamoRecord.NewImage);

        const document = {
          movieId: newImage.movieId,
          title: newImage.title,
          synopsis: newImage.synopsis,
          genreId: newImage.genreId,
          director: newImage.director,
          releaseYear: newImage.releaseYear,
        };

        await osClient.index({
          index: INDEX_NAME,
          id: newImage.movieId,
          body: document,
          refresh: true,
        });

        console.log(`Indexed movie: ${newImage.movieId} (${eventName})`);
      } else if (eventName === "REMOVE") {
        const oldImage = unmarshall(dynamoRecord.OldImage);

        await osClient.delete({
          index: INDEX_NAME,
          id: oldImage.movieId,
          refresh: true,
        });

        console.log(`Deleted movie from index: ${oldImage.movieId}`);
      }
    } catch (error: any) {
      // Log but don't fail the entire batch — DynamoDB Streams will retry
      console.error(`Error processing ${eventName} for record:`, error);
    }
  }

  return { statusCode: 200, body: "OK" };
};
