import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './css/ListTables.css'; // Asegúrate de tener este archivo para estilos personalizados
import config from '../config';

export default function ListTables() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [fields, setFields] = useState([]);
  const [newField, setNewField] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const [relatedTableFields, setRelatedTableFields] = useState([]);
  const [error, setError] = useState(null);
  const [showTableFields, setShowTableFields] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableType, setTableType] = useState('inscription');

  const navigate = useNavigate();

  // Función para obtener el prefijo de una tabla
  const getTablePrefix = (tableName) => {
    const parts = tableName.split('_');
    return parts[0]; // Se asume que el prefijo es la primera parte
  };

  // Función para obtener las tablas según el tipo (inscription, provider o pi)
  const fetchTables = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token no encontrado. Por favor, inicia sesión nuevamente.');
      }

      const response = await axios.get(config.urls.tables, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { tableType },
      });

      const fetchedTables = response.data;

      if (fetchedTables.length === 0) {
        setError(`No se encontraron tablas para el tipo ${tableType}`);
      } else {
        setError(null);
      }

      setTables(fetchedTables);
      setLoading(false);
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Error obteniendo las tablas');
      setLoading(false);
    }
  }, [tableType]);

  // Obtener las tablas disponibles para las relaciones (todas las tablas)
  const fetchAvailableTables = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(config.urls.tables, {
        headers: { Authorization: `Bearer ${token}` },
        params: { tableType: 'all' },
      });
      setAvailableTables(response.data);
    } catch (error) {
      setError('Error obteniendo tablas disponibles');
    }
  }, []);
  

  useEffect(() => {
    fetchTables();
    fetchAvailableTables();
  }, [fetchTables, fetchAvailableTables]);

  // Obtener los campos de la tabla seleccionada
  const fetchTableFields = async (tableName) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token no encontrado. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (selectedTable === tableName && showTableFields) {
      setShowTableFields(false); // Ocultar los campos si ya se están mostrando
    } else {
      try {
        const response = await axios.get(`${config.urls.tables}/${tableName}/fields`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setFields(
          response.data.map((field) => ({
            ...field,
            original_column_name: field.column_name,
            original_data_type: field.data_type,
            original_allow_null: field.is_nullable === 'YES',
            allow_null: field.is_nullable === 'YES',
            relatedTable: field.foreign_table_name || '',
            constraint_type: field.constraint_type,
          }))
        );

        setSelectedTable(tableName);
        setShowTableFields(true); // Mostrar los campos
      } catch (error) {
        setError('Error obteniendo los campos de la tabla');
      }
    }
  };

  // Obtener las columnas de la tabla relacionada
  const fetchRelatedTableFields = async (relatedTable) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${config.urls.tables}/${relatedTable}/fields`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setRelatedTableFields(response.data);
    } catch (error) {
      setError('Error obteniendo los campos de la tabla relacionada');
    }
  };

  // Obtener el prefijo de la tabla seleccionada
  const selectedTablePrefix = selectedTable ? getTablePrefix(selectedTable) : null;

  // Filtrar las tablas disponibles según el prefijo de la tabla seleccionada
  const filteredAvailableTables = selectedTable
    ? availableTables.filter((table) =>
        table.table_name.startsWith(`${selectedTablePrefix}_`)
      )
    : [];

  // Función para descargar plantilla CSV
  const downloadCSVTemplate = async (tableName) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token no encontrado. Por favor, inicia sesión nuevamente.');
      return;
    }

    try {
      const response = await axios.get(`${config.urls.tables}/${tableName}/csv-template`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${tableName}_template.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      setError('Error descargando la plantilla CSV');
    }
  };

  // Función para descargar datos CSV
  const downloadCSVData = async (tableName) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token no encontrado. Por favor, inicia sesión nuevamente.');
      return;
    }

    try {
      const response = await axios.get(`${config.urls.tables}/${tableName}/download-csv`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${tableName}_data.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      setError('Error descargando los datos CSV');
    }
  };

  // Manejar el archivo CSV seleccionado
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Función para subir archivo CSV
  const uploadCSV = async (tableName) => {
    const token = localStorage.getItem('token');
    if (!file) {
      alert('Por favor selecciona un archivo CSV.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${config.urls.tables}/${tableName}/upload-csv`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Archivo CSV cargado con éxito');
    } catch (error) {
      setError('Error cargando el archivo CSV');
    }
  };

  // Función para eliminar una tabla
  const deleteTable = async (tableName) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token no encontrado. Por favor, inicia sesión nuevamente.');
      return;
    }

    try {
      await axios.delete(`${config.urls.tables}/${tableName}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTables(tables.filter((table) => table.table_name !== tableName));
      alert(`Tabla ${tableName} eliminada con éxito`);
    } catch (error) {
      setError(`Error eliminando la tabla: ${error.response?.data?.message || error.message}`);
    }
  };

  // Manejar cambios en los campos nuevos
  const handleNewFieldChange = (index, field) => {
    const updatedFields = fields.map((f, i) => (i === index ? field : f));
    setFields(updatedFields);
  };

  // Manejar eliminación de campos
  const handleFieldDelete = (index) => {
    const updatedFields = fields.map((f, i) => {
      if (i === index) {
        return { ...f, toDelete: !f.toDelete };
      }
      return f;
    });
    setFields(updatedFields);
  };

  // Mostrar el input para agregar un nuevo campo
  const addField = () => {
    setNewField({
      name: '',
      type: 'VARCHAR(255)',
      isRelation: false,
      relatedTable: '',
      allow_null: true,
    });
  };

  // Guardar el nuevo campo y añadirlo a la lista de campos
  const saveNewField = () => {
    if (!newField.name) {
      alert('El nombre del campo es requerido');
      return;
    }
    setFields([...fields, { ...newField, isNew: true }]);
    setNewField(null);
  };

  // Función para guardar los cambios realizados en la tabla
  const saveTableChanges = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token no encontrado. Por favor, inicia sesión nuevamente.');
      return;
    }

    try {
      const fieldsToAdd = fields.filter((field) => field.isNew);
      const fieldsToDelete = fields.filter((field) => field.toDelete);

      await axios.put(
        `${config.urls.tables}/${selectedTable}`,
        {
          fieldsToAdd,
          fieldsToDelete,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      alert('Cambios guardados con éxito');
      setNewField(null);
      fetchTableFields(selectedTable);
    } catch (error) {
      alert(`Error guardando cambios: ${error.response?.data?.message || error.message}`);
    }
  };

  // Función para cambiar el estado de "Principal"
  const togglePrincipal = async (tableName, isPrimary) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${config.urls.tables}/${tableName}/principal`,
        { is_primary: !isPrimary },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setTables((prevTables) =>
        prevTables.map((table) =>
          table.table_name === tableName ? { ...table, is_primary: !isPrimary } : table
        )
      );
    } catch (error) {
      setError(`Error actualizando el estado de "Principal": ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className="content-wrapper">
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Gestionar Tablas</h1>
            </div>
            <div className="col-sm-6 d-flex justify-content-end">
              <button
                className="btn btn-primary"
                onClick={() => navigate("/inscription")} // Redirige a /inscription
              >
                Crear Tabla
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="row">
            <div className="col-12">
              {loading ? (
                <div>Cargando...</div>
              ) : (
                <div className="card">
                  <div className="card-body table-responsive p-0">
                    <div className="d-flex justify-content-center my-3">
                      <button
                        className={`btn ${
                          tableType === "inscription"
                            ? "btn-primary"
                            : "btn-secondary"
                        } mx-2`}
                        onClick={() => setTableType("inscription")}
                      >
                        Ver Tablas de Inscripción
                      </button>
                      <button
                        className={`btn ${
                          tableType === "provider"
                            ? "btn-primary"
                            : "btn-secondary"
                        } mx-2`}
                        onClick={() => setTableType("provider")}
                      >
                        Ver Tablas de Proveedores
                      </button>
                      <button
                        className={`btn ${
                          tableType === "pi"
                            ? "btn-primary"
                            : "btn-secondary"
                        } mx-2`}
                        onClick={() => setTableType("pi")}
                      >
                        Ver Tablas de Plan de Inversión
                      </button>
                    </div>
                    <table className="table table-hover text-nowrap minimal-table">
                      <thead>
                        <tr>
                          <th>Nombre de la Tabla</th>
                          <th>Principal</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tables.map((table) => (
                          <tr key={table.table_name}>
                            <td>{table.table_name}</td>
                            <td>
                              <button
                                className={`btn btn-${
                                  table.is_primary ? "success" : "secondary"
                                }`}
                                onClick={() =>
                                  togglePrincipal(
                                    table.table_name,
                                    table.is_primary
                                  )
                                }
                              >
                                {table.is_primary ? "Sí" : "No"}
                              </button>
                            </td>
                            <td>
                              <button
                                className="btn btn-danger mr-2"
                                onClick={() => deleteTable(table.table_name)}
                              >
                                Eliminar
                              </button>
                              <button
                                className="btn btn-primary"
                                onClick={() =>
                                  fetchTableFields(table.table_name)
                                }
                              >
                                {selectedTable === table.table_name &&
                                showTableFields
                                  ? "Ocultar"
                                  : "Gestionar"}
                              </button>
                              <button
                                className="btn btn-secondary ml-2"
                                onClick={() =>
                                  downloadCSVTemplate(table.table_name)
                                }
                              >
                                Descargar CSV Plantilla
                              </button>
                              <button
                                className="btn btn-warning ml-2"
                                onClick={() =>
                                  downloadCSVData(table.table_name)
                                }
                              >
                                Descargar Datos CSV
                              </button>
                              <div className="d-inline-block ml-2">
                                <input
                                  type="file"
                                  accept=".csv"
                                  className="form-control-file"
                                  onChange={handleFileChange}
                                />
                              </div>
                              <button
                                className="btn btn-info ml-2"
                                onClick={() => uploadCSV(table.table_name)}
                              >
                                Cargar CSV
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedTable && showTableFields && (
                <div className="card mt-4">
                  <div className="card-body">
                    <h3>Gestionar tabla: {selectedTable}</h3>
                    <div>
                      <h4>Campos</h4>
                      <form>
                        {fields.map((field, index) => (
                          <div className="row mb-3" key={index}>
                            <div className="col-md-6">
                              <div className="form-group">
                                <label>Nombre del Campo</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={field.column_name || field.name}
                                  placeholder="Nombre del Campo"
                                  disabled={!field.isNew}
                                  onChange={
                                    field.isNew
                                      ? (e) =>
                                          handleNewFieldChange(index, {
                                            ...field,
                                            column_name: e.target.value,
                                            name: e.target.value,
                                          })
                                      : undefined
                                  }
                                />
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="form-group">
                                <label>Tipo de Dato</label>
                                <select
                                  className="form-control"
                                  value={field.data_type || field.type}
                                  disabled={!field.isNew}
                                  onChange={
                                    field.isNew
                                      ? (e) =>
                                          handleNewFieldChange(index, {
                                            ...field,
                                            data_type: e.target.value,
                                            type: e.target.value,
                                          })
                                      : undefined
                                  }
                                >
                                  <option value="VARCHAR(255)">
                                    Texto Corto
                                  </option>
                                  <option value="TEXT">Texto Largo</option>
                                  <option value="INTEGER">Número Entero</option>
                                  <option value="DECIMAL">
                                    Número Decimal
                                  </option>
                                  <option value="BOOLEAN">Booleano</option>
                                  <option value="DATE">Fecha</option>
                                  <option value="FOREIGN_KEY">
                                    Clave Foránea
                                  </option>
                                </select>
                              </div>
                            </div>

                            {/* Mostrar tabla relacionada si el campo es una clave foránea */}
                            {field.constraint_type === 'FOREIGN KEY' && (
                              <div className="col-md-12">
                                <p className="text-muted">
                                  Clave Foránea: Relacionado con la tabla{" "}
                                  <strong>{field.relatedTable}</strong>
                                </p>
                              </div>
                            )}

                            {/* Checkbox para marcar si el campo es obligatorio */}
                            <div className="col-md-6">
                              <div className="form-group">
                                <div className="form-check mt-2">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={!field.allow_null}
                                    disabled={!field.isNew}
                                    onChange={
                                      field.isNew
                                        ? (e) =>
                                            handleNewFieldChange(index, {
                                              ...field,
                                              allow_null: !e.target.checked,
                                            })
                                        : undefined
                                    }
                                    id={`required-${index}`}
                                  />
                                  <label
                                    className="form-check-label"
                                    htmlFor={`required-${index}`}
                                  >
                                    Obligatorio
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* Seleccionar tabla relacionada si es clave foránea */}
                            {(field.data_type === "FOREIGN_KEY" ||
                              field.type === "FOREIGN_KEY") &&
                              field.isNew && (
                                <div className="col-md-6">
                                  <div className="form-group">
                                    <label>Tabla Relacionada</label>
                                    <select
                                      className="form-control"
                                      value={field.relatedTable || ""}
                                      onChange={(e) => {
                                        handleNewFieldChange(index, {
                                          ...field,
                                          relatedTable: e.target.value,
                                        });
                                        fetchRelatedTableFields(e.target.value);
                                      }}
                                    >
                                      <option value="">
                                        -- Selecciona una tabla relacionada --
                                      </option>
                                      {filteredAvailableTables.map((table) => (
                                        <option
                                          key={table.table_name}
                                          value={table.table_name}
                                        >
                                          {table.table_name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Mostrar columnas de la tabla relacionada */}
                                  {relatedTableFields.length > 0 && (
                                    <div className="form-group">
                                      <label>Columna Relacionada</label>
                                      <select
                                        className="form-control"
                                        value={field.relatedColumn || ""}
                                        onChange={(e) =>
                                          handleNewFieldChange(index, {
                                            ...field,
                                            relatedColumn: e.target.value,
                                          })
                                        }
                                      >
                                        <option value="">
                                          -- Selecciona una columna --
                                        </option>
                                        {relatedTableFields.map(
                                          (relatedField) => (
                                            <option
                                              key={relatedField.column_name}
                                              value={relatedField.column_name}
                                            >
                                              {relatedField.column_name}
                                            </option>
                                          )
                                        )}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              )}

                            {/* Botón para eliminar campo */}
                            {field.column_name !== "id" && (
                              <div className="col-md-12">
                                <button
                                  className={`btn btn-${
                                    field.toDelete ? "secondary" : "danger"
                                  } mt-2`}
                                  onClick={() => handleFieldDelete(index)}
                                >
                                  {field.toDelete
                                    ? "Cancelar Eliminación"
                                    : "Eliminar Campo"}
                                </button>
                                {field.toDelete && (
                                  <p className="text-danger">
                                    Este campo será eliminado
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Mostrar el nuevo campo solo cuando el botón "Agregar Campo" es presionado */}
                        {newField && (
                          <div className="row mb-3 mt-4">
                            <div className="col-md-6">
                              <div className="form-group">
                                <label>Nombre del Campo</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={newField.name}
                                  onChange={(e) =>
                                    setNewField({
                                      ...newField,
                                      name: e.target.value,
                                    })
                                  }
                                  placeholder="Nombre del Campo"
                                />
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="form-group">
                                <label>Tipo de Dato</label>
                                <select
                                  className="form-control"
                                  value={newField.type}
                                  onChange={(e) =>
                                    setNewField({
                                      ...newField,
                                      type: e.target.value,
                                    })
                                  }
                                >
                                  <option value="VARCHAR(255)">
                                    Texto Corto
                                  </option>
                                  <option value="TEXT">Texto Largo</option>
                                  <option value="INTEGER">Número Entero</option>
                                  <option value="DECIMAL">
                                    Número Decimal
                                  </option>
                                  <option value="BOOLEAN">Booleano</option>
                                  <option value="DATE">Fecha</option>
                                  <option value="FOREIGN_KEY">
                                    Clave Foránea
                                  </option>
                                </select>
                              </div>
                            </div>

                            {/* Checkbox para marcar si el campo es obligatorio */}
                            <div className="col-md-6">
                              <div className="form-group">
                                <div className="form-check mt-2">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={!newField.allow_null}
                                    onChange={(e) =>
                                      setNewField({
                                        ...newField,
                                        allow_null: !e.target.checked,
                                      })
                                    }
                                    id="new-field-required"
                                  />
                                  <label
                                    className="form-check-label"
                                    htmlFor="new-field-required"
                                  >
                                    Obligatorio
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* Seleccionar tabla relacionada si es clave foránea */}
                            {newField.type === "FOREIGN_KEY" && (
                              <div className="col-md-6">
                                <div className="form-group">
                                  <label>Tabla Relacionada</label>
                                  <select
                                    className="form-control"
                                    value={newField.relatedTable || ""}
                                    onChange={(e) => {
                                      setNewField({
                                        ...newField,
                                        relatedTable: e.target.value,
                                      });
                                      fetchRelatedTableFields(e.target.value);
                                    }}
                                  >
                                    <option value="">
                                      -- Selecciona una tabla relacionada --
                                    </option>
                                    {filteredAvailableTables.map((table) => (
                                      <option
                                        key={table.table_name}
                                        value={table.table_name}
                                      >
                                        {table.table_name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Mostrar columnas de la tabla relacionada */}
                                {relatedTableFields.length > 0 && (
                                  <div className="form-group">
                                    <label>Columna Relacionada</label>
                                    <select
                                      className="form-control"
                                      value={newField.relatedColumn || ""}
                                      onChange={(e) =>
                                        setNewField({
                                          ...newField,
                                          relatedColumn: e.target.value,
                                        })
                                      }
                                    >
                                      <option value="">
                                        -- Selecciona una columna --
                                      </option>
                                      {relatedTableFields.map(
                                        (relatedField) => (
                                          <option
                                            key={relatedField.column_name}
                                            value={relatedField.column_name}
                                          >
                                            {relatedField.column_name}
                                          </option>
                                        )
                                      )}
                                    </select>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="col-md-12">
                              <button
                                className="btn btn-success mt-2"
                                onClick={saveNewField}
                              >
                                Guardar Nuevo Campo
                              </button>
                            </div>
                          </div>
                        )}

                        {!newField && (
                          <button
                            className="btn btn-success mt-4"
                            onClick={addField}
                          >
                            Agregar Campo
                          </button>
                        )}

                        <button
                          className="btn btn-primary mt-4 ml-2"
                          onClick={saveTableChanges}
                        >
                          Guardar Cambios
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

