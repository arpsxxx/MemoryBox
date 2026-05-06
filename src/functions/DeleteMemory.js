const { app } = require("@azure/functions");

const {
  deleteMemoryDocument,
  getAllMemoryDocuments
} = require("../../shared/cosmos");

const {
  deleteImageFromBlob
} = require("../../shared/blob");

function jsonResponse(status, body) {
  return {
    status,
    jsonBody: body,
    headers: {
      "Content-Type": "application/json"
    }
  };
}

app.http("DeleteMemory", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "memories/{id}",
  handler: async (request, context) => {
    try {
      const memoryId = request.params.id;

      const memories = await getAllMemoryDocuments();

      const memory = memories.find((m) => m.id === memoryId);

      if (!memory) {
        return jsonResponse(404, {
          message: "Memory not found."
        });
      }

      if (memory.blobPath) {
        await deleteImageFromBlob(memory.blobPath);
      }

      await deleteMemoryDocument(memoryId);

      return jsonResponse(200, {
        message: "Memory deleted successfully."
      });
    } catch (error) {
      context.error("DeleteMemory failed:", error);

      return jsonResponse(500, {
        message: "Failed to delete memory.",
        error: error.message
      });
    }
  }
});