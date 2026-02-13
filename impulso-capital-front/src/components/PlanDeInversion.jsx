import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import DatosTab from './PlanDeInversion/DatosTab';
import DiagnosticoTab from './PlanDeInversion/DiagnosticoTab';
import PropuestaMejoraTab from './PlanDeInversion/PropuestaMejoraTab'; // Nuevo componente
import ActivosActualesTab from './PlanDeInversion/ActivosActualesTab'; // Nuevo componente
import CreditoTab from './PlanDeInversion/CreditoTab';
import ArriendoTab from './PlanDeInversion/ArriendoTab';
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
import GenerarFichaTabG3 from './PlanDeInversion/GenerarFichaTabG3';
import './PlanDeInversion/PlanDeInversion.css'; // Archivo CSS para estilos personalizados

export default function PlanDeInversion() {
  const { id } = useParams(); // ID del registro de caracterización
  const [activeTab, setActiveTab] = useState('Datos');
  const [priorizacionCapitalizacion, setPriorizacionCapitalizacion] = useState(null);
  const [modalidadCapitalizacion, setModalidadCapitalizacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalInversionNumerico, setTotalInversionNumerico] = useState(0);

  // Obtener el valor de Priorizacion capitalizacion y modalidadCapitalizacion
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
        
        // Obtener modalidadCapitalizacion desde pi_datos
        try {
          const datosResponse = await axios.get(
            `${config.urls.inscriptions.base}/pi/tables/pi_datos/records?caracterizacion_id=${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (datosResponse.data.length > 0) {
            setModalidadCapitalizacion(datosResponse.data[0].modalidadCapitalizacion || null);
          } else {
            setModalidadCapitalizacion(null);
          }
        } catch (error) {
          console.error('Error obteniendo modalidadCapitalizacion:', error);
          setModalidadCapitalizacion(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error obteniendo la priorización:', error);
        setPriorizacionCapitalizacion(null);
        setLoading(false);
      }
    };
    
    fetchPriorizacion();
  }, [id]);
  
  // Función para actualizar modalidadCapitalizacion desde DatosTab
  const updateModalidadCapitalizacion = (newValue) => {
    setModalidadCapitalizacion(newValue);
  };

  // Cambiar a un tab válido si el tab activo debe ocultarse o está bloqueado
  useEffect(() => {
    if (!loading && priorizacionCapitalizacion) {
      if (!shouldShowTab(activeTab) || isTabBlocked(activeTab)) {
        // Cambiar al primer tab disponible (siempre será "Datos")
        setActiveTab('Datos');
      }
    }
  }, [loading, priorizacionCapitalizacion, modalidadCapitalizacion, activeTab]);

  // Función para actualizar el total de inversión
  const updateTotalInversion = (total) => {
    setTotalInversionNumerico(total);
  };

  // Función para determinar si un tab debe estar bloqueado (solo para Grupo 3)
  const isTabBlocked = (tabName) => {
    // Solo aplicar bloqueo para Grupo 3
    if (priorizacionCapitalizacion !== 'Grupo 3') {
      return false;
    }
    
    // Si no hay modalidadCapitalizacion seleccionada, bloquear todos
    if (!modalidadCapitalizacion) {
      return tabName === 'Credito' || tabName === 'Arriendo' || tabName === 'FormulacionProv';
    }
    
    // Lógica de bloqueo según modalidadCapitalizacion
    switch (modalidadCapitalizacion) {
      case 'Cobertura de deuda comercial financiera':
        // Solo habilitar Credito
        return tabName === 'Arriendo' || tabName === 'FormulacionProv';
        
      case 'Pago de canon de arrendamiento':
        // Solo habilitar Arriendo
        return tabName === 'Credito' || tabName === 'FormulacionProv';
        
      case 'Proveeduría de bienes':
        // Solo habilitar FormulacionProv
        return tabName === 'Credito' || tabName === 'Arriendo';
        
      default:
        // Si la modalidad no coincide con ninguna, bloquear todos
        return tabName === 'Credito' || tabName === 'Arriendo' || tabName === 'FormulacionProv';
    }
  };

  // Función para determinar si un tab debe mostrarse
  const shouldShowTab = (tabName) => {
    if (!priorizacionCapitalizacion) return true; // Mostrar todos los tabs si no hay datos
    
    // Si es Grupo 3, solo mostrar las pestañas específicas
    if (priorizacionCapitalizacion === 'Grupo 3') {
      const tabsPermitidosGrupo3 = [
        'Datos',
        'PropuestaMejora',
        'ActivosActuales',
        'Credito',
        'Arriendo',
        'FormulacionProv',
        'Validaciones',
        'InfoBancaria',
        'AnexosV2',
        'GenerarFichaG3'
      ];
      return tabsPermitidosGrupo3.includes(tabName);
    }
    
    // Lógica para otros grupos
    switch (tabName) {
      case 'FormulacionProv':
      case 'GenerarFicha':
        // Ocultar si es Grupo 1
        return priorizacionCapitalizacion !== 'Grupo 1';
        
      case 'FormulacionKit':
      case 'GenerarFichaKit':
        // Ocultar si es Grupo 2
        return priorizacionCapitalizacion !== 'Grupo 2';
        
      case 'GenerarFichaG3':
        // Solo mostrar GenerarFichaG3 para Grupo 3
        return priorizacionCapitalizacion === 'Grupo 3';

      case 'InfoBancaria':
        // Solo mostrar InfoBancaria para Grupo 3
        return priorizacionCapitalizacion === 'Grupo 3';
        
      case 'Credito':
      case 'Arriendo':
        // Solo mostrar Credito y Arriendo para Grupo 3
        return priorizacionCapitalizacion === 'Grupo 3';
        
      default:
        // Para otros grupos, ocultar las pestañas que no corresponden
        if (priorizacionCapitalizacion === 'Grupo 1') {
          // Grupo 1: ocultar FormulacionProv, GenerarFicha, Credito y Arriendo
          return tabName !== 'FormulacionProv' && tabName !== 'GenerarFicha' && tabName !== 'Credito' && tabName !== 'Arriendo';
        }
        if (priorizacionCapitalizacion === 'Grupo 2') {
          // Grupo 2: ocultar FormulacionKit, GenerarFichaKit, Credito y Arriendo
          return tabName !== 'FormulacionKit' && tabName !== 'GenerarFichaKit' && tabName !== 'Credito' && tabName !== 'Arriendo';
        }
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
              {shouldShowTab('Datos') && (
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
              )}
              {shouldShowTab('PropuestaMejora') && (
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
              )}
              {shouldShowTab('ActivosActuales') && (
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
              )}
              {shouldShowTab('Credito') && (
                <li className={`nav-item ${activeTab === 'Credito' ? 'active' : ''}`}>
                  <a
                    href="#"
                    className={`nav-link ${isTabBlocked('Credito') ? 'disabled' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!isTabBlocked('Credito')) {
                        setActiveTab('Credito');
                      }
                    }}
                    style={isTabBlocked('Credito') ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
                  >
                    <i className="fas fa-money-bill-wave"></i> Crédito
                  </a>
                </li>
              )}
              {shouldShowTab('Arriendo') && (
                <li className={`nav-item ${activeTab === 'Arriendo' ? 'active' : ''}`}>
                  <a
                    href="#"
                    className={`nav-link ${isTabBlocked('Arriendo') ? 'disabled' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!isTabBlocked('Arriendo')) {
                        setActiveTab('Arriendo');
                      }
                    }}
                    style={isTabBlocked('Arriendo') ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
                  >
                    <i className="fas fa-home"></i> Arriendo
                  </a>
                </li>
              )}
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
                    className={`nav-link ${isTabBlocked('FormulacionProv') ? 'disabled' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!isTabBlocked('FormulacionProv')) {
                        setActiveTab('FormulacionProv');
                      }
                    }}
                    style={isTabBlocked('FormulacionProv') ? { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
                  >
                    <i className="fas fa-handshake"></i> Formulación con Proveedores
                  </a>
                </li>
              )}
              {shouldShowTab('Validaciones') && (
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
              {shouldShowTab('InfoBancaria') && (
                <li className={`nav-item ${activeTab === 'InfoBancaria' ? 'active' : ''}`}>
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
                </li>
              )}
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
              {shouldShowTab('AnexosV2') && (
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
              )}
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
              {shouldShowTab('GenerarFichaG3') && (
                <li className={`nav-item ${activeTab === 'GenerarFichaG3' ? 'active' : ''}`}>
                  <a
                    href="#"
                    className="nav-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab('GenerarFichaG3');
                    }}
                  >
                    <i className="fas fa-file-pdf"></i> Generar Ficha G3 en PDF
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Contenido de las pestañas */}
          <div className="plan-de-inversion-tab-content">
            {activeTab === 'Datos' && shouldShowTab('Datos') && <DatosTab id={id} onModalidadChange={updateModalidadCapitalizacion} />}
            {activeTab === 'PropuestaMejora' && shouldShowTab('PropuestaMejora') && <PropuestaMejoraTab id={id} />}
            {activeTab === 'ActivosActuales' && shouldShowTab('ActivosActuales') && <ActivosActualesTab id={id} />}
            {activeTab === 'Credito' && shouldShowTab('Credito') && <CreditoTab id={id} />}
            {activeTab === 'Arriendo' && shouldShowTab('Arriendo') && <ArriendoTab id={id} />}
            {/* {activeTab === 'Diagnostico' && <DiagnosticoTab id={id} />} */}
            {/* {activeTab === 'Capacitacion' && <CapacitacionTab id={id} />} */}
            {activeTab === 'Validaciones' && shouldShowTab('Validaciones') && <ValidacionesTab id={id} totalInversionNumerico={totalInversionNumerico} />}
            {/* {activeTab === 'Formulacion' && <FormulacionTab id={id} />} */}
            {activeTab === 'FormulacionProv' && shouldShowTab('FormulacionProv') && <FormulacionProvTab id={id} updateTotalInversion={updateTotalInversion} />}
            {activeTab === 'FormulacionKit' && shouldShowTab('FormulacionKit') && <FormulacionKitTab id={id} />}
            {activeTab === 'InfoBancaria' && shouldShowTab('InfoBancaria') && <InfoBancariaTab id={id} />}
            {/* {activeTab === 'Anexos' && <AnexosTab id={id} />} */}
            {activeTab === 'AnexosV2' && shouldShowTab('AnexosV2') && <AnexosV2Tab id={id} />}
            {activeTab === 'Ejecucion' && <EjecucionTab id={id} />}
            {/* {activeTab === 'EncuestaSalida' && <EncuestaSalidaTab id={id} />} */}
            {activeTab === 'GenerarFicha' && shouldShowTab('GenerarFicha') && <GenerarFichaTab id={id} />}
            {activeTab === 'GenerarFichaKit' && shouldShowTab('GenerarFichaKit') && <GenerarFichaKitTab id={id} />}
            {activeTab === 'GenerarFichaG3' && shouldShowTab('GenerarFichaG3') && <GenerarFichaTabG3 id={id} />}
          </div>
        </div>
      </section>
    </div>
  );
}
