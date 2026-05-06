const { CosmosClient } = require("@azure/cosmos");

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getCosmosContainer() {
  const endpoint = getRequiredEnv("COSMOS_ENDPOINT");
  const key = getRequiredEnv("COSMOS_KEY");
  const databaseName = getRequiredEnv("COSMOS_DATABASE_NAME");
  const containerName = getRequiredEnv("COSMOS_CONTAINER_NAME");

  const client = new CosmosClient({ endpoint, key });

  return client.database(databaseName).container(containerName);
}

async function createMemoryDocument(memory) {
  const container = getCosmosContainer();
  const { resource } = await container.items.create(memory);
  return resource;
}

async function getAllMemoryDocuments() {
  const container = getCosmosContainer();

  const querySpec = {
    query: "SELECT * FROM c ORDER BY c.uploadedAt DESC"
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

async function updateMemoryDocument(memoryId, updates) {
  const container = getCosmosContainer();

  const { resource: existingMemory } = await container
    .item(memoryId, "demo-user")
    .read();

  if (!existingMemory) {
    return null;
  }

  const updatedMemory = {
    ...existingMemory,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const { resource } = await container
    .item(memoryId, "demo-user")
    .replace(updatedMemory);

  return resource;
}

async function deleteMemoryDocument(memoryId) {
  const container = getCosmosContainer();

  const { resource } = await container
    .item(memoryId, "demo-user")
    .delete();

  return resource;
}

module.exports = {
  createMemoryDocument,
  getAllMemoryDocuments,
  updateMemoryDocument,
  deleteMemoryDocument
};