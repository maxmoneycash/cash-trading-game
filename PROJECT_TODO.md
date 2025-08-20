# Cash Trading Game - Implementation Priority Matrix

## Executive Summary
This document provides a structured implementation roadmap for the Cash Trading Game, categorizing tasks by necessity and priority. The project requires building a verifiable random trading game on Aptos blockchain with 65ms candlestick updates.

---

## Current Implementation Status

| Component | Status | Description |
|-----------|--------|-------------|
| **Frontend Core** | COMPLETE | React app with p5.js chart rendering |
| **Chart Algorithm** | COMPLETE | Client-side deterministic candlestick generation |
| **UI Components** | COMPLETE | Basic trading interface with position management |
| **Documentation** | COMPLETE | Liquidation math, algorithm design, architecture plans |
| **Server Structure** | PARTIAL | Basic Express setup exists but incomplete |
| **WebSocket Hooks** | PARTIAL | Socket.io hooks present but not connected |
| **Aptos Hooks** | PARTIAL | Wallet hooks exist but not implemented |
| **Smart Contracts** | NOT STARTED | No Move contracts deployed |
| **Backend Services** | NOT STARTED | No event listeners or expansion engine |
| **Database Layer** | NOT STARTED | No PostgreSQL or Redis setup |
| **Authentication** | NOT STARTED | No wallet connection or session management |
| **Verification** | NOT STARTED | No Merkle proofs or integrity checks |

---

## Implementation Priority Matrix

### CRITICAL - Required for MVP Launch

| Priority | Component | Timeline | Dependencies | Description |
|----------|-----------|----------|--------------|-------------|
| **1** | Aptos Smart Contracts | Week 1 | None | Randomness generation, deposits, withdrawals |
| **2** | Event Listener Service | Week 1 | Smart Contracts | Monitor blockchain for seed events |
| **3** | Rust Expansion Engine | Week 2 | Event Listener | Deterministic candle generation from seeds |
| **4** | WebSocket Server | Week 2 | Expansion Engine | Real-time data distribution to clients |
| **5** | PostgreSQL Database | Week 2 | None | Store rounds, trades, user data |
| **6** | Redis Cache | Week 2 | Database | High-speed data access and pub/sub |
| **7** | Wallet Integration | Week 3 | Smart Contracts | Aptos wallet adapter for authentication |
| **8** | Round Management | Week 3 | All Backend | 30-second round lifecycle control |
| **9** | Trade Execution | Week 3 | Round Management | Position tracking and P&L calculation |
| **10** | Frontend Connection | Week 4 | WebSocket Server | Connect UI to real-time data stream |

### IMPORTANT - Enhanced Functionality

| Priority | Component | Timeline | Dependencies | Description |
|----------|-----------|----------|--------------|-------------|
| **11** | Settlement System | Week 4 | Trade Execution | Batch settlement of round results |
| **12** | Merkle Verification | Week 5 | Expansion Engine | Proof generation and validation |
| **13** | Session Management | Week 5 | Wallet Integration | JWT tokens and refresh logic |
| **14** | Trade Broadcasting | Week 5 | WebSocket Server | Show other players' trades |
| **15** | Leaderboard System | Week 6 | Database | Rankings and statistics |
| **16** | Error Recovery | Week 6 | All Components | Reconnection and retry logic |
| **17** | Rate Limiting | Week 6 | Backend Services | API and WebSocket throttling |

### OPTIONAL - Performance & Scale

| Priority | Component | Timeline | Dependencies | Description |
|----------|-----------|----------|--------------|-------------|
| **18** | Shelby Integration | Week 7 | Verification | Decentralized data distribution |
| **19** | Load Balancing | Week 7 | Backend Services | Horizontal scaling capability |
| **20** | Monitoring Stack | Week 8 | All Components | Prometheus, Grafana, alerts |
| **21** | Docker Containers | Week 8 | All Components | Containerized deployment |
| **22** | CI/CD Pipeline | Week 8 | Docker | Automated testing and deployment |
| **23** | CDN Integration | Post-Launch | Frontend | Global asset distribution |
| **24** | Mobile App | Post-Launch | All Components | React Native implementation |

---

## Detailed Implementation Checklist

### Week 1: Foundation

| Task | Component | Critical | Status | Notes |
|------|-----------|----------|--------|-------|
| Set up Aptos dev environment | Smart Contracts | YES | [ ] | Install Move tools |
| Create randomness contract | Smart Contracts | YES | [ ] | 2,000 gas per call |
| Deploy to testnet | Smart Contracts | YES | [ ] | Get contract addresses |
| Build event listener | Backend | YES | [ ] | WebSocket to Aptos node |
| Set up TypeScript backend | Backend | YES | [ ] | Express.js structure |
| Configure databases | Infrastructure | YES | [ ] | PostgreSQL + Redis |

### Week 2: Core Engine

| Task | Component | Critical | Status | Notes |
|------|-----------|----------|--------|-------|
| Create Rust project | Expansion Engine | YES | [ ] | ChaCha20 PRNG setup |
| Implement seed expansion | Expansion Engine | YES | [ ] | 10 candles per seed |
| Add house edge logic | Expansion Engine | YES | [ ] | -11.6% expected value |
| Build WebSocket server | Backend | YES | [ ] | ws library setup |
| Create subscription system | Backend | YES | [ ] | Round-based channels |
| Implement data caching | Backend | YES | [ ] | Redis pub/sub |

### Week 3: Game Logic

| Task | Component | Critical | Status | Notes |
|------|-----------|----------|--------|-------|
| Wallet adapter setup | Frontend | YES | [ ] | Aptos wallet connection |
| Round timer system | Backend | YES | [ ] | 30-second cycles |
| Position tracking | Backend | YES | [ ] | Open/close trades |
| P&L calculation | Backend | YES | [ ] | Real-time updates |
| Liquidation detection | Backend | YES | [ ] | 0.15% base probability |

### Week 4: Integration

| Task | Component | Critical | Status | Notes |
|------|-----------|----------|--------|-------|
| Connect frontend to WS | Frontend | YES | [ ] | Real-time updates |
| Replace static charts | Frontend | YES | [ ] | Live data stream |
| Implement trade UI | Frontend | YES | [ ] | Buy/sell interface |
| Test round flow | All | YES | [ ] | End-to-end testing |
| Deploy to staging | All | YES | [ ] | Testnet deployment |

### Week 5-6: Enhancement

| Task | Component | Critical | Status | Notes |
|------|-----------|----------|--------|-------|
| Merkle proof system | Verification | NO | [ ] | Data integrity |
| Trade broadcasting | Social | NO | [ ] | Multi-player features |
| Leaderboard | Social | NO | [ ] | Competition element |
| Session management | Auth | NO | [ ] | JWT implementation |
| Error recovery | Reliability | NO | [ ] | Reconnection logic |

### Week 7-8: Production

| Task | Component | Critical | Status | Notes |
|------|-----------|----------|--------|-------|
| Load testing | Testing | NO | [ ] | 1,000 users target |
| Performance tuning | Optimization | NO | [ ] | 65ms target |
| Monitoring setup | DevOps | NO | [ ] | Metrics and alerts |
| Documentation | Docs | NO | [ ] | API and user guides |
| Security audit | Security | NO | [ ] | Contract review |

---

## Resource Requirements

### Infrastructure Needs

| Resource | Specification | Purpose | Monthly Cost |
|----------|--------------|---------|--------------|
| Development Server | 4 vCPU, 8GB RAM | Backend services | $40 |
| PostgreSQL | 10GB storage | Primary database | $25 |
| Redis | 2GB RAM | Cache layer | $15 |
| Aptos Testnet | N/A | Smart contracts | $0 |
| Domain + SSL | Standard | HTTPS endpoint | $15 |

### Team Composition

| Role | Priority | Time Commitment | Key Skills |
|------|----------|-----------------|------------|
| Smart Contract Dev | CRITICAL | Full-time | Move, Aptos |
| Backend Dev | CRITICAL | Full-time | Node.js, WebSocket |
| Rust Dev | CRITICAL | Part-time | Deterministic algorithms |
| Frontend Dev | IMPORTANT | Part-time | React, Canvas |
| DevOps Engineer | OPTIONAL | Part-time | Docker, K8s |

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 65ms latency not achievable | HIGH | MEDIUM | Adjust to 100ms if needed |
| Gas costs exceed budget | HIGH | LOW | Batch operations, optimize calls |
| Rust non-determinism | HIGH | LOW | Extensive cross-platform testing |
| WebSocket overload | MEDIUM | MEDIUM | Implement rate limiting |
| Database bottleneck | MEDIUM | LOW | Add read replicas |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Low player retention | HIGH | MEDIUM | Tune house edge, add features |
| Regulatory issues | HIGH | LOW | Implement KYC if required |
| Insufficient liquidity | MEDIUM | LOW | Set withdrawal limits |
| Security breach | HIGH | LOW | Audit before mainnet |

---

## Success Criteria

### Technical Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Update Latency | <65ms | Client-side monitoring |
| WebSocket Latency | <5ms p99 | Server metrics |
| Concurrent Users | 1,000+ | Load testing |
| System Uptime | 99.9% | Monitoring tools |
| Settlement Accuracy | 100% | Automated verification |

### Business Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| House Edge Realized | 11.6% | Financial analysis |
| Cost per Round | <0.001 APT | Transaction logs |
| Daily Active Users | 100+ | Analytics |
| Player Retention (7d) | 50% | Cohort analysis |
| Break-even Timeline | 3 months | P&L tracking |

---

## Execution Timeline

### Phase 1: Core (Weeks 1-4)
**Goal**: Functional game with basic features
- Smart contracts deployed
- Backend processing seeds
- Frontend showing live charts
- Basic trading working

### Phase 2: Enhancement (Weeks 5-6)  
**Goal**: Production-ready features
- Verification system
- Social features
- Error handling
- Performance optimization

### Phase 3: Scale (Weeks 7-8)
**Goal**: Launch preparation
- Load testing complete
- Monitoring active
- Documentation finished
- Security verified

---

*Document Version: 1.0 | Last Updated: Current Date*