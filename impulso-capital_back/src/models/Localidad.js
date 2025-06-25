const { DataTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');

const Localidad = sequelize.define('inscription_localidad_de_la_unidad_de_negocio', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  'Localidad de la unidad de negocio': {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'inscription_localidad_de_la_unidad_de_negocio',
  timestamps: false,
});

module.exports = Localidad; 