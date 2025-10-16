/**
 * S3 client and utility functions for file storage using AWS SDK v3
 */

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  PutBucketCorsCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");

// ✅ Import region & bucket configs
const { S3: S3_CONFIG } = require("../config/aws-config");

const s3Client = new S3Client({ region: S3_CONFIG.REGION });

/**
 * Generate a pre-signed URL for uploading a file to S3
 */
const getPresignedUploadUrl = async (bucket, key, contentType, expiresIn = 300) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  try {
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error("❌ Error generating pre-signed upload URL:", error);
    throw error;
  }
};

/**
 * Generate a pre-signed URL for downloading a file from S3
 */
const getPresignedDownloadUrl = async (bucket, key, expiresIn = 3600, contentDisposition = 'inline') => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: contentDisposition, // 'inline' or 'attachment'
  });

  try {
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error("❌ Error generating pre-signed download URL:", error);
    throw error;
  }
};

/**
 * Upload a file to S3
 */
const uploadFile = async (bucket, key, body, contentType) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  try {
    await s3Client.send(command);
    return {
      bucket,
      key,
      location: `https://${bucket}.s3.${S3_CONFIG.REGION}.amazonaws.com/${key}`,
    };
  } catch (error) {
    console.error("❌ Error uploading file to S3:", error);
    throw error;
  }
};

/**
 * Delete a file from S3
 */
const deleteFile = async (bucket, key) => {
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });

  try {
    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    console.error("❌ Error deleting file from S3:", error);
    throw error;
  }
};

/**
 * Generate a unique key for incident attachments
 */
const generateIncidentAttachmentKey = (incidentId, fileName) => {
  const extension = fileName.split(".").pop();
  const uniqueId = uuidv4();
  return `incidents/${incidentId}/attachments/${uniqueId}.${extension}`;
};

/**
 * Create and configure S3 buckets
 */
const createBuckets = async () => {
  const bucketName = S3_CONFIG.BUCKETS.INCIDENT_MEDIA;

  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));

    const corsParams = {
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag", "Content-Length"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    };

    await s3Client.send(new PutBucketCorsCommand(corsParams));
    console.log("✅ S3 bucket created and CORS configured.");
  } catch (error) {
    console.error("❌ Error creating/configuring S3 bucket:", error);
    throw error;
  }
};

module.exports = {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  uploadFile,
  deleteFile,
  generateIncidentAttachmentKey,
  createBuckets,
};
