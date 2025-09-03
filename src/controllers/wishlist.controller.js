const Wishlist = require('../models/wishlist.model');
const Product = require('../models/product.model');

exports.addToWishlist = async (req, res) => {
  try {
    const { customer_id, product_id } = req.body;

    if (!customer_id || !product_id) {
      return res.status(400).json({ success: false, message: 'customer_id and product_id are required' });
    }
    
    // Check if item already exists in wishlist
    const existing = await Wishlist.findOne({
      where: { customer_id, product_id }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Item already in wishlist'
      });
    }

    const wishlistItem = await Wishlist.create({
      customer_id,
      product_id
    });

    res.status(201).json({
      success: true,
      data: wishlistItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const { customerId } = req.params;
    const wishlist = await Wishlist.findAll({
      where: { customer_id: customerId },
      include: [{ model: Product }]
    });

    res.json({
      success: true,
      data: wishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    await Wishlist.destroy({ where: { id } });
    
    res.status(200).json({
      success: true,
      message: 'Item removed from wishlist'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};