import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './css/Login.css'; // Usamos el mismo archivo de estilos que el login
import logo from '../assets/img/Impulso.png'; // Importa el logo
import config from '../config';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
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

    try {
      const response = await axios.post(config.urls.auth.forgotPassword, { email });

      if (response.status === 200) {
        setAlert({
          message: 'Correo de recuperación enviado',
          type: 'success',
        });
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      const errorMessage = error.response
        ? error.response.data.message || 'Error enviando el correo de recuperación'
        : 'Error en la conexión con el servidor';
      setAlert({
        message: errorMessage,
        type: 'error',
      });
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

      {/* Sección izquierda: Formulario de recuperación */}
      <div className="login-form">
        <div className="login-logo">
          <img src={logo} alt="Logo Impulso Capital" className="login-logo-img" />
        </div>
        <h2>Recuperar Contraseña</h2>
        <p>Introduce tu correo electrónico para recibir el enlace de recuperación</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group mb-3">
            <input
              type="email"
              className="form-control"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="input-group-append">
              <div className="input-group-text">
                <span className="fas fa-envelope" />
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-12">
              <button type="submit" className="btn login-btn">
                Recuperar Contraseña
              </button>
            </div>
          </div>
        </form>

        {/* Enlace para volver al login */}
        <p className="back-to-login mt-3">
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </div>

      {/* Sección derecha: Espacio en blanco */}
      <div className="login-side" />
    </div>
  );
}
