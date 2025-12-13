# System Architecture: Quofind Marketplace

**Date:** 2025-12-10
**Architect:** maurolarese
**Version:** 1.0
**Project Type:** web-app
**Project Level:** 4 (Enterprise)
**Status:** Draft

---

## Document Overview

This document defines the system architecture for Quofind Marketplace. It provides the technical blueprint for implementation, addressing all functional and non-functional requirements from the PRD.

**Related Documents:**
- Product Requirements Document: `docs/prd-quofind-marketplace-2025-12-10.md`
- Technical Manual: `docs/MANUALE_TECNICO.md`

---

## Executive Summary

Quofind Marketplace utilizza un'architettura **Event-Driven Serverless** con orchestrazione centralizzata tramite Make. Il sistema e progettato per:

- Gestire interazioni asincrone con l'ecosistema Facebook
- Scalare automaticamente in base al carico
- Minimizzare costi operativi con approccio pay-per-use
- Garantire alta disponibilita (99.5%+ uptime)
- Processare analisi AI in tempo reale

**Key Architectural Decisions:**
1. Make come orchestratore centrale di tutti i workflow
2. AWS Lambda per business logic stateless
3. DynamoDB per persistenza ad alta velocita
4. OpenSearch per ricerche full-text
5. Facebook API come unico canale di interazione utente

---

## Architectural Drivers

Questi requisiti influenzano pesantemente le decisioni architetturali:

### Driver 1: Facebook-First Architecture
**NFR-012: Compatibilita Facebook API**

L'intero sistema dipende dall'ecosistema Facebook. Tutte le interazioni utente avvengono tramite:
- Post su gruppi Facebook
- Messaggi Messenger
- Autenticazione Facebook Login
- Pagamenti Facebook Pay

**Implicazioni:**
- Nessun frontend custom necessario
- Dipendenza critica dalle API Facebook
- Design per gestire rate limits e policy changes

### Driver 2: Event-Driven Processing
**NFR-001: Performance < 500ms**

Il sistema deve processare eventi asincroni (post, messaggi) con bassa latenza.

**Implicazioni:**
- Make webhooks per ricezione eventi
- Lambda per elaborazione parallela
- Caching per query frequenti

### Driver 3: Serverless Scalability
**NFR-006: Auto-scaling**

Il sistema deve scalare automaticamente senza intervento manuale.

**Implicazioni:**
- Lambda con concorrenza configurata
- DynamoDB on-demand capacity
- Nessun single point of failure

### Driver 4: Data Consistency for Financial Operations
**NFR-008: Error Handling robusto**

Il sistema di cashback richiede consistenza transazionale.

**Implicazioni:**
- Transazioni DynamoDB per operazioni critiche
- Logging completo per audit trail
- Rollback mechanisms per errori

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              QUOFIND MARKETPLACE ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                 ┌─────────────────────────┐
                                 │   FACEBOOK ECOSYSTEM    │
                                 │ ┌─────┐ ┌─────┐ ┌─────┐│
                                 │ │Group│ │Msngr│ │ Pay ││
                                 │ └──┬──┘ └──┬──┘ └──┬──┘│
                                 └────┼───────┼───────┼───┘
                                      │       │       │
                              ┌───────▼───────▼───────▼───────┐
                              │     FACEBOOK GRAPH API        │
                              │        + WEBHOOKS             │
                              └───────────────┬───────────────┘
                                              │
                ┌─────────────────────────────▼─────────────────────────────┐
                │                    Make ORCHESTRATOR                       │
                │                  (Workflow Engine)                        │
                │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
                │  │Handle New    │ │Periodic      │ │Payment       │      │
                │  │Facebook Post │ │Matching      │ │Confirmation  │      │
                │  │Workflow      │ │Workflow      │ │Workflow      │      │
                │  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘      │
                └─────────┼────────────────┼────────────────┼──────────────┘
                          │                │                │
                ┌─────────▼────────────────▼────────────────▼──────────────┐
                │                  AWS API GATEWAY                          │
                │              (REST API + Lambda Proxy)                    │
                │                 https://api.quofind.com                   │
                └─────────────────────────┬────────────────────────────────┘
                                          │
┌─────────────────────────────────────────▼────────────────────────────────────────────┐
│                           AWS LAMBDA FUNCTIONS (Node.js 18.x)                        │
│                                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ LISTINGS        │  │ REQUESTS        │  │ GROUPS          │  │ CASHBACK        │ │
│  │ ─────────────   │  │ ─────────────   │  │ ─────────────   │  │ ─────────────   │ │
│  │ createListing   │  │ createRequest   │  │ createGroup     │  │ updatePayback   │ │
│  │ searchListings  │  │ getActiveReqs   │  │ addUserToGroup  │  │ getPaybackBal   │ │
│  │ deleteListing   │  │ getExpiredReqs  │  │ removeUserGroup │  │ rollbackPayback │ │
│  │ getExpiredList  │  │ matchRequests   │  │ getGroupInfo    │  │ getCashbackCfg  │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │                    │          │
│  ┌────────▼────────────────────▼────────────────────▼────────────────────▼────────┐ │
│  │                           CHATBOT FUNCTIONS                                     │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 │ │
│  │  │ messageHandler  │  │ intentAnalyzer  │  │responseFormatter│                 │ │
│  │  │ (entry point)   │  │ (OpenAI)        │  │ (localized)     │                 │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘                 │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────┬───────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼───────────────────────────────────────────┐
│                                    DATA LAYER                                        │
│                                                                                      │
│  ┌────────────────────────────────────┐    ┌────────────────────────────────────┐   │
│  │         AWS DynamoDB               │    │      AWS OpenSearch                │   │
│  │  ┌──────────────────────────────┐  │    │  ┌──────────────────────────────┐  │   │
│  │  │ MarketplaceListings          │  │    │  │ listings (index)             │  │   │
│  │  │ MarketplaceRequests          │◄─┼────┼──│   - title, description       │  │   │
│  │  │ MarketplaceUsers             │  │    │  │   - category, location       │  │   │
│  │  │ Groups                       │  │    │  │   - price, keywords          │  │   │
│  │  │ PaybackBalances              │  │    │  └──────────────────────────────┘  │   │
│  │  │ Transactions                 │  │    │  ┌──────────────────────────────┐  │   │
│  │  │ cashbackConfig               │  │    │  │ requests (index)             │  │   │
│  │  └──────────────────────────────┘  │    │  │   - search criteria          │  │   │
│  └────────────────────────────────────┘    │  └──────────────────────────────┘  │   │
│                                            └────────────────────────────────────┘   │
│  ┌────────────────────────────────────┐    ┌────────────────────────────────────┐   │
│  │         AWS S3                     │    │      AWS Secrets Manager          │   │
│  │  - images/                         │    │  - facebook-api-token             │   │
│  │  - attachments/                    │    │  - openai-api-key                 │   │
│  └────────────────────────────────────┘    │  - Make-credentials                │   │
│                                            └────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SERVICES                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   OpenAI API    │  │   CloudWatch    │  │      SNS        │  │      KMS        │ │
│  │  (GPT-4 Turbo)  │  │  (Monitoring)   │  │   (Alerts)      │  │  (Encryption)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Pattern

**Pattern:** Event-Driven Serverless with Workflow Orchestration

**Rationale:**
1. **Event-Driven:** Il sistema reagisce a eventi esterni (post Facebook, messaggi Messenger, conferme pagamento) piuttosto che gestire richieste sincrone
2. **Serverless:** AWS Lambda elimina la gestione dell'infrastruttura, scala automaticamente, e costa solo quando eseguito
3. **Workflow Orchestration:** Make centralizza la logica decisionale complessa, rendendo i workflow visibili e modificabili senza deploy
4. **Separation of Concerns:** Lambda functions sono stateless e single-purpose, Make gestisce la coordinazione

---

## Technology Stack

### Backend / Orchestration

#### Make Workflow Engine

**Choice:** Make (self-hosted su EC2 o container)

**Version:** 1.0+

**Rationale:**
- Visual workflow builder per logica complessa
- Native webhook support per Facebook integration
- Scheduling per matching periodico
- Open-source con self-hosting per controllo completo
- Costi predicibili vs alternative SaaS

**Configuration:**
```yaml
# Make (Integromat) - Cloud-based, no hosting required
MAKE_WEBHOOK_URL: https://hook.eu1.make.com/your-webhook-id
MAKE_REGION: eu1  # or us1, us2
# Note: Make is fully managed - no server configuration needed
```

**Trade-offs:**
- **Gain:** Zero hosting/maintenance, built-in Facebook/OpenAI modules, visual debugging
- **Lose:** Costi per operazione (dopo free tier), dipendenza da vendor cloud

---

#### AWS Lambda (Node.js)

**Choice:** AWS Lambda with Node.js 18.x runtime

**Rationale:**
- Serverless = zero server management
- Pay-per-invocation = costi proporzionali al traffico
- Auto-scaling 0 to thousands concurrent
- Native AWS integrations (DynamoDB, S3, etc.)
- Node.js per ecosystem JavaScript e team skills

**Configuration:**
```yaml
# Lambda configuration per function
Runtime: nodejs18.x
MemorySize: 256MB (default), 512MB (AI functions)
Timeout: 30 seconds (default), 60 seconds (AI analysis)
ReservedConcurrency: 100 (per service)
Environment:
  DYNAMODB_TABLE_PREFIX: quofind-prod-
  ELASTICSEARCH_ENDPOINT: ${ES_ENDPOINT}
  OPENAI_API_KEY: ${secretsmanager:openai-key}
```

**Trade-offs:**
- **Gain:** Auto-scaling, no ops, pay-per-use
- **Lose:** Cold start latency (~200-500ms), 15 min max execution

---

### Database

#### AWS DynamoDB

**Choice:** DynamoDB with On-Demand Capacity

**Rationale:**
- Single-digit millisecond latency
- Automatic scaling with on-demand mode
- Native Lambda integration
- Managed service = no database ops
- Global tables available for future geo-expansion

**Configuration:**
```yaml
BillingMode: PAY_PER_REQUEST
PointInTimeRecovery: Enabled
DeletionProtection: Enabled
StreamEnabled: true  # For ES sync
```

**Trade-offs:**
- **Gain:** Performance, scalability, managed
- **Lose:** Query flexibility (no JOINs), cost at high scale

---

#### AWS OpenSearch

**Choice:** Amazon OpenSearch Service (Elasticsearch-compatible)

**Rationale:**
- Full-text search on listings/requests
- Complex queries (geo, range, fuzzy matching)
- Near real-time indexing
- Managed service with automatic backups

**Configuration:**
```yaml
InstanceType: t3.small.search (dev), r6g.large.search (prod)
InstanceCount: 2 (multi-AZ)
EBSEnabled: true
VolumeSize: 100GB
DedicatedMasterEnabled: false  # For cost, enable in production
```

**Trade-offs:**
- **Gain:** Powerful search, aggregations, analytics
- **Lose:** Cost (~$150+/month), data duplication with DynamoDB

---

### Infrastructure

#### AWS Services Summary

| Service | Purpose | Configuration |
|---------|---------|---------------|
| Lambda | Compute | Node.js 18.x, 256-512MB |
| API Gateway | REST API | Regional, Lambda proxy |
| DynamoDB | Primary database | On-demand, 7 tables |
| OpenSearch | Search | t3.small, 2 nodes |
| S3 | File storage | Standard, versioning |
| Secrets Manager | Credentials | Auto-rotation |
| CloudWatch | Monitoring | Logs, metrics, alarms |
| KMS | Encryption | AWS managed keys |
| SNS | Notifications | Alert delivery |

**Region:** eu-south-1 (Milan) for GDPR compliance

---

### Third-Party Services

#### OpenAI API

**Choice:** OpenAI GPT-4 Turbo

**Purpose:** Semantic analysis of post/message content

**Usage:**
- Extract: type, category, price, location, keywords
- Intent recognition for chatbot
- Natural language response generation

**Configuration:**
```javascript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const completion = await openai.chat.completions.create({
  model: "gpt-4-turbo-preview",
  messages: [{ role: "system", content: ANALYSIS_PROMPT }],
  temperature: 0.1,  // Low for consistency
  max_tokens: 500
});
```

**Cost Estimation:** ~$0.01-0.03 per analysis (GPT-4 Turbo pricing)

---

#### Facebook APIs

| API | Purpose | Rate Limits |
|-----|---------|-------------|
| Graph API v18.0 | Read posts, publish | 200 calls/user/hour |
| Messenger Platform | Send/receive messages | 250 calls/second |
| Webhooks | Real-time events | No limit (incoming) |
| Facebook Login | Authentication | Standard OAuth |

---

### Development & Deployment

| Category | Choice | Rationale |
|----------|--------|-----------|
| Version Control | GitHub | Team collaboration, Actions CI/CD |
| CI/CD | GitHub Actions | Native integration, free tier |
| IaC | AWS SAM | Lambda-first, simpler than CDK |
| Local Dev | SAM Local | Lambda emulation |
| Testing | Jest | Standard for Node.js |
| API Testing | Postman/Newman | Automated API tests |
| Code Quality | ESLint + Prettier | Consistent formatting |

---

## System Components

### Component 1: Facebook Integration Layer

**Purpose:** Interface between Facebook ecosystem and Quofind system

**Responsibilities:**
- Receive webhook events from Facebook (posts, messages)
- Validate webhook signatures
- Route events to appropriate Make workflows
- Send messages via Messenger API
- Publish posts via Graph API

**Interfaces:**
- **Input:** Facebook webhooks (HTTPS POST)
- **Output:** Messenger messages, Graph API calls

**Dependencies:**
- Facebook Graph API
- Facebook Messenger Platform
- AWS Secrets Manager (tokens)

**FRs Addressed:** FR-001, FR-007, FR-033, FR-041, FR-042, FR-048, FR-049, FR-050

**Implementation Notes:**
```javascript
// Webhook signature validation
const crypto = require('crypto');

function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  const expectedSignature = 'sha256=' +
    crypto.createHmac('sha256', APP_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

### Component 2: Make Orchestrator

**Purpose:** Central workflow engine managing all business logic flows

**Responsibilities:**
- Orchestrate multi-step workflows
- Schedule periodic tasks (matching every 5 min)
- Route events to appropriate Lambda functions
- Handle errors and retries
- Provide visual workflow debugging

**Interfaces:**
- **Input:** Webhooks from Facebook, scheduled triggers
- **Output:** HTTP calls to API Gateway/Lambda

**Dependencies:**
- Facebook webhooks
- AWS API Gateway
- OpenAI API

**FRs Addressed:** FR-011 (matching), FR-012, FR-013 (notifications)

**Key Workflows:**

1. **Handle New Facebook Post**
   ```
   Trigger (Webhook) → Validate Post → AI Analysis →
   Create Listing (Lambda) → Index in ES →
   Send Confirmation (Messenger)
   ```

2. **Periodic Request-Listing Matching**
   ```
   Trigger (Cron 5min) → Get Active Requests →
   For Each: Search Listings → Score Matches →
   Notify Users (Messenger)
   ```

3. **Payment Confirmation**
   ```
   Trigger (Webhook) → Verify Payment →
   Calculate Commission → Distribute Cashback →
   Notify Parties
   ```

---

### Component 3: Listings Service

**Purpose:** CRUD operations for marketplace listings

**Responsibilities:**
- Create listings from analyzed post data
- Search listings with filters
- Manage listing lifecycle (active, expired, deleted)
- Sync with Elasticsearch for search

**Interfaces:**
- **API:** REST via API Gateway
- **Data:** DynamoDB (primary), OpenSearch (search)

**Dependencies:**
- DynamoDB (MarketplaceListings table)
- OpenSearch (listings index)

**FRs Addressed:** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006

**Lambda Functions:**
| Function | Method | Path | Description |
|----------|--------|------|-------------|
| createListing | POST | /listings | Create new listing |
| searchListings | GET | /listings | Search with filters |
| getListing | GET | /listings/{id} | Get by ID |
| deleteListing | DELETE | /listings/{id} | Delete listing |
| getExpiredListings | GET | /listings/expired | Cleanup query |

---

### Component 4: Requests Service

**Purpose:** Manage purchase requests from buyers

**Responsibilities:**
- Create requests from Messenger messages
- Track request status (active, matched, expired)
- Provide requests for matching process

**Interfaces:**
- **API:** REST via API Gateway
- **Data:** DynamoDB, OpenSearch

**Dependencies:**
- DynamoDB (MarketplaceRequests table)
- OpenSearch (requests index)

**FRs Addressed:** FR-007, FR-008, FR-009, FR-010

**Lambda Functions:**
| Function | Method | Path | Description |
|----------|--------|------|-------------|
| createRequest | POST | /requests | Create request |
| getActiveRequests | GET | /requests/active | For matching |
| getExpiredRequests | GET | /requests/expired | Cleanup |

---

### Component 5: Groups Service

**Purpose:** Manage interest groups and memberships

**Responsibilities:**
- Create and configure groups
- Manage group membership
- Enforce leader permissions
- Provide group data for cashback calculations

**Interfaces:**
- **API:** REST via API Gateway
- **Data:** DynamoDB

**Dependencies:**
- DynamoDB (Groups table)
- Facebook Groups (sync)

**FRs Addressed:** FR-015, FR-016, FR-017, FR-018, FR-019, FR-020

**Lambda Functions:**
| Function | Method | Path | Description |
|----------|--------|------|-------------|
| createGroup | POST | /groups | Create group |
| getGroupInfo | GET | /groups/{id} | Get details |
| addUserToGroup | POST | /groups/{id}/members | Add member |
| removeUserFromGroup | DELETE | /groups/{id}/members/{uid} | Remove |

---

### Component 6: Cashback Service

**Purpose:** Manage cashback calculations, balances, and transactions

**Responsibilities:**
- Calculate commissions and cashback distribution
- Manage user balances (available, pending)
- Process cashback after waiting period
- Handle rollbacks for refunds
- Maintain transaction audit trail

**Interfaces:**
- **API:** REST via API Gateway
- **Data:** DynamoDB

**Dependencies:**
- DynamoDB (PaybackBalances, Transactions, cashbackConfig)

**FRs Addressed:** FR-021 to FR-029

**Lambda Functions:**
| Function | Method | Path | Description |
|----------|--------|------|-------------|
| getPaybackBalance | GET | /cashback/balance/{uid} | Get balance |
| updatePayback | POST | /cashback/credit | Credit cashback |
| rollbackPayback | POST | /cashback/rollback | Refund reversal |
| getCashbackConfig | GET | /cashback/config | Get percentages |
| distributeGroupCashback | POST | /cashback/distribute | Group distribution |

---

### Component 7: Chatbot Service

**Purpose:** AI-powered conversational interface via Messenger

**Responsibilities:**
- Receive and parse Messenger messages
- Analyze user intent with OpenAI
- Route queries to appropriate services
- Format and localize responses
- Handle unauthorized requests gracefully

**Interfaces:**
- **Input:** Messenger webhook events
- **Output:** Messenger API responses

**Dependencies:**
- OpenAI API (intent analysis)
- All other services (data queries)
- DynamoDB (user preferences)

**FRs Addressed:** FR-033 to FR-040

**Lambda Functions:**
| Function | Description |
|----------|-------------|
| messageHandler | Entry point, orchestrates flow |
| intentAnalyzer | OpenAI-based intent classification |
| queryBuilder | Builds DynamoDB queries from intent |
| dataFetcher | Retrieves data from services |
| responseFormatter | Localizes and formats response |

**Intent Categories:**
| Intent | Example Query | Action |
|--------|--------------|--------|
| balance | "Quanto e il mio saldo?" | Query PaybackBalances |
| transactions | "Ultime transazioni" | Query Transactions |
| groups | "I miei gruppi" | Query Groups membership |
| referrals | "Le mie segnalazioni" | Query referral data |
| unknown | "..." | Graceful fallback |

---

## Data Architecture

### Data Model

#### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ MarketplaceUser │       │     Group       │       │ PaybackBalance  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ userId (PK)     │◄──────│ leaderId (FK)   │       │ userId (PK)     │
│ facebookId      │       │ groupId (PK)    │       │ balance         │
│ name            │       │ groupName       │       │ pending         │
│ language        │       │ members[]       │       │ lastUpdated     │
│ createdAt       │       │ facebookGroupId │       └────────┬────────┘
└────────┬────────┘       │ createdAt       │                │
         │                └────────┬────────┘                │
         │                         │                         │
         │    ┌────────────────────┼─────────────────────────┘
         │    │                    │
         ▼    ▼                    ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ MarketplaceListing      │ MarketplaceRequest      │  Transaction    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ transactionId   │
│ userId          │       │ userId          │       │ userId          │
│ groupId         │       │ criteria (JSON) │       │ amount          │
│ title           │       │ status          │       │ type            │
│ description     │       │ createdAt       │       │ status          │
│ category        │       │ expiresAt       │       │ referenceId     │
│ price           │       └─────────────────┘       │ timestamp       │
│ location        │                                 └─────────────────┘
│ keywords[]      │       ┌─────────────────┐
│ status          │       │ cashbackConfig  │
│ createdAt       │       ├─────────────────┤
│ expiresAt       │       │ id (PK)         │
└─────────────────┘       │ quofindComm     │
                          │ buyerCashback   │
                          │ leaderCashback  │
                          │ referrerCashback│
                          └─────────────────┘
```

### Database Design

#### DynamoDB Tables

**1. MarketplaceListings**
```
Table: quofind-prod-MarketplaceListings
Partition Key: id (String, UUID)

Attributes:
- id: String (UUID)
- userId: String (Facebook user ID)
- groupId: String (optional)
- title: String
- description: String
- category: String
- price: Number
- location: String
- keywords: List<String>
- imageUrls: List<String>
- status: String (active|expired|deleted)
- createdAt: String (ISO 8601)
- expiresAt: String (ISO 8601)
- facebookPostId: String

GSI:
- userId-index: userId (PK), createdAt (SK)
- status-index: status (PK), createdAt (SK)
- groupId-index: groupId (PK), createdAt (SK)
```

**2. MarketplaceRequests**
```
Table: quofind-prod-MarketplaceRequests
Partition Key: id (String, UUID)

Attributes:
- id: String (UUID)
- userId: String
- criteria: Map (category, maxPrice, location, keywords)
- status: String (active|matched|expired)
- createdAt: String
- expiresAt: String
- lastMatchedAt: String

GSI:
- status-index: status (PK), createdAt (SK)
- userId-index: userId (PK), createdAt (SK)
```

**3. MarketplaceUsers**
```
Table: quofind-prod-MarketplaceUsers
Partition Key: userId (String)

Attributes:
- userId: String (internal UUID)
- facebookId: String
- name: String
- language: String (it|en)
- referrerId: String (optional)
- createdAt: String
- lastActiveAt: String

GSI:
- facebookId-index: facebookId (PK)
```

**4. Groups**
```
Table: quofind-prod-Groups
Partition Key: groupId (String)

Attributes:
- groupId: String (UUID)
- groupName: String
- description: String
- leaderId: String (userId)
- members: List<String> (userIds)
- facebookGroupId: String (optional)
- createdAt: String

GSI:
- leaderId-index: leaderId (PK)
```

**5. PaybackBalances**
```
Table: quofind-prod-PaybackBalances
Partition Key: userId (String)

Attributes:
- userId: String
- balance: Number (EUR, 2 decimals)
- pending: Number
- lastUpdated: String
```

**6. Transactions**
```
Table: quofind-prod-Transactions
Partition Key: transactionId (String)
Sort Key: timestamp (String)

Attributes:
- transactionId: String (UUID)
- userId: String
- amount: Number
- type: String (credit|debit|pending|released|rollback)
- status: String (pending|completed|cancelled)
- referenceId: String (sale ID)
- description: String
- timestamp: String

GSI:
- userId-index: userId (PK), timestamp (SK)
```

**7. cashbackConfig**
```
Table: quofind-prod-cashbackConfig
Partition Key: id (String, default: 'default')

Attributes:
- id: String
- quofindCommission: Number (0.10 = 10%)
- buyerCashback: Number (0.66 = 66%)
- groupLeaderCashback: Number (0.05 = 5%)
- referrerCashback: Number (0.02 = 2%)
- updatedAt: String
```

### OpenSearch Indices

**listings index**
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "userId": { "type": "keyword" },
      "groupId": { "type": "keyword" },
      "title": { "type": "text", "analyzer": "italian" },
      "description": { "type": "text", "analyzer": "italian" },
      "category": { "type": "keyword" },
      "price": { "type": "float" },
      "location": { "type": "geo_point" },
      "locationText": { "type": "text" },
      "keywords": { "type": "keyword" },
      "status": { "type": "keyword" },
      "createdAt": { "type": "date" }
    }
  }
}
```

### Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW PATTERNS                              │
└────────────────────────────────────────────────────────────────────────┘

1. CREATE LISTING FLOW
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ Facebook │───►│   Make    │───►│  Lambda  │───►│ DynamoDB │
   │   Post   │    │ Workflow │    │ create   │    │          │
   └──────────┘    └──────────┘    └────┬─────┘    └──────────┘
                                        │
                                        ▼
                                   ┌──────────┐
                                   │OpenSearch│
                                   │  Index   │
                                   └──────────┘

2. SEARCH LISTINGS FLOW
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  Lambda  │───►│OpenSearch│───►│ Results  │
   │  search  │    │  Query   │    │          │
   └──────────┘    └──────────┘    └──────────┘

3. CASHBACK FLOW
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ Payment  │───►│  Lambda  │───►│ DynamoDB │───►│Transaction│
   │ Confirm  │    │ calculate│    │ Update   │    │  Record   │
   └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## API Design

### API Architecture

**Style:** REST API with Lambda Proxy Integration

**Base URL:** `https://api.quofind.com/v1`

**Authentication:** Facebook OAuth 2.0 tokens

**Format:** JSON request/response

**Versioning:** URL path (/v1/, /v2/)

**Error Format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'price' is required",
    "details": { "field": "price" }
  }
}
```

### API Endpoints

#### Listings API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /v1/listings | Create listing | Required |
| GET | /v1/listings | Search listings | Optional |
| GET | /v1/listings/{id} | Get listing by ID | Optional |
| DELETE | /v1/listings/{id} | Delete listing | Required (owner) |
| GET | /v1/listings/user/{userId} | User's listings | Required |

**POST /v1/listings**
```json
Request:
{
  "title": "iPhone 13 Pro",
  "description": "Ottime condizioni...",
  "category": "electronics",
  "price": 650.00,
  "location": "Milano",
  "keywords": ["iphone", "apple", "smartphone"],
  "groupId": "group-123"  // optional
}

Response (201):
{
  "id": "listing-uuid",
  "status": "active",
  "createdAt": "2025-12-10T10:00:00Z"
}
```

**GET /v1/listings**
```
Query Parameters:
- q: string (full-text search)
- category: string
- minPrice: number
- maxPrice: number
- location: string
- groupId: string
- page: number (default: 1)
- limit: number (default: 20, max: 100)

Response (200):
{
  "data": [...listings],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156
  }
}
```

#### Requests API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /v1/requests | Create request | Required |
| GET | /v1/requests/active | Get active requests | Internal |
| GET | /v1/requests/user/{userId} | User's requests | Required |

#### Groups API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /v1/groups | Create group | Required |
| GET | /v1/groups/{id} | Get group info | Required (member) |
| POST | /v1/groups/{id}/members | Add member | Required (leader) |
| DELETE | /v1/groups/{id}/members/{uid} | Remove member | Required (leader) |
| GET | /v1/groups/user/{userId} | User's groups | Required |

#### Cashback API

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/cashback/balance | Get user balance | Required |
| GET | /v1/cashback/transactions | Transaction history | Required |
| POST | /v1/cashback/credit | Credit cashback | Internal |
| POST | /v1/cashback/rollback | Rollback transaction | Internal |
| GET | /v1/cashback/config | Get percentages | Internal |

**GET /v1/cashback/balance**
```json
Response (200):
{
  "userId": "user-123",
  "balance": 45.50,
  "pending": 12.30,
  "currency": "EUR",
  "lastUpdated": "2025-12-10T10:00:00Z"
}
```

### Authentication & Authorization

**Authentication Flow:**
```
1. User logs in via Facebook
2. Facebook returns access token
3. Token sent with each API request (Authorization header)
4. Lambda validates token with Facebook API
5. User ID extracted from validated token
```

**Authorization Rules:**
| Resource | Action | Rule |
|----------|--------|------|
| Listing | Create | Authenticated user |
| Listing | Delete | Owner only |
| Request | Create | Authenticated user |
| Group | Create | Authenticated user |
| Group | Add/Remove member | Leader only |
| Cashback | View balance | Owner only |
| Cashback | Credit | Internal only |

**Implementation:**
```javascript
// Middleware for Lambda
async function authenticate(event) {
  const token = event.headers.Authorization?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError('Token required');

  // Validate with Facebook
  const response = await fetch(
    `https://graph.facebook.com/me?access_token=${token}`
  );
  if (!response.ok) throw new UnauthorizedError('Invalid token');

  const user = await response.json();
  return user;
}
```

---

## Non-Functional Requirements Coverage

### NFR-001: Performance - API Response Time

**Requirement:** API response time < 500ms for 95% of requests

**Architecture Solution:**
1. **Lambda Warm-up:** Provisioned concurrency for critical functions (10 instances)
2. **DynamoDB:** Single-digit ms latency for key lookups
3. **OpenSearch:** Optimized queries with proper indexing
4. **Caching:** ElastiCache Redis for frequent queries (future enhancement)
5. **Connection Reuse:** Keep-alive connections in Lambda

**Implementation Notes:**
- Monitor p95 latency in CloudWatch
- Set CloudWatch alarm at 450ms threshold
- Optimize heavy queries (AI analysis) with async processing

**Validation:**
- Load test: 100 concurrent users, < 500ms p95
- Production monitoring: CloudWatch custom metric

---

### NFR-002: Performance - Throughput

**Requirement:** 100 concurrent requests, 1000 annunci/hour peak

**Architecture Solution:**
1. **Lambda Concurrency:** Reserved 100 concurrent executions per service
2. **API Gateway:** Throttling at 1000 req/sec (burst 2000)
3. **DynamoDB:** On-demand capacity (auto-scaling)
4. **OpenSearch:** 2 nodes for parallel query processing

**Validation:**
- Load test with Artillery/k6
- Monitor Lambda concurrent executions

---

### NFR-003: Security - Authentication

**Requirement:** Secure Facebook OAuth authentication

**Architecture Solution:**
1. **Facebook Login:** OAuth 2.0 with access tokens
2. **Token Validation:** Every request validates token with Facebook
3. **Token Storage:** Never stored server-side, only validated
4. **HTTPS Only:** All API endpoints over TLS 1.3

**Implementation Notes:**
```javascript
// Token validation
const FB_APP_ID = process.env.FB_APP_ID;
const validation = await fetch(
  `https://graph.facebook.com/debug_token?` +
  `input_token=${userToken}&access_token=${appToken}`
);
const data = await validation.json();
if (!data.data.is_valid || data.data.app_id !== FB_APP_ID) {
  throw new UnauthorizedError();
}
```

---

### NFR-004: Security - Authorization

**Requirement:** Role-based access control

**Architecture Solution:**
1. **Ownership Verification:** Check userId matches resource owner
2. **Group Roles:** Leader vs Member permissions
3. **Data Isolation:** Users see only their data
4. **Chatbot Guards:** Refuse requests for other users' data

**Implementation:**
```javascript
function authorizeOwner(userId, resource) {
  if (resource.userId !== userId) {
    throw new ForbiddenError('Not authorized');
  }
}

function authorizeGroupLeader(userId, group) {
  if (group.leaderId !== userId) {
    throw new ForbiddenError('Leader permission required');
  }
}
```

---

### NFR-005: Security - Data Encryption

**Requirement:** Encryption at-rest and in-transit

**Architecture Solution:**
1. **At-Rest:** DynamoDB encryption with AWS KMS (default key)
2. **In-Transit:** HTTPS everywhere (TLS 1.3)
3. **Secrets:** AWS Secrets Manager for API keys, tokens
4. **S3:** Server-side encryption (SSE-S3)

**Configuration:**
```yaml
# DynamoDB table encryption
SSESpecification:
  SSEEnabled: true
  SSEType: KMS

# S3 bucket encryption
BucketEncryption:
  ServerSideEncryptionConfiguration:
    - ServerSideEncryptionByDefault:
        SSEAlgorithm: AES256
```

---

### NFR-006: Scalability - Auto-scaling

**Requirement:** Automatic scaling with demand

**Architecture Solution:**
1. **Lambda:** Auto-scales 0 to 1000 concurrent by default
2. **DynamoDB:** On-demand mode (auto-provisions capacity)
3. **API Gateway:** Scales automatically
4. **OpenSearch:** Manual scaling (add nodes when needed)

**Monitoring:**
- Lambda ConcurrentExecutions metric
- DynamoDB ConsumedReadCapacityUnits
- OpenSearch JVMMemoryPressure

---

### NFR-007: Reliability - Uptime

**Requirement:** 99.5% uptime

**Architecture Solution:**
1. **Multi-AZ:** Lambda runs across multiple AZs automatically
2. **DynamoDB:** Multi-AZ replication built-in
3. **OpenSearch:** 2 nodes in different AZs
4. **Health Checks:** API Gateway endpoint health monitoring
5. **Circuit Breakers:** For external services (OpenAI, Facebook)

**SLA Calculation:**
- Lambda SLA: 99.95%
- DynamoDB SLA: 99.999%
- API Gateway SLA: 99.95%
- Combined: ~99.9% (exceeds requirement)

---

### NFR-008: Reliability - Error Handling

**Requirement:** Robust error handling with retry

**Architecture Solution:**
1. **Structured Errors:** Consistent error response format
2. **Retry Logic:** 3 retries with exponential backoff
3. **Dead Letter Queue:** Failed events to SQS DLQ
4. **Circuit Breaker:** For external APIs

**Implementation:**
```javascript
const retry = require('async-retry');

async function callWithRetry(fn) {
  return retry(async (bail) => {
    try {
      return await fn();
    } catch (err) {
      if (err.statusCode === 400) bail(err); // Don't retry client errors
      throw err;
    }
  }, {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 5000
  });
}
```

---

### NFR-009: Usability - Localization

**Requirement:** Italian and English support

**Architecture Solution:**
1. **User Language Preference:** Stored in MarketplaceUsers
2. **Message Templates:** Localized JSON files
3. **Error Messages:** Localized based on user preference
4. **Chatbot Responses:** AI generates in user's language

**Implementation:**
```javascript
const messages = {
  it: {
    BALANCE: "Il tuo saldo e di {{amount}}",
    NO_RESULTS: "Nessun risultato trovato"
  },
  en: {
    BALANCE: "Your balance is {{amount}}",
    NO_RESULTS: "No results found"
  }
};

function localize(key, lang, vars) {
  let msg = messages[lang]?.[key] || messages['en'][key];
  for (const [k, v] of Object.entries(vars || {})) {
    msg = msg.replace(`{{${k}}}`, v);
  }
  return msg;
}
```

---

### NFR-010: Maintainability - Logging & Monitoring

**Requirement:** Comprehensive monitoring and debugging

**Architecture Solution:**
1. **Structured Logging:** JSON logs to CloudWatch
2. **Metrics:** Custom metrics for business KPIs
3. **Dashboards:** CloudWatch dashboards for operations
4. **Alarms:** Critical alerts to SNS → email/Slack

**Log Format:**
```json
{
  "timestamp": "2025-12-10T10:00:00Z",
  "level": "INFO",
  "service": "listings",
  "function": "createListing",
  "requestId": "abc-123",
  "userId": "user-456",
  "message": "Listing created",
  "data": { "listingId": "listing-789" }
}
```

**Key Alarms:**
| Metric | Threshold | Action |
|--------|-----------|--------|
| Lambda Errors | > 5% | SNS Alert |
| API Latency p95 | > 500ms | SNS Alert |
| DynamoDB Throttling | > 0 | SNS Alert |
| OpenSearch Health | != green | SNS Alert |

---

### NFR-011: Maintainability - Code Quality

**Requirement:** 70% test coverage, documented code

**Architecture Solution:**
1. **Unit Tests:** Jest with 70%+ coverage requirement
2. **Integration Tests:** Postman/Newman collections
3. **Code Style:** ESLint + Prettier enforced in CI
4. **Documentation:** JSDoc for functions, README per service

**CI Pipeline Quality Gates:**
```yaml
- name: Test
  run: npm test -- --coverage

- name: Coverage Check
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 70" | bc -l) )); then
      echo "Coverage below 70%"
      exit 1
    fi
```

---

### NFR-012: Compatibility - Facebook API

**Requirement:** Compatible with Facebook Graph API v18.0+

**Architecture Solution:**
1. **API Version Pinning:** Explicitly use v18.0 in all calls
2. **Webhook Compliance:** Follow Messenger platform requirements
3. **Policy Compliance:** No prohibited content handling
4. **Upgrade Strategy:** Monitor Facebook changelog, test new versions in staging

**Implementation:**
```javascript
const FB_API_VERSION = 'v18.0';
const GRAPH_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

async function sendMessage(userId, message) {
  return fetch(`${GRAPH_URL}/me/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: userId },
      message: { text: message }
    })
  });
}
```

---

## Security Architecture

### Authentication

**Method:** Facebook OAuth 2.0

**Flow:**
```
1. User clicks "Login with Facebook"
2. Facebook OAuth dialog appears
3. User grants permissions
4. Facebook redirects with authorization code
5. Backend exchanges code for access token
6. Token used for all subsequent API calls
7. Token validated with Facebook on each request
```

**Required Permissions:**
- `public_profile` - Basic user info
- `email` - User email (optional)
- `pages_messaging` - Send Messenger messages

**Token Lifecycle:**
- Short-lived token: 1-2 hours
- Long-lived token: ~60 days (for server-to-server)
- Refresh: Exchange before expiration

### Authorization

**Model:** Role-Based Access Control (RBAC)

**Roles:**
| Role | Scope | Permissions |
|------|-------|-------------|
| User | Global | Create listings, requests; view own data |
| Group Member | Group | View group listings, participate |
| Group Leader | Group | + Manage members, create exclusive offers |
| System | Internal | All operations (Lambda-to-Lambda) |

**Implementation Pattern:**
```javascript
// Authorization middleware
function authorize(requiredRole) {
  return async (event, context) => {
    const user = await authenticate(event);
    const resourceId = event.pathParameters?.id;

    switch (requiredRole) {
      case 'owner':
        const resource = await getResource(resourceId);
        if (resource.userId !== user.id) throw new ForbiddenError();
        break;
      case 'group_leader':
        const group = await getGroup(resourceId);
        if (group.leaderId !== user.id) throw new ForbiddenError();
        break;
    }

    return { ...event, user };
  };
}
```

### Data Encryption

**At Rest:**
- DynamoDB: AWS KMS encryption (aws/dynamodb key)
- S3: SSE-S3 (AES-256)
- OpenSearch: Node-to-node encryption enabled

**In Transit:**
- All APIs: HTTPS only (TLS 1.3)
- Internal: VPC endpoints where possible
- External: Certificate validation enforced

**Key Management:**
- API keys: AWS Secrets Manager
- Encryption keys: AWS KMS (AWS managed)
- Rotation: Automatic where supported

### Security Best Practices

1. **Input Validation**
   - All inputs validated/sanitized
   - JSON schema validation on request bodies
   - Parameterized DynamoDB queries (no injection)

2. **Rate Limiting**
   - API Gateway: 1000 req/sec per IP
   - Per-user limits in application layer

3. **Security Headers**
   ```
   Strict-Transport-Security: max-age=31536000
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   ```

4. **Least Privilege**
   - Lambda roles with minimal permissions
   - Resource-specific IAM policies

5. **Audit Logging**
   - All API calls logged
   - Sensitive operations logged with user context
   - CloudTrail for AWS API calls

---

## Scalability & Performance

### Scaling Strategy

**Lambda:**
- Auto-scales from 0 to 1000 concurrent executions
- Reserved concurrency: 100 per critical service
- Provisioned concurrency: 10 for messageHandler (reduce cold start)

**DynamoDB:**
- On-demand capacity mode
- Auto-scales read/write capacity
- No capacity planning needed

**OpenSearch:**
- Start: 2 x t3.small.search nodes
- Scale: Add nodes or upgrade instance type
- Target: < 80% JVM memory pressure

### Performance Optimization

1. **Lambda Cold Start Mitigation**
   - Provisioned concurrency for critical paths
   - Keep handler lightweight
   - Lazy-load heavy dependencies

2. **Database Optimization**
   - DynamoDB: Use GSIs for access patterns
   - OpenSearch: Optimize mappings, use filters over queries
   - Batch operations where possible

3. **Connection Management**
   - Reuse HTTP connections (keep-alive)
   - DynamoDB DocumentClient with connection pooling
   - OpenSearch client with connection reuse

### Caching Strategy

**Current:** No caching (start simple)

**Future Enhancement:**
```
┌─────────────────────────────────────────────────────┐
│               CACHING LAYER (Future)                │
│  ┌─────────────────────────────────────────────┐   │
│  │           ElastiCache Redis                  │   │
│  │  - User balances (TTL: 5 min)               │   │
│  │  - Cashback config (TTL: 1 hour)            │   │
│  │  - Search results (TTL: 1 min)              │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Load Balancing

- **API Gateway:** Built-in load balancing
- **Lambda:** AWS manages distribution across AZs
- **OpenSearch:** Automatic request routing across nodes

---

## Reliability & Availability

### High Availability Design

1. **Multi-AZ by Default**
   - Lambda: Runs in multiple AZs
   - DynamoDB: Automatic multi-AZ replication
   - OpenSearch: 2 nodes in different AZs

2. **No Single Points of Failure**
   - Stateless Lambda functions
   - Managed services handle redundancy

3. **Graceful Degradation**
   - OpenSearch down → Fallback to DynamoDB queries
   - OpenAI down → Return generic responses
   - Facebook rate limited → Queue and retry

### Disaster Recovery

**RPO (Recovery Point Objective):** < 1 hour

**RTO (Recovery Time Objective):** < 4 hours

**Strategy:**
- DynamoDB: Point-in-time recovery (35 days)
- OpenSearch: Automated snapshots to S3
- Lambda: Code in Git, redeploy via SAM
- Configuration: Stored in Secrets Manager

**Recovery Procedure:**
1. Identify failure scope
2. If data corruption: Restore DynamoDB from PITR
3. If code issue: Rollback Lambda to previous version
4. Verify data integrity
5. Resume operations

### Backup Strategy

| Resource | Backup Method | Frequency | Retention |
|----------|---------------|-----------|-----------|
| DynamoDB | PITR | Continuous | 35 days |
| OpenSearch | Snapshots | Daily | 14 days |
| S3 | Versioning | Continuous | 30 days |
| Secrets | N/A (managed) | N/A | N/A |

### Monitoring & Alerting

**CloudWatch Dashboard:**
- Lambda invocations, errors, duration
- API Gateway requests, latency, 4xx/5xx
- DynamoDB read/write capacity, throttles
- OpenSearch cluster health, query latency

**Alarms:**
| Alarm | Metric | Threshold | Action |
|-------|--------|-----------|--------|
| High Error Rate | Lambda Errors | > 5% | SNS → PagerDuty |
| High Latency | API p95 | > 500ms | SNS → Email |
| DynamoDB Throttle | ThrottledRequests | > 0 | SNS → Email |
| OpenSearch Red | ClusterStatus.red | = 1 | SNS → PagerDuty |

---

## Integration Architecture

### External Integrations

#### Facebook Graph API
- **Purpose:** Read posts, publish content, user data
- **Auth:** App access token
- **Rate Limits:** 200 calls/user/hour
- **Error Handling:** Retry with backoff, log failures

#### Facebook Messenger Platform
- **Purpose:** Send/receive messages
- **Auth:** Page access token
- **Webhooks:** Receive message events
- **Rate Limits:** 250 calls/second

#### OpenAI API
- **Purpose:** Text analysis, intent recognition
- **Auth:** API key
- **Model:** GPT-4 Turbo
- **Error Handling:** Fallback to rule-based analysis

### Internal Integrations

**Make → Lambda (via API Gateway)**
```
Make HTTP Request Node → API Gateway → Lambda
Headers: { "X-Internal-Key": "..." }
```

**Lambda → DynamoDB**
```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
```

**Lambda → OpenSearch**
```javascript
const { Client } = require('@opensearch-project/opensearch');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');

const client = new Client({
  ...AwsSigv4Signer({
    region: 'eu-south-1',
    service: 'es'
  }),
  node: process.env.OPENSEARCH_ENDPOINT
});
```

### Event Architecture

**DynamoDB Streams → OpenSearch Sync**
```
DynamoDB Table (Listings)
    → DynamoDB Streams
    → Lambda (indexer)
    → OpenSearch
```

**Scheduled Events**
```
EventBridge Rule (cron)
    → Make Webhook
    → Matching Workflow
```

---

## Development Architecture

### Code Organization

```
quofind-marketplace/
├── lambda/
│   ├── listings/
│   │   ├── create.js
│   │   ├── search.js
│   │   └── delete.js
│   ├── requests/
│   │   ├── create.js
│   │   └── getActive.js
│   ├── groups/
│   │   ├── create.js
│   │   ├── addUser.js
│   │   └── getInfo.js
│   ├── cashback/
│   │   ├── getBalance.js
│   │   ├── update.js
│   │   └── rollback.js
│   ├── chatbot/
│   │   ├── messageHandler.js
│   │   ├── intentAnalyzer.js
│   │   └── responseFormatter.js
│   └── shared/
│       ├── auth.js
│       ├── db.js
│       ├── es.js
│       ├── errors.js
│       └── localization.js
├── Make/
│   ├── workflows/
│   │   ├── handle-new-post.json
│   │   ├── periodic-matching.json
│   │   └── payment-confirmation.json
│   └── credentials/
├── infrastructure/
│   ├── template.yaml (SAM)
│   ├── dynamodb/
│   └── opensearch/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
└── package.json
```

### Testing Strategy

**Unit Tests (Jest):**
- Each Lambda function tested in isolation
- Mock AWS services with aws-sdk-mock
- Target: 70%+ coverage

**Integration Tests:**
- Lambda with real DynamoDB (local)
- API Gateway integration
- Make workflow execution

**E2E Tests:**
- Full flow: Post → Listing → Search → Notification
- Postman/Newman collections

### CI/CD Pipeline

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: aws-actions/setup-sam@v2
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-south-1
      - run: sam build
      - run: sam deploy --no-confirm-changeset
```

### Environments

| Environment | Purpose | AWS Account |
|-------------|---------|-------------|
| dev | Development | quofind-dev |
| staging | Pre-production testing | quofind-staging |
| prod | Production | quofind-prod |

**Environment Parity:**
- Same infrastructure (SAM template)
- Different resource names (prefix)
- Separate Facebook apps per environment

---

## Requirements Traceability

### Functional Requirements Coverage

| FR ID | FR Name | Components | Status |
|-------|---------|------------|--------|
| FR-001 | Create Listing via FB Post | Facebook Layer, Make, Listings Service | Covered |
| FR-002 | AI Content Analysis | Chatbot Service (intentAnalyzer), OpenAI | Covered |
| FR-003 | Listing Persistence | Listings Service, DynamoDB, OpenSearch | Covered |
| FR-004 | Search Listings | Listings Service, OpenSearch | Covered |
| FR-005 | Listing Expiration | Listings Service, EventBridge | Covered |
| FR-006 | Delete Listing | Listings Service, Auth middleware | Covered |
| FR-007 | Create Request via Messenger | Chatbot, Requests Service | Covered |
| FR-008 | AI Request Analysis | Chatbot Service | Covered |
| FR-009 | Manage Active Requests | Requests Service | Covered |
| FR-010 | Request Expiration | Requests Service, EventBridge | Covered |
| FR-011 | Periodic Matching | Make (matching workflow) | Covered |
| FR-012 | Notify Buyers | Make, Messenger API | Covered |
| FR-013 | Notify Sellers | Make, Messenger API | Covered |
| FR-014 | Group-based Matching | Make, Groups Service | Covered |
| FR-015 | Create Groups | Groups Service | Covered |
| FR-016 | Group Leader Role | Groups Service, Auth | Covered |
| FR-017 | Manage Members | Groups Service | Covered |
| FR-018 | Exclusive Offers | Listings Service (groupExclusive) | Covered |
| FR-019 | FB Groups Sync | Facebook Layer, Groups Service | Covered |
| FR-020 | Group Info | Groups Service | Covered |
| FR-021-029 | Cashback System | Cashback Service | Covered |
| FR-030-032 | Referral System | Cashback Service, Users | Covered |
| FR-033-040 | Chatbot | Chatbot Service | Covered |
| FR-041-044 | Notifications | Make, Messenger API | Covered |
| FR-045-047 | Authentication | Auth middleware, Facebook Login | Covered |
| FR-048-050 | Facebook Integration | Facebook Layer | Covered |

**Coverage: 50/50 FRs (100%)**

### Non-Functional Requirements Coverage

| NFR ID | NFR Name | Solution | Validation |
|--------|----------|----------|------------|
| NFR-001 | API < 500ms | Lambda optimization, caching | CloudWatch p95 |
| NFR-002 | Throughput | Auto-scaling, concurrency | Load testing |
| NFR-003 | Authentication | Facebook OAuth | Integration test |
| NFR-004 | Authorization | RBAC middleware | Unit tests |
| NFR-005 | Encryption | KMS, TLS | Security audit |
| NFR-006 | Auto-scaling | Serverless | Load testing |
| NFR-007 | 99.5% Uptime | Multi-AZ, redundancy | CloudWatch |
| NFR-008 | Error Handling | Retry, DLQ | Integration tests |
| NFR-009 | Localization | i18n messages | Manual testing |
| NFR-010 | Monitoring | CloudWatch, alarms | Dashboard review |
| NFR-011 | Code Quality | ESLint, Jest 70% | CI pipeline |
| NFR-012 | FB API Compat | API versioning | Integration test |

**Coverage: 12/12 NFRs (100%)**

---

## Trade-offs & Decision Log

### Decision 1: Make vs Pure Lambda Orchestration

**Choice:** Make for workflow orchestration

**Trade-off:**
- **Gain:** Visual workflow design, easy modification, built-in scheduling
- **Lose:** Additional component to maintain, potential SPOF

**Rationale:** Visual workflows significantly reduce complexity for non-trivial business logic. The team can modify workflows without code changes.

---

### Decision 2: DynamoDB vs PostgreSQL

**Choice:** DynamoDB

**Trade-off:**
- **Gain:** Serverless scaling, low latency, AWS integration
- **Lose:** No complex queries, no JOINs, need for denormalization

**Rationale:** Access patterns are well-defined and key-based. The simplicity of DynamoDB aligns with serverless architecture.

---

### Decision 3: Separate OpenSearch vs DynamoDB-only

**Choice:** DynamoDB + OpenSearch

**Trade-off:**
- **Gain:** Full-text search, complex queries, better UX for search
- **Lose:** Data duplication, sync complexity, additional cost

**Rationale:** Search quality is critical for marketplace success. The added complexity is worth the improved user experience.

---

### Decision 4: No Caching Layer (Initial)

**Choice:** Start without Redis/ElastiCache

**Trade-off:**
- **Gain:** Simplicity, lower cost, fewer components
- **Lose:** Potentially higher latency for repeated queries

**Rationale:** Start simple, add caching when metrics show it's needed. Premature optimization avoided.

---

## Open Issues & Risks

| ID | Issue | Impact | Mitigation | Status |
|----|-------|--------|------------|--------|
| R1 | Facebook API changes | High | Monitor changelog, abstraction layer | Open |
| R2 | OpenAI cost at scale | Medium | Monitor usage, implement fallbacks | Open |
| R3 | Make single point of failure | Medium | Docker with auto-restart, monitoring | Open |
| R4 | DynamoDB hot partitions | Low | Proper partition key design | Mitigated |
| R5 | Facebook rate limits | Medium | Queuing, backoff, monitoring | Open |

---

## Assumptions & Constraints

### Assumptions

1. Facebook APIs will remain stable and available
2. Users have Facebook accounts and are willing to use FB Login
3. Payment processing is handled entirely by Facebook Pay
4. Italian market is primary target (EU compliance needed)
5. Traffic will grow gradually (no viral spikes expected initially)
6. Team has Node.js expertise

### Constraints

1. **Budget:** Serverless to minimize fixed costs
2. **Timeline:** Architecture must support iterative development
3. **Compliance:** GDPR for EU users
4. **Vendor:** AWS-only for infrastructure (existing relationship)
5. **Integration:** Facebook ecosystem dependency

---

## Future Considerations

### Short-term (6 months)
- Add ElastiCache Redis for caching
- Implement CI/CD for Make workflows
- Add more languages (Spanish, German)

### Medium-term (12 months)
- Mobile app with push notifications
- Web dashboard for analytics
- Expand to other EU countries

### Long-term (24+ months)
- Multi-marketplace support (beyond Facebook)
- Machine learning for better matching
- Real-time bidding features

---

## Approval & Sign-off

**Review Status:**
- [ ] Technical Lead
- [ ] Product Owner
- [ ] Security Architect
- [ ] DevOps Lead

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-10 | maurolarese | Initial architecture |

---

## Next Steps

### Phase 4: Sprint Planning & Implementation

Run `/sprint-planning` to:
- Break epics into detailed user stories
- Estimate story complexity
- Plan sprint iterations
- Begin implementation following this architectural blueprint

**Key Implementation Principles:**
1. Follow component boundaries defined in this document
2. Implement NFR solutions as specified
3. Use technology stack as defined
4. Follow API contracts exactly
5. Adhere to security and performance guidelines

---

**This document was created using BMAD Method v6 - Phase 3 (Solutioning)**

*To continue: Run `/workflow-status` to see your progress and next recommended workflow.*

---

## Appendix A: Technology Evaluation Matrix

| Category | Option | Pros | Cons | Decision |
|----------|--------|------|------|----------|
| Orchestration | Make | Visual, open-source | Self-hosted | Selected |
| Orchestration | Step Functions | AWS native | Complex, verbose | Rejected |
| Database | DynamoDB | Serverless, fast | No JOINs | Selected |
| Database | PostgreSQL | Flexible queries | Needs server | Rejected |
| Search | OpenSearch | Full-text, managed | Cost | Selected |
| Search | DynamoDB only | Simple | Limited queries | Rejected |

---

## Appendix B: Capacity Planning

### Initial Deployment (Month 1-3)

| Resource | Size | Estimated Cost |
|----------|------|----------------|
| Lambda | 256MB, on-demand | ~$50/month |
| DynamoDB | On-demand | ~$30/month |
| OpenSearch | 2x t3.small | ~$150/month |
| API Gateway | On-demand | ~$20/month |
| S3 | 10GB | ~$1/month |
| Make (EC2) | t3.small | ~$20/month |
| **Total** | | **~$270/month** |

### Growth Projection (Month 6-12)

| Metric | Month 1 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Users | 500 | 5,000 | 20,000 |
| Listings | 1,000 | 10,000 | 50,000 |
| Requests/day | 100 | 1,000 | 5,000 |
| Est. Cost | $270 | $500 | $1,000 |

---

## Appendix C: Cost Estimation

### Monthly Cost Breakdown (Steady State)

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 1M invocations, 256MB | $50 |
| API Gateway | 1M requests | $20 |
| DynamoDB | 10GB, 100K reads/day | $30 |
| OpenSearch | 2x t3.small | $150 |
| S3 | 50GB storage | $5 |
| Secrets Manager | 5 secrets | $3 |
| CloudWatch | Logs, metrics | $20 |
| OpenAI | 10K analyses | $100-300 |
| **Total** | | **$380-580/month** |

### Cost Optimization Strategies

1. Reserved capacity for OpenSearch (save 30-40%)
2. Optimize Lambda memory allocation
3. Implement caching to reduce OpenAI calls
4. DynamoDB TTL for auto-deletion of old data
