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
  'carta_compromiso': 'C de V',
  'acta_visita_1': 'AV1',
  'plan_inversion': 'PI',
  'evidencia_fotografica_1': 'RF1',
  'acta_retiro': 'AR',
  
  // Documentos Iniciales (Empresas)
  'cedula_ciudadania': 'CC',
  'recibo_publico': 'RP',
  'documento_antiguedad': 'DA',
  
  // Cierre de Ruta (pi_anexosv2)
  'acta_visita_2': 'AV2',
  'recibo_satisfaccion': 'VEB',
  'evidencia_fotografica_2': 'RF2',
  'facturas': 'Fact',
  'acta_comite': 'AC_de_AC',
  'bienes_aprobados': 'Bien aprob',
  'acta_causales': 'ACI',
  'lista_asistencia': 'List_Asist',
  'certificado_formacion': 'Cert form',
  'incumplimiento': 'AI',
  
  // Módulo Arriendo (pi_anexosv2)
  'contrato_arriendo': 'Cto Arrend',
  'camara_comercio': 'CCB',
  'certif_tradicion_libertad': 'CTL',
  'certificado_deuda_arriendo': 'Cert Deuda A',
  'certificacion_banco_arriendo': 'Cert Bcaria A',
  'tipo_cc_ce': 'tipo documento',
  'cuenta_de_cobro': 'CXC',
  
  // Módulo Deuda (pi_anexosv2)
  'certificado_deuda_deuda': 'Cert Deuda D',
  'certificacion_banco_deuda': 'Cert Bcaria D'
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
 * Función auxiliar para generar un nombre único de archivo
 * @param {string} basePath - Ruta base del archivo
 * @param {string} folderPath - Ruta de la carpeta
 * @param {string} baseFileName - Nombre base del archivo (sin extensión)
 * @param {string} fileExtension - Extensión del archivo
 * @returns {Promise<string>} - Nombre único del archivo
 */
async function generateUniqueFileName(basePath, folderPath, baseFileName, fileExtension) {
  let counter = 0;
  let finalFileName = `${baseFileName}.${fileExtension}`;
  
  while (true) {
    const testPath = `${basePath}/${folderPath}/${finalFileName}`;
    
    try {
      const file = bucket.file(testPath);
      const [exists] = await file.exists();
      
      if (!exists) {
        // El archivo no existe, podemos usar este nombre
        break;
      }
      
      // El archivo existe, incrementar el contador y probar con el siguiente número
      counter++;
      if (counter === 1) {
        finalFileName = `${baseFileName} (1).${fileExtension}`;
      } else {
        finalFileName = `${baseFileName} (${counter}).${fileExtension}`;
      }
    } catch (error) {
      // Si hay un error al verificar, asumir que el archivo no existe
      console.warn(`Error verificando existencia de archivo ${testPath}:`, error.message);
      break;
    }
  }
  
  return finalFileName;
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
  
  // Generar el nombre base del archivo
  const baseFileName = `${userData.cedula}_${userData.nombre}_${documentCode}_${userData.grupo}`;
  
  // Generar nombre único
  const finalFileName = await generateUniqueFileName(basePath, folderPath, baseFileName, fileExtension);
  
  const finalPath = `${basePath}/${folderPath}/${finalFileName}`;
  
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
  
  // Generar el nombre base del archivo
  const baseFileName = `${userData.cedula}_${userData.nombre}_${documentType}_${userData.grupo}`;
  
  // Generar nombre único
  const finalFileName = await generateUniqueFileName(basePath, folderPath, baseFileName, fileExtension);
  
  return `${basePath}/${folderPath}/${finalFileName}`;
}

/**
 * Genera la ruta de GCS para archivos de Cierre de Ruta
 * @param {number} caracterizacion_id - ID de caracterización
 * @param {string} fieldName - Nombre del campo en la base de datos
 * @param {string} fileName - Nombre del archivo
 * @returns {Promise<string>} - Ruta completa en GCS
 */
async function generateCierreRutaPath(caracterizacion_id, fieldName, fileName) {
  console.log('🔍 [generateCierreRutaPath] Iniciando...');
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
  const folderPath = `3. Cierre de Ruta_${userData.grupo}`;
  
  // Generar el nombre base del archivo
  const baseFileName = `${userData.cedula}_${userData.nombre}_${documentCode}_${userData.grupo}`;
  
  // Generar nombre único
  const finalFileName = await generateUniqueFileName(basePath, folderPath, baseFileName, fileExtension);
  
  const finalPath = `${basePath}/${folderPath}/${finalFileName}`;
  
  console.log('✅ [generateCierreRutaPath] Ruta final generada:', finalPath);
  return finalPath;
}

/**
 * Genera la ruta de GCS para archivos del Módulo Arriendo
 * @param {number} caracterizacion_id - ID de caracterización
 * @param {string} fieldName - Nombre del campo en la base de datos
 * @param {string} fileName - Nombre del archivo
 * @returns {Promise<string>} - Ruta completa en GCS
 */
async function generateArriendoPath(caracterizacion_id, fieldName, fileName) {
  console.log('🔍 [generateArriendoPath] Iniciando...');
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
  const folderPath = `2. Soportes de Visita 1_${userData.grupo}/Documentos soportes PI canon de arrendamiento`;
  
  // Generar el nombre base del archivo
  const baseFileName = `${userData.cedula}_${userData.nombre}_${documentCode}_${userData.grupo}`;
  
  // Generar nombre único
  const finalFileName = await generateUniqueFileName(basePath, folderPath, baseFileName, fileExtension);
  
  const finalPath = `${basePath}/${folderPath}/${finalFileName}`;
  
  console.log('✅ [generateArriendoPath] Ruta final generada:', finalPath);
  return finalPath;
}

/**
 * Genera la ruta de GCS para archivos del Módulo Deuda
 * @param {number} caracterizacion_id - ID de caracterización
 * @param {string} fieldName - Nombre del campo en la base de datos
 * @param {string} fileName - Nombre del archivo
 * @returns {Promise<string>} - Ruta completa en GCS
 */
async function generateDeudaPath(caracterizacion_id, fieldName, fileName) {
  console.log('🔍 [generateDeudaPath] Iniciando...');
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
  const folderPath = `2. Soportes de Visita 1_${userData.grupo}/Documentos soportes PI cobertura deuda comercial`;
  
  // Generar el nombre base del archivo
  const baseFileName = `${userData.cedula}_${userData.nombre}_${documentCode}_${userData.grupo}`;
  
  // Generar nombre único
  const finalFileName = await generateUniqueFileName(basePath, folderPath, baseFileName, fileExtension);
  
  const finalPath = `${basePath}/${folderPath}/${finalFileName}`;
  
  console.log('✅ [generateDeudaPath] Ruta final generada:', finalPath);
  return finalPath;
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

/**
 * Elimina un archivo de Google Cloud Storage.
 * @param {string} filePath - Ruta del archivo en GCS (ej: 'documentos/archivo.pdf').
 * @returns {Promise<boolean>} - true si se eliminó correctamente, false si no.
 */
async function deleteFileFromGCS(filePath) {
  try {
    if (!filePath) {
      return false;
    }
    
    // Limpiar la ruta si contiene la URL completa del bucket
    let destination = filePath;
    const bucketUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET}/`;
    
    if (destination.startsWith(bucketUrl)) {
      destination = destination.slice(bucketUrl.length);
    }
    
    const file = bucket.file(destination);
    const [exists] = await file.exists();
    
    if (!exists) {
      return false;
    }
    
    await file.delete();
    return true;
  } catch (error) {
    console.error('Error eliminando archivo de GCS:', error.message);
    return false;
  }
}

module.exports = { 
  bucket,
  uploadFileToGCS, 
  getSignedUrlFromGCS,
  deleteFileFromGCS,
  generateVisita1Path,
  generateInicialesPath,
  generateCierreRutaPath,
  generateArriendoPath,
  generateDeudaPath,
  getUserData,
  DOCUMENT_CODES,
  DOCUMENT_TYPES
};
