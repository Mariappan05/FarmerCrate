const Product = require('./product.model');
const FarmerUser = require('./farmer_user.model');

Product.belongsTo(FarmerUser, { as: 'farmer', foreignKey: 'farmer_id' });
FarmerUser.hasMany(Product, { as: 'products', foreignKey: 'farmer_id' });

module.exports = {};
