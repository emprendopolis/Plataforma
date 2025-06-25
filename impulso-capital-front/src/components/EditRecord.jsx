import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import config from '../config';

export default function EditRecord() {
  const { tableName, id } = useParams(); // Obtener el nombre de la tabla y el ID desde la URL
  const [record, setRecord] = useState(null); // Estado para los detalles del registro
  const [fields, setFields] = useState([]); // Estado para los campos de la tabla
  const [loading, setLoading] = useState(false); // Estado de carga
  const [error, setError] = useState(null); // Estado de error
  const navigate = useNavigate();

  // Obtener los detalles del registro y los campos de la tabla
  useEffect(() => {
    const fetchRecordData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // Obtener los campos de la tabla
        const fieldsResponse = await axios.get(`${config.urls.inscriptions.tables}/${tableName}/fields`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setFields(fieldsResponse.data);

        // Obtener los datos del registro
        const recordResponse = await axios.get(`${config.urls.inscriptions.tables}/${tableName}/records/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setRecord(recordResponse.data);
        setLoading(false);
      } catch (error) {
        setError('Error obteniendo los datos del registro');
        setLoading(false);
      }
    };

    fetchRecordData();
  }, [tableName, id]);

  // Manejar el cambio en los campos del registro
  const handleFieldChange = (field, value) => {
    setRecord({ ...record, [field]: value });
  };

  // Función para guardar los cambios
  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${config.urls.inscriptions.base}/tables/${tableName}/records/${id}`, record, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert('Registro actualizado con éxito');
      navigate(-1); // Volver a la página anterior
    } catch (error) {
      setError('Error guardando los cambios');
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="content-wrapper">
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Editar Registro</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="container-fluid">
          {record ? (
            <div className="card">
              <div className="card-body">
                <form>
                  {fields.map((field) => (
                    <div className="form-group" key={field.column_name}>
                      <label>{field.column_name}</label>
                      <input
                        type="text"
                        className="form-control"
                        value={record[field.column_name] || ''}
                        onChange={(e) => handleFieldChange(field.column_name, e.target.value)}
                      />
                    </div>
                  ))}
                  <button type="button" className="btn btn-primary" onClick={handleSave}>
                    Guardar Cambios
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div>No se encontró el registro</div>
          )}
        </div>
      </section>
    </div>
  );
}
