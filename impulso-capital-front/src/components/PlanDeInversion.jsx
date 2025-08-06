import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import DatosTab from './PlanDeInversion/DatosTab';
import DiagnosticoTab from './PlanDeInversion/DiagnosticoTab';
import PropuestaMejoraTab from './PlanDeInversion/PropuestaMejoraTab'; // Nuevo componente
import ActivosActualesTab from './PlanDeInversion/ActivosActualesTab'; // Nuevo componente
import CapacitacionTab from './PlanDeInversion/CapacitacionTab';
import ValidacionesTab from './PlanDeInversion/ValidacionesTab';
import FormulacionTab from './PlanDeInversion/FormulacionTab';
import FormulacionProvTab from './PlanDeInversion/FormulacionProvTab';
import FormulacionKitTab from './PlanDeInversion/FormulacionKitTab';
import InfoBancariaTab from './PlanDeInversion/InfoBancariaTab';
import AnexosTab from './PlanDeInversion/AnexosTab';
import AnexosV2Tab from './PlanDeInversion/AnexosV2Tab';
import EjecucionTab from './PlanDeInversion/EjecucionTab'; // Nuevo componente
import EncuestaSalidaTab from './PlanDeInversion/EncuestaSalidaTab';
import GenerarFichaTab from './PlanDeInversion/GenerarFichaTab';
import GenerarFichaKitTab from './PlanDeInversion/GenerarFichaKitTab';
import './PlanDeInversion/PlanDeInversion.css'; // Archivo CSS para estilos personalizados

export default function PlanDeInversion() {
  const { id } = useParams(); // ID del registro de caracterización
  const [activeTab, setActiveTab] = useState('Datos');
  const [priorizacionCapitalizacion, setPriorizacionCapitalizacion] = useState(null);
  const [loading, setLoading] = useState(true);

  // Obtener el valor de Priorizacion capitalizacion
  useEffect(() => {
    const fetchPriorizacion = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }
        
        const response = await axios.get(
          `${config.urls.inscriptions.tables}/inscription_caracterizacion/record/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setPriorizacionCapitalizacion(response.data.record?.['Priorizacion capitalizacion'] ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo la priorización:', error);
        setPriorizacionCapitalizacion(null);
        setLoading(false);
      }
    };
    
    fetchPriorizacion();
  }, [id]);

  // Cambiar a un tab válido si el tab activo debe ocultarse
  useEffect(() => {
    if (!loading && priorizacionCapitalizacion && !shouldShowTab(activeTab)) {
      // Cambiar al primer tab disponible (siempre será "Datos")
      setActiveTab('Datos');
    }
  }, [loading, priorizacionCapitalizacion, activeTab]);

  // Función para determinar si un tab debe mostrarse
  const shouldShowTab = (tabName) => {
    if (!priorizacionCapitalizacion) return true; // Mostrar todos los tabs si no hay datos
    
    switch (tabName) {
      case 'FormulacionProv':
      case 'GenerarFicha':
        // Ocultar si es Grupo 1
        return priorizacionCapitalizacion !== 'Grupo 1';
        
      case 'FormulacionKit':
      case 'GenerarFichaKit':
        // Ocultar si es Grupo 2
        return priorizacionCapitalizacion !== 'Grupo 2';
        
      default:
        return true; // Mostrar otros tabs siempre
    }
  };

  if (loading) {
    return (
      <div className="content-wrapper">
        <section className="content">
          <div className="container-fluid">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin"></i> Cargando configuración...
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <section className="content-header">
      </section>
      <section className="content">
        <div className="plan-de-inversion-container">
          {/* Pestañas Verticales */}
          <div className="plan-de-inversion-tabs-sidebar">
            <ul className="nav nav-pills flex-column">
              <li className={`nav-item ${activeTab === 'Datos' ? 'active' : ''}`}>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('Datos');
                  }}
                >
                  <i className="fas fa-database"></i> Datos
                </a>
              </li>
              <li className={`nav-item ${activeTab === 'PropuestaMejora' ? 'active' : ''}`}>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('PropuestaMejora');
                  }}
                >
                  <i className="fas fa-lightbulb"></i> Propuesta de Mejora
                </a>
              </li>
              <li className={`nav-item ${activeTab === 'ActivosActuales' ? 'active' : ''}`}>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('ActivosActuales');
                  }}
                >
                  <i className="fas fa-chart-line"></i> Activos actuales
                </a>
              </li>
              {/* <li className={`nav-item ${activeTab === 'Diagnostico' ? 'active' : ''}`}>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('Diagnostico');
                  }}
                >
                  <i className="fas fa-stethoscope"></i> Diagnóstico
                </a>
              </li> */}
              {/* <li className={`nav-item ${activeTab === 'Capacitacion' ? 'active' : ''}`}>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('Capacitacion');
                  }}
                >
                  <i className="fas fa-chalkboard-teacher"></i> Capacitación
                </a>
              </li> */}
              <li className={`nav-item ${activeTab === 'Validaciones' ? 'active' : ''}`}>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('Validaciones');
                  }}
                >
                  <i className="fas fa-check-double"></i> Validaciones
                </a>
              </li>
              {/* <li className={`nav-item ${activeTab === 'Formulacion' ? 'active' : ''}`}>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('Formulacion');
                  }}
                >
                  <i className="fas fa-tasks"></i> Formulación
                </a>
              </li> */}
              {shouldShowTab('FormulacionProv') && (
                <li className={`nav-item ${activeTab === 'FormulacionProv' ? 'active' : ''}`}>
                  <a
                    href="#"
                    className="nav-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab('FormulacionProv');
                    }}
                  >
                    <i className="fas fa-handshake"></i> Formulación con Proveedores
                  </a>
                </li>
              )}
              {shouldShowTab('FormulacionKit') && (
                <li className={`nav-item ${activeTab === 'FormulacionKit' ? 'active' : ''}`}>
                  <a
                    href="#"
                    className="nav-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab('FormulacionKit');
                    }}
                  >
                    <i className="fas fa-box"></i> Formulación con Kits
                  </a>
                </li>
              )}
              {/*<li className={`nav-item ${activeTab === 'InfoBancaria' ? 'active' : ''}`}>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('InfoBancaria');
                  }}
                >
                  <i className="fas fa-credit-card"></i> Información Bancaria
                </a>
              </li>*/}
              {/* <li className={`nav-item ${activeTab === 'Anexos' ? 'active' : ''}`}>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('Anexos');
                  }}
                >
                  <i className="fas fa-paperclip"></i> Anexos
                </a>
              </li> */}
              <li className={`nav-item ${activeTab === 'AnexosV2' ? 'active' : ''}`}>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('AnexosV2');
                  }}
                >
                  <i className="fas fa-paperclip"></i> Anexos
                </a>
              </li>
              {/*<li className={`nav-item ${activeTab === 'Ejecucion' ? 'active' : ''}`}>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('Ejecucion');
                  }}
                >
                  <i className="fas fa-play-circle"></i> Ejecución
                </a>
              </li>*/}
              {/* <li className={`nav-item ${activeTab === 'EncuestaSalida' ? 'active' : ''}`}>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('EncuestaSalida');
                  }}
                >
                  <i className="fas fa-poll"></i> Encuesta de Salida
                </a>
              </li> */}
              {shouldShowTab('GenerarFicha') && (
                <li className={`nav-item ${activeTab === 'GenerarFicha' ? 'active' : ''}`}>
                  <a
                    href="#"
                    className="nav-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab('GenerarFicha');
                    }}
                  >
                    <i className="fas fa-file-pdf"></i> Generar Ficha en PDF
                  </a>
                </li>
              )}
              {shouldShowTab('GenerarFichaKit') && (
                <li className={`nav-item ${activeTab === 'GenerarFichaKit' ? 'active' : ''}`}>
                  <a
                    href="#"
                    className="nav-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab('GenerarFichaKit');
                    }}
                  >
                    <i className="fas fa-file-pdf"></i> Generar Ficha de Kits en PDF
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Contenido de las pestañas */}
          <div className="plan-de-inversion-tab-content">
            {activeTab === 'Datos' && <DatosTab id={id} />}
            {activeTab === 'PropuestaMejora' && <PropuestaMejoraTab id={id} />}
            {activeTab === 'ActivosActuales' && <ActivosActualesTab id={id} />}
            {/* {activeTab === 'Diagnostico' && <DiagnosticoTab id={id} />} */}
            {/* {activeTab === 'Capacitacion' && <CapacitacionTab id={id} />} */}
            {activeTab === 'Validaciones' && <ValidacionesTab id={id} />}
            {/* {activeTab === 'Formulacion' && <FormulacionTab id={id} />} */}
            {activeTab === 'FormulacionProv' && shouldShowTab('FormulacionProv') && <FormulacionProvTab id={id} />}
            {activeTab === 'FormulacionKit' && shouldShowTab('FormulacionKit') && <FormulacionKitTab id={id} />}
            {activeTab === 'InfoBancaria' && <InfoBancariaTab id={id} />}
            {/* {activeTab === 'Anexos' && <AnexosTab id={id} />} */}
            {activeTab === 'AnexosV2' && <AnexosV2Tab id={id} />}
            {activeTab === 'Ejecucion' && <EjecucionTab id={id} />}
            {/* {activeTab === 'EncuestaSalida' && <EncuestaSalidaTab id={id} />} */}
            {activeTab === 'GenerarFicha' && shouldShowTab('GenerarFicha') && <GenerarFichaTab id={id} />}
            {activeTab === 'GenerarFichaKit' && shouldShowTab('GenerarFichaKit') && <GenerarFichaKitTab id={id} />}
          </div>
        </div>
      </section>
    </div>
  );
}
