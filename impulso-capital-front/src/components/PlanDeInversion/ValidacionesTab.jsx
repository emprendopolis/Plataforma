import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

export default function ValidacionesTab({ id }) {
  const [fields, setFields] = useState([]);
  const [data, setData] = useState({});
  const [tableName] = useState('pi_validaciones');
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState(null); // Seguimos guardando el recordId, por si es necesario
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Estados para historial
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const fetchFilesFromBackend = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Aquí usamos el caracterizacion_id (id), igual que en AnexosTab
      const filesResponse = await axios.get(
        `${config.urls.inscriptions.tables}/${tableName}/record/${id}/files`,
        { headers: { Authorization: `Bearer ${token}` }, params: { source: 'validaciones' } }
      );

      const allFiles = filesResponse.data.files || [];
      setUploadedFiles(allFiles);
    } catch (error) {
      console.error('Error obteniendo los archivos:', error);
      setError('Error obteniendo los archivos');
    }
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

      // Obtener campos
      const fieldsResponse = await axios.get(
        `${config.urls.inscriptions.pi}/tables/${tableName}/fields`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFields(fieldsResponse.data);

      // Obtener registro pi_validaciones por caracterizacion_id
      const recordsResponse = await axios.get(
        `${config.urls.inscriptions.pi}/tables/${tableName}/records?caracterizacion_id=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (recordsResponse.data.length > 0) {
        const existingRecord = recordsResponse.data[0];
        setData(existingRecord);
        setRecordId(existingRecord.id);
      } else {
        // Crear registro si no existe
        const userId = localStorage.getItem('id');
        const createResponse = await axios.post(
          `${config.urls.inscriptions.pi}/tables/${tableName}/record`,
          { caracterizacion_id: id, user_id: userId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const newRecord = createResponse.data.record || createResponse.data;
        setData(newRecord);
        setRecordId(newRecord.id);
      }

      // Obtener archivos usando el caracterizacion_id (id)
      await fetchFilesFromBackend();

      setLoading(false);
    } catch (err) {
      console.error("Error obteniendo datos:", err);
      setError("Error obteniendo datos");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleStatusChange = async (field, status) => {
    const updatedData = { ...data, [field]: status, caracterizacion_id: id };
    setData(updatedData);

    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const userId = localStorage.getItem('id');
      const updatedDataWithUser = { ...updatedData, user_id: userId };

      if (recordId) {
        await axios.put(
          `${config.urls.inscriptions.pi}/tables/${tableName}/record/${recordId}`,
          updatedDataWithUser,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Validación actualizada exitosamente');
      } else {
        const createResponse = await axios.post(
          `${config.urls.inscriptions.pi}/tables/${tableName}/record`,
          updatedDataWithUser,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRecordId(createResponse.data.id);
        alert('Validación creada exitosamente');
      }
    } catch (error) {
      console.error('Error guardando los datos:', error);
      setError('Error guardando los datos');
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileNameChange = (e) => {
    setFileName(e.target.value);
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
      const uniqueSuffix = Date.now();
      const fileNameWithUnique = `${fileName}_${uniqueSuffix}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileNameWithUnique);
      formData.append('caracterizacion_id', id);
      formData.append('user_id', userId);
      formData.append('source', 'validaciones');

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
      setFileName('');
      setShowUploadForm(false);
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
            headers: { Authorization: `Bearer ${token}` },
            data: { user_id: userId } // Enviar user_id en el body
          }
        );

        await fetchFilesFromBackend();
      } catch (error) {
        console.error('Error eliminando el archivo:', error);
        setError('Error eliminando el archivo');
      }
    }
  };

  const handleOpenHistoryModal = async () => {
    await fetchHistory();
    setShowHistoryModal(true);
  };

  const fetchHistory = async () => {
    if (!recordId) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const token = localStorage.getItem('token');
      const historyResponse = await axios.get(
        `${config.urls.inscriptions.tables}/${tableName}/record/${recordId}/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const fetchedHistory = historyResponse.data.history || [];
      fetchedHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setHistory(fetchedHistory);
      setHistoryLoading(false);
    } catch (error) {
      console.error('Error obteniendo el historial:', error);
      setHistoryError('Error obteniendo el historial');
      setHistoryLoading(false);
    }
  };

  const handleCancel = () => {
    fetchData();
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

  return (
    <div>
      {/* <h3>Validaciones</h3> */}
      {loading ? (
        <p>Cargando campos...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div>
          <div className="form-group">
            <label>Aprobación Asesor</label>
            <div>
              <button
                className={`btn ${data['Aprobación asesor'] ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => handleStatusChange('Aprobación asesor', true)}
                disabled={localStorage.getItem('role_id') === '3'}
              >
                Aprobar
              </button>
              <button
                className={`btn ${data['Aprobación asesor'] === false ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => handleStatusChange('Aprobación asesor', false)}
                disabled={localStorage.getItem('role_id') === '3'}
              >
                Rechazar
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Aprobación Propais</label>
            <div>
              <button
                className={`btn ${data['Aprobación propaís'] ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => handleStatusChange('Aprobación propaís', true)}
                disabled={localStorage.getItem('role_id') === '3'}
              >
                Aprobar
              </button>
              <button
                className={`btn ${data['Aprobación propaís'] === false ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => handleStatusChange('Aprobación propaís', false)}
                disabled={localStorage.getItem('role_id') === '3'}
              >
                Rechazar
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Aprobación Alcaldía</label>
            <div>
              <button
                className={`btn ${data['Aprobación comité de compras'] ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => handleStatusChange('Aprobación comité de compras', true)}
                disabled={localStorage.getItem('role_id') === '3'}
              >
                Aprobar
              </button>
              <button
                className={`btn ${data['Aprobación comité de compras'] === false ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => handleStatusChange('Aprobación comité de compras', false)}
                disabled={localStorage.getItem('role_id') === '3'}
              >
                Rechazar
              </button>
            </div>
          </div>

          {/* <div className="mt-4" style={{ width: '100%' }}>
            <h5>Archivos adicionales</h5>
            {!showUploadForm && (
              <button
                className="btn btn-primary btn-sm btn-block mb-2"
                onClick={() => setShowUploadForm(true)}
              >
                Subir documento
              </button>
            )}

            {showUploadForm && (
              <form onSubmit={handleFileUpload}>
                <div className="form-group">
                  <label>Nombre del archivo</label>
                  <input
                    type="text"
                    className="form-control"
                    value={fileName}
                    onChange={handleFileNameChange}
                  />
                </div>
                <div className="form-group">
                  <label>Seleccionar archivo</label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={handleFileChange}
                  />
                </div>
                <button type="submit" className="btn btn-success btn-sm btn-block mb-2">
                  Cargar archivo
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm btn-block"
                  onClick={() => {
                    setShowUploadForm(false);
                    setFile(null);
                    setFileName('');
                  }}
                >
                  Cancelar
                </button>
              </form>
            )}

            {uploadedFiles.length > 0 ? (
              <ul className="list-group mt-3">
                {uploadedFiles.map((f) => (
                  <li
                    key={f.id}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <strong>{f.name}</strong>
                      <br />
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver archivo
                      </a>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleFileDelete(f.id)}
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No hay archivos subidos aún.</p>
            )}
          </div> */}

          {recordId && (
            <button
              type="button"
              className="btn btn-info btn-sm mt-3 btn-historial-right"
              onClick={handleOpenHistoryModal}
            >
              Ver Historial de Cambios
            </button>
          )}

          {/* <div className="d-flex justify-content-between mt-4">
            <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
              Cancelar
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>
              Guardar
            </button>
          </div> */}
        </div>
      )}

      {showHistoryModal && (
        <div
          className="modal fade show"
          style={{ display: 'block' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog modal-lg" role="document" style={{ maxWidth: '90%' }}>
            <div
              className="modal-content"
              style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
              <div className="modal-header">
                <h5 className="modal-title">Historial de Cambios</h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setShowHistoryModal(false)}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ overflowY: 'auto' }}>
                {historyError && (
                  <div className="alert alert-danger">{historyError}</div>
                )}
                {historyLoading ? (
                  <div>Cargando historial...</div>
                ) : history.length > 0 ? (
                  <div
                    className="table-responsive"
                    style={{ maxHeight: '400px', overflowY: 'auto' }}
                  >
                    <table className="table table-striped table-bordered table-sm">
                      <thead className="thead-light">
                        <tr>
                          <th>ID Usuario</th>
                          <th>Usuario</th>
                          <th>Fecha del Cambio</th>
                          <th>Tipo de Cambio</th>
                          <th>Campo</th>
                          <th>Valor Antiguo</th>
                          <th>Valor Nuevo</th>
                          <th>Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((item) => (
                          <tr key={item.id}>
                            <td>{item.user_id}</td>
                            <td>{item.username}</td>
                            <td>{new Date(item.created_at).toLocaleString()}</td>
                            <td>{item.change_type}</td>
                            <td>{item.field_name || '-'}</td>
                            <td>{item.old_value || '-'}</td>
                            <td>{item.new_value || '-'}</td>
                            <td>{item.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-3">No hay historial de cambios.</p>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowHistoryModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}

ValidacionesTab.propTypes = {
  id: PropTypes.string.isRequired,
};

