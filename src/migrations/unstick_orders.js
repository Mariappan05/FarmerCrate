const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize } = require(path.resolve(__dirname, '../config/database'));

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');

    const Order = require(path.resolve(__dirname, '../models/order.model'));

    const { Op } = require('sequelize');

    // Find orders stuck at ASSIGNED but have a delivery person
    const ordersToPush = await Order.findAll({
      where: {
        current_status: 'ASSIGNED',
        delivery_person_id: { [Op.not]: null }
      }
    });

    console.log(`Found ${ordersToPush.length} orders stuck at ASSIGNED.`);

    for (const order of ordersToPush) {
      const isSourceAssigned = !!order.source_transporter_id;
      const isDestAssigned = !!order.destination_transporter_id;
      
      // Usually, if it's ASSIGNED, it's just been accepted by source transporter
      let newStatus = 'PICKUP_ASSIGNED';
      
      console.log(`Updating order ${order.order_id} from ASSIGNED -> ${newStatus}`);
      await order.update({ current_status: newStatus });
    }

    // Double check REACHED_DESTINATION
    const reachedOrders = await Order.findAll({
      where: {
        current_status: 'REACHED_DESTINATION',
        delivery_person_id: { [Op.not]: null } // Wait, actually OUT_FOR_DELIVERY is handled correctly now.
        // Let's just fix the ASSIGNED ones.
      }
    });

    console.log('✅ Fix complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
})();
