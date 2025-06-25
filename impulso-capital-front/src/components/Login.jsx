import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './css/Login.css'; 
import logo from '../assets/img/Impulso.png'; 
import config from '../config';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const response = await axios.post(`${config.baseUrl}/users/login`, { email, password });
  
      if (response.status === 200) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("id", response.data.user.id); // Guardar id de usuario
        localStorage.setItem("role_id", response.data.user.role); // Guardar role_id
        localStorage.setItem("username", response.data.user.username); // Guardar username
        localStorage.setItem(
          "role_name",
          response.data.user.role === 1
            ? "SuperAdmin"
            : response.data.user.role === 2
            ? "Administrador"
            : "Usuario"
        ); // Guardar role_name basado en role_id

        setAlert({
          message: "Inicio de sesión exitoso",
          type: "success",
        });
        setTimeout(() => {
          navigate("/escritorio");
        }, 1500);
      }
    } catch (error) {
      const errorMessage = error.response?.status === 403
        ? 'Usuario inactivo. Contacte al administrador.'
        : error.response?.data?.message || 'Error iniciando sesión';
        
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
      {/* Notificación flotante de AdminLTE */}
      {alert.message && (
        <div className={`message ${alert.type}`}>
          <button
            className="close"
            onClick={() => setAlert({ message: "", type: "" })}
          >
            &times;
          </button>
          <h5>
            <i
              className={`icon fas fa-${
                alert.type === "success" ? "check" : "ban"
              }`}
            />{" "}
            {alert.type === "success" ? "¡Éxito!" : "¡Error!"}
          </h5>
          {alert.message}
        </div>
      )}

      {/* Sección izquierda: Login */}
      <div className="login-form">
        <div className="login-logo">
          <img
            src={logo}
            alt="Logo Impulso Capital"
            className="login-logo-img"
          />
        </div>
        <h2>Bienvenido,</h2>
        <p>Sistema de información del proyecto Impulso Local</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group mb-3">
            <input
              type="email"
              className="form-control"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <div className="input-group-append">
              <div className="input-group-text">
                <span className="fas fa-envelope" />
              </div>
            </div>
          </div>
          <div className="input-group mb-3">
            <input
              type="password"
              className="form-control"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
                Ingresar
              </button>
            </div>
            <div className="row">
              <div className="col-12 text-center mt-3">
                <a href="/forgot-password" className="forgot-password-link">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Sección derecha: Espacio en blanco */}
      <div className="login-side" />
    </div>
  );
}





