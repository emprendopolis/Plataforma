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

  // Verificar el rol del usuario
  const userRole = localStorage.getItem('role_id');
  const isConsultaRole = userRole === '3';

  // Estados para el modal
  const [showModal, setShowModal] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Nombres de los documentos para mostrar
  const documentNames = {
    autorizacion_tratamiento_proteccion_datos: 'Autorización tratamiento y protección de datos personales',
    designacion_responsable: 'Designación responsable',
    carta_compromiso: 'Carta de vinculación',
    acta_visita_1: 'Acta de visita 1',
    plan_inversion: 'Plan de inversión',
    evidencia_fotografica_1: 'Evidencia fotográfica 1',
    acta_retiro: 'Acta de retiro'
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

      console.log('📡 fetchData - Obteniendo datos de:', `${config.urls.inscriptions.pi}/tables/${tableName}/records?caracterizacion_id=${id}`);

      const response = await axios.get(
        `${config.urls.inscriptions.pi}/tables/${tableName}/records?caracterizacion_id=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('📦 fetchData - Respuesta completa:', response.data);

      const recordData = response.data[0] || null;

      if (recordData) {
        console.log('📋 fetchData - Datos del registro:', recordData);
        setData(recordData);
        setOriginalData({ ...recordData });
      } else {
        console.log('🆕 fetchData - Creando nuevo registro...');
        // Crear registro con user_id si el backend lo necesita
        const userId = localStorage.getItem('id');
        const createResponse = await axios.post(
          `${config.urls.inscriptions.pi}/tables/${tableName}/record`,
          { caracterizacion_id: id, user_id: userId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const newRecord = createResponse.data.record || createResponse.data; 
        console.log('🆕 fetchData - Nuevo registro creado:', newRecord);
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
      formData.append('fieldName', currentField);

      const uploadResponse = await axios.post(
        `${config.baseUrl}/inscriptions/pi/anexosv2/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Obtener la URL del archivo desde la respuesta del backend
      const fileUrl = uploadResponse.data.url;

      // Actualizar el campo en la base de datos con la URL del archivo
      const updateData = {
        [currentField]: fileUrl
      };

      // Usar la ruta correcta para tablas pi_
      const updateUrl = tableName.startsWith('pi_') 
        ? `${config.urls.inscriptions.tables.replace('/tables', '/pi/tables')}/${tableName}/record/${data.id}`
        : `${config.urls.inscriptions.tables}/${tableName}/record/${data.id}`;

      await axios.put(
        updateUrl,
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

  const handleFileView = async (filePath) => {
    try {
      console.log('🔍 handleFileView - filePath:', filePath);
      
      // Si filePath ya es una URL firmada, usarla directamente
      if (filePath.startsWith('https://')) {
        console.log('✅ Usando URL firmada existente:', filePath);
        window.open(filePath, '_blank');
        return;
      }
      
      // Si no es una URL, generar una nueva URL firmada
      const token = localStorage.getItem('token');
      
      // Obtener URL firmada del backend
      const response = await axios.get(
        `${config.baseUrl}/inscriptions/files/signed-url/${encodeURIComponent(filePath)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('✅ URL firmada obtenida:', response.data.signedUrl);
      
      // Abrir el archivo en una nueva pestaña
      window.open(response.data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error obteniendo URL firmada:', error);
      alert('Error al abrir el archivo');
    }
  };

  const handleFileDelete = async (fieldName) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('id');
        
        // Eliminar archivo de GCS y limpiar campo en tabla pi_
        if (data[fieldName]) {
          // Extraer el nombre del archivo de la ruta de GCS
          const fileName = data[fieldName].split('/').pop();
          
          console.log('🗑️ Eliminando archivo:', fileName);
          console.log('🏷️ Campo a limpiar:', fieldName);
          
          const response = await axios.delete(
            `${config.baseUrl}/inscriptions/pi/tables/${tableName}/record/${data.caracterizacion_id}/file/${fileName}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              data: { 
                user_id: userId,
                field_name: fieldName,
                record_id: data.id // ID del registro en pi_anexosv2
              }
            }
          );
          
          console.log('✅ Respuesta del servidor:', response.data);
        }

        console.log('🔄 Actualizando datos...');
        await fetchData();
        console.log('✅ Datos actualizados');
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
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                handleFileView(data[fieldName]);
              }}
              className="text-primary text-decoration-none"
            >
              Ver archivo adjunto
            </a>
            <button
              className="btn btn-link text-danger btn-sm ms-2 p-0"
              onClick={() => handleFileDelete(fieldName)}
              title={isConsultaRole ? "No tienes permisos para eliminar archivos" : "Eliminar archivo"}
              disabled={isConsultaRole}
              style={{ 
                opacity: isConsultaRole ? 0.5 : 1,
                cursor: isConsultaRole ? 'not-allowed' : 'pointer'
              }}
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
              <div className="modal-content" style={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                <div className="modal-header" style={{ borderBottom: '1px solid #e9ecef', borderRadius: '15px 15px 0 0' }}>
                  <h6 className="modal-title" style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                    Subir {documentNames[currentField]}
                  </h6>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={closeModal}
                    aria-label="Cerrar"
                    style={{ 
                      background: 'none',
                      border: 'none',
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: '#070024',
                      cursor: 'pointer',
                      padding: '0',
                      width: '30px',
                      height: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
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
                <div className="modal-footer" style={{ borderTop: '1px solid #e9ecef', borderRadius: '0 0 15px 15px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={closeModal}
                    style={{ borderRadius: '8px' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    className="btn" 
                    onClick={handleFileUpload}
                    disabled={!selectedFile}
                    style={{ 
                      backgroundColor: '#070024',
                      borderColor: '#070024',
                      color: 'white',
                      borderRadius: '8px',
                      padding: '8px 20px',
                      fontWeight: '500'
                    }}
                  >
                    {selectedFile ? 'Cargar' : 'Selecciona un archivo primero'}
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