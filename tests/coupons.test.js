const request = require('supertest');
const app = require('../src/app');
const { User, Coupon } = require('../src/models');
const config = require('../src/config');

describe('Coupons', () => {
  let user;
  let accessToken;
  let premiumUser;
  let premiumAccessToken;

  beforeEach(async () => {
    // Create regular user
    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123456'
    });
    await user.save();
    accessToken = user.generateAccessToken();

    // Create premium user
    premiumUser = new User({
      username: 'premiumuser',
      email: 'premium@example.com',
      password: 'Test123456',
      role: 'premium'
    });
    await premiumUser.save();
    premiumAccessToken = premiumUser.generateAccessToken();
  });

  describe('POST /api/v1/coupons', () => {
    const validCouponData = {
      title: 'Test Coupon',
      description: 'This is a test coupon for amazing discounts',
      code: 'TEST50',
      discount: {
        type: 'percentage',
        value: 50
      },
      category: 'electronics',
      store: {
        name: 'Test Store',
        website: 'https://teststore.com'
      },
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      minimumPurchase: 100,
      tags: ['electronics', 'discount', 'sale']
    };

    it('should create coupon successfully', async () => {
      const response = await request(app)
        .post('/api/v1/coupons')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validCouponData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coupon.title).toBe(validCouponData.title);
      expect(response.body.data.pointsEarned).toBe(config.POINTS_UPLOAD);

      // Verify coupon was created in database
      const coupon = await Coupon.findOne({ title: validCouponData.title });
      expect(coupon).toBeTruthy();
      expect(coupon.uploadedBy.toString()).toBe(user._id.toString());
    });

    it('should award points for uploading coupon', async () => {
      const initialPoints = user.gamification.points;

      await request(app)
        .post('/api/v1/coupons')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validCouponData)
        .expect(201);

      // Refresh user from database
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.gamification.points).toBe(initialPoints + config.POINTS_UPLOAD);
    });

    it('should not create coupon without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/coupons')
        .send(validCouponData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('MISSING_TOKEN');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        title: 'Test'
      };

      const response = await request(app)
        .post('/api/v1/coupons')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/v1/coupons', () => {
    beforeEach(async () => {
      // Create test coupons
      const coupons = [
        {
          title: 'Electronics Coupon',
          description: 'Great discount on electronics',
          code: 'ELEC20',
          discount: { type: 'percentage', value: 20 },
          category: 'electronics',
          store: { name: 'Tech Store' },
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          uploadedBy: user._id
        },
        {
          title: 'Clothing Coupon',
          description: 'Fashion discount',
          code: 'CLOTH30',
          discount: { type: 'percentage', value: 30 },
          category: 'clothing',
          store: { name: 'Fashion Store' },
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          uploadedBy: premiumUser._id
        }
      ];

      await Coupon.insertMany(coupons);
    });

    it('should get all active coupons', async () => {
      const response = await request(app)
        .get('/api/v1/coupons')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coupons).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter coupons by category', async () => {
      const response = await request(app)
        .get('/api/v1/coupons?category=electronics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coupons).toHaveLength(1);
      expect(response.body.data.coupons[0].category).toBe('electronics');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/coupons?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coupons).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });
  });

  describe('POST /api/v1/coupons/:id/claim', () => {
    let coupon;

    beforeEach(async () => {
      coupon = new Coupon({
        title: 'Test Coupon',
        description: 'Test description',
        code: 'TEST50',
        discount: { type: 'percentage', value: 50 },
        category: 'electronics',
        store: { name: 'Test Store' },
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        uploadedBy: premiumUser._id
      });
      await coupon.save();
    });

    it('should claim coupon successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/coupons/${coupon._id}/claim`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pointsSpent).toBe(config.POINTS_CLAIM);

      // Verify coupon was claimed
      const updatedCoupon = await Coupon.findById(coupon._id);
      expect(updatedCoupon.claimedBy).toHaveLength(1);
      expect(updatedCoupon.claimedBy[0].user.toString()).toBe(user._id.toString());
    });

    it('should not allow claiming own coupon', async () => {
      const response = await request(app)
        .post(`/api/v1/coupons/${coupon._id}/claim`)
        .set('Authorization', `Bearer ${premiumAccessToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('CANNOT_CLAIM_OWN');
    });

    it('should enforce daily claim limits for free users', async () => {
      // Set user to have reached daily limit
      user.dailyActivity.claimsToday = config.DAILY_CLAIMS_LIMIT;
      user.dailyActivity.lastClaimDate = new Date();
      await user.save();

      const response = await request(app)
        .post(`/api/v1/coupons/${coupon._id}/claim`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('DAILY_LIMIT_REACHED');
    });

    it('should allow unlimited claims for premium users', async () => {
      // Set premium user to have high claim count
      premiumUser.dailyActivity.claimsToday = config.DAILY_CLAIMS_LIMIT + 5;
      premiumUser.dailyActivity.lastClaimDate = new Date();
      await premiumUser.save();

      // Create another coupon for premium user to claim
      const anotherCoupon = new Coupon({
        title: 'Another Coupon',
        description: 'Another test description',
        code: 'ANOTHER50',
        discount: { type: 'percentage', value: 50 },
        category: 'electronics',
        store: { name: 'Test Store' },
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        uploadedBy: user._id
      });
      await anotherCoupon.save();

      const response = await request(app)
        .post(`/api/v1/coupons/${anotherCoupon._id}/claim`)
        .set('Authorization', `Bearer ${premiumAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should check for sufficient points', async () => {
      // Set user points to less than required
      user.gamification.points = config.POINTS_CLAIM - 1;
      await user.save();

      const response = await request(app)
        .post(`/api/v1/coupons/${coupon._id}/claim`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INSUFFICIENT_POINTS');
    });
  });

  describe('POST /api/v1/coupons/:id/like', () => {
    let coupon;

    beforeEach(async () => {
      coupon = new Coupon({
        title: 'Test Coupon',
        description: 'Test description',
        code: 'TEST50',
        discount: { type: 'percentage', value: 50 },
        category: 'electronics',
        store: { name: 'Test Store' },
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        uploadedBy: premiumUser._id
      });
      await coupon.save();
    });

    it('should like coupon successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/coupons/${coupon._id}/like`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasLiked).toBe(true);
      expect(response.body.data.likeCount).toBe(1);

      // Verify like was added
      const updatedCoupon = await Coupon.findById(coupon._id);
      expect(updatedCoupon.likes).toHaveLength(1);
      expect(updatedCoupon.likes[0].user.toString()).toBe(user._id.toString());
    });

    it('should unlike coupon when liked again', async () => {
      // First like
      await request(app)
        .post(`/api/v1/coupons/${coupon._id}/like`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Second like (unlike)
      const response = await request(app)
        .post(`/api/v1/coupons/${coupon._id}/like`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasLiked).toBe(false);
      expect(response.body.data.likeCount).toBe(0);

      // Verify like was removed
      const updatedCoupon = await Coupon.findById(coupon._id);
      expect(updatedCoupon.likes).toHaveLength(0);
    });
  });
});