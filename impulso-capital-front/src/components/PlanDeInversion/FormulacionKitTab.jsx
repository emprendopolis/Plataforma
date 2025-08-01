import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

export default function FormulacionKitTab({ id }) {
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [codigosKit, setCodigosKit] = useState([]);
  const [selectedCodigoKit, setSelectedCodigoKit] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [piFormulacionRecords, setPiFormulacionRecords] = useState([]);
  // Estado local para cantidades temporales
  const [localCantidades, setLocalCantidades] = useState({});
  const [priorizacionCapitalizacion, setPriorizacionCapitalizacion] = useState(null);

  // 1. Obtener role_id y verificar si es '5' o '3'
  const roleId = localStorage.getItem('role_id');
  const isRole5 = roleId === '5';
  const isRole3 = roleId === '3';

  const tableName = 'kit_proveedores'; // Tabla específica para kits
  const piFormulacionTableName = 'master_formulacion'; // Formulación específica para kits

  const displayedFieldNames = [
    "codigoKit",
    "cantidad_bienes",
    "Nombre proveedor",
    "Valor catalogo",
    "Precio",
    "Calificacion"
  ];

  useEffect(() => {
    const fetchFieldsAndData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No se encontró el token de autenticación.');
        }

        const fieldsUrl = `${config.urls.inscriptions.base}/tables/${tableName}/fields`;
        const recordsUrl = `${config.urls.inscriptions.base}/tables/${tableName}/records`;

        const [fieldsResponse, recordsResponse] = await Promise.all([
          axios.get(fieldsUrl, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(recordsUrl, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const filteredFields = fieldsResponse.data.filter((field) =>
          displayedFieldNames.includes(field.column_name)
        );
        setFields(filteredFields);
        
        // Obtener códigos únicos de kit
        const allRecords = recordsResponse.data;
        const uniqueCodigosKit = [...new Set(allRecords.map(record => record.codigoKit).filter(Boolean))];
        setCodigosKit(uniqueCodigosKit);
        setRecords(allRecords);

        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo los campos o datos:', error);
        setError(error.response?.data?.message || 'Error obteniendo los campos o datos');
        setLoading(false);
      }
    };

    fetchFieldsAndData();
  }, []);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!selectedCodigoKit) {
        setRecords([]);
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const recordsUrl = `${config.urls.inscriptions.base}/tables/${tableName}/records?codigoKit=${selectedCodigoKit}`;

        const recordsResponse = await axios.get(recordsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setRecords(recordsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo los registros:', error);
        setError(error.response?.data?.message || 'Error obteniendo los registros');
        setLoading(false);
      }
    };

    fetchRecords();
  }, [selectedCodigoKit]);

  // Mover esta función fuera del useEffect
  const fetchPiFormulacionRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const piFormulacionUrl = `${config.urls.inscriptions.base}/master/tables/${piFormulacionTableName}/records?caracterizacion_id=${id}`;
      const response = await axios.get(piFormulacionUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const piRecords = response.data;

      // Filtrar solo IDs válidos
      const providerIds = piRecords
        .map((piRecord) => piRecord.rel_id_prov)
        .filter((id) => id !== undefined && id !== null);

      const providerPromises = providerIds.map(async (providerId) => {
        try {
          const providerUrl = `${config.urls.inscriptions.base}/tables/${tableName}/record/${providerId}`;
          const response = await axios.get(providerUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return response.data.record;
        } catch (error) {
          console.warn(`Proveedor con ID ${providerId} no encontrado:`, error.message);
          return null;
        }
      });

      const providersData = await Promise.all(providerPromises);

      const combinedData = piRecords.map((piRecord) => {
        const providerData = providersData.find(
          (provider) => provider && String(provider.id) === String(piRecord.rel_id_prov)
        );
        return {
          ...piRecord,
          providerData: providerData || null,
        };
      });

      // Filtrar registros que tienen proveedores válidos para mostrar en la tabla
      const validRecords = combinedData.filter(record => record.providerData !== null);
      
      if (validRecords.length < combinedData.length) {
        console.warn(`${combinedData.length - validRecords.length} registros tienen proveedores que no existen y serán omitidos.`);
      }

      setPiFormulacionRecords(combinedData);
    } catch (error) {
      console.error('Error obteniendo los registros de master_formulacion:', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPiFormulacionRecords();
    }
  }, [id]);

  // Actualizar localCantidades cuando cambian los datos de piFormulacionRecords
  useEffect(() => {
    const nuevasCantidades = {};
    piFormulacionRecords.forEach((rec) => {
      nuevasCantidades[rec.rel_id_prov] = rec.Cantidad === undefined || rec.Cantidad === null ? '1' : String(rec.Cantidad);
    });
    setLocalCantidades(nuevasCantidades);
  }, [piFormulacionRecords]);

  useEffect(() => {
    const fetchPriorizacion = async () => {
      if (!id) return;
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await axios.get(
          `${config.urls.inscriptions.tables}/inscription_caracterizacion/record/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPriorizacionCapitalizacion(response.data.record?.['Priorizacion capitalizacion'] ?? null);
      } catch (error) {
        setPriorizacionCapitalizacion(null);
      }
    };
    fetchPriorizacion();
  }, [id]);

  const handleCodigoKitChange = (e) => {
    setSelectedCodigoKit(e.target.value);
    setSearchTerm('');
  };

  const getPiFormulacionData = (recordId) => {
    return piFormulacionRecords.find(
      (piRecord) => String(piRecord.rel_id_prov) === String(recordId)
    ) || {};
  };

  const handleCantidadChange = async (recordId, cantidad) => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('id');
      const existingPiData = getPiFormulacionData(recordId);

      const recordData = {
        caracterizacion_id: parseInt(id),
        rel_id_prov: recordId,
        Cantidad: cantidad,
        user_id: parseInt(userId),
      };

      const endpoint = `${config.urls.inscriptions.base}/master/tables/${piFormulacionTableName}/record`;

      if (existingPiData.id) {
        await axios.put(`${endpoint}/${existingPiData.id}`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const res = await axios.post(endpoint, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        recordData.id = res.data.id;
      }

      // Recargar los datos después de crear o actualizar
      await fetchPiFormulacionRecords();
    } catch (error) {
      console.error('Error al cambiar la cantidad:', error);
    }
  };

  const handleApprovalChange = async (record, field, value) => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('id');
      const existingPiData = getPiFormulacionData(record.id);
      const cantidad = existingPiData.Cantidad || 1;



      const recordData = {
        caracterizacion_id: parseInt(id),
        rel_id_prov: record.id,
        Cantidad: cantidad,
        user_id: parseInt(userId),
        [field]: value,
      };



      if (field === "Seleccion") {
        if (value === true) {
          // Ver cuántos productos ya están seleccionados:
          const currentlySelected = piFormulacionRecords.filter(r => r.Seleccion);
          const occupiedOrders = currentlySelected
            .map(r => r.selectionorder)
            .filter(o => o !== null && o !== undefined);

          // Espacios disponibles son 1,2,3
          const possibleOrders = [1, 2, 3];
          const freeOrder = possibleOrders.find(order => !occupiedOrders.includes(order));

          if (!freeOrder) {
            console.log("Ya hay 3 productos seleccionados. No se puede seleccionar otro.");
            // Revertimos el checkbox en interfaz, sin actualizar en BD.
            return;
          }
          recordData.selectionorder = freeOrder;
        } else {
          recordData.selectionorder = null;
        }
      }

      const endpoint = `${config.urls.inscriptions.base}/master/tables/${piFormulacionTableName}/record`;



      if (existingPiData.id) {
        const response = await axios.put(`${endpoint}/${existingPiData.id}`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const res = await axios.post(endpoint, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        recordData.id = res.data.id;
      }

      // Recargar los datos después de crear o actualizar, excepto para textareas
      if (field !== "Descripcion dimensiones" && field !== "Justificacion") {
        await fetchPiFormulacionRecords();
      }
    } catch (error) {
      console.error('Error al cambiar la aprobación:', error);
    }
  };

  const selectedRecords = piFormulacionRecords
    .filter((piRecord) => piRecord["Seleccion"]);

  // Ordenar los seleccionados por selectionorder
  selectedRecords.sort((a, b) => {
    const orderA = a.selectionorder || Infinity;
    const orderB = b.selectionorder || Infinity;
    return orderA - orderB;
  });

  const filteredRecords = useMemo(() => {
    let filtered = records;
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(record => {
        const cantidadBienes = record['cantidad_bienes'] || '';
        return cantidadBienes.toLowerCase().includes(lowercasedFilter);
      });
    }
    const sortedRecords = filtered.sort(
      (a, b) => b["Calificacion"] - a["Calificacion"]
    );
    return sortedRecords; 
  }, [records, searchTerm]);

  return (
    <div>
      <h3>Formulación con Kits (Grupo 2)</h3>
      {loading ? (
        <p>Cargando datos...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          {/* Campo Código Kit */}
          <div className="form-group">
            <label>Código Kit</label>
            <select
              className="form-control"
              value={selectedCodigoKit}
              onChange={handleCodigoKitChange}
              disabled={isRole5 || isRole3}
            >
              <option value="">-- Selecciona un código kit --</option>
              {codigosKit.map((codigo) => (
                <option key={codigo} value={codigo}>
                  {codigo}
                </option>
              ))}
            </select>
          </div>

          {/* Campo Descripción por bien */}
          <div className="form-group mt-3">
            <label>Descripción por bien</label>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!selectedCodigoKit || isRole5 || isRole3}
            />
          </div>

          <table className="table tabla-moderna mt-3">
            <thead>
              <tr>
                <th>Código Kit</th>
                <th>Descripción por bien</th>
                <th>Precio</th>
                <th>Descripción Corta</th>
                <th className="text-center columna-cantidad">Cantidad</th>
                <th className="text-center columna-preseleccion">Pre-selección</th>
                <th className="text-center columna-seleccion">Selección</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => {
                  const piData = getPiFormulacionData(record.id);

                  return (
                    <tr key={record.id}>
                      <td>{record.codigoKit}</td>
                      <td>{record.cantidad_bienes}</td>
                      <td className="columna-precio">
                        {record.Precio !== undefined ? `$ ${Number(record.Precio).toLocaleString('es-CO')}` : ''}
                      </td>
                      <td>{record["Descripcion corta"] || ''}</td>
                      <td className="text-center columna-cantidad">
                        <input
                          type="number"
                          min="1"
                          value={localCantidades[record.id] ?? '1'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalCantidades((prev) => ({ ...prev, [record.id]: val }));
                          }}
                          onBlur={(e) => {
                            let val = e.target.value;
                            if (val === '' || Number(val) < 1) {
                              val = '1';
                            }
                            setLocalCantidades((prev) => ({ ...prev, [record.id]: val }));
                            handleCantidadChange(record.id, parseInt(val));
                          }}
                          style={{ width: '60px', MozAppearance: 'textfield', textAlign: 'center' }}
                          className="no-spinner"
                          readOnly={isRole3}
                          disabled={isRole3}
                        />
                      </td>
                      <td className="text-center columna-preseleccion">
                        <input
                          type="checkbox"
                          checked={piData["pre-seleccion"] || false}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            // Luego hacer la llamada al servidor
                            handleApprovalChange(record, "pre-seleccion", newValue);
                          }}
                          disabled={isRole3}
                        />
                      </td>
                      <td className="text-center columna-seleccion">
                        <input
                          type="checkbox"
                          checked={piData["Seleccion"] || false}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            // Luego hacer la llamada al servidor
                            handleApprovalChange(record, "Seleccion", newValue);
                          }}
                          disabled={isRole3}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center">
                    No hay coincidencias.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-4">
            <h5>Productos Seleccionados</h5>
            {selectedRecords.length > 0 ? (
              <table className="table tabla-moderna">
                <thead>
                  <tr>
                    <th className="text-center">Prioridad</th>
                    <th>Código Kit</th>
                    <th>Descripción por bien</th>
                    <th className="text-center columna-cantidad">Cantidad</th>
                    <th>Precio</th>
                    <th>Descripción dimensiones</th>
                    <th>Justificación</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecords.map((piRecord) => {
                    const provider = piRecord.providerData;
                    if (!provider) return null;

                    const cantidad = parseFloat(piRecord.Cantidad) || 1;
                    const precio = parseFloat(provider["Precio"]) || 0;

                    return (
                      <tr key={piRecord.rel_id_prov}>
                        <td className="text-center">{piRecord.selectionorder || ''}</td>
                        <td>{provider.codigoKit}</td>
                        <td>{provider.cantidad_bienes}</td>
                        <td className="text-center columna-cantidad">{cantidad}</td>
                        <td>{precio !== 0 ? `$ ${precio.toLocaleString('es-CO')}` : ''}</td>
                        <td>
                          <textarea
                            value={piRecord["Descripcion dimensiones"] || ''}
                            onChange={(e) => {
                              // Actualizar solo el estado local mientras el usuario escribe
                              setPiFormulacionRecords(prevRecords => {
                                return prevRecords.map(prevRecord => {
                                  if (String(prevRecord.rel_id_prov) === String(piRecord.rel_id_prov)) {
                                    return {
                                      ...prevRecord,
                                      "Descripcion dimensiones": e.target.value
                                    };
                                  }
                                  return prevRecord;
                                });
                              });
                            }}
                            onBlur={(e) => handleApprovalChange({id: piRecord.rel_id_prov}, "Descripcion dimensiones", e.target.value)}
                            className="form-control"
                            rows="1"
                            placeholder="Ingrese descripción de dimensiones..."
                            disabled={isRole3}
                          />
                        </td>
                        <td>
                          <textarea
                            value={piRecord["Justificacion"] || ''}
                            onChange={(e) => {
                              // Actualizar solo el estado local mientras el usuario escribe
                              setPiFormulacionRecords(prevRecords => {
                                return prevRecords.map(prevRecord => {
                                  if (String(prevRecord.rel_id_prov) === String(piRecord.rel_id_prov)) {
                                    return {
                                      ...prevRecord,
                                      "Justificacion": e.target.value
                                    };
                                  }
                                  return prevRecord;
                                });
                              });
                            }}
                            onBlur={(e) => handleApprovalChange({id: piRecord.rel_id_prov}, "Justificacion", e.target.value)}
                            className="form-control"
                            rows="1"
                            placeholder="Ingrese justificación..."
                            disabled={isRole3}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p>No hay kits seleccionados.</p>
            )}
          </div>

          {/* Resumen de inversión oculto según especificación */}
          {/* <div className="mt-4">
            <h5>Resumen de la Inversión en Kits</h5>
            ... contenido del resumen ...
          </div> */}
        </>
      )}
    </div>
  );
}

FormulacionKitTab.propTypes = {
  id: PropTypes.string.isRequired,
}; 