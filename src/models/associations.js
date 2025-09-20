const Product = require('./product.model');
const FarmerUser = require('./farmer_user.model');
const CustomerUser = require('./customer_user.model');
const TransporterUser = require('./transporter_user.model');
const Order = require('./order.model');
const Cart = require('./cart.model');
const Transaction = require('./transaction.model');
const DeliveryPerson = require('./deliveryPerson.model');
const Wishlist = require('./wishlist.model');

// Vehicle Models
const PermanentVehicle = require('./permanentVehicle.model');
const TemporaryVehicle = require('./temporaryVehicle.model');
const PermanentVehicleDocument = require('./permanentVehicleDocument.model');
const TemporaryVehicleDocument = require('./temporaryVehicleDocument.model');

// Farmer - Product relationship
Product.belongsTo(FarmerUser, { as: 'farmer', foreignKey: 'farmer_id', onDelete: 'CASCADE' });
FarmerUser.hasMany(Product, { as: 'products', foreignKey: 'farmer_id', onDelete: 'CASCADE' });

// Customer - Order relationship
Order.belongsTo(CustomerUser, { as: 'consumer', foreignKey: 'consumer_id', onDelete: 'CASCADE' });
CustomerUser.hasMany(Order, { as: 'orders', foreignKey: 'consumer_id', onDelete: 'CASCADE' });

// Farmer - Order relationship
Order.belongsTo(FarmerUser, { as: 'farmer', foreignKey: 'farmer_id', onDelete: 'CASCADE' });
FarmerUser.hasMany(Order, { as: 'orders', foreignKey: 'farmer_id', onDelete: 'CASCADE' });

// Product - Order relationship
Order.belongsTo(Product, { foreignKey: 'product_id', onDelete: 'CASCADE' });
Product.hasMany(Order, { foreignKey: 'product_id', onDelete: 'CASCADE' });

// DeliveryPerson - Order relationship
Order.belongsTo(DeliveryPerson, { as: 'delivery_person', foreignKey: 'delivery_person_id', onDelete: 'SET NULL' });
DeliveryPerson.hasMany(Order, { as: 'orders', foreignKey: 'delivery_person_id', onDelete: 'SET NULL' });

// Customer - Cart relationship
Cart.belongsTo(CustomerUser, { as: 'customer', foreignKey: 'customerId', onDelete: 'CASCADE' });
CustomerUser.hasMany(Cart, { as: 'cart_items', foreignKey: 'customerId', onDelete: 'CASCADE' });

// Product - Cart relationship
Cart.belongsTo(Product, { as: 'cart_product', foreignKey: 'productId', onDelete: 'CASCADE' });
Product.hasMany(Cart, { as: 'cart_items', foreignKey: 'productId', onDelete: 'CASCADE' });

// User - Transaction relationships
Transaction.belongsTo(FarmerUser, { as: 'farmer', foreignKey: 'farmer_id', onDelete: 'CASCADE' });
FarmerUser.hasMany(Transaction, { as: 'transactions', foreignKey: 'farmer_id', onDelete: 'CASCADE' });

// Transporter - DeliveryPerson relationship
DeliveryPerson.belongsTo(TransporterUser, { as: 'transporter', foreignKey: 'user_id', targetKey: 'transporter_id', onDelete: 'CASCADE' });
TransporterUser.hasMany(DeliveryPerson, { as: 'delivery_persons', foreignKey: 'user_id', sourceKey: 'transporter_id', onDelete: 'CASCADE' });

// Wishlist Associations
CustomerUser.hasMany(Wishlist, { foreignKey: 'customer_id' });
Wishlist.belongsTo(CustomerUser, { foreignKey: 'customer_id' });
Product.hasMany(Wishlist, { foreignKey: 'product_id' });
Wishlist.belongsTo(Product, { foreignKey: 'product_id' });

/**
 * VEHICLE MANAGEMENT ASSOCIATIONS
 * 
 * These associations establish relationships between transporters and their vehicles,
 * as well as between vehicles and their documents. CASCADE delete ensures data
 * integrity - when a transporter is deleted, all their vehicles are removed,
 * and when a vehicle is deleted, all its documents are removed.
 */

// Transporter - Permanent Vehicle relationship (1:N)
// When transporter is deleted, all their permanent vehicles are deleted (CASCADE)
TransporterUser.hasMany(PermanentVehicle, { 
  as: 'permanent_vehicles', 
  foreignKey: 'transporter_id', 
  sourceKey: 'transporter_id',
  onDelete: 'CASCADE' 
});

PermanentVehicle.belongsTo(TransporterUser, { 
  as: 'transporter', 
  foreignKey: 'transporter_id', 
  targetKey: 'transporter_id',
  onDelete: 'CASCADE' 
});

// Transporter - Temporary Vehicle relationship (1:N)
// When transporter is deleted, all their temporary vehicles are deleted (CASCADE)
TransporterUser.hasMany(TemporaryVehicle, { 
  as: 'temporary_vehicles', 
  foreignKey: 'transporter_id', 
  sourceKey: 'transporter_id',
  onDelete: 'CASCADE' 
});

TemporaryVehicle.belongsTo(TransporterUser, { 
  as: 'transporter', 
  foreignKey: 'transporter_id', 
  targetKey: 'transporter_id',
  onDelete: 'CASCADE' 
});

// Permanent Vehicle - Documents relationship (1:1)
// When permanent vehicle is deleted, its documents are deleted (CASCADE)
PermanentVehicle.hasOne(PermanentVehicleDocument, { 
  as: 'documents', 
  foreignKey: 'vehicle_id', 
  onDelete: 'CASCADE' 
});

PermanentVehicleDocument.belongsTo(PermanentVehicle, { 
  as: 'vehicle', 
  foreignKey: 'vehicle_id', 
  onDelete: 'CASCADE' 
});

// Temporary Vehicle - Documents relationship (1:1)
// When temporary vehicle is deleted, its documents are deleted (CASCADE)
TemporaryVehicle.hasOne(TemporaryVehicleDocument, { 
  as: 'documents', 
  foreignKey: 'vehicle_id', 
  onDelete: 'CASCADE' 
});

TemporaryVehicleDocument.belongsTo(TemporaryVehicle, { 
  as: 'vehicle', 
  foreignKey: 'vehicle_id', 
  onDelete: 'CASCADE' 
});

module.exports = {};