# Formateo de Texto con Saltos de Línea y Viñetas

## Descripción

Se ha implementado una funcionalidad para mostrar correctamente el texto de la columna `cantidad_bienes` de la tabla `kit_proveedores` con saltos de línea y viñetas en la interfaz web.

## Problema Resuelto

Anteriormente, el texto que contenía saltos de línea (`\n`) y viñetas (`-`) se mostraba como una sola línea continua en las tablas HTML. Ahora el texto se formatea correctamente respetando:

- Saltos de línea
- Viñetas (convertidas de `-` a `•`)
- Espaciado adecuado entre elementos

## Archivos Modificados

### 1. FormulacionKitTab.jsx
- **Ubicación**: `impulso-capital-front/src/components/PlanDeInversion/FormulacionKitTab.jsx`
- **Cambios**:
  - Agregada función `formatTextWithLineBreaks()`
  - Modificadas las celdas de tabla para usar el formateo
  - Importado archivo CSS específico

### 2. ProviderKitTableList.jsx
- **Ubicación**: `impulso-capital-front/src/components/ProviderKitTableList.jsx`
- **Cambios**:
  - Agregada función `formatTextWithLineBreaks()`
  - Modificada la celda de tabla para usar el formateo
  - Importado archivo CSS específico

### 3. GenerarFichaKitTab.jsx
- **Ubicación**: `impulso-capital-front/src/components/PlanDeInversion/GenerarFichaKitTab.jsx`
- **Cambios**:
  - Agregada función `formatTextForPDF()` para formateo en PDF
  - Modificada función `getProviderInfo()` para usar el formateo

### 4. Archivos CSS Creados
- **FormulacionKitTab.css**: `impulso-capital-front/src/components/css/FormulacionKitTab.css`
- **ProviderKitTableList.css**: `impulso-capital-front/src/components/css/ProviderKitTableList.css`

## Cómo Funciona

### Para Interfaz Web (HTML)
La función `formatTextWithLineBreaks()`:
1. Divide el texto por saltos de línea (`\n`)
2. Para cada línea:
   - Si empieza con `-`, la convierte en viñeta con `•`
   - Si no está vacía, la muestra normal
   - Si está vacía, agrega un espacio
3. Retorna elementos JSX con clases CSS para estilizado

### Para PDF
La función `formatTextForPDF()`:
1. Divide el texto por saltos de línea (`\n`)
2. Para cada línea:
   - Si empieza con `-`, la convierte en viñeta con `•`
   - Si no está vacía, la muestra normal
   - Si está vacía, agrega un espacio
3. Retorna texto formateado compatible con jsPDF

## Estilos CSS Aplicados

```css
.formatted-text-cell {
  max-width: 300px;
  min-width: 200px;
  white-space: normal;
  word-wrap: break-word;
  vertical-align: top;
  padding: 8px;
}

.formatted-text-cell .text-line {
  margin-bottom: 4px;
  line-height: 1.4;
}

.formatted-text-cell .bullet-point {
  margin-right: 8px;
  color: #666;
  font-weight: bold;
}
```

## Ejemplo de Uso

### Texto Original en Base de Datos:
```
-Una máquina familiar, costura intermedia, 27 puntadas (63 funciones), enhebrado automático, ojal automático, luz LED completa con accesorios. 110 V. Potencia entre 50 W y 100 W. Control: Pedal eléctrico con potenciómetro: Controlar la velocidad del motor y, por ende, la velocidad de la aguja. 
-Cortadora de 4 pulgadas (circular de tela utilizada en la industria de la confección). Potencia: Comúnmente entre 250 W y 350 W. Diámetro de la cuchilla: 4 pulgadas (aproximadamente 10 cm). Capacidad de corte: Varía según el modelo y el material, pero puede llegar a cortar entre 5 y 40 capas de tela, 110 V. 
-Tijera de 9" pulgadas (aprox. 23 cm) fabricada en acero metálico inoxidable de alta resistencia, con diseño tipo corneta y mango alargado que brinda un agarre cómodo y seguro. Apta tanto para zurdos como para diestros.
```

### Resultado en Interfaz Web:
- • Una máquina familiar, costura intermedia, 27 puntadas (63 funciones), enhebrado automático, ojal automático, luz LED completa con accesorios. 110 V. Potencia entre 50 W y 100 W. Control: Pedal eléctrico con potenciómetro: Controlar la velocidad del motor y, por ende, la velocidad de la aguja.
- • Cortadora de 4 pulgadas (circular de tela utilizada en la industria de la confección). Potencia: Comúnmente entre 250 W y 350 W. Diámetro de la cuchilla: 4 pulgadas (aproximadamente 10 cm). Capacidad de corte: Varía según el modelo y el material, pero puede llegar a cortar entre 5 y 40 capas de tela, 110 V.
- • Tijera de 9" pulgadas (aprox. 23 cm) fabricada en acero metálico inoxidable de alta resistencia, con diseño tipo corneta y mango alargado que brinda un agarre cómodo y seguro. Apta tanto para zurdos como para diestros.

## Notas Importantes

1. **Base de Datos**: El texto debe contener saltos de línea reales (`\n`) y viñetas (`-`) para que funcione correctamente.

2. **Compatibilidad**: La solución funciona tanto en navegadores modernos como en la generación de PDF.

3. **Rendimiento**: El formateo se realiza en el cliente y no afecta el rendimiento de manera significativa.

4. **Mantenimiento**: Si se agregan nuevos componentes que muestren `cantidad_bienes`, se debe aplicar la misma función de formateo.

## Próximos Pasos

Si necesitas aplicar esta funcionalidad a otras columnas o componentes:

1. Copia la función `formatTextWithLineBreaks()` al nuevo componente
2. Importa el archivo CSS correspondiente
3. Aplica la función a la celda de tabla donde se muestre el texto
4. Ajusta los estilos CSS según sea necesario
