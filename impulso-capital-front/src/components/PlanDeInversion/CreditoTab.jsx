import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

export default function CreditoTab({ id }) {
  const [fields, setFields] = useState([]);
  const [data, setData] = useState({ caracterizacion_id: id });
  const [tableName] = useState('pi_credito');
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFields = async () => {
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

        // Intentar obtener registro existente
        try {
          const recordResponse = await axios.get(
            `${config.urls.inscriptions.pi}/tables/${tableName}/records?caracterizacion_id=${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (recordResponse.data && recordResponse.data.length > 0) {
            setData(recordResponse.data[0]);
            setRecordId(recordResponse.data[0].id);
          }
        } catch (recordError) {
          // No hay registro existente, continuar
          console.log('No se encontró registro existente');
        }
      } catch (error) {
        console.error('Error obteniendo los campos:', error);
        setError('Error obteniendo los campos');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFields();
    }
  }, [tableName, id]);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const recordData = { ...data, caracterizacion_id: id };
      const userId = localStorage.getItem('id');
      recordData.user_id = userId;

      if (recordId) {
        // Actualizar registro existente
        await axios.put(
          `${config.urls.inscriptions.pi}/tables/${tableName}/record/${recordId}`,
          recordData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Datos de crédito actualizados exitosamente');
      } else {
        // Crear nuevo registro
        const response = await axios.post(
          `${config.urls.inscriptions.pi}/tables/${tableName}/records`,
          recordData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRecordId(response.data.id);
        alert('Datos de crédito guardados exitosamente');
      }
    } catch (error) {
      console.error('Error guardando los datos:', error);
      alert('Error al guardar los datos');
    }
  };

  if (loading) {
    return (
      <div className="text-center">
        <i className="fas fa-spinner fa-spin"></i> Cargando...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        {error}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <i className="fas fa-money-bill-wave mr-2"></i>
          Crédito
        </h3>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          {fields
            .filter(field => field.name !== 'id' && field.name !== 'caracterizacion_id' && field.name !== 'user_id' && field.name !== 'created_at' && field.name !== 'updated_at')
            .map((field) => (
              <div key={field.name} className="form-group">
                <label htmlFor={field.name}>
                  {field.label || field.name}
                  {field.required && <span className="text-danger"> *</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    className="form-control"
                    id={field.name}
                    name={field.name}
                    value={data[field.name] || ''}
                    onChange={handleChange}
                    required={field.required}
                    rows={4}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    className="form-control"
                    id={field.name}
                    name={field.name}
                    value={data[field.name] || ''}
                    onChange={handleChange}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          <div className="form-group">
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-save mr-2"></i>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreditoTab.propTypes = {
  id: PropTypes.string.isRequired,
};


