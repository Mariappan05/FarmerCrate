const Wishlist = require('../models/wishlist.model');
const Product = require('../models/product.model');
const ProductImage = require('../models/productImage.model');

exports.addToWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;
    const customer_id = req.user.customer_id;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'product_id is required' });
    }
    
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
    const customer_id = req.user.customer_id;
    const wishlist = await Wishlist.findAll({
      where: { customer_id },
      include: [{ 
        model: Product,
        attributes: ['product_id', 'name', 'description', 'current_price', 'status'],
        include: [{
          model: ProductImage,
          as: 'images',
          attributes: ['image_url', 'is_primary']
        }]
      }]
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
    const customer_id = req.user.customer_id;
    
    await Wishlist.destroy({ 
      where: { 
        wishlist_id: id,
        customer_id 
      } 
    });
    
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