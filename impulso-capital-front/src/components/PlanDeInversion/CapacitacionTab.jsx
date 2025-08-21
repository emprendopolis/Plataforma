import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import config from '../../config';

// Mapeo de "código" => "texto de la columna" en tu BD
const codeToText = {
  "224": "224 - Fortaleciendo mis capacidades",
  "225": "225 - Gestión Administrativa de mi negocio (La importancia y c",
  "226": "226 - Manejo eficiente del tiempo",
  "227": "227 - Conociendo el mercado para mi producto",
  "228": "228 - Finanzas saludables",
  "229": "229 - Separar finanzas personales y comerciales",
  "230": "230 - Entendiendo los conceptos básicos financieros",
  "231": "231 - Tu empresa, tu apuesta verde",
  "232": "232 - Accediendo a la oferta financiera",
  "233": "233 - Alistate para crecer",
  "234": "234 - Vitrinas que venden solas",
  "235": "235 - Transición a la sostenibilidad",
  "236": "236 - Construyendo cultura solidaria",
};

export default function CapacitacionTab({ id }) {
  const [record, setRecord] = useState(null);
  const [recordId, setRecordId] = useState(null);

  // recommendedCodes se cargará desde la columna recommended_codes (texto JSON en la BD)
  const [recommendedCodes, setRecommendedCodes] = useState([]); 

  const [loading, setLoading] = useState(true);

  // Historial
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          alert("No se encontró el token de autenticación");
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `${config.urls.inscriptions.base}/pi/tables/pi_capacitacion/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.data || response.data.length === 0) {
          // No existe => sin recommended_codes
          setRecord(null);
          setRecordId(null);
          setRecommendedCodes(['235', '236']); // Agregar cápsulas por defecto
        } else {
          const existingRecord = response.data[0];
          setRecordId(existingRecord.id);

          // recommended_codes viene como texto; parsearlo
          let codesArray = [];
          if (existingRecord.recommended_codes) {
            try {
              codesArray = JSON.parse(existingRecord.recommended_codes);
              // Asegurar que las cápsulas por defecto estén incluidas
              if (!codesArray.includes('235')) codesArray.push('235');
              if (!codesArray.includes('236')) codesArray.push('236');
            } catch (err) {
              console.warn("Error parseando recommended_codes:", err);
              codesArray = ['235', '236']; // En caso de error, usar cápsulas por defecto
            }
          } else {
            codesArray = ['235', '236']; // Si no hay recommended_codes, usar cápsulas por defecto
          }

          setRecommendedCodes(Array.isArray(codesArray) ? codesArray : ['235', '236']);
          setRecord(existingRecord);
        }
      } catch (error) {
        console.error("Error obteniendo el registro de capacitación:", error);
        setRecord(null);
        setRecordId(null);
        setRecommendedCodes(['235', '236']); // En caso de error, usar cápsulas por defecto
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [id]);

  // Toggle de cada cápsula
  const handleToggle = async (code) => {
    if (!recordId || !record) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No se encontró el token de autenticación");
        return;
      }

      const columnName = codeToText[code]; // p.ej. "224 - Fortaleciendo mis capacidades"
      const currentVal = record[columnName] || false;
      const updatedVal = !currentVal;

      const updatedRecord = {
        ...record,
        [columnName]: updatedVal,
      };

      // Guardar en BD
      await axios.put(
        `${config.urls.inscriptions.base}/pi/tables/pi_capacitacion/record/${recordId}`,
        updatedRecord,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRecord(updatedRecord);
    } catch (error) {
      console.error("Error toggling capacitación:", error);
      alert("Hubo un error al marcar la cápsula en la BD");
    }
  };

  // Calcular progreso
  let progress = 0;
  if (!loading && recommendedCodes.length > 0 && record) {
    const completedCount = recommendedCodes.reduce((count, code) => {
      const columnName = codeToText[code];
      return count + (record[columnName] ? 1 : 0);
    }, 0);
    progress = ((completedCount / recommendedCodes.length) * 100).toFixed(2);
  }

  // Historial
  const fetchHistory = async () => {
    if (!recordId) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const token = localStorage.getItem("token");
      const historyResponse = await axios.get(
        `${config.urls.inscriptions.base}/pi/tables/pi_capacitacion/record/${recordId}/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistory(historyResponse.data.history || []);
      setHistoryLoading(false);
    } catch (error) {
      console.error("Error obteniendo el historial:", error);
      setHistoryError("Error obteniendo el historial");
      setHistoryLoading(false);
    }
  };

  const handleOpenHistoryModal = async () => {
    await fetchHistory();
    setShowHistoryModal(true);
  };

  // Render
  if (loading) {
    return <p>Cargando...</p>;
  }

  return (
    <div>
      {/* <h3>Capacitación</h3> */}
      {recommendedCodes.length === 0 ? (
        <p>No hay cápsulas recomendadas por el diagnóstico.</p>
      ) : (
        <>
          <div style={{ marginBottom: "1rem" }}>
            <h5>Progreso</h5>
            <div className="progress moderno" style={{ height: "22px", backgroundColor: "#e9ecef" }}>
              <div
                className="progress-bar moderno"
                role="progressbar"
                style={{
                  width: `${progress}%`,
                }}
                aria-valuenow={progress}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {progress}%
              </div>
            </div>
          </div>

          <ul className="list-group mb-3 tabla-moderna">
            {recommendedCodes.map((code) => {
              const columnName = codeToText[code];
              const value = record[columnName] || false;
              return (
                <li
                  key={code}
                  className="list-group-item d-flex justify-content-between align-items-center"
                  style={{ cursor: localStorage.getItem('role_id') === '3' ? 'not-allowed' : 'pointer' }}
                  onClick={localStorage.getItem('role_id') === '3' ? undefined : () => handleToggle(code)}
                >
                  {columnName}
                  {value ? (
                    <span style={{ color: "green", fontWeight: "bold" }}>✔️</span>
                  ) : (
                    <span style={{ color: "red", fontWeight: "bold" }}>❌</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {recordId && (
        <button className="btn btn-info btn-sm" onClick={handleOpenHistoryModal}>
          Ver Historial de Cambios
        </button>
      )}

      {showHistoryModal && (
        <div
          className="modal fade show"
          style={{ display: "block" }}
          tabIndex="-1"
          role="dialog"
        >
          <div
            className="modal-dialog modal-lg"
            style={{ maxWidth: "90%" }}
            role="document"
          >
            <div
              className="modal-content"
              style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
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
              <div className="modal-body" style={{ overflowY: "auto" }}>
                {historyError && (
                  <div className="alert alert-danger">{historyError}</div>
                )}
                {historyLoading ? (
                  <div>Cargando historial...</div>
                ) : history.length > 0 ? (
                  <div
                    className="table-responsive"
                    style={{ maxHeight: "400px", overflowY: "auto" }}
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
                            <td>{item.field_name || "-"}</td>
                            <td>{item.old_value || "-"}</td>
                            <td>{item.new_value || "-"}</td>
                            <td>{item.description || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No hay historial de cambios.</p>
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

CapacitacionTab.propTypes = {
  id: PropTypes.string.isRequired,
};


