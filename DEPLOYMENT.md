# 🚀 Guía de Despliegue - Plataforma Impulso Capital

## 📋 Resumen del Proyecto
- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Vite
- **Base de Datos**: PostgreSQL (Render)
- **Almacenamiento**: Google Cloud Storage
- **Email**: Nodemailer

---

## 🎯 **PASO 1: DESPLIEGUE DEL BACKEND EN RENDER**

### 1.1 Preparar el Repositorio
```bash
# Asegúrate de que todos los cambios estén commitados
git add .
git commit -m "Preparación para despliegue en Render"
git push origin main
```

### 1.2 Crear Servicio en Render
1. Ve a [render.com](https://render.com) y crea una cuenta
2. Haz clic en "New +" → "Web Service"
3. Conecta tu repositorio de GitHub
4. Selecciona el repositorio `emprendopolis/Plataforma`

### 1.3 Configuración del Servicio
- **Name**: `impulso-capital-backend`
- **Environment**: `Node`
- **Build Command**: `cd impulso-capital_back && npm install`
- **Start Command**: `cd impulso-capital_back && npm start`
- **Plan**: Free

### 1.4 Variables de Entorno en Render
Configura estas variables en la sección "Environment Variables":

```env
NODE_ENV=production
PORT=4000
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://tu-frontend-netlify.netlify.app
GCS_BUCKET=proyecto-alcaldia-2025
GCP_PROJECT_ID=proyecto-alcaldia-461421
EMAIL_USER=tecnologia@propais.org.co
EMAIL_PASS=Pr0p415.2025*
FRONTEND_URL=https://tu-frontend-netlify.netlify.app
GOOGLE_APPLICATION_CREDENTIALS=./gcs-credentials.json
```

### 1.5 Configurar Google Cloud Storage
1. Sube el archivo `gcs-credentials.json` a Render
2. O configura las credenciales como variable de entorno

### 1.6 URL del Backend
Una vez desplegado, obtendrás una URL como:
`https://impulso-capital-backend.onrender.com`

---

## 🎯 **PASO 2: CONFIGURAR BASE DE DATOS POSTGRESQL**

### 2.1 Crear Base de Datos en Render
1. En Render, ve a "New +" → "PostgreSQL"
2. **Name**: `impulso-capital-db`
3. **Database**: `prueba_platform`
4. **User**: `prueba_platform_user`
5. **Plan**: Free

### 2.2 Obtener DATABASE_URL
Render te proporcionará una URL como:
```
postgresql://prueba_platform_user:mVOuMioVJJq0EzGKHmBN3zVBH2fIIYLk@dpg-d0ecr10dL3ps73bk409g-a.oregon-postgres.render.com/prueba_platform
```

### 2.3 Agregar DATABASE_URL al Backend
En las variables de entorno del backend, agrega:
```env
DATABASE_URL=postgresql://prueba_platform_user:mVOuMioVJJq0EzGKHmBN3zVBH2fIIYLk@dpg-d0ecr10dL3ps73bk409g-a.oregon-postgres.render.com/prueba_platform
```

### 2.4 Restaurar Base de Datos
```bash
# Desde tu máquina local
pg_restore -h dpg-d0ecr10dL3ps73bk409g-a.oregon-postgres.render.com -U prueba_platform_user -d prueba_platform tu_backup.sql
```

---

## 🎯 **PASO 3: DESPLIEGUE DEL FRONTEND EN NETLIFY**

### 3.1 Preparar el Frontend
1. Asegúrate de que el archivo `netlify.toml` esté en la raíz del proyecto
2. Actualiza la URL del backend en `netlify.toml`:

```toml
[context.production.environment]
  VITE_API_URL = "https://impulso-capital-backend.onrender.com/api"
```

### 3.2 Crear Sitio en Netlify
1. Ve a [netlify.com](https://netlify.com)
2. Haz clic en "New site from Git"
3. Conecta tu repositorio de GitHub
4. Selecciona el repositorio `emprendopolis/Plataforma`

### 3.3 Configuración del Build
- **Base directory**: `impulso-capital-front`
- **Build command**: `npm run build`
- **Publish directory**: `dist`

### 3.4 Variables de Entorno en Netlify
En la sección "Environment variables":
```env
VITE_API_URL=https://impulso-capital-backend.onrender.com/api
```

### 3.5 URL del Frontend
Netlify te asignará una URL como:
`https://tu-sitio-123456.netlify.app`

---

## 🔧 **CONFIGURACIONES ADICIONALES**

### CORS Configuration
Asegúrate de que en el backend, el CORS esté configurado para permitir tu dominio de Netlify:

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://tu-sitio-123456.netlify.app',
  credentials: true
}));
```

### Google Cloud Storage
1. Asegúrate de que el bucket `proyecto-alcaldia-2025` exista
2. Las credenciales de GCS deben estar correctamente configuradas
3. El archivo `gcs-credentials.json` debe estar en el backend

### Email Configuration
Verifica que las credenciales de email estén correctas:
- **EMAIL_USER**: `tecnologia@propais.org.co`
- **EMAIL_PASS**: `Pr0p415.2025*`

---

## 🚨 **SOLUCIÓN DE PROBLEMAS COMUNES**

### Error de CORS
- Verifica que `CORS_ORIGIN` apunte a tu URL de Netlify
- Asegúrate de que no haya espacios extra en la URL

### Error de Base de Datos
- Verifica que `DATABASE_URL` esté correctamente configurada
- Asegúrate de que la base de datos esté creada y accesible

### Error de Build en Netlify
- Verifica que el directorio base sea `impulso-capital-front`
- Asegúrate de que todas las dependencias estén en `package.json`

### Error de Google Cloud Storage
- Verifica que las credenciales estén correctas
- Asegúrate de que el bucket exista y sea accesible

---

## 📞 **CONTACTO Y SOPORTE**

Si encuentras problemas durante el despliegue:
1. Revisa los logs en Render y Netlify
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que las URLs estén correctas

---

## ✅ **CHECKLIST FINAL**

- [ ] Backend desplegado en Render
- [ ] Base de datos PostgreSQL creada y configurada
- [ ] Variables de entorno configuradas en Render
- [ ] Frontend desplegado en Netlify
- [ ] Variables de entorno configuradas en Netlify
- [ ] CORS configurado correctamente
- [ ] Google Cloud Storage configurado
- [ ] Email configurado
- [ ] Pruebas de funcionalidad realizadas 