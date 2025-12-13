# Sprint Plan: Quofind Marketplace

**Date:** 2025-12-10
**Scrum Master:** maurolarese
**Project Level:** 4 (Enterprise)
**Total Stories:** 68
**Total Points:** 253
**Planned Sprints:** 5

---

## Executive Summary

Questo sprint plan definisce l'implementazione di Quofind Marketplace attraverso 5 sprint settimanali. Il piano copre tutti i 50 Functional Requirements organizzati in 9 Epic, con un team di 4 sviluppatori senior.

**Key Metrics:**
| Metrica | Valore |
|---------|--------|
| Total Stories | 68 |
| Total Points | 253 |
| Sprints | 5 |
| Team Capacity | 60 points/sprint |
| Sprint Length | 1 settimana |
| Target Completion | 5 settimane |

---

## Team Configuration

| Setting | Value |
|---------|-------|
| Team Size | 4 sviluppatori |
| Experience Level | Senior |
| Productive Hours/Day | 6 ore |
| Sprint Length | 1 settimana (5 giorni) |
| Capacity/Sprint | 60 story points |
| Buffer | 10% (6 points) |
| Committable/Sprint | 54 story points |

---

## Story Inventory

### EPIC-001: Core Listings Management (38 points)

#### STORY-001: Setup DynamoDB MarketplaceListings Table
**Epic:** EPIC-001 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a developer, I want to create the MarketplaceListings DynamoDB table with proper schema, so that listings can be persisted.

**Acceptance Criteria:**
- [ ] Table created with id as partition key
- [ ] GSIs for userId, status, groupId
- [ ] Point-in-time recovery enabled
- [ ] Encryption at rest enabled

**Technical Notes:** Infrastructure story, prerequisite for all listing operations
**Dependencies:** None

---

#### STORY-002: Setup OpenSearch Listings Index
**Epic:** EPIC-001 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a developer, I want to create the OpenSearch listings index with proper mappings, so that full-text search is available.

**Acceptance Criteria:**
- [ ] Index created with Italian analyzer
- [ ] Mappings for title, description, category, location, price, keywords
- [ ] Geo-point mapping for location

**Technical Notes:** Infrastructure story
**Dependencies:** None

---

#### STORY-003: Create Listing Lambda Function
**Epic:** EPIC-001 | **Priority:** Must Have | **Points:** 5

**User Story:**
As a seller, I want my listing to be saved when created, so that it appears in search results.

**Acceptance Criteria:**
- [ ] Lambda creates record in DynamoDB
- [ ] Document indexed in OpenSearch
- [ ] UUID generated for listing ID
- [ ] Timestamps recorded
- [ ] Returns listing ID and status

**Technical Notes:** Implements FR-003
**Dependencies:** STORY-001, STORY-002

---

#### STORY-004: AI Content Analysis Integration
**Epic:** EPIC-001 | **Priority:** Must Have | **Points:** 8

**User Story:**
As the system, I want to analyze post text with OpenAI, so that category, price, location, and keywords are automatically extracted.

**Acceptance Criteria:**
- [ ] OpenAI API integration
- [ ] Structured prompt for extraction
- [ ] JSON output parsing
- [ ] Error handling for ambiguous content
- [ ] Fallback for API failures

**Technical Notes:** Implements FR-002, uses GPT-4 Turbo
**Dependencies:** None

---

#### STORY-005: Search Listings Lambda Function
**Epic:** EPIC-001 | **Priority:** Must Have | **Points:** 5

**User Story:**
As a buyer, I want to search listings by category, location, and price, so that I can find what I'm looking for.

**Acceptance Criteria:**
- [ ] Full-text search on title/description
- [ ] Filter by category (exact match)
- [ ] Filter by location (text or geo)
- [ ] Filter by price range
- [ ] Pagination support
- [ ] Sort by relevance/date

**Technical Notes:** Implements FR-004, queries OpenSearch
**Dependencies:** STORY-002

---

#### STORY-006: Delete Listing Lambda Function
**Epic:** EPIC-001 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a seller, I want to delete my listing, so that it no longer appears in search results.

**Acceptance Criteria:**
- [ ] Ownership verification
- [ ] Remove from DynamoDB
- [ ] Remove from OpenSearch
- [ ] Return confirmation

**Technical Notes:** Implements FR-006
**Dependencies:** STORY-001, STORY-002

---

#### STORY-007: Listing Expiration Scheduler
**Epic:** EPIC-001 | **Priority:** Should Have | **Points:** 5

**User Story:**
As the system, I want to automatically expire old listings, so that the marketplace stays fresh.

**Acceptance Criteria:**
- [ ] EventBridge rule triggers daily
- [ ] Lambda queries expired listings
- [ ] Status updated to "expired"
- [ ] Notification sent to seller
- [ ] Removed from active search

**Technical Notes:** Implements FR-005
**Dependencies:** STORY-003

---

#### STORY-008: DynamoDB to OpenSearch Sync
**Epic:** EPIC-001 | **Priority:** Must Have | **Points:** 5

**User Story:**
As a developer, I want DynamoDB changes to sync to OpenSearch, so that search is always up-to-date.

**Acceptance Criteria:**
- [ ] DynamoDB Streams enabled
- [ ] Lambda triggered on changes
- [ ] Create/Update/Delete synced to ES
- [ ] Error handling and DLQ

**Technical Notes:** Uses DynamoDB Streams
**Dependencies:** STORY-001, STORY-002

---

### EPIC-002: Requests & Automatic Matching (42 points)

#### STORY-009: Setup DynamoDB MarketplaceRequests Table
**Epic:** EPIC-002 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a developer, I want to create the MarketplaceRequests table, so that purchase requests can be persisted.

**Acceptance Criteria:**
- [ ] Table with id partition key
- [ ] GSIs for userId, status
- [ ] Encryption enabled

**Technical Notes:** Infrastructure
**Dependencies:** None

---

#### STORY-010: Create Request Lambda Function
**Epic:** EPIC-002 | **Priority:** Must Have | **Points:** 5

**User Story:**
As a buyer, I want to submit a purchase request via Messenger, so that the system finds matching listings.

**Acceptance Criteria:**
- [ ] Request saved to DynamoDB
- [ ] AI analysis extracts criteria
- [ ] Status set to "active"
- [ ] Confirmation sent to buyer

**Technical Notes:** Implements FR-007, FR-008, FR-009
**Dependencies:** STORY-009, STORY-004

---

#### STORY-011: Get Active Requests Lambda
**Epic:** EPIC-002 | **Priority:** Must Have | **Points:** 2

**User Story:**
As the matching system, I want to retrieve all active requests, so that I can find matches.

**Acceptance Criteria:**
- [ ] Query by status = "active"
- [ ] Return with criteria data

**Technical Notes:** Used by matching workflow
**Dependencies:** STORY-009

---

#### STORY-012: Make Handle New Facebook Post Workflow
**Epic:** EPIC-002 | **Priority:** Must Have | **Points:** 8

**User Story:**
As the system, I want to process Facebook posts automatically, so that listings are created without manual work.

**Acceptance Criteria:**
- [ ] Webhook receives FB post events
- [ ] Validate post source
- [ ] Call AI analysis
- [ ] Create listing via Lambda
- [ ] Send confirmation via Messenger

**Technical Notes:** Main workflow in Make, implements FR-001
**Dependencies:** STORY-003, STORY-004

---

#### STORY-013: Make Periodic Matching Workflow
**Epic:** EPIC-002 | **Priority:** Must Have | **Points:** 8

**User Story:**
As the system, I want to run matching every 5 minutes, so that buyers are notified of new listings.

**Acceptance Criteria:**
- [ ] Cron trigger every 5 minutes
- [ ] Fetch active requests
- [ ] Search listings for each request
- [ ] Score and rank matches
- [ ] Trigger notifications for matches

**Technical Notes:** Implements FR-011
**Dependencies:** STORY-011, STORY-005

---

#### STORY-014: Notify Buyer on Match
**Epic:** EPIC-002 | **Priority:** Must Have | **Points:** 5

**User Story:**
As a buyer, I want to be notified when a matching listing is found, so that I can act quickly.

**Acceptance Criteria:**
- [ ] Messenger message with listing details
- [ ] Link to view listing
- [ ] Message in user's language
- [ ] De-duplication (don't re-notify)

**Technical Notes:** Implements FR-012
**Dependencies:** STORY-013

---

#### STORY-015: Notify Seller of Relevant Request
**Epic:** EPIC-002 | **Priority:** Must Have | **Points:** 5

**User Story:**
As a seller, I want to be notified of relevant purchase requests, so that I can create listings to match.

**Acceptance Criteria:**
- [ ] Anonymous notification (no buyer details)
- [ ] Generic description of request
- [ ] Invite to create listing

**Technical Notes:** Implements FR-013
**Dependencies:** STORY-013

---

#### STORY-016: Request Expiration Scheduler
**Epic:** EPIC-002 | **Priority:** Should Have | **Points:** 3

**User Story:**
As the system, I want to expire old requests, so that matching is efficient.

**Acceptance Criteria:**
- [ ] Daily expiration check
- [ ] Status updated to "expired"
- [ ] Optional notification to user

**Technical Notes:** Implements FR-010
**Dependencies:** STORY-009

---

#### STORY-017: Group-Based Matching Priority
**Epic:** EPIC-002 | **Priority:** Should Have | **Points:** 3

**User Story:**
As a group member, I want matching to prioritize my group's listings, so that I find relevant items faster.

**Acceptance Criteria:**
- [ ] Boost score for same-group matches
- [ ] Group filter option in search

**Technical Notes:** Implements FR-014
**Dependencies:** STORY-013

---

### EPIC-003: Groups Management (32 points)

#### STORY-018: Setup DynamoDB Groups Table
**Epic:** EPIC-003 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a developer, I want to create the Groups table, so that group data can be stored.

**Acceptance Criteria:**
- [ ] Table with groupId partition key
- [ ] GSI for leaderId
- [ ] Members stored as list

**Technical Notes:** Infrastructure
**Dependencies:** None

---

#### STORY-019: Create Group Lambda Function
**Epic:** EPIC-003 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a user, I want to create a group, so that I can build a community.

**Acceptance Criteria:**
- [ ] Group record created
- [ ] Creator becomes leader
- [ ] Unique name validation
- [ ] Return group ID

**Technical Notes:** Implements FR-015, FR-016
**Dependencies:** STORY-018

---

#### STORY-020: Add User to Group Lambda
**Epic:** EPIC-003 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a group leader, I want to add members, so that they can participate.

**Acceptance Criteria:**
- [ ] Verify leader permission
- [ ] Add userId to members list
- [ ] Prevent duplicates

**Technical Notes:** Implements FR-017
**Dependencies:** STORY-018, STORY-019

---

#### STORY-021: Remove User from Group Lambda
**Epic:** EPIC-003 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a group leader, I want to remove members, so that I can manage my community.

**Acceptance Criteria:**
- [ ] Verify leader permission
- [ ] Remove userId from members
- [ ] Cannot remove self (leader)

**Technical Notes:** Implements FR-017
**Dependencies:** STORY-018

---

#### STORY-022: Get Group Info Lambda
**Epic:** EPIC-003 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a user, I want to view group details, so that I know about the group.

**Acceptance Criteria:**
- [ ] Return group name, description
- [ ] Return leader info
- [ ] Return member count
- [ ] Return group stats (if leader)

**Technical Notes:** Implements FR-020
**Dependencies:** STORY-018

---

#### STORY-023: Group Exclusive Listings Flag
**Epic:** EPIC-003 | **Priority:** Should Have | **Points:** 5

**User Story:**
As a group leader, I want to create exclusive listings, so that only members see them.

**Acceptance Criteria:**
- [ ] groupExclusive flag on listings
- [ ] Search filters by group membership
- [ ] Notification to members

**Technical Notes:** Implements FR-018
**Dependencies:** STORY-003, STORY-019

---

#### STORY-024: Facebook Groups Sync Mapping
**Epic:** EPIC-003 | **Priority:** Should Have | **Points:** 5

**User Story:**
As an admin, I want to link internal groups to Facebook groups, so that posts sync automatically.

**Acceptance Criteria:**
- [ ] facebookGroupId field
- [ ] Webhook filters by group
- [ ] Auto-associate listings to group

**Technical Notes:** Implements FR-019
**Dependencies:** STORY-018, STORY-012

---

#### STORY-025: User Groups Query
**Epic:** EPIC-003 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a user, I want to see my groups, so that I can manage memberships.

**Acceptance Criteria:**
- [ ] Query groups by membership
- [ ] Return list with role (leader/member)

**Technical Notes:** Used by chatbot
**Dependencies:** STORY-018

---

#### STORY-026: Transfer Group Leadership
**Epic:** EPIC-003 | **Priority:** Should Have | **Points:** 3

**User Story:**
As a group leader, I want to transfer leadership, so that someone else can manage.

**Acceptance Criteria:**
- [ ] Verify current leader
- [ ] Update leaderId
- [ ] Notify new leader

**Technical Notes:** Edge case handling
**Dependencies:** STORY-019

---

### EPIC-004: Cashback System (45 points)

#### STORY-027: Setup DynamoDB PaybackBalances Table
**Epic:** EPIC-004 | **Priority:** Must Have | **Points:** 2

**User Story:**
As a developer, I want to create the PaybackBalances table, so that user balances can be tracked.

**Acceptance Criteria:**
- [ ] Table with userId partition key
- [ ] Fields: balance, pending, lastUpdated

**Technical Notes:** Infrastructure
**Dependencies:** None

---

#### STORY-028: Setup DynamoDB Transactions Table
**Epic:** EPIC-004 | **Priority:** Must Have | **Points:** 2

**User Story:**
As a developer, I want to create the Transactions table, so that cashback history is recorded.

**Acceptance Criteria:**
- [ ] Table with transactionId partition key
- [ ] GSI for userId
- [ ] Fields: amount, type, status, timestamp

**Technical Notes:** Infrastructure
**Dependencies:** None

---

#### STORY-029: Setup DynamoDB cashbackConfig Table
**Epic:** EPIC-004 | **Priority:** Must Have | **Points:** 2

**User Story:**
As a developer, I want to store cashback configuration, so that percentages can be changed without code.

**Acceptance Criteria:**
- [ ] Table with id partition key
- [ ] Fields: quofindCommission, buyerCashback, leaderCashback, referrerCashback
- [ ] Default record created

**Technical Notes:** Implements FR-029
**Dependencies:** None

---

#### STORY-030: Get Cashback Config Lambda
**Epic:** EPIC-004 | **Priority:** Must Have | **Points:** 2

**User Story:**
As the system, I want to retrieve cashback configuration, so that calculations use current values.

**Acceptance Criteria:**
- [ ] Return config object
- [ ] Cache for performance

**Technical Notes:** Implements FR-029
**Dependencies:** STORY-029

---

#### STORY-031: Get Payback Balance Lambda
**Epic:** EPIC-004 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a user, I want to check my cashback balance, so that I know what I've earned.

**Acceptance Criteria:**
- [ ] Return balance and pending amounts
- [ ] Create record if not exists (0 balance)

**Technical Notes:** Implements FR-026
**Dependencies:** STORY-027

---

#### STORY-032: Update Payback Balance Lambda
**Epic:** EPIC-004 | **Priority:** Must Have | **Points:** 5

**User Story:**
As the system, I want to credit cashback to users, so that they receive their rewards.

**Acceptance Criteria:**
- [ ] Add to pending balance
- [ ] Record transaction
- [ ] Handle buyer, leader, referrer credits
- [ ] Atomic operation

**Technical Notes:** Implements FR-022, FR-023, FR-024
**Dependencies:** STORY-027, STORY-028, STORY-030

---

#### STORY-033: Commission Calculation Logic
**Epic:** EPIC-004 | **Priority:** Must Have | **Points:** 5

**User Story:**
As the system, I want to calculate commissions on sales, so that cashback is distributed correctly.

**Acceptance Criteria:**
- [ ] Calculate: commission = salePrice × quofindCommission
- [ ] Calculate: buyerCashback = commission × buyerRate
- [ ] Calculate: leaderCashback = commission × leaderRate (if group)
- [ ] Calculate: referrerCashback = commission × referrerRate (if referrer)

**Technical Notes:** Implements FR-021
**Dependencies:** STORY-030

---

#### STORY-034: Make Payment Confirmation Workflow
**Epic:** EPIC-004 | **Priority:** Must Have | **Points:** 8

**User Story:**
As the system, I want to process payment confirmations, so that cashback is distributed automatically.

**Acceptance Criteria:**
- [ ] Receive payment confirmation from Facebook
- [ ] Verify transaction details
- [ ] Calculate commission and cashback
- [ ] Credit all parties
- [ ] Send notifications

**Technical Notes:** Main cashback workflow
**Dependencies:** STORY-032, STORY-033

---

#### STORY-035: Release Pending Cashback Scheduler
**Epic:** EPIC-004 | **Priority:** Must Have | **Points:** 5

**User Story:**
As the system, I want to release pending cashback after 30 days, so that users can use their rewards.

**Acceptance Criteria:**
- [ ] Daily check for 30-day old pending
- [ ] Move from pending to balance
- [ ] Update transaction status
- [ ] Notify user

**Technical Notes:** Implements FR-025
**Dependencies:** STORY-027, STORY-028

---

#### STORY-036: Rollback Payback Lambda
**Epic:** EPIC-004 | **Priority:** Should Have | **Points:** 5

**User Story:**
As the system, I want to rollback cashback on refunds, so that invalid rewards are reversed.

**Acceptance Criteria:**
- [ ] Deduct from balance or pending
- [ ] Record rollback transaction
- [ ] Handle edge cases (insufficient balance)

**Technical Notes:** Implements FR-028
**Dependencies:** STORY-027, STORY-028

---

#### STORY-037: Transaction History Query
**Epic:** EPIC-004 | **Priority:** Should Have | **Points:** 3

**User Story:**
As a user, I want to see my cashback transaction history, so that I can track my earnings.

**Acceptance Criteria:**
- [ ] Query by userId
- [ ] Sort by timestamp
- [ ] Pagination support

**Technical Notes:** Used by chatbot
**Dependencies:** STORY-028

---

#### STORY-038: Distribute Group Cashback Lambda
**Epic:** EPIC-004 | **Priority:** Must Have | **Points:** 3

**User Story:**
As the system, I want to distribute cashback for group sales, so that leaders earn their share.

**Acceptance Criteria:**
- [ ] Identify group from listing
- [ ] Credit leader account
- [ ] Record transaction with group reference

**Technical Notes:** Implements FR-023 for groups
**Dependencies:** STORY-032, STORY-022

---

### EPIC-005: Referral System (15 points)

#### STORY-039: Referrer Field in User Profile
**Epic:** EPIC-005 | **Priority:** Should Have | **Points:** 2

**User Story:**
As a user, I want to have a referrer recorded, so that they earn from my sales.

**Acceptance Criteria:**
- [ ] referrerId field in Users table
- [ ] Set during registration (optional)

**Technical Notes:** Implements FR-030
**Dependencies:** STORY-045

---

#### STORY-040: Register Referral Lambda
**Epic:** EPIC-005 | **Priority:** Should Have | **Points:** 3

**User Story:**
As a user, I want to refer a new seller, so that I earn cashback on their sales.

**Acceptance Criteria:**
- [ ] Validate new seller
- [ ] Set referrerId on new user
- [ ] Prevent self-referral

**Technical Notes:** Implements FR-030
**Dependencies:** STORY-039

---

#### STORY-041: Track Referral Sales
**Epic:** EPIC-005 | **Priority:** Should Have | **Points:** 5

**User Story:**
As the system, I want to track sales by referred sellers, so that referrers earn cashback.

**Acceptance Criteria:**
- [ ] On sale, check seller's referrer
- [ ] Credit referrer with configured percentage
- [ ] Record transaction with referral type

**Technical Notes:** Implements FR-031, FR-032
**Dependencies:** STORY-034, STORY-039

---

#### STORY-042: Referral Statistics Query
**Epic:** EPIC-005 | **Priority:** Could Have | **Points:** 5

**User Story:**
As a referrer, I want to see my referral statistics, so that I can track my earnings.

**Acceptance Criteria:**
- [ ] Count of referred sellers
- [ ] Total earnings from referrals
- [ ] List of recent referral transactions

**Technical Notes:** Used by chatbot
**Dependencies:** STORY-039, STORY-037

---

### EPIC-006: AI Chatbot (40 points)

#### STORY-043: Message Handler Lambda (Entry Point)
**Epic:** EPIC-006 | **Priority:** Must Have | **Points:** 5

**User Story:**
As the system, I want to receive and route Messenger messages, so that users can interact via chat.

**Acceptance Criteria:**
- [ ] Webhook receives message events
- [ ] Parse message text and sender
- [ ] Route to intent analyzer
- [ ] Return formatted response

**Technical Notes:** Implements FR-033
**Dependencies:** None

---

#### STORY-044: Intent Analyzer Lambda (OpenAI)
**Epic:** EPIC-006 | **Priority:** Must Have | **Points:** 8

**User Story:**
As the system, I want to analyze user messages with AI, so that I understand their intent.

**Acceptance Criteria:**
- [ ] OpenAI API call with message
- [ ] Identify intent (balance, transactions, groups, etc.)
- [ ] Extract entities
- [ ] Return confidence score
- [ ] Handle unknown intents

**Technical Notes:** Implements FR-034
**Dependencies:** None

---

#### STORY-045: Setup DynamoDB MarketplaceUsers Table
**Epic:** EPIC-006 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a developer, I want to store user profiles, so that preferences are persisted.

**Acceptance Criteria:**
- [ ] Table with userId partition key
- [ ] GSI for facebookId
- [ ] Fields: name, language, referrerId

**Technical Notes:** Infrastructure, implements FR-046
**Dependencies:** None

---

#### STORY-046: Query Builder Lambda
**Epic:** EPIC-006 | **Priority:** Must Have | **Points:** 5

**User Story:**
As the system, I want to build database queries from intent, so that data can be retrieved.

**Acceptance Criteria:**
- [ ] Map intent to query type
- [ ] Build DynamoDB query parameters
- [ ] Handle different entity types

**Technical Notes:** Internal service
**Dependencies:** STORY-044

---

#### STORY-047: Data Fetcher Lambda
**Epic:** EPIC-006 | **Priority:** Must Have | **Points:** 3

**User Story:**
As the system, I want to fetch data from services, so that chatbot can respond with facts.

**Acceptance Criteria:**
- [ ] Call appropriate service Lambda
- [ ] Return raw data

**Technical Notes:** Orchestration layer
**Dependencies:** STORY-031, STORY-037, STORY-025

---

#### STORY-048: Response Formatter Lambda
**Epic:** EPIC-006 | **Priority:** Must Have | **Points:** 5

**User Story:**
As the system, I want to format responses in user's language, so that messages are clear.

**Acceptance Criteria:**
- [ ] Localization templates (IT/EN)
- [ ] Format numbers, dates
- [ ] Generate natural language response

**Technical Notes:** Implements FR-040
**Dependencies:** STORY-045

---

#### STORY-049: Balance Query Handler
**Epic:** EPIC-006 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a user, I want to ask "Quanto e il mio saldo?", so that I get my balance via chat.

**Acceptance Criteria:**
- [ ] Recognize balance intent
- [ ] Fetch balance data
- [ ] Format response with balance and pending

**Technical Notes:** Implements FR-035
**Dependencies:** STORY-044, STORY-031, STORY-048

---

#### STORY-050: Transaction History Query Handler
**Epic:** EPIC-006 | **Priority:** Should Have | **Points:** 3

**User Story:**
As a user, I want to ask about my transactions, so that I see my history via chat.

**Acceptance Criteria:**
- [ ] Recognize transactions intent
- [ ] Fetch recent transactions
- [ ] Format as list

**Technical Notes:** Implements FR-036
**Dependencies:** STORY-044, STORY-037, STORY-048

---

#### STORY-051: Groups Query Handler
**Epic:** EPIC-006 | **Priority:** Should Have | **Points:** 3

**User Story:**
As a user, I want to ask about my groups, so that I see my memberships via chat.

**Acceptance Criteria:**
- [ ] Recognize groups intent
- [ ] Fetch user's groups
- [ ] Format with role info

**Technical Notes:** Implements FR-037
**Dependencies:** STORY-044, STORY-025, STORY-048

---

#### STORY-052: Unauthorized Request Handler
**Epic:** EPIC-006 | **Priority:** Must Have | **Points:** 2

**User Story:**
As the system, I want to reject unauthorized data requests, so that privacy is protected.

**Acceptance Criteria:**
- [ ] Detect requests for other users' data
- [ ] Return polite refusal message
- [ ] Log attempt

**Technical Notes:** Implements FR-039
**Dependencies:** STORY-044

---

### EPIC-007: Notification System (22 points)

#### STORY-053: Send Messenger Message Utility
**Epic:** EPIC-007 | **Priority:** Must Have | **Points:** 5

**User Story:**
As the system, I want a reusable function to send Messenger messages, so that notifications are consistent.

**Acceptance Criteria:**
- [ ] Facebook Messenger API integration
- [ ] Support text messages
- [ ] Support rich messages (buttons)
- [ ] Rate limit handling
- [ ] Error logging

**Technical Notes:** Implements FR-050
**Dependencies:** None

---

#### STORY-054: Listing Creation Confirmation
**Epic:** EPIC-007 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a seller, I want confirmation when my listing is created, so that I know it worked.

**Acceptance Criteria:**
- [ ] Message with listing summary
- [ ] Extracted data shown
- [ ] Link to listing (if applicable)

**Technical Notes:** Implements FR-041
**Dependencies:** STORY-053, STORY-012

---

#### STORY-055: Match Notification to Buyer
**Epic:** EPIC-007 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a buyer, I want notification of matches, so that I can view relevant listings.

**Acceptance Criteria:**
- [ ] Message with listing preview
- [ ] Price and location
- [ ] Action button

**Technical Notes:** Implements FR-042 (part)
**Dependencies:** STORY-053, STORY-013

---

#### STORY-056: Match Notification to Seller
**Epic:** EPIC-007 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a seller, I want notification of relevant requests, so that I can create matching listings.

**Acceptance Criteria:**
- [ ] Anonymous request description
- [ ] Category and budget range
- [ ] Invite to create listing

**Technical Notes:** Implements FR-042 (part)
**Dependencies:** STORY-053, STORY-013

---

#### STORY-057: Cashback Credit Notification
**Epic:** EPIC-007 | **Priority:** Should Have | **Points:** 3

**User Story:**
As a user, I want notification when cashback is credited, so that I know my earnings.

**Acceptance Criteria:**
- [ ] Message with amount credited
- [ ] New balance shown
- [ ] Pending vs available distinction

**Technical Notes:** Implements FR-043
**Dependencies:** STORY-053, STORY-034

---

#### STORY-058: Cashback Released Notification
**Epic:** EPIC-007 | **Priority:** Should Have | **Points:** 3

**User Story:**
As a user, I want notification when pending cashback is released, so that I can use it.

**Acceptance Criteria:**
- [ ] Message with released amount
- [ ] New available balance

**Technical Notes:** Implements FR-043 (part)
**Dependencies:** STORY-053, STORY-035

---

#### STORY-059: Localized Notification Templates
**Epic:** EPIC-007 | **Priority:** Should Have | **Points:** 2

**User Story:**
As a user, I want notifications in my language, so that I understand them.

**Acceptance Criteria:**
- [ ] Templates in IT and EN
- [ ] Language selection from user profile
- [ ] Fallback to EN

**Technical Notes:** Implements FR-044
**Dependencies:** STORY-045

---

### EPIC-008: User Authentication & Profiles (15 points)

#### STORY-060: Facebook Login Integration
**Epic:** EPIC-008 | **Priority:** Must Have | **Points:** 5

**User Story:**
As a user, I want to login with Facebook, so that I don't need a new account.

**Acceptance Criteria:**
- [ ] OAuth 2.0 flow
- [ ] Access token obtained
- [ ] User profile created/updated
- [ ] Token stored securely

**Technical Notes:** Implements FR-045
**Dependencies:** STORY-045

---

#### STORY-061: User Profile Management Lambda
**Epic:** EPIC-008 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a user, I want my profile stored, so that my preferences persist.

**Acceptance Criteria:**
- [ ] Create profile on first login
- [ ] Update name from Facebook
- [ ] Store language preference

**Technical Notes:** Implements FR-046
**Dependencies:** STORY-045, STORY-060

---

#### STORY-062: Token Validation Middleware
**Epic:** EPIC-008 | **Priority:** Must Have | **Points:** 5

**User Story:**
As the system, I want to validate Facebook tokens, so that only authenticated users access APIs.

**Acceptance Criteria:**
- [ ] Validate token with Facebook API
- [ ] Extract user ID
- [ ] Reject invalid tokens
- [ ] Cache validation (short TTL)

**Technical Notes:** Implements FR-047
**Dependencies:** None

---

#### STORY-063: Language Preference Update
**Epic:** EPIC-008 | **Priority:** Should Have | **Points:** 2

**User Story:**
As a user, I want to set my language preference, so that messages are in my language.

**Acceptance Criteria:**
- [ ] API to update language
- [ ] Supported: IT, EN
- [ ] Chatbot command: "Cambia lingua"

**Technical Notes:** User preference management
**Dependencies:** STORY-045

---

### EPIC-009: Facebook Platform Integration (18 points)

#### STORY-064: Facebook Webhook Setup
**Epic:** EPIC-009 | **Priority:** Must Have | **Points:** 5

**User Story:**
As a developer, I want to configure Facebook webhooks, so that events are received.

**Acceptance Criteria:**
- [ ] Webhook endpoint deployed
- [ ] Signature validation
- [ ] Subscription to page events
- [ ] Test event handling

**Technical Notes:** Implements FR-048
**Dependencies:** None

---

#### STORY-065: Webhook Event Router
**Epic:** EPIC-009 | **Priority:** Must Have | **Points:** 3

**User Story:**
As the system, I want to route webhook events to appropriate handlers, so that each event type is processed correctly.

**Acceptance Criteria:**
- [ ] Route feed events to listing workflow
- [ ] Route messaging events to chatbot
- [ ] Log unhandled events

**Technical Notes:** Entry point for FB events
**Dependencies:** STORY-064

---

#### STORY-066: Graph API Post Reader
**Epic:** EPIC-009 | **Priority:** Must Have | **Points:** 3

**User Story:**
As the system, I want to read post content from Graph API, so that full details are available.

**Acceptance Criteria:**
- [ ] Fetch post by ID
- [ ] Extract text, attachments, author
- [ ] Handle permissions errors

**Technical Notes:** Implements FR-048 (detail fetch)
**Dependencies:** STORY-064

---

#### STORY-067: Graph API Post Publisher
**Epic:** EPIC-009 | **Priority:** Should Have | **Points:** 3

**User Story:**
As the system, I want to publish posts via Graph API, so that listings can be announced.

**Acceptance Criteria:**
- [ ] Post to configured page/group
- [ ] Include text and images
- [ ] Return post ID

**Technical Notes:** Implements FR-049
**Dependencies:** None

---

#### STORY-068: Secrets Manager Integration
**Epic:** EPIC-009 | **Priority:** Must Have | **Points:** 3

**User Story:**
As a developer, I want to store API keys securely, so that credentials are protected.

**Acceptance Criteria:**
- [ ] Facebook tokens in Secrets Manager
- [ ] OpenAI key in Secrets Manager
- [ ] Lambda retrieves at runtime
- [ ] No keys in code

**Technical Notes:** Security requirement
**Dependencies:** None

---

### Infrastructure Stories (6 points)

#### STORY-INF-001: API Gateway Setup
**Epic:** Infrastructure | **Priority:** Must Have | **Points:** 3

**User Story:**
As a developer, I want API Gateway configured, so that Lambda functions are accessible.

**Acceptance Criteria:**
- [ ] REST API created
- [ ] Lambda proxy integration
- [ ] CORS configured
- [ ] Custom domain (optional)

**Technical Notes:** Infrastructure
**Dependencies:** None

---

#### STORY-INF-002: CloudWatch Dashboards & Alarms
**Epic:** Infrastructure | **Priority:** Must Have | **Points:** 3

**User Story:**
As an operator, I want monitoring configured, so that I can track system health.

**Acceptance Criteria:**
- [ ] Dashboard with key metrics
- [ ] Alarms for errors > 5%
- [ ] Alarms for latency > 500ms
- [ ] SNS notifications

**Technical Notes:** Implements NFR-010
**Dependencies:** None

---

---

## Sprint Allocation

### Sprint 1 (Week 1) - Foundation & Infrastructure
**Capacity:** 60 points | **Committed:** 54 points | **Buffer:** 6 points

**Sprint Goal:** Establish infrastructure and core data layer for listings and users.

**Stories:**

| Story ID | Title | Points | Epic | Priority |
|----------|-------|--------|------|----------|
| STORY-INF-001 | API Gateway Setup | 3 | Infra | Must |
| STORY-INF-002 | CloudWatch Dashboards & Alarms | 3 | Infra | Must |
| STORY-001 | Setup DynamoDB MarketplaceListings Table | 3 | EPIC-001 | Must |
| STORY-002 | Setup OpenSearch Listings Index | 3 | EPIC-001 | Must |
| STORY-008 | DynamoDB to OpenSearch Sync | 5 | EPIC-001 | Must |
| STORY-009 | Setup DynamoDB MarketplaceRequests Table | 3 | EPIC-002 | Must |
| STORY-018 | Setup DynamoDB Groups Table | 3 | EPIC-003 | Must |
| STORY-027 | Setup DynamoDB PaybackBalances Table | 2 | EPIC-004 | Must |
| STORY-028 | Setup DynamoDB Transactions Table | 2 | EPIC-004 | Must |
| STORY-029 | Setup DynamoDB cashbackConfig Table | 2 | EPIC-004 | Must |
| STORY-045 | Setup DynamoDB MarketplaceUsers Table | 3 | EPIC-006 | Must |
| STORY-064 | Facebook Webhook Setup | 5 | EPIC-009 | Must |
| STORY-068 | Secrets Manager Integration | 3 | EPIC-009 | Must |
| STORY-004 | AI Content Analysis Integration | 8 | EPIC-001 | Must |
| STORY-062 | Token Validation Middleware | 5 | EPIC-008 | Must |

**Total:** 53 points

**Risks:**
- Facebook webhook approval may take time
- OpenSearch cluster provisioning delay

**Dependencies:**
- AWS account access
- Facebook App configured

---

### Sprint 2 (Week 2) - Core Listings & Authentication
**Capacity:** 60 points | **Committed:** 52 points | **Buffer:** 8 points

**Sprint Goal:** Deliver complete listing creation, search, and user authentication flows.

**Stories:**

| Story ID | Title | Points | Epic | Priority |
|----------|-------|--------|------|----------|
| STORY-003 | Create Listing Lambda Function | 5 | EPIC-001 | Must |
| STORY-005 | Search Listings Lambda Function | 5 | EPIC-001 | Must |
| STORY-006 | Delete Listing Lambda Function | 3 | EPIC-001 | Must |
| STORY-012 | Make Handle New Facebook Post Workflow | 8 | EPIC-002 | Must |
| STORY-010 | Create Request Lambda Function | 5 | EPIC-002 | Must |
| STORY-011 | Get Active Requests Lambda | 2 | EPIC-002 | Must |
| STORY-053 | Send Messenger Message Utility | 5 | EPIC-007 | Must |
| STORY-060 | Facebook Login Integration | 5 | EPIC-008 | Must |
| STORY-061 | User Profile Management Lambda | 3 | EPIC-008 | Must |
| STORY-065 | Webhook Event Router | 3 | EPIC-009 | Must |
| STORY-066 | Graph API Post Reader | 3 | EPIC-009 | Must |
| STORY-054 | Listing Creation Confirmation | 3 | EPIC-007 | Must |

**Total:** 50 points

**Risks:**
- OpenAI API integration complexity
- Facebook API rate limits

**Dependencies:**
- Sprint 1 infrastructure complete

---

### Sprint 3 (Week 3) - Matching & Groups
**Capacity:** 60 points | **Committed:** 54 points | **Buffer:** 6 points

**Sprint Goal:** Deliver automatic matching system and group management functionality.

**Stories:**

| Story ID | Title | Points | Epic | Priority |
|----------|-------|--------|------|----------|
| STORY-013 | Make Periodic Matching Workflow | 8 | EPIC-002 | Must |
| STORY-014 | Notify Buyer on Match | 5 | EPIC-002 | Must |
| STORY-015 | Notify Seller of Relevant Request | 5 | EPIC-002 | Must |
| STORY-019 | Create Group Lambda Function | 3 | EPIC-003 | Must |
| STORY-020 | Add User to Group Lambda | 3 | EPIC-003 | Must |
| STORY-021 | Remove User from Group Lambda | 3 | EPIC-003 | Must |
| STORY-022 | Get Group Info Lambda | 3 | EPIC-003 | Must |
| STORY-025 | User Groups Query | 3 | EPIC-003 | Must |
| STORY-030 | Get Cashback Config Lambda | 2 | EPIC-004 | Must |
| STORY-031 | Get Payback Balance Lambda | 3 | EPIC-004 | Must |
| STORY-033 | Commission Calculation Logic | 5 | EPIC-004 | Must |
| STORY-055 | Match Notification to Buyer | 3 | EPIC-007 | Must |
| STORY-056 | Match Notification to Seller | 3 | EPIC-007 | Must |
| STORY-007 | Listing Expiration Scheduler | 5 | EPIC-001 | Should |

**Total:** 54 points

**Risks:**
- Matching algorithm complexity
- Make workflow debugging

**Dependencies:**
- Sprint 2 listings and requests complete

---

### Sprint 4 (Week 4) - Cashback & Chatbot
**Capacity:** 60 points | **Committed:** 53 points | **Buffer:** 7 points

**Sprint Goal:** Complete cashback system and deliver AI chatbot for user queries.

**Stories:**

| Story ID | Title | Points | Epic | Priority |
|----------|-------|--------|------|----------|
| STORY-032 | Update Payback Balance Lambda | 5 | EPIC-004 | Must |
| STORY-034 | Make Payment Confirmation Workflow | 8 | EPIC-004 | Must |
| STORY-035 | Release Pending Cashback Scheduler | 5 | EPIC-004 | Must |
| STORY-038 | Distribute Group Cashback Lambda | 3 | EPIC-004 | Must |
| STORY-043 | Message Handler Lambda (Entry Point) | 5 | EPIC-006 | Must |
| STORY-044 | Intent Analyzer Lambda (OpenAI) | 8 | EPIC-006 | Must |
| STORY-046 | Query Builder Lambda | 5 | EPIC-006 | Must |
| STORY-047 | Data Fetcher Lambda | 3 | EPIC-006 | Must |
| STORY-048 | Response Formatter Lambda | 5 | EPIC-006 | Must |
| STORY-049 | Balance Query Handler | 3 | EPIC-006 | Must |
| STORY-052 | Unauthorized Request Handler | 2 | EPIC-006 | Must |

**Total:** 52 points

**Risks:**
- Payment confirmation integration with Facebook
- OpenAI intent accuracy

**Dependencies:**
- Sprint 3 groups and balance complete

---

### Sprint 5 (Week 5) - Polish & Enhancements
**Capacity:** 60 points | **Committed:** 44 points | **Buffer:** 16 points

**Sprint Goal:** Complete remaining features, add enhancements, and polish for launch.

**Stories:**

| Story ID | Title | Points | Epic | Priority |
|----------|-------|--------|------|----------|
| STORY-016 | Request Expiration Scheduler | 3 | EPIC-002 | Should |
| STORY-017 | Group-Based Matching Priority | 3 | EPIC-002 | Should |
| STORY-023 | Group Exclusive Listings Flag | 5 | EPIC-003 | Should |
| STORY-024 | Facebook Groups Sync Mapping | 5 | EPIC-003 | Should |
| STORY-026 | Transfer Group Leadership | 3 | EPIC-003 | Should |
| STORY-036 | Rollback Payback Lambda | 5 | EPIC-004 | Should |
| STORY-037 | Transaction History Query | 3 | EPIC-004 | Should |
| STORY-039 | Referrer Field in User Profile | 2 | EPIC-005 | Should |
| STORY-040 | Register Referral Lambda | 3 | EPIC-005 | Should |
| STORY-041 | Track Referral Sales | 5 | EPIC-005 | Should |
| STORY-050 | Transaction History Query Handler | 3 | EPIC-006 | Should |
| STORY-051 | Groups Query Handler | 3 | EPIC-006 | Should |

**Total:** 43 points

**Remaining (Could Have / Future):**
| Story ID | Title | Points | Epic |
|----------|-------|--------|------|
| STORY-042 | Referral Statistics Query | 5 | EPIC-005 |
| STORY-057 | Cashback Credit Notification | 3 | EPIC-007 |
| STORY-058 | Cashback Released Notification | 3 | EPIC-007 |
| STORY-059 | Localized Notification Templates | 2 | EPIC-007 |
| STORY-063 | Language Preference Update | 2 | EPIC-008 |
| STORY-067 | Graph API Post Publisher | 3 | EPIC-009 |

**Risks:**
- Scope creep from polish requests
- Integration bugs discovered in testing

**Dependencies:**
- All core functionality complete

---

## Epic Traceability

| Epic ID | Epic Name | Stories | Total Points | Sprint(s) |
|---------|-----------|---------|--------------|-----------|
| EPIC-001 | Core Listings Management | STORY-001-008 | 37 | 1, 2, 3 |
| EPIC-002 | Requests & Matching | STORY-009-017 | 42 | 1, 2, 3, 5 |
| EPIC-003 | Groups Management | STORY-018-026 | 32 | 1, 3, 5 |
| EPIC-004 | Cashback System | STORY-027-038 | 45 | 1, 3, 4, 5 |
| EPIC-005 | Referral System | STORY-039-042 | 15 | 5 |
| EPIC-006 | AI Chatbot | STORY-043-052 | 40 | 1, 4, 5 |
| EPIC-007 | Notification System | STORY-053-059 | 22 | 2, 3, 5+ |
| EPIC-008 | User Authentication | STORY-060-063 | 15 | 1, 2, 5 |
| EPIC-009 | Facebook Integration | STORY-064-068 | 18 | 1, 2 |
| Infrastructure | Setup | STORY-INF-001-002 | 6 | 1 |

---

## Functional Requirements Coverage

| FR ID | FR Name | Story ID | Sprint |
|-------|---------|----------|--------|
| FR-001 | Create Listing via FB Post | STORY-012 | 2 |
| FR-002 | AI Content Analysis | STORY-004 | 1 |
| FR-003 | Listing Persistence | STORY-003 | 2 |
| FR-004 | Search Listings | STORY-005 | 2 |
| FR-005 | Listing Expiration | STORY-007 | 3 |
| FR-006 | Delete Listing | STORY-006 | 2 |
| FR-007 | Create Request via Messenger | STORY-010 | 2 |
| FR-008 | AI Request Analysis | STORY-010 | 2 |
| FR-009 | Manage Active Requests | STORY-011 | 2 |
| FR-010 | Request Expiration | STORY-016 | 5 |
| FR-011 | Periodic Matching | STORY-013 | 3 |
| FR-012 | Notify Buyers for Match | STORY-014 | 3 |
| FR-013 | Notify Sellers | STORY-015 | 3 |
| FR-014 | Group-based Matching | STORY-017 | 5 |
| FR-015 | Create Groups | STORY-019 | 3 |
| FR-016 | Group Leader Role | STORY-019 | 3 |
| FR-017 | Manage Members | STORY-020, 021 | 3 |
| FR-018 | Exclusive Offers | STORY-023 | 5 |
| FR-019 | FB Groups Sync | STORY-024 | 5 |
| FR-020 | Group Info | STORY-022 | 3 |
| FR-021 | Commission Calculation | STORY-033 | 3 |
| FR-022 | Buyer Cashback | STORY-032 | 4 |
| FR-023 | Leader Cashback | STORY-038 | 4 |
| FR-024 | Referrer Cashback | STORY-041 | 5 |
| FR-025 | 30-day Pending Period | STORY-035 | 4 |
| FR-026 | Query Balance | STORY-031 | 3 |
| FR-027 | Transaction Registry | STORY-028 | 1 |
| FR-028 | Rollback Cashback | STORY-036 | 5 |
| FR-029 | Dynamic Config | STORY-029, 030 | 1, 3 |
| FR-030 | Referral Registration | STORY-040 | 5 |
| FR-031 | Track Referral Sales | STORY-041 | 5 |
| FR-032 | Referral Cashback | STORY-041 | 5 |
| FR-033 | Webhook Messages | STORY-043 | 4 |
| FR-034 | Intent Analysis | STORY-044 | 4 |
| FR-035 | Balance Query | STORY-049 | 4 |
| FR-036 | Transaction Query | STORY-050 | 5 |
| FR-037 | Groups Query | STORY-051 | 5 |
| FR-038 | Referral Query | STORY-042 | Future |
| FR-039 | Unauthorized Handling | STORY-052 | 4 |
| FR-040 | Multilingual Responses | STORY-048 | 4 |
| FR-041 | Listing Confirmation | STORY-054 | 2 |
| FR-042 | Match Notifications | STORY-055, 056 | 3 |
| FR-043 | Cashback Notifications | STORY-057, 058 | Future |
| FR-044 | Localized Notifications | STORY-059 | Future |
| FR-045 | Facebook Login | STORY-060 | 2 |
| FR-046 | User Profiles | STORY-061 | 2 |
| FR-047 | Token Management | STORY-062 | 1 |
| FR-048 | FB Webhook Intercept | STORY-064 | 1 |
| FR-049 | Publish via Graph API | STORY-067 | Future |
| FR-050 | Messenger API | STORY-053 | 2 |

**Coverage:** 46/50 FRs in Sprints 1-5 (92%), 4 FRs in Future backlog

---

## Risks and Mitigation

### High Risk

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Facebook API policy changes | Block features | Medium | Monitor FB changelog, abstract API layer |
| OpenAI API reliability/cost | Chatbot unavailable | Medium | Implement fallback rules, monitor costs |
| Make single point of failure | Workflows stop | Medium | Docker with auto-restart, monitoring |

### Medium Risk

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Team velocity variance | Schedule slip | Medium | 10% buffer, adjust in retrospectives |
| Integration complexity | Delays | Medium | Spike stories, early integration testing |
| OpenSearch performance | Slow search | Low | Index optimization, monitoring |

### Low Risk

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| DynamoDB throttling | Errors | Low | On-demand capacity, monitoring |
| Cold start latency | Slow response | Low | Provisioned concurrency |

---

## Definition of Done

For a story to be considered complete:

- [ ] Code implemented and committed to main branch
- [ ] Unit tests written and passing (≥80% coverage for new code)
- [ ] Integration tests passing
- [ ] Code reviewed and approved by at least 1 team member
- [ ] Documentation updated (if API changes)
- [ ] Deployed to staging environment
- [ ] Acceptance criteria validated
- [ ] No critical bugs open

---

## Sprint Cadence

| Event | Day | Duration |
|-------|-----|----------|
| Sprint Planning | Monday AM | 1 hour |
| Daily Standup | Daily | 15 min |
| Sprint Review | Friday PM | 30 min |
| Sprint Retrospective | Friday PM | 30 min |

---

## Next Steps

**Immediate:** Begin Sprint 1

**Options:**
1. `/dev-story STORY-INF-001` - Start with API Gateway setup
2. `/dev-story STORY-001` - Start with DynamoDB tables
3. `/create-story STORY-XXX` - Create detailed story document

**Recommended Order for Sprint 1:**
1. STORY-068 (Secrets Manager) - Foundation
2. STORY-INF-001 (API Gateway) - Infrastructure
3. STORY-001, STORY-002, STORY-009, STORY-018, STORY-027-029, STORY-045 (DynamoDB tables) - In parallel
4. STORY-008 (DynamoDB to OpenSearch sync)
5. STORY-064 (Facebook webhook)
6. STORY-004 (AI analysis)
7. STORY-062 (Token validation)
8. STORY-INF-002 (Monitoring)

---

**This plan was created using BMAD Method v6 - Phase 4 (Implementation Planning)**

*Run `/workflow-status` to check progress, or `/dev-story STORY-XXX` to begin implementation.*
