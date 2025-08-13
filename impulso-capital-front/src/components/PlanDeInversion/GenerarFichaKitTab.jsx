// GenerarFichaKitTab.jsx

import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios';
import PropTypes from 'prop-types';
import config from '../../config';

// Ruta de la imagen del banner en la carpeta public
const bannerImagePath = '/impulso-local-banner-pdf.jpeg';

export default function GenerarFichaKitTab({ id }) {
  // Estados para almacenar los datos obtenidos de la API
  const [caracterizacionData, setCaracterizacionData] = useState({});
  const [datosTab, setDatosTab] = useState({});
  const [propuestaMejoraData, setPropuestaMejoraData] = useState([]);
  const [activosActualesData, setActivosActualesData] = useState([]);
  const [formulacionData, setFormulacionData] = useState([]);
  const [formulacionKitData, setFormulacionKitData] = useState([]); // Cambio: datos de formulación de kits
  const [providersData, setProvidersData] = useState([]);
  const [groupedRubros, setGroupedRubros] = useState([]);
  const [totalInversion, setTotalInversion] = useState(0);
  const [relatedData, setRelatedData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados para almacenar los nombres del asesor y del emprendedor
  const [asesorNombre, setAsesorNombre] = useState('');
  const [emprendedorNombre, setEmprendedorNombre] = useState('');
  const [asesorDocumento, setAsesorDocumento] = useState('');

  // Estado para almacenar el nombre de la localidad
  const [localidadName, setLocalidadName] = useState('');

  // Lista de campos a excluir de la sección de datos
  const datosKeys = [
    "Tiempo de dedicacion al negocio (Parcial o Completo)",
    "Descripcion general del negocio",
    "Descripcion de el lugar donde desarrolla la actividad",
    "Descripcion de los activos del negocio",
    "Valor aproximado de los activos del negocio",
    "Total costos fijos mensuales",
    "Total costos variables",
    "Total gastos mensuales",
    "Total ventas mensuales del negocio",
    "Descripcion de la capacidad de produccion",
    "Valor de los gastos familiares mensuales promedio",
    "Lleva registros separados de finanzas personales y del negocio",
    "Usa billeteras moviles",
    "Cual",
    "Concepto y justificacion del valor de la capitalizacion",
    "Como contribuira la inversion a la mejora productiva del negocio",
    "El negocio es sujeto de participacion en espacios de conexion",
    "Recomendaciones tecnica, administrativas y financieras",
    "id",
    "localidad_unidad_negocio"
  ];

  // Estados para manejar monto disponible y contrapartida
  const [montoDisponible, setMontoDisponible] = useState(3000000); // 3 millones
  const [contrapartida, setContrapartida] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        console.error("El ID del registro de caracterización no está definido.");
        setErrorMsg("El ID del registro de caracterización no está definido.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          console.error("Token de autenticación no encontrado.");
          setErrorMsg("Token de autenticación no encontrado. Por favor, inicia sesión nuevamente.");
          setLoading(false);
          return;
        }

        // Realizar solicitudes en paralelo
        const [
          caracterizacionResponse,
          fieldsResponse,
          datosResponse,
          propuestaMejoraResponse,
          activosActualesResponse,
          formulacionResponse,
          formulacionKitResponse, // Cambio: formulación de kits
          providersResponse
        ] = await Promise.all([
          axios.get(`${config.urls.inscriptions.tables}/inscription_caracterizacion/record/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${config.urls.inscriptions.pi}/tables/inscription_caracterizacion/related-data`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${config.urls.inscriptions.pi}/tables/pi_datos/records?caracterizacion_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${config.urls.inscriptions.pi}/tables/pi_propuesta_mejora/records?caracterizacion_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${config.urls.inscriptions.pi}/tables/pi_activos/records?caracterizacion_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${config.urls.inscriptions.pi}/tables/pi_formulacion/records?caracterizacion_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${config.urls.inscriptions.base}/master/tables/master_formulacion/records?caracterizacion_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }), // Cambio: tabla de kits (con columnas adicionales)
          axios.get(`${config.urls.inscriptions.base}/tables/kit_proveedores/records`, { headers: { Authorization: `Bearer ${token}` } }), // Cambio: proveedores de kits
        ]);

        // 1. Procesar datos de `inscription_caracterizacion`
        console.log("Datos de caracterización:", caracterizacionResponse.data.record);
        setCaracterizacionData(caracterizacionResponse.data.record);

        // 2. Procesar datos relacionados
        setRelatedData(fieldsResponse.data.relatedData || {});

        // 3. Obtener el nombre de la localidad
        const locId = caracterizacionResponse.data.record["Localidad de la unidad de negocio"];
        if (locId && fieldsResponse.data.relatedData["Localidad de la unidad de negocio"]) {
          const localidadesArray = fieldsResponse.data.relatedData["Localidad de la unidad de negocio"];
          const found = localidadesArray.find((item) => String(item.id) === String(locId));
          if (found) {
            setLocalidadName(found.displayValue);
          } else {
            setLocalidadName("Localidad no encontrada");
          }
        } else {
          setLocalidadName("Localidad no encontrada");
        }

        // 4. Obtener datos del asesor
        const asesorId = caracterizacionResponse.data.record.Asesor;
        if (asesorId) {
          const asesorResponse = await axios.get(`${config.urls.inscriptions.tables}/users/record/${asesorId}`, { headers: { Authorization: `Bearer ${token}` } });
          const asesorData = asesorResponse.data.record;
          const nombreAsesor = asesorData.username || 'No asignado';
          setAsesorNombre(nombreAsesor);
          console.log("Nombre del asesor:", nombreAsesor);

          // Obtener el documento del asesor
          const documentoAsesor = asesorData.documento || 'No disponible';
          setAsesorDocumento(documentoAsesor);
          console.log("Documento del asesor:", documentoAsesor);
        } else {
          setAsesorNombre('No asignado');
          setAsesorDocumento('No disponible');
          console.log("Asesor no asignado.");
        }

        // 5. Obtener nombre del beneficiario
        const nombreEmprendedor = [
          caracterizacionResponse.data.record["Nombres"] || '',
          caracterizacionResponse.data.record["Apellidos"] || ''
        ].filter(Boolean).join(' ');
        setEmprendedorNombre(nombreEmprendedor || '');
        console.log("Nombre del emprendedor:", nombreEmprendedor);

        // 6. Procesar datos de `pi_datos`
        if (datosResponse.data.length > 0) {
          setDatosTab(datosResponse.data[0]);
          console.log("Datos de pi_datos:", datosResponse.data[0]);
        } else {
          console.log("No se encontraron datos en pi_datos para este caracterizacion_id.");
        }

        // 7. Procesar datos de `pi_propuesta_mejora`
        setPropuestaMejoraData(propuestaMejoraResponse.data);
        console.log("Datos de pi_propuesta_mejora:", propuestaMejoraResponse.data);

        // 8. Procesar datos de `pi_activos` (Activos Actuales)
        setActivosActualesData(activosActualesResponse.data);
        console.log("Datos de pi_activos:", activosActualesResponse.data);

        // 9. Procesar datos de `pi_formulacion`
        setFormulacionData(formulacionResponse.data);
        console.log("Datos de pi_formulacion:", formulacionResponse.data);

                                           // 10. Procesar datos de `master_formulacion` (Cambio: formulación de kits con columnas adicionales)
                         setFormulacionKitData(formulacionKitResponse.data);
                         console.log("Datos de master_formulacion:", formulacionKitResponse.data);

        // 11. Procesar datos de proveedores de kits
        setProvidersData(providersResponse.data);
        console.log("Datos de proveedores de kits:", providersResponse.data);

        // 12. Calcular total inversión para kits seleccionados
        const selectedKits = formulacionKitResponse.data.filter(rec => rec.Seleccion === true);
        
        const totalInv = selectedKits.reduce((sum, rec) => {
          const cantidad = rec["Cantidad"] || 1;
          const provider = providersResponse.data.find(p => String(p.id) === String(rec.rel_id_prov));
          const precio = provider ? (provider["Precio"] || 0) : 0;
          return sum + (cantidad * precio);
        }, 0);
        
        const cpart = totalInv > montoDisponible ? totalInv - montoDisponible : 0;

        // Crear resumen por código de kit
        const resumenPorKit = {};
        selectedKits.forEach(rec => {
          const provider = providersResponse.data.find(p => String(p.id) === String(rec.rel_id_prov));
          if (provider) {
            const codigoKit = provider.codigoKit || 'Sin código';
            const cantidad = rec["Cantidad"] || 1;
            const precio = provider["Precio"] || 0;
            const subtotal = cantidad * precio;
            
            if (resumenPorKit[codigoKit]) {
              resumenPorKit[codigoKit] += subtotal;
            } else {
              resumenPorKit[codigoKit] = subtotal;
            }
          }
        });

        const resumenPorRubro = Object.entries(resumenPorKit).map(([kit, total]) => ({
          rubro: kit,
          total: total
        }));

        setGroupedRubros(resumenPorRubro);
        setTotalInversion(totalInv.toFixed(2));
        setContrapartida(cpart);

        console.log("Resumen por rubro de kits:", resumenPorRubro);
        console.log("Total inversión en kits:", totalInv);
        console.log("Contrapartida:", cpart);

        console.log("Finalizando la carga de datos. Seteando loading a false.");
        setLoading(false);
        console.log("Estado de loading:", loading);
      } catch (error) {
        console.error("Error al obtener los datos:", error);
        setErrorMsg("Error al obtener los datos. Por favor, inténtalo nuevamente más tarde.");
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Función para verificar si hay que cortar página
  const checkPageEnd = (doc, currentY, addedHeight) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (currentY + addedHeight > pageHeight - 40) { 
      doc.addPage();
      return 40; // Reiniciar yPosition en 40 después de agregar una nueva página
    }
    return currentY;
  };

  // Color de las tablas
  const tableColor = [18, 11, 42]; // #120b2a

  // Función para generar el PDF completo
  const generateFichaKitPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    const maxLineWidth = pageWidth - margin * 2;
    let yPosition = 100;

    const fontSizes = {
      title: 18,
      subtitle: 14,
      normal: 11,
    };

    // Función para convertir imagen a base64
    const getImageDataUrl = (img) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/jpeg');
    };

    // Función para obtener el tipo de documento
    const getTipoDocumento = (tipoId) => {
      // Mapeo directo de tipos de documento comunes
      const tipoMap = {
        '1': 'Cédula de Ciudadanía',
        '2': 'Tarjeta de Identidad',
        '3': 'Cédula de Extranjería',
        '4': 'Pasaporte',
        '5': 'NIT'
      };
      return tipoMap[tipoId] || `Tipo ${tipoId}`;
    };

    // Cargar la imagen y generar el PDF después
    const img = new Image();
    img.src = bannerImagePath;
    img.onload = () => {
      const imgData = getImageDataUrl(img);

      // Encabezado con imagen
      doc.addImage(imgData, 'JPEG', margin, 40, maxLineWidth, 60);
      yPosition = 130;

      // Obtener el nombre del emprendimiento y caracterizacion_id
      const nombreEmprendimiento = caracterizacionData["Nombre del emprendimiento"] || 'No disponible';
      const caracterizacionId = id || 'No disponible';

      // Agregar Nombre del Emprendimiento con ID en una sola línea
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      const tituloCompleto = `${nombreEmprendimiento} - ID: ${caracterizacionId}`;
      
      // Verificar si el texto es muy largo y dividirlo si es necesario
      const maxWidth = pageWidth - 2 * margin;
      const tituloLines = doc.splitTextToSize(tituloCompleto, maxWidth);
      
      tituloLines.forEach((line, index) => {
        doc.text(line, pageWidth / 2, yPosition + (index * 16), { align: 'center' });
      });
      
      yPosition += (tituloLines.length * 16) + 10;
      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');

      // Agregar Localidad en línea separada
      const localidadLabel = localidadName && localidadName !== "Localidad no encontrada"
        ? `Localidad: ${localidadName}`
        : '';
      
      if (localidadLabel) {
        doc.text(localidadLabel, pageWidth / 2, yPosition, { align: 'center' });
      }
      yPosition += 20;

      // Información del beneficiario
      const nombreBeneficiario = [
        caracterizacionData["Nombres"] || '',
        caracterizacionData["Apellidos"] || ''
      ].filter(Boolean).join(' ') || 'No disponible';
      
      const tipoDocumento = getTipoDocumento(caracterizacionData["Tipo de identificacion"]);
      const numeroDocumento = caracterizacionData["Numero de identificacion"] || 'No disponible';
      const grupoParticipacion = caracterizacionData["Priorizacion capitalizacion"] || 'No disponible';

      // Calcular posiciones para dos columnas
      const columnWidth = (pageWidth - 2 * margin) / 2;
      const leftX = margin;
      const rightX = margin + columnWidth + 10; // 10px de separación entre columnas

      // Información del beneficiario en formato de dos columnas
      const beneficiarioEtiquetas1 = ['Nombre del beneficiario:', 'Grupo de participación:'];
      const beneficiarioValores1 = [nombreBeneficiario, grupoParticipacion];
      const beneficiarioEtiquetas2 = ['Tipo de documento:', 'Número de documento:'];
      const beneficiarioValores2 = [tipoDocumento, numeroDocumento];

      // Fila 1: Etiquetas
      doc.setFont(undefined, 'bold');
      doc.text(beneficiarioEtiquetas1[0], leftX, yPosition);
      doc.text(beneficiarioEtiquetas1[1], rightX, yPosition);
      yPosition += 15;
      // Fila 2: Valores
      doc.setFont(undefined, 'normal');
      doc.text(beneficiarioValores1[0], leftX, yPosition);
      doc.text(beneficiarioValores1[1], rightX, yPosition);
      yPosition += 20;
      // Fila 3: Etiquetas
      doc.setFont(undefined, 'bold');
      doc.text(beneficiarioEtiquetas2[0], leftX, yPosition);
      doc.text(beneficiarioEtiquetas2[1], rightX, yPosition);
      yPosition += 15;
      // Fila 4: Valores
      doc.setFont(undefined, 'normal');
      doc.text(beneficiarioValores2[0], leftX, yPosition);
      doc.text(beneficiarioValores2[1], rightX, yPosition);
      yPosition += 20;

      // Espacio antes del título principal
      yPosition += 20;

      // 1. Título Principal (cambiado a: PLAN DE INVERSIÓN EN KITS)
      doc.setFontSize(fontSizes.title);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("Plan de Inversión en Kits", pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 20;

      // 2. Mostrar información de datosTab (filtrando campos no deseados)
      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');
      yPosition += 15;

      const piDatosFields = Object.keys(datosTab).filter(
        (key) => !datosKeys.includes(key) && key !== 'caracterizacion_id'
      );

      // Mapeo de nombres de campos para mostrar etiquetas más amigables
      const fieldNameMapping = {
        'sector': 'Pertenece a el sector',
        'priorizado': 'Priorizado',
        'tiempo_dedicacion': 'Tiempo de dedicación al negocio',
        'tiempo_funcionamiento': 'Tiempo de funcionamiento del negocio local',
        'valor_ingresos_ventas': 'Valor aproximado de ingreso-ventas',
        'valor_activos': 'Valor aproximado de activos',
        'valor_gastos_costos': 'Valor aproximado de gastos-costos',
        'valor_utilidad_margen': 'Valor total de utilidad-margen',
        'valor_gastos_familiares': 'Valor gastos familiares mensuales promedio',
        'descripcion_negocio': 'Descripción general del negocio',
        'descripcion_lugar_actividad': 'Descripción del lugar donde desarrolla la actividad',
        'descripcion_capacidad_produccion': 'Descripción de la capacidad de producción'
      };

      // Función para obtener el nombre de visualización de un campo
      const getDisplayName = (fieldName) => {
        return fieldNameMapping[fieldName] || fieldName;
      };

      // Función para verificar si un campo debe ocupar toda la fila
      const isFullWidthField = (fieldName) => {
        const fullWidthFields = [
          'descripcion_negocio',
          'descripcion_lugar_actividad', 
          'descripcion_capacidad_produccion'
        ];
        return fullWidthFields.includes(fieldName);
      };

      if (piDatosFields.length > 0) {
        // Separar campos en dos grupos: normales y de ancho completo
        const normalFields = piDatosFields.filter(field => !isFullWidthField(field));
        const fullWidthFields = piDatosFields.filter(field => isFullWidthField(field));

        // Procesar campos normales en pares (dos columnas)
        for (let i = 0; i < normalFields.length; i += 2) {
          const leftField = normalFields[i];
          const rightField = normalFields[i + 1];
          
          const leftLabel = `${getDisplayName(leftField)}:`;
          const leftValue = datosTab[leftField] || 'No disponible';
          
          // Calcular posiciones para dos columnas
          const columnWidth = (pageWidth - 2 * margin) / 2;
          const leftX = margin;
          const rightX = margin + columnWidth + 10; // 10px de separación entre columnas
          
          // Verificar si necesitamos nueva página
          yPosition = checkPageEnd(doc, yPosition, 40); // Espacio estimado para la fila
          
          // Guardar la posición Y inicial para esta fila
          const rowStartY = yPosition;
          
          // Dibujar campo izquierdo
          doc.setFont(undefined, 'bold');
          const leftLabelLines = doc.splitTextToSize(leftLabel, columnWidth);
          doc.text(leftLabelLines, leftX, yPosition);
          yPosition += leftLabelLines.length * 14;

          doc.setFont(undefined, 'normal');
          const leftValueLines = doc.splitTextToSize(leftValue, columnWidth);
          doc.text(leftValueLines, leftX, yPosition);
          
          // Dibujar campo derecho (si existe) alineado con el izquierdo
          if (rightField) {
            const rightLabel = `${getDisplayName(rightField)}:`;
            const rightValue = datosTab[rightField] || 'No disponible';
            
            // Usar la misma posición Y inicial para alinear perfectamente
            doc.setFont(undefined, 'bold');
            const rightLabelLines = doc.splitTextToSize(rightLabel, columnWidth);
            doc.text(rightLabelLines, rightX, rowStartY);
            
            doc.setFont(undefined, 'normal');
            const rightValueLines = doc.splitTextToSize(rightValue, columnWidth);
            doc.text(rightValueLines, rightX, rowStartY + rightLabelLines.length * 14);
          }
          
          // Calcular la altura máxima de esta fila para mover a la siguiente
          const leftHeight = leftLabelLines.length * 14 + leftValueLines.length * 14;
          const rightHeight = rightField ? 
            doc.splitTextToSize(`${getDisplayName(rightField)}:`, columnWidth).length * 14 + 
            doc.splitTextToSize(datosTab[rightField] || 'No disponible', columnWidth).length * 14 : 0;
          
          yPosition = rowStartY + Math.max(leftHeight, rightHeight) + 10;
        }

        // Procesar campos de ancho completo (descripciones)
        fullWidthFields.forEach((key) => {
          let label = `${getDisplayName(key)}:`;
          let value = datosTab[key] || 'No disponible';

          // Evitar mostrar "ID: " si viene con un prefijo raro
          if (typeof value === 'string' && value.toLowerCase().startsWith('id:')) {
            value = value.substring(3).trim();
          } else if (typeof value !== 'string') {
            value = String(value);
          }

          doc.setFont(undefined, 'bold');
          const labelLines = doc.splitTextToSize(label, maxLineWidth);
          yPosition = checkPageEnd(doc, yPosition, labelLines.length * 14);
          doc.text(labelLines, margin, yPosition);
          yPosition += labelLines.length * 14;

          doc.setFont(undefined, 'normal');
          const valueLines = doc.splitTextToSize(value, maxLineWidth);
          yPosition = checkPageEnd(doc, yPosition, valueLines.length * 14);
          doc.text(valueLines, margin, yPosition);
          yPosition += valueLines.length * 14 + 10;
        });
      } else {
        doc.text("No hay datos generales del negocio disponibles.", margin, yPosition);
        yPosition += 14;
      }

      // 3. PROPUESTA DE MEJORA SOBRE EL DIAGNÓSTICO REALIZADO
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      yPosition += 20;
      doc.text("Diagnóstico del negocio y Propuesta de Mejora", pageWidth / 2, yPosition, { align: 'center' });

      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');
      yPosition += 20;

      if (propuestaMejoraData.length > 0) {
        const propuestaHeaders = [
          { header: 'Área de\nFortalecimiento', dataKey: 'area' },
          { header: '¿Requiere acción\nde mejora?', dataKey: 'evaluacion' },
          { header: 'Descripción del área crítica por área de fortalecimiento', dataKey: 'descripcion' },
          { header: 'Propuesta de Mejora', dataKey: 'propuesta' },
        ];

        const propuestaBody = propuestaMejoraData.map(item => ({
          area: item["Area de fortalecimiento"] || 'No disponible',
          evaluacion: item["Evaluacion"] || 'No disponible',
          descripcion: item["Descripcion del area critica por area de fortalecimiento"] || 'No disponible',
          propuesta: item["Propuesta de mejora"] || 'No disponible',
        }));

                 doc.autoTable({
           startY: yPosition,
           head: [propuestaHeaders.map(col => col.header)],
           body: propuestaBody.map(row => propuestaHeaders.map(col => row[col.dataKey])),
           theme: 'striped',
           styles: { 
             fontSize: fontSizes.normal, 
             cellPadding: 4,
             lineWidth: 0.5,
             lineColor: [200, 200, 200],
             valign: 'middle'
           },
          tableWidth: 'auto',
          headStyles: { 
            fillColor: tableColor, 
            textColor: [255, 255, 255], 
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
          },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { halign: 'center', cellWidth: 97 },
            1: { halign: 'center', cellWidth: 80 },
            2: { halign: 'left', cellWidth: 168 },
            3: { halign: 'left', cellWidth: 168 }
          },
          didDrawPage: (data) => {
            yPosition = data.cursor.y;
          },
        });

        yPosition = doc.lastAutoTable.finalY + 10 || yPosition + 10;
      } else {
        doc.text("No hay propuestas de mejora registradas.", margin, yPosition);
        yPosition += 14;
      }

      // 4. ACTIVOS ACTUALES
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      yPosition += 20;
      doc.text("Activos Actuales del Negocio", pageWidth / 2, yPosition, { align: 'center' });

      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');
      yPosition += 20;

      if (activosActualesData.length > 0) {
        const activosHeaders = [
          { header: 'No', dataKey: 'numero' },
          { header: 'Nombre del activo', dataKey: 'equipo' },
          { header: 'Descripción técnica', dataKey: 'descripcion' },
          { header: 'Vida útil', dataKey: 'vidaUtil' },
          { header: 'Frecuencia de uso', dataKey: 'frecuenciaUso' },
          { header: 'Elemento para reposición', dataKey: 'elementoReposicion' },
        ];

        const activosBody = activosActualesData.map((item, index) => ({
          numero: (index + 1).toString(),
          equipo: item["Equipo"] || 'No disponible',
          descripcion: item["Descripcion"] || 'No disponible',
          vidaUtil: item["Vida util"] || 'No disponible',
          frecuenciaUso: item["Frecuencia de uso"] || 'No disponible',
          elementoReposicion: item["Elemento para reposicion"] || 'No disponible',
        }));

                 doc.autoTable({
           startY: yPosition,
           head: [activosHeaders.map(col => col.header)],
           body: activosBody.map(row => activosHeaders.map(col => row[col.dataKey])),
           theme: 'striped',
           styles: { 
             fontSize: fontSizes.normal, 
             cellPadding: 4,
             lineWidth: 0.5,
             lineColor: [200, 200, 200],
             valign: 'middle'
           },
          tableWidth: 'auto',
          headStyles: { 
            fillColor: tableColor, 
            textColor: [255, 255, 255], 
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
          },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { halign: 'center', cellWidth: 25 },
            1: { halign: 'left', cellWidth: 140 },
            2: { halign: 'left', cellWidth: 150 },
            3: { halign: 'left', cellWidth: 60 },
            4: { halign: 'center', cellWidth: 70 },
            5: { halign: 'center', cellWidth: 70 }
          },
          didDrawPage: (data) => {
            yPosition = data.cursor.y;
          },
        });

        yPosition = doc.lastAutoTable.finalY + 10 || yPosition + 10;
      } else {
        doc.text("No hay activos actuales registrados.", margin, yPosition);
        yPosition += 14;
      }

      // 5. FORMULACIÓN DE INVERSIÓN EN KITS
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      yPosition += 20;
      doc.text("Formulación Plan de Inversión en Kits", pageWidth / 2, yPosition, { align: 'center' });

      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');
      yPosition += 20;

      // Funciones helper para obtener nombres
      const getProviderInfo = (providerId) => {
        const provider = providersData.find(p => String(p.id) === String(providerId));
        if (!provider) return { elemento: 'Desconocido', descripcion: 'No disponible' };
        
        return {
          elemento: provider["cantidad_bienes"] || 'Desconocido',
          descripcion: provider["Descripcion corta"] || 'No disponible'
        };
      };

      // Filtrar solo los registros seleccionados de pi_formulacion_kit
      const selectedFormulacionKit = formulacionKitData.filter(item => item.Seleccion === true);

      if (selectedFormulacionKit.length > 0) {
                 const formulacionHeaders = [
           { header: 'Código Kit', dataKey: 'codigoKit' },
           { header: 'Cantidad y Nombre\nde artículos que\nincluye el KIT', dataKey: 'kitSeleccionado' },
           { header: 'Cantidad de KIT', dataKey: 'cantidad' },
           { header: 'Descripción dimensiones', dataKey: 'descripcionDimensiones' },
           { header: 'Justificación', dataKey: 'justificacion' },
         ];

                 const formulacionBody = selectedFormulacionKit.map(item => {
           const providerInfo = getProviderInfo(item.rel_id_prov);
           const provider = providersData.find(p => String(p.id) === String(item.rel_id_prov));
           
           return {
             codigoKit: provider ? (provider.codigoKit || 'Sin código') : 'Sin código',
             kitSeleccionado: providerInfo.elemento,
             cantidad: item.Cantidad ? item.Cantidad.toString() : '1',
             descripcionDimensiones: item["Descripcion dimensiones"] || 'No disponible',
             justificacion: item.Justificacion || 'No disponible',
           };
         });

                 doc.autoTable({
           startY: yPosition,
           head: [formulacionHeaders.map(col => col.header)],
           body: formulacionBody.map(row => formulacionHeaders.map(col => row[col.dataKey])),
           theme: 'striped',
           styles: { 
             fontSize: fontSizes.normal, 
             cellPadding: 4,
             lineWidth: 0.5,
             lineColor: [200, 200, 200],
             valign: 'middle'
           },
          tableWidth: 'auto',
          headStyles: { 
            fillColor: tableColor, 
            textColor: [255, 255, 255], 
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
          },
          margin: { left: margin, right: margin },
                     columnStyles: {
             0: { halign: 'center', cellWidth: 70 },
             1: { halign: 'left', cellWidth: 140 },
             2: { halign: 'center', cellWidth: 70 },
             3: { halign: 'left', cellWidth: 117 },
             4: { halign: 'left', cellWidth: 117 }
           },
          didDrawPage: (data) => {
            yPosition = data.cursor.y;
          },
        });

        yPosition = doc.lastAutoTable.finalY + 10 || yPosition + 10;
      } else {
        doc.text("No hay registros de formulación de kits.", margin, yPosition);
        yPosition += 14;
      }

      // 6. RESUMEN DE LA INVERSIÓN EN KITS (OCULTO)
      /*
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      yPosition += 20;
      doc.text("RESUMEN DE LA INVERSIÓN EN KITS", pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 20;

      const resumenColumns = [
        { header: 'Rubro', dataKey: 'rubro' },
        { header: 'Valor', dataKey: 'total' },
      ];

      doc.autoTable({
        startY: yPosition,
        head: [resumenColumns.map(col => col.header)],
        body: groupedRubros.map(row => {
          const valorFormateado = `$${Number(row.total).toLocaleString()}`;
          return [row.rubro, valorFormateado];
        }),
        theme: 'striped',
        styles: { 
          fontSize: fontSizes.normal, 
          cellPadding: 4,
          lineWidth: 0.5,
          lineColor: [200, 200, 200]
        },
        tableWidth: 'auto',
        headStyles: { fillColor: tableColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          yPosition = data.cursor.y;
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10 || yPosition + 10;

      // Añadir tabla para "Total Inversión, Monto disponible, Contrapartida"
      const datosInversion = [
        ["Total Inversión en Kits", `$${Number(totalInversion).toLocaleString()}`],
        ["Monto disponible", `$${montoDisponible.toLocaleString()}`],
        ["Contrapartida", `$${Number(contrapartida).toLocaleString()}`],
      ];

      doc.autoTable({
        startY: yPosition,
        head: [["Concepto", "Valor"]],
        body: datosInversion,
        theme: 'striped',
        styles: { 
          fontSize: fontSizes.normal, 
          cellPadding: 4,
          lineWidth: 0.5,
          lineColor: [200, 200, 200]
        },
        tableWidth: 'auto',
        headStyles: { fillColor: tableColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          yPosition = data.cursor.y;
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10 || yPosition + 10;
      */

      // 7. CONCEPTO DE VIABILIDAD DE PLAN DE INVERSIÓN EN KITS
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      yPosition += 30;
      doc.text("Concepto de viabilidad para inversión en kits", pageWidth / 2, yPosition, { align: 'center' });

      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');
      yPosition += 20;

      // Actualizar textoViabilidad con el nuevo contenido específico para kits
      const textoViabilidad = [
        `Yo, ${asesorNombre}, identificado(a) con documento de identidad N° ${asesorDocumento}, en mi calidad de asesor empresarial y haciendo parte del equipo ejecutor del programa " Emprendópolis" que emana del Convenio Interadministrativo entre PROPAIS y SDDE Secretaria de Desarrollo Económico, emito concepto de VIABILIDAD para acceder a los recursos de capitalización en kits proporcionados por el citado Programa`,
        "",
        "NOTA: Como asesor empresarial asignado , declaro que toda la información consignada en el presente plan de inversión en kits fue diligenciada en conjunto con el propietario del negocio local y que esta corresponde a las condiciones reales evidenciadas en la visita al negocio, es veraz, completa. De igual manera declaro que se brindó asesoría profesional y técnica al negocio local para la elaboración del plan de inversión en kits y sobre las condiciones del programa Emprendópolis.",
        "",
      ];

      textoViabilidad.forEach(parrafo => {
        if (parrafo === "") {
          yPosition += 10;
          return;
        }
        const lines = doc.splitTextToSize(parrafo, maxLineWidth);
        yPosition = checkPageEnd(doc, yPosition, lines.length * 14);
        doc.text(lines, margin, yPosition);
        yPosition += lines.length * 14 + 10;
      });

      // 8. Sección de Firmas
      const firmasSectionHeight = 120;
      yPosition += 10;
      yPosition = checkPageEnd(doc, yPosition, firmasSectionHeight);

      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      doc.text("Firmas", pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 30;
      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');

      const boxWidth = 150;
      const boxHeight = 60;
      const asesorBoxX = pageWidth / 2 - boxWidth / 2;

      doc.text("Asesor", asesorBoxX + boxWidth / 2, yPosition, { align: 'center' });

      yPosition += 10;
      doc.line(asesorBoxX, yPosition + boxHeight, asesorBoxX + boxWidth, yPosition + boxHeight);

      yPosition += boxHeight + 15;

      doc.text(asesorNombre, asesorBoxX + boxWidth / 2, yPosition, { align: 'center' });

      yPosition += 15;

      const asesorCCToShow = asesorDocumento === 'No disponible' ? '' : `C.C. ${asesorDocumento}`;
      doc.text(asesorCCToShow, asesorBoxX + boxWidth / 2, yPosition, { align: 'center' });

      // 9. Sección de Fecha y Hora
      const dateSectionHeight = 30;
      yPosition += 30;
      yPosition = checkPageEnd(doc, yPosition, dateSectionHeight);

      const fecha = new Date();
      doc.text(`Fecha y hora de generación`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      doc.text(`${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}`, pageWidth / 2, yPosition, { align: 'center' });

      // Descargar PDF
      doc.save(`Ficha_Kit_Negocio_Local_${id}.pdf`);
    };
  };

  return (
    <div>
      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
      <button onClick={generateFichaKitPDF} className="btn btn-primary" disabled={loading}>
        Descargar Ficha de Kits PDF
      </button>
      {loading && <p>Cargando datos, por favor espera...</p>}
    </div>
  );
}

GenerarFichaKitTab.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}; 