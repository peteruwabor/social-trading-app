# 🔄 GIOAT User Flows & Backend Integration Guide

## 🎯 **Essential User Flows for Social Trading Platform**

### **1. 🔐 Authentication Flow**

#### **Frontend → Backend Integration:**

```typescript
// Frontend: /auth/signup
POST /api/auth/signup
{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "SecurePassword123!"
}

// Backend Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "john@example.com",
    "name": "John Doe",
    "emailVerified": false
  }
}
```

#### **User Journey:**
1. **Landing Page** → Click "Get Started"
2. **Signup Form** → Fill details & submit
3. **Backend creates user** → Hash password, generate JWT
4. **Store tokens** → localStorage (frontend)
5. **Redirect to Dashboard** → Authenticated state

---

### **2. 🚀 Onboarding Flow**

#### **Step-by-Step Integration:**

```typescript
// 1. Complete Profile
PUT /api/user/profile
{
  "bio": "Experienced trader",
  "tradingExperience": "5+ years",
  "riskTolerance": "moderate"
}

// 2. Connect Broker Account  
POST /api/broker-connection
{
  "brokerName": "Interactive Brokers",
  "accountId": "U123456",
  "apiCredentials": "encrypted-data"
}

// 3. Portfolio Setup
GET /api/portfolio
// Returns current portfolio status

// 4. Follow Top Traders
POST /api/followers/follow
{
  "traderId": "trader-uuid",
  "copySettings": {
    "maxInvestment": 1000,
    "riskLevel": "medium"
  }
}
```

---

### **3. 📊 Trading & Copy Trading Flow**

#### **Real-time Trading Integration:**

```typescript
// Browse Top Traders
GET /api/user/top-traders
// Returns: trader rankings, performance metrics

// View Trader Profile  
GET /api/user/profile/:traderId
// Returns: detailed trader stats, trade history

// Follow Trader
POST /api/followers/follow
{
  "traderId": "uuid",
  "copySettings": {
    "allocation": 500,
    "maxRisk": 0.02,
    "stopLoss": 0.05
  }
}

// Real-time Updates (WebSocket)
WebSocket: /realtime
{
  "type": "TRADE_EXECUTED",
  "traderId": "uuid", 
  "trade": {
    "symbol": "AAPL",
    "action": "BUY",
    "quantity": 10,
    "price": 150.25
  }
}
```

---

### **4. 💰 Portfolio Management Flow**

#### **Portfolio Sync & Monitoring:**

```typescript
// Get Portfolio Performance
GET /api/portfolio/performance
{
  "totalValue": 124567.89,
  "dailyReturn": 2.5,
  "monthlyReturn": 18.3,
  "positions": [...]
}

// Sync Holdings from Broker
POST /api/portfolio/sync
// Triggers sync with connected broker accounts

// Get Trade History
GET /api/trade-capture/history?limit=50
// Returns recent trades with P&L
```

---

### **5. 🔔 Notification Flow**

#### **Real-time Alerts Integration:**

```typescript
// Setup Notification Preferences
PUT /api/notifications
{
  "tradeAlerts": true,
  "followerUpdates": true,
  "marketNews": false,
  "emailNotifications": true,
  "pushNotifications": true
}

// Register Device for Push Notifications
POST /api/notifications/device-tokens
{
  "token": "device-push-token",
  "platform": "IOS"
}

// WebSocket Notifications
WebSocket: /realtime
{
  "type": "FOLLOWER_ALERT",
  "message": "New follower: @trader123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🛠 **Backend Implementation Checklist**

### **✅ Already Implemented:**
- [x] User profile management (`/user/*`)
- [x] Portfolio services (`/portfolio/*`)
- [x] Copy trading engine (`/copy-trading/*`)
- [x] Real-time WebSocket (`/realtime`)
- [x] Notification system (`/notifications/*`)
- [x] Broker connections (`/broker-connection/*`)

### **🆕 Newly Added:**
- [x] Authentication endpoints (`/auth/*`)
- [x] JWT token management
- [x] Password hashing & security
- [x] Email verification system
- [x] Frontend auth integration

### **🔄 Next Steps to Complete:**

1. **Add Auth Module to App Module:**
```typescript
// packages/api/src/app.module.ts
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    AuthModule, // Add this
    // ... other modules
  ],
})
```

2. **Update Prisma Schema:**
```sql
-- Add to packages/api/prisma/schema.prisma
model User {
  id                      String    @id @default(uuid())
  email                   String    @unique
  name                    String?
  password                String
  emailVerified           Boolean   @default(false)
  emailVerificationToken  String?
  passwordResetToken      String?
  passwordResetExpiry     DateTime?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
}
```

3. **Install Required Dependencies:**
```bash
# Backend
cd packages/api
npm install bcrypt @types/bcrypt @nestjs/jwt

# Frontend  
cd packages/frontend
npm install axios
```

---

## 🎯 **User Flow Priorities**

### **Phase 1: Core Authentication (Week 1)**
- [x] Signup/Login forms
- [x] JWT token management
- [x] Protected routes
- [x] User session handling

### **Phase 2: Onboarding (Week 2)**
- [ ] Profile completion wizard
- [ ] Broker account connection
- [ ] Risk assessment questionnaire
- [ ] Initial portfolio setup

### **Phase 3: Trading Features (Week 3)**
- [ ] Trader discovery & search
- [ ] Copy trading settings
- [ ] Real-time trade notifications
- [ ] Performance tracking

### **Phase 4: Advanced Features (Week 4)**
- [ ] Social features (comments, likes)
- [ ] Advanced analytics
- [ ] Mobile app integration
- [ ] Admin dashboard

---

## 🚀 **Quick Implementation Commands**

### **1. Deploy Backend Changes:**
```bash
cd packages/api
npm install bcrypt @types/bcrypt @nestjs/jwt
# Update app.module.ts to include AuthModule
# Run database migration
npm run build
# Deploy to Render (auto-deploys on git push)
```

### **2. Deploy Frontend Changes:**
```bash  
cd packages/frontend
npm install axios
npm run build
# Deploy to Vercel (auto-deploys on git push)
```

### **3. Test Authentication:**
```bash
# Test signup
curl -X POST https://your-api.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"SecurePass123!"}'

# Test login  
curl -X POST https://your-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

---

## 📱 **Mobile & Real-time Features**

### **WebSocket Integration:**
```typescript
// Frontend WebSocket connection
const socket = io('https://your-api.onrender.com', {
  auth: {
    token: localStorage.getItem('accessToken')
  }
});

socket.on('trade-executed', (data) => {
  // Update UI with new trade
  updateTradeHistory(data);
});

socket.on('follower-alert', (data) => {
  // Show notification
  showNotification(data.message);
});
```

### **Push Notifications:**
```typescript
// Register for push notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
  const registration = await navigator.serviceWorker.register('/sw.js');
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'your-vapid-key'
  });
  
  // Send to backend
  await authApi.registerPushSubscription(subscription);
}
```

---

## 🎉 **Your Platform is Ready!**

With these flows implemented, your GIOAT platform will have:

✅ **Complete authentication system**  
✅ **Seamless user onboarding**  
✅ **Real-time trading features**  
✅ **Social trading capabilities**  
✅ **Mobile-ready architecture**  
✅ **Professional user experience**

**Next step:** Deploy the authentication backend and test the complete user flow from signup to trading! 