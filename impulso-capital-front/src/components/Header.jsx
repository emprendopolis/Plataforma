import { useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  // Mapeo de rutas a títulos
  const routeTitles = {
    '/provider-tables': 'Proveedores',
    '/dynamic-tables': 'Empresas',
    '/pi-tables': 'Listado Final',
    '/descarga-masiva': 'Descarga Masiva',
    '/users': 'Usuarios',
    // Agrega más rutas y títulos según tu app
  };

  // Detectar si la ruta es /plan-inversion/:id
  let mainTitle = '';
  const planInversionMatch = location.pathname.match(/^\/plan-inversion\/(\d+)$/);
  if (planInversionMatch) {
    mainTitle = `Plan de Inversión - ID ${planInversionMatch[1]}`;
  } else {
    mainTitle = routeTitles[location.pathname] || 'Panel'; // Título por defecto
  }

  return (
    <nav 
      className="main-header navbar navbar-expand navbar-white navbar-light" 
      style={{ 
        height: '61px', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        zIndex: 1050, 
        background: '#fff', 
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        // Forzar estilos con !important
        backgroundColor: '#fff !important',
        borderBottomColor: '#e5e5e5 !important',
      }}
    >
      <span style={{ fontSize: '1.15rem', fontWeight: 'bold', marginLeft: 20 }}>
        {mainTitle}
      </span>
    </nav>
  );
}