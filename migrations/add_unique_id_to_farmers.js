module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('farmers', 'unique_id', {
      type: Sequelize.STRING(50),
      unique: true,
      allowNull: true
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('farmers', 'unique_id');
  }
};
