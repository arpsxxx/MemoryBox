const { app } = require("@azure/functions");
const { getAllMemoryDocuments } = require("../../shared/cosmos");
const { generateSasTokenForBlob } = require("../../shared/blob");

function jsonResponse(status, body) {
  return {
    status,
    jsonBody: body,
    headers: {
      "Content-Type": "application/json"
    }
  };
}

app.http("GetMemories", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "memories",
  handler: async (request, context) => {
    try {
      const memories = await getAllMemoryDocuments();

      const sortedMemories = memories.sort(
        (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
      );

      const memoriesWithSas = await Promise.all(
        sortedMemories.map(async (memory) => {
          if (memory.blobPath) {
            memory.blobUrl = await generateSasTokenForBlob(memory.blobPath);
          }
          return memory;
        })
      );

      return jsonResponse(200, memoriesWithSas);
    } catch (error) {
      context.error("GetMemories failed:", error);

      return jsonResponse(500, {
        message: "Failed to retrieve memories.",
        error: error.message
      });
    }
  }
});