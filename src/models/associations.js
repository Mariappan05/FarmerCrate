const Product = require('./product.model');
const FarmerUser = require('./farmer_user.model');
const CustomerUser = require('./customer_user.model');
const TransporterUser = require('./transporter_user.model');
const Order = require('./order.model');
const Cart = require('./cart.model');
const Transaction = require('./transaction.model');
const DeliveryPerson = require('./deliveryPerson.model');

// Farmer - Product relationship
Product.belongsTo(FarmerUser, { as: 'farmer', foreignKey: 'farmer_id', onDelete: 'CASCADE' });
FarmerUser.hasMany(Product, { as: 'products', foreignKey: 'farmer_id', onDelete: 'CASCADE' });

// Customer - Order relationship
Order.belongsTo(CustomerUser, { as: 'customer', foreignKey: 'consumer_id', onDelete: 'CASCADE' });
CustomerUser.hasMany(Order, { as: 'orders', foreignKey: 'consumer_id', onDelete: 'CASCADE' });

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

module.exports = {};
