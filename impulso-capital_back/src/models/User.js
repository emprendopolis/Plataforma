const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');
const Role = require('./Role'); // Importamos el modelo de Role para crear la relación
const Localidad = require('./Localidad'); // Importamos el modelo de Localidad

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  documento: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Role,
      key: 'id',
    },
  },
  localidad: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'inscription_localidad_de_la_unidad_de_negocio',
      key: 'id',
    },
  },
  status: {
    type: DataTypes.INTEGER,
    defaultValue: 1, // 1 para activo, 0 para inactivo
    allowNull: false,
  },
  last_login: {
    type: DataTypes.DATE, // Nuevo campo para almacenar la fecha y hora del último login
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Relación de Usuario con Rol (Muchos a Uno)
User.belongsTo(Role, { foreignKey: 'role_id' });

// Relación de Usuario con Localidad (Muchos a Uno)
User.belongsTo(Localidad, {
  foreignKey: 'localidad',
  as: 'Localidad'
});

module.exports = User;
