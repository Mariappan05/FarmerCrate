/**
 * TABLE-WISE CASCADE DELETE TEST DATA
 * 
 * Test data and examples for table-specific user deletion with CASCADE
 * Use this data to test the table-wise delete functionality
 */

const tableWiseDeleteTestData = {
  // Test admin token (replace with actual admin JWT token)
  adminToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  
  // Base API URL
  baseUrl: "http://localhost:3000/api/admin",

  // Test scenarios for each table
  testScenarios: {
    
    // 1. Delete from farmer_users table
    farmer_table_delete: {
      endpoint: "/tables/farmer_users/123",
      method: "DELETE",
      description: "Delete farmer ID 123 from farmer_users table with CASCADE",
      expectedCascade: ["products", "orders", "transactions", "cart", "wishlists"],
      curl: `curl -X DELETE "http://localhost:3000/api/admin/tables/farmer_users/123" -H "Authorization: Bearer {token}"`
    },

    // 2. Delete from customer_users table  
    customer_table_delete: {
      endpoint: "/tables/customer_users/456",
      method: "DELETE", 
      description: "Delete customer ID 456 from customer_users table with CASCADE",
      expectedCascade: ["orders", "cart", "wishlists"],
      curl: `curl -X DELETE "http://localhost:3000/api/admin/tables/customer_users/456" -H "Authorization: Bearer {token}"`
    },

    // 3. Delete from transporter_users table
    transporter_table_delete: {
      endpoint: "/tables/transporter_users/789",
      method: "DELETE",
      description: "Delete transporter ID 789 from transporter_users table with CASCADE", 
      expectedCascade: ["delivery_persons", "permanent_vehicles", "temporary_vehicles", "vehicle_documents"],
      curl: `curl -X DELETE "http://localhost:3000/api/admin/tables/transporter_users/789" -H "Authorization: Bearer {token}"`
    },

    // 4. Delete from delivery_persons table
    delivery_person_table_delete: {
      endpoint: "/tables/delivery_persons/101",
      method: "DELETE",
      description: "Delete delivery person ID 101 from delivery_persons table",
      expectedCascade: [],
      expectedSetNull: ["orders.delivery_person_id"],
      curl: `curl -X DELETE "http://localhost:3000/api/admin/tables/delivery_persons/101" -H "Authorization: Bearer {token}"`
    },

    // 5. Delete from admin_users table
    admin_table_delete: {
      endpoint: "/tables/admin_users/202",
      method: "DELETE",
      description: "Delete admin ID 202 from admin_users table (cannot delete self)",
      expectedCascade: [],
      curl: `curl -X DELETE "http://localhost:3000/api/admin/tables/admin_users/202" -H "Authorization: Bearer {token}"`
    },

    // 6. Generic table delete
    generic_table_delete: {
      endpoint: "/tables/farmer_users/303",
      method: "DELETE",
      description: "Generic table delete using table name and user ID",
      expectedCascade: ["products", "orders", "transactions", "cart", "wishlists"],
      curl: `curl -X DELETE "http://localhost:3000/api/admin/tables/farmer_users/303" -H "Authorization: Bearer {token}"`
    }
  },

  // Expected response format
  expectedResponses: {
    success: {
      "success": true,
      "message": "Record deleted from farmer_users table with CASCADE",
      "data": {
        "deleted_from_table": "farmer_users",
        "deleted_at": "2025-09-20T10:30:00.000Z",
        "deleted_by": 1,
        "cascade_impact": {
          "table": "farmer_users",
          "farmer_id": 123,
          "farmer_name": "John Doe",
          "farmer_email": "john@example.com",
          "related_data_deleted": {
            "products": 5,
            "orders": 12,
            "transactions": 8
          }
        },
        "note": "All related products, orders, transactions, cart items, and wishlists were CASCADE deleted"
      }
    },
    
    error_not_found: {
      "success": false,
      "message": "Farmer not found in farmer_users table"
    },
    
    error_invalid_id: {
      "success": false,
      "message": "Valid farmer ID is required"
    },
    
    error_invalid_table: {
      "success": false,
      "message": "Invalid table name. Supported tables: farmer_users, customer_users, transporter_users, delivery_persons, admin_users"
    }
  },

  // Database verification queries
  verificationQueries: {
    // Check if record was deleted from main table
    checkMainTable: {
      farmer_users: "SELECT * FROM farmer_users WHERE id = ?",
      customer_users: "SELECT * FROM customer_users WHERE id = ?",
      transporter_users: "SELECT * FROM transporter_users WHERE transporter_id = ?",
      delivery_persons: "SELECT * FROM delivery_persons WHERE id = ?",
      admin_users: "SELECT * FROM admin_users WHERE admin_id = ?"
    },
    
    // Check CASCADE delete impact
    checkCascadeImpact: {
      farmer_cascade: {
        products: "SELECT * FROM products WHERE farmer_id = ?",
        orders: "SELECT * FROM orders WHERE farmer_id = ?", 
        transactions: "SELECT * FROM transactions WHERE farmer_id = ?",
        cart: "SELECT * FROM cart WHERE productId IN (SELECT id FROM products WHERE farmer_id = ?)",
        wishlists: "SELECT * FROM wishlists WHERE product_id IN (SELECT id FROM products WHERE farmer_id = ?)"
      },
      customer_cascade: {
        orders: "SELECT * FROM orders WHERE consumer_id = ?",
        cart: "SELECT * FROM cart WHERE customerId = ?",
        wishlists: "SELECT * FROM wishlists WHERE customer_id = ?"
      },
      transporter_cascade: {
        delivery_persons: "SELECT * FROM delivery_persons WHERE user_id = ?",
        permanent_vehicles: "SELECT * FROM permanent_vehicles WHERE transporter_id = ?",
        temporary_vehicles: "SELECT * FROM temporary_vehicles WHERE transporter_id = ?"
      },
      delivery_person_impact: {
        orders_set_null: "SELECT * FROM orders WHERE delivery_person_id IS NULL AND id IN (SELECT id FROM orders WHERE delivery_person_id = ? BEFORE DELETE)"
      }
    }
  },

  // Test data setup (create these records first)
  setupData: {
    farmer: {
      name: "Test Farmer Table Delete",
      mobile_number: "9876543210",
      email: "table-delete-farmer@test.com", 
      password: "hashedpassword123",
      verified_status: true
    },
    customer: {
      customer_name: "Test Customer Table Delete",
      mobile_number: "9876543211",
      email: "table-delete-customer@test.com",
      password: "hashedpassword123"
    },
    transporter: {
      name: "Test Transporter Table Delete",
      mobile_number: "9876543212", 
      email: "table-delete-transporter@test.com",
      password: "hashedpassword123"
    }
  }
};

module.exports = tableWiseDeleteTestData;

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Setup Test Data:
 *    - Create test users using the setupData
 *    - Note the generated IDs for testing
 * 
 * 2. Test Table-Wise Deletion:
 *    - Use the curl commands from testScenarios
 *    - Replace {token} with actual admin JWT token
 *    - Replace user IDs with actual test user IDs
 * 
 * 3. Verify Deletion:
 *    - Run verificationQueries to confirm deletion
 *    - Check both main table and CASCADE impact
 * 
 * 4. Expected Behavior:
 *    - Main record deleted from specified table
 *    - Related records CASCADE deleted or SET NULL
 *    - Detailed response with cascade impact analysis
 */