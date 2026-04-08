const Order = require('../models/order.model');
const CustomerReturnRequest = require('../models/customerReturnRequest.model');

const RETURN_WINDOW_MS = 10 * 60 * 1000;
const ALLOWED_ORDER_STATUSES = ['DELIVERED', 'COMPLETED'];
let returnRequestColumnsCache = null;
const isProduction = process.env.NODE_ENV === 'production';

const parseUrlArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

const getCompletionTimestamp = (order) => {
  const candidates = [
    order.delivered_at,
    order.completed_at,
    order.delivery_completed_at,
    order.status_updated_at,
    order.updated_at,
    order.created_at,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const ts = new Date(value).getTime();
    if (!Number.isNaN(ts)) return ts;
  }
  return null;
};

const getReturnRequestColumns = async () => {
  if (returnRequestColumnsCache) return returnRequestColumnsCache;

  try {
    const tableName = CustomerReturnRequest.getTableName();
    const tableRef = typeof tableName === 'string'
      ? tableName
      : { tableName: tableName.tableName, schema: tableName.schema };

    const description = await CustomerReturnRequest.sequelize
      .getQueryInterface()
      .describeTable(tableRef);

    returnRequestColumnsCache = new Set(Object.keys(description || {}));
  } catch (error) {
    // Fallback keeps API functional when table introspection is unavailable.
    console.warn('[ReturnRequest] describeTable failed, falling back to model rawAttributes:', error?.message);
    returnRequestColumnsCache = new Set(Object.keys(CustomerReturnRequest.rawAttributes || {}));
  }

  return returnRequestColumnsCache;
};

const filterExistingFields = (payload, existingColumns) => {
  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (existingColumns.has(key) && value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const preferredReturnRequestAttributes = [
  'return_request_id',
  'order_id',
  'customer_id',
  'status',
  'report',
  'opening_video_url',
  'related_photos',
  'proof_evidence_photos',
  'submitted_at',
  'admin_review_status',
  'payment_release_status',
  'created_at',
  'updated_at',
];

const getSafeAttributes = (existingColumns) => preferredReturnRequestAttributes
  .filter((column) => existingColumns.has(column));

exports.submitReturnRequest = async (req, res) => {
  try {
    const existingColumns = await getReturnRequestColumns();
    const safeAttributes = getSafeAttributes(existingColumns);
    const orderId = Number(req.params.order_id || req.body.order_id || req.body.orderId);
    const customerId = req.user?.customer_id;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Valid order_id is required' });
    }

    if (!customerId) {
      return res.status(401).json({ message: 'Customer authentication required' });
    }

    const order = await Order.findOne({ where: { order_id: orderId, customer_id: customerId } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found for this customer' });
    }

    const normalizedStatus = String(order.current_status || '').toUpperCase();
    if (!ALLOWED_ORDER_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        message: 'Return is allowed only for delivered/completed orders',
      });
    }

    const completedAt = getCompletionTimestamp(order);
    if (!completedAt) {
      return res.status(400).json({ message: 'Unable to verify delivery completion time' });
    }

    const remainingMs = RETURN_WINDOW_MS - (Date.now() - completedAt);
    if (remainingMs <= 0) {
      return res.status(400).json({ message: 'Return window closed. Returns are allowed only for 10 minutes after delivery.' });
    }

    const report = String(req.body.report || req.body.return_reason || req.body.issue_report || '').trim();
    const openingVideoUrl = String(req.body.opening_video_url || req.body.openingVideoUrl || '').trim();
    const relatedPhotos = parseUrlArray(req.body.related_photos || req.body.opening_photos);
    const proofPhotos = parseUrlArray(req.body.proof_evidence_photos || req.body.evidence_photos);
    const submittedAt = req.body.submitted_at ? new Date(req.body.submitted_at) : new Date();

    if (!openingVideoUrl) {
      return res.status(400).json({ message: 'opening_video_url is required' });
    }
    if (!relatedPhotos.length) {
      return res.status(400).json({ message: 'At least one related photo is required' });
    }
    if (!proofPhotos.length) {
      return res.status(400).json({ message: 'At least one proof evidence photo is required' });
    }
    if (!report) {
      return res.status(400).json({ message: 'Report is required' });
    }

    const existingQuery = { where: { order_id: orderId } };
    if (safeAttributes.length) existingQuery.attributes = safeAttributes;
    const existing = await CustomerReturnRequest.findOne(existingQuery);
    if (existing) {
      return res.status(409).json({
        message: 'Return request already submitted for this order',
        data: existing,
      });
    }

    const createPayload = filterExistingFields({
      order_id: orderId,
      customer_id: customerId,
      status: 'REQUESTED',
      report,
      opening_video_url: openingVideoUrl,
      related_photos: relatedPhotos,
      proof_evidence_photos: proofPhotos,
      submitted_at: Number.isNaN(submittedAt.getTime()) ? new Date() : submittedAt,
    }, existingColumns);

    if (!Object.keys(createPayload).length) {
      return res.status(500).json({
        message: 'Return request table mapping is invalid. No writable columns available.',
        ...(isProduction ? {} : {
          debug: {
            existingColumns: Array.from(existingColumns),
          },
        }),
      });
    }

    const created = await CustomerReturnRequest.create(createPayload, {
      fields: Object.keys(createPayload),
    });

    return res.status(201).json({
      success: true,
      message: 'Return request submitted successfully',
      data: safeAttributes.length ? await CustomerReturnRequest.findByPk(
        created.return_request_id,
        { attributes: safeAttributes }
      ) : created,
    });
  } catch (error) {
    const debugPayload = {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      parentMessage: error?.parent?.message,
      originalMessage: error?.original?.message,
      sql: error?.sql,
    };
    console.error('[ReturnRequest] submitReturnRequest error:', debugPayload);
    return res.status(500).json({
      message: 'Failed to submit return request',
      ...(isProduction ? {} : { debug: debugPayload }),
    });
  }
};

exports.getMyReturnRequestByOrder = async (req, res) => {
  try {
    const existingColumns = await getReturnRequestColumns();
    const safeAttributes = getSafeAttributes(existingColumns);
    const orderId = Number(req.params.order_id);
    const customerId = req.user?.customer_id;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Valid order_id is required' });
    }

    if (!customerId) {
      return res.status(401).json({ message: 'Customer authentication required' });
    }

    const order = await Order.findOne({
      where: { order_id: orderId, customer_id: customerId },
      attributes: ['order_id', 'customer_id'],
    });
    if (!order) {
      return res.status(404).json({ message: 'Order not found for this customer' });
    }

    const rowQuery = {
      where: {
        order_id: orderId,
      },
    };
    if (existingColumns.has('customer_id')) {
      rowQuery.where.customer_id = customerId;
    }
    if (safeAttributes.length) rowQuery.attributes = safeAttributes;
    const row = await CustomerReturnRequest.findOne(rowQuery);

    if (!row) {
      return res.status(404).json({ message: 'Return request not found for this order' });
    }

    return res.json({ success: true, data: row });
  } catch (error) {
    const debugPayload = {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      parentMessage: error?.parent?.message,
      originalMessage: error?.original?.message,
      sql: error?.sql,
    };
    console.error('[ReturnRequest] getMyReturnRequestByOrder error:', debugPayload);
    return res.status(500).json({
      message: 'Failed to load return request',
      ...(isProduction ? {} : { debug: debugPayload }),
    });
  }
};
