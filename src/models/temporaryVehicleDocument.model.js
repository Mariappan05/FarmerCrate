/**
 * Temporary Vehicle Documents Model
 * 
 * This model stores documents for rented/leased vehicles.
 * Since these are temporary vehicles, the focus is on rental agreements,
 * insurance copies, and basic compliance documents.
 * 
 * Key Features:
 * - Simplified document structure for rental vehicles
 * - Focuses on essential documents (RC copy, Insurance, Agreement)
 * - No ownership documents since vehicle is not owned
 * - Tracks rental agreement validity periods
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TemporaryVehicleDocument = sequelize.define('temporary_vehicle_documents', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Unique identifier for document record'
  },
  
  vehicle_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Reference to temporary vehicle (CASCADE DELETE)'
  },
  
  // RC Book Copy (from vehicle owner)
  rc_book_number: {
    type: DataTypes.STRING(100),
    comment: 'Registration certificate number (copy from owner)'
  },
  
  rc_book_issue_date: {
    type: DataTypes.DATEONLY,
    comment: 'Date when RC was issued'
  },
  
  rc_book_expiry_date: {
    type: DataTypes.DATEONLY,
    comment: 'RC expiry date'
  },
  
  rc_book_issuing_authority: {
    type: DataTypes.STRING(150),
    comment: 'RTO office that issued the RC'
  },
  
  rc_book_url: {
    type: DataTypes.TEXT,
    comment: 'Cloud storage link to RC copy'
  },
  
  // Insurance Copy (from vehicle owner)
  insurance_number: {
    type: DataTypes.STRING(100),
    comment: 'Insurance policy number (owner\'s policy)'
  },
  
  insurance_issue_date: {
    type: DataTypes.DATEONLY,
    comment: 'Insurance policy start date'
  },
  
  insurance_expiry_date: {
    type: DataTypes.DATEONLY,
    comment: 'Insurance policy expiry date'
  },
  
  insurance_issuing_authority: {
    type: DataTypes.STRING(150),
    comment: 'Insurance company name'
  },
  
  insurance_url: {
    type: DataTypes.TEXT,
    comment: 'Cloud storage link to insurance copy'
  }
}, {
  tableName: 'temporary_vehicle_documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  
  // Database indexes for performance
  indexes: [
    {
      name: 'idx_temp_docs_vehicle',
      fields: ['vehicle_id'],
      comment: 'Fast lookup of documents by vehicle'
    },
    {
      name: 'idx_temp_docs_insurance_expiry',
      fields: ['insurance_expiry_date'],
      comment: 'Track insurance validity for compliance'
    },
    {
      name: 'idx_temp_docs_rc_expiry',
      fields: ['rc_book_expiry_date'],
      comment: 'Track RC validity'
    }
  ]
});

module.exports = TemporaryVehicleDocument;