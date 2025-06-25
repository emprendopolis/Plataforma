import { useState } from 'react';
import axios from 'axios';
import { FaPlay, FaCheck } from 'react-icons/fa';

export default function DescargaMasiva() {
  const [idsText, setIdsText] = useState('');
  const [progress, setProgress] = useState([]);
  const [downloading, setDownloading] = useState(false);

  // Extrae IDs únicos, limpios, uno por línea
  const ids = Array.from(
    new Set(
      idsText
        .split('\n')
        .map(id => id.trim())
        .filter(id => id.length > 0)
    )
  );

  const handleDownload = async () => {
    setDownloading(true);
    setProgress([]);
    for (const id of ids) {
      try {
        // Llama a tu API real para descargar los documentos de ese ID
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `/api/descarga-documentos/${id}`, // <-- Cambia esto por tu endpoint real
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
          }
        );
        // Descarga el archivo ZIP para ese ID
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `documentos_empresa_${id}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();

        setProgress(prev => [...prev, `ID ${id}: descarga realizada`]);
      } catch (error) {
        if (error.response && error.response.status === 404) {
          setProgress(prev => [...prev, `ID ${id}: no se encontraron archivos`]);
        } else {
          setProgress(prev => [...prev, `ID ${id}: error en la descarga`]);
        }
      }
    }
    setDownloading(false);
  };

  const handleClear = () => {
    setIdsText('');
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
          Esta función permite realizar una descarga masiva pasándole un listado de los <b>ID</b> de las empresas que se desean descargar.
        </div>
        <textarea
          className="form-control"
          rows={10}
          placeholder="Coloca aquí los ID, uno por línea"
          value={idsText}
          onChange={e => setIdsText(e.target.value)}
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
            Se han detectado <b style={{ color: '#e74c3c' }}>{ids.length} ID{ids.length !== 1 ? 's' : ''}</b> de empresas, si desea continuar <b>haga click</b> en el botón de abajo para iniciar el proceso de descarga.
          </span>
        </div>
        <div className="d-flex align-items-center" style={{ gap: 12 }}>
          <button
            className="btn btn-success d-flex align-items-center"
            onClick={handleDownload}
            disabled={downloading || ids.length === 0}
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
