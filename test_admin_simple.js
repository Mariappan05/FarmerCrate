const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Simple admin test
async function testAdminBasic() {
  console.log('🧪 Testing Basic Admin Functionality\n');

  try {
    // Test 1: Register a new admin
    console.log('1. Testing Admin Registration...');
    const adminData = {
      name: 'Test Admin',
      email: 'testadmin@farmercrate.com',
      password: 'test123',
      mobileNumber: '+919876543210',
      adminRole: 'admin',
      role: 'admin'
    };

    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, adminData);
      console.log('✅ Admin registration successful:', registerResponse.data.message);
    } catch (error) {
      if (error.response && error.response.data.message === 'Admin already exists') {
        console.log('ℹ️ Admin already exists (expected if previously created)');
      } else {
        console.log('❌ Admin registration failed:', error.response?.data?.message || error.message);
      }
    }

    // Test 2: Login as admin
    console.log('\n2. Testing Admin Login...');
    const loginData = {
      email: 'testadmin@farmercrate.com',
      password: 'test123',
      role: 'admin'
    };

    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
      console.log('✅ Admin login successful:', {
        message: loginResponse.data.message,
        user: loginResponse.data.user,
        hasToken: !!loginResponse.data.token
      });
    } catch (error) {
      console.log('❌ Admin login failed:', error.response?.data?.message || error.message);
    }

    // Test 3: Test with default admin
    console.log('\n3. Testing Default Admin Login...');
    const defaultAdminData = {
      email: 'admin@farmercrate.com',
      password: 'admin123',
      role: 'admin'
    };

    try {
      const defaultLoginResponse = await axios.post(`${BASE_URL}/auth/login`, defaultAdminData);
      console.log('✅ Default admin login successful:', {
        message: defaultLoginResponse.data.message,
        user: defaultLoginResponse.data.user,
        hasToken: !!defaultLoginResponse.data.token
      });
    } catch (error) {
      console.log('❌ Default admin login failed:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Basic admin functionality test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAdminBasic(); 