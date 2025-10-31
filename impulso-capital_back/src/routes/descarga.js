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
 * Obtiene los archivos registrados en pi_anexosv2 para una cédula
 * @param {string} cedula
 * @returns {Promise<{files: Array<{gcsPath: string, name: string, relativePath: string, size: string}>, folderName: string}>}
 */
async function getDocumentPathsForCedula(cedula) {
  const files = [];
  
  try {
    
    // Buscar en la base de datos para obtener el nombre completo de la carpeta y el caracterizacion_id
    const client = await pool.connect();
    const result = await client.query(
      'SELECT id, "Nombres", "Apellidos" FROM inscription_caracterizacion WHERE "Numero de identificacion" = $1',
      [cedula]
    );

    if (result.rows.length === 0) {
      client.release();
      throw new Error('Cédula no encontrada en la base de datos');
    }

    const caracterizacionId = result.rows[0].id;
    const nombres = result.rows[0].Nombres || '';
    const apellidos = result.rows[0].Apellidos || '';
    const nombreCompleto = `${nombres} ${apellidos}`.trim();
    const folderName = `${cedula}_${nombreCompleto}`;
    
    
    // Buscar el registro en pi_anexosv2 para obtener los documentos registrados
    const anexosResult = await client.query(
      'SELECT * FROM pi_anexosv2 WHERE caracterizacion_id = $1',
      [caracterizacionId]
    );

    // Procesar documentos de pi_anexosv2 si existen
    if (anexosResult.rows.length > 0) {
      const anexosRecord = anexosResult.rows[0];
      
      // Obtener todos los campos que contengan rutas de archivos (no nulos y diferentes de cadena vacía)
      const documentFields = Object.keys(anexosRecord).filter(key => {
        const value = anexosRecord[key];
        return value !== null && value !== undefined && value !== '' && typeof value === 'string';
      });


      // Procesar cada ruta de archivo registrada en pi_anexosv2
      for (const fieldName of documentFields) {
        const filePath = anexosRecord[fieldName];
        
        // Saltar campos que no son rutas de archivos (como id, caracterizacion_id, created_at, updated_at, etc.)
        if (['id', 'caracterizacion_id', 'created_at', 'updated_at', 'user_id'].includes(fieldName)) {
          continue;
        }

        if (filePath && typeof filePath === 'string' && filePath.trim() !== '') {
          try {
          // Verificar que el archivo existe en GCS
          const file = bucket.file(filePath);
          const [exists] = await file.exists();
          
          if (exists) {
            // Obtener los metadatos del archivo
            const [metadata] = await file.getMetadata();
            const fileName = filePath.split('/').pop();
            
            // Extraer la ruta relativa dentro de la carpeta principal
            // Si la ruta comienza con el folderName, usarla; si no, construir la ruta relativa
            let relativePath = filePath;
            if (filePath.startsWith(`${folderName}/`)) {
              relativePath = filePath.replace(`${folderName}/`, '');
            }
            
            files.push({
              gcsPath: filePath, 
              name: fileName,
              relativePath: relativePath,
              size: metadata.size || 'unknown',
              fieldName: fieldName // Guardar el nombre del campo para referencia
            });
            
          } else {
          }
        } catch (fileError) {
          continue; // Continuar con el siguiente archivo
        }
      }
    }
      
    } else {
    }
    
    // Obtener documentos iniciales de la tabla files
    const inicialesResult = await client.query(
      `SELECT file_path, name FROM files 
       WHERE record_id = $1 
       AND table_name = 'inscription_caracterizacion' 
       AND source = 'documentos_iniciales'`,
      [caracterizacionId]
    );

    client.release();


    // Procesar cada documento inicial
    for (const row of inicialesResult.rows) {
      const filePath = row.file_path;
      
      if (filePath && typeof filePath === 'string' && filePath.trim() !== '') {
        try {
          // Limpiar la ruta si contiene la URL completa del bucket
          let cleanPath = filePath;
          const bucketUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET}/`;
          if (cleanPath.startsWith(bucketUrl)) {
            cleanPath = cleanPath.slice(bucketUrl.length);
          }
          
          // Verificar que el archivo existe en GCS
          const file = bucket.file(cleanPath);
          const [exists] = await file.exists();
          
          if (exists) {
            // Obtener los metadatos del archivo
            const [metadata] = await file.getMetadata();
            const fileName = row.name || cleanPath.split('/').pop();
            
            // Extraer la ruta relativa dentro de la carpeta principal
            let relativePath = cleanPath;
            if (cleanPath.startsWith(`${folderName}/`)) {
              relativePath = cleanPath.replace(`${folderName}/`, '');
            }
            
            files.push({
              gcsPath: cleanPath, 
              name: fileName,
              relativePath: relativePath,
              size: metadata.size || 'unknown',
              fieldName: 'documentos_iniciales' // Marcar como documento inicial
            });
            
          } else {
          }
        } catch (fileError) {
          continue; // Continuar con el siguiente archivo
        }
      }
    }
    
    return { files, folderName };
  } catch (error) {
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
  
  
  try {
    // 1. Obtener documentos por cédula
    const result = await getDocumentPathsForCedula(cedula);
    const documentPaths = result.files;
    const folderName = result.folderName;
    

    if (documentPaths.length === 0) {
      return res.status(404).json({ message: 'No se encontraron archivos para esta cédula' });
    }

    // 2. Configurar headers de respuesta
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${folderName}.zip`);
    

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
    });

    archive.on('warning', (err) => {
    });

    // 5. Conectar archiver a la respuesta
    archive.pipe(res);

    // 6. Agregar archivos uno por uno
    
    for (let i = 0; i < documentPaths.length; i++) {
      const doc = documentPaths[i];
      
      try {
        const file = bucket.file(doc.gcsPath);
        
        // Verificar existencia del archivo
        const [exists] = await file.exists();
        if (!exists) {
          continue;
        }

        // Crear stream y agregar al ZIP
        const fileStream = file.createReadStream();
        
        fileStream.on('error', (err) => {
        });

        // Agregar archivo al ZIP preservando la estructura de carpetas
        archive.append(fileStream, { name: doc.relativePath });
        
      } catch (fileError) {
        continue; // Continuar con el siguiente archivo
      }
    }

    // 7. Finalizar el archivo
    await archive.finalize();

  } catch (error) {
    
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