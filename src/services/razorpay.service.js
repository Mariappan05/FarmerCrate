const Razorpay = require('razorpay');

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay configuration missing on server');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

const getRazorpayErrorMessage = (error) => {
  if (!error) return 'Unknown Razorpay error';

  return (
    error?.error?.description ||
    error?.response?.data?.error?.description ||
    error?.description ||
    error?.message ||
    'Unknown Razorpay error'
  );
};

class RazorpayService {
  static async createOrder(amount, currency = 'INR', receipt) {
    try {
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Invalid order amount. Amount must be greater than zero');
      }

      const razorpay = getRazorpayClient();
      const options = {
        amount: Math.round(numericAmount * 100), // Convert to paise
        currency,
        receipt,
      };
      
      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      throw new Error(`Razorpay order creation failed: ${getRazorpayErrorMessage(error)}`);
    }
  }

  static async verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
    try {
      console.log('\n=== PAYMENT VERIFICATION DEBUG ===');
      console.log('Order ID:', razorpay_order_id);
      console.log('Payment ID:', razorpay_payment_id);
      console.log('Received Signature:', razorpay_signature);
      console.log('JWT Secret:', process.env.RAZORPAY_KEY_SECRET ? 'Present' : 'Missing');

      if (!process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay key secret missing on server');
      }
      
      const crypto = require('crypto');
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      console.log('Body for signature:', body);
      
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');
      
      console.log('Expected Signature:', expectedSignature);
      console.log('Signatures Match:', expectedSignature === razorpay_signature);
      console.log('=== END PAYMENT VERIFICATION ===\n');
      
      // For testing: bypass verification if using test values
      if (razorpay_payment_id === 'pay_test_payment_id' && razorpay_signature === 'test_signature') {
        console.log('🧪 Using test payment credentials - bypassing verification');
        return true;
      }
      
      return expectedSignature === razorpay_signature;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw new Error(`Payment verification failed: ${getRazorpayErrorMessage(error)}`);
    }
  }

  static async transferFunds({ account_number, ifsc_code, amount, purpose, reference }) {
    try {
      // For testing: Simulate successful transfer
      // In production, uncomment the actual Razorpay API calls below
      console.log('💡 Simulating fund transfer (Razorpay X API not configured)');
      
      return {
        success: true,
        transfer_id: `test_transfer_${Date.now()}`,
        status: 'processed',
        amount: amount,
        reference: reference,
        simulated: true
      };
      
      /* Uncomment for production with Razorpay X account:
      
      // Create contact
      const contact = await razorpay.contacts.create({
        name: 'Beneficiary',
        email: 'beneficiary@farmercrate.com',
        contact: '9999999999',
        type: 'vendor',
        reference_id: reference
      });

      // Create fund account
      const fundAccount = await razorpay.fundAccounts.create({
        contact_id: contact.id,
        account_type: 'bank_account',
        bank_account: {
          name: 'Beneficiary Name',
          ifsc: ifsc_code,
          account_number: account_number
        }
      });

      // Create payout
      const payout = await razorpay.payouts.create({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: fundAccount.id,
        amount: amount * 100,
        currency: 'INR',
        mode: 'IMPS',
        purpose: purpose,
        queue_if_low_balance: true,
        reference_id: reference,
        narration: purpose
      });

      return {
        success: true,
        transfer_id: payout.id,
        status: payout.status,
        amount: amount,
        reference: reference
      };
      */
    } catch (error) {
      console.error('Fund transfer error:', error);
      return {
        success: false,
        error: error.message,
        amount: amount,
        reference: reference
      };
    }
  }
}

module.exports = RazorpayService;