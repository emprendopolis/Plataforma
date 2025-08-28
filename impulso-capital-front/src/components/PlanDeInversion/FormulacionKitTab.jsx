import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

// Función helper para formatear texto con saltos de línea y viñetas
const formatTextWithLineBreaks = (text) => {
  if (!text) return '';
  
  // Dividir por saltos de línea
  const lines = text.split('\n');
  
  return (
    <div style={{ 
      whiteSpace: 'normal', 
      wordWrap: 'break-word', 
      verticalAlign: 'top', 
      padding: '8px',
      width: '100%'
    }}>
      {lines.map((line, index) => {
        // Si la línea empieza con "-", convertirla en viñeta
        if (line.trim().startsWith('-')) {
          return (
            <div key={index} style={{ marginBottom: '4px', lineHeight: '1.4' }}>
              <span style={{ marginRight: '8px', color: '#666', fontWeight: 'bold' }}>•</span>
              {line.trim().substring(1).trim()}
            </div>
          );
        }
        // Si la línea no está vacía, mostrarla normal
        else if (line.trim()) {
          return (
            <div key={index} style={{ marginBottom: '4px', lineHeight: '1.4' }}>
              {line.trim()}
            </div>
          );
        }
        // Si la línea está vacía, agregar un espacio
        else {
          return <div key={index} style={{ height: '4px' }}></div>;
        }
      })}
    </div>
  );
};

export default function FormulacionKitTab({ id }) {
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [codigosKit, setCodigosKit] = useState([]);
  const [selectedCodigoKit, setSelectedCodigoKit] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [piFormulacionRecords, setPiFormulacionRecords] = useState([]);
  // Estado local para cantidades temporales
  const [localCantidades, setLocalCantidades] = useState({});
  const [priorizacionCapitalizacion, setPriorizacionCapitalizacion] = useState(null);
  // Estado específico para operaciones de pre-selección
  const [preSelectionLoading, setPreSelectionLoading] = useState({});

  // 1. Obtener role_id y verificar si es '5' o '3'
  const roleId = localStorage.getItem('role_id');
  const isRole5 = roleId === '5';
  const isRole3 = roleId === '3';

  const tableName = 'kit_proveedores'; // Tabla específica para kits
  const piFormulacionTableName = 'master_formulacion'; // Formulación específica para kits

  const displayedFieldNames = [
    "codigoKit",
    "cantidad_bienes",
    "Calificacion",
    "Nombre proveedor",
    "Valor catalogo",
    "Precio"
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
        
        // Obtener códigos únicos de kit y categorías
        const allRecords = recordsResponse.data;
        const uniqueCodigosKit = [...new Set(allRecords.map(record => record.codigoKit).filter(Boolean))];
        const uniqueCategorias = [...new Set(allRecords.map(record => record.Categoria).filter(Boolean))];
        setCodigosKit(uniqueCodigosKit);
        setCategorias(uniqueCategorias);
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
          ...piRecord, // Esto preserva TODOS los campos incluyendo el 'id'
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

  // Función para refrescar los datos después de operaciones críticas
  const refreshPiFormulacionData = async () => {
    if (id) {
      await fetchPiFormulacionRecords();
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

  const handleCategoriaChange = (e) => {
    setSelectedCategoria(e.target.value);
    setSearchTerm('');
  };

  const getPiFormulacionData = (recordId) => {
    return piFormulacionRecords.find(
      (piRecord) => String(piRecord.rel_id_prov) === String(recordId)
    ) || {};
  };

  // Función para verificar un registro específico en la base de datos
  const checkRecordInDatabase = async (caracterizacionId, relIdProv) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${config.urls.inscriptions.base}/master/tables/${piFormulacionTableName}/records?caracterizacion_id=${caracterizacionId}&rel_id_prov=${relIdProv}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      return null;
    } catch (error) {
      console.error('Error verificando registro en base de datos:', error);
      return null;
    }
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

      let updatedRecord;
      
      if (existingPiData.id) {
        await axios.put(`${endpoint}/${existingPiData.id}`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        updatedRecord = { ...existingPiData, ...recordData };
      } else {
        const res = await axios.post(endpoint, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        updatedRecord = { ...recordData, id: res.data.id };
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

      // Para Seleccion, SOLO actualizar - nunca crear
      if (field === "Seleccion") {
        if (!existingPiData.id) {
          throw new Error("No se puede seleccionar sin registro previo en master_formulacion");
        }
      }

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

      let updatedRecord;
      
      // Lógica mejorada: para Seleccion solo actualizar, nunca crear
      try {
        if (existingPiData.id) {
          // Si ya tenemos ID, actualizar directamente
          await axios.put(`${endpoint}/${existingPiData.id}`, recordData, {
            headers: { Authorization: `Bearer ${token}` },
          });
          updatedRecord = { ...existingPiData, ...recordData };
        } else {
          // Buscar si existe un registro con esta combinación en el estado local
          const existingLocalRecord = piFormulacionRecords.find(
            r => String(r.caracterizacion_id) === String(recordData.caracterizacion_id) && 
                 String(r.rel_id_prov) === String(recordData.rel_id_prov)
          );
          
          if (existingLocalRecord && existingLocalRecord.id) {
            // Existe en estado local, actualizar
            await axios.put(`${endpoint}/${existingLocalRecord.id}`, recordData, {
              headers: { Authorization: `Bearer ${token}` },
            });
            updatedRecord = { ...existingLocalRecord, ...recordData };
          } else if (field === "Seleccion") {
            // Para Seleccion, si no existe el registro, NO crear - solo retornar
            throw new Error("No se puede seleccionar sin registro previo en master_formulacion");
          } else {
            // Para otros campos (como pre-seleccion), crear nuevo registro
            const res = await axios.post(endpoint, recordData, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            // Manejar diferentes formatos de respuesta del servidor
            let newId;
            if (res.data && res.data.id) {
              newId = res.data.id;
            } else if (res.data && res.data.record && res.data.record.id) {
              newId = res.data.record.id;
            } else if (res.data && res.data.insertId) {
              newId = res.data.insertId;
            } else {
              console.error('No se pudo obtener el ID del registro creado. Respuesta:', res.data);
              throw new Error('No se pudo obtener el ID del registro creado');
            }
            
            updatedRecord = { ...recordData, id: newId };
          }
        }
      } catch (error) {
        // Si hay error de duplicado, buscar en el estado local y actualizar
        if (error.response && error.response.status === 500 && error.response.data.error && error.response.data.error.includes('duplicate key')) {
          // Buscar en el estado local si existe un registro con esta combinación
          const existingLocalRecord = piFormulacionRecords.find(
            r => String(r.caracterizacion_id) === String(recordData.caracterizacion_id) && 
                 String(r.rel_id_prov) === String(recordData.rel_id_prov)
          );
          
          if (existingLocalRecord && existingLocalRecord.id) {
            // Actualizar el registro existente
            await axios.put(`${endpoint}/${existingLocalRecord.id}`, recordData, {
              headers: { Authorization: `Bearer ${token}` },
            });
            updatedRecord = { ...existingLocalRecord, ...recordData };
          } else {
            // Si no se encuentra en estado local, re-lanzar el error
            throw error;
          }
        } else {
          throw error; // Re-lanzar otros tipos de error
        }
      }

      // Actualizar el estado local con el registro completo actualizado, excepto para textareas
      if (field !== "Descripcion dimensiones" && field !== "Justificacion") {
        setPiFormulacionRecords(prevRecords => {
          const existingIndex = prevRecords.findIndex(
            prevRecord => String(prevRecord.rel_id_prov) === String(record.id)
          );
          
          if (existingIndex !== -1) {
            // Actualizar registro existente, asegurando que el campo específico se mantenga
            const newRecords = [...prevRecords];
            newRecords[existingIndex] = {
              ...newRecords[existingIndex],
              ...updatedRecord,
              // Asegurar que el campo que se acaba de actualizar mantenga su valor correcto
              [field]: value,
              // Mantener providerData si existe
              providerData: newRecords[existingIndex].providerData || record,
              // Asegurar que los campos booleanos mantengan sus valores correctos
              "pre-seleccion": field === "pre-seleccion" ? value : newRecords[existingIndex]["pre-seleccion"],
              "Seleccion": field === "Seleccion" ? value : newRecords[existingIndex]["Seleccion"]
            };
            return newRecords;
          } else {
            // Agregar nuevo registro con providerData
            const newRecordWithProvider = {
              ...updatedRecord,
              providerData: record
            };
            return [...prevRecords, newRecordWithProvider];
          }
        });
      }

      // Retornar el registro actualizado para que el llamador pueda usarlo
      return updatedRecord;
    } catch (error) {
      console.error('Error al cambiar la aprobación:', error);
      throw error; // Re-lanzar el error para que el manejador del checkbox pueda revertir el estado
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
    
    // Filtrar por categoría si está seleccionada
    if (selectedCategoria) {
      filtered = filtered.filter(record => record.Categoria === selectedCategoria);
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(record => {
        const cantidadBienes = record['cantidad_bienes'] || '';
        return cantidadBienes.toLowerCase().includes(lowercasedFilter);
      });
    }
    
    const sortedRecords = filtered.sort((a, b) => {
      // Ordenar por calificación de mayor a menor
      const calificacionA = parseFloat(a["Calificacion"]) || 0;
      const calificacionB = parseFloat(b["Calificacion"]) || 0;
      return calificacionB - calificacionA;
    });
    return sortedRecords; 
  }, [records, selectedCategoria, searchTerm]);

  return (
    <div>
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

          {/* Campo Categoría */}
          <div className="form-group mt-3">
            <label>Categoría</label>
            <select
              className="form-control"
              value={selectedCategoria}
              onChange={handleCategoriaChange}
              disabled={isRole5 || isRole3}
            >
              <option value="">-- Selecciona una categoría --</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
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

          <table className="table tabla-moderna mt-3" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                {fields.map((field) => (
                  <th
                    key={field.column_name}
                    style={{
                      width: field.column_name === 'codigoKit' ? '100px' : 
                             field.column_name === 'cantidad_bienes' ? '400px' : 
                             field.column_name === 'Calificacion' ? '100px' : 
                             field.column_name === 'Nombre proveedor' ? '200px' : 
                             field.column_name === 'Valor catalogo' ? '150px' : 
                             field.column_name === 'Precio' ? '100px' : 'auto',
                      textAlign: 'center'
                    }}
                  >
                    {field.column_name === 'cantidad_bienes' ? 'Descripción por bien' : 
                     field.column_name === 'codigoKit' ? 'Código Kit' : 
                     field.column_name.replace('_', ' ')}
                  </th>
                ))}
                <th style={{ width: '100px', textAlign: 'center' }}>Cantidad</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Pre-selección</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Selección</th>
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
                            width: field.column_name === 'codigoKit' ? '100px' : 
                                   field.column_name === 'cantidad_bienes' ? '400px' : 
                                   field.column_name === 'Calificacion' ? '100px' : 
                                   field.column_name === 'Nombre proveedor' ? '200px' : 
                                   field.column_name === 'Valor catalogo' ? '150px' : 
                                   field.column_name === 'Precio' ? '100px' : 'auto',
                            textAlign: field.column_name === 'cantidad_bienes' ? 'left' : 'center'
                          }}
                        >
                          {field.column_name === 'cantidad_bienes' 
                            ? formatTextWithLineBreaks(record[field.column_name])
                            : field.column_name === 'Precio'
                            ? (record[field.column_name] !== undefined ? `$ ${Number(record[field.column_name]).toLocaleString('es-CO')}` : '')
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
                            handleCantidadChange(record.id, parseInt(val));
                          }}
                          style={{ width: '60px', MozAppearance: 'textfield', textAlign: 'center' }}
                          className="no-spinner"
                          readOnly={isRole3}
                          disabled={isRole3}
                        />
                      </td>
                      <td style={{ width: '100px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={piData["pre-seleccion"] || false}
                          onChange={async (e) => {
                            const newValue = e.target.checked;
                            const recordId = record.id;
                            
                            // Evitar múltiples operaciones simultáneas en el mismo registro
                            if (preSelectionLoading[recordId]) {
                              return;
                            }
                            
                            // Activar loading específico para este registro
                            setPreSelectionLoading(prev => ({ ...prev, [recordId]: true }));
                            
                            try {
                              // Actualizar inmediatamente el estado local para UI responsiva
                              setPiFormulacionRecords(prevRecords => {
                                const existingIndex = prevRecords.findIndex(
                                  prevRecord => String(prevRecord.rel_id_prov) === String(recordId)
                                );
                                
                                if (existingIndex !== -1) {
                                  // Actualizar registro existente
                                  const newRecords = [...prevRecords];
                                  newRecords[existingIndex] = {
                                    ...newRecords[existingIndex],
                                    "pre-seleccion": newValue
                                  };
                                  return newRecords;
                                } else {
                                  // Si no existe, crear un nuevo registro con providerData
                                  const newRecord = {
                                    rel_id_prov: recordId,
                                    caracterizacion_id: id,
                                    "pre-seleccion": newValue,
                                    "Seleccion": false, // Siempre empezar con selección en false
                                    selectionorder: null,
                                    Cantidad: 1,
                                    user_id: localStorage.getItem('id'),
                                    providerData: record // Incluir los datos del proveedor
                                  };
                                  return [...prevRecords, newRecord];
                                }
                              });
                              
                              // Luego hacer la llamada al servidor
                              const updatedRecord = await handleApprovalChange(record, "pre-seleccion", newValue);
                              
                              // Si se desmarcó la pre-selección, también actualizar la selección
                              if (!newValue) {
                                await handleApprovalChange(record, "Seleccion", false);
                              }
                              
                              // Si se creó un nuevo registro (no tenía ID antes), refrescar los datos
                              if (!piData.id && updatedRecord && updatedRecord.id) {
                                await refreshPiFormulacionData();
                              } else {
                                // Actualizar el estado local con el registro completo de la base de datos
                                setPiFormulacionRecords(prevRecords => {
                                  const existingIndex = prevRecords.findIndex(
                                    prevRecord => String(prevRecord.rel_id_prov) === String(recordId)
                                  );
                                  
                                  if (existingIndex !== -1) {
                                    const newRecords = [...prevRecords];
                                    // Asegurar que el registro tenga el ID correcto de la base de datos
                                    newRecords[existingIndex] = {
                                       ...newRecords[existingIndex],
                                       ...updatedRecord,
                                       "pre-seleccion": newValue,
                                       "Seleccion": newValue ? newRecords[existingIndex]["Seleccion"] : false,
                                       selectionorder: newValue ? newRecords[existingIndex]["selectionorder"] : null
                                     };
                                     return newRecords;
                                   }
                                   return prevRecords;
                                 });
                               }
                             } catch (error) {
                               console.error('Error al actualizar pre-selección:', error);
                               // Si hay error, revertir el estado local
                               setPiFormulacionRecords(prevRecords => {
                                 const existingIndex = prevRecords.findIndex(
                                   prevRecord => String(prevRecord.rel_id_prov) === String(recordId)
                                 );
                                 
                                 if (existingIndex !== -1) {
                                   const newRecords = [...prevRecords];
                                   newRecords[existingIndex] = {
                                     ...newRecords[existingIndex],
                                     "pre-seleccion": !newValue
                                   };
                                   return newRecords;
                                 }
                                 return prevRecords;
                               });
                             } finally {
                               // Desactivar loading específico para este registro
                               setPreSelectionLoading(prev => ({ ...prev, [recordId]: false }));
                             }
                           }}
                          disabled={isRole3 || preSelectionLoading[record.id]}
                          style={{
                            opacity: preSelectionLoading[record.id] ? 0.6 : 1,
                            cursor: preSelectionLoading[record.id] ? 'wait' : 'pointer'
                          }}
                        />
                        {preSelectionLoading[record.id] && (
                          <small className="text-muted ml-1">⏳</small>
                        )}
                      </td>
                                             <td style={{ width: '100px', textAlign: 'center' }}>
                         <input
                           type="checkbox"
                           checked={piData["Seleccion"] || false}
                                                       onChange={async (e) => {
                              const newValue = e.target.checked;
                              
                              // Para Seleccion, verificar que el registro exista en master_formulacion
                              if (!piData.id) {
                                console.log("No se puede seleccionar sin registro previo en master_formulacion");
                                return;
                              }
                              
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
                              
                              // Actualizar inmediatamente el estado local (solo si existe el registro)
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
                                }
                                // Si no existe el registro, no hacer nada (no crear)
                                return prevRecords;
                              });
                              
                              // Luego hacer la llamada al servidor (solo si existe el registro)
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
                            style={{
                              opacity: 1,
                              cursor: 'pointer'
                            }}
                         />
                       </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={fields.length + 3} className="text-center">
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
                    <th style={{ width: '80px', textAlign: 'center' }}>Código Kit</th>
                    <th style={{ width: '300px', textAlign: 'center' }}>Descripción por bien</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Cantidad</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Precio</th>
                    <th style={{ width: '200px', textAlign: 'center' }}>Descripción dimensiones</th>
                    <th style={{ width: '200px', textAlign: 'center' }}>Justificación</th>
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
                        <td style={{ width: '60px', textAlign: 'center' }}>{piRecord.selectionorder || ''}</td>
                        <td style={{ width: '60px', textAlign: 'center' }}>{provider.codigoKit}</td>
                        <td style={{ width: '300px', textAlign: 'left' }}>{formatTextWithLineBreaks(provider.cantidad_bienes)}</td>
                        <td style={{ width: '90px', textAlign: 'center' }}>{cantidad}</td>
                        <td style={{ width: '100px', textAlign: 'center' }}>{precio !== 0 ? `$ ${precio.toLocaleString('es-CO')}` : ''}</td>
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