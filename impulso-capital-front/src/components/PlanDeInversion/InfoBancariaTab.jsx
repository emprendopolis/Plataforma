import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import config from '../../config';

export default function InfoBancariaTab({ id }) {
  const [data, setData] = useState({
    "Banco": "",
    "Tipo de cuenta": "",
    "Número de cuenta": "",
    "Tipo de documento titular": "",
    "Número de identificación": "",
  });

  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [originalData, setOriginalData] = useState(null);

  // Ahora utilizamos un array para los archivos subidos
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");

  const bancos = [
    "BANCAMIA",
    "BANCO AGRARIO",
    "BANCO AV VILLAS",
    "BANCO BBVA COLOMBIA S.A.",
    "BANCO CAJA SOCIAL",
    "BANCO COLPATRIA",
    "BANCO COOPERATIVO COOPCENTRAL",
    "BANCO CREDIFINANCIERA",
    "BANCO DAVIVIENDA",
    "BANCO DE BOGOTA",
    "BANCO DE OCCIDENTE",
    "BANCO FALABELLA",
    "BANCO FINANDINA",
    "BANCO GNB SUDAMERIS",
    "BANCO MIBANCO",
    "BANCO MUNDO MUJER",
    "BANCO PICHINCHA",
    "BANCO POPULAR",
    "BANCO SERFINANZA",
    "BANCO NU",
    "BANCO W",
    "BANCOLOMBIA",
    "BANCOOMEVA S.A.",
    "CONFIAR COOPERATIVA FINANCIERA",
    "DAVIPLATA",
    "NEQUI",
    "LULO BANK",
    "MOVII S.A.",
    "BANCO SANTANDER COLOMBIA",
    "UALA",
  ];

  const tiposCuenta = [
    "Cuenta de ahorros",
    "Cuenta corriente",
  ];

  const tiposDocumento = [
    "Cedula de Ciudadania",
    "Cedula de Extranjeria",
    "Contrasena de cedula",
    "NIT",
    "Permiso especial de permanencia",
    "Permiso por proteccion temporal",
    "Permiso temporal de permanencia"
  ];

  // Estados para historial de cambios
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const fetchFilesFromBackend = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const filesResponse = await axios.get(
        `${config.urls.inscriptions.base}/tables/pi_informacion_bancaria/record/${id}/files`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );

      const allFiles = filesResponse.data.files || [];
      // Filtrar todos los archivos con el prefijo info_bancaria_
      const filteredFiles = allFiles.filter(f => f.name.includes('info_bancaria_'));
      setUploadedFiles(filteredFiles);
    } catch (err) {
      console.error("Error obteniendo archivos:", err);
      setError("Error obteniendo archivos");
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No se encontró el token de autenticación");
        setLoading(false);
        return;
      }

      // Obtener registro pi_informacion_bancaria
      const response = await axios.get(
        `${config.urls.inscriptions.base}/pi/tables/pi_informacion_bancaria/records?caracterizacion_id=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const recordData = response.data[0] || null;

      if (recordData) {
        setRecordId(recordData.id);
        setData({
          "Banco": recordData["Banco"] || "",
          "Tipo de cuenta": recordData["Tipo de cuenta"] || "",
          "Número de cuenta": recordData["Número de cuenta"] || "",
          "Tipo de documento titular": recordData["Tipo de documento titular"] || "",
          "Número de identificación": recordData["Número de identificación"] || "",
        });
        setOriginalData({
          "Banco": recordData["Banco"] || "",
          "Tipo de cuenta": recordData["Tipo de cuenta"] || "",
          "Número de cuenta": recordData["Número de cuenta"] || "",
          "Tipo de documento titular": recordData["Tipo de documento titular"] || "",
          "Número de identificación": recordData["Número de identificación"] || "",
        });
      } else {
        // No existe registro, inicializar vacío
        setRecordId(null);
        setData({
          "Banco": "",
          "Tipo de cuenta": "",
          "Número de cuenta": "",
          "Tipo de documento titular": "",
          "Número de identificación": "",
        });
        setOriginalData({
          "Banco": "",
          "Tipo de cuenta": "",
          "Número de cuenta": "",
          "Tipo de documento titular": "",
          "Número de identificación": "",
        });
      }

      // Obtener archivos asociados
      await fetchFilesFromBackend();

      setLoading(false);
    } catch (err) {
      console.error("Error obteniendo registros de información bancaria:", err);
      setError("Error obteniendo datos");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    if (originalData) {
      setData({ ...originalData });
      setFile(null);
      setFileName("");
      fetchRecords();
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No se encontró el token de autenticación");
        return;
      }

      // Aquí obtenemos el user_id del localStorage
      const userId = localStorage.getItem("id");

      const requestData = {
        user_id: userId, // <-- importante para que el backend lo reciba
        caracterizacion_id: id,
        "Banco": data["Banco"],
        "Tipo de cuenta": data["Tipo de cuenta"],
        "Número de cuenta": data["Número de cuenta"],
        "Tipo de documento titular": data["Tipo de documento titular"],
        "Número de identificación": data["Número de identificación"],
      };

      if (recordId) {
        // Actualizar (PUT)
        await axios.put(
          `${config.urls.inscriptions.base}/pi/tables/pi_informacion_bancaria/record/${recordId}`,
          requestData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Crear (POST)
        const createResponse = await axios.post(
          `${config.urls.inscriptions.base}/pi/tables/pi_informacion_bancaria/record`,
          requestData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Guardar el nuevo ID para referencia futura
        if (createResponse.data && createResponse.data.record) {
          setRecordId(createResponse.data.record.id);
        }
      }

      alert("Información guardada exitosamente");
      await fetchRecords();
    } catch (err) {
      console.error("Error guardando la información bancaria:", err);
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
      const userId = localStorage.getItem('id'); // Obtener el user_id del localStorage
      // Generar un nombre único para evitar sobrescritura
      const uniqueSuffix = Date.now();
      const fileNameWithPrefix = `info_bancaria_${fileName}_${uniqueSuffix}`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileNameWithPrefix);
      formData.append('caracterizacion_id', id);
      formData.append('user_id', userId);

      await axios.post(
        `${config.urls.inscriptions.base}/tables/pi_informacion_bancaria/record/${id}/upload`,
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
          `${config.urls.inscriptions.base}/tables/pi_informacion_bancaria/record/${id}/file/${fileId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
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

  // Funciones para el historial de cambios
  const fetchHistory = async () => {
    if (!recordId) {
      setHistoryError("No hay historial disponible para este registro.");
      setHistory([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert("No se encontró el token de autenticación");
        setHistoryLoading(false);
        return;
      }

      const response = await axios.get(
        `${config.urls.inscriptions.base}/pi/tables/pi_informacion_bancaria/record/${recordId}/history`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const fetchedHistory = response.data.history || [];

      // Ordenar el historial por fecha descendente
      fetchedHistory.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setHistory(fetchedHistory);
      setHistoryLoading(false);
    } catch (err) {
      console.error("Error obteniendo el historial:", err);
      setHistoryError("Error obteniendo el historial");
      setHistoryLoading(false);
    }
  };

  const handleOpenHistoryModal = async () => {
    await fetchHistory();
    setShowHistoryModal(true);
  };

  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
  };

  return (
    <div>
      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div style={{ maxWidth: '600px' }}>
          <div className="card p-3 mb-3">
            <h5>Información para el pago</h5>
            
            <div className="mb-2">
              <label><strong>Banco</strong></label><br/>
              <select
                className="form-select"
                name="Banco"
                value={data["Banco"]}
                onChange={handleChange}
              >
                <option value="">Seleccionar...</option>
                {bancos.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="mb-2">
              <label><strong>Tipo de cuenta</strong></label><br/>
              <select
                className="form-select"
                name="Tipo de cuenta"
                value={data["Tipo de cuenta"]}
                onChange={handleChange}
              >
                <option value="">Seleccionar...</option>
                {tiposCuenta.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="mb-2">
              <label><strong>Número de cuenta</strong></label><br/>
              <input
                type="number"
                className="form-control"
                name="Número de cuenta"
                value={data["Número de cuenta"]}
                onChange={handleChange}
                placeholder="Ej: 3582004071"
              />
            </div>

            <div className="mb-2">
              <label><strong>Tipo de documento titular</strong></label><br/>
              <select
                className="form-select"
                name="Tipo de documento titular"
                value={data["Tipo de documento titular"]}
                onChange={handleChange}
              >
                <option value="">Seleccionar...</option>
                {tiposDocumento.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="mb-2">
              <label><strong>Número de identificación</strong></label><br/>
              <input
                type="number"
                className="form-control"
                name="Número de identificación"
                value={data["Número de identificación"]}
                onChange={handleChange}
                placeholder="Ej: 1010239532"
              />
            </div>

            <div className="mb-2">
              <label><strong>Archivos Adjuntos</strong></label><br/>
              {uploadedFiles && uploadedFiles.length > 0 ? (
                <ul className="list-group mb-2">
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
                        Eliminar archivo
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-2">No hay archivos adjuntos</p>
              )}

              {file ? (
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
                    onClick={() => {
                      setFile(null);
                      setFileName("");
                    }}
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
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
              <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
                Cancelar
              </button>
              <div>
                {/* Botón para ver historial de cambios */}
                {recordId && (
                  <button
                    type="button"
                    className="btn btn-info btn-sm me-2 btn-historial-right"
                    onClick={handleOpenHistoryModal}
                  >
                    Ver Historial de Cambios
                  </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={handleSave}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Cambios */}
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
                  onClick={handleCloseHistoryModal}
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
                            <td>{item.username || 'Usuario'}</td>
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
                  onClick={handleCloseHistoryModal}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(showHistoryModal) && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
}

InfoBancariaTab.propTypes = {
  id: PropTypes.string.isRequired,
};



