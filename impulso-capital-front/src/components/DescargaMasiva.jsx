import { useState } from 'react';
import axios from 'axios';
import { FaPlay, FaCheck } from 'react-icons/fa';

export default function DescargaMasiva() {
  const [cedulasText, setCedulasText] = useState('');
  const [progress, setProgress] = useState([]);
  const [downloading, setDownloading] = useState(false);

  // Extrae cédulas únicas, limpias, una por línea
  const cedulas = Array.from(
    new Set(
      cedulasText
        .split('\n')
        .map(cedula => cedula.trim())
        .filter(cedula => cedula.length > 0)
    )
  );

  const handleDownload = async () => {
    setDownloading(true);
    setProgress([]);
    
    // Obtener la URL base de la API (desarrollo vs producción)
    const baseURL = import.meta.env.VITE_API_URL || '';
    
    // Log temporal para debugging en producción
    console.log('🔍 Debug - Variables de entorno:', {
      VITE_API_URL: import.meta.env.VITE_API_URL,
      baseURL: baseURL,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE
    });
    
    for (const cedula of cedulas) {
      try {
        // Mostrar indicador de descarga
        setProgress(prev => [...prev, `Cédula ${cedula}: ⏳ Descargando...`]);
        
        // 1. Primero obtener la información de la cédula (nombre completo)
        const token = localStorage.getItem('token');
        
        const infoResponse = await axios.get(
          `${baseURL}/test-cedula/${cedula}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (!infoResponse.data.success) {
          throw new Error(infoResponse.data.error || 'Error obteniendo información de la cédula');
        }
        
        const { folderName } = infoResponse.data;
        
        if (!folderName) {
          throw new Error('No se pudo obtener el nombre de la carpeta');
        }
        
        // 2. Ahora descargar el archivo ZIP con el nombre correcto
        const downloadResponse = await axios.get(
          `${baseURL}/descarga-documentos-cedula/${cedula}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
          }
        );
        
        // 3. Descargar el archivo ZIP con el nombre correcto
        const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${folderName}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        // Reemplazar el indicador de descarga con el resultado exitoso
        setProgress(prev => prev.map(item => 
          item === `Cédula ${cedula}: ⏳ Descargando...` 
            ? `Cédula ${cedula}: Descarga exitosa` 
            : item
        ));
        
      } catch (error) {
        console.error(`Error procesando cédula ${cedula}:`, error);
        
        // Determinar el mensaje final según el tipo de error
        let finalMessage = '';
        
        if (error.response) {
          if (error.response.status === 404) {
            finalMessage = `Cédula ${cedula}: Sin documentos`;
          } else if (error.response.status === 500) {
            // Verificar si es específicamente "Cédula no encontrada"
            const responseMessage = error.response.data?.message || '';
            const errorMessage = error.message || '';
            
            if (responseMessage.includes('Cédula no encontrada') || 
                responseMessage.includes('no se encontraron archivos') ||
                responseMessage.includes('Cédula no encontrada en la base de datos') ||
                errorMessage.includes('Cédula no encontrada') ||
                errorMessage.includes('no se encontraron archivos')) {
              finalMessage = `Cédula ${cedula}: Cedula no encontrada`;
            } else {
              finalMessage = `Cédula ${cedula}: Error del servidor`;
            }
          } else if (error.response.status === 401) {
            finalMessage = `Cédula ${cedula}: Error de autenticación`;
          } else {
            finalMessage = `Cédula ${cedula}: Error ${error.response.status}`;
          }
        } else if (error.message) {
          if (error.message.includes('Cédula no encontrada') || 
              error.message.includes('no se encontraron archivos') ||
              error.message.includes('Cédula no encontrada en la base de datos')) {
            finalMessage = `Cédula ${cedula}: Cedula no encontrada`;
          } else {
            finalMessage = `Cédula ${cedula}: ${error.message}`;
          }
        } else {
          finalMessage = `Cédula ${cedula}: Error desconocido`;
        }
        
        // Reemplazar el indicador de descarga con el mensaje de error
        setProgress(prev => prev.map(item => 
          item === `Cédula ${cedula}: ⏳ Descargando...` 
            ? finalMessage 
            : item
        ));
      }
    }
    setDownloading(false);
  };

  const handleClear = () => {
    setCedulasText('');
    setProgress([]);
  };

  // Función para determinar el color del resultado
  const getResultColor = (line) => {
    if (line.includes('descarga realizada')) return '#27ae60'; // verde
    if (line.includes('no se encontraron archivos') || line.includes('error en la descarga')) return '#e74c3c'; // rojo
    return '#333';
  };

  return (
    <div className="descarga-masiva-container" style={{ width: '100%', padding: 24 }}>
      <div className="card p-3 mb-3" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #e0e0e0', width: '100%' }}>
        <div style={{ marginBottom: 8, fontSize: 15 }}>
          Esta función permite realizar una descarga masiva pasándole un listado de <b>números de cédula</b> de las empresas que se desean descargar.
        </div>
        <textarea
          className="form-control"
          rows={10}
          placeholder="Coloca aquí los números de cédula, uno por línea"
          value={cedulasText}
          onChange={e => setCedulasText(e.target.value)}
          disabled={downloading}
          style={{ borderRadius: 8, fontSize: 16, background: '#fff', border: '1px solid #e0e0e0' }}
        />
      </div>
      <div className="card p-3 mb-3" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #e0e0e0', width: '100%' }}>
        <div className="d-flex align-items-center mb-3" style={{ background: '#f8fbff', border: '1px solid #e3eafc', borderRadius: 8, padding: '10px 16px' }}>
          <span style={{ color: '#2196f3', fontSize: 22, marginRight: 12, display: 'flex', alignItems: 'center' }}>
            <i className="fas fa-info-circle"></i>
          </span>
          <span style={{ fontSize: 15, color: '#222' }}>
            Se han detectado <b style={{ color: '#e74c3c' }}>{cedulas.length} cédula{cedulas.length !== 1 ? 's' : ''}</b> de empresas, si desea continuar <b>haga click</b> en el botón de abajo para iniciar el proceso de descarga.
          </span>
        </div>
        <div className="d-flex align-items-center" style={{ gap: 12 }}>
          <button
            className="btn btn-success d-flex align-items-center"
            onClick={handleDownload}
            disabled={downloading || cedulas.length === 0}
            style={{ fontWeight: 500 }}
          >
            <FaPlay style={{ marginRight: 8 }} />
            {downloading ? 'Descargando...' : 'Iniciar descarga'}
          </button>
          <button
            className="btn btn-outline-secondary d-flex align-items-center"
            onClick={handleClear}
            disabled={downloading}
            style={{ fontWeight: 500 }}
          >
            <FaCheck style={{ marginRight: 8 }} />
            Limpiar datos
          </button>
        </div>
      </div>
      <div className="card p-3 mb-3" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px #e0e0e0', width: '100%' }}>
        <div style={{ padding: 0 }}>
          <textarea
            className="form-control"
            style={{
              background: '#f6f7fa',
              borderRadius: 8,
              minHeight: 80,
              fontWeight: 500,
              fontSize: 15,
              color: '#222',
              resize: 'vertical',
              border: '1px solid #e0e0e0',
              width: '100%'
            }}
            rows={10}
            value={progress.map((line) => line).join('\n')}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
