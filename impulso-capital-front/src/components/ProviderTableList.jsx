import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './css/UsersList.css'; // Ajusta la ruta si es necesario
import './css/DynamicTableList.css'; // Para estilos similares a PiTableList
import config from '../config';
import { FaSearch } from 'react-icons/fa';

export default function ProviderTableList() {
  // Estados y variables
  const [tables, setTables] = useState([]); // Tablas disponibles
  const [selectedTable, setSelectedTable] = useState(''); // Tabla seleccionada
  const [isPrimaryTable, setIsPrimaryTable] = useState(false); // Si la tabla es principal
  const [records, setRecords] = useState([]); // Registros de la tabla
  const [columns, setColumns] = useState([]); // Columnas de la tabla
  const [fieldsData, setFieldsData] = useState([]); // Información completa de los campos
  const [visibleColumns, setVisibleColumns] = useState([]); // Columnas a mostrar
  const [loading, setLoading] = useState(false); // Estado de carga
  const [error, setError] = useState(null); // Estado de error
  const [search, setSearch] = useState(''); // Búsqueda
  const [showSearchBar, setShowSearchBar] = useState(false); // Mostrar barra de búsqueda

  const [selectedRecords, setSelectedRecords] = useState([]); // Registros seleccionados
  const [multiSelectFields, setMultiSelectFields] = useState([]); // Campos de clave foránea
  const [bulkUpdateData, setBulkUpdateData] = useState({}); // Datos para actualización masiva
  const [fieldOptions, setFieldOptions] = useState({}); // Opciones para campos de clave foránea

  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    elemento: '',
    ejecutivo: ''
  });

  // Columnas fijas que queremos mostrar
  const defaultColumns = [
    'Elemento',
    'Nombre Proveedor',
    'Ejecutivo de cuenta',
    'Precio',
    'Calificacion'
  ];

  const navigate = useNavigate();

  // Claves únicas para evitar conflictos entre módulos
  const LOCAL_STORAGE_TABLE_KEY = 'providerSelectedTable'; // Clave única para tablas en providers
  const LOCAL_STORAGE_COLUMNS_KEY = 'providerVisibleColumns'; // Clave única para columnas visibles
  const LOCAL_STORAGE_SEARCH_KEY = 'providerSearchQuery'; // Clave única para búsqueda

  // Función para obtener columnas y registros de la tabla seleccionada
  const fetchTableData = async (tableName, savedVisibleColumns = null) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      // Obtener campos con información completa
      const fieldsResponse = await axios.get(
        `${config.urls.tables}/${tableName}/fields`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            tableType: 'provider',
            includeRelations: true
          }
        }
      );

      const fetchedColumns = fieldsResponse.data.map((column) => column.column_name);
      setColumns(fetchedColumns);
      setFieldsData(fieldsResponse.data);

      // Identificar campos de selección múltiple (claves foráneas)
      const multiSelectFieldsArray = fieldsResponse.data
        .filter((column) => column.constraint_type === 'FOREIGN KEY')
        .map((column) => column.column_name);

      setMultiSelectFields(multiSelectFieldsArray);

      // Si hay columnas visibles guardadas en localStorage, úsalas; si no, muestra todas las columnas por defecto
      const localVisibleColumns =
        savedVisibleColumns || JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY)) || [];
      if (localVisibleColumns.length > 0) {
        setVisibleColumns(localVisibleColumns);
      } else {
        setVisibleColumns(fetchedColumns);
      }

      // Obtener registros
      const recordsResponse = await axios.get(
        `${config.urls.tables}/${tableName}/records`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            tableType: 'provider'
          }
        }
      );

      // Cargar las opciones de los campos foráneos antes de mostrar los registros
      if (multiSelectFieldsArray.length > 0) {
        const options = {};
        for (const field of multiSelectFieldsArray) {
          const fieldData = fieldsResponse.data.find(f => f.column_name === field);
          if (!fieldData || !fieldData.foreign_table_name) {
            continue;
          }

          const relatedTableResponse = await axios.get(
            `${config.urls.tables}/${fieldData.foreign_table_name}/records`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: {
                tableType: 'provider'
              }
            }
          );

          const labelField = fieldData.foreign_column || 
                           (relatedTableResponse.data[0] && 
                            Object.keys(relatedTableResponse.data[0]).find(key => 
                              key === field ||
                              key.toLowerCase().includes('nombre') || 
                              key.toLowerCase().includes('descripcion')
                            ));

          if (!labelField) {
            continue;
          }

          options[field] = relatedTableResponse.data.map(record => ({
            value: record.id,
            label: record[labelField] || record.id
          }));
        }
        setFieldOptions(options);
      }

      setRecords(recordsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error en fetchTableData:', error);
      setError('Error obteniendo los registros');
      setLoading(false);
    }
  };

  // Cargar las tablas y los filtros guardados desde el localStorage al montar
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(config.urls.tables, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            tableType: 'provider' // Especificamos que estamos trabajando con tablas de proveedores
          }
        });
        setTables(response.data || []); // Asegurar que `tables` es un array

        // Siempre seleccionar 'provider_proveedores' como tabla principal
        setSelectedTable('provider_proveedores');
        fetchTableData('provider_proveedores');
      } catch (error) {
        setError('Error obteniendo las tablas');
      }
    };

    fetchTables();
  }, []);

  // Manejar Select2 con persistencia
  useEffect(() => {
    if (window.$) {
      // Inicializar select2
      window.$('.select2').select2({
        closeOnSelect: false, // No cerrar al seleccionar
        width: '100%',
      });

      // Manejar el cambio en select2 y actualizar el estado y localStorage
      window.$('.select2').on('change', (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions || []).map(
          (option) => option.value
        );
        setVisibleColumns(selectedOptions);
        localStorage.setItem(LOCAL_STORAGE_COLUMNS_KEY, JSON.stringify(selectedOptions));
      });

      // Cargar las columnas visibles guardadas desde el localStorage
      const savedVisibleColumns = JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY));
      if (savedVisibleColumns && savedVisibleColumns.length > 0) {
        window.$('.select2').val(savedVisibleColumns).trigger('change');
      }
    }

    // Cargar la búsqueda persistente
    const savedSearch = localStorage.getItem(LOCAL_STORAGE_SEARCH_KEY);
    if (savedSearch) {
      setSearch(savedSearch);
    }
  }, [columns]);

  // Manejar la selección de tabla
  const handleTableSelect = (e) => {
    const tableName = e.target.value;
    setSelectedTable(tableName);
    localStorage.setItem(LOCAL_STORAGE_TABLE_KEY, tableName); // Guardar tabla seleccionada en el localStorage

    if (tableName) {
      const selectedTableObj = tables.find((table) => table.table_name === tableName);
      setIsPrimaryTable(selectedTableObj?.is_primary || false); // Actualizar estado

      const savedVisibleColumns = JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY));
      fetchTableData(tableName, savedVisibleColumns); // Cargar columnas y registros de la tabla seleccionada
    } else {
      setRecords([]); // Limpiar los registros si no se selecciona ninguna tabla
      setIsPrimaryTable(false);
    }
  };

  // Función para obtener el valor a mostrar en una columna
  const getColumnDisplayValue = (record, column) => {
    if (multiSelectFields.includes(column)) {
      // Es un campo de clave foránea
      const fieldData = fieldsData.find((field) => field.column_name === column);
      const foreignKeyValue = record[column];

      if (!foreignKeyValue) return '';

      // Buscar en las opciones del campo
      if (fieldOptions[column]) {
        const option = fieldOptions[column].find(
          (opt) => String(opt.value) === String(foreignKeyValue)
        );
        if (option) {
          return option.label;
        }
      }

      return foreignKeyValue;
    } else {
      return record[column] || '';
    }
  };

  // Aplicar filtros a los registros
  const filteredRecords = records.filter(record => {
    const matchesSearch = !filters.search || 
      (getColumnDisplayValue(record, 'Nit/cedula')?.toString().toLowerCase().includes(filters.search.toLowerCase()) ||
       getColumnDisplayValue(record, 'Nombre Proveedor')?.toString().toLowerCase().includes(filters.search.toLowerCase()));
    
    const matchesElemento = !filters.elemento || 
      getColumnDisplayValue(record, 'Elemento') === filters.elemento;
    
    const matchesEjecutivo = !filters.ejecutivo || 
      getColumnDisplayValue(record, 'Ejecutivo de cuenta') === filters.ejecutivo;

    return matchesSearch && matchesElemento && matchesEjecutivo;
  });

  // Calcular paginación
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Obtener opciones únicas para los filtros
  const getUniqueOptions = (field) => {
    const options = new Set();
    records.forEach(record => {
      const value = getColumnDisplayValue(record, field);
      if (value) options.add(value);
    });
    return Array.from(options).sort();
  };

  // Función para limpiar filtros y mostrar todos los registros
  const clearFilters = () => {
    setVisibleColumns(columns); // Mostrar todas las columnas disponibles
    setSearch(''); // Limpiar búsqueda
    localStorage.removeItem(LOCAL_STORAGE_COLUMNS_KEY); // Limpiar filtros persistentes
    localStorage.removeItem(LOCAL_STORAGE_SEARCH_KEY); // Limpiar búsqueda persistente
    setSelectedTable('provider_proveedores'); // Seleccionar siempre la tabla principal
    fetchTableData('provider_proveedores'); // Recargar los datos de la tabla principal
  };

  // Manejar el cambio en la búsqueda
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    localStorage.setItem(LOCAL_STORAGE_SEARCH_KEY, e.target.value); // Guardar búsqueda en el localStorage
  };

  // Manejar cambios en los checkboxes
  const handleCheckboxChange = (recordId) => {
    setSelectedRecords((prevSelected) => {
      if (prevSelected.includes(recordId)) {
        return prevSelected.filter((id) => id !== recordId);
      } else {
        return [...prevSelected, recordId];
      }
    });
  };

  // Manejar selección de todos los registros
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allRecordIds = filteredRecords.map((record) => record.id);
      setSelectedRecords(allRecordIds);
    } else {
      setSelectedRecords([]);
    }
  };

  // Manejar cambios en los campos de actualización masiva
  const handleBulkUpdateChange = (field, value) => {
    setBulkUpdateData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  // Aplicar actualización masiva
  const applyBulkUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${config.urls.tables}/${selectedTable}/bulk-update`,
        {
          recordIds: selectedRecords,
          updates: bulkUpdateData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            tableType: 'provider' // Especificamos que estamos trabajando con tablas de proveedores
          }
        }
      );
      alert('Registros actualizados con éxito');
      // Recargar los registros después de la actualización
      fetchTableData(selectedTable);
      // Limpiar la selección
      setSelectedRecords([]);
      setBulkUpdateData({});
    } catch (error) {
      setError('Error actualizando los registros');
    }
  };

  // Eliminar el useEffect que carga las opciones ya que ahora se cargan junto con los registros
  useEffect(() => {
    if (multiSelectFields.length > 0 && selectedTable && fieldsData.length > 0) {
      setFieldOptions({});
    }
  }, [multiSelectFields, selectedTable, fieldsData]);

  // Calcular rango de registros mostrados
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, filteredRecords.length);

  // Función para formatear a moneda colombiana
  const formatCurrency = (value) => {
    if (value === undefined || value === null || value === '') return '';
    const number = Number(value);
    if (isNaN(number)) return value;
    return number.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  };

  // Render de la tabla estilo PiTableList
  return (
    <div className="content-wrapper" style={{ paddingTop: 0, marginTop: 53 }}>
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"></div>
          </div>
        </div>
      </section>
      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="card">
                <div className="card-body">
                  {/* Buscador y selector de cantidad de registros */}
                  <div className="row mb-3">
                    <div className="col-md-6" style={{ position: 'relative' }}>
                      <i className="fas fa-search" style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#6c757d', fontSize: 16 }}></i>
                      <input
                        type="text"
                        className="form-control buscador-input"
                        style={{ color: '#000', paddingLeft: 40, width: '538px' }}
                        placeholder="Buscar por NIT o Nombre de proveedor"
                        value={filters.search}
                        onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      />
                      <style>{`.buscador-input::placeholder { color: #6c757d !important; opacity: 1; }`}</style>
                    </div>
                    <div className="col-md-6 d-flex justify-content-end align-items-center">
                      <span style={{ marginRight: 8, color: '#6c757d', fontWeight: 500 }}>Mostrando</span>
                      <select
                        className="form-control"
                        style={{ width: 80, display: 'inline-block', marginRight: 8 }}
                        value={recordsPerPage}
                        onChange={e => {
                          setRecordsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span style={{ color: '#6c757d', fontWeight: 500 }}>Registros</span>
                    </div>
                  </div>
                  {/* Filtros alineados horizontalmente */}
                  <div className="row mb-3">
                    <div className="col-sm-6">
                      <select className="form-control" value={filters.elemento} onChange={e => setFilters(prev => ({ ...prev, elemento: e.target.value }))}>
                        <option value="">Todos los Elementos</option>
                        {getUniqueOptions('Elemento').map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-sm-6">
                      <select className="form-control" value={filters.ejecutivo} onChange={e => setFilters(prev => ({ ...prev, ejecutivo: e.target.value }))}>
                        <option value="">Todos los Ejecutivos</option>
                        {getUniqueOptions('Ejecutivo de cuenta').map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Tabla tipo PiTableList */}
                  <div className="table-responsive">
                    <table className="table table-hover text-nowrap minimal-table" style={{ tableLayout: 'fixed', width: 'auto', minWidth: '900px', borderCollapse: 'separate', borderSpacing: 0 }}>
                      <thead>
                        <tr>
                          {defaultColumns.map((column) => (
                            <th key={column} style={{
                              textAlign: column === 'Nombre Proveedor' ? 'left' : 'center',
                              verticalAlign: 'middle',
                              width: column === 'Nombre Proveedor' ? '300px' : column === 'Elemento' ? '200px' : column === 'Ejecutivo de cuenta' ? '177px' : 'auto',
                              minWidth: column === 'Nombre Proveedor' ? '300px' : column === 'Elemento' ? '200px' : column === 'Ejecutivo de cuenta' ? '177px' : 'auto',
                              maxWidth: column === 'Nombre Proveedor' ? '300px' : column === 'Elemento' ? '200px' : column === 'Ejecutivo de cuenta' ? '177px' : 'auto',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>{column}</th>
                          ))}
                          <th style={{ textAlign: 'center', verticalAlign: 'middle', width: '120px' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={defaultColumns.length + 1} className="text-center">Cargando...</td></tr>
                        ) : paginatedRecords.length === 0 ? (
                          <tr><td colSpan={defaultColumns.length + 1} className="text-center">No hay registros que coincidan con los filtros</td></tr>
                        ) : (
                          paginatedRecords.map((record, index) => (
                            <tr key={record.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                              {/* Elemento */}
                              <td style={{ verticalAlign: 'middle', fontSize: 15, textAlign: 'left' }}>{getColumnDisplayValue(record, 'Elemento')}</td>
                              {/* Nombre Proveedor + NIT/CC debajo */}
                              <td style={{ verticalAlign: 'middle', fontWeight: 700, fontSize: 16, color: '#222', textAlign: 'left', width: '300px', minWidth: '300px', maxWidth: '300px', overflow: 'hidden' }}>
                                {getColumnDisplayValue(record, 'Nombre Proveedor')}
                                <div style={{ fontWeight: 400, fontSize: 14, color: '#757575', marginTop: 2 }}>
                                  {record['Correo'] && <span><i className="fas fa-envelope" style={{ marginRight: 4 }}></i>{record['Correo']}</span>}
                                  {record['Correo'] && record['Nit/cedula'] && <span style={{ margin: '0 6px' }}>|</span>}
                                  {record['Nit/cedula'] && <span>NIT/CC: {record['Nit/cedula']}</span>}
                                </div>
                              </td>
                              {/* Ejecutivo de cuenta */}
                              <td style={{ verticalAlign: 'middle', fontSize: 15, textAlign: 'center' }}>{getColumnDisplayValue(record, 'Ejecutivo de cuenta')}</td>
                              {/* Precio */}
                              <td style={{ verticalAlign: 'middle', fontSize: 15, textAlign: 'center' }}>{formatCurrency(getColumnDisplayValue(record, 'Precio'))}</td>
                              {/* Calificación */}
                              <td style={{ verticalAlign: 'middle', fontSize: 15, textAlign: 'center' }}>{getColumnDisplayValue(record, 'Calificacion')}</td>
                              {/* Acciones */}
                              <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <button
                                  className="btn btn-sm btn-primary"
                                  style={{ borderRadius: 6, fontWeight: 600, fontSize: 15, padding: '6px 18px' }}
                                  onClick={() => navigate(`/table/${selectedTable}/record/${record.id}`)}
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Paginador avanzado */}
                  {totalPages > 1 && (
                    <div className="d-flex flex-column align-items-center mt-3">
                      <div className="align-self-start mb-2" style={{ color: '#6c757d' }}>
                        Mostrando {startRecord} a {endRecord} de {filteredRecords.length} registros
                      </div>
                      <nav>
                        <ul className="pagination mb-0">
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}> 
                            <button className="page-link" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>&laquo;</button>
                          </li>
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}> 
                            <button className="page-link" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>&lsaquo;</button>
                          </li>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
                              <button className="page-link" onClick={() => setCurrentPage(page)}>{page}</button>
                            </li>
                          ))}
                          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}> 
                            <button className="page-link" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>&rsaquo;</button>
                          </li>
                          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}> 
                            <button className="page-link" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>&raquo;</button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                  {/* Botón para limpiar filtros */}
                  {/*
                  <div className="mt-3">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setSearch('');
                        fetchTableData();
                      }}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                  */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
