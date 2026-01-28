const Product = require('./product.model');
const ProductImage = require('./productImage.model');
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

// Farmer - Product relationship
Product.belongsTo(FarmerUser, { as: 'farmer', foreignKey: 'farmer_id', targetKey: 'farmer_id', onDelete: 'CASCADE' });
FarmerUser.hasMany(Product, { as: 'products', foreignKey: 'farmer_id', sourceKey: 'farmer_id', onDelete: 'CASCADE' });

// Product - ProductImage relationship
Product.hasMany(ProductImage, { 
  as: 'images', 
  foreignKey: 'product_id', 
  sourceKey: 'product_id', 
  onDelete: 'CASCADE'
});
ProductImage.belongsTo(Product, { 
  as: 'product', 
  foreignKey: 'product_id', 
  targetKey: 'product_id', 
  onDelete: 'CASCADE' 
});

// Customer - Order relationship
Order.belongsTo(CustomerUser, { as: 'customer', foreignKey: 'customer_id', targetKey: 'customer_id', onDelete: 'CASCADE' });
CustomerUser.hasMany(Order, { as: 'orders', foreignKey: 'customer_id', sourceKey: 'customer_id', onDelete: 'CASCADE' });

// Product - Order relationship
Order.belongsTo(Product, { foreignKey: 'product_id', targetKey: 'product_id', onDelete: 'CASCADE' });
Product.hasMany(Order, { foreignKey: 'product_id', sourceKey: 'product_id', onDelete: 'CASCADE' });

// Transporter - Order relationships
Order.belongsTo(TransporterUser, { as: 'source_transporter', foreignKey: 'source_transporter_id', targetKey: 'transporter_id', onDelete: 'SET NULL' });
Order.belongsTo(TransporterUser, { as: 'destination_transporter', foreignKey: 'destination_transporter_id', targetKey: 'transporter_id', onDelete: 'SET NULL' });
TransporterUser.hasMany(Order, { as: 'source_orders', foreignKey: 'source_transporter_id', sourceKey: 'transporter_id', onDelete: 'SET NULL' });
TransporterUser.hasMany(Order, { as: 'destination_orders', foreignKey: 'destination_transporter_id', sourceKey: 'transporter_id', onDelete: 'SET NULL' });

// DeliveryPerson - Order relationship
Order.belongsTo(DeliveryPerson, { as: 'delivery_person', foreignKey: 'delivery_person_id', targetKey: 'delivery_person_id', onDelete: 'SET NULL' });
DeliveryPerson.hasMany(Order, { as: 'orders', foreignKey: 'delivery_person_id', sourceKey: 'delivery_person_id', onDelete: 'SET NULL' });

// Customer - Cart relationship
Cart.belongsTo(CustomerUser, { as: 'customer', foreignKey: 'customer_id', targetKey: 'customer_id', onDelete: 'CASCADE' });
CustomerUser.hasMany(Cart, { as: 'cart_items', foreignKey: 'customer_id', sourceKey: 'customer_id', onDelete: 'CASCADE' });

// Product - Cart relationship
Cart.belongsTo(Product, { as: 'cart_product', foreignKey: 'product_id', targetKey: 'product_id', onDelete: 'CASCADE' });
Product.hasMany(Cart, { as: 'cart_items', foreignKey: 'product_id', sourceKey: 'product_id', onDelete: 'CASCADE' });

// Farmer - Transaction relationships
Transaction.belongsTo(FarmerUser, { as: 'farmer', foreignKey: 'farmer_id', targetKey: 'farmer_id', onDelete: 'CASCADE' });
FarmerUser.hasMany(Transaction, { as: 'transactions', foreignKey: 'farmer_id', sourceKey: 'farmer_id', onDelete: 'CASCADE' });

// Wishlist Associations
CustomerUser.hasMany(Wishlist, { foreignKey: 'customer_id', sourceKey: 'customer_id' });
Wishlist.belongsTo(CustomerUser, { foreignKey: 'customer_id', targetKey: 'customer_id' });
Product.hasMany(Wishlist, { foreignKey: 'product_id', sourceKey: 'product_id' });
Wishlist.belongsTo(Product, { foreignKey: 'product_id', targetKey: 'product_id' });

// Transporter - Vehicle relationships
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

// Vehicle - Documents relationships
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

module.exports = {};