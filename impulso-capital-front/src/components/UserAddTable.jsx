import { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import './css/UserAddTable.css'; // Importamos el archivo CSS personalizado

export default function UserAddTable() {
  const [tableName, setTableName] = useState('');
  const [fields, setFields] = useState([
    {
      name: '',
      type: 'VARCHAR(255)',
      isRelation: false,
      relatedTable: '',
      relatedColumn: '',
      allow_null: true,
    },
  ]);
  const [availableTables, setAvailableTables] = useState([]); // Tablas disponibles
  const [relatedTableFields, setRelatedTableFields] = useState([]); // Campos de la tabla relacionada
  const [error, setError] = useState(''); // Estado para manejar errores
  const [prefix, setPrefix] = useState('inscription_'); // Estado para manejar el prefijo
  const [successMessage, setSuccessMessage] = useState(''); // Mensaje de éxito

  useEffect(() => {
    // Obtener las tablas disponibles para relaciones
    const fetchTables = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(config.urls.tables, {
          headers: { Authorization: `Bearer ${token}` },
          params: { tableType: 'all' }, // Obtener todas las tablas
        });
        setAvailableTables(response.data);
      } catch (error) {
        setError('Error obteniendo tablas disponibles');
      }
    };

    fetchTables();
  }, []);

  // Obtener los campos de la tabla relacionada
  const fetchRelatedTableFields = async (relatedTable) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(
        `${config.urls.tables}/${relatedTable}/fields`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setRelatedTableFields(response.data);
    } catch (error) {
      setError('Error obteniendo los campos de la tabla relacionada');
    }
  };

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        name: '',
        type: 'VARCHAR(255)',
        isRelation: false,
        relatedTable: '',
        relatedColumn: '',
        allow_null: true,
      },
    ]);
  };

  const handleFieldChange = (index, field) => {
    const updatedFields = fields.map((f, i) => (i === index ? field : f));
    setFields(updatedFields);
  };

  const handleRemoveField = (index) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tableName) {
      setError('El nombre de la tabla es requerido');
      return;
    }

    // Verificar que todos los campos tengan nombre
    if (fields.some((field) => !field.name)) {
      setError('Todos los campos deben tener un nombre');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Concatenar el prefijo al nombre de la tabla
      const prefixedTableName = `${prefix}${tableName}`;

      const tableData = { table_name: prefixedTableName, fields };
      console.log('Datos enviados al backend:', tableData); // Verificar los datos antes de enviarlos

      await axios.post(
        `${config.urls.inscriptions.base}/create-table`,
        tableData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccessMessage('Tabla creada con éxito');
      // Reiniciar el formulario
      setTableName('');
      setFields([
        {
          name: '',
          type: 'VARCHAR(255)',
          isRelation: false,
          relatedTable: '',
          relatedColumn: '',
          allow_null: true,
        },
      ]);
      setError('');
    } catch (error) {
      console.error('Error en la creación de la tabla:', error.response);
      setError(error.response?.data?.message || 'Error creando la tabla'); // Mostrar error del backend si está disponible
      setSuccessMessage('');
    }
  };

  return (
    <div className="content-wrapper">
      <section className="content-header">
        <div className="container">
          <h1>Crear Nueva Tabla</h1>
        </div>
      </section>
      <section className="content">
        <div className="container">
          {/* Mostrar mensaje de éxito si existe */}
          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          {/* Mostrar mensaje de error si existe */}
          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit} className="add-table-form">
            <div className="form-group">
              <label htmlFor="prefix">Tipo de Tabla</label>
              <select
                id="prefix"
                className="form-control"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              >
                <option value="inscription_">Inscripción</option>
                <option value="provider_">Proveedor</option>
                <option value="pi_">Plan de Inversión</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tableName">Nombre de la Tabla</label>
              <div className="input-group">
                <div className="input-group-prepend">
                  <span className="input-group-text">{prefix}</span>
                </div>
                <input
                  type="text"
                  id="tableName"
                  className="form-control"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Ingrese el nombre de la tabla"
                />
              </div>
              <small className="form-text text-muted">
                El nombre completo será: <strong>{prefix + tableName}</strong>
              </small>
            </div>

            <h3 className="mt-4">Definir Campos</h3>
            {fields.map((field, index) => (
              <div className="field-card" key={index}>
                <div className="field-card-header">
                  <h4>Campo {index + 1}</h4>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveField(index)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                <div className="field-card-body">
                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label htmlFor={`fieldName-${index}`}>Nombre del Campo</label>
                      <input
                        type="text"
                        id={`fieldName-${index}`}
                        className="form-control"
                        value={field.name}
                        onChange={(e) =>
                          handleFieldChange(index, { ...field, name: e.target.value })
                        }
                        placeholder="Nombre del Campo"
                      />
                    </div>

                    <div className="form-group col-md-6">
                      <label htmlFor={`fieldType-${index}`}>Tipo de Dato</label>
                      <select
                        id={`fieldType-${index}`}
                        className="form-control"
                        value={field.type}
                        onChange={(e) =>
                          handleFieldChange(index, { ...field, type: e.target.value })
                        }
                      >
                        <option value="VARCHAR(255)">Texto Corto</option>
                        <option value="TEXT">Texto Largo</option>
                        <option value="INTEGER">Número Entero</option>
                        <option value="DECIMAL">Número Decimal</option>
                        <option value="BOOLEAN">Booleano</option>
                        <option value="DATE">Fecha</option>
                        <option value="FOREIGN_KEY">Clave Foránea</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <div className="form-check mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={!field.allow_null}
                          onChange={(e) =>
                            handleFieldChange(index, {
                              ...field,
                              allow_null: !e.target.checked,
                            })
                          }
                          id={`required-${index}`}
                        />
                        <label className="form-check-label" htmlFor={`required-${index}`}>
                          Obligatorio
                        </label>
                      </div>
                    </div>

                    {field.type === 'FOREIGN_KEY' && (
                      <>
                        <div className="form-group col-md-6">
                          <label htmlFor={`relatedTable-${index}`}>Tabla Relacionada</label>
                          <select
                            id={`relatedTable-${index}`}
                            className="form-control"
                            value={field.relatedTable}
                            onChange={(e) => {
                              handleFieldChange(index, {
                                ...field,
                                relatedTable: e.target.value,
                                relatedColumn: '',
                              });
                              fetchRelatedTableFields(e.target.value);
                            }}
                          >
                            <option value="">-- Selecciona una tabla --</option>
                            {availableTables.map((table) => (
                              <option key={table.table_name} value={table.table_name}>
                                {table.table_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group col-md-6">
                          <label htmlFor={`relatedColumn-${index}`}>Columna Relacionada</label>
                          <select
                            id={`relatedColumn-${index}`}
                            className="form-control"
                            value={field.relatedColumn || ''}
                            onChange={(e) =>
                              handleFieldChange(index, {
                                ...field,
                                relatedColumn: e.target.value,
                              })
                            }
                            disabled={!field.relatedTable}
                          >
                            <option value="">-- Selecciona una columna --</option>
                            {relatedTableFields.map((relatedField) => (
                              <option
                                key={relatedField.column_name}
                                value={relatedField.column_name}
                              >
                                {relatedField.column_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="form-group mt-3">
              <button type="button" className="btn btn-success" onClick={handleAddField}>
                Agregar Campo
              </button>
              <button type="submit" className="btn btn-primary ml-2">
                Crear Tabla
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}



