const { app } = require("@azure/functions");
const { v4: uuidv4 } = require("uuid");
const { uploadImageToBlob } = require("../../shared/blob");
const { createMemoryDocument } = require("../../shared/cosmos");

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function jsonResponse(status, body) {
  return {
    status,
    jsonBody: body,
    headers: {
      "Content-Type": "application/json"
    }
  };
}

function getFileExtension(fileName) {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts.pop().toLowerCase();
}

function validateCreateMemoryRequest(body) {
  const errors = [];

  if (!body.title || typeof body.title !== "string") {
    errors.push("title is required and must be a string.");
  }

  if (!body.description || typeof body.description !== "string") {
    errors.push("description is required and must be a string.");
  }

  if (!Array.isArray(body.tags)) {
    errors.push("tags is required and must be an array.");
  }

  if (!body.fileName || typeof body.fileName !== "string") {
    errors.push("fileName is required and must be a string.");
  }

  if (!body.contentType || typeof body.contentType !== "string") {
    errors.push("contentType is required and must be a string.");
  }

  if (!body.fileBase64 || typeof body.fileBase64 !== "string") {
    errors.push("fileBase64 is required and must be a base64 string.");
  }

  if (body.contentType && !body.contentType.startsWith("image/")) {
    errors.push("Only image uploads are supported in this implementation.");
  }

  return errors;
}

app.http("CreateMemory", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "memories",
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const validationErrors = validateCreateMemoryRequest(body);

      if (validationErrors.length > 0) {
        return jsonResponse(400, {
          message: "Invalid request body.",
          errors: validationErrors
        });
      }

      const fileBuffer = Buffer.from(body.fileBase64, "base64");

      if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
        return jsonResponse(413, {
          message: "File is too large. Maximum allowed size is 10MB."
        });
      }

      const memoryId = uuidv4();
      const uploadedAt = new Date().toISOString();
      const extension = getFileExtension(body.fileName) || "jpg";
      const safeFileName = `${memoryId}.${extension}`;
      const blobName = `images/demo-user/${safeFileName}`;

      const { blobUrl, blobPath } = await uploadImageToBlob({
        blobName,
        buffer: fileBuffer,
        contentType: body.contentType
      });

      const memory = {
        id: memoryId,
        memoryId,
        userId: "demo-user",
        title: body.title.trim(),
        description: body.description.trim(),
        tags: body.tags.map((tag) => String(tag).trim()).filter(Boolean),
        fileName: body.fileName,
        contentType: body.contentType,
        mediaType: "image",
        blobUrl,
        blobPath,
        fileSizeBytes: fileBuffer.length,
        uploadedAt
      };

      const createdMemory = await createMemoryDocument(memory);

      context.log(`Created memory ${memoryId}`);

      return jsonResponse(201, createdMemory);
    } catch (error) {
      context.error("CreateMemory failed:", error);

      return jsonResponse(500, {
        message: "Failed to create memory.",
        error: error.message
      });
    }
  }
});