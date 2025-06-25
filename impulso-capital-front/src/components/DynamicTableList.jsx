// DynamicTableList.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './css/UsersList.css';
import './css/DynamicTableList.css';
import config from '../config';

export default function DynamicTableList() {
  const [records, setRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [fieldsData, setFieldsData] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);

  const [multiSelectFields, setMultiSelectFields] = useState([]);
  const [relatedData, setRelatedData] = useState({});

  const [localidades, setLocalidades] = useState([]);
  const [estados, setEstados] = useState([]);
  const [users, setUsers] = useState([]);

  const navigate = useNavigate();

  // Estado para la cantidad de registros por página
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estado para la página actual
  const [currentPage, setCurrentPage] = useState(1);

  // Filtros
  const [localidadFilter, setLocalidadFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [asesorFilter, setAsesorFilter] = useState('');
  const [asignacionFilter, setAsignacionFilter] = useState('');

  // Columnas fijas para Empresas
  const fixedColumns = [
    'ID',
    'Nombre',
    'Empresa',
    'Localidad',
    'Asesor',
    'Estado',
  ];

  // Funciones para obtener el ID y el role_id del usuario logueado
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
        `${config.urls.tables}/inscription_caracterizacion/fields`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const fetchedColumns = fieldsResponse.data.map((column) => column.column_name);
      setColumns(fetchedColumns);
      setFieldsData(fieldsResponse.data);

      // Identificar campos de selección múltiple
      const multiSelectFieldsArray = fieldsResponse.data
        .filter((column) => column.constraint_type === 'FOREIGN KEY')
        .map((column) => column.column_name);

      setMultiSelectFields(multiSelectFieldsArray);

      // Si hay columnas visibles guardadas en localStorage, úsalas
      const localVisibleColumns =
        savedVisibleColumns || JSON.parse(localStorage.getItem('dynamicVisibleColumns')) || [];
      if (localVisibleColumns.length > 0) {
        setVisibleColumns(localVisibleColumns);
      } else {
        setVisibleColumns(fetchedColumns);
      }

      // Obtener registros
      const recordsResponse = await axios.get(
        `${config.urls.tables}/inscription_caracterizacion/records`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let filteredRecords = recordsResponse.data;

      // Filtrar registros según el role_id y el asesor
        if (loggedUserRoleId === '4' && loggedUserId) {
          filteredRecords = filteredRecords.filter(
            (record) => String(record.Asesor) === String(loggedUserId)
          );
        }

      // Obtener datos relacionados
      const relatedDataResponse = await axios.get(
        `${config.urls.tables}/inscription_caracterizacion/related-data`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setRelatedData(relatedDataResponse.data.relatedData || {});
      setRecords(filteredRecords);
      setLoading(false);
    } catch (error) {
      console.error('Error obteniendo los registros:', error);
      if (error.response && error.response.status === 401) {
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
        console.error('Error cargando datos relacionados:', err);
      }
    };
    fetchRelatedData();
  }, []);

  // Función para obtener el valor de visualización de una columna
  const getColumnDisplayValue = (record, column) => {
    if (multiSelectFields.includes(column)) {
      const foreignKeyValue = record[column];
      if (relatedData[column]) {
        const relatedRecord = relatedData[column].find(
          (item) => String(item.id) === String(foreignKeyValue)
        );
        if (relatedRecord) {
          return relatedRecord.displayValue || `ID: ${relatedRecord.id}`;
        }
      }
      return `ID: ${foreignKeyValue}`;
    }
    return record[column];
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
  )
  .filter((record) => {
    // Filtros
    const matchesLocalidad = !localidadFilter || String(record["Localidad de la unidad de negocio"]) === String(localidadFilter);
    const matchesEstado = !estadoFilter || String(record.Estado) === String(estadoFilter);
    const matchesAsesor = !asesorFilter || String(record.Asesor) === String(asesorFilter);
    const matchesAsignacion = asignacionFilter === "si" ? record.Asesor : asignacionFilter === "no" ? !record.Asesor : true;
    return matchesLocalidad && matchesEstado && matchesAsesor && matchesAsignacion;
  })
  .sort((a, b) => Number(a.id) - Number(b.id));

  // Calcular el número total de páginas
  const totalPages = Math.ceil(displayedRecords.length / rowsPerPage);

  // Mostrar solo los registros de la página actual
  const paginatedRecords = displayedRecords.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Resetear página si cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, search, localidadFilter, estadoFilter, asesorFilter, asignacionFilter]);

  // Generar array de páginas para el paginador
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
                        {estados.map((estado) => (
                          <option key={estado.id} value={estado.id}>{estado.Estado}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-sm-3">
                      <select className="form-control" onChange={(e) => setAsesorFilter(e.target.value)}>
                        <option value="">Todos los Asesores</option>
                        {users.filter(u => String(u.role_id) === "4").map((user) => (
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

                  {/* Tabla */}
              <div className="table-responsive">
                {loading ? (
                  <div className="d-flex justify-content-center p-3">Cargando...</div>
                ) : (
                      <>
                        <table className="table table-hover text-nowrap minimal-table table-container">
                    <thead>
                      <tr>
                              {fixedColumns.map((column) => (
                                <th key={column} className={`table-header ${
                                  column === 'ID' ? 'col-id' :
                                  column === 'Nombre' ? 'col-nombre' :
                                  column === 'Empresa' ? 'col-empresa' :
                                  column === 'Localidad' ? 'col-localidad' :
                                  column === 'Asesor' ? 'col-asesor' :
                                  column === 'Estado' ? 'col-estado' : ''
                                }`}>
                                  {column.charAt(0).toUpperCase() + column.slice(1)}
                                </th>
                              ))}
                              <th className="table-header col-acciones">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                            {paginatedRecords.length > 0 ? (
                              paginatedRecords.map((record, index) => (
                                <tr key={record.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                                  <td className="table-cell col-id">{record.id}</td>
                                  <td className="table-cell col-nombre">
                                    <div className="cell-content">
                                      {(record.Nombres || '') + ' ' + (record.Apellidos || '')}
                                    </div>
                                    <div className="cell-subtext">
                                      <i className="fas fa-envelope" style={{marginRight: 4}}></i>
                                      {record["Correo electronico"] || ''}
                                    </div>
                                  </td>
                                  <td className="table-cell col-empresa">
                                    <div className="cell-content">
                                      {record["Nombre del emprendimiento"]}
                                    </div>
                                    <div className="cell-subtext">
                                      CC: {record["Numero de documento de identificacion ciudadano"] || record["Numero de identificacion"] || ''}
                                    </div>
                                  </td>
                                  <td className="table-cell col-localidad">
                                    {(localidades.find(l => String(l.id) === String(record["Localidad de la unidad de negocio"]))?.["Localidad de la unidad de negocio"] || record["Localidad de la unidad de negocio"] || '' )}
                                  </td>
                                  <td className="table-cell col-asesor">
                                    {(users.find(u => String(u.id) === String(record.Asesor))?.username || '')}
                                  </td>
                                  <td className="table-cell col-estado">
                                    {(() => {
                                      const estadoNombre = (estados.find(e => String(e.id) === String(record.Estado))?.Estado || '').trim().toLowerCase();
                                      if (estadoNombre === 'listado final') {
                                        return (
                                          <span className="badge badge-success">
                                            Listado final
                                          </span>
                                        );
                                      } else if (estadoNombre === 'rechazado' || estadoNombre === 'retirado') {
                                        return (
                                          <span className="badge badge-danger">
                                            {estadoNombre.charAt(0).toUpperCase() + estadoNombre.slice(1)}
                                          </span>
                                        );
                                      } else if (estadoNombre === 'subsanacion') {
                                        return (
                                          <span className="badge badge-warning">
                                            Subsanacion
                                          </span>
                                        );
                                      } else if (estadoNombre === 'preseleccionado') {
                                        return (
                                          <span className="badge badge-info">
                                            Preseleccionado
                                          </span>
                                        );
                                      } else if (estadoNombre === 'revision documental') {
                                        return (
                                          <span className="badge badge-secondary">
                                            Revision documental
                                          </span>
                                        );
                                      } else {
                                        return estados.find(e => String(e.id) === String(record.Estado))?.Estado || '';
                                      }
                                    })()}
                                  </td>
                                  <td className="table-cell col-acciones">
                                    <button
                                      className="btn btn-info btn-sm"
                                      onClick={() => navigate(`/table/inscription_caracterizacion/record/${record.id}`)}
                                      title="Editar registro"
                                    >
                                      <i className="fas fa-edit"></i> Editar
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={fixedColumns.length + 1} className="text-center">
                                  No hay registros para mostrar
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="d-flex flex-column align-items-center mt-3">
                      <div className="align-self-start mb-2" style={{ color: '#6c757d' }}>
                        Mostrando {((currentPage - 1) * rowsPerPage) + 1} a {Math.min(currentPage * rowsPerPage, displayedRecords.length)} de {displayedRecords.length} registros
                      </div>
                      <nav>
                        <ul className="pagination mb-0">
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                            >
                              <i className="fas fa-angle-double-left"></i>
                            </button>
                          </li>
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setCurrentPage(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              <i className="fas fa-angle-left"></i>
                            </button>
                          </li>
                          {getPageNumbers().map((page, index) => (
                            <li
                              key={index}
                              className={`page-item ${page === '...' ? 'disabled' : ''} ${page === currentPage ? 'active' : ''}`}
                            >
                              <button
                                className="page-link"
                                onClick={() => typeof page === 'number' && setCurrentPage(page)}
                                disabled={page === '...'}
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
                              <i className="fas fa-angle-right"></i>
                            </button>
                          </li>
                          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setCurrentPage(totalPages)}
                              disabled={currentPage === totalPages}
                            >
                              <i className="fas fa-angle-double-right"></i>
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}