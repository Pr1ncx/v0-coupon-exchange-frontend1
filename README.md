# 🎫 Coupon Exchange SaaS Platform

A production-ready, gamified coupon exchange platform built with Node.js, Express, and MongoDB. Users can share discount coupons, claim them with daily limits (freemium model), and upgrade to premium subscriptions for unlimited access.

## ✨ Features

### 🚀 Core Functionality
- **Coupon Management**: Create, share, claim, and boost coupons
- **Freemium Model**: Free users limited to 3 daily claims, premium users unlimited
- **Gamification System**: Points, badges, and achievements
- **User Management**: Registration, authentication, and role-based access control
- **Payment Integration**: Stripe subscription management
- **Admin Dashboard**: User management and analytics

### 🎮 Gamification Elements
- **Points System**: Earn points for uploading, spend for claiming/boosting
- **Badges**: Uploader, Content Creator, Coupon Master, Claimer, Savings Hunter, Deal Finder
- **Achievements**: Milestone-based rewards
- **Daily Limits**: Reset mechanisms and activity tracking

### 🔒 Security Features
- JWT authentication with refresh tokens
- Role-based access control (User, Premium, Admin)
- Rate limiting and brute force protection
- Input validation and sanitization
- Comprehensive audit logging

### 📊 Analytics & Monitoring
- User activity tracking
- Coupon performance metrics
- System health monitoring
- Admin analytics dashboard
- Real-time performance metrics
- Business intelligence insights
- Automated alerting system

### 📁 File Management
- Image upload for coupon screenshots
- User avatar management
- Bulk image processing
- Automatic image optimization and thumbnails
- File deduplication with hash checking
- Secure file storage and cleanup

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt
- **Payments**: Stripe integration
- **Validation**: Joi schemas
- **Logging**: Winston with file rotation
- **Documentation**: OpenAPI 3.0 with Swagger UI
- **Testing**: Jest with mongodb-memory-server
- **Security**: Helmet, CORS, rate limiting
- **File Processing**: Multer, Sharp for image optimization
- **Monitoring**: Custom performance tracking and health checks

## 📁 Project Structure

```
src/
├── config/          # Environment and database config
├── controllers/     # Business logic handlers
├── middlewares/     # Custom middleware (auth, validation, etc.)
├── models/          # Mongoose schemas
├── routes/          # Express route definitions
├── services/        # External service integrations (Stripe, etc.)
├── utils/           # Helper functions and utilities
├── tests/           # Test files
├── uploads/         # File upload storage
└── app.js           # Main application setup
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 5+
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coupon-exchange-saas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Copy the example environment file and configure:
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/coupon-saas
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

4. **Database Setup**
   Make sure MongoDB is running:
   ```bash
   # Start MongoDB (if not running as service)
   mongod
   
   # The application will automatically create collections
   ```

5. **Start the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the API**
   - API Base URL: `http://localhost:5000/api/v1`
   - API Documentation: `http://localhost:5000/api-docs`
   - Health Check: `http://localhost:5000/health`

## 📚 API Documentation

The API is fully documented using OpenAPI 3.0 (Swagger). Once the server is running, visit:
- **Interactive Documentation**: `http://localhost:5000/api-docs`

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `GET /api/v1/auth/profile` - Get user profile

#### Coupons
- `GET /api/v1/coupons` - List coupons with filtering/sorting
- `POST /api/v1/coupons` - Create new coupon
- `GET /api/v1/coupons/:id` - Get coupon details
- `POST /api/v1/coupons/:id/claim` - Claim coupon (freemium logic)
- `POST /api/v1/coupons/:id/boost` - Boost coupon visibility

#### Payments
- `POST /api/v1/payments/checkout` - Create Stripe checkout session
- `GET /api/v1/payments/subscription` - Get subscription status
- `POST /api/v1/payments/webhook` - Handle Stripe webhooks

#### File Upload
- `POST /api/v1/upload/coupon-image` - Upload coupon screenshots
- `POST /api/v1/upload/avatar` - Upload user profile pictures
- `POST /api/v1/upload/bulk` - Bulk image upload

#### Admin (Admin access required)
- `GET /api/v1/admin/dashboard` - Admin dashboard overview
- `GET /api/v1/admin/users` - List users with metrics
- `GET /api/v1/admin/analytics` - System analytics

## 🎯 Business Logic

### Freemium Model
- **Free Users**: 3 coupon claims per day
- **Premium Users**: Unlimited claims
- Daily limits reset at midnight UTC
- Upgrade prompts when limits reached

### Points System
- **Earn Points**: 
  - 5 points for uploading a coupon
  - 10 points daily bonus (claimable once per day)
- **Spend Points**: 
  - 10 points to claim a coupon
  - 20 points to boost coupon visibility
- Starting balance: 100 points
- Prevents negative balances

### Gamification
- **Badges**: Awarded at milestone achievements
  - Uploader badges: 5, 25, 100 uploads
  - Claimer badges: 10, 50, 100 claims
- **Achievements**: Point-based milestones
- **Leaderboards**: Points, uploads, and claims rankings

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test files
npm test -- tests/auth.test.js
```

### Test Features
- Uses `mongodb-memory-server` for isolated testing
- Comprehensive test coverage for authentication and coupons
- Automatic test database cleanup
- Minimum 80% code coverage requirement

## 📊 Monitoring & Analytics

### Health Checks
- `GET /health` - Basic health status
- `GET /api/v1/monitoring/health` - Detailed system health
- Real-time performance metrics
- Database connectivity monitoring

### Analytics Dashboard
- User registration and activity trends
- Coupon upload and claim analytics
- Revenue and conversion tracking
- System performance metrics

### Admin Features
- User management and moderation
- Coupon content moderation
- System logs and activity monitoring
- Business intelligence reports

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (User, Premium, Admin)
- Account lockout after failed attempts
- Password strength validation

### API Security
- Rate limiting with user tier differentiation
- Input validation and sanitization
- CORS protection
- Security headers with Helmet
- Request logging and monitoring

### Data Protection
- Password hashing with bcrypt (12 rounds)
- Secure session management
- Audit logging for all user actions
- Attack pattern detection

## 🚀 Deployment

### Production Checklist
1. **Environment Variables**: Set all production values in `.env`
2. **Database**: Use production MongoDB instance with authentication
3. **SSL**: Configure HTTPS certificates
4. **Stripe**: Use live API keys and configure webhooks
5. **Rate Limiting**: Adjust based on expected load
6. **Monitoring**: Enable external monitoring services
7. **Backup**: Configure automated database backups

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment-Specific Configuration
- **Development**: Debug logging, local services
- **Staging**: Production-like with test data
- **Production**: Optimized logging, external services

## 🔧 Configuration

### Environment Variables
See `.env.example` for all available configuration options:

```env
# Core settings
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://username:password@host:port/database

# Security
JWT_SECRET=your-secure-secret-key-min-32-characters
BCRYPT_ROUNDS=12

# Stripe
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Features
DAILY_CLAIMS_LIMIT=3
POINTS_UPLOAD=5
POINTS_CLAIM=10
```

### Feature Flags
Control features through environment variables:
- `ENABLE_EMAIL_VERIFICATION=true`
- `ENABLE_ANALYTICS=true`
- `ENABLE_FILE_UPLOAD=true`
- `ENABLE_MONITORING=true`

## 📈 Performance

### Optimization Features
- Database connection pooling
- Efficient MongoDB queries with proper indexing
- Image optimization and compression
- Rate limiting to prevent abuse
- Caching strategies for static content

### Scalability
- Stateless application design
- Horizontal scaling ready
- Database optimization with indexes
- Load balancer compatible

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Submit a pull request

### Code Standards
- Follow ESLint configuration
- Use async/await for asynchronous operations
- Add comprehensive error handling
- Include JSDoc comments for complex functions
- Maintain test coverage above 80%

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🆘 Support & Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify database permissions

2. **Stripe Integration Issues**
   - Verify API keys are correct
   - Check webhook endpoint configuration
   - Ensure webhook secret matches

3. **File Upload Problems**
   - Check upload directory permissions
   - Verify file size limits
   - Ensure Sharp is properly installed

### Getting Help
- Check the API documentation at `/api-docs`
- Review application logs in the `logs/` directory
- Verify environment variable configuration
- Test database connectivity with health endpoints

### Performance Issues
- Monitor system resources via `/api/v1/monitoring/health`
- Check rate limiting configuration
- Review database query performance
- Analyze application logs for bottlenecks

---

**Built with ❤️ for the coupon community**

For questions, issues, or contributions, please open an issue on GitHub or contact the development team.