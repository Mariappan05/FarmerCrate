const Order = require('../models/order.model');

exports.updateBillUrl = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { bill_url } = req.body;

    if (!bill_url) {
      return res.status(400).json({ success: false, message: 'Bill URL is required' });
    }

    const order = await Order.findByPk(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await order.update({ bill_url });

    res.json({
      success: true,
      message: 'Bill URL updated successfully',
      data: { order_id, bill_url }
    });
  } catch (error) {
    console.error('Update bill URL error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getBillUrl = async (req, res) => {
  try {
    const { order_id } = req.params;

    const order = await Order.findByPk(order_id, {
      attributes: ['order_id', 'bill_url', 'total_price', 'current_status']
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get bill URL error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
