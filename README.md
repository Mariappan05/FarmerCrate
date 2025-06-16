<<<<<<< HEAD
# Farmer Crate Backend

A backend service for the Farmer Crate application that connects farmers and consumers, allowing direct product sales with a 10% commission model for administrators.

## Features

- User authentication and authorization (Admin, Farmer, Consumer roles)
- Product management system
- Order processing with commission calculation
- Wallet/Vault system for financial transactions
- Price update functionality for unsold products
- Complete order history tracking
- Profile management

## Tech Stack

- Node.js
- Express.js
- MySQL
- Sequelize ORM
- JWT Authentication
- Multer for file uploads

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd farmer-crate-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a MySQL database named `farmer_crate`

4. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the database credentials and other configurations

5. Run database migrations:
   ```bash
   npm run migrate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - User login

### Users
- GET /api/users/profile - Get user profile
- PUT /api/users/profile - Update user profile
- GET /api/users/wallet - Get wallet balance

### Products
- GET /api/products - List all products
- POST /api/products - Create new product (Farmer only)
- PUT /api/products/:id - Update product (Farmer only)
- GET /api/products/:id - Get product details

### Orders
- POST /api/orders - Create new order
- GET /api/orders - List user orders
- GET /api/orders/:id - Get order details

### Vault
- GET /api/vault/transactions - List transactions
- POST /api/vault/withdraw - Withdraw funds
- GET /api/vault/balance - Get balance

## Commission Model

- 10% commission on every product sale goes to the admin
- 90% of the sale amount goes to the farmer
- Commission is automatically calculated during order processing

## License

MIT 
=======
# FarmerCrate
>>>>>>> cd573c9bbdba86873e5d29ffd45f5ab4dd272c15
