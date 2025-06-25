const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Inicializa el cliente de Google Cloud Storage usando las credenciales del .env
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
const bucket = storage.bucket(process.env.GCS_BUCKET);

/**
 * Sube un archivo local a Google Cloud Storage y retorna la URL pública.
 * @param {string} filePath - Ruta local del archivo a subir.
 * @param {string} destination - Ruta destino en el bucket (ej: 'inscription_caracterizacion/123/archivo.pdf').
 * @returns {Promise<string>} - URL pública del archivo subido.
 */
async function uploadFileToGCS(filePath, destination) {
  await bucket.upload(filePath, {
    destination,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
  return `https://storage.googleapis.com/${process.env.GCS_BUCKET}/${destination}`;
}

/**
 * Genera una URL firmada temporal para acceder a un archivo privado en GCS.
 * @param {string} destination - Ruta destino en el bucket (ej: 'inscription_caracterizacion/123/archivo.pdf').
 * @param {number} expiresInSeconds - Tiempo de expiración en segundos (por defecto 15 minutos).
 * @returns {Promise<string>} - URL firmada temporal.
 */
async function getSignedUrlFromGCS(destination, expiresInSeconds = 900) {
  try {
    const file = bucket.file(destination);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.error(`El archivo ${destination} no existe en el bucket`);
      return null;
    }

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInSeconds * 1000,
      responseDisposition: 'inline',
    });
    
    return url;
  } catch (error) {
    console.error('Error generando URL firmada:', error);
    return null;
  }
}

module.exports = { uploadFileToGCS, getSignedUrlFromGCS };
