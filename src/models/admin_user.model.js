const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminUser = sequelize.define('admin_users', {
  admin_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  mobile_number: {
    type: DataTypes.STRING(20)
  },
  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'admin'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_login: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'admin_users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = AdminUser;