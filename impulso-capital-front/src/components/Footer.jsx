import './css/Footer.css'; // Importar el archivo de estilos

export default function Footer() {
  return (
    <>
      <footer className="main-footer fixed-footer">
        <div className="float-right d-none d-sm-block">
          <b>Version</b> 2.0
        </div>
        <strong>
          Copyright © 2024 <a href="#">Impulso Local - Software desarrollado por QAAST</a>.
        </strong>{' '}
        Todos los derechos reservados
      </footer>
      <aside className="control-sidebar control-sidebar-dark">
        {/* Control sidebar content goes here */}
      </aside>
    </>
  );
}



