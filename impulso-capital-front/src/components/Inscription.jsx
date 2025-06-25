import UserAddTable from './UserAddTable';
import './css/Inscription.css'; 

export default function Inscription() {
  return (
    <div className="content-wrapper">
      {/* Content Header (Page header) */}
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Módulo de Inscripción</h1>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <p>Bienvenido al módulo de inscripción. Aquí puedes crear nuevas tablas con los campos personalizados que requieras.</p>
                  
                  {/* Componente UserAddTable para crear nuevas tablas */}
                  <UserAddTable />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

