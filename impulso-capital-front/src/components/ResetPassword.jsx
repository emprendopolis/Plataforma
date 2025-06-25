import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './css/Login.css'; // Usamos el mismo archivo de estilos que el login
import logo from '../assets/img/Impulso.png'; // Importa el logo
import config from '../config';

export default function ResetPassword() {
  const { token } = useParams();  // Obtener el token de la URL
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alert, setAlert] = useState({ message: '', type: '' }); // Estado para el mensaje de alerta
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('login-page');
    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setAlert({ message: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }

    try {
      const response = await axios.post(config.urls.auth.resetPassword(token), { newPassword });

      if (response.status === 200) {
        setAlert({ message: 'Contraseña restablecida con éxito', type: 'success' });
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      const errorMessage = error.response
        ? error.response.data.message || 'Error restableciendo la contraseña'
        : 'Error en la conexión con el servidor';
      setAlert({ message: errorMessage, type: 'error' });
    }

    setTimeout(() => {
      setAlert({ message: '', type: '' });
    }, 3000);
  };

  return (
    <div className="login-container">
      {/* Notificación flotante */}
      {alert.message && (
        <div className={`message ${alert.type}`}>
          <button className="close" onClick={() => setAlert({ message: '', type: '' })}>&times;</button>
          <h5>
            <i className={`icon fas fa-${alert.type === 'success' ? 'check' : 'ban'}`} />
            {' '}
            {alert.type === 'success' ? '¡Éxito!' : '¡Error!'}
          </h5>
          {alert.message}
        </div>
      )}

      {/* Sección izquierda: Formulario de restablecimiento */}
      <div className="login-form">
        <div className="login-logo">
          <img src={logo} alt="Logo Impulso Capital" className="login-logo-img" />
        </div>
        <h2>Restablecer Contraseña</h2>
        <p>Introduce tu nueva contraseña</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group mb-3">
            <input
              type="password"
              className="form-control"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="input-group-append">
              <div className="input-group-text">
                <span className="fas fa-lock" />
              </div>
            </div>
          </div>
          <div className="input-group mb-3">
            <input
              type="password"
              className="form-control"
              placeholder="Confirmar nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className="input-group-append">
              <div className="input-group-text">
                <span className="fas fa-lock" />
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-12">
              <button type="submit" className="btn login-btn">
                Restablecer Contraseña
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Sección derecha: Espacio en blanco */}
      <div className="login-side" />
    </div>
  );
}

