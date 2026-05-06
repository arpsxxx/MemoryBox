const { BlobServiceClient, BlobSASPermissions } = require("@azure/storage-blob");

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getBlobContainerClient() {
  const connectionString = getRequiredEnv("BLOB_CONNECTION_STRING");
  const containerName = getRequiredEnv("BLOB_CONTAINER_NAME");

  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);

  return blobServiceClient.getContainerClient(containerName);
}

async function uploadImageToBlob({ blobName, buffer, contentType }) {
  const containerClient = getBlobContainerClient();
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: contentType
    }
  });

  return {
    blobUrl: blockBlobClient.url,
    blobPath: blobName
  };
}

async function generateSasTokenForBlob(blobName) {
  const containerClient = getBlobContainerClient();
  const blobClient = containerClient.getBlobClient(blobName);

  const sasUrl = await blobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse("r"),
    expiresOn: new Date(new Date().valueOf() + 2 * 60 * 60 * 1000) // 2 hours
  });

  return sasUrl;
}

async function deleteImageFromBlob(blobPath) {
  const containerClient = getBlobContainerClient();

  const blockBlobClient =
    containerClient.getBlockBlobClient(blobPath);

  await blockBlobClient.deleteIfExists();
}

module.exports = {
  uploadImageToBlob,
  generateSasTokenForBlob,
  deleteImageFromBlob
};