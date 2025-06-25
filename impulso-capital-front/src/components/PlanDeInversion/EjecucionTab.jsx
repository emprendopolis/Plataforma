import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import config from '../../config';

export default function EjecucionTab({ id }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newRubro, setNewRubro] = useState({
    "Rubro": "",
    "Elemento": "",
    "Descripción": "",
    "Cantidad": "",
    "Valor Unitario": "",
  });

  const rubrosOptions = [
    "Maquinaria y equipo",
    "Insumos/Materias primas",
    "Cursos",
    "Póliza",
  ];

  const montoDisponible = 3000000; // 3 millones

  const [uploadedFilesMap, setUploadedFilesMap] = useState({});
  const [uploadingRecordId, setUploadingRecordId] = useState(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);

  // Estados para cumplimiento
  const [selectedFileForCompliance, setSelectedFileForCompliance] = useState(null);
  const [complianceCumple, setComplianceCumple] = useState(null);
  const [complianceDescripcion, setComplianceDescripcion] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No se encontró el token de autenticación");
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${config.urls.inscriptions.base}/pi/tables/pi_ejecucion/records?caracterizacion_id=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const fetchedRecords = response.data || [];
      setRecords(fetchedRecords);

      await fetchAllRecordsFiles(fetchedRecords);

    } catch (error) {
      console.error("Error obteniendo registros de ejecución:", error);
      setError('Error obteniendo los registros de ejecución');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRecordsFiles = async (fetchedRecords) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const filesResponse = await axios.get(
      `${config.urls.inscriptions.base}/tables/pi_ejecucion/record/${id}/files`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );

    const allFiles = filesResponse.data.files || [];

    const updatedMap = {};
    fetchedRecords.forEach((rec) => {
      const ejecucion_id = rec.id;
      const ejecucionFiles = allFiles.filter(f => {
        const match = f.name.match(/_ejecucion_(\d+)/);
        if (!match) return false;
        const fileEjecucionId = parseInt(match[1], 10);
        return fileEjecucionId === ejecucion_id;
      });
      updatedMap[ejecucion_id] = ejecucionFiles;
    });

    setUploadedFilesMap(updatedMap);
  };

  useEffect(() => {
    fetchRecords();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewRubro((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem('id');
      if (!token) {
        alert("No se encontró el token de autenticación");
        return;
      }

      const { Rubro, Elemento, Descripción, Cantidad, "Valor Unitario": ValorUnitario } = newRubro;

      if (!Rubro || !Elemento || !Cantidad || !ValorUnitario) {
        alert("Por favor completa Rubro, Elemento, Cantidad y Valor Unitario.");
        return;
      }

      const requestData = {
        caracterizacion_id: id,
        "Rubro": Rubro,
        "Elemento": Elemento,
        "Descripción": Descripción || "",
        "Cantidad": parseInt(Cantidad, 10) || 0,
        "Valor Unitario": parseFloat(ValorUnitario) || 0,
        user_id: userId
      };

      await axios.post(
        `${config.urls.inscriptions.base}/pi/tables/pi_ejecucion/record`,
        requestData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchRecords();

      setNewRubro({
        "Rubro": "",
        "Elemento": "",
        "Descripción": "",
        "Cantidad": "",
        "Valor Unitario": "",
      });

      alert("Rubro guardado exitosamente");
    } catch (error) {
      console.error("Error guardando el rubro:", error);
      alert("Hubo un error al guardar el rubro");
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
      const fileNameWithEjecucion = `${fileName}_ejecucion_${uploadingRecordId}`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileNameWithEjecucion);
      formData.append('caracterizacion_id', id);
      formData.append('user_id', userId);

      await axios.post(
        `${config.urls.inscriptions.base}/tables/pi_ejecucion/record/${id}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      await fetchAllRecordsFiles(records);
      setFile(null);
      setFileName('');
      setUploadingRecordId(null);
    } catch (error) {
      console.error('Error subiendo el archivo:', error);
      setError('Error subiendo el archivo');
    }
  };

  const handleFileDelete = async (ejecucion_id, fileId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('id');
        await axios.delete(
          `${config.urls.inscriptions.base}/tables/pi_ejecucion/record/${id}/file/${fileId}?user_id=${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        await fetchAllRecordsFiles(records);
      } catch (error) {
        console.error('Error eliminando el archivo:', error);
        setError('Error eliminando el archivo');
      }
    }
  };

  const handleDeleteRecord = async (ejecucion_id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('id');
        await axios.delete(
          `${config.urls.inscriptions.base}/pi/tables/pi_ejecucion/record/${ejecucion_id}?user_id=${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        await fetchRecords();
      } catch (error) {
        console.error('Error eliminando el registro:', error);
        setError('Error eliminando el registro');
      }
    }
  };

  // Funciones de cumplimiento
  const handleOpenComplianceModal = (f) => {
    setSelectedFileForCompliance(f);
    setComplianceCumple(
      f.cumple === 'true' || f.cumple === true || f.cumple === 1
        ? true
        : f.cumple === 'false' || f.cumple === false || f.cumple === 0
        ? false
        : null
    );
    setComplianceDescripcion(f['descripcion cumplimiento'] || '');
  };

  const handleCloseComplianceModal = () => {
    setSelectedFileForCompliance(null);
    setComplianceCumple(null);
    setComplianceDescripcion('');
  };

  const handleSaveCompliance = async () => {
    if (!selectedFileForCompliance) return;
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('id');
      await axios.put(
        `${config.urls.inscriptions.base}/tables/pi_ejecucion/record/${id}/file/${selectedFileForCompliance.id}/compliance`,
        {
          cumple: complianceCumple,
          descripcion_cumplimiento: complianceDescripcion,
          user_id: userId
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedMap = { ...uploadedFilesMap };

      const match = selectedFileForCompliance.name.match(/_ejecucion_(\d+)/);
      if (match) {
        const ejecucion_id = parseInt(match[1], 10);
        const files = updatedMap[ejecucion_id] || [];
        const updatedFiles = files.map((file) =>
          file.id === selectedFileForCompliance.id
            ? {
                ...file,
                cumple: complianceCumple,
                'descripcion cumplimiento': complianceDescripcion,
              }
            : file
        );
        updatedMap[ejecucion_id] = updatedFiles;
        setUploadedFilesMap(updatedMap);
      }

      handleCloseComplianceModal();
    } catch (error) {
      console.error('Error actualizando el cumplimiento:', error);
      setError('Error actualizando el cumplimiento');
    }
  };

  const resumenPorRubro = rubrosOptions.map((r) => {
    const total = records
      .filter((rec) => rec["Rubro"] === r)
      .reduce((sum, rec) => {
        const cantidad = rec["Cantidad"] || 0;
        const valorUnitario = rec["Valor Unitario"] || 0;
        return sum + (cantidad * valorUnitario);
      }, 0);
    return { rubro: r, total };
  });

  const totalInversion = resumenPorRubro.reduce((sum, item) => sum + item.total, 0);
  const contrapartida = totalInversion > montoDisponible ? totalInversion - montoDisponible : 0;

  return (
    <div>
      <h3>Ejecución del Plan de Inversión</h3>
      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div>
          {records.length > 0 ? (
            <div className="mb-3">
              {records.map((rec, index) => {
                const ejecucion_id = rec.id;
                const rubro = rec["Rubro"] || "";
                const elemento = rec["Elemento"] || "";
                const descripcion = (rec["Descripción"] && rec["Descripción"].trim() !== "")
                  ? rec["Descripción"]
                  : "Sin descripción";
                const cantidad = rec["Cantidad"] || 0;
                const valorUnitario = rec["Valor Unitario"] || 0;
                const valorTotal = cantidad * valorUnitario;

                const files = uploadedFilesMap[ejecucion_id] || [];

                return (
                  <div key={ejecucion_id} className="card mb-2" style={{ borderLeft: "5px solid #28a745" }}>
                    <div className="card-body">
                      <h5 className="card-title">
                        {index + 1}. {rubro} <span className="text-success">✔️</span>
                      </h5>
                      <p className="card-text" style={{ lineHeight: "1.5" }}>
                        <strong>Elemento:</strong> {elemento}<br />
                        <strong>Descripción:</strong> {descripcion}<br />
                        <strong>Cantidad:</strong> {cantidad.toLocaleString()}<br />
                        <strong>Valor Unitario:</strong> ${valorUnitario.toLocaleString()}<br />
                        <strong>Valor Total:</strong> ${valorTotal.toLocaleString()}
                      </p>

                      <div className="mt-4" style={{ width: '100%' }}>
                        <h6>Archivos adjuntos</h6>
                        {uploadingRecordId === ejecucion_id ? (
                          <form onSubmit={handleFileUpload}>
                            <div className="form-group mb-2">
                              <label>Nombre del archivo</label>
                              <input
                                type="text"
                                className="form-control"
                                value={fileName}
                                onChange={handleFileNameChange}
                              />
                            </div>
                            <div className="form-group mb-2">
                              <label>Seleccionar archivo</label>
                              <input
                                type="file"
                                className="form-control"
                                onChange={handleFileChange}
                              />
                            </div>
                            <button type="submit" className="btn btn-success btn-sm mb-2">
                              Cargar archivo
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => { setUploadingRecordId(null); setFile(null); setFileName(''); }}
                            >
                              Cancelar
                            </button>
                          </form>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm mb-2"
                            onClick={() => { setUploadingRecordId(ejecucion_id); setFile(null); setFileName(''); }}
                          >
                            Subir documento
                          </button>
                        )}

                        {files.length > 0 ? (
                          <ul className="list-group mt-3">
                            {files.map((f) => (
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
                                  <br />
                                  {/* Etiqueta de Cumplimiento */}
                                  <span
                                    className="badge"
                                    style={{
                                      backgroundColor:
                                        f.cumple === true ||
                                        f.cumple === 'true' ||
                                        f.cumple === 1
                                          ? 'green'
                                          : f.cumple === false ||
                                            f.cumple === 'false' ||
                                            f.cumple === 0
                                          ? 'red'
                                          : 'gray',
                                      color: '#fff',
                                      padding: '5px',
                                      borderRadius: '5px',
                                      cursor: 'pointer',
                                      marginTop: '5px',
                                      display: 'inline-block',
                                    }}
                                    onClick={() => handleOpenComplianceModal(f)}
                                  >
                                    {f.cumple === true ||
                                    f.cumple === 'true' ||
                                    f.cumple === 1
                                      ? 'Cumple'
                                      : f.cumple === false ||
                                        f.cumple === 'false' ||
                                        f.cumple === 0
                                      ? 'No Cumple'
                                      : 'Cumplimiento'}
                                  </span>
                                  {f['descripcion cumplimiento'] && (
                                    <p style={{ marginTop: '5px' }}>
                                      <strong>Descripción:</strong>{' '}
                                      {f['descripcion cumplimiento']}
                                    </p>
                                  )}
                                </div>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleFileDelete(ejecucion_id, f.id)}
                                >
                                  Eliminar archivo
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>No hay archivos subidos aún para este registro.</p>
                        )}
                      </div>

                      <button
                        className="btn btn-danger btn-sm mt-2"
                        onClick={() => handleDeleteRecord(ejecucion_id)}
                      >
                        Eliminar registro
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No hay registros agregados aún.</p>
          )}

          <div className="card p-3 mb-3">
            <h5>Agregar nuevo rubro</h5>
            <div className="row mb-2">
              <div className="col-md-4">
                <label><strong>Rubro</strong></label>
                <select
                  className="form-select w-100"
                  name="Rubro"
                  value={newRubro["Rubro"]}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar...</option>
                  {rubrosOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label><strong>Elemento</strong></label>
                <input
                  type="text"
                  className="form-control w-100"
                  name="Elemento"
                  value={newRubro["Elemento"]}
                  onChange={handleChange}
                  placeholder="Ej: Par, Kgs, Und"
                />
              </div>
              <div className="col-md-4">
                <label><strong>Descripción</strong></label>
                <input
                  type="text"
                  className="form-control w-100"
                  name="Descripción"
                  value={newRubro["Descripción"]}
                  onChange={handleChange}
                  placeholder="Descripción (opcional)"
                />
              </div>
            </div>
            <div className="row mb-2">
              <div className="col-md-4">
                <label><strong>Cantidad</strong></label>
                <input
                  type="number"
                  className="form-control w-100"
                  name="Cantidad"
                  value={newRubro["Cantidad"]}
                  onChange={handleChange}
                  placeholder="Cantidad"
                />
              </div>
              <div className="col-md-4">
                <label><strong>Valor Unitario</strong></label>
                <input
                  type="number"
                  className="form-control w-100"
                  name="Valor Unitario"
                  value={newRubro["Valor Unitario"]}
                  onChange={handleChange}
                  placeholder="Valor Unitario"
                />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button className="btn btn-primary w-100" onClick={handleSubmit}>
                  Guardar rubro
                </button>
              </div>
            </div>
          </div>

          <h5>Resumen de la inversión</h5>
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Rubro</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {resumenPorRubro.map((r) => (
                <tr key={r.rubro}>
                  <td>{r.rubro}</td>
                  <td>${Number(r.total).toLocaleString()}</td>
                </tr>
              ))}
              <tr>
                <td><strong>Total</strong></td>
                <td><strong>${Number(totalInversion).toLocaleString()}</strong></td>
              </tr>
              <tr>
                <td>Monto disponible</td>
                <td>${montoDisponible.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Contrapartida</td>
                <td style={{color: contrapartida > 0 ? "red" : "black"}}>
                  ${contrapartida.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de cumplimiento */}
      {selectedFileForCompliance && (
        <div
          className="modal fade show"
          style={{ display: 'block' }}
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Actualizar Cumplimiento</h5>
                <button
                  type="button"
                  className="close"
                  onClick={handleCloseComplianceModal}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Cumple</label>
                  <div>
                    <input
                      type="radio"
                      id="cumple-true"
                      name="cumple"
                      value="true"
                      checked={complianceCumple === true}
                      onChange={() => setComplianceCumple(true)}
                    />
                    <label htmlFor="cumple-true">Cumple</label>
                  </div>
                  <div>
                    <input
                      type="radio"
                      id="cumple-false"
                      name="cumple"
                      value="false"
                      checked={complianceCumple === false}
                      onChange={() => setComplianceCumple(false)}
                    />
                    <label htmlFor="cumple-false">No Cumple</label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Descripción cumplimiento</label>
                  <textarea
                    className="form-control"
                    value={complianceDescripcion}
                    onChange={(e) => setComplianceDescripcion(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-secondary mr-2"
                  onClick={handleCloseComplianceModal}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveCompliance}
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedFileForCompliance && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
}

EjecucionTab.propTypes = {
  id: PropTypes.string.isRequired,
};

