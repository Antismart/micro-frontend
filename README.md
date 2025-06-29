# MicroCrop Insurance DApp - Complete Algorand Insurance Platform

A comprehensive decentralized insurance platform built on Algorand blockchain with smart contract automation, KYC verification, and NFT policy tokens.

## 🌟 Features

### **Smart Contract Insurance System**
- **Multiple Coverage Types**: Crop, Weather, Yield, and Livestock insurance
- **Automated Payouts**: Weather-triggered automatic claim processing
- **NFT Policy Tokens**: Each policy is minted as a unique NFT
- **KYC Integration**: Built-in identity verification system
- **Risk Assessment**: Dynamic premium calculation based on multiple factors

### **Wallet Integration**
- **Pera Wallet Support**: Seamless Algorand wallet connectivity
- **Transaction Signing**: Secure transaction handling
- **Balance Management**: Real-time ALGO balance tracking
- **Multi-Account Support**: Support for multiple wallet accounts

### **Advanced Features**
- **Premium Calculation**: Dynamic pricing based on risk factors
- **Policy Management**: Complete policy lifecycle management
- **Claims Processing**: Automated claim verification and payout
- **Marketplace**: Browse and purchase insurance coverage
- **Dashboard**: Comprehensive policy and claims overview

## 🏗️ Architecture

### **Smart Contracts (PyTeal)**
```
contracts/
├── enhanced_insurance_contract.py    # Main insurance contract
├── compile.py                       # Contract compilation script
└── build/                          # Compiled TEAL files
```

### **Frontend (React + TypeScript)**
```
src/
├── components/
│   ├── insurance/                  # Insurance-specific components
│   ├── ui/                        # Reusable UI components
│   ├── dashboard/                 # Dashboard and marketplace
│   └── forms/                     # Form components
├── hooks/                         # Custom React hooks
├── services/                      # Blockchain services
└── utils/                         # Utility functions
```

### **Backend Services**
```
backend/
├── services/
│   ├── AlgorandService.js         # Blockchain interactions
│   ├── WeatherService.js          # Weather data integration
│   ├── PolicyService.js           # Policy management
│   └── PayoutService.js           # Automated payouts
└── server.js                      # Express server
```

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- Python 3.8+ (for smart contracts)
- Algorand wallet (Pera Wallet)
- TestNet ALGO tokens

### **Installation**

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

3. **Compile smart contracts:**
```bash
npm run compile-contracts
```

4. **Deploy smart contract:**
```bash
# Set your creator mnemonic in environment
export CREATOR_MNEMONIC="your 25 word mnemonic here"
npm run deploy-contract
```

5. **Start the application:**
```bash
# Start frontend
npm run dev

# Start backend (in another terminal)
npm run backend
```

## 📋 Insurance Purchase Flow

### **1. Wallet Connection**
- Connect Pera Wallet to authenticate
- Verify sufficient ALGO balance
- Enable transaction signing

### **2. Coverage Selection**
Choose from available insurance types:
- **Crop Insurance**: Weather-based crop protection
- **Weather Insurance**: Parametric weather coverage  
- **Yield Insurance**: Harvest yield guarantee
- **Livestock Insurance**: Comprehensive livestock protection

### **3. Policy Configuration**
- **Coverage Amount**: 100 - 100,000 ALGO
- **Duration**: 30 - 365 days
- **Deductible**: Customizable deductible amount
- **Additional Riders**: Optional coverage extensions

### **4. KYC Verification**
Provide required information:
- Full legal name
- Government-issued ID
- Proof of address
- Contact information

### **5. Premium Calculation**
Dynamic pricing based on:
- Coverage type and amount
- Risk assessment factors
- Duration and deductible
- Historical claims data

### **6. Transaction Execution**
- Review policy details
- Sign transaction with wallet
- Pay premium in ALGO
- Receive policy NFT

### **7. Policy Activation**
- Digital proof of coverage
- Policy NFT in wallet
- Automatic monitoring begins
- Claims processing enabled

## 🔧 Smart Contract Features

### **Policy Creation**
```python
def create_policy(coverage_type, amount, duration, deductible):
    # Validate inputs and KYC status
    # Calculate premium based on risk factors
    # Create policy NFT with metadata
    # Transfer NFT to policy holder
    # Update contract state
```

### **Automated Claims**
```python
def process_claim(policy_id, weather_data, payout_amount):
    # Verify weather trigger conditions
    # Validate policy eligibility
    # Execute automatic payout
    # Update claim history
```

### **KYC Management**
```python
def submit_kyc(name_hash, id_hash, address_hash):
    # Store encrypted KYC data hashes
    # Update verification status
    # Enable policy creation
```

## 🛡️ Security Features

### **Data Protection**
- **Encrypted KYC Data**: All personal information is hashed and encrypted
- **On-Chain Verification**: Weather data integrity verified on blockchain
- **Non-Custodial**: Users maintain full control of their wallets
- **Smart Contract Auditing**: Contracts follow Algorand security best practices

### **Risk Management**
- **Dynamic Risk Scoring**: Multi-factor risk assessment
- **Coverage Limits**: Configurable minimum and maximum coverage
- **Fraud Prevention**: Automated duplicate claim detection
- **Emergency Controls**: Admin functions for emergency situations

## 📊 Contract State Management

### **Global State**
- `total_policies`: Number of active policies
- `total_claims`: Total claims processed
- `total_payouts`: Total amount paid out
- `oracle_address`: Weather oracle address
- `kyc_required`: KYC requirement flag

### **Local State (Per User)**
- `active_policies`: Number of user's active policies
- `total_coverage`: User's total coverage amount
- `kyc_status`: KYC verification status
- `risk_score`: User's calculated risk score

## 🌐 API Endpoints

### **Policy Management**
```
POST /api/policies              # Create new policy
GET  /api/policies/:farmerId    # Get user policies
PUT  /api/policies/:id          # Update policy
```

### **Weather Data**
```
GET  /api/weather/:deviceId     # Get weather history
GET  /api/weather/devices/nearby # Find nearby devices
```

### **Claims & Payouts**
```
GET  /api/payouts/:policyId     # Get payout history
POST /api/payouts/trigger       # Manual payout trigger
```

### **Contract Interaction**
```
GET  /api/algorand/status       # Network status
GET  /api/contract/state        # Contract state
POST /api/contract/deploy       # Deploy contract
```

## 🧪 Testing

### **Smart Contract Testing**
```bash
# Test contract deployment
npm run test-contract

# Test policy creation
node scripts/test-policy-creation.js

# Test claim processing
node scripts/test-claims.js
```

### **Frontend Testing**
```bash
# Run component tests
npm run test

# Run E2E tests
npm run test:e2e
```

## 🚀 Deployment

### **Smart Contract Deployment**
```bash
# Deploy to TestNet
export CREATOR_MNEMONIC="your mnemonic"
npm run deploy-contract

# Deploy to MainNet
export ALGORAND_NETWORK="mainnet"
npm run deploy-contract
```

### **Frontend Deployment**
```bash
# Build for production
npm run build

# Deploy to Netlify/Vercel
npm run deploy
```

## 📈 Monitoring & Analytics

### **Contract Metrics**
- Policy creation rate
- Claim processing time
- Payout accuracy
- User adoption metrics

### **Performance Monitoring**
- Transaction throughput
- Gas cost optimization
- Error rate tracking
- User experience metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs and request features via GitHub Issues
- **Community**: Join our Discord for real-time support

## 🎯 Roadmap

- [ ] Multi-language support for global farmers
- [ ] Advanced weather analytics and risk modeling
- [ ] Integration with additional weather data providers
- [ ] Mobile app for iOS and Android
- [ ] Expanded coverage types (health, property, auto)
- [ ] Cross-chain compatibility
- [ ] Governance token and DAO features
- [ ] Institutional investor integration

---

Built with ❤️ for the future of decentralized insurance, powered by Algorand blockchain.