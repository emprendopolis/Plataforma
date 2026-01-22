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

  // Estados para condiciones de visibilidad
  const [priorizacionCapitalizacion, setPriorizacionCapitalizacion] = useState(null);
  const [modalidadCapitalizacion, setModalidadCapitalizacion] = useState(null);

  // Nombres de los documentos para mostrar
  const documentNames = {
    // Documentos Primera Visita
    autorizacion_tratamiento_proteccion_datos: 'Autorización tratamiento y protección de datos personales',
    designacion_responsable: 'Designación responsable',
    carta_compromiso: 'Carta de vinculación',
    acta_visita_1: 'Acta de visita 1',
    plan_inversion: 'Plan de inversión',
    evidencia_fotografica_1: 'Evidencia fotográfica 1',
    acta_retiro: 'Acta de retiro',
    
    // Cierre de Ruta
    acta_visita_2: 'Acta de Visita 2',
    recibo_satisfaccion: 'Formato de recibo a satisfacción',
    evidencia_fotografica_2: 'Registro fotográfico',
    facturas: 'Facturas',
    acta_comite: 'Formato Acta de Comité de aprobación de compras',
    bienes_aprobados: 'Excel con bienes aprobados',
    acta_causales: 'Acta de causales de inasistencia',
    lista_asistencia: 'GH-F-008 Formato Lista de Asistencia',
    certificado_formacion: 'Certificado de formación',
    incumplimiento: 'Acta de incumplimiento',
    
    // Módulo Arriendo
    contrato_arriendo: 'Contrato arrendamiento',
    camara_comercio: 'Cámara de comercio',
    certif_tradicion_libertad: 'Certificado de tradición y libertad',
    certificado_deuda_arriendo: 'Certificado de deuda',
    certificacion_banco_arriendo: 'Certificación bancaria',
    tipo_cc_ce: 'Tipo documento',
    cuenta_de_cobro: 'Cuenta de cobro',
    
    // Módulo Deuda
    certificado_deuda_deuda: 'Certificado de deuda',
    certificado_banco_deuda: 'Certificación bancaria'
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

  // Obtener Priorizacion capitalizacion y modalidadCapitalizacion
  useEffect(() => {
    const fetchPriorizacionYModalidad = async () => {
      if (!id) return;
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Obtener Priorizacion capitalizacion desde inscription_caracterizacion
        const caracterizacionResponse = await axios.get(
          `${config.urls.inscriptions.tables}/inscription_caracterizacion/record/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPriorizacionCapitalizacion(
          caracterizacionResponse.data.record?.['Priorizacion capitalizacion'] ?? null
        );

        // Obtener modalidadCapitalizacion desde pi_datos
        try {
          const datosResponse = await axios.get(
            `${config.urls.inscriptions.base}/pi/tables/pi_datos/records?caracterizacion_id=${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (datosResponse.data.length > 0) {
            setModalidadCapitalizacion(
              datosResponse.data[0].modalidadCapitalizacion || null
            );
          } else {
            setModalidadCapitalizacion(null);
          }
        } catch (error) {
          console.error('Error obteniendo modalidadCapitalizacion:', error);
          setModalidadCapitalizacion(null);
        }
      } catch (error) {
        console.error('Error obteniendo Priorizacion capitalizacion:', error);
        setPriorizacionCapitalizacion(null);
      }
    };

    fetchPriorizacionYModalidad();
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
      console.log('🔍 [handleFileUpload] URL del archivo recibida:', fileUrl);
      console.log('🔍 [handleFileUpload] Campo actual:', currentField);
      console.log('🔍 [handleFileUpload] data.id:', data.id);
      console.log('🔍 [handleFileUpload] data completo:', data);

      // Verificar que data.id exista antes de actualizar
      if (!data.id) {
        console.error('❌ [handleFileUpload] Error: data.id no está definido. Recargando datos...');
        await fetchData();
        // Intentar obtener el id nuevamente después de recargar
        if (!data.id) {
          console.error('❌ [handleFileUpload] Error: No se pudo obtener el ID del registro después de recargar');
          alert('Error: No se pudo obtener el ID del registro. Por favor, recarga la página.');
          return;
        }
        console.log('✅ [handleFileUpload] data.id obtenido después de recargar:', data.id);
      }

      // Actualizar el campo en la base de datos con la URL del archivo
      const updateData = {
        [currentField]: fileUrl
      };
      console.log('🔍 [handleFileUpload] Datos a actualizar:', updateData);

      // Usar la ruta correcta para tablas pi_
      const updateUrl = tableName.startsWith('pi_') 
        ? `${config.urls.inscriptions.tables.replace('/tables', '/pi/tables')}/${tableName}/record/${data.id}`
        : `${config.urls.inscriptions.tables}/${tableName}/record/${data.id}`;
      
      console.log('🔍 [handleFileUpload] URL de actualización:', updateUrl);
      console.log('🔍 [handleFileUpload] tableName:', tableName);
      console.log('🔍 [handleFileUpload] config.urls.inscriptions.tables:', config.urls.inscriptions.tables);

      const updateResponse = await axios.put(
        updateUrl,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ [handleFileUpload] Respuesta de actualización:', updateResponse.data);

      alert("Archivo subido exitosamente");
      await fetchData();
      closeModal();
    } catch (error) {
      console.error('❌ [handleFileUpload] Error subiendo el archivo:', error);
      console.error('❌ [handleFileUpload] Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
        }
      });
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      console.error('❌ [handleFileUpload] Mensaje de error:', errorMessage);
      alert(`Error subiendo el archivo: ${errorMessage}`);
      setError(`Error subiendo el archivo: ${errorMessage}`);
    }
  };

  const handleFileView = async (filePath) => {
    try {
      
      // Si filePath ya es una URL firmada, usarla directamente
      if (filePath.startsWith('https://')) {
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
          
        }

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

  // Separar los campos por secciones
  const primeraVisitaFields = [
    'autorizacion_tratamiento_proteccion_datos',
    'designacion_responsable', 
    'carta_compromiso',
    'acta_visita_1',
    'plan_inversion',
    'evidencia_fotografica_1',
    'acta_retiro'
  ];

  const cierreRutaFields = [
    'acta_visita_2',
    'recibo_satisfaccion',
    'evidencia_fotografica_2',
    'facturas',
    'acta_comite',
    'bienes_aprobados',
    'acta_causales',
    'lista_asistencia',
    'certificado_formacion',
    'incumplimiento'
  ];

  const arriendoFields = [
    'contrato_arriendo',
    'camara_comercio',
    'certif_tradicion_libertad',
    'certificado_deuda_arriendo',
    'certificacion_banco_arriendo',
    'tipo_cc_ce',
    'cuenta_de_cobro'
  ];

  const deudaFields = [
    'certificado_deuda_deuda',
    'certificado_banco_deuda'
  ];

  // Funciones para determinar visibilidad de módulos
  const shouldShowArriendo = () => {
    return (
      priorizacionCapitalizacion === 'Grupo 3' &&
      modalidadCapitalizacion === 'Pago de canon de arrendamiento'
    );
  };

  const shouldShowDeuda = () => {
    return (
      priorizacionCapitalizacion === 'Grupo 3' &&
      modalidadCapitalizacion === 'Cobertura de deuda comercial financiera'
    );
  };

  return (
    <div>
      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div style={{ maxWidth: '800px' }}>
          {/* Sección Documentos Primera Visita */}
          <div className="card p-4 mb-4">
            <h5 className="mb-4" style={{ fontWeight: 'bold' }}>Documentos Primera Visita</h5>
            
            {primeraVisitaFields.map(fieldName => 
              renderDocumentItem(fieldName)
            )}
          </div>

          {/* Sección Módulo Arriendo - Solo visible si se cumplen las condiciones */}
          {shouldShowArriendo() && (
            <div className="card p-4 mb-4">
              <h5 className="mb-4" style={{ fontWeight: 'bold' }}>Módulo Arriendo</h5>
              
              {arriendoFields.map(fieldName => 
                renderDocumentItem(fieldName)
              )}
            </div>
          )}

          {/* Sección Módulo Crédito/Deuda - Solo visible si se cumplen las condiciones */}
          {shouldShowDeuda() && (
            <div className="card p-4 mb-4">
              <h5 className="mb-4" style={{ fontWeight: 'bold' }}>Módulo Crédito/Deuda</h5>
              
              {deudaFields.map(fieldName => 
                renderDocumentItem(fieldName)
              )}
            </div>
          )}

          {/* Sección Cierre de Ruta */}
          <div className="card p-4">
            <h5 className="mb-4" style={{ fontWeight: 'bold' }}>Cierre de Ruta</h5>
            
            {cierreRutaFields.map(fieldName => 
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