import { useState } from 'react';
import { useParams } from 'react-router-dom';
import DatosTab from './PlanDeInversion/DatosTab';
import DiagnosticoTab from './PlanDeInversion/DiagnosticoTab';
import PropuestaMejoraTab from './PlanDeInversion/PropuestaMejoraTab'; // Nuevo componente
import CapacitacionTab from './PlanDeInversion/CapacitacionTab';
import ValidacionesTab from './PlanDeInversion/ValidacionesTab';
import FormulacionTab from './PlanDeInversion/FormulacionTab';
import FormulacionProvTab from './PlanDeInversion/FormulacionProvTab';
import InfoBancariaTab from './PlanDeInversion/InfoBancariaTab';
import AnexosTab from './PlanDeInversion/AnexosTab';
import EjecucionTab from './PlanDeInversion/EjecucionTab'; // Nuevo componente
import EncuestaSalidaTab from './PlanDeInversion/EncuestaSalidaTab';
import GenerarFichaTab from './PlanDeInversion/GenerarFichaTab';
import './PlanDeInversion/PlanDeInversion.css'; // Archivo CSS para estilos personalizados

export default function PlanDeInversion() {
  const { id } = useParams(); // ID del registro de caracterización
  const [activeTab, setActiveTab] = useState('Datos');

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
              <li className={`nav-item ${activeTab === 'Diagnostico' ? 'active' : ''}`}>
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
              </li>
              <li className={`nav-item ${activeTab === 'Capacitacion' ? 'active' : ''}`}>
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
              </li>
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
              <li className={`nav-item ${activeTab === 'Anexos' ? 'active' : ''}`}>
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
              <li className={`nav-item ${activeTab === 'EncuestaSalida' ? 'active' : ''}`}>
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
              </li>
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
            </ul>
          </div>

          {/* Contenido de las pestañas */}
          <div className="plan-de-inversion-tab-content">
            {activeTab === 'Datos' && <DatosTab id={id} />}
            {activeTab === 'PropuestaMejora' && <PropuestaMejoraTab id={id} />}
            {activeTab === 'Diagnostico' && <DiagnosticoTab id={id} />}
            {activeTab === 'Capacitacion' && <CapacitacionTab id={id} />}
            {activeTab === 'Validaciones' && <ValidacionesTab id={id} />}
            {/* {activeTab === 'Formulacion' && <FormulacionTab id={id} />} */}
            {activeTab === 'FormulacionProv' && <FormulacionProvTab id={id} />}
            {activeTab === 'InfoBancaria' && <InfoBancariaTab id={id} />}
            {activeTab === 'Anexos' && <AnexosTab id={id} />}
            {activeTab === 'Ejecucion' && <EjecucionTab id={id} />}
            {activeTab === 'EncuestaSalida' && <EncuestaSalidaTab id={id} />}
            {activeTab === 'GenerarFicha' && <GenerarFichaTab id={id} />}
          </div>
        </div>
      </section>
    </div>
  );
}
