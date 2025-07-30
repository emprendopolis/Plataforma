import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

export default function DatosTab({ id }) {
  const [fields, setFields] = useState([]);
  const [data, setData] = useState({ caracterizacion_id: id });
  const [tableName] = useState('pi_datos');
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [error, setError] = useState(null);

  // Estados para historial
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Mapeo de nombres de campos para mostrar etiquetas más amigables
  const fieldNameMapping = {
    'sector': 'Pertenece a el sector',
    'priorizado': 'Priorizado',
    'tiempo_dedicacion': 'Tiempo de dedicación al negocio',
    'tiempo_funcionamiento': 'Tiempo de funcionamiento del negocio local',
    'valor_ingresos_ventas': 'Valor aproximado de ingreso-ventas',
    'valor_activos': 'Valor aproximado de activos',
    'valor_gastos_costos': 'Valor aproximado de gastos-costos',
    'valor_utilidad_margen': 'Valor total de utilidad-margen',
    'valor_gastos_familiares': 'Valor gastos familiares mensuales promedio',
    'descripcion_negocio': 'Descripción general del negocio',
    'descripcion_lugar_actividad': 'Descripción del lugar donde desarrolla la actividad',
    'descripcion_capacidad_produccion': 'Descripción de la capacidad de producción'
  };

  // Función para obtener el nombre de visualización de un campo
  const getDisplayName = (fieldName) => {
    return fieldNameMapping[fieldName] || fieldName;
  };

  // Opciones para los campos de selección
  const fieldOptions = {
    'sector': [
      'Textil y confecciones',
      'Gastronomía',
      'Calzado - Marroquinería',
      'Artesanías',
      'Cosmética y belleza'
    ],
    'priorizado': [
      'Si',
      'No'
    ],
    'tiempo_dedicacion': [
      'Parcial',
      'Total'
    ],
    'tiempo_funcionamiento': [
      '3 - 12 meses',
      '12 - 24 meses',
      '24 - 36 meses',
      'Más de 36 meses'
    ],
    'valor_ingresos_ventas': [
      '$ 0 a $ 500.000',
      '$ 500.001 a $ 1.000.000',
      '$ 1.000.001 a $ 2.000.000',
      '$ 2.000.001 a $ 3.000.000',
      '$ 3.000.001 a $ 4.000.000',
      '$ 4.000.001 a $ 5.000.000',
      '$ 5.000.001 a $ 10.000.000',
      'Mas de $ 10.000.000'
    ],
    'valor_gastos_costos': [
      '$ 0 a $ 500.000',
      '$ 500.001 a $ 1.000.000',
      '$ 1.000.001 a $ 2.000.000',
      '$ 2.000.001 a $ 3.000.000',
      '$ 3.000.001 a $ 4.000.000',
      '$ 4.000.001 a $ 5.000.000',
      '$ 5.000.001 a $ 10.000.000',
      'Mas de $ 10.000.000'
    ],
    'valor_utilidad_margen': [
      '$ 0 a $ 500.000',
      '$ 500.001 a $ 1.000.000',
      '$ 1.000.001 a $ 2.000.000',
      '$ 2.000.001 a $ 3.000.000',
      '$ 3.000.001 a $ 4.000.000',
      '$ 4.000.001 a $ 5.000.000',
      '$ 5.000.001 a $ 10.000.000',
      'Mas de $ 10.000.000'
    ]
  };

  // Función para verificar si un campo debe ser un select
  const isSelectField = (fieldName) => {
    return fieldOptions.hasOwnProperty(fieldName);
  };

  // Función para verificar si un campo debe ocupar toda la fila
  const isFullWidthField = (fieldName) => {
    const fullWidthFields = [
      'descripcion_negocio',
      'descripcion_lugar_actividad', 
      'descripcion_capacidad_produccion'
    ];
    return fullWidthFields.includes(fieldName);
  };

  // Función para obtener el número de filas para textareas específicos
  const getTextareaRows = (fieldName) => {
    const singleRowFields = [
      'valor_activos',
      'valor_gastos_familiares'
    ];
    const descriptionFields = [
      'descripcion_negocio',
      'descripcion_lugar_actividad',
      'descripcion_capacidad_produccion'
    ];
    
    if (singleRowFields.includes(fieldName)) {
      return 1;
    } else if (descriptionFields.includes(fieldName)) {
      return 4;
    } else {
      return 2;
    }
  };

  // Obtener el rol del usuario
  const getLoggedUserRoleId = () => {
    return localStorage.getItem('role_id') || null;
  };
  const role = getLoggedUserRoleId();

  useEffect(() => {
    const fetchFieldsAndData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }

        // Obtener campos de la tabla (vía PI)
        const fieldsResponse = await axios.get(
          `${config.urls.inscriptions.base}/pi/tables/${tableName}/fields`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setFields(fieldsResponse.data);

        // Obtener registro existente filtrado por caracterizacion_id
        const recordsResponse = await axios.get(
          `${config.urls.inscriptions.base}/pi/tables/${tableName}/records?caracterizacion_id=${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (recordsResponse.data.length > 0) {
          const existingRecord = recordsResponse.data[0];
          setData(existingRecord);
          setRecordId(existingRecord.id);
        } else {
          setData((prevData) => ({ ...prevData, caracterizacion_id: id }));
        }

        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo los campos o datos:', error);
        setError('Error obteniendo los campos o datos');
        setLoading(false);
      }
    };

    fetchFieldsAndData();
  }, [tableName, id]);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const recordData = { ...data, caracterizacion_id: id };

      if (recordId) {
        // Actualizar registro existente
        await axios.put(
          `${config.urls.inscriptions.base}/pi/tables/${tableName}/record/${recordId}`,
          recordData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        alert('Datos actualizados exitosamente');
      } else {
        // Crear nuevo registro
        // Si el controlador espera 'user_id', usar user_id:
        const userId = localStorage.getItem('id');
        recordData.user_id = userId; // Si el backend espera user_id
        // Si el backend espera 'id', entonces usa:
        // recordData.id = userId;

        await axios.post(
          `${config.urls.inscriptions.base}/pi/tables/${tableName}/record`,
          recordData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        alert('Datos guardados exitosamente');
      }
    } catch (error) {
      console.error('Error guardando los datos:', error);
      setError('Error guardando los datos');
    }
  };

  // Función para obtener el historial
  const fetchHistory = async () => {
    if (!recordId) return;
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      const historyResponse = await axios.get(
        `${config.urls.inscriptions.base}/pi/tables/${tableName}/record/${recordId}/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setHistory(historyResponse.data.history || []);
      setHistoryLoading(false);
    } catch (error) {
      console.error('Error obteniendo el historial:', error);
      setHistoryError('Error obteniendo el historial');
      setHistoryLoading(false);
    }
  };

  const handleOpenHistoryModal = async () => {
    await fetchHistory();
    setShowHistoryModal(true);
  };

  return (
    <div>
      {loading ? (
        <p>Cargando campos...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {fields
                .filter((field) => field.column_name !== 'id' && field.column_name !== 'caracterizacion_id')
                .map((field) => {
                  const isFullWidth = isFullWidthField(field.column_name);
                  
                  return (
                    <div 
                      key={field.column_name} 
                      style={{
                        minWidth: '200px',
                        minHeight: '60px',
                        width: isFullWidth ? '100%' : 'calc(50% - 8px)',
                        maxWidth: isFullWidth ? '100%' : 'calc(50% - 8px)',
                        maxHeight: '500px',
                        boxSizing: 'border-box',
                        marginBottom: '16px',
                        display: 'block',
                        padding: 0
                      }}
                    >
                      <label style={{ padding: '10px', display: 'block' }}>{getDisplayName(field.column_name)}</label>
                      {isSelectField(field.column_name) ? (
                        <select
                          name={field.column_name}
                          className="form-control"
                          value={data[field.column_name] || ''}
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            minHeight: '40px'
                          }}
                          disabled={role === '3'}
                        >
                          <option value="">-- Selecciona una opción --</option>
                          {fieldOptions[field.column_name].map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <textarea
                          name={field.column_name}
                          className="form-control"
                          value={data[field.column_name] || ''}
                          onChange={handleChange}
                          rows={getTextareaRows(field.column_name)}
                          style={{
                            width: '100%',
                            minHeight: '40px',
                            resize: 'both'
                          }}
                          readOnly={role === '3'}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
            {/* Contenedor flex para los botones */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
              {role !== '3' && (
                <button type="submit" className="btn btn-primary" style={{ marginTop: 20 }}>
                  {recordId ? 'Actualizar' : 'Guardar'}
                </button>
              )}
              {recordId && role !== '3' && (
                <button
                  type="button"
                  className="btn btn-info btn-sm btn-historial-right"
                  onClick={handleOpenHistoryModal}
                >
                  Ver Historial de Cambios
                </button>
              )}
            </div>
          </form>
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
            <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
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
                  <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
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

DatosTab.propTypes = {
  id: PropTypes.string.isRequired,
};

