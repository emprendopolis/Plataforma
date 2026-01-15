import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

export default function FormulacionProvTab({ id, updateTotalInversion }) {
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [selectedRubro, setSelectedRubro] = useState('');
  const [elementos, setElementos] = useState([]);
  const [filteredElementos, setFilteredElementos] = useState([]);
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

  const tableName = 'provider_proveedores';
  const rubroTableName = 'provider_rubro';
  const elementoTableName = 'provider_elemento';
  const piFormulacionTableName = 'pi_formulacion_prov';

  const displayedFieldNames = [
    "Nombre proveedor",
    "Rubro",
    "Elemento",
    "Calificacion",
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

  // Filtrar elementos basándose en la categoría seleccionada
  useEffect(() => {
    if (selectedRubro) {
      // Obtener los elementos únicos que pertenecen a la categoría seleccionada desde provider_proveedores
      const fetchFilteredElementos = async () => {
        try {
          const token = localStorage.getItem('token');
          // Obtener todos los proveedores de la categoría seleccionada
          const proveedoresUrl = `${config.urls.inscriptions.base}/tables/${tableName}/records?Rubro=${selectedRubro}`;
          const response = await axios.get(proveedoresUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          // Extraer elementos únicos de los proveedores
          const elementosUnicos = [...new Set(response.data.map(proveedor => proveedor.Elemento))];
          
          // Obtener los detalles completos de los elementos únicos
          const elementosDetallados = elementosUnicos.map(elementoId => {
            const elemento = elementos.find(el => String(el.id) === String(elementoId));
            return elemento || { id: elementoId, Elemento: 'Desconocido' };
          });
          
          setFilteredElementos(elementosDetallados);
        } catch (error) {
          console.error('Error obteniendo elementos filtrados:', error);
          setFilteredElementos([]);
        }
      };
      fetchFilteredElementos();
    } else {
      setFilteredElementos([]);
    }
  }, [selectedRubro, elementos]);

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
      console.error('Error obteniendo los registros de pi_formulacion:', error);
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

  // Función para obtener el límite de inversión según el grupo
  const getLimiteInversion = () => {
    if (priorizacionCapitalizacion === 'Grupo 3') {
      return 3277714; // 3.277.714
    } else if (priorizacionCapitalizacion === 'Grupo 2') {
      return 3000000; // 3.000.000
    }
    // Por defecto, usar el límite del Grupo 2
    return 3000000;
  };

  // Función para obtener el límite formateado según el grupo
  const getLimiteInversionFormateado = () => {
    if (priorizacionCapitalizacion === 'Grupo 3') {
      return '$ 3.277.714';
    } else if (priorizacionCapitalizacion === 'Grupo 2') {
      return '$ 3.000.000';
    }
    return '$ 3.000.000';
  };

  const handleRubroChange = (e) => {
    setSelectedRubro(e.target.value);
    setSelectedElemento('');
    setSearchTerm('');
    // Limpiar elementos filtrados cuando se cambia la categoría
    setFilteredElementos([]);
  };

  const handleElementoChange = (e) => {
    setSelectedElemento(e.target.value);
    setSearchTerm('');
  };

  const getElementoName = (elementoId) => {
    // Buscar primero en elementos filtrados, luego en todos los elementos
    const elemento = filteredElementos.find((el) => String(el.id) === String(elementoId)) || 
                    elementos.find((el) => String(el.id) === String(elementoId));
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
            // Revertimos el checkbox en interfaz
            setPiFormulacionRecords(prevRecords => {
              return prevRecords.map(prevRecord => {
                if (String(prevRecord.rel_id_prov) === String(record.id)) {
                  return {
                    ...prevRecord,
                    "Seleccion": false
                  };
                }
                return prevRecord;
              });
            });
            return;
          }
          recordData.selectionorder = freeOrder;
        } else {
          recordData.selectionorder = null;
        }
      }

      const endpoint = `${config.urls.inscriptions.base}/pi/tables/${piFormulacionTableName}/record`;

      console.log('Enviando recordData:', recordData);

      let updatedRecord;
      
      if (existingPiData.id) {
        await axios.put(`${endpoint}/${existingPiData.id}`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        updatedRecord = { ...existingPiData, ...recordData };
      } else {
        console.log('Enviando recordData (POST):', recordData);
        const res = await axios.post(endpoint, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        updatedRecord = { ...recordData, id: res.data.id };
      }

      // Actualizar el estado local con el registro completo actualizado
      setPiFormulacionRecords(prevRecords => {
        const existingIndex = prevRecords.findIndex(
          prevRecord => String(prevRecord.rel_id_prov) === String(record.id)
        );
        
        if (existingIndex !== -1) {
          // Actualizar registro existente
          const newRecords = [...prevRecords];
          newRecords[existingIndex] = {
            ...newRecords[existingIndex],
            ...updatedRecord
          };
          return newRecords;
        } else {
          // Agregar nuevo registro
          return [...prevRecords, updatedRecord];
        }
      });
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
          const precio = parseFloat(provider["Precio"]) || 0;
          const cantidad = parseFloat(piRecord.Cantidad) || 1;
          const totalPrice = precio * cantidad;

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

  const totalInversionNumerico = useMemo(() => {
    return groupedRubros
      .reduce((acc, record) => acc + parseFloat(record.total || 0), 0);
  }, [groupedRubros]);

  // Actualizar el total de inversión en el componente padre
  useEffect(() => {
    if (updateTotalInversion) {
      updateTotalInversion(totalInversionNumerico);
    }
  }, [totalInversionNumerico, updateTotalInversion]);

  const totalInversion = useMemo(() => {
    return totalInversionNumerico
      .toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
  }, [totalInversionNumerico]);

  const selectedRecords = useMemo(() => {
    const filtered = piFormulacionRecords.filter((piRecord) => piRecord["Seleccion"]);
    
    // Ordenar los seleccionados por selectionorder
    return filtered.sort((a, b) => {
      const orderA = a.selectionorder || Infinity;
      const orderB = b.selectionorder || Infinity;
      return orderA - orderB;
    });
  }, [piFormulacionRecords]);

  const filteredRecords = useMemo(() => {
    let filtered = records;
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(record => {
        const descripcionCorta = record['Descripcion corta'] || '';
        return descripcionCorta.toLowerCase().includes(lowercasedFilter);
      });
    }
    const sortedRecords = filtered.sort((a, b) => {
      // Ordenar primero por calificación de mayor a menor
      const calificacionA = parseFloat(a["Calificacion"]) || 0;
      const calificacionB = parseFloat(b["Calificacion"]) || 0;
      
      if (calificacionB !== calificacionA) {
        return calificacionB - calificacionA;
      }
      
      // Si tienen la misma calificación, ordenar por puntuación de evaluación
      const puntuacionA = parseFloat(a["Puntuacion evaluacion"]) || 0;
      const puntuacionB = parseFloat(b["Puntuacion evaluacion"]) || 0;
      return puntuacionB - puntuacionA;
    });
    return sortedRecords; 
  }, [records, searchTerm]);

  return (
    <div>
      {/* <h3>Formulación con Proveedores</h3> */}
      {loading ? (
        <p>Cargando datos...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          {/* 2. Deshabilitar selector de Categoría si es role 5 */}
          <div className="form-group">
            <label>Categoría</label>
            <select
              className="form-control"
              value={selectedRubro}
              onChange={handleRubroChange}
              disabled={isRole5 || isRole3}
            >
              <option value="">-- Selecciona una categoría --</option>
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
              {filteredElementos.map((elemento) => (
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

                      <table className="table tabla-moderna mt-3" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  {fields.map((field) => (
                    <th
                      key={field.column_name}
                      style={{
                        width: field.column_name === 'Precio' ? '120px' : 
                               field.column_name === 'Rubro' ? '100px' : 
                               field.column_name === 'Elemento' ? '120px' : 
                               field.column_name === 'Calificacion' ? '100px' : 
                               field.column_name === 'Nombre proveedor' ? '200px' : 
                               field.column_name === 'Descripcion corta' ? '300px' : 
                               field.column_name === 'Valor catalogo' ? '150px' : 
                               field.column_name === 'Puntuacion evaluacion' ? '120px' : 'auto',
                        textAlign: 'center'
                      }}
                    >
                                             {field.column_name === 'Rubro' ? 'Categoría' : field.column_name.replace('_', ' ')}
                    </th>
                  ))}
                  <th style={{ width: '100px', textAlign: 'center' }}>Cantidad</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Pre-selección</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Selección</th>
                  {/* <th>Aprobación Comité</th> */}
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
                          style={{
                            width: field.column_name === 'Precio' ? '120px' : 
                                   field.column_name === 'Rubro' ? '100px' : 
                                   field.column_name === 'Elemento' ? '120px' : 
                                   field.column_name === 'Calificacion' ? '100px' : 
                                   field.column_name === 'Nombre proveedor' ? '200px' : 
                                   field.column_name === 'Descripcion corta' ? '300px' : 
                                   field.column_name === 'Valor catalogo' ? '150px' : 
                                   field.column_name === 'Puntuacion evaluacion' ? '120px' : 'auto',
                            textAlign: 'center'
                          }}
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
                      <td style={{ width: '100px', textAlign: 'center' }}>
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
                      <td style={{ width: '120px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={piData["pre-Seleccion"] || false}
                          onChange={async (e) => {
                            const newValue = e.target.checked;
                            
                            // Actualizar inmediatamente el estado local
                            setPiFormulacionRecords(prevRecords => {
                              const existingIndex = prevRecords.findIndex(
                                prevRecord => String(prevRecord.rel_id_prov) === String(record.id)
                              );
                              
                              if (existingIndex !== -1) {
                                const newRecords = [...prevRecords];
                                newRecords[existingIndex] = {
                                  ...newRecords[existingIndex],
                                  "pre-Seleccion": newValue
                                };
                                return newRecords;
                              } else {
                                // Si no existe, crear un nuevo registro con providerData
                                const newRecord = {
                                  rel_id_prov: record.id,
                                  caracterizacion_id: id,
                                  "pre-Seleccion": newValue,
                                  Cantidad: 1,
                                  user_id: localStorage.getItem('id'),
                                  providerData: record // Incluir los datos del proveedor
                                };
                                return [...prevRecords, newRecord];
                              }
                            });
                            
                            // Luego hacer la llamada al servidor
                            try {
                              await handleApprovalChange(record, "pre-Seleccion", newValue);
                            } catch (error) {
                              console.error('Error al actualizar pre-selección:', error);
                              // Si hay error, revertir el estado local
                              setPiFormulacionRecords(prevRecords => {
                                const existingIndex = prevRecords.findIndex(
                                  prevRecord => String(prevRecord.rel_id_prov) === String(record.id)
                                );
                                
                                if (existingIndex !== -1) {
                                  const newRecords = [...prevRecords];
                                  newRecords[existingIndex] = {
                                    ...newRecords[existingIndex],
                                    "pre-Seleccion": !newValue
                                  };
                                  return newRecords;
                                }
                                return prevRecords;
                              });
                            }
                          }}
                          disabled={isRole3}
                        />
                      </td>
                      <td style={{ width: '120px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={piData["Seleccion"] || false}
                          onChange={async (e) => {
                            const newValue = e.target.checked;
                            
                            // Calcular el selectionorder si se está seleccionando
                            let selectionorder = null;
                            if (newValue === true) {
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
                                return; // No hacer nada si no hay espacio
                              }
                              selectionorder = freeOrder;
                            } else {
                              // Si se está deseleccionando, liberar el selectionorder
                              selectionorder = null;
                            }
                            
                            // Actualizar inmediatamente el estado local
                            setPiFormulacionRecords(prevRecords => {
                              const existingIndex = prevRecords.findIndex(
                                prevRecord => String(prevRecord.rel_id_prov) === String(record.id)
                              );
                              
                              if (existingIndex !== -1) {
                                const newRecords = [...prevRecords];
                                newRecords[existingIndex] = {
                                  ...newRecords[existingIndex],
                                  "Seleccion": newValue,
                                  selectionorder: selectionorder
                                };
                                return newRecords;
                              } else {
                                // Si no existe, crear un nuevo registro con providerData
                                const newRecord = {
                                  rel_id_prov: record.id,
                                  caracterizacion_id: id,
                                  "Seleccion": newValue,
                                  Cantidad: 1,
                                  user_id: localStorage.getItem('id'),
                                  selectionorder: selectionorder,
                                  providerData: record // Incluir los datos del proveedor
                                };
                                return [...prevRecords, newRecord];
                              }
                            });
                            
                            // Luego hacer la llamada al servidor
                            try {
                              await handleApprovalChange(record, "Seleccion", newValue);
                            } catch (error) {
                              console.error('Error al actualizar selección:', error);
                              // Si hay error, revertir el estado local
                              setPiFormulacionRecords(prevRecords => {
                                const existingIndex = prevRecords.findIndex(
                                  prevRecord => String(prevRecord.rel_id_prov) === String(record.id)
                                );
                                
                                if (existingIndex !== -1) {
                                  const newRecords = [...prevRecords];
                                  newRecords[existingIndex] = {
                                    ...newRecords[existingIndex],
                                    "Seleccion": !newValue,
                                    selectionorder: null
                                  };
                                  return newRecords;
                                }
                                return prevRecords;
                              });
                            }
                          }}
                          disabled={isRole3}
                        />
                      </td>
                      {/* <td>
                        <input
                          type="checkbox"
                          checked={piData["Aprobación comité"] || false}
                          onChange={(e) =>
                            handleApprovalChange(
                              record,
                              "Aprobación comité",
                              e.target.checked
                            )
                          }
                          disabled={isRole3}
                        />
                      </td> */}
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
            <h5>Productos Seleccionados</h5>
            {selectedRecords.length > 0 ? (
              <table className="table tabla-moderna" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'center' }}>Prioridad</th>
                    {/* <th>Nombre proveedor</th> */}
                    {/* <th>Categoría</th> */}
                    <th style={{ width: '120px', textAlign: 'center' }}>Elemento</th>
                    <th style={{ width: '200px', textAlign: 'center' }}>Descripción</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Cantidad</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Precio Proveedor</th>
                    <th style={{ width: '200px', textAlign: 'center' }}>Descripción dimensiones</th>
                    <th style={{ width: '200px', textAlign: 'center' }}>Justificación</th>
                    {/* <th>Total</th> */}
                  </tr>
                </thead>
                <tbody>
                  {selectedRecords.map((piRecord) => {
                    const provider = piRecord.providerData;
                    if (!provider) {
                      return null;
                    }

                    const cantidad = parseFloat(piRecord.Cantidad) || 1;
                    const precioCatalogo = parseFloat(provider["Valor Catalogo y/o referencia"]) || 0;
                    const total = (precioCatalogo * cantidad);
                    const precioFormateado = precioCatalogo.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
                    const totalFormateado = total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

                    return (
                      <tr key={piRecord.rel_id_prov}>
                        <td style={{ width: '80px', textAlign: 'center' }}>{piRecord.selectionorder || ''}</td>
                        {/* <td>{provider["Nombre Proveedor"]}</td> */}
                        {/* <td>{getRubroName(provider.Rubro)}</td> */}
                        <td style={{ width: '120px', textAlign: 'center' }}>{getElementoName(provider.Elemento)}</td>
                        <td style={{ width: '200px', textAlign: 'center' }}>{provider["Descripcion corta"] || ''}</td>
                        <td style={{ width: '100px', textAlign: 'center' }}>{cantidad}</td>
                        <td style={{ width: '150px', textAlign: 'center' }}>{provider["Precio"] !== undefined ? Number(provider["Precio"]).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }) : ''}</td>
                        <td style={{ width: '200px', textAlign: 'center' }}>
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
                        <td style={{ width: '200px', textAlign: 'center' }}>
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
                        {/* <td>{totalFormateado}</td> */}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p>No hay productos seleccionados.</p>
            )}
          </div>

          {/* Validación del total de inversión */}
          {totalInversionNumerico > getLimiteInversion() && (
            <div className="mt-3">
              <p style={{ color: 'red', fontWeight: 'bold', fontSize: '16px' }}>
                Los bienes seleccionados deben sumar una totalidad menor a {getLimiteInversionFormateado()}
              </p>
            </div>
          )}

          <div className="mt-4">
            <h5>Resumen de la Inversión</h5>
            {groupedRubros.length > 0 ? (
              <table className="table tabla-moderna">
                <thead>
                  <tr>
                    <th>Categoría</th>
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
                        : priorizacionCapitalizacion === 'Grupo 2'
                        ? '$ 3.000.000'
                        : priorizacionCapitalizacion === 'Grupo 3'
                        ? '$ 3.277.714'
                        : priorizacionCapitalizacion === 'Grupo 1'
                        ? 'Entrega de Kit'
                        : 'Sin asignación de priorización'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p>No hay productos seleccionados para inversión.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

FormulacionProvTab.propTypes = {
  id: PropTypes.string.isRequired,
  updateTotalInversion: PropTypes.func,
}; 