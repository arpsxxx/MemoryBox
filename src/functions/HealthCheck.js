const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");
const { BlobServiceClient } = require("@azure/storage-blob");

app.http("HealthCheck", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: async (request, context) => {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        functionApp: "running",
        cosmosDb: "unknown",
        blobStorage: "unknown"
      }
    };

    let isHealthy = true;

    try {
      const cosmosClient = new CosmosClient({
        endpoint: process.env.COSMOS_ENDPOINT,
        key: process.env.COSMOS_KEY
      });

      const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME);
      const container = database.container(process.env.COSMOS_CONTAINER_NAME);

      await container.items.query("SELECT VALUE COUNT(1) FROM c").fetchAll();

      health.services.cosmosDb = "connected";
    } catch (error) {
      isHealthy = false;
      health.services.cosmosDb = "failed";
      health.cosmosError = error.message;
    }

    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.BLOB_CONNECTION_STRING
      );

      const containerClient = blobServiceClient.getContainerClient(
        process.env.BLOB_CONTAINER_NAME
      );

      await containerClient.getProperties();

      health.services.blobStorage = "connected";
    } catch (error) {
      isHealthy = false;
      health.services.blobStorage = "failed";
      health.blobError = error.message;
    }

    health.status = isHealthy ? "healthy" : "unhealthy";

    return {
      status: isHealthy ? 200 : 503,
      jsonBody: health
    };
  }
});