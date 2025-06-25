'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'localidad', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'inscription_localidad_de_la_unidad_de_negocio',
        key: 'id'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'localidad');
  }
}; 