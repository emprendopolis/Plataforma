import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

export default function DatosTab({ id, onModalidadChange }) {
  const [fields, setFields] = useState([]);
  const [data, setData] = useState({ caracterizacion_id: id });
  const [tableName] = useState('pi_datos');
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [error, setError] = useState(null);
  const [priorizacionCapitalizacion, setPriorizacionCapitalizacion] = useState(null);

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
    'descripcion_capacidad_produccion': 'Descripción de la capacidad de producción',
    'fechayhora_visita': 'Fecha y hora de la visita',
    'dedicacion_unica': '¿El espacio tienen dedicación única para el desarrollo de las actividades productivas del negocio?',
    'descripcionCapacidadProduccion': 'Descripción de la capacidad de producción o de los niveles prestación del servicio o de la dinámica de comercialización (según actividad productiva o económica)',
    'arrendatarioLocal': '¿Es arrendatario del local?',
    'condicionesArriendo': 'Las condiciones del arriendo cumplen con los requisitos para el uso de esta modalidad de capitalización',
    'cuentaconDeuda': '¿El negocio cuenta con una deuda comercial (productiva)?',
    'condicionesDeuda': 'Las condiciones de la deuda cumplen con los requisitos para el uso de esta modalidad de capitalización',
    'modalidadCapitalizacion': 'Cuál modalidad de capitalización se utilizará (elija una de las siguientes):',
    'justificacionModalidad': 'Justificación de la modalidad a través de la cual se dará la capitalización',
    'sujetoParticipacion': 'El negocio local es sujeto de participación en espacios de conexión con el mercado con el producto y/o servicio que tiene actualmente'
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
    'dedicacion_unica': ['Si', 'No'],
    'arrendatarioLocal': ['Si', 'No'],
    'condicionesArriendo': ['Si', 'No'],
    'cuentaconDeuda': ['Si', 'No'],
    'condicionesDeuda': ['Si', 'No'],
    'modalidadCapitalizacion': [
      'Cobertura de deuda comercial financiera',
      'Pago de canon de arrendamiento',
      'Proveeduría de bienes'
    ],
    'sujetoParticipacion': ['Si', 'No'],
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

  // Función para verificar si un campo es de fecha y hora
  const isDateTimeField = (fieldName) => {
    return fieldName === 'fechayhora_visita';
  };

  // Función para convertir formato YYYY-MM-DDTHH:MM (datetime-local) a DD/MM/YYYY - HH:MM
  const formatDateTimeForDisplay = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    // Si viene de la BD en formato YYYY-MM-DD HH:MM:SS o YYYY-MM-DDTHH:MM:SS
    if (dateTimeStr.includes('T')) {
      const [datePart, timePart] = dateTimeStr.split('T');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      return `${day}/${month}/${year} - ${hour}:${minute}`;
    } else if (dateTimeStr.includes(' ')) {
      const [datePart, timePart] = dateTimeStr.split(' ');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      return `${day}/${month}/${year} - ${hour}:${minute}`;
    }
    // Si ya está en formato DD/MM/YYYY - HH:MM, devolverlo tal cual
    return dateTimeStr;
  };

  // Función para convertir formato DD/MM/YYYY - HH:MM a YYYY-MM-DDTHH:MM (para datetime-local)
  const formatDateTimeForInput = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    // Si ya está en formato YYYY-MM-DDTHH:MM, restar 5 horas
    if (dateTimeStr.includes('T')) {
      const [datePart, timePart] = dateTimeStr.split('T');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      
      // Crear fecha y restar 5 horas para compensar zona horaria
      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
      date.setHours(date.getHours() - 5);
      
      // Formatear de vuelta a YYYY-MM-DDTHH:MM
      const adjustedYear = date.getFullYear();
      const adjustedMonth = String(date.getMonth() + 1).padStart(2, '0');
      const adjustedDay = String(date.getDate()).padStart(2, '0');
      const adjustedHour = String(date.getHours()).padStart(2, '0');
      const adjustedMinute = String(date.getMinutes()).padStart(2, '0');
      
      return `${adjustedYear}-${adjustedMonth}-${adjustedDay}T${adjustedHour}:${adjustedMinute}`;
    }
    // Si viene de la BD en formato YYYY-MM-DD HH:MM:SS, restar 5 horas
    if (dateTimeStr.includes(' ') && !dateTimeStr.includes('/')) {
      const [datePart, timePart] = dateTimeStr.split(' ');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      
      // Crear fecha y restar 5 horas para compensar zona horaria
      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
      date.setHours(date.getHours() - 5);
      
      // Formatear de vuelta a YYYY-MM-DDTHH:MM
      const adjustedYear = date.getFullYear();
      const adjustedMonth = String(date.getMonth() + 1).padStart(2, '0');
      const adjustedDay = String(date.getDate()).padStart(2, '0');
      const adjustedHour = String(date.getHours()).padStart(2, '0');
      const adjustedMinute = String(date.getMinutes()).padStart(2, '0');
      
      return `${adjustedYear}-${adjustedMonth}-${adjustedDay}T${adjustedHour}:${adjustedMinute}`;
    }
    // Si está en formato DD/MM/YYYY - HH:MM, convertir a YYYY-MM-DDTHH:MM
    if (dateTimeStr.includes('/') && dateTimeStr.includes(' - ')) {
      const [datePart, timePart] = dateTimeStr.split(' - ');
      const [day, month, year] = datePart.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`;
    }
    return dateTimeStr;
  };

  // Función para convertir formato YYYY-MM-DDTHH:MM a YYYY-MM-DD HH:MM:SS (para guardar en BD)
  const formatDateTimeForSave = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    // Si viene del input datetime-local (YYYY-MM-DDTHH:MM)
    if (dateTimeStr.includes('T')) {
      return dateTimeStr.replace('T', ' ') + ':00';
    }
    // Si ya está en formato YYYY-MM-DD HH:MM:SS, devolverlo
    return dateTimeStr;
  };

  // Función para verificar si un campo debe ocupar toda la fila
  const isFullWidthField = (fieldName) => {
    const fullWidthFields = [
      'descripcion_negocio',
      'descripcion_lugar_actividad', 
      'descripcion_capacidad_produccion',
      'descripcionCapacidadProduccion',
      'justificacionModalidad'
    ];
    return fullWidthFields.includes(fieldName);
  };

  // Función para verificar si un campo es solo para Grupo 3
  const isGrupo3OnlyField = (fieldName) => {
    const grupo3Fields = [
      'fechayhora_visita',
      'dedicacion_unica',
      'descripcionCapacidadProduccion',
      'arrendatarioLocal',
      'condicionesArriendo',
      'cuentaconDeuda',
      'condicionesDeuda',
      'modalidadCapitalizacion',
      'justificacionModalidad',
      'sujetoParticipacion'
    ];
    return grupo3Fields.includes(fieldName);
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

        // Obtener el valor de Priorizacion capitalizacion
        const caracterizacionResponse = await axios.get(
          `${config.urls.inscriptions.tables}/inscription_caracterizacion/record/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const priorizacion = caracterizacionResponse.data.record?.['Priorizacion capitalizacion'] ?? null;
        setPriorizacionCapitalizacion(priorizacion);

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
          // Convertir fecha y hora al formato para el input datetime-local
          if (existingRecord.fechayhora_visita) {
            existingRecord.fechayhora_visita = formatDateTimeForInput(existingRecord.fechayhora_visita);
          }
          setData(existingRecord);
          setRecordId(existingRecord.id);
          
          // Notificar modalidadCapitalizacion al componente padre si existe
          if (existingRecord.modalidadCapitalizacion && onModalidadChange) {
            onModalidadChange(existingRecord.modalidadCapitalizacion);
          }
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
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
    
    // Notificar cambio de modalidadCapitalizacion al componente padre
    if (name === 'modalidadCapitalizacion' && onModalidadChange) {
      onModalidadChange(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const recordData = { ...data, caracterizacion_id: id };

      // Convertir fecha y hora al formato para guardar en BD
      if (recordData.fechayhora_visita) {
        recordData.fechayhora_visita = formatDateTimeForSave(recordData.fechayhora_visita);
      }

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
        
        // Notificar cambio de modalidadCapitalizacion después de actualizar
        if (recordData.modalidadCapitalizacion && onModalidadChange) {
          onModalidadChange(recordData.modalidadCapitalizacion);
        }
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
        
        // Notificar cambio de modalidadCapitalizacion después de guardar
        if (recordData.modalidadCapitalizacion && onModalidadChange) {
          onModalidadChange(recordData.modalidadCapitalizacion);
        }
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', alignItems: 'start' }}>
              {fields
                .filter((field) => {
                  // Filtrar campos id y caracterizacion_id
                  if (field.column_name === 'id' || field.column_name === 'caracterizacion_id') {
                    return false;
                  }
                  // Si es un campo solo para Grupo 3, solo mostrarlo si priorizacionCapitalizacion === 'Grupo 3'
                  if (isGrupo3OnlyField(field.column_name)) {
                    return priorizacionCapitalizacion === 'Grupo 3';
                  }
                  return true;
                })
                .sort((a, b) => {
                  // Definir el orden de prioridad de los campos
                  const order = {
                    'fechayhora_visita': 1,
                    'modalidadCapitalizacion': 2,
                    'justificacionModalidad': 3,
                    'sector': 4,
                    'priorizado': 5
                  };
                  
                  const orderA = order[a.column_name] || 999;
                  const orderB = order[b.column_name] || 999;
                  
                  return orderA - orderB;
                })
                .map((field) => {
                  const isFullWidth = isFullWidthField(field.column_name);
                  
                  // Campos que necesitan espacio adicional arriba para alineación
                  const needsTopSpacing = field.column_name === 'arrendatarioLocal' || field.column_name === 'cuentaconDeuda';
                  
                  return (
                    <div 
                      key={field.column_name} 
                      style={{
                        gridColumn: isFullWidth ? '1 / -1' : 'span 1',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: '500px',
                        boxSizing: 'border-box',
                        padding: 0,
                        paddingTop: needsTopSpacing ? '20px' : '0'
                      }}
                    >
                      <label style={{ 
                        padding: '5px 10px 2px 10px', 
                        minHeight: 'auto',
                        display: 'flex',
                        alignItems: 'flex-start',
                        marginBottom: '2px'
                      }}>{getDisplayName(field.column_name)}</label>
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
                      ) : isDateTimeField(field.column_name) ? (
                        <>
                          <input
                            type="datetime-local"
                            name={field.column_name}
                            className="form-control"
                            value={data[field.column_name] || ''}
                            onChange={handleChange}
                            style={{
                              width: '100%',
                              minHeight: '40px'
                            }}
                            disabled={role === '3'}
                          />
                          {data[field.column_name] && (
                            <small className="form-text text-muted" style={{ padding: '5px 10px', display: 'block' }}>
                              Fecha y hora seleccionada: {formatDateTimeForDisplay(data[field.column_name])}
                            </small>
                          )}
                        </>
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

