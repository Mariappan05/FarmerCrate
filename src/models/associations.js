const CustomerUser = require('./customer_user.model');
const Product = require('./product.model');
const FarmerUser = require('./farmer_user.model');
const Wishlist = require('./wishlist.model');

// Product Associations
Product.belongsTo(FarmerUser, { as: 'farmer', foreignKey: 'farmer_id' });
FarmerUser.hasMany(Product, { as: 'products', foreignKey: 'farmer_id' });

// Wishlist Associations
CustomerUser.hasMany(Wishlist, { foreignKey: 'customer_id' });
Wishlist.belongsTo(CustomerUser, { foreignKey: 'customer_id' });
Product.hasMany(Wishlist, { foreignKey: 'product_id' });
Wishlist.belongsTo(Product, { foreignKey: 'product_id' });

// Export models
module.exports = {
  CustomerUser,
  Product,
  FarmerUser,
  Wishlist
};
