const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;

const AdminUser = sequelize.define('admin_users', {
  admin_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  mobile_number: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'moderator'),
    allowNull: false,
    defaultValue: 'admin'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  deactivated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deactivation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reactivated_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'admin_users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = AdminUser;