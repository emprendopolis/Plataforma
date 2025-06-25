// GenerarFichaTab.jsx

import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios';
import PropTypes from 'prop-types';
import config from '../../config';

// Ruta de la imagen del banner en la carpeta public
const bannerImagePath = '/impulso-local-banner-pdf.jpeg';

export default function GenerarFichaTab({ id }) {
  // Estados para almacenar los datos obtenidos de la API
  const [caracterizacionData, setCaracterizacionData] = useState({});
  const [datosTab, setDatosTab] = useState({});
  const [propuestaMejoraData, setPropuestaMejoraData] = useState([]);
  const [formulacionData, setFormulacionData] = useState([]);
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
    "localidad_unidad_negocio" // <-- Cambio: Excluimos este campo para que no se muestre
  ];

  // Estados para manejar monto disponible y contrapartida (similar a FormulacionTab)
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
          formulacionResponse
        ] = await Promise.all([
          axios.get(`${config.urls.inscriptions.tables}/inscription_caracterizacion/record/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${config.urls.inscriptions.pi}/tables/inscription_caracterizacion/related-data`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${config.urls.inscriptions.pi}/tables/pi_datos/records?caracterizacion_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${config.urls.inscriptions.pi}/tables/pi_propuesta_mejora/records?caracterizacion_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${config.urls.inscriptions.pi}/tables/pi_formulacion/records?caracterizacion_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
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

        // 8. Procesar datos de `pi_formulacion`
        setFormulacionData(formulacionResponse.data);
        console.log("Datos de pi_formulacion:", formulacionResponse.data);

        // 9. Agrupar Rubros y calcular total inversión
        const rubrosOptions = [
          "Maquinaria y equipo",
          "Insumos/Materias primas",
          "Cursos",
          "Póliza",
        ];

        const resumenPorRubro = rubrosOptions.map((r) => {
          const total = formulacionResponse.data
            .filter((rec) => rec["Rubro"] === r)
            .reduce((sum, rec) => {
              const cantidad = rec["Cantidad"] || 0;
              const valorUnitario = rec["Valor Unitario"] || 0;
              return sum + (cantidad * valorUnitario);
            }, 0);
          return { rubro: r, total };
        });

        const totalInv = resumenPorRubro.reduce((sum, item) => sum + item.total, 0);
        const cpart = totalInv > montoDisponible ? totalInv - montoDisponible : 0;

        setGroupedRubros(resumenPorRubro);
        setTotalInversion(totalInv.toFixed(2));
        setContrapartida(cpart);

        console.log("Resumen por rubro:", resumenPorRubro);
        console.log("Total inversión:", totalInv);
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
  }, [id]); // Eliminamos `relatedData` de las dependencias

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
  const tableColor = [230, 26, 78]; // #E61A4E

  // Función para generar el PDF completo
  const generateFichaPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    const maxLineWidth = pageWidth - margin * 2;
    let yPosition = 100;

    const fontSizes = {
      title: 18,
      subtitle: 14,
      normal: 12,
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

      // Agregar Nombre del Emprendimiento
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      doc.text(nombreEmprendimiento, pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 20;
      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');

      // Agregar ID y Localidad al lado: "ID: 123 - Localidad: Kennedy"
      const localidadLabel = localidadName && localidadName !== "Localidad no encontrada"
        ? ` - Localidad: ${localidadName}`
        : '';
      const idLocalidadText = `ID: ${caracterizacionId}${localidadLabel}`;

      doc.text(idLocalidadText, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 30;

      // 1. Título Principal (cambiado a: PLAN DE INVERSIÓN DEL EMPRENDIMIENTO)
      doc.setFontSize(fontSizes.title);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("PLAN DE INVERSIÓN DEL EMPRENDIMIENTO", pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 30;

      // 2. Mostrar información de datosTab (filtrando campos no deseados)
      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');
      yPosition += 20;

      const piDatosFields = Object.keys(datosTab).filter(
        (key) => !datosKeys.includes(key) && key !== 'caracterizacion_id'
      );

      if (piDatosFields.length > 0) {
        piDatosFields.forEach((key) => {
          let label = `${key}:`;
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
          yPosition += valueLines.length * 14 + 5;

          // Espacio adicional si es "descripcion del negocio" u "objetivo del plan de inversion"
          if (
            key.toLowerCase() === 'descripcion del negocio' ||
            key.toLowerCase() === 'objetivo del plan de inversion'
          ) {
            yPosition += 10;
          }
        });
      } else {
        doc.text("No hay datos generales del negocio disponibles.", margin, yPosition);
        yPosition += 14;
      }

      // 3. PROPUESTA DE MEJORA SOBRE EL DIAGNÓSTICO REALIZADO
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      yPosition += 20;
      doc.text("PROPUESTA DE MEJORA SOBRE EL DIAGNÓSTICO REALIZADO", pageWidth / 2, yPosition, { align: 'center' });

      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');
      yPosition += 20;

      if (propuestaMejoraData.length > 0) {
        const propuestaHeaders = [
          { header: 'Área de Fortalecimiento', dataKey: 'area' },
          { header: 'Descripción', dataKey: 'descripcion' },
          { header: 'Propuesta', dataKey: 'propuesta' },
        ];

        const propuestaBody = propuestaMejoraData.map(item => ({
          area: item["Area de fortalecimiento"] || 'No disponible',
          descripcion: item["Descripcion del area critica por area de fortalecimiento"] || 'No disponible',
          propuesta: item["Propuesta de mejora"] || 'No disponible',
        }));

        doc.autoTable({
          startY: yPosition,
          head: [propuestaHeaders.map(col => col.header)],
          body: propuestaBody.map(row => propuestaHeaders.map(col => row[col.dataKey])),
          theme: 'striped',
          styles: { fontSize: fontSizes.normal, cellPadding: 4 },
          tableWidth: 'auto',
          headStyles: { fillColor: tableColor, textColor: [255, 255, 255], fontStyle: 'bold' },
          margin: { left: margin, right: margin },
          didDrawPage: (data) => {
            yPosition = data.cursor.y;
          },
        });

        yPosition = doc.lastAutoTable.finalY + 10 || yPosition + 10;
      } else {
        doc.text("No hay propuestas de mejora registradas.", margin, yPosition);
        yPosition += 14;
      }

      // 4. FORMULACIÓN DE INVERSIÓN
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      yPosition += 20;
      doc.text("FORMULACIÓN DE INVERSIÓN", pageWidth / 2, yPosition, { align: 'center' });

      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');
      yPosition += 20;

      if (formulacionData.length > 0) {
        const formulacionHeaders = [
          { header: 'Rubro', dataKey: 'rubro' },
          { header: 'Elemento', dataKey: 'elemento' },
          { header: 'Descripción', dataKey: 'descripcion' },
          { header: 'Cantidad', dataKey: 'cantidad' },
          { header: 'Valor Unitario', dataKey: 'valorUnitario' },
          { header: 'Valor Total', dataKey: 'valorTotal' },
        ];

        const formulacionBody = formulacionData.map(item => ({
          rubro: item["Rubro"] || 'No disponible',
          elemento: item["Elemento"] || 'No disponible',
          descripcion: item["Descripción"] || 'No disponible',
          cantidad: item["Cantidad"] ? item["Cantidad"].toLocaleString() : '0',
          valorUnitario: item["Valor Unitario"] ? `$${item["Valor Unitario"].toLocaleString()}` : '$0',
          valorTotal: item["Cantidad"] && item["Valor Unitario"]
            ? `$${(item["Cantidad"] * item["Valor Unitario"]).toLocaleString()}`
            : '$0',
        }));

        doc.autoTable({
          startY: yPosition,
          head: [formulacionHeaders.map(col => col.header)],
          body: formulacionBody.map(row => formulacionHeaders.map(col => row[col.dataKey])),
          theme: 'striped',
          styles: { fontSize: fontSizes.normal, cellPadding: 4 },
          tableWidth: 'auto',
          headStyles: { fillColor: tableColor, textColor: [255, 255, 255], fontStyle: 'bold' },
          margin: { left: margin, right: margin },
          didDrawPage: (data) => {
            yPosition = data.cursor.y;
          },
        });

        yPosition = doc.lastAutoTable.finalY + 10 || yPosition + 10;
      } else {
        doc.text("No hay registros de formulación de inversión.", margin, yPosition);
        yPosition += 14;
      }

      // 5. RESUMEN DE LA INVERSIÓN
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      yPosition += 20;
      doc.text("RESUMEN DE LA INVERSIÓN", pageWidth / 2, yPosition, { align: 'center' });

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
        styles: { fontSize: fontSizes.normal, cellPadding: 4 },
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
        ["Total Inversión", `$${Number(totalInversion).toLocaleString()}`],
        ["Monto disponible", `$${montoDisponible.toLocaleString()}`],
        ["Contrapartida", `$${Number(contrapartida).toLocaleString()}`],
      ];

      doc.autoTable({
        startY: yPosition,
        head: [["Concepto", "Valor"]],
        body: datosInversion,
        theme: 'striped',
        styles: { fontSize: fontSizes.normal, cellPadding: 4 },
        tableWidth: 'auto',
        headStyles: { fillColor: tableColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          yPosition = data.cursor.y;
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10 || yPosition + 10;

      // 6. CONCEPTO DE VIABILIDAD DE PLAN DE INVERSIÓN
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont(undefined, 'bold');
      yPosition += 30;
      doc.text("CONCEPTO DE VIABILIDAD DE PLAN DE INVERSIÓN", pageWidth / 2, yPosition, { align: 'center' });

      doc.setFontSize(fontSizes.normal);
      doc.setFont(undefined, 'normal');
      yPosition += 20;

      // Actualizar textoViabilidad con el nuevo contenido
      const textoViabilidad = [
        `Yo, ${asesorNombre}, identificado(a) con documento de identidad N° ${asesorDocumento}, en mi calidad de asesor empresarial del beneficiario denominado ${nombreEmprendimiento} y haciendo parte del equipo ejecutor del programa "Impulso Local 4.0" que emana del Convenio Interadministrativo suscrito entre la Corporación para el Desarrollo de las Microempresas – PROPAIS y el Fondo de desarrollo local, emito concepto de VIABILIDAD para acceder a los recursos de capitalización proporcionados por el citado Programa.`,
        "",
        "NOTA: Declaro que toda la información sobre el plan de inversión aquí consignada fue diligenciada en conjunto con el asesor empresarial a cargo, está de acuerdo con las condiciones del negocio, es verdadera, completa y correcta, la cual puede ser verificada en cualquier momento.",
        "",
        "NOTA: En caso de que se presente un incremento en la planeación de los recursos del 20% de la capitalización al momento de la ejecución de esta, por favor revisar en conjunto con el empresario (a) el alcance de los mismos, y reformular si aplica, siempre manteniendo el tope máximo del 20% de la destinación.",
        "",
        "NOTA: El beneficiario asegura, mediante la firma del presente documento, que cuenta con el recurso adicional necesario para realizar la adquisición de: los productos, servicios, maquinarias, equipos y/o herramientas que planea adquirir con los recursos de la capitalización, en caso de que estos tengan un valor mayor al entregado por el programa."
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

      // 7. Sección de Firmas
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
      const boxHeight = 40;
      const beneficiarioBoxX = margin + 30;
      const asesorBoxX = pageWidth - margin - 180;

      doc.text("Beneficiario", beneficiarioBoxX + boxWidth / 2, yPosition, { align: 'center' });
      doc.text("Asesor", asesorBoxX + boxWidth / 2, yPosition, { align: 'center' });

      yPosition += 10;
      doc.rect(beneficiarioBoxX, yPosition, boxWidth, boxHeight);
      doc.rect(asesorBoxX, yPosition, boxWidth, boxHeight);

      yPosition += boxHeight + 15;

      // Si el beneficiario se llama '', lo mostramos en blanco
      const benefNameToShow = emprendedorNombre.trim() === 'No disponible' ? '' : emprendedorNombre.trim();
      doc.text(benefNameToShow, beneficiarioBoxX + boxWidth / 2, yPosition, { align: 'center' });

      doc.text(asesorNombre, asesorBoxX + boxWidth / 2, yPosition, { align: 'center' });

      yPosition += 15;
      // Para la cédula del beneficiario, si no hay nada, dejar en blanco
      const emprendedorCC = caracterizacionData["Numero de documento de identificacion ciudadano"] || '';
      const benefCCToShow = emprendedorCC.trim() === 'No disponible' ? '' : `C.C. ${emprendedorCC.trim()}`;
      doc.text(benefCCToShow, beneficiarioBoxX + boxWidth / 2, yPosition, { align: 'center' });

      const asesorCCToShow = asesorDocumento === 'No disponible' ? '' : `C.C. ${asesorDocumento}`;
      doc.text(asesorCCToShow, asesorBoxX + boxWidth / 2, yPosition, { align: 'center' });

      // 8. Sección de Fecha y Hora
      const dateSectionHeight = 30;
      yPosition += 30;
      yPosition = checkPageEnd(doc, yPosition, dateSectionHeight);

      const fecha = new Date();
      doc.text(`Fecha y hora de generación`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      doc.text(`${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}`, pageWidth / 2, yPosition, { align: 'center' });

      // Descargar PDF
      doc.save(`Ficha_Negocio_Local_${id}.pdf`);
    };
  };

  return (
    <div>
      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
      <button onClick={generateFichaPDF} className="btn btn-primary" disabled={loading}>
        Descargar Ficha PDF
      </button>
      {loading && <p>Cargando datos, por favor espera...</p>}
    </div>
  );
}

GenerarFichaTab.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};


