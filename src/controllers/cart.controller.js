const { validationResult } = require('express-validator');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
const ProductImage = require('../models/productImage.model');
const FarmerUser = require('../models/farmer_user.model');

exports.addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { product_id, quantity } = req.body;
    const customer_id = req.user.customer_id;

    const product = await Product.findOne({
      where: { 
        product_id,
        status: 'available'
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or not available' });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({ 
        message: 'Requested quantity not available',
        availableQuantity: product.quantity
      });
    }

    let cartItem = await Cart.findOne({
      where: { customer_id, product_id }
    });

    if (cartItem) {
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      cartItem = await Cart.create({
        customer_id,
        product_id,
        quantity
      });
    }

    res.status(201).json({
      success: true,
      message: 'Item added to cart successfully',
      data: cartItem
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Error adding item to cart' });
  }
};

exports.getCart = async (req, res) => {
  try {
    const customer_id = req.user.customer_id;

    const cartItems = await Cart.findAll({
      where: { customer_id },
      include: [{
        model: Product,
        as: 'cart_product',
        attributes: ['product_id', 'name', 'description', 'current_price'],
        include: [
          {
            model: FarmerUser,
            as: 'farmer',
            attributes: ['name', 'mobile_number']
          },
          {
            model: ProductImage,
            as: 'images',
            attributes: ['image_url', 'is_primary']
          }
        ]
      }]
    });

    res.json({
      success: true,
      data: cartItems
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Error retrieving cart' });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { quantity } = req.body;
    const customer_id = req.user.customer_id;

    const cartItem = await Cart.findOne({
      where: { cart_id: id, customer_id }
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: cartItem
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Error updating cart item' });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    const customer_id = req.user.customer_id;

    const cartItem = await Cart.findOne({
      where: { cart_id: id, customer_id }
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    await cartItem.destroy();

    res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Error removing item from cart' });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const customer_id = req.user.customer_id;

    await Cart.destroy({
      where: { customer_id }
    });

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Error clearing cart' });
  }
};

exports.checkoutMultipleItems = async (req, res) => {
  try {
    const { cart_ids } = req.body;
    const customer_id = req.user.customer_id;

    if (!cart_ids || !Array.isArray(cart_ids) || cart_ids.length === 0) {
      return res.status(400).json({ message: 'Cart IDs array is required' });
    }

    const cartItems = await Cart.findAll({
      where: { 
        cart_id: cart_ids, 
        customer_id 
      },
      include: [{
        model: Product,
        as: 'cart_product',
        attributes: ['product_id', 'name', 'current_price', 'quantity', 'farmer_id'],
        include: [{
          model: FarmerUser,
          as: 'farmer',
          attributes: ['name', 'zone', 'district', 'state']
        }, {
          model: ProductImage,
          as: 'images',
          attributes: ['image_url', 'is_primary']
        }]
      }]
    });

    if (cartItems.length === 0) {
      return res.status(404).json({ message: 'No cart items found' });
    }

    // Group items by farmer
    const farmerGroups = {};
    
    for (const cartItem of cartItems) {
      const product = cartItem.cart_product;
      const farmerId = product.farmer_id;
      
      if (!farmerGroups[farmerId]) {
        farmerGroups[farmerId] = {
          farmer_id: farmerId,
          farmer_name: product.farmer.name,
          items: [],
          subtotal: 0,
          admin_commission: 0,
          farmer_amount: 0
        };
      }
      
      const quantity = cartItem.quantity;
      const unitPrice = parseFloat(product.current_price);
      const itemTotal = unitPrice * quantity;
      const adminCommission = itemTotal * 0.03;
      const farmerAmount = itemTotal - adminCommission;
      
      farmerGroups[farmerId].items.push({
        cart_id: cartItem.cart_id,
        product_id: product.product_id,
        product_name: product.name,
        quantity,
        unit_price: unitPrice,
        item_total: itemTotal,
        images: product.images
      });
      
      farmerGroups[farmerId].subtotal += itemTotal;
      farmerGroups[farmerId].admin_commission += adminCommission;
      farmerGroups[farmerId].farmer_amount += farmerAmount;
    }

    // Create separate orders for each farmer
    const separateOrders = Object.values(farmerGroups).map(group => {
      const transportCharge = 5.00;
      const totalPrice = group.subtotal + transportCharge;
      
      return {
        farmer_id: group.farmer_id,
        farmer_name: group.farmer_name,
        items: group.items,
        subtotal: group.subtotal,
        admin_commission: group.admin_commission,
        farmer_amount: group.farmer_amount,
        transport_charge: transportCharge,
        total_price: totalPrice
      };
    });

    res.json({
      success: true,
      message: 'Orders split by farmer - pay separately',
      data: {
        separate_orders: separateOrders,
        total_orders: separateOrders.length,
        grand_total: separateOrders.reduce((sum, order) => sum + order.total_price, 0)
      }
    });
  } catch (error) {
    console.error('Checkout multiple items error:', error);
    res.status(500).json({ message: 'Error processing checkout' });
  }
};