process.env.AWS_PROFILE = "netflixdevuser";
const API_URL = "https://x7t0h8rdwl.execute-api.us-east-1.amazonaws.com/prod";
const BUCKET_RAW = "proyectonetflixinfrastack-rawvideosbucketae61e2e4-zcl2bfyqdmps";
const { execSync } = require("child_process");
const fs = require("fs");

function generateTestToken(userId, scopes = [], roles = []) {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: userId,
    scope: scopes.join(" "),
    "https://netflix-clone.com/roles": roles,
    roles: roles
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64").replace(/=/g, "");
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64").replace(/=/g, "");

  return `Bearer ${base64Header}.${base64Payload}.signature`;
}

const token = generateTestToken(
  "test-user-e2e",
  ["catalog:read", "catalog:write", "streaming:read"],
  ["super_admin"]
);

const headers = {
  "Content-Type": "application/json",
  "Authorization": token
};

async function runE2E() {
  console.log("🎬 Starting End-to-End Functional Test...");
  console.log(`API URL: ${API_URL}`);
  console.log(`Raw Video Bucket: ${BUCKET_RAW}\n`);

  try {
    // 1. Create Movie
    console.log("Step 1: Creating movie in catalog...");
    const createRes = await fetch(`${API_URL}/v1/movies`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Tears of Steel",
        synopsis: "A science fiction movie about mechanical giants and romance.",
        genreId: "sci-fi",
        director: "Ian Hubert",
        releaseYear: 2012,
        durationMinutes: 12
      })
    });

    if (createRes.status !== 201) {
      const errText = await createRes.text();
      throw new Error(`Failed to create movie: ${createRes.status} - ${errText}`);
    }

    const createData = await createRes.json();
    const movieId = createData.movie.movieId;
    console.log(`✅ Movie created! ID: ${movieId} | Title: "${createData.movie.title}" | Status: ${createData.movie.videoStatus}\n`);

    // 2. Locate MP4 file
    console.log("Step 2: Locating project MP4 file...");
    const dummyFilePath = "file_example_MP4_640_3MG.mp4";
    if (!fs.existsSync(dummyFilePath)) {
      throw new Error(`Real MP4 file not found at ${dummyFilePath}`);
    }
    console.log(`✅ MP4 file "${dummyFilePath}" found.\n`);

    // 3. Upload to S3 Raw videos bucket
    const s3Key = `movies/${movieId}/video.mp4`;
    console.log(`Step 3: Uploading MP4 file to S3: s3://${BUCKET_RAW}/${s3Key}...`);

    const uploadCmd = `aws s3 cp ${dummyFilePath} s3://${BUCKET_RAW}/${s3Key}`;
    console.log(`Running: ${uploadCmd}`);
    execSync(uploadCmd, { stdio: "inherit" });
    console.log("✅ File uploaded to S3 successfully!\n");

    // 4. Poll DynamoDB status until it becomes "ready"
    console.log("Step 4: Waiting for S3 event trigger and Lambda transcode processing...");
    let videoStatus = "pending";
    let attempts = 0;
    const maxAttempts = 40;

    while (videoStatus !== "ready" && attempts < maxAttempts) {
      attempts++;
      console.log(`Checking movie status (Attempt ${attempts}/${maxAttempts})...`);

      const getRes = await fetch(`${API_URL}/v1/movies/${movieId}`, {
        method: "GET",
        headers
      });

      if (getRes.status === 200) {
        const getData = await getRes.json();
        videoStatus = getData.movie.videoStatus;
        console.log(`Status: ${videoStatus}`);
      } else {
        console.warn(`GET movie details returned status: ${getRes.status}`);
      }

      if (videoStatus !== "ready") {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // wait 5s
      }
    }

    if (videoStatus !== "ready") {
      throw new Error("Timeout waiting for video status to become ready");
    }
    console.log("✅ Lambda trigger executed! Movie is now ready for streaming.\n");

    // 5. Request Streaming Session
    console.log("Step 5: Requesting streaming playback session...");
    const streamRes = await fetch(`${API_URL}/v1/streaming/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        movieId: movieId,
        preferredQuality: "1080p"
      })
    });

    if (streamRes.status !== 201) {
      const errText = await streamRes.text();
      throw new Error(`Failed to request streaming session: ${streamRes.status} - ${errText}`);
    }

    const streamData = await streamRes.json();
    console.log("✅ Streaming session created successfully!");
    console.log(JSON.stringify(streamData, null, 2));

    // Generate a presigned URL of the raw video in S3 to verify the upload worked
    let rawVideoPresignedUrl = "Could not generate";
    try {
      const presignCmd = `aws s3 presign s3://${BUCKET_RAW}/${s3Key} --expires-in 3600`;
      rawVideoPresignedUrl = execSync(presignCmd).toString().trim();
    } catch (presignErr) {
      console.warn("Could not generate presigned URL for raw video:", presignErr.message);
    }

    console.log("\n🎉 END-TO-END VOD INGESTION & PLAYBACK TESTS PASSED SUCCESSFULLY!");

    console.log("\n👉 VERIFY YOUR UPLOADED VIDEO IN S3:");
    console.log(`You can download/play the exact video you uploaded here (valid for 1 hour):`);
    console.log(rawVideoPresignedUrl);

    console.log("\n👉 COPY the following signed URL to test playback in any HLS player:");
    console.log(streamData.signedUrl);

  } catch (error) {
    console.error("\n❌ E2E test execution failed:", error.message);
  }
}

runE2E();
