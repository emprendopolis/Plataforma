const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Inicializa el cliente de Google Cloud Storage usando las credenciales del .env
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
const bucket = storage.bucket(process.env.GCS_BUCKET);

/**
 * Mapeo de campos de la base de datos a códigos de documento
 */
const DOCUMENT_CODES = {
  // Soportes de Visita 1 (pi_anexosv2)
  'autorizacion_tratamiento_proteccion_datos': 'ATD',
  'designacion_responsable': 'Desig',
  'carta_compromiso': 'C de C',
  'acta_visita_1': 'AV1',
  'plan_inversion': 'PI',
  'evidencia_fotografica_1': 'RF1',
  'acta_retiro': 'AR',
  
  // Documentos Iniciales (Empresas)
  'cedula_ciudadania': 'CC',
  'recibo_publico': 'RP',
  'documento_antiguedad': 'DA',
  
  // Cierre de Ruta (futuro - pi_anexosv2)
  // Se agregarán cuando se definan los campos
};

/**
 * Mapeo de tipos de documento para el frontend
 */
const DOCUMENT_TYPES = {
  'CC': 'Cédula de Ciudadanía',
  'RP': 'Recibo público',
  'DA': 'Documento Antigüedad'
};

/**
 * Obtiene los datos del usuario desde la base de datos
 * @param {number} caracterizacion_id - ID de caracterización
 * @returns {Promise<Object>} - Datos del usuario {cedula, nombre, grupo}
 */
async function getUserData(caracterizacion_id) {
  const sequelize = require('../utils/sequelize');
  
  console.log('🔍 [getUserData] Buscando usuario con caracterizacion_id:', caracterizacion_id);
  
  const query = `
    SELECT 
      "Numero de identificacion" as cedula,
      CONCAT("Nombres", ' ', "Apellidos") as nombre,
      "Priorizacion capitalizacion" as grupo
    FROM inscription_caracterizacion 
    WHERE id = :caracterizacion_id
  `;
  
  const [result] = await sequelize.query(query, {
    replacements: { caracterizacion_id },
    type: sequelize.QueryTypes.SELECT,
  });
  
  console.log('📋 [getUserData] Resultado de la consulta:', result);
  
  if (!result) {
    console.log('❌ [getUserData] No se encontró el usuario');
    throw new Error(`No se encontró el usuario con caracterizacion_id: ${caracterizacion_id}`);
  }
  
  const userData = {
    cedula: result.cedula,
    nombre: result.nombre,
    grupo: result.grupo || 'Sin Grupo'
  };
  
  console.log('✅ [getUserData] Datos del usuario:', userData);
  return userData;
}

/**
 * Genera la ruta de GCS para archivos de Soportes de Visita 1
 * @param {number} caracterizacion_id - ID de caracterización
 * @param {string} fieldName - Nombre del campo en la base de datos
 * @param {string} fileName - Nombre del archivo
 * @returns {Promise<string>} - Ruta completa en GCS
 */
async function generateVisita1Path(caracterizacion_id, fieldName, fileName) {
  console.log('🔍 [generateVisita1Path] Iniciando...');
  console.log('📋 Parámetros:', { caracterizacion_id, fieldName, fileName });
  
  const userData = await getUserData(caracterizacion_id);
  
  const documentCode = DOCUMENT_CODES[fieldName];
  console.log('📄 Código de documento:', documentCode);
  
  if (!documentCode) {
    console.log('❌ Código de documento no definido para:', fieldName);
    throw new Error(`Código de documento no definido para el campo: ${fieldName}`);
  }
  
  // Extraer la extensión del archivo original
  const fileExtension = fileName.split('.').pop();
  console.log('📄 Extensión del archivo:', fileExtension);
  
  const basePath = `${userData.cedula}_${userData.nombre}`;
  const folderPath = `2. Soportes de Visita 1_${userData.grupo}`;
  const filePath = `${userData.cedula}_${userData.nombre}_${documentCode}_${userData.grupo}.${fileExtension}`;
  
  const finalPath = `${basePath}/${folderPath}/${filePath}`;
  
  console.log('✅ [generateVisita1Path] Ruta final generada:', finalPath);
  return finalPath;
}

/**
 * Genera la ruta de GCS para archivos de Documentos Iniciales
 * @param {number} caracterizacion_id - ID de caracterización
 * @param {string} documentType - Tipo de documento
 * @param {string} fileName - Nombre del archivo
 * @returns {Promise<string>} - Ruta completa en GCS
 */
async function generateInicialesPath(caracterizacion_id, documentType, fileName) {
  const userData = await getUserData(caracterizacion_id);
  
  // Extraer la extensión del archivo original
  const fileExtension = fileName.split('.').pop();
  
  const basePath = `${userData.cedula}_${userData.nombre}`;
  const folderPath = `1. Documentos iniciales`;
  const filePath = `${userData.cedula}_${userData.nombre}_${documentType}_${userData.grupo}.${fileExtension}`;
  
  return `${basePath}/${folderPath}/${filePath}`;
}

/**
 * Genera la ruta de GCS para archivos de Cierre de Ruta (futuro)
 * @param {number} caracterizacion_id - ID de caracterización
 * @param {string} fieldName - Nombre del campo en la base de datos
 * @param {string} fileName - Nombre del archivo
 * @param {number} factNumber - Número de factura (opcional)
 * @returns {Promise<string>} - Ruta completa en GCS
 */
async function generateCierreRutaPath(caracterizacion_id, fieldName, fileName, factNumber = null) {
  const userData = await getUserData(caracterizacion_id);
  
  // Extraer la extensión del archivo original
  const fileExtension = fileName.split('.').pop();
  
  const basePath = `${userData.cedula}_${userData.nombre}`;
  const folderPath = `3. Cierre de Ruta_${userData.grupo}/Factura y soporte de entrega`;
  
  let filePath;
  if (factNumber) {
    filePath = `${userData.cedula}_${userData.nombre}_Fact ${factNumber}_${userData.grupo}.${fileExtension}`;
  } else {
    const documentCode = DOCUMENT_CODES[fieldName];
    if (!documentCode) {
      throw new Error(`Código de documento no definido para el campo: ${fieldName}`);
    }
    filePath = `${userData.cedula}_${userData.nombre}_${documentCode}_${userData.grupo}.${fileExtension}`;
  }
  
  return `${basePath}/${folderPath}/${filePath}`;
}

/**
 * Sube un archivo local a Google Cloud Storage y retorna la ruta.
 * @param {string} filePath - Ruta local del archivo a subir.
 * @param {string} destination - Ruta destino en el bucket (ej: 'inscription_caracterizacion/123/archivo.pdf').
 * @returns {Promise<string>} - Ruta del archivo subido.
 */
async function uploadFileToGCS(filePath, destination) {
  await bucket.upload(filePath, {
    destination,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });

  // Retornar la ruta del archivo (no la URL pública)
  return destination;
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

module.exports = { 
  uploadFileToGCS, 
  getSignedUrlFromGCS,
  generateVisita1Path,
  generateInicialesPath,
  generateCierreRutaPath,
  getUserData,
  DOCUMENT_CODES,
  DOCUMENT_TYPES
};
