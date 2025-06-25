import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './css/UserAdd.css'; // Archivo de estilos separado
import config from '../config';

export default function UserAdd() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roles, setRoles] = useState([]);
  const [alert, setAlert] = useState({ message: '', type: '' });
  const navigate = useNavigate();

  // Obtener los roles desde el backend cuando el componente se monta
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(config.urls.roles, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setRoles(response.data); // Guardar los roles en el estado
      } catch (error) {
        console.error('Error fetching roles:', error);
        setAlert({ message: 'Error cargando roles', type: 'error' });
      }
    };

    fetchRoles();
  }, []);

  // Manejar la creación de un nuevo usuario
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        config.urls.users,
        { username, email, password, role_id: roleId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 201) {
        setAlert({ message: 'Usuario creado con éxito', type: 'success' });
        setTimeout(() => {
          navigate('/usuarios'); // Redirigir a la lista de usuarios
        }, 2000);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error creando usuario';
      setAlert({ message: errorMessage, type: 'error' });
    }
  };

  return (
    <div className="content-wrapper">
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Crear Usuario</h1>
            </div>
            <div className="col-sm-6">
              <button className="btn btn-secondary float-right" onClick={() => navigate('/usuarios')}>
                Volver a la lista de usuarios
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              {alert.message && (
                <div className={`alert alert-${alert.type}`}>{alert.message}</div>
              )}

              <div className="card">
                <div className="card-body">
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label>Nombre de usuario</label>
                      <input
                        type="text"
                        className="form-control"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Correo electrónico</label>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Contraseña</label>
                      <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Rol</label>
                      <select
                        className="form-control"
                        value={roleId}
                        onChange={(e) => setRoleId(e.target.value)}
                        required
                      >
                        <option value="">Selecciona un rol</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.role_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button type="submit" className="btn btn-primary">
                      Crear usuario
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
