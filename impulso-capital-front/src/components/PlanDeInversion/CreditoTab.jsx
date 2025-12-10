import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import config from '../../config';

export default function CreditoTab({ id }) {
  const [data, setData] = useState({ caracterizacion_id: id });
  const [tableName] = useState('pi_credito');
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState(null);
  const [error, setError] = useState(null);

  // Mapeo de nombres de campos de BD a nombres de visualización
  const fieldLabels = {
    'entidad_credito': 'Entidad financiera que otorga el crédito',
    'numero_credito': 'Número de crédito',
    'monto_credito': 'Monto del crédito inicial',
    'fecha_desembolso': 'Fecha de desembolso',
    'numero_cuotas': 'Número de cuotas',
    'numero_cuotasPagadas': 'Número de cuotas pagadas',
    'Valor_cuota_mensual': 'Valor de la cuota mensual',
    'estado_credito': 'Estado actual del crédito',
    'valor_mora': 'Valor de la Mora',
    'cuotas_por_pagar': '¿Cuántas cuotas quedan por pagar?',
    'monto_por_pagar': '¿Qué monto queda por pagar?',
    'pago_capital_deuda': '¿Cuánto corresponde a pago a capital de la deuda?',
    'intereses': '¿Cuánto corresponde a intereses?',
    'finalizacion_vencimiento_credito': '¿El término de finalización o vencimiento del crédito está programado dentro de los cuatro (4) meses siguientes respecto del momento de la asistencia técnica?',
    'valor_capitalizar': '¿Qué valor se espera capitalizará con el programa a través de esta modalidad?',
    'justificacion_cobertura_deuda': 'Justificación cobertura de deuda comercial financiera:',
    'certificacion_deuda': '¿Anexa certificación de la deuda comercial?',
    'certificacion_bancaria': '¿Anexa certificación bancaria?',
    'entidadFinanciera_lineamientos': '¿La entidad financiera cumple con los lineamientos de supervisión y regulación establecidos por los entes competentes, de acuerdo con las disposiciones definidas en la guía operativa?',
    'certificacionExpedidad_entidad': '¿La certificación fue expedida directamente por la entidad financiera acreedora y cuenta con membrete institucional, sello oficial y/o firma autorizada?',
    'certificacionIncluye_datos': '¿La certificación incluye el nombre o razón social del negocio local o beneficiario, el número de identificación y coincide con la información registrada en la inscripción al programa?',
    'certificacion_fechaExpedicion': '¿La certificación de deuda comercial y bancaria presenta una fecha de expedición superior a treinta (30) días calendario?'
  };

  // Campos que deben ser listas desplegables
  const selectFields = {
    'entidad_credito': [
      'Addi',
      'Alpina – Fondo de Empleados',
      'Avista',
      'Bancamía',
      'Bancolombia',
      'Banco AV Villas',
      'Banco Caja Social',
      'Banco Cooperativo Coopcentral',
      'Banco Davivienda',
      'Banco de Bogotá',
      'Banco de Occidente',
      'Banco Falabella',
      'Banco Finandina',
      'Banco Pichincha',
      'Banco Popular',
      'Banco Serfinanza',
      'BBVA Colombia',
      'Cafam (Caja de Compensación)',
      'Cafam – Fondo de Empleados',
      'Colsubsidio',
      'Coltefinanciera',
      'Comfama',
      'Comfacor',
      'Comfandi',
      'Comfandi – Fondo de Empleados',
      'Comfama – Fondo de Empleados',
      'Comfenalco (Antioquia, Valle, etc.)',
      'Coopava',
      'Coomeva Cooperativa',
      'Confiar Cooperativa Financiera',
      'Crediflores',
      'Creafam',
      'FECODECOL – Fondo de Empleados de Ecopetrol',
      'Financiera Progressa',
      'Finesa',
      'FINAGRO',
      'Finansol',
      'Fondo Emprender (capital semilla, no crédito directo al público)',
      'Fondo Nacional de Garantías (FNG)',
      'Giros & Finanzas',
      'Itau Colombia',
      'Juriscoop',
      'Lineru',
      'Monet',
      'OmniBank',
      'Rapicredit',
      'RappiCredit',
      'RappiPay (Compañía de financiamiento)',
      'Scotiabank Colpatria',
      'Sempli (crédito para empresas)',
      'Tuya'
    ],
    'estado_credito': ['Al día', 'En Mora'],
    'finalizacion_vencimiento_credito': ['Si', 'No'],
    'certificacion_deuda': ['Si', 'No'],
    'certificacion_bancaria': ['Si', 'No'],
    'entidadFinanciera_lineamientos': ['Si', 'No'],
    'certificacionExpedidad_entidad': ['Si', 'No'],
    'certificacionIncluye_datos': ['Si', 'No'],
    'certificacion_fechaExpedicion': ['Si', 'No']
  };

  // Campos que deben tener formato de moneda (sin decimales, con $)
  const currencyFields = [
    'monto_credito',
    'Valor_cuota_mensual',
    'valor_mora',
    'monto_por_pagar',
    'pago_capital_deuda',
    'intereses',
    'valor_capitalizar'
  ];

  // Campos que deben ser de tipo fecha
  const dateFields = ['fecha_desembolso'];

  // Campos que deben ser numéricos (sin formato de moneda)
  const numericFields = [
    'numero_credito',
    'numero_cuotas',
    'numero_cuotasPagadas',
    'cuotas_por_pagar'
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Intentar obtener registro existente
        try {
          const recordResponse = await axios.get(
            `${config.urls.inscriptions.pi}/tables/${tableName}/records?caracterizacion_id=${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (recordResponse.data && recordResponse.data.length > 0) {
            const record = recordResponse.data[0];
            // Formatear campos de moneda al cargar
            currencyFields.forEach(field => {
              if (record[field]) {
                record[field] = formatCurrency(record[field]);
              }
            });
            // La fecha se mantiene en formato YYYY-MM-DD para el input type="date"
            setData(record);
            setRecordId(record.id);
          }
        } catch (recordError) {
          // No hay registro existente, continuar
          console.log('No se encontró registro existente');
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    // Si es un campo de moneda, permitir que el usuario escriba
    if (currencyFields.includes(name)) {
      newValue = value;
    }
    // Si es un campo numérico, solo permitir dígitos
    else if (numericFields.includes(name)) {
      newValue = value.replace(/\D/g, '');
    }
    // Si es un campo de fecha, guardar en formato YYYY-MM-DD para el input type="date"
    // pero también mantener una versión formateada para mostrar
    else if (dateFields.includes(name)) {
      // El input type="date" siempre devuelve YYYY-MM-DD
      newValue = value;
    }

    setData({ ...data, [name]: newValue });
  };

  // Manejar blur para formatear campos de moneda
  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (currencyFields.includes(name) && value) {
      const formatted = formatCurrency(value);
      setData({ ...data, [name]: formatted });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const recordData = { ...data, caracterizacion_id: id };
      const userId = localStorage.getItem('id');
      recordData.user_id = userId;

      // Preparar datos para guardar
      // Convertir campos de moneda a solo números
      currencyFields.forEach(field => {
        if (recordData[field]) {
          recordData[field] = parseCurrency(recordData[field]);
        }
      });

      // La fecha ya está en formato YYYY-MM-DD del input type="date", no necesita conversión

      if (recordId) {
        // Actualizar registro existente
        await axios.put(
          `${config.urls.inscriptions.pi}/tables/${tableName}/record/${recordId}`,
          recordData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Datos de crédito actualizados exitosamente');
      } else {
        // Crear nuevo registro
        const response = await axios.post(
          `${config.urls.inscriptions.pi}/tables/${tableName}/record`,
          recordData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRecordId(response.data.id);
        alert('Datos de crédito guardados exitosamente');
      }
    } catch (error) {
      console.error('Error guardando los datos:', error);
      alert('Error al guardar los datos');
    }
  };

  // Función para obtener el valor del input type="date" desde DD/MM/YYYY
  const getDateInputValue = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return dateStr;
  };

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
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <i className="fas fa-money-bill-wave mr-2"></i>
          Crédito
        </h3>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          {/* Sección Principal */}
          <div className="form-section mb-4">
            <h5 className="mb-3" style={{ fontWeight: 'bold' }}>Información del Crédito</h5>
            
            <div className="form-group">
              <label htmlFor="entidad_credito">
                {fieldLabels['entidad_credito']}
              </label>
              <select
                className="form-control"
                id="entidad_credito"
                name="entidad_credito"
                value={data.entidad_credito || ''}
                onChange={handleChange}
              >
                <option value="">-- Selecciona una entidad --</option>
                {selectFields['entidad_credito'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="numero_credito">
                {fieldLabels['numero_credito']}
              </label>
              <input
                type="text"
                className="form-control"
                id="numero_credito"
                name="numero_credito"
                value={data.numero_credito || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="monto_credito">
                {fieldLabels['monto_credito']}
              </label>
              <input
                type="text"
                className="form-control"
                id="monto_credito"
                name="monto_credito"
                value={data.monto_credito || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="$ 0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="fecha_desembolso">
                {fieldLabels['fecha_desembolso']}
              </label>
              <input
                type="date"
                className="form-control"
                id="fecha_desembolso"
                name="fecha_desembolso"
                value={getDateInputValue(data.fecha_desembolso || '')}
                onChange={handleChange}
              />
              {data.fecha_desembolso && (
                <small className="form-text text-muted">
                  Fecha seleccionada: {formatDateForDisplay(data.fecha_desembolso)}
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="numero_cuotas">
                {fieldLabels['numero_cuotas']}
              </label>
              <input
                type="text"
                className="form-control"
                id="numero_cuotas"
                name="numero_cuotas"
                value={data.numero_cuotas || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="numero_cuotasPagadas">
                {fieldLabels['numero_cuotasPagadas']}
              </label>
              <input
                type="text"
                className="form-control"
                id="numero_cuotasPagadas"
                name="numero_cuotasPagadas"
                value={data.numero_cuotasPagadas || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Valor_cuota_mensual">
                {fieldLabels['Valor_cuota_mensual']}
              </label>
              <input
                type="text"
                className="form-control"
                id="Valor_cuota_mensual"
                name="Valor_cuota_mensual"
                value={data.Valor_cuota_mensual || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="$ 0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="estado_credito">
                {fieldLabels['estado_credito']}
              </label>
              <select
                className="form-control"
                id="estado_credito"
                name="estado_credito"
                value={data.estado_credito || ''}
                onChange={handleChange}
              >
                <option value="">-- Selecciona una opción --</option>
                {selectFields['estado_credito'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="valor_mora">
                {fieldLabels['valor_mora']}
              </label>
              <input
                type="text"
                className="form-control"
                id="valor_mora"
                name="valor_mora"
                value={data.valor_mora || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="$ 0"
              />
            </div>
          </div>

          {/* Sección: Estado actual del crédito */}
          <div className="form-section mb-4" style={{ borderTop: '2px solid #dee2e6', paddingTop: '20px' }}>
            <h5 className="mb-3" style={{ fontWeight: 'bold' }}>Estado actual del crédito</h5>

            <div className="form-group">
              <label htmlFor="cuotas_por_pagar">
                {fieldLabels['cuotas_por_pagar']}
              </label>
              <input
                type="text"
                className="form-control"
                id="cuotas_por_pagar"
                name="cuotas_por_pagar"
                value={data.cuotas_por_pagar || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="monto_por_pagar">
                {fieldLabels['monto_por_pagar']}
              </label>
              <input
                type="text"
                className="form-control"
                id="monto_por_pagar"
                name="monto_por_pagar"
                value={data.monto_por_pagar || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="$ 0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="pago_capital_deuda">
                {fieldLabels['pago_capital_deuda']}
              </label>
              <input
                type="text"
                className="form-control"
                id="pago_capital_deuda"
                name="pago_capital_deuda"
                value={data.pago_capital_deuda || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="$ 0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="intereses">
                {fieldLabels['intereses']}
              </label>
              <input
                type="text"
                className="form-control"
                id="intereses"
                name="intereses"
                value={data.intereses || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="$ 0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="finalizacion_vencimiento_credito">
                {fieldLabels['finalizacion_vencimiento_credito']}
              </label>
              <select
                className="form-control"
                id="finalizacion_vencimiento_credito"
                name="finalizacion_vencimiento_credito"
                value={data.finalizacion_vencimiento_credito || ''}
                onChange={handleChange}
              >
                <option value="">-- Selecciona una opción --</option>
                {selectFields['finalizacion_vencimiento_credito'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="valor_capitalizar">
                {fieldLabels['valor_capitalizar']}
              </label>
              <input
                type="text"
                className="form-control"
                id="valor_capitalizar"
                name="valor_capitalizar"
                value={data.valor_capitalizar || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="$ 0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="justificacion_cobertura_deuda">
                {fieldLabels['justificacion_cobertura_deuda']}
              </label>
              <textarea
                className="form-control"
                id="justificacion_cobertura_deuda"
                name="justificacion_cobertura_deuda"
                value={data.justificacion_cobertura_deuda || ''}
                onChange={handleChange}
                rows={4}
              />
            </div>

            <div className="form-group">
              <label htmlFor="certificacion_deuda">
                {fieldLabels['certificacion_deuda']}
              </label>
              <select
                className="form-control"
                id="certificacion_deuda"
                name="certificacion_deuda"
                value={data.certificacion_deuda || ''}
                onChange={handleChange}
              >
                <option value="">-- Selecciona una opción --</option>
                {selectFields['certificacion_deuda'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="certificacion_bancaria">
                {fieldLabels['certificacion_bancaria']}
              </label>
              <select
                className="form-control"
                id="certificacion_bancaria"
                name="certificacion_bancaria"
                value={data.certificacion_bancaria || ''}
                onChange={handleChange}
              >
                <option value="">-- Selecciona una opción --</option>
                {selectFields['certificacion_bancaria'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sección: Verificación */}
          <div className="form-section mb-4" style={{ borderTop: '2px solid #dee2e6', paddingTop: '20px' }}>
            <h5 className="mb-3" style={{ fontWeight: 'bold' }}>Verificación</h5>

            <div className="form-group">
              <label htmlFor="entidadFinanciera_lineamientos">
                {fieldLabels['entidadFinanciera_lineamientos']}
              </label>
              <select
                className="form-control"
                id="entidadFinanciera_lineamientos"
                name="entidadFinanciera_lineamientos"
                value={data.entidadFinanciera_lineamientos || ''}
                onChange={handleChange}
              >
                <option value="">-- Selecciona una opción --</option>
                {selectFields['entidadFinanciera_lineamientos'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="certificacionExpedidad_entidad">
                {fieldLabels['certificacionExpedidad_entidad']}
              </label>
              <select
                className="form-control"
                id="certificacionExpedidad_entidad"
                name="certificacionExpedidad_entidad"
                value={data.certificacionExpedidad_entidad || ''}
                onChange={handleChange}
              >
                <option value="">-- Selecciona una opción --</option>
                {selectFields['certificacionExpedidad_entidad'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="certificacionIncluye_datos">
                {fieldLabels['certificacionIncluye_datos']}
              </label>
              <select
                className="form-control"
                id="certificacionIncluye_datos"
                name="certificacionIncluye_datos"
                value={data.certificacionIncluye_datos || ''}
                onChange={handleChange}
              >
                <option value="">-- Selecciona una opción --</option>
                {selectFields['certificacionIncluye_datos'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="certificacion_fechaExpedicion">
                {fieldLabels['certificacion_fechaExpedicion']}
              </label>
              <select
                className="form-control"
                id="certificacion_fechaExpedicion"
                name="certificacion_fechaExpedicion"
                value={data.certificacion_fechaExpedicion || ''}
                onChange={handleChange}
              >
                <option value="">-- Selecciona una opción --</option>
                {selectFields['certificacion_fechaExpedicion'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-save mr-2"></i>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreditoTab.propTypes = {
  id: PropTypes.string.isRequired,
};

