const express = require('express');
const archiver = require('archiver');
const { Storage } = require('@google-cloud/storage');
const { Pool } = require('pg');
const router = express.Router();

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GCP_PROJECT_ID,
});
const bucket = storage.bucket(process.env.GCS_BUCKET);

/**
 * Obtiene todos los archivos de una empresa desde GCS bajo inscription_caracterizacion/{empresaId}/
 * @param {string} empresaId
 * @returns {Promise<Array<{gcsPath: string, name: string}>>}
 */
async function getDocumentPathsForEmpresa(empresaId) {
  const files = [];
  // Buscar archivos en inscription_caracterizacion/{empresaId}/
  const [empresaFiles] = await bucket.getFiles({ prefix: `inscription_caracterizacion/${empresaId}/` });
  empresaFiles.forEach(file => {
    if (!file.name.endsWith('/')) {
      files.push({ gcsPath: file.name, name: file.name.split('/').pop() });
    }
  });
  return files;
}

/**
 * Obtiene todos los archivos de una empresa desde GCS por cédula
 * @param {string} cedula
 * @returns {Promise<{files: Array<{gcsPath: string, name: string, relativePath: string, size: string}>, folderName: string}>}
 */
async function getDocumentPathsForCedula(cedula) {
  const files = [];
  
  try {
    console.log(`Buscando cédula ${cedula} en la base de datos...`);
    
    // Buscar en la base de datos para obtener el nombre completo de la carpeta
    const client = await pool.connect();
    const result = await client.query(
      'SELECT "Nombres", "Apellidos" FROM inscription_caracterizacion WHERE "Numero de identificacion" = $1',
      [cedula]
    );
    client.release();

    if (result.rows.length === 0) {
      throw new Error('Cédula no encontrada en la base de datos');
    }

    const nombres = result.rows[0].Nombres || '';
    const apellidos = result.rows[0].Apellidos || '';
    const nombreCompleto = `${nombres} ${apellidos}`.trim();
    const folderName = `${cedula}_${nombreCompleto}`;
    
    console.log(`Cédula ${cedula}: ${nombreCompleto} - ${folderName}`);
    
    // Buscar archivos en la carpeta del Google Drive
    const [empresaFiles] = await bucket.getFiles({ prefix: `${folderName}/` });
    
    console.log(`Archivos encontrados en GCS: ${empresaFiles.length}`);
    
    empresaFiles.forEach(file => {
      if (!file.name.endsWith('/')) {
        const fileName = file.name.split('/').pop();
        // Extraer la ruta relativa dentro de la carpeta principal
        const relativePath = file.name.replace(`${folderName}/`, '');
        files.push({ 
          gcsPath: file.name, 
          name: fileName,
          relativePath: relativePath, // Nueva propiedad para preservar estructura
          size: file.metadata?.size || 'unknown'
        });
      }
    });
    
    console.log(`Total de archivos válidos: ${files.length}`);
    return { files, folderName };
  } catch (error) {
    console.error('Error obteniendo documentos por cédula:', error);
    throw error;
  }
}

router.get('/descarga-documentos/:id', async (req, res) => {
  const empresaId = req.params.id;
  try {
    const documentPaths = await getDocumentPathsForEmpresa(empresaId);

    if (documentPaths.length === 0) {
      return res.status(404).json({ message: 'No se encontraron archivos para este ID' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=documentos_empresa_${empresaId}.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Manejo de errores en archiver
    archive.on('error', err => {
      console.error('Error en archiver:', err);
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    });

    // Manejo de cierre correcto
    archive.on('end', () => {
      console.log('ZIP generado correctamente para empresa', empresaId);
    });

    archive.pipe(res);

    for (const doc of documentPaths) {
      const file = bucket.file(doc.gcsPath);
      const fileStream = file.createReadStream();
      // Manejo de errores en cada stream de archivo
      fileStream.on('error', err => {
        console.error('Error leyendo archivo de GCS:', err);
        archive.abort();
        if (!res.headersSent) {
          res.status(500).end();
        } else {
          res.end();
        }
      });
      archive.append(fileStream, { name: doc.name });
    }

    archive.finalize(); // No usar await aquí
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generando el ZIP' });
    } else {
      res.status(500).end();
    }
  }
});

// Nuevo endpoint para descarga por cédula
router.get('/descarga-documentos-cedula/:cedula', async (req, res) => {
  const cedula = req.params.cedula;
  
  console.log(`Iniciando descarga para cédula: ${cedula}`);
  
  try {
    // 1. Obtener documentos por cédula
    const result = await getDocumentPathsForCedula(cedula);
    const documentPaths = result.files;
    const folderName = result.folderName;
    
    console.log(`Documentos encontrados: ${documentPaths.length}`);

    if (documentPaths.length === 0) {
      console.log(`No se encontraron archivos para cédula: ${cedula}`);
      return res.status(404).json({ message: 'No se encontraron archivos para esta cédula' });
    }

    // 2. Configurar headers de respuesta
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${folderName}.zip`);
    
    console.log(`Configurando archiver para ${documentPaths.length} archivos`);

    // 3. Crear archiver con configuración simple
    const archive = archiver('zip', { 
      zlib: { level: 1 } // Compresión mínima para estabilidad
    });

    // 4. Manejo de eventos del archiver
    archive.on('error', (err) => {
      console.error('Error en archiver:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error generando el archivo ZIP' });
      }
    });

    archive.on('end', () => {
      console.log(`ZIP generado exitosamente para cédula: ${cedula}`);
    });

    archive.on('warning', (err) => {
      console.warn('Warning en archiver:', err);
    });

    // 5. Conectar archiver a la respuesta
    archive.pipe(res);

    // 6. Agregar archivos uno por uno
    console.log('Agregando archivos al ZIP...');
    
    for (let i = 0; i < documentPaths.length; i++) {
      const doc = documentPaths[i];
      
      try {
        const file = bucket.file(doc.gcsPath);
        
        // Verificar existencia del archivo
        const [exists] = await file.exists();
        if (!exists) {
          console.warn(`Archivo no encontrado: ${doc.gcsPath}`);
          continue;
        }

        // Crear stream y agregar al ZIP
        const fileStream = file.createReadStream();
        
        fileStream.on('error', (err) => {
          console.error(`Error en stream de ${doc.name}:`, err);
        });

        // Agregar archivo al ZIP preservando la estructura de carpetas
        archive.append(fileStream, { name: doc.relativePath });
        
      } catch (fileError) {
        console.error(`Error procesando archivo ${doc.name}:`, fileError);
        continue; // Continuar con el siguiente archivo
      }
    }

    // 7. Finalizar el archivo
    console.log('Finalizando archivo ZIP...');
    await archive.finalize();
    console.log('Proceso de descarga completado');

  } catch (error) {
    console.error('Error general en descarga por cédula:', error);
    
    if (!res.headersSent) {
      if (error.message === 'Cédula no encontrada en la base de datos') {
        res.status(404).json({ message: 'Cédula no encontrada en la base de datos' });
      } else {
        res.status(500).json({ message: 'Error generando el ZIP' });
      }
    }
  }
});

// Endpoint de prueba para verificar que la ruta funcione
router.get('/test-cedula/:cedula', async (req, res) => {
  const cedula = req.params.cedula;
  console.log(`Test endpoint llamado para cédula: ${cedula}`);
  
  try {
    const result = await getDocumentPathsForCedula(cedula);
    const documentPaths = result.files;
    const folderName = result.folderName;
    
    res.json({
      success: true,
      cedula: cedula,
      folderName: folderName,
      archivosEncontrados: documentPaths.length,
      archivos: documentPaths
    });
  } catch (error) {
    console.error('Error en test endpoint:', error);
    
    // Manejar específicamente el caso de cédula no encontrada
    if (error.message === 'Cédula no encontrada en la base de datos') {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

module.exports = router; 