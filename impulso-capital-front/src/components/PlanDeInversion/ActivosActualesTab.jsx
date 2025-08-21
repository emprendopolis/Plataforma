import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

export default function ActivosActualesTab({ id }) {
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [data, setData] = useState({ caracterizacion_id: id });
  const [tableName] = useState('pi_activos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para historial
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [editRecordId, setEditRecordId] = useState(null);

  // Opciones para los campos de selección
  const fieldOptions = {
    'Frecuencia de uso': [
      'Alta',
      'Media',
      'Baja'
    ],
    'Elemento para reposicion': [
      'Si',
      'No'
    ]
  };

  // Función para verificar si un campo debe ser un select
  const isSelectField = (fieldName) => {
    return fieldOptions.hasOwnProperty(fieldName);
  };

  useEffect(() => {
    const fetchFieldsAndRecords = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Obtener campos de la tabla
        const fieldsResponse = await axios.get(
          `${config.urls.inscriptions.pi}/tables/${tableName}/fields`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFields(fieldsResponse.data);

        // Obtener todos los registros con el mismo `caracterizacion_id`
        const recordsResponse = await axios.get(
          `${config.urls.inscriptions.pi}/tables/${tableName}/records?caracterizacion_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRecords(recordsResponse.data);
      } catch (error) {
        console.error('Error obteniendo los campos o datos:', error);
        setError('Error obteniendo los campos o datos');
      } finally {
        setLoading(false);
      }
    };

    fetchFieldsAndRecords();
  }, [tableName, id]);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleEdit = (record) => {
    setData({ ...record });
    setEditRecordId(record.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const recordData = { ...data, caracterizacion_id: id };
      const userId = localStorage.getItem('id');
      recordData.user_id = userId;

      if (editRecordId) {
        // Editar registro existente
        await axios.put(
          `${config.urls.inscriptions.pi}/tables/${tableName}/record/${editRecordId}`,
          recordData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Registro editado exitosamente');
        setEditRecordId(null);
      } else {
        // Crear un nuevo registro
        await axios.post(
          `${config.urls.inscriptions.pi}/tables/${tableName}/record`,
          recordData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Datos guardados exitosamente');
      }
      
      setData({ caracterizacion_id: id });
      
      // Actualizar los registros después de agregar o editar un registro
      const updatedRecords = await axios.get(
        `${config.urls.inscriptions.pi}/tables/${tableName}/records?caracterizacion_id=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecords(updatedRecords.data);
    } catch (error) {
      console.error('Error guardando los datos:', error);
      setError('Error guardando los datos');
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete(
        `${config.urls.inscriptions.pi}/tables/${tableName}/record/${recordId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Registro eliminado exitosamente');
      
      // Actualizar los registros después de eliminar
      const updatedRecords = await axios.get(
        `${config.urls.inscriptions.pi}/tables/${tableName}/records?caracterizacion_id=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecords(updatedRecords.data);
    } catch (error) {
      console.error('Error eliminando el registro:', error);
      setError('Error eliminando el registro');
    }
  };

  const fetchAllRecordsHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Obtener historial de todos los registros de la tabla
      const historyResponse = await axios.get(
        `${config.urls.inscriptions.pi}/tables/${tableName}/history?caracterizacion_id=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Combinar y ordenar el historial por fecha
      const combinedHistory = historyResponse.data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );

      setHistory(combinedHistory);
      setHistoryLoading(false);
    } catch (error) {
      console.error('Error obteniendo el historial:', error);
      setHistoryError('Error obteniendo el historial');
      setHistoryLoading(false);
    }
  };

  const handleOpenHistoryModal = async () => {
    await fetchAllRecordsHistory();
    setShowHistoryModal(true);
  };

  return (
    <div>
      {/* <h3>Activos Actuales</h3> */}
      {loading ? (
        <p>Cargando campos...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: '350px', paddingBottom: '5px' }}>
            {fields
              .filter((field) => field.column_name !== 'id' && field.column_name !== 'caracterizacion_id')
              .map((field) => (
                <div className="form-group" key={field.column_name} style={{minWidth: '200px', minHeight: '60px', width: '100%', maxWidth: '100%', maxHeight: '500px', /* border: '1px solid #ccc', */ boxSizing: 'border-box', marginBottom: '16px', display: 'block', padding: 0}}>
                  <label style={{ padding: '10px', display: 'block' }}>{field.column_name}</label>
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
                      disabled={localStorage.getItem('role_id') === '3'}
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
                      style={{
                        width: '100%',
                        minHeight: '40px',
                        resize: 'both'
                      }}
                      readOnly={localStorage.getItem('role_id') === '3'}
                    />
                  )}
                </div>
              ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
              {localStorage.getItem('role_id') !== '3' && (
                <button type="submit" className="btn btn-primary" style={{ marginTop: 0 }}>
                  Guardar
                </button>
              )}
              {/* Botón de historial oculto temporalmente
              {records.length > 0 && (
                <button
                  type="button"
                  className="btn btn-info btn-sm btn-historial-right"
                  onClick={handleOpenHistoryModal}
                >
                  Ver Historial de Cambios
                </button>
              )}
              */}
            </div>
          </form>

          <h4 className="mt-4">Registros guardados</h4>
          <table className="table tabla-moderna">
            <thead>
              <tr>
                {fields.filter(field => field.column_name !== 'id' && field.column_name !== 'caracterizacion_id').map((field) => (
                  <th key={field.column_name}>{field.column_name}</th>
                ))}
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  {fields.filter(field => field.column_name !== 'id' && field.column_name !== 'caracterizacion_id').map((field) => (
                    <td key={field.column_name}>{record[field.column_name]}</td>
                  ))}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm mb-1 btn-accion-tabla"
                      onClick={() => handleEdit(record)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-danger btn-sm btn-accion-tabla"
                      onClick={() => handleDelete(record.id)}
                      disabled={localStorage.getItem('role_id') === '3'}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
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
                            <td>
                              {new Date(item.created_at).toLocaleString()}
                            </td>
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

ActivosActualesTab.propTypes = {
  id: PropTypes.string.isRequired,
}; 