import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate
import './css/UsersList.css'; // Archivo de estilos separado
import config from '../config';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [showSearchBar, setShowSearchBar] = useState(false); // Estado para mostrar u ocultar la barra de búsqueda

  const navigate = useNavigate(); // Definir navigate

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Token no encontrado. Por favor, inicia sesión nuevamente.');
        }

        const response = await axios.get(config.urls.users, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUsers(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError(error.response?.data?.message || error.message || 'Error fetching users');
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Función para cambiar el estado de un usuario
  const toggleUserStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = currentStatus === 1 ? 0 : 1;

      await axios.put(`${config.urls.users}/${id}/toggle-status`, { status: newStatus }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Actualizar la lista de usuarios después de cambiar el estado
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === id ? { ...user, status: newStatus } : user
        )
      );
    } catch (error) {
      console.error('Error cambiando el estado del usuario:', error);
    }
  };

  // Aplicar el filtro de búsqueda de forma segura
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user?.username?.toLowerCase()?.includes(search.toLowerCase()) ||
      user?.email?.toLowerCase()?.includes(search.toLowerCase()) ||
      false;
    return matchesSearch;
  });

  return (
    <div className="content-wrapper">
      {/* Content Header (Page header) */}
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Usuarios</h1>
            </div>
            <div className="col-sm-6 d-flex justify-content-end">
              <button
                className="btn btn-light mr-2"
                onClick={() => setShowSearchBar(!showSearchBar)}
              >
                {showSearchBar ? "Ocultar búsqueda" : "Mostrar búsqueda"}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/usuarios/agregar")}
              >
                Crear usuario
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="card">
                <div className="card-body table-responsive p-0">
                  {/* Búsqueda (visible solo cuando showSearchBar es true) */}
                  {showSearchBar && (
                    <div className="row mb-3">
                      <div className="col-sm-6">
                        <div className="form-group">
                          <input
                            type="text"
                            className="form-control search-input"
                            placeholder="Buscar por nombre o correo..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tabla de usuarios */}
                  {loading ? (
                    <div>Cargando...</div>
                  ) : (
                    <table className="table table-hover text-nowrap minimal-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nombres</th>
                          <th>Rol</th>
                          <th>Estado</th>
                          <th>Fechas</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>
                              <div className="user-info">
                                <span className="username">
                                  {user.username || "Nombre no disponible"}
                                </span>
                                <small>{user.email}</small>
                              </div>
                            </td>
                            <td>{user.Role?.role_name || "Sin rol"}</td>
                            <td>
                              <span
                                className={`badge ${
                                  user.status === 1
                                    ? "badge-success"
                                    : "badge-danger"
                                }`}
                                onClick={() =>
                                  toggleUserStatus(user.id, user.status)
                                }
                                style={{ cursor: "pointer" }}
                              >
                                {user.status === 1 ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            <td>
                              <div>
                                Registrado el:{" "}
                                {new Date(user.created_at).toLocaleDateString()}
                              </div>
                              <div>
                                Último login:{" "}
                                {user.last_login
                                  ? new Date(user.last_login).toLocaleString()
                                  : "Nunca"}
                              </div>
                            </td>
                            <td>
                              
                                <button
                                  className="btn btn-view"
                                  onClick={() =>
                                    navigate(`/usuarios/${user.id}`)
                                  }
                                >
                                  Ver
                                </button>
                              
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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





