// PiTableList.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './css/UsersList.css';
import './css/DynamicTableList.css'; // Importar los nuevos estilos
import config from '../config';

export default function PiTableList() {
  const [records, setRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [fieldsData, setFieldsData] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);

  const [multiSelectFields, setMultiSelectFields] = useState([]);
  const [relatedData, setRelatedData] = useState({}); // Para datos relacionados de claves foráneas

  const [localidades, setLocalidades] = useState([]);
  const [estados, setEstados] = useState([]);
  const [users, setUsers] = useState([]);
  const [grupos, setGrupos] = useState([]);

  const navigate = useNavigate();

  const tableName = 'inscription_caracterizacion';

  // Estado para la cantidad de registros por página
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estado para la página actual
  const [currentPage, setCurrentPage] = useState(1);

  // Funciones para obtener el ID y el role_id del usuario logueado desde el localStorage
  const getLoggedUserId = () => {
    return localStorage.getItem('id') || null;
  };

  const getLoggedUserRoleId = () => {
    return localStorage.getItem('role_id') || null;
  };

  // Función para obtener columnas y registros de la tabla
  const fetchTableData = async (savedVisibleColumns = null) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const loggedUserId = getLoggedUserId();
      const loggedUserRoleId = getLoggedUserRoleId();

      if (!token) {
        navigate('/login');
        return;
      }

      // Obtener campos con información completa
      const fieldsResponse = await axios.get(
        `${config.urls.tables}/${tableName}/fields`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
        savedVisibleColumns || JSON.parse(localStorage.getItem('piVisibleColumns')) || [];
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

      let filteredRecords = recordsResponse.data;

      // Filtrar los registros con Estado == 7
      filteredRecords = filteredRecords.filter((record) => {
        const estadoValue = record.Estado;
        if (estadoValue === undefined || estadoValue === null) {
          return false;
        }
        // Convertir a número o comparar como cadena después de eliminar espacios
        const estadoTrimmed = estadoValue.toString().trim();
        return estadoTrimmed === '7' || parseInt(estadoTrimmed, 10) === 7;
      });

      // === MODIFICACIÓN PRINCIPAL ===
      // Filtrar los registros según el role_id y el asesor (solo si role_id === '4')
      if (loggedUserRoleId === '4' && loggedUserId) {
        filteredRecords = filteredRecords.filter(
          (record) => String(record.Asesor) === String(loggedUserId)
        );
      }

      // Obtener datos relacionados para claves foráneas
      const relatedDataResponse = await axios.get(
        `${config.urls.tables}/${tableName}/related-data`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setRelatedData(relatedDataResponse.data.relatedData || {});
      setRecords(filteredRecords);
      
      // Obtener grupos únicos de los registros
      const gruposUnicos = [...new Set(filteredRecords.map(record => record["Priorizacion capitalizacion"]).filter(Boolean))].sort();
      setGrupos(gruposUnicos);
      
      setLoading(false);
    } catch (error) {
      console.error('Error obteniendo los registros:', error);

      if (error.response && error.response.status === 401) {
        // Token inválido o expirado
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Error obteniendo los registros');
      }

      setLoading(false);
    }
  };

  // Cargar los datos al montar el componente
  useEffect(() => {
    fetchTableData();
    // Cargar localidades y estados
    const fetchRelatedData = async () => {
      try {
        const token = localStorage.getItem('token');
        const localidadesRes = await axios.get(
          `${config.urls.tables}/inscription_localidad_de_la_unidad_de_negocio/records`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setLocalidades(localidadesRes.data);
        const estadosRes = await axios.get(
          `${config.urls.tables}/inscription_estado/records`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEstados(estadosRes.data);
        const usersRes = await axios.get(
          `${config.urls.users}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUsers(usersRes.data);
      } catch (err) {
        // No romper si falla
      }
    };
    fetchRelatedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manejar Select2 con persistencia
  useEffect(() => {
    if (window.$) {
      window.$('.select2').select2({
        closeOnSelect: false,
        width: '100%',
      });

      window.$('.select2').on('change', (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions || []).map(
          (option) => option.value
        );
        setVisibleColumns(selectedOptions);
        localStorage.setItem('piVisibleColumns', JSON.stringify(selectedOptions));
      });

      const savedVisibleColumns = JSON.parse(localStorage.getItem('piVisibleColumns'));
      if (savedVisibleColumns && savedVisibleColumns.length > 0) {
        window.$('.select2').val(savedVisibleColumns).trigger('change');
      }
    }

    const savedSearch = localStorage.getItem('piSearchQuery');
    if (savedSearch) {
      setSearch(savedSearch);
    }
  }, [columns]);

  // Función para obtener el valor a mostrar en una columna
  const getColumnDisplayValue = (record, column) => {
    if (multiSelectFields.includes(column)) {
      // Es un campo de llave foránea
      const foreignKeyValue = record[column];

      if (relatedData[column]) {
        const relatedRecord = relatedData[column].find(
          (item) => String(item.id) === String(foreignKeyValue)
        );
        if (relatedRecord) {
          return relatedRecord.displayValue || `ID: ${relatedRecord.id}`;
        } else {
          return `ID: ${foreignKeyValue}`;
        }
      } else {
        return `ID: ${foreignKeyValue}`;
      }
    } else {
      return record[column];
    }
  };

  // Aplicar el filtro de búsqueda y ordenar por id ascendente
  const displayedRecords = (search
    ? records.filter((record) => {
        return visibleColumns.some((column) => {
          const value = getColumnDisplayValue(record, column);
          return value?.toString()?.toLowerCase().includes(search.toLowerCase());
        });
      })
    : records
  ).sort((a, b) => Number(a.id) - Number(b.id));

  // Obtener los IDs de estado presentes en los registros
  const estadosPresentesIds = Array.from(new Set(displayedRecords.map(r => String(r.Estado))));
  const estadosFiltrados = estados.filter(e => estadosPresentesIds.includes(String(e.id)));

  // Obtener los IDs de asesores presentes en los registros
  const asesoresPresentesIds = Array.from(new Set(displayedRecords.map(r => String(r.Asesor))));
  const asesoresFiltrados = users.filter(
    u => String(u.role_id) === "4" && asesoresPresentesIds.includes(String(u.id))
  );

  // Columnas fijas para Listado Final
  const fixedColumns = [
    'id',
    'Nombre',
    'Empresa',
    'Grupo',
    'Localidad',
    'Asesor',
    'Estado',
  ];

  // Filtros
  const [localidadFilter, setLocalidadFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [asesorFilter, setAsesorFilter] = useState('');
  const [asignacionFilter, setAsignacionFilter] = useState('');
  const [grupoFilter, setGrupoFilter] = useState('');

  // Lógica de filtrado
  const filteredRecords = displayedRecords.filter((record) => {
    const matchesLocalidad = !localidadFilter || String(record["Localidad de la unidad de negocio"]) === String(localidadFilter);
    const matchesEstado = !estadoFilter || String(record.Estado) === String(estadoFilter);
    const matchesAsesor = !asesorFilter || String(record.Asesor) === String(asesorFilter);
    const matchesAsignacion = asignacionFilter === "si" ? record.Asesor : asignacionFilter === "no" ? !record.Asesor : true;
    const matchesGrupo = !grupoFilter || String(record["Priorizacion capitalizacion"]) === String(grupoFilter);
    return matchesLocalidad && matchesEstado && matchesAsesor && matchesAsignacion && matchesGrupo;
  });

  // Calcular el número total de páginas
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);

  // Mostrar solo los registros de la página actual
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Resetear página si cambian los filtros o la cantidad de registros por página
  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, search, localidadFilter, estadoFilter, asesorFilter, asignacionFilter, grupoFilter]);

  // Generar array de páginas para el paginador avanzado
  const getPageNumbers = () => {
    const maxPagesToShow = 20;
    let pages = [];
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= Math.ceil(maxPagesToShow / 2)) {
        pages = [];
        for (let i = 1; i <= maxPagesToShow - 2; i++) pages.push(i);
        pages.push('...', totalPages);
      } else if (currentPage >= totalPages - Math.floor(maxPagesToShow / 2)) {
        pages = [1, '...'];
        for (let i = totalPages - (maxPagesToShow - 3); i <= totalPages; i++) pages.push(i);
      } else {
        pages = [1, '...'];
        for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
        pages.push('...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="content-wrapper" style={{ paddingTop: 0, marginTop: 53 }}>
      {/* Cabecera */}
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
            </div>
          </div>
        </div>
      </section>

      {/* Contenido principal */}
      <section className="content">
        <div className="container-fluid">
          {/* Otros contenidos */}
          <div className="row">
            <div className="col-12">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="card">
                <div className="card-body">
                  {/* Barra de búsqueda */}
                  <div className="row mb-3">
                    <div className="col-md-6" style={{ position: 'relative' }}>
                      <i className="fas fa-search" style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#6c757d', fontSize: 16 }}></i>
                      <input
                        type="text"
                        className="form-control buscador-input"
                        style={{ color: '#000', paddingLeft: 40, width: '538px' }}
                        placeholder="Buscador..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <style>{`.buscador-input::placeholder { color: #6c757d !important; opacity: 1; }`}</style>
                    </div>
                    <div className="col-md-6 d-flex justify-content-end align-items-center">
                      <span style={{ marginRight: 8, color: '#6c757d', fontWeight: 500 }}>Mostrando</span>
                      <select
                        className="form-control"
                        style={{ width: 80, display: 'inline-block', marginRight: 8 }}
                        value={rowsPerPage}
                        onChange={e => setRowsPerPage(Number(e.target.value))}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span style={{ color: '#6c757d', fontWeight: 500 }}>Registros</span>
                    </div>
                  </div>

                  {/* Filtros */}
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <select className="form-control" onChange={(e) => setLocalidadFilter(e.target.value)}>
                        <option value="">Todas las Localidades</option>
                        {localidades.map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc["Localidad de la unidad de negocio"]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-sm-3">
                      <select className="form-control" onChange={(e) => setEstadoFilter(e.target.value)}>
                        <option value="">Todos los Estados</option>
                        {estadosFiltrados.map((estado) => (
                          <option key={estado.id} value={estado.id}>{estado.Estado}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-sm-3">
                      <select className="form-control" onChange={(e) => setAsesorFilter(e.target.value)}>
                        <option value="">Todos los Asesores</option>
                        {asesoresFiltrados.map((user) => (
                          <option key={user.id} value={user.id}>{user.username}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-sm-3">
                      <select className="form-control" onChange={(e) => setAsignacionFilter(e.target.value)}>
                        <option value="">Asignación Asesor</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Filtro de Grupos en segunda fila */}
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <select className="form-control" onChange={(e) => setGrupoFilter(e.target.value)}>
                        <option value="">Todos los Grupos</option>
                        {grupos.map((grupo) => (
                          <option key={grupo} value={grupo}>{grupo}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tabla con columnas fijas */}
                  <div className="table-responsive">
                    {loading ? (
                      <div className="d-flex justify-content-center p-3">Cargando...</div>
                    ) : (
                      <>
                        <table className="table table-hover text-nowrap minimal-table" style={{ 
                          tableLayout: 'fixed', 
                          width: 'auto', 
                          minWidth: '1450px',
                          borderCollapse: 'separate',
                          borderSpacing: 0
                        }}>
                          <thead>
                            <tr>
                              {fixedColumns.map((column) => (
                                <th key={column} style={{ 
                                  textAlign: column === 'Nombre' || column === 'Empresa' ? 'left' : 'center', 
                                  verticalAlign: 'middle',
                                  width: column === 'id' ? '10px' :
                                         column === 'Nombre' ? '300px' :
                                         column === 'Empresa' ? '280px' :
                                         column === 'Grupo' ? '150px' :
                                         column === 'Localidad' ? '155px' :
                                         column === 'Asesor' ? '177px' :
                                         column === 'Estado' ? '150px' : 'auto',
                                  minWidth: column === 'id' ? '100px' :
                                          column === 'Nombre' ? '300px' :
                                          column === 'Empresa' ? '280px' :
                                          column === 'Grupo' ? '150px' :
                                          column === 'Localidad' ? '155px' :
                                          column === 'Asesor' ? '177px' :
                                          column === 'Estado' ? '150px' : 'auto',
                                  maxWidth: column === 'id' ? '100px' :
                                          column === 'Nombre' ? '300px' :
                                          column === 'Empresa' ? '280px' :
                                          column === 'Grupo' ? '150px' :
                                          column === 'Localidad' ? '155px' :
                                          column === 'Asesor' ? '177px' :
                                          column === 'Estado' ? '150px' : 'auto',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>{column.charAt(0).toUpperCase() + column.slice(1)}</th>
                              ))}
                              <th style={{ textAlign: 'center', verticalAlign: 'middle', width: '160px' }}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedRecords.length > 0 ? (
                              paginatedRecords.map((record, index) => (
                                <tr key={record.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                                  <td style={{ 
                                    textAlign: 'center', 
                                    verticalAlign: 'middle', 
                                    width: '47.5px',
                                    minWidth: '47.5px',
                                    maxWidth: '47.5px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>{record.id}</td>
                                  <td style={{ 
                                    textAlign: 'left', 
                                    verticalAlign: 'middle', 
                                    width: '300px',
                                    minWidth: '300px',
                                    maxWidth: '300px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      fontWeight: 500,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {(record.Nombres || '') + ' ' + (record.Apellidos || '')}
                                    </div>
                                    <div style={{
                                      fontSize: '0.9em', 
                                      color: '#888',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      <i className="fas fa-envelope" style={{marginRight: 4}}></i>
                                      {record["Correo electronico"] || ''}
                                    </div>
                                  </td>
                                  <td style={{ 
                                    textAlign: 'left', 
                                    verticalAlign: 'middle', 
                                    width: '280px',
                                    minWidth: '280px',
                                    maxWidth: '280px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>{record["Nombre del emprendimiento"]}</div>
                                    <div style={{
                                      fontSize: '0.9em', 
                                      color: '#888',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      CC: {record["Numero de documento de identificacion ciudadano"] || record["Numero de identificacion"] || ''}
                                    </div>
                                  </td>
                                  <td style={{ 
                                    textAlign: 'center', 
                                    verticalAlign: 'middle', 
                                    width: '150px',
                                    minWidth: '150px',
                                    maxWidth: '150px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>{record["Priorizacion capitalizacion"] || ''}</td>
                                  <td style={{ 
                                    textAlign: 'center', 
                                    verticalAlign: 'middle', 
                                    width: '155px',
                                    minWidth: '155px',
                                    maxWidth: '155px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>{(localidades.find(l => String(l.id) === String(record["Localidad de la unidad de negocio"]))?.["Localidad de la unidad de negocio"] || record["Localidad de la unidad de negocio"] || '' )}</td>
                                  <td style={{ 
                                    textAlign: 'center', 
                                    verticalAlign: 'middle', 
                                    width: '177px',
                                    minWidth: '177px',
                                    maxWidth: '177px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>{(users.find(u => String(u.id) === String(record.Asesor))?.username || record.Asesor || '')}</td>
                                  <td style={{ 
                                    textAlign: 'center', 
                                    verticalAlign: 'middle', 
                                    width: '139px',
                                    minWidth: '139px',
                                    maxWidth: '139px',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {(() => {
                                      const estadoNombre = (estados.find(e => String(e.id) === String(record.Estado))?.Estado || record.Estado || '').trim().toLowerCase();
                                      if (estadoNombre === 'listado final') {
                                        return (
                                          <span style={{
                                            display: 'inline-block',
                                            padding: '4px 12px',
                                            borderRadius: '8px',
                                            backgroundColor: '#a5f3a1', // Verde claro
                                            color: '#217a2b',           // Verde oscuro
                                            fontWeight: 600,
                                            fontSize: '14px',
                                            border: 'none',
                                          }}>
                                            Listado final
                                          </span>
                                        );
                                      } else {
                                        return estados.find(e => String(e.id) === String(record.Estado))?.Estado || record.Estado || '';
                                      }
                                    })()}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      className="btn btn-sm btn-primary mb-1"
                                      style={{ width: '140px', height: '32px', fontSize: '15px', padding: '4px 0', fontWeight: 'normal' }}
                                      onClick={() => navigate(`/plan-inversion/${record.id}`)}
                                    >
                                      Plan de Inversión
                                    </button>
                                    <br />
                                    <button
                                      className="btn btn-sm btn-secondary"
                                      style={{ width: '140px', height: '30px', fontSize: '14px', padding: '4px 0' }}
                                      onClick={() =>
                                        navigate(`/table/${tableName}/record/${record.id}`)
                                      }
                                    >
                                      Editar
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={fixedColumns.length + 1} className="text-center">
                                  No hay registros para mostrar.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {/* Paginador avanzado */}
                        {totalPages > 1 && (
                          <div className="d-flex flex-column align-items-center mt-3">
                            <div className="align-self-start mb-2" style={{ color: '#6c757d' }}>
                              Mostrando {((currentPage - 1) * rowsPerPage) + 1} a {Math.min(currentPage * rowsPerPage, filteredRecords.length)} de {filteredRecords.length} registros
                            </div>
                            <nav>
                              <ul className="pagination mb-0">
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                  <button className="page-link" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>&laquo;</button>
                                </li>
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                  <button className="page-link" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>&lsaquo;</button>
                                </li>
                                {getPageNumbers().map((page, idx) => (
                                  <li key={idx} className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}>
                                    {page === '...'
                                      ? <span className="page-link">...</span>
                                      : <button className="page-link" onClick={() => setCurrentPage(page)}>{page}</button>
                                    }
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
                      </>
                    )}
                  </div>

                  {/* Botón para limpiar filtros */}
                  {/*<div className="mt-3">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setSearch('');
                        fetchTableData();
                      }}
                    >
                      Limpiar filtros
                    </button>
                  </div>*/}
                </div>
              </div>
            </div>
          </div>
          {/* Fin de otros contenidos */}
        </div>
      </section>
    </div>
  );
}

