const { Sequelize } = require('sequelize');
require('dotenv').config();

// Forzar SSL para conexiones de producción
const isProduction = process.env.NODE_ENV === 'production';
const useSSL = isProduction || process.env.DB_SSL === 'true';

const sequelize = new Sequelize(
  process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  {
    dialect: 'postgres',
    dialectOptions: {
      ssl: useSSL ? {
        require: true,
        rejectUnauthorized: false // Necesario para algunos proveedores de hosting
      } : false
    },
    logging: isProduction ? false : console.log // Solo loguea en desarrollo
  }
);

// Verificar conexión
sequelize.authenticate()
  .then(() => {
    // console.log('Conexión exitosa a PostgreSQL mediante Sequelize');
  })
  .catch((err) => {
    console.error('Error conectando a la base de datos:', err);
  });

module.exports = sequelize;
