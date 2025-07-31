import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

export default function FormulacionKitTab({ id }) {
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [selectedRubro, setSelectedRubro] = useState('');
  const [elementos, setElementos] = useState([]);
  const [selectedElemento, setSelectedElemento] = useState('');
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

          const tableName = 'kit_proveedores'; // Cambio: tabla específica para kits
        const rubroTableName = 'kit_rubro'; // Cambio: rubros específicos para kits
        const elementoTableName = 'kit_elemento'; // Cambio: elementos específicos para kits
        const piFormulacionTableName = 'master_formulacion'; // Cambio: formulación específica para kits (con columnas adicionales)

  const displayedFieldNames = [
    "Nombre proveedor",
    "Rubro",
    "Elemento",
    "Descripcion corta",
    "Valor catalogo",
    "Precio",
    "Puntuacion evaluacion"
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
        const rubrosUrl = `${config.urls.inscriptions.base}/tables/${rubroTableName}/records`;
        const elementosUrl = `${config.urls.inscriptions.base}/tables/${elementoTableName}/records`;

        const [fieldsResponse, rubrosResponse, elementosResponse] = await Promise.all([
          axios.get(fieldsUrl, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(rubrosUrl, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(elementosUrl, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const filteredFields = fieldsResponse.data.filter((field) =>
          displayedFieldNames.includes(field.column_name)
        );
        setFields(filteredFields);
        setRubros(rubrosResponse.data);
        setElementos(elementosResponse.data);

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
      if (!selectedRubro) {
        setRecords([]);
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        let recordsUrl = `${config.urls.inscriptions.base}/tables/${tableName}/records?Rubro=${selectedRubro}`;
        if (selectedElemento) {
          recordsUrl += `&Elemento=${selectedElemento}`;
        }

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
  }, [selectedRubro, selectedElemento]);

  // Mover esta función fuera del useEffect
  const fetchPiFormulacionRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const piFormulacionUrl = `${config.urls.inscriptions.base}/pi/tables/${piFormulacionTableName}/records?caracterizacion_id=${id}`;
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
      console.error('Error obteniendo los registros de pi_formulacion_kit:', error);
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

  const handleRubroChange = (e) => {
    setSelectedRubro(e.target.value);
    setSelectedElemento('');
    setSearchTerm('');
  };

  const handleElementoChange = (e) => {
    setSelectedElemento(e.target.value);
    setSearchTerm('');
  };

  const getElementoName = (elementoId) => {
    const elemento = elementos.find((el) => String(el.id) === String(elementoId));
    return elemento ? elemento.Elemento : 'Desconocido';
  };

  const getRubroName = (rubroId) => {
    const rubro = rubros.find((r) => String(r.id) === String(rubroId));
    return rubro ? rubro.Rubro : 'Desconocido';
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
        caracterizacion_id: id,
        rel_id_prov: recordId,
        Cantidad: cantidad,
        user_id: userId,
      };

      const endpoint = `${config.urls.inscriptions.base}/pi/tables/${piFormulacionTableName}/record`;

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

      // Actualizar el estado local en lugar de recargar todos los datos
      setPiFormulacionRecords(prevRecords => {
        return prevRecords.map(prevRecord => {
          if (String(prevRecord.rel_id_prov) === String(recordId)) {
            return {
              ...prevRecord,
              Cantidad: cantidad
            };
          }
          return prevRecord;
        });
      });
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
        caracterizacion_id: id,
        rel_id_prov: record.id,
        Cantidad: cantidad,
        user_id: userId,
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

      const endpoint = `${config.urls.inscriptions.base}/pi/tables/${piFormulacionTableName}/record`;

      console.log('Enviando recordData:', recordData);

      if (existingPiData.id) {
        await axios.put(`${endpoint}/${existingPiData.id}`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        console.log('Enviando recordData (POST):', recordData);
        const res = await axios.post(endpoint, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        recordData.id = res.data.id;
      }

      // Solo actualizar el estado local si no es un checkbox (para evitar doble actualización)
      if (field !== "pre-Seleccion" && field !== "Seleccion") {
        setPiFormulacionRecords(prevRecords => {
          return prevRecords.map(prevRecord => {
            if (String(prevRecord.rel_id_prov) === String(record.id)) {
              return {
                ...prevRecord,
                [field]: value,
                ...(field === "Seleccion" && value === true ? { selectionorder: recordData.selectionorder } : {}),
                ...(field === "Seleccion" && value === false ? { selectionorder: null } : {})
              };
            }
            return prevRecord;
          });
        });
      }
    } catch (error) {
      console.error('Error al cambiar la aprobación:', error);
    }
  };

  const groupedRubros = useMemo(() => {
    const rubroMap = {};
    piFormulacionRecords.forEach((piRecord) => {
      if (piRecord["Seleccion"]) {
        const provider = piRecord.providerData;
        if (provider) {
          const rubroName = getRubroName(provider.Rubro);
          const precioCatalogo = parseFloat(provider["Valor Catalogo y/o referencia"]) || 0;
          const cantidad = parseFloat(piRecord.Cantidad) || 1;
          const totalPrice = precioCatalogo * cantidad;

          if (rubroMap[rubroName]) {
            rubroMap[rubroName] += totalPrice;
          } else {
            rubroMap[rubroName] = totalPrice;
          }
        }
      }
    });

    return Object.entries(rubroMap).map(([rubro, total]) => ({
      rubro,
      total: total,
      totalFormateado: total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
    }));
  }, [piFormulacionRecords, rubros]);

  const totalInversion = groupedRubros
    .reduce((acc, record) => acc + parseFloat(record.total || 0), 0)
    .toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

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
        const descripcionCorta = record['Descripcion corta'] || '';
        return descripcionCorta.toLowerCase().includes(lowercasedFilter);
      });
    }
    const sortedRecords = filtered.sort(
      (a, b) => b["Puntuacion evaluacion"] - a["Puntuacion evaluacion"]
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
          {/* 2. Deshabilitar selector de Rubro si es role 5 */}
          <div className="form-group">
            <label>Rubro</label>
            <select
              className="form-control"
              value={selectedRubro}
              onChange={handleRubroChange}
              disabled={isRole5 || isRole3}
            >
              <option value="">-- Selecciona un rubro --</option>
              {rubros.map((rubro) => (
                <option key={rubro.id} value={rubro.id}>
                  {rubro.Rubro}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Deshabilitar selector de Elemento si es role 5 (o si no hay rubro) */}
          <div className="form-group mt-3">
            <label>Elemento</label>
            <select
              className="form-control"
              value={selectedElemento}
              onChange={handleElementoChange}
              disabled={!selectedRubro || isRole5 || isRole3}
            >
              <option value="">-- Selecciona un elemento --</option>
              {elementos.map((elemento) => (
                <option key={elemento.id} value={elemento.id}>
                  {elemento.Elemento}
                </option>
              ))}
            </select>
          </div>

          {/* 4. (Opcional) Si quieres también bloquear la búsqueda cuando es role 5 */}
          <div className="form-group mt-3">
            <label>Búsqueda por Descripción Corta</label>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!selectedRubro || isRole5 || isRole3}
            />
          </div>

          <table className="table tabla-moderna mt-3">
            <thead>
              <tr>
                {fields.map((field) => (
                  <th
                    key={field.column_name}
                    className={
                      field.column_name === 'Precio'
                        ? 'columna-precio'
                        : field.column_name === 'Rubro'
                        ? 'columna-rubro'
                        : field.column_name === 'Elemento'
                        ? 'columna-elemento'
                        : ''
                    }
                  >
                    {field.column_name.replace('_', ' ')}
                  </th>
                ))}
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
                      {fields.map((field) => (
                        <td
                          key={field.column_name}
                          className={
                            field.column_name === 'Precio'
                              ? 'columna-precio'
                              : field.column_name === 'Rubro'
                              ? 'columna-rubro'
                              : field.column_name === 'Elemento'
                              ? 'columna-elemento'
                              : ''
                          }
                        >
                          {field.column_name === 'Elemento'
                            ? getElementoName(record.Elemento)
                            : field.column_name === 'Rubro'
                            ? getRubroName(record.Rubro)
                            : field.column_name === 'Precio'
                            ? `$ ${Number(record[field.column_name]).toLocaleString('es-CO')}`
                            : record[field.column_name]}
                        </td>
                      ))}
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
                            handleCantidadChange(record.id, Number(val));
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
                          checked={piData["pre-Seleccion"] || false}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            // Actualizar inmediatamente el estado local
                            setPiFormulacionRecords(prevRecords => {
                              return prevRecords.map(prevRecord => {
                                if (String(prevRecord.rel_id_prov) === String(record.id)) {
                                  return {
                                    ...prevRecord,
                                    "pre-Seleccion": newValue
                                  };
                                }
                                return prevRecord;
                              });
                            });
                            // Luego hacer la llamada al servidor
                            handleApprovalChange(record, "pre-Seleccion", newValue);
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
                            // Actualizar inmediatamente el estado local
                            setPiFormulacionRecords(prevRecords => {
                              return prevRecords.map(prevRecord => {
                                if (String(prevRecord.rel_id_prov) === String(record.id)) {
                                  return {
                                    ...prevRecord,
                                    "Seleccion": newValue,
                                    ...(newValue === true ? { selectionorder: null } : {}),
                                    ...(newValue === false ? { selectionorder: null } : {})
                                  };
                                }
                                return prevRecord;
                              });
                            });
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
                  <td colSpan={fields.length + 4} className="text-center">
                    No hay coincidencias.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-4">
            <h5>Kits Seleccionados</h5>
            {selectedRecords.length > 0 ? (
              <table className="table tabla-moderna">
                <thead>
                  <tr>
                    <th className="text-center">Prioridad</th>
                    <th>Elemento</th>
                    <th>Descripción</th>
                    <th className="text-center columna-cantidad">Cantidad</th>
                    <th>Precio Proveedor</th>
                    <th>Descripción dimensiones</th>
                    <th>Justificación</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecords.map((piRecord) => {
                    const provider = piRecord.providerData;
                    if (!provider) return null;

                    const cantidad = parseFloat(piRecord.Cantidad) || 1;
                    const precioCatalogo = parseFloat(provider["Valor Catalogo y/o referencia"]) || 0;
                    const total = (precioCatalogo * cantidad);
                    const precioFormateado = precioCatalogo.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
                    const totalFormateado = total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

                    return (
                      <tr key={piRecord.rel_id_prov}>
                        <td className="text-center">{piRecord.selectionorder || ''}</td>
                        <td>{getElementoName(provider.Elemento)}</td>
                        <td>{provider["Descripcion corta"] || ''}</td>
                        <td className="text-center columna-cantidad">{cantidad}</td>
                        <td>{provider["Precio"] !== undefined ? Number(provider["Precio"]).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }) : ''}</td>
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

          <div className="mt-4">
            <h5>Resumen de la Inversión en Kits</h5>
            {groupedRubros.length > 0 ? (
              <table className="table tabla-moderna">
                <thead>
                  <tr>
                    <th>Rubro</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRubros.map((record) => (
                    <tr key={record.rubro}>
                      <td>{record.rubro}</td>
                      <td>{record.totalFormateado}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{totalInversion}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'red', fontWeight: 'bold' }}>Valor asignado</td>
                    <td style={{ color: 'red', fontWeight: 'bold' }}>
                      {priorizacionCapitalizacion === null || priorizacionCapitalizacion === undefined || priorizacionCapitalizacion === ''
                        ? 'Sin asignación de priorización'
                        : priorizacionCapitalizacion === 'Víctima del conflicto armado'
                        ? '$ 900.000'
                        : priorizacionCapitalizacion === 'MyPyme/Emprendimiento'
                        ? '$ 3.000.000'
                        : 'Sin asignación de priorización'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p>No hay kits seleccionados para inversión.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

FormulacionKitTab.propTypes = {
  id: PropTypes.string.isRequired,
}; 