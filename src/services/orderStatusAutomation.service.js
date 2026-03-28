const { Op } = require('sequelize');
const Order = require('../models/order.model');

let timerRef = null;
let inProgress = false;

const toIntOrDefault = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const shouldEnableAutomation = () => {
  const raw = String(process.env.AUTO_TRANSIT_ENABLED ?? 'true').trim().toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(raw);
};

const runAutoTransition = async () => {
  if (inProgress) return;
  inProgress = true;

  try {
    const afterMinutes = Math.max(1, toIntOrDefault(process.env.AUTO_TRANSIT_AFTER_MINUTES, 15));
    const threshold = new Date(Date.now() - afterMinutes * 60 * 1000);

    const [updatedCount] = await Order.update(
      { current_status: 'IN_TRANSIT' },
      {
        where: {
          current_status: 'SHIPPED',
          updated_at: { [Op.lte]: threshold },
        },
      }
    );

    if (updatedCount > 0) {
      console.log(`[OrderStatusAutomation] Auto-moved ${updatedCount} order(s) SHIPPED -> IN_TRANSIT after ${afterMinutes} minute(s).`);
    }
  } catch (error) {
    console.error('[OrderStatusAutomation] Auto transition failed:', error.message);
  } finally {
    inProgress = false;
  }
};

const startOrderStatusAutomation = () => {
  if (!shouldEnableAutomation()) {
    console.log('[OrderStatusAutomation] Disabled by AUTO_TRANSIT_ENABLED.');
    return;
  }

  if (timerRef) return;

  const intervalMs = Math.max(15000, toIntOrDefault(process.env.AUTO_TRANSIT_CHECK_INTERVAL_MS, 60000));
  timerRef = setInterval(() => {
    runAutoTransition();
  }, intervalMs);

  console.log(`[OrderStatusAutomation] Started. Check every ${intervalMs}ms.`);
  runAutoTransition();
};

const stopOrderStatusAutomation = () => {
  if (timerRef) {
    clearInterval(timerRef);
    timerRef = null;
  }
};

module.exports = {
  startOrderStatusAutomation,
  stopOrderStatusAutomation,
};
