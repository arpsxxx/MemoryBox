const { app } = require("@azure/functions");
const { updateMemoryDocument } = require("../../shared/cosmos");

function jsonResponse(status, body) {
  return {
    status,
    jsonBody: body,
    headers: {
      "Content-Type": "application/json"
    }
  };
}

app.http("UpdateMemory", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "memories/{id}",
  handler: async (request, context) => {
    try {
      const memoryId = request.params.id;
      const body = await request.json();

      const updates = {};

      if (typeof body.title === "string") {
        updates.title = body.title.trim();
      }

      if (typeof body.description === "string") {
        updates.description = body.description.trim();
      }

      if (Array.isArray(body.tags)) {
        updates.tags = body.tags.map((tag) => String(tag).trim()).filter(Boolean);
      }

      const updatedMemory = await updateMemoryDocument(memoryId, updates);

      if (!updatedMemory) {
        return jsonResponse(404, {
          message: "Memory not found."
        });
      }

      return jsonResponse(200, updatedMemory);
    } catch (error) {
      context.error("UpdateMemory failed:", error);

      return jsonResponse(500, {
        message: "Failed to update memory.",
        error: error.message
      });
    }
  }
});