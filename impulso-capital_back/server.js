// server.js

const express = require('express');
const cors = require('cors');
const sequelize = require('./src/utils/sequelize');
const path = require('path');
require('dotenv').config();

// Cargar las asociaciones entre modelos primero
require('./src/models/associations');

const userRoutes = require('./src/routes/userRoutes');
const roleRoutes = require('./src/routes/roleRoutes');
const permissionRoutes = require('./src/routes/permissionRoutes');
const rolePermissionRoutes = require('./src/routes/rolePermissionRoutes');
const inscriptionRoutes = require('./src/routes/inscriptionRoutes');
const Role = require('./src/models/Role');
const Permission = require('./src/models/Permission');
const descargaRoutes = require('./src/routes/descarga');

const app = express();
// Configuración de CORS para producción
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Servir archivos estáticos (si es necesario)
app.use('/uploads', express.static('/var/data/uploads'));


// Importar y definir el modelo FieldPreference
const FieldPreference = require('./src/models/FieldPreference')(sequelize, require('sequelize').DataTypes);

// Rutas de usuarios
app.use('/api/users', userRoutes);
// Rutas de roles
app.use('/api/roles', roleRoutes);
// Rutas de permisos
app.use('/api/permissions', permissionRoutes);
// Conectar las rutas de asignación de permisos a roles
app.use('/api/role-permissions', rolePermissionRoutes);
// Rutas de inscripción
app.use('/api/inscriptions', inscriptionRoutes); 
app.use('/api', descargaRoutes);

// Ruta básica de prueba
app.get('/', (req, res) => {
  res.send('API Impulso Local funcionando');
});

// Endpoint temporal para depuración de permisos
app.get('/api/debug/permissions/:roleId', async (req, res) => {
  try {
    const roleId = req.params.roleId;
    const role = await Role.findByPk(roleId, {
      include: {
        model: Permission,
        as: 'permissions',
      },
    });
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  try {
    // Sincronizar modelos con la base de datos
    await sequelize.sync({ force: false, alter: true });
    console.log('Base de datos sincronizada');
    
    // Crear permisos por defecto
    /*
    try {
      const Permission = require('./src/models/Permission')(sequelize, require('sequelize').DataTypes);
      const defaultPermissions = [
        { permission_name: 'admin' },
        { permission_name: 'user' }
      ];

      for (const permission of defaultPermissions) {
        await Permission.findOrCreate({
          where: { permission_name: permission.permission_name },
          defaults: permission
        });
      }
      console.log('Permisos creados exitosamente');
    } catch (error) {
      console.error('Error creando permisos:', error);
    }
    */

    console.log(`Servidor corriendo en el puerto ${PORT}`);
  } catch (error) {
    console.error('Error sincronizando la base de datos:', error);
  }
});

// Manejadores globales de errores
process.on('uncaughtException', function (err) {
  console.error('Excepción no capturada:', err);
});

process.on('unhandledRejection', function (reason, promise) {
  console.error('Rechazo no manejado en promesa:', promise, 'razón:', reason);
});



