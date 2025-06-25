import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

export default function AnexosTab({ id }) {
  const [data, setData] = useState({});
  const [tableName] = useState('pi_anexos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [originalData, setOriginalData] = useState(null);

  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  const isRole3 = localStorage.getItem('role_id') === '3';

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No se encontró el token de autenticación");
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${config.urls.inscriptions.pi}/tables/${tableName}/records?caracterizacion_id=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const recordData = response.data[0] || null;

      if (recordData) {
        setData(recordData);
        setOriginalData({ ...recordData });
      } else {
        // Crear registro con user_id si el backend lo necesita
        const userId = localStorage.getItem('id');
        const createResponse = await axios.post(
          `${config.urls.inscriptions.pi}/tables/${tableName}/record`,
          { caracterizacion_id: id, user_id: userId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const newRecord = createResponse.data.record || createResponse.data; 
        setData({ ...newRecord });
        setOriginalData({ ...newRecord });
      }

      await fetchFilesFromBackend();

      setLoading(false);
    } catch (err) {
      console.error("Error obteniendo datos de Anexos:", err);
      setError("Error obteniendo datos");
      setLoading(false);
    }
  };

  const fetchFilesFromBackend = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const filesResponse = await axios.get(
        `${config.urls.inscriptions.tables}/${tableName}/record/${id}/files`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const allFiles = filesResponse.data.files || [];
      console.log('Archivos recibidos del backend:', allFiles);
      // Mostrar todos los archivos con el prefijo anexos_
      const filteredFiles = allFiles.filter(f => f.name.includes('anexos_'));
      console.log('Archivos filtrados (anexos_):', filteredFiles);
      setUploadedFiles(filteredFiles);

    } catch (error) {
      console.error('Error obteniendo el archivo:', error);
      setError('Error obteniendo el archivo');
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleCancel = () => {
    if (originalData) {
      setData({ ...originalData });
      setFile(null);
      setFileName("");
      fetchData();
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No se encontró el token de autenticación");
        return;
      }
      alert("Información guardada exitosamente");
      await fetchData();
    } catch (err) {
      console.error("Error guardando la información:", err);
      setError("Error guardando la información");
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file || !fileName) {
      alert('Por favor, ingresa un nombre y selecciona un archivo');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('id');
      
      // Asegurar que el nombre del archivo tenga el prefijo anexos_
      const fileNameWithoutPrefix = fileName.startsWith('anexos_') ? fileName.replace('anexos_', '') : fileName;
      const uniqueSuffix = Date.now();
      // Extraer la extensión del archivo original
      const extension = file.name.split('.').pop();
      // Construir el nombre final con extensión
      const fileNameWithPrefix = `anexos_${fileNameWithoutPrefix}_${uniqueSuffix}.${extension}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileNameWithPrefix);
      formData.append('caracterizacion_id', id);
      formData.append('user_id', userId);

      await axios.post(
        `${config.urls.inscriptions.tables}/${tableName}/record/${id}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      alert("Archivo subido exitosamente");
      await fetchFilesFromBackend();
      setFile(null);
      setFileName("");
    } catch (error) {
      console.error('Error subiendo el archivo:', error);
      setError('Error subiendo el archivo');
    }
  };

  const handleFileDelete = async (fileId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('id');
        await axios.delete(
          `${config.urls.inscriptions.tables}/${tableName}/record/${id}/file/${fileId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            data: { user_id: userId }
          }
        );

        await fetchFilesFromBackend();
      } catch (error) {
        console.error('Error eliminando el archivo:', error);
        setError('Error eliminando el archivo');
      }
    }
  };

  return (
    <div>
      {/* <h3>Anexos</h3> */}
      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div style={{ maxWidth: '600px' }}>
          <div className="card p-3 mb-3">
            <h5>Archivos adicionales</h5>

            <div className="mb-2">
              <label><strong>Adjuntar archivo</strong></label><br/>

              {uploadedFiles && uploadedFiles.length > 0 ? (
                <ul className="list-group mb-2">
                  {uploadedFiles.map((f) => {
                    // Mostrar el nombre del archivo sin el prefijo 'anexos_' y el timestamp
                    let displayName = f.name;
                    if (displayName.startsWith('anexos_')) {
                      // Elimina 'anexos_' y el sufijo de timestamp si existe
                      const parts = displayName.replace('anexos_', '').split('_');
                      if (parts.length > 1) {
                        // El último elemento es el timestamp, lo quitamos
                        parts.pop();
                        displayName = parts.join('_');
                      } else {
                        displayName = parts[0];
                      }
                    }
                    return (
                      <li
                        key={f.id}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <strong>{displayName}</strong>
                          <br />
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.preventDefault();
                              if (f.url) {
                                window.open(f.url, '_blank');
                              } else {
                                alert('No se pudo obtener la URL del archivo');
                              }
                            }}
                          >
                            Ver archivo
                          </a>
                        </div>
                        {!isRole3 && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleFileDelete(f.id)}
                          >
                            Eliminar archivo
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mb-2">No hay archivos adjuntos</p>
              )}

              {!isRole3 && file ? (
                <form onSubmit={handleFileUpload}>
                  <div className="form-group mb-2">
                    <label>Nombre del archivo</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="Nombre del archivo sin extensión"
                    />
                  </div>
                  <button type="submit" className="btn btn-success btn-sm me-2">
                    Cargar archivo
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setFile(null); setFileName(""); }}
                  >
                    Cancelar
                  </button>
                </form>
              ) : !isRole3 && (
                <div className="mt-2">
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </div>

            <div className="d-flex justify-content-between mt-4">
              {!isRole3 && (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleSave}>
                    Guardar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

AnexosTab.propTypes = {
  id: PropTypes.string.isRequired,
};
