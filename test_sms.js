const { sendVerificationCodeSMS, sendApprovalNotificationSMS, generateVerificationCode } = require('./src/utils/sms.util');

async function testSMS() {
  console.log('🧪 Testing SMS Functionality\n');

  try {
    // Test 1: Generate verification code
    console.log('1. Testing verification code generation...');
    const code = generateVerificationCode();
    console.log(`✅ Generated code: ${code}`);

    // Test 2: Send verification code SMS
    console.log('\n2. Testing verification code SMS...');
    const testMobile = '+919876543210'; // Replace with your test number
    const smsResult = await sendVerificationCodeSMS(testMobile, code);
    console.log(`✅ SMS result: ${smsResult ? 'Success' : 'Failed'}`);

    // Test 3: Send approval notification
    console.log('\n3. Testing approval notification SMS...');
    const approvalResult = await sendApprovalNotificationSMS(testMobile, 'Test Farmer');
    console.log(`✅ Approval SMS result: ${approvalResult ? 'Success' : 'Failed'}`);

    console.log('\n🎉 SMS testing completed!');
    console.log('\n📋 Check your console for SMS logs.');
    console.log('📱 If Twilio is configured, check your phone for actual SMS messages.');

  } catch (error) {
    console.error('❌ SMS test failed:', error.message);
  }
}

// Run the test
testSMS(); 