# Impulso Local

Aplicación web para la gestión de proyectos locales.

## Requisitos Previos

- Node.js (versión 14 o superior)
- npm o yarn
- Git

## Instalación

1. Clonar el repositorio:
```bash
git clone 
cd impulso-local
```

2. Instalar dependencias del frontend:
```bash
cd impulso-capital-front
npm install
```

3. Instalar dependencias del backend:
```bash
cd ../impulso-capital_back
npm install
```

## Configuración

1. Crear archivo `.env` en el directorio `impulso-capital-front`:
```
VITE_API_URL=http://localhost:4000/api
```

2. Crear archivo `.env` en el directorio `impulso-capital_back`:
```
PORT=4000
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=impulso_local
JWT_SECRET=tu_secreto_jwt
```

## Desarrollo

1. Iniciar el backend:
```bash
cd impulso-capital_back
npm run dev
```

2. Iniciar el frontend:
```bash
cd impulso-capital-front
npm run dev
```

## Despliegue

### Backend (Render)

1. Crear una cuenta en [Render](https://render.com)
2. Crear un nuevo Web Service
3. Conectar con el repositorio de GitHub
4. Configurar las variables de entorno en Render
5. Deploy

### Frontend (Netlify)

1. Crear una cuenta en [Netlify](https://netlify.com)
2. Crear un nuevo sitio desde Git
3. Conectar con el repositorio de GitHub
4. Configurar las variables de entorno en Netlify:
   - `VITE_API_URL`: URL de tu backend en Render
5. Deploy

## Estructura del Proyecto

```
impulso-local/
├── impulso-capital-front/    # Frontend (React)
└── impulso-capital_back/     # Backend (Node.js/Express)
```