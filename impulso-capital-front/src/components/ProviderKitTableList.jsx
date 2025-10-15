import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './css/UsersList.css'; // Ajusta la ruta si es necesario
import './css/DynamicTableList.css'; // Para estilos similares a PiTableList
import './css/ProviderKitTableList.css'; // Estilos para texto formateado
import config from '../config';
import { FaSearch } from 'react-icons/fa';

// Función helper para formatear texto con saltos de línea y viñetas
const formatTextWithLineBreaks = (text) => {
  if (!text) return '';
  
  // Dividir por saltos de línea
  const lines = text.split('\n');
  
  return (
    <div className="formatted-text-cell">
      {lines.map((line, index) => {
        // Si la línea empieza con "-", convertirla en viñeta
        if (line.trim().startsWith('-')) {
          return (
            <div key={index} className="text-line">
              <span className="bullet-point">•</span>
              {line.trim().substring(1).trim()}
            </div>
          );
        }
        // Si la línea no está vacía, mostrarla normal
        else if (line.trim()) {
          return (
            <div key={index} className="text-line">
              {line.trim()}
            </div>
          );
        }
        // Si la línea está vacía, agregar un espacio
        else {
          return <div key={index} className="empty-line"></div>;
        }
      })}
    </div>
  );
};

export default function ProviderKitTableList() {
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
  const [selectedRecords, setSelectedRecords] = useState([]); // Registros seleccionados
  const [multiSelectFields, setMultiSelectFields] = useState([]); // Campos de clave foránea
  const [fieldOptions, setFieldOptions] = useState({}); // Opciones para campos de clave foránea

  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    codigoKit: '',
    ejecutivo: ''
  });

  // Columnas fijas que queremos mostrar para kits
  const defaultColumns = [
    'codigoKit',
    'Nombre Proveedor',
    'Ejecutivo de cuenta',
    'Precio',
    'Calificacion'
  ];

  // Mapeo de nombres de columnas para mostrar nombres más amigables
  const columnDisplayNames = {
    'codigoKit': 'Código KIT',
    'Nombre Proveedor': 'Nombre Proveedor',
    'Ejecutivo de cuenta': 'Ejecutivo de cuenta',
    'Precio': 'Precio',
    'Calificacion': 'Calificacion'
  };

  const navigate = useNavigate();

  // Claves únicas para evitar conflictos entre módulos - específicas para kits
  const LOCAL_STORAGE_TABLE_KEY = 'providerKitSelectedTable'; // Clave única para tablas en providers de kits
  const LOCAL_STORAGE_COLUMNS_KEY = 'providerKitVisibleColumns'; // Clave única para columnas visibles
  const LOCAL_STORAGE_SEARCH_KEY = 'providerKitSearchQuery'; // Clave única para búsqueda

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
            tableType: 'provider_kit',
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
        }
      );

      setRecords(recordsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching table data:', error);
      setError(`Error al cargar los datos de la tabla: ${error.response?.data?.message || error.message}`);
      setLoading(false);
    }
  };

  // Función para obtener las tablas disponibles
  const fetchTables = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Siempre seleccionar 'kit_proveedores' como tabla principal
      setSelectedTable('kit_proveedores');
      fetchTableData('kit_proveedores');
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tables:', error);
      setError(`Error al cargar las tablas: ${error.response?.data?.message || error.message}`);
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchTables();
  }, []);

  // Función para obtener el valor de visualización de una columna
  const getColumnDisplayValue = (record, column) => {
    const value = record[column];
    
    if (value === null || value === undefined) {
      return '-';
    }

    // Si es un campo de clave foránea, mostrar el valor relacionado
    const fieldData = fieldsData.find(field => field.column_name === column);
    if (fieldData && fieldData.constraint_type === 'FOREIGN KEY') {
      // Buscar en las opciones del campo
      const options = fieldOptions[column] || [];
      const option = options.find(opt => opt.id === value);
      return option ? option.displayValue : value;
    }

    // Formatear valores monetarios
    if (column.toLowerCase().includes('precio') || column.toLowerCase().includes('valor') || column.toLowerCase().includes('costo')) {
      return formatCurrency(value);
    }

    // Formatear fechas
    if (column.toLowerCase().includes('fecha') || column.toLowerCase().includes('date')) {
      try {
        return new Date(value).toLocaleDateString('es-CO');
      } catch {
        return value;
      }
    }

    return value;
  };

  // Función para obtener opciones únicas de un campo
  const getUniqueOptions = (field) => {
    const values = records.map(record => record[field]).filter(Boolean);
    return [...new Set(values)];
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    setFilters({
      search: '',
      codigoKit: '',
      ejecutivo: ''
    });
  };

  // Función para formatear moneda
  const formatCurrency = (value) => {
    if (!value) return '-';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(numValue);
  };

  // Filtrar registros basado en búsqueda y filtros
  const filteredRecords = records.filter(record => {
    const searchMatch = !filters.search || Object.values(record).some(value =>
      String(value).toLowerCase().includes(filters.search.toLowerCase())
    );

    const codigoKitMatch = !filters.codigoKit || 
      String(record['codigoKit'] || '').toLowerCase().includes(filters.codigoKit.toLowerCase());

    const ejecutivoMatch = !filters.ejecutivo || 
      String(record['Ejecutivo de cuenta'] || '').toLowerCase().includes(filters.ejecutivo.toLowerCase());

    return searchMatch && codigoKitMatch && ejecutivoMatch;
  });

  // Calcular paginación
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Gestión de Proveedores de Kits</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item">
                  <a href="/escritorio">Escritorio</a>
                </li>
                <li className="breadcrumb-item active">Proveedores de Kits</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

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
                      <select className="form-control" value={filters.codigoKit} onChange={e => setFilters(prev => ({ ...prev, codigoKit: e.target.value }))}>
                        <option value="">Todos los Códigos de Kit</option>
                        {getUniqueOptions('codigoKit').map(option => (
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
                               width: column === 'Nombre Proveedor' ? '300px' : column === 'codigoKit' ? '155px' : column === 'Ejecutivo de cuenta' ? '177px' : 'auto',
                               minWidth: column === 'Nombre Proveedor' ? '300px' : column === 'codigoKit' ? '155px' : column === 'Ejecutivo de cuenta' ? '177px' : 'auto',
                               maxWidth: column === 'Nombre Proveedor' ? '300px' : column === 'codigoKit' ? '155px' : column === 'Ejecutivo de cuenta' ? '177px' : 'auto',
                               overflow: 'hidden',
                               textOverflow: 'ellipsis',
                               whiteSpace: 'nowrap'
                             }}>{columnDisplayNames[column]}</th>
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
                               {/* Código Kit */}
                               <td style={{ verticalAlign: 'middle', fontSize: 15, textAlign: 'center' }}>{getColumnDisplayValue(record, 'codigoKit')}</td>
                               {/* Nombre Proveedor */}
                               <td style={{ verticalAlign: 'middle', fontSize: 15, textAlign: 'left' }}>{getColumnDisplayValue(record, 'Nombre Proveedor')}</td>
                               {/* Ejecutivo de cuenta */}
                               <td style={{ verticalAlign: 'middle', fontSize: 15, textAlign: 'center' }}>{getColumnDisplayValue(record, 'Ejecutivo de cuenta')}</td>
                               {/* Precio */}
                               <td style={{ verticalAlign: 'middle', fontSize: 15, textAlign: 'center' }}>{formatCurrency(getColumnDisplayValue(record, 'Precio'))}</td>
                               {/* Calificacion */}
                               <td style={{ verticalAlign: 'middle', fontSize: 15, textAlign: 'center' }}>{getColumnDisplayValue(record, 'Calificacion')}</td>
                                                               {/* Acciones */}
                                <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                  <button 
                                    className="btn btn-sm btn-primary mr-1"
                                    style={{ borderRadius: 6, fontWeight: 600, fontSize: 15, padding: '6px 18px' }}
                                    onClick={() => navigate(`/table/${selectedTable}/record/${record.id}`)}
                                  >
                                    Editar
                                  </button>
                                  <button className="btn btn-sm btn-danger">Eliminar</button>
                                </td>
                             </tr>
                           ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Paginación */}
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
                      <span className="text-muted">
                        Mostrando {startIndex + 1} a {Math.min(endIndex, filteredRecords.length)} de {filteredRecords.length} registros
                      </span>
                    </div>
                    <nav>
                      <ul className="pagination mb-0">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            Anterior
                          </button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Siguiente
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 