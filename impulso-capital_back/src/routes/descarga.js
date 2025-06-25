const express = require('express');
const archiver = require('archiver');
const { Storage } = require('@google-cloud/storage');
const router = express.Router();

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

module.exports = router; 