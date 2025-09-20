/**
 * Permanent Vehicle Documents Model
 * 
 * This model stores all legal documents required for permanent vehicles.
 * It tracks various certificates, permits, and compliance documents with
 * their expiry dates for proactive renewal management.
 * 
 * Key Features:
 * - Comprehensive document management for legal compliance
 * - Tracks expiry dates for proactive renewal alerts
 * - Stores cloud links to document images/PDFs
 * - Maintains issuing authority information for verification
 * - Single verification flag for overall document status
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PermanentVehicleDocument = sequelize.define('permanent_vehicle_documents', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Unique identifier for document record'
  },
  
  vehicle_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Reference to permanent vehicle (CASCADE DELETE)'
  },
  
  // RC Book (Registration Certificate) Details
  rc_book_number: {
    type: DataTypes.STRING(100),
    comment: 'Registration certificate number'
  },
  
  rc_book_issue_date: {
    type: DataTypes.DATEONLY,
    comment: 'Date when RC was issued'
  },
  
  rc_book_expiry_date: {
    type: DataTypes.DATEONLY,
    comment: 'RC expiry date (for commercial vehicles)'
  },
  
  rc_book_issuing_authority: {
    type: DataTypes.STRING(150),
    comment: 'RTO office that issued the RC'
  },
  
  rc_book_url: {
    type: DataTypes.TEXT,
    comment: 'Cloud storage link to RC document image/PDF'
  },
  
  // Insurance Details
  insurance_number: {
    type: DataTypes.STRING(100),
    comment: 'Insurance policy number'
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
    comment: 'Cloud storage link to insurance document'
  },
  
  // Fitness Certificate
  fitness_number: {
    type: DataTypes.STRING(100),
    comment: 'Fitness certificate number'
  },
  
  fitness_issue_date: {
    type: DataTypes.DATEONLY,
    comment: 'Fitness certificate issue date'
  },
  
  fitness_expiry_date: {
    type: DataTypes.DATEONLY,
    comment: 'Fitness certificate expiry date'
  },
  
  fitness_issuing_authority: {
    type: DataTypes.STRING(150),
    comment: 'Authority that issued fitness certificate'
  },
  
  fitness_url: {
    type: DataTypes.TEXT,
    comment: 'Cloud storage link to fitness certificate'
  },
  
  // Pollution Under Control Certificate
  pollution_number: {
    type: DataTypes.STRING(100),
    comment: 'PUC certificate number'
  },
  
  pollution_issue_date: {
    type: DataTypes.DATEONLY,
    comment: 'PUC certificate issue date'
  },
  
  pollution_expiry_date: {
    type: DataTypes.DATEONLY,
    comment: 'PUC certificate expiry date'
  },
  
  pollution_issuing_authority: {
    type: DataTypes.STRING(150),
    comment: 'Testing center that issued PUC'
  },
  
  pollution_url: {
    type: DataTypes.TEXT,
    comment: 'Cloud storage link to PUC certificate'
  },
  
  // Road Tax Details
  road_tax_number: {
    type: DataTypes.STRING(100),
    comment: 'Road tax receipt number'
  },
  
  road_tax_issue_date: {
    type: DataTypes.DATEONLY,
    comment: 'Road tax payment date'
  },
  
  road_tax_expiry_date: {
    type: DataTypes.DATEONLY,
    comment: 'Road tax validity end date'
  },
  
  road_tax_issuing_authority: {
    type: DataTypes.STRING(150),
    comment: 'Transport department office'
  },
  
  road_tax_url: {
    type: DataTypes.TEXT,
    comment: 'Cloud storage link to road tax receipt'
  },
  
  // Permit Details
  permit_number: {
    type: DataTypes.STRING(100),
    comment: 'Commercial vehicle permit number'
  },
  
  permit_issue_date: {
    type: DataTypes.DATEONLY,
    comment: 'Permit issue date'
  },
  
  permit_expiry_date: {
    type: DataTypes.DATEONLY,
    comment: 'Permit expiry date'
  },
  
  permit_issuing_authority: {
    type: DataTypes.STRING(150),
    comment: 'Regional transport office'
  },
  
  permit_url: {
    type: DataTypes.TEXT,
    comment: 'Cloud storage link to permit document'
  },
  
  // Inspection Report
  inspection_report_number: {
    type: DataTypes.STRING(100),
    comment: 'Vehicle inspection report number'
  },
  
  inspection_report_issue_date: {
    type: DataTypes.DATEONLY,
    comment: 'Inspection report date'
  },
  
  inspection_report_expiry_date: {
    type: DataTypes.DATEONLY,
    comment: 'Next inspection due date'
  },
  
  inspection_report_issuing_authority: {
    type: DataTypes.STRING(150),
    comment: 'Inspection authority'
  },
  
  inspection_report_url: {
    type: DataTypes.TEXT,
    comment: 'Cloud storage link to inspection report'
  },
  
  // Overall verification status
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether all documents have been verified by admin'
  }
}, {
  tableName: 'permanent_vehicle_documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
  
  // Database indexes for performance and compliance tracking
  indexes: [
    {
      name: 'idx_perm_docs_vehicle',
      fields: ['vehicle_id'],
      comment: 'Fast lookup of documents by vehicle'
    },
    {
      name: 'idx_perm_docs_insurance_expiry',
      fields: ['insurance_expiry_date'],
      comment: 'Track insurance renewals'
    },
    {
      name: 'idx_perm_docs_fitness_expiry',
      fields: ['fitness_expiry_date'],
      comment: 'Track fitness certificate renewals'
    },
    {
      name: 'idx_perm_docs_pollution_expiry',
      fields: ['pollution_expiry_date'],
      comment: 'Track PUC renewals'
    },
    {
      name: 'idx_perm_docs_verification',
      fields: ['is_verified'],
      comment: 'Filter verified/unverified documents'
    }
  ]
});

module.exports = PermanentVehicleDocument;