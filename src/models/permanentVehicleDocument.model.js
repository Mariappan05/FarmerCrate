const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PermanentVehicleDocument = sequelize.define('permanent_vehicle_documents', {
  perm_doc_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  vehicle_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  rc_book_number: { type: DataTypes.STRING(100) },
  rc_book_issue_date: { type: DataTypes.DATEONLY },
  rc_book_expiry_date: { type: DataTypes.DATEONLY },
  rc_book_issuing_authority: { type: DataTypes.STRING(150) },
  rc_book_url: { type: DataTypes.TEXT },
  insurance_number: { type: DataTypes.STRING(100) },
  insurance_issue_date: { type: DataTypes.DATEONLY },
  insurance_expiry_date: { type: DataTypes.DATEONLY },
  insurance_issuing_authority: { type: DataTypes.STRING(150) },
  insurance_url: { type: DataTypes.TEXT },
  fitness_number: { type: DataTypes.STRING(100) },
  fitness_issue_date: { type: DataTypes.DATEONLY },
  fitness_expiry_date: { type: DataTypes.DATEONLY },
  fitness_issuing_authority: { type: DataTypes.STRING(150) },
  fitness_url: { type: DataTypes.TEXT },
  pollution_number: { type: DataTypes.STRING(100) },
  pollution_issue_date: { type: DataTypes.DATEONLY },
  pollution_expiry_date: { type: DataTypes.DATEONLY },
  pollution_issuing_authority: { type: DataTypes.STRING(150) },
  pollution_url: { type: DataTypes.TEXT },
  road_tax_number: { type: DataTypes.STRING(100) },
  road_tax_issue_date: { type: DataTypes.DATEONLY },
  road_tax_expiry_date: { type: DataTypes.DATEONLY },
  road_tax_issuing_authority: { type: DataTypes.STRING(150) },
  road_tax_url: { type: DataTypes.TEXT },
  permit_number: { type: DataTypes.STRING(100) },
  permit_issue_date: { type: DataTypes.DATEONLY },
  permit_expiry_date: { type: DataTypes.DATEONLY },
  permit_issuing_authority: { type: DataTypes.STRING(150) },
  permit_url: { type: DataTypes.TEXT },
  inspection_report_number: { type: DataTypes.STRING(100) },
  inspection_report_issue_date: { type: DataTypes.DATEONLY },
  inspection_report_expiry_date: { type: DataTypes.DATEONLY },
  inspection_report_issuing_authority: { type: DataTypes.STRING(150) },
  inspection_report_url: { type: DataTypes.TEXT },
  is_verified: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'permanent_vehicle_documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = PermanentVehicleDocument;