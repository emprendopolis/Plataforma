import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

export default function AnexosV2Tab({ id }) {
  const [data, setData] = useState({});
  const [tableName] = useState('pi_anexosv2');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [originalData, setOriginalData] = useState(null);

  // Estados para el modal
  const [showModal, setShowModal] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Nombres de los documentos para mostrar
  const documentNames = {
    autorizacion_tratamiento_proteccion_datos: 'Autorización tratamiento y protección de datos personales',
    designacion_responsable: 'Designación responsable',
    carta_compromiso: 'Carta de compromiso',
    acta_visita_1: 'Acta de visita 1',
    plan_inversion: 'Plan de inversión',
    evidencia_fotografica_1: 'Evidencia fotográfica 1'
  };

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

      setLoading(false);
    } catch (err) {
      console.error("Error obteniendo datos de Anexos V2:", err);
      setError("Error obteniendo datos");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const openUploadModal = (fieldName) => {
    setCurrentField(fieldName);
    setSelectedFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentField(null);
    setSelectedFile(null);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert('Por favor, selecciona un archivo');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('id');
      
      const uniqueSuffix = Date.now();
      const extension = selectedFile.name.split('.').pop();
      const fileNameWithPrefix = `${currentField}_${uniqueSuffix}.${extension}`;

      const formData = new FormData();
      formData.append('file', selectedFile);
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

      // Actualizar el campo en la base de datos con la URL del archivo
      const updateData = {
        [currentField]: fileNameWithPrefix
      };

      await axios.put(
        `${config.urls.inscriptions.tables}/${tableName}/record/${data.id}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      alert("Archivo subido exitosamente");
      await fetchData();
      closeModal();
    } catch (error) {
      console.error('Error subiendo el archivo:', error);
      setError('Error subiendo el archivo');
    }
  };

  const handleFileDelete = async (fieldName) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('id');
        
        // Eliminar el archivo físico
        if (data[fieldName]) {
          await axios.delete(
            `${config.urls.inscriptions.tables}/${tableName}/record/${id}/file/${data[fieldName]}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              data: { user_id: userId }
            }
          );
        }

        // Limpiar el campo en la base de datos
        const updateData = {
          [fieldName]: null
        };

        await axios.put(
          `${config.urls.inscriptions.tables}/${tableName}/record/${data.id}`,
          updateData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        await fetchData();
      } catch (error) {
        console.error('Error eliminando el archivo:', error);
        setError('Error eliminando el archivo');
      }
    }
  };

  const renderDocumentItem = (fieldName) => {
    const hasFile = data[fieldName] && data[fieldName].trim() !== '';
    
    return (
      <div key={fieldName} className="document-item mb-3">
        <h6 className="document-title mb-1">{documentNames[fieldName]}</h6>
        
        {hasFile ? (
          <div className="document-status">
            <i className="fas fa-paperclip text-primary me-2"></i>
            <a 
              href={`${config.baseUrl}/uploads/${data[fieldName]}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary text-decoration-none"
            >
              Ver archivo adjunto
            </a>
            <button
              className="btn btn-link text-danger btn-sm ms-2 p-0"
              onClick={() => handleFileDelete(fieldName)}
              title="Eliminar archivo"
            >
              <i className="fas fa-trash"></i>
            </button>
          </div>
        ) : (
          <div className="document-status">
            <span 
              className="text-muted cursor-pointer"
              onClick={() => openUploadModal(fieldName)}
              style={{ cursor: 'pointer' }}
            >
              Sin archivo adjunto
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div style={{ maxWidth: '600px' }}>
          <div className="card p-4">
            <h5 className="mb-4" style={{ fontWeight: 'bold' }}>Documentos primera visita</h5>
            
            {Object.keys(documentNames).map(fieldName => 
              renderDocumentItem(fieldName)
            )}
          </div>
        </div>
      )}

      {/* Modal para subir archivo */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div 
            className="modal-backdrop fade show" 
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1040
            }}
            onClick={closeModal}
          ></div>
          
          {/* Modal */}
          <div 
            className="modal fade show" 
            style={{ 
              display: 'block', 
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 1050
            }} 
            tabIndex="-1"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Subir {documentNames[currentField]}
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={closeModal}
                    aria-label="Cerrar"
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Seleccionar archivo:</label>
                    <input
                      type="file"
                      className="form-control"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      id="fileInput"
                    />
                    {selectedFile && (
                      <div className="mt-2 p-2 bg-light rounded">
                        <small className="text-success">
                          <i className="fas fa-check me-1"></i>
                          Archivo seleccionado: {selectedFile.name}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={closeModal}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleFileUpload}
                    disabled={!selectedFile}
                  >
                    {selectedFile ? 'Subir archivo' : 'Selecciona un archivo primero'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

AnexosV2Tab.propTypes = {
  id: PropTypes.string.isRequired,
}; 