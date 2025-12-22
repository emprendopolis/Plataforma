import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

export default function ArriendoTab({ id }) {
  const [data, setData] = useState({ caracterizacion_id: id });
  const [tableName] = useState('pi_arriendo');
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [error, setError] = useState(null);

  // Mapeo de nombres de campos para mostrar etiquetas más amigables
  const fieldNameMapping = {
    'arrendador_tipoPersona': 'Arrendador: tipo de persona',
    'nombreArrendador': 'Nombre del arrendador y/o inmobiliaria',
    'tipoDocumento': 'Tipo de Documento de Identidad',
    'numeroIdentificacion_arrendador': 'Número de Identificacion de Arrendador y/o Inmobiliaria',
    'fechaInicio_contrato': 'Fecha inicio del contrato',
    'fechaFinalizacion_contrato': 'Fecha de finalización del contrato',
    'valorMensual_canon': 'Valor mensual del canon de arrendamiento',
    'mesesAdeudados': 'Meses o periodos adeudados',
    'valorPendientePago': 'Valor pendiente de pago',
    'valorInteresesMora': 'Valor de Intereses generados por la mora',
    'contratoAutenticado': '¿El contrato se encuentra debidamente autenticado ante notaría, garantizando la validez jurídica del documento y la verificación de las firmas de las partes intervinientes?',
    'verificacionDocumentoidentidad': '¿Se verificó que el documento de identidad o Registro mercantil del arrendador, según corresponda, cumpla con los requisitos establecidos en la guía operativa, entre ellos que, los datos de identificación coincidan con los registrados en el contrato de arrendamiento?',
    'documentoVigente': '¿Este documento se encuentra vigente? (no mayor a 60 días)',
    'inmuebleCorrespondeDireccion': '¿El inmueble corresponde a la dirección indicada en el contrato?',
    'propietarioInmueble': '¿El propietario del inmueble coincide con el arrendador?',
    'titularCuenta': '¿El titular de la cuenta es del arrendador o inmobiliaria autorizada en el contrato?',
    'certificadoDeuda': '¿El certificado de deuda emitido por concepto de arrendamiento cumple con la totalidad de los requisitos formales y de contenido establecidos en la guía operativa vigente, garantizando su validez y conformidad con los lineamientos institucionales?',
    'justificacionPagocanon': 'Justificación pago canón de arrendamiento'
  };

  // Opciones para los campos de selección
  const fieldOptions = {
    'arrendador_tipoPersona': ['Natural', 'Jurídica', 'Inmobiliaria'],
    'tipoDocumento': ['CC', 'CE']
  };

  // Campos que deben tener formato de moneda (sin decimales, con $)
  const currencyFields = [
    'valorMensual_canon',
    'valorPendientePago',
    'valorInteresesMora'
  ];

  // Campos de fecha
  const dateFields = [
    'fechaInicio_contrato',
    'fechaFinalizacion_contrato'
  ];

  // Campos de verificación (tabla)
  const verificationFields = [
    'contratoAutenticado',
    'verificacionDocumentoidentidad',
    'documentoVigente',
    'inmuebleCorrespondeDireccion',
    'propietarioInmueble',
    'titularCuenta',
    'certificadoDeuda'
  ];

  // Función para obtener el nombre de visualización de un campo
  const getDisplayName = (fieldName) => {
    return fieldNameMapping[fieldName] || fieldName;
  };

  // Función para verificar si un campo debe ser un select
  const isSelectField = (fieldName) => {
    return fieldOptions.hasOwnProperty(fieldName);
  };

  // Función para formatear número a moneda (sin decimales, con $)
  const formatCurrency = (value) => {
    if (!value) return '';
    // Remover todo lo que no sea dígito
    const numericValue = value.toString().replace(/\D/g, '');
    if (!numericValue) return '';
    // Formatear con separadores de miles
    return `$ ${parseInt(numericValue, 10).toLocaleString('es-CO')}`;
  };

  // Función para obtener solo el número de un valor formateado como moneda
  const parseCurrency = (value) => {
    if (!value) return '';
    return value.toString().replace(/\D/g, '');
  };

  // Función para formatear fecha de YYYY-MM-DD a DD/MM/YYYY para mostrar
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    // Si está en formato YYYY-MM-DD, convertir a DD/MM/YYYY
    if (dateStr.includes('-') && dateStr.length === 10) {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Función para formatear fecha de DD/MM/YYYY a YYYY-MM-DD para guardar
  const formatDateForSave = (dateStr) => {
    if (!dateStr) return '';
    // Si ya está en formato DD/MM/YYYY, convertir a YYYY-MM-DD
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return dateStr;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Intentar obtener registro existente
        try {
          const recordResponse = await axios.get(
            `${config.urls.inscriptions.base}/pi/tables/${tableName}/records?caracterizacion_id=${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (recordResponse.data && recordResponse.data.length > 0) {
            const record = recordResponse.data[0];
            
            // Formatear fechas para mostrar
            dateFields.forEach(field => {
              if (record[field]) {
                record[field] = formatDateForDisplay(record[field]);
              }
            });

            // Formatear campos de moneda para mostrar
            currencyFields.forEach(field => {
              if (record[field]) {
                record[field] = formatCurrency(record[field]);
              }
            });

            setData(record);
            setRecordId(record.id);
          } else {
            setData({ caracterizacion_id: id });
          }
        } catch (recordError) {
          console.log('No se encontró registro existente');
          setData({ caracterizacion_id: id });
        }
      } catch (error) {
        console.error('Error obteniendo los datos:', error);
        setError('Error obteniendo los datos');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [tableName, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    // Si es un campo de moneda, permitir que el usuario escriba
    if (currencyFields.includes(name)) {
      newValue = value;
    }
    // Si es un campo de fecha, mantener el formato DD/MM/YYYY
    else if (dateFields.includes(name)) {
      newValue = value;
    }

    setData({ ...data, [name]: newValue });
  };

  // Manejar cambio en campos de verificación (Si/No)
  const handleVerificationChange = (fieldName, value) => {
    setData({ ...data, [fieldName]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const recordData = { ...data, caracterizacion_id: id };
      const userId = localStorage.getItem('id');
      recordData.user_id = userId;

      // Convertir fechas al formato para guardar
      dateFields.forEach(field => {
        if (recordData[field]) {
          recordData[field] = formatDateForSave(recordData[field]);
        }
      });

      // Convertir campos de moneda al formato numérico para guardar
      currencyFields.forEach(field => {
        if (recordData[field]) {
          recordData[field] = parseCurrency(recordData[field]);
        }
      });

      if (recordId) {
        // Actualizar registro existente
        await axios.put(
          `${config.urls.inscriptions.base}/pi/tables/${tableName}/record/${recordId}`,
          recordData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Datos de arriendo actualizados exitosamente');
      } else {
        // Crear nuevo registro
        const response = await axios.post(
          `${config.urls.inscriptions.base}/pi/tables/${tableName}/record`,
          recordData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRecordId(response.data.id || response.data.record?.id);
        alert('Datos de arriendo guardados exitosamente');
      }
    } catch (error) {
      console.error('Error guardando los datos:', error);
      alert('Error al guardar los datos');
    }
  };

  // Obtener el rol del usuario
  const getLoggedUserRoleId = () => {
    return localStorage.getItem('role_id') || null;
  };
  const role = getLoggedUserRoleId();

  // Campos normales (no de verificación)
  const normalFields = [
    'arrendador_tipoPersona',
    'nombreArrendador',
    'tipoDocumento',
    'numeroIdentificacion_arrendador',
    'fechaInicio_contrato',
    'fechaFinalizacion_contrato',
    'valorMensual_canon',
    'mesesAdeudados',
    'valorPendientePago',
    'valorInteresesMora'
  ];

  if (loading) {
    return (
      <div className="text-center">
        <i className="fas fa-spinner fa-spin"></i> Cargando...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        {error}
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', alignItems: 'start' }}>
          {/* Campos normales */}
          {normalFields.map((fieldName) => (
            <div 
              key={fieldName} 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gridColumn: fieldName === 'nombreArrendador' ? '1 / -1' : 'span 1'
              }}
            >
              <label style={{ 
                padding: '5px 10px 2px 10px', 
                minHeight: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: '2px'
              }}>
                {getDisplayName(fieldName)}
              </label>
              
              {isSelectField(fieldName) ? (
                <select
                  name={fieldName}
                  className="form-control"
                  value={data[fieldName] || ''}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    minHeight: '40px'
                  }}
                  disabled={role === '3'}
                >
                  <option value="">-- Selecciona una opción --</option>
                  {fieldOptions[fieldName].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : dateFields.includes(fieldName) ? (
                <>
                  <input
                    type="date"
                    name={fieldName}
                    className="form-control"
                    value={data[fieldName] ? (() => {
                      // Convertir DD/MM/YYYY a YYYY-MM-DD para el input type="date"
                      if (data[fieldName].includes('/')) {
                        const parts = data[fieldName].split('/');
                        if (parts.length === 3) {
                          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        }
                      }
                      // Si ya está en formato YYYY-MM-DD, devolverlo
                      if (data[fieldName].includes('-') && data[fieldName].length === 10) {
                        return data[fieldName];
                      }
                      return '';
                    })() : ''}
                    onChange={(e) => {
                      // Convertir YYYY-MM-DD a DD/MM/YYYY
                      const value = e.target.value;
                      if (value) {
                        const parts = value.split('-');
                        if (parts.length === 3) {
                          const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                          setData({ ...data, [fieldName]: formattedDate });
                        }
                      } else {
                        setData({ ...data, [fieldName]: '' });
                      }
                    }}
                    style={{
                      width: '100%',
                      minHeight: '40px'
                    }}
                    disabled={role === '3'}
                  />
                  {data[fieldName] && (
                    <small className="form-text text-muted" style={{ padding: '5px 10px', display: 'block' }}>
                      Fecha seleccionada: {data[fieldName]}
                    </small>
                  )}
                </>
              ) : currencyFields.includes(fieldName) ? (
                <input
                  type="text"
                  name={fieldName}
                  className="form-control"
                  value={data[fieldName] || ''}
                  onChange={handleChange}
                  onBlur={(e) => {
                    // Formatear al perder el foco
                    const value = e.target.value;
                    if (value) {
                      const formatted = formatCurrency(value);
                      setData({ ...data, [fieldName]: formatted });
                    }
                  }}
                  placeholder="$ 0"
                  style={{
                    width: '100%',
                    minHeight: '40px'
                  }}
                  disabled={role === '3'}
                />
              ) : fieldName === 'mesesAdeudados' ? (
                <input
                  type="number"
                  name={fieldName}
                  className="form-control"
                  value={data[fieldName] || ''}
                  onChange={handleChange}
                  min="0"
                  style={{
                    width: '100%',
                    minHeight: '40px'
                  }}
                  disabled={role === '3'}
                />
              ) : (
                <input
                  type="text"
                  name={fieldName}
                  className="form-control"
                  value={data[fieldName] || ''}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    minHeight: '40px'
                  }}
                  disabled={role === '3'}
                />
              )}
            </div>
          ))}
        </div>

        {/* Tabla de verificaciones */}
        <div style={{ marginTop: '24px' }}>
          <h5 style={{ marginBottom: '16px' }}>Verificaciones</h5>
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-bordered" style={{ marginBottom: '0' }}>
              <thead className="thead-light">
                <tr>
                  <th style={{ width: '60%' }}>Ítem</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>Sí</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>No</th>
                </tr>
              </thead>
              <tbody>
                {verificationFields.map((fieldName) => (
                  <tr key={fieldName}>
                    <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                      {getDisplayName(fieldName)}
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <input
                        type="radio"
                        name={fieldName}
                        value="Si"
                        checked={data[fieldName] === 'Si'}
                        onChange={(e) => handleVerificationChange(fieldName, e.target.value)}
                        disabled={role === '3'}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: role === '3' ? 'not-allowed' : 'pointer'
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <input
                        type="radio"
                        name={fieldName}
                        value="No"
                        checked={data[fieldName] === 'No'}
                        onChange={(e) => handleVerificationChange(fieldName, e.target.value)}
                        disabled={role === '3'}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: role === '3' ? 'not-allowed' : 'pointer'
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Campo de justificación */}
        <div style={{ marginTop: '24px' }}>
          <label style={{ 
            padding: '5px 10px 2px 10px', 
            minHeight: 'auto',
            display: 'flex',
            alignItems: 'flex-start',
            marginBottom: '2px'
          }}>
            {getDisplayName('justificacionPagocanon')}
          </label>
          <textarea
            name="justificacionPagocanon"
            className="form-control"
            value={data.justificacionPagocanon || ''}
            onChange={handleChange}
            rows={4}
            style={{
              width: '100%',
              resize: 'both'
            }}
            readOnly={role === '3'}
          />
        </div>

        {/* Botón de guardar */}
        {role !== '3' && (
          <div style={{ marginTop: '24px' }}>
            <button type="submit" className="btn btn-primary">
              {recordId ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

ArriendoTab.propTypes = {
  id: PropTypes.string.isRequired,
};
