const ProductImage = require('../models/productImage.model');
const Product = require('../models/product.model');

exports.addProductImage = async (req, res) => {
  try {
    if (!req.user || req.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can add product images' });
    }

    const { product_id, image_url, is_primary = false } = req.body;
    
    const product = await Product.findByPk(product_id);
    if (!product || product.farmer_id !== req.user.farmer_id) {
      return res.status(404).json({ message: 'Product not found or not owned by you' });
    }

    const productImage = await ProductImage.create({
      product_id,
      image_url,
      is_primary
    });

    res.status(201).json({
      success: true,
      message: 'Product image added successfully',
      data: productImage
    });
  } catch (error) {
    console.error('Add product image error:', error);
    res.status(500).json({ message: 'Error adding product image' });
  }
};

exports.deleteProductImage = async (req, res) => {
  try {
    if (!req.user || req.role !== 'farmer') {
      return res.status(403).json({ message: 'Only farmers can delete product images' });
    }

    const productImage = await ProductImage.findByPk(req.params.id, {
      include: [{ model: Product, as: 'product' }]
    });

    if (!productImage || productImage.product.farmer_id !== req.user.farmer_id) {
      return res.status(404).json({ message: 'Product image not found or not owned by you' });
    }

    await productImage.destroy();

    res.json({
      success: true,
      message: 'Product image deleted successfully'
    });
  } catch (error) {
    console.error('Delete product image error:', error);
    res.status(500).json({ message: 'Error deleting product image' });
  }
};