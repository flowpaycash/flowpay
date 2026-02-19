# NEO NEXUS - IMPLEMENTATION PLAN
> **Version:** 1.0.0  
> **Target:** Standalone Orchestration Service  
> **Timeline:** 3-5 Days (Developer Time)

---

## PHASE 1: FOUNDATION (Day 1)

### Task 1.1: Initialize Node.js Project
**Priority:** Critical  
**Estimated Time:** 30 min

**Actions:**
1. Create `package.json` with dependencies:
   ```json
   {
     "name": "@neo-protocol/nexus",
     "version": "1.0.0",
     "type": "module",
     "dependencies": {
       "express": "^5.0.0",
       "ws": "^8.19.0",
       "better-sqlite3": "^12.0.0",
       "dotenv": "^17.0.0",
       "winston": "^3.15.0"
     },
     "devDependencies": {
       "typescript": "^5.9.0",
       "tsx": "^4.21.0",
       "@types/node": "^25.0.0",
       "@types/express": "^5.0.0",
       "@types/ws": "^8.18.0"
     },
     "scripts": {
       "dev": "tsx watch src/server.ts",
       "build": "tsc",
       "start": "node dist/server.js"
     }
   }
   ```

2. Create `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "node",
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true
     }
   }
   ```

3. Run: `pnpm install`

**Deliverable:** Working Node.js project with TypeScript setup.

---

### Task 1.2: Create HTTP Server
**Priority:** Critical  
**Estimated Time:** 1 hour

**File:** `src/server.ts`

**Requirements:**
- Express server listening on `PORT` (env var, default 3000)
- Health check endpoint: `GET /health` → `{ status: "ok", uptime: 123 }`
- Generic event ingress: `POST /events`
- CORS middleware (restrict to known origins)
- JSON body parser
- Error handling middleware

**Validation:**
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","uptime":5}
```

**Deliverable:** `src/server.ts` with basic Express setup.

---

### Task 1.3: Implement HMAC Authentication
**Priority:** High  
**Estimated Time:** 1 hour

**File:** `src/middleware/auth.ts`

**Logic:**
1. Extract `X-Nexus-Signature` header from request
2. Compute `HMAC-SHA256(req.body, NEXUS_SECRET)`
3. Compare with signature (constant-time comparison)
4. Reject if mismatch (401 Unauthorized)

**Environment Variable:**
```
NEXUS_SECRET=your-secret-key-here
```

**Deliverable:** Middleware function `validateSignature(req, res, next)`

---

## PHASE 2: EVENT BUS INTEGRATION (Day 2)

### Task 2.1: Refactor Event Bus for Server Context
**Priority:** Critical  
**Estimated Time:** 1 hour

**Current Issue:** `index.ts` is a singleton designed for embedded use.

**Solution:** Create `src/core/nexus.ts` with:
- Same `ProtocolEvent` enum
- Same `Nexus` class
- Add method: `Nexus.persistEvent(event, payload)` → saves to SQLite
- Add method: `Nexus.getEventLog(limit)` → retrieves history

**Database Schema (SQLite):**
```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  payload TEXT NOT NULL,
  source TEXT,
  timestamp INTEGER NOT NULL
);
```

**Deliverable:** `src/core/nexus.ts` with persistence.

---

### Task 2.2: Wire HTTP Endpoints to Event Bus
**Priority:** Critical  
**Estimated Time:** 1 hour

**File:** `src/routes/events.ts`

**Endpoint Logic:**
```typescript
router.post('/events', validateSignature, async (req, res) => {
  const { event, payload } = req.body;
  
  // Validate event type
  if (!Object.values(ProtocolEvent).includes(event)) {
    return res.status(400).json({ error: 'Invalid event type' });
  }
  
  // Dispatch to Event Bus
  Nexus.dispatch(event, payload);
  
  // Persist to database
  await Nexus.persistEvent(event, payload, req.ip);
  
  res.json({ status: 'dispatched', event });
});
```

**Deliverable:** Working `/events` endpoint that logs to DB.

---

### Task 2.3: Implement Reactors
**Priority:** High  
**Estimated Time:** 2 hours

**File:** `src/reactors/index.ts`

**Requirements:**
- Load all reactors from `src/reactors/*.ts`
- Each reactor file exports a `setup(nexus)` function
- Example reactor: `src/reactors/payment-to-mint.ts`

**Example Reactor:**
```typescript
import { Nexus, ProtocolEvent } from '../core/nexus.js';

export function setup(nexus: typeof Nexus) {
  nexus.onEvent(ProtocolEvent.PAYMENT_RECEIVED, async (payload) => {
    console.log('[REACTOR] Payment received, requesting mint...');
    
    // Call Smart Factory API
    const response = await fetch(process.env.FACTORY_API_URL + '/api/mint', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FACTORY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: payload.payerId,
        amount: payload.amount,
        reason: 'purchase'
      })
    });
    
    if (!response.ok) {
      console.error('[REACTOR] Mint request failed:', await response.text());
      // TODO: Add to retry queue
    }
  });
}
```

**Deliverable:** Reactor system with at least 1 working reactor.

---

## PHASE 3: REAL-TIME STREAMING (Day 3)

### Task 3.1: Implement WebSocket Server
**Priority:** Medium  
**Estimated Time:** 2 hours

**File:** `src/websocket/server.ts`

**Requirements:**
- WebSocket server on same port as HTTP (upgrade connection)
- Client sends: `{ action: "subscribe", events: ["PAYMENT_RECEIVED"] }`
- Server broadcasts to subscribed clients when event occurs
- Heartbeat/ping-pong to detect dead connections

**Integration with Event Bus:**
```typescript
Nexus.onEvent(ProtocolEvent.PAYMENT_RECEIVED, (payload) => {
  // Broadcast to all WebSocket clients subscribed to this event
  wsServer.broadcast('PAYMENT_RECEIVED', payload);
});
```

**Deliverable:** Working WebSocket server with subscription logic.

---

## PHASE 4: DEPLOYMENT (Day 4)

### Task 4.1: Create Dockerfile
**Priority:** High  
**Estimated Time:** 30 min

**File:** `Dockerfile`

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Validation:**
```bash
docker build -t neo-nexus .
docker run -p 3000:3000 -e NEXUS_SECRET=test neo-nexus
```

**Deliverable:** Working Docker image.

---

### Task 4.2: Railway Configuration
**Priority:** High  
**Estimated Time:** 30 min

**File:** `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Environment Variables to Set in Railway:**
- `NEXUS_SECRET` (generate with `openssl rand -hex 32`)
- `FACTORY_API_URL`
- `FACTORY_API_KEY`
- `PORT` (Railway auto-assigns)

**Deliverable:** Railway deployment configuration.

---

### Task 4.3: Deploy to Railway
**Priority:** High  
**Estimated Time:** 1 hour

**Steps:**
1. Push code to GitHub: `git push origin main`
2. Connect Railway to `NEO-PROTOCOL/neo-nexus` repo
3. Set environment variables
4. Deploy
5. Verify health check: `curl https://nexus-production.up.railway.app/health`

**Deliverable:** Live Nexus service at `nexus.neoprotocol.space`.

---

## PHASE 5: INTEGRATION & TESTING (Day 5)

### Task 5.1: Update Neobot to Use External Nexus
**Priority:** Medium  
**Estimated Time:** 1 hour

**File (in Neobot):** `src/gateway/server-startup.ts`

**Change:**
```typescript
// OLD: setupNexusReactors() (embedded)
// NEW: Connect to external Nexus via WebSocket
import { NexusClient } from '@neo-protocol/nexus-sdk';

const nexusClient = new NexusClient('wss://nexus.neoprotocol.space');
nexusClient.subscribe(['MINT_CONFIRMED'], (event, payload) => {
  // Send WhatsApp notification
});
```

**Deliverable:** Neobot consuming events from external Nexus.

---

### Task 5.2: Configure FlowPay Webhook
**Priority:** High  
**Estimated Time:** 30 min

**File (in FlowPay):** `src/webhooks/nexus.ts`

**Logic:**
```typescript
// After PIX payment confirmed
const signature = createHmac('sha256', NEXUS_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

await fetch('https://nexus.neoprotocol.space/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Nexus-Signature': signature
  },
  body: JSON.stringify({
    event: 'PAYMENT_RECEIVED',
    payload: {
      transactionId: tx.id,
      amount: tx.amount,
      payerId: tx.userId
    }
  })
});
```

**Deliverable:** FlowPay sending events to Nexus.

---

### Task 5.3: End-to-End Test
**Priority:** Critical  
**Estimated Time:** 1 hour

**Test Scenario:**
1. Simulate PIX payment in FlowPay (staging)
2. Verify Nexus receives `PAYMENT_RECEIVED` event (check logs)
3. Verify Smart Factory receives mint request (check Factory logs)
4. Verify Nexus receives `MINT_CONFIRMED` callback
5. Verify WhatsApp notification sent via Neobot

**Success Criteria:** Full flow completes in <5 seconds.

**Deliverable:** Documented test results.

---

## PHASE 6: DOCUMENTATION (Ongoing)

### Task 6.1: API Documentation
**File:** `API.md`

**Content:**
- Endpoint reference (POST /events, GET /health)
- Authentication guide (HMAC signature)
- Event schema for each ProtocolEvent
- WebSocket protocol spec

---

### Task 6.2: Integration Guide
**File:** `INTEGRATION_GUIDE.md`

**Content:**
- How to send events to Nexus (with code examples in Node.js, Python, cURL)
- How to subscribe to events (WebSocket client example)
- Security best practices

---

## DEPENDENCIES & RISKS

### External Dependencies:
- Smart Factory API must be live and documented
- FlowPay must support outbound webhooks
- Railway account with sufficient credits

### Risks:
- **High Traffic:** If >1000 events/min, need Redis Pub/Sub (Phase 3 architecture)
- **Reactor Failures:** Need retry queue (use BullMQ or similar)
- **Security:** NEXUS_SECRET leak = full compromise (rotate quarterly)

---

## SUCCESS METRICS

- [ ] Nexus processes 100 events without error
- [ ] Average event dispatch latency <100ms
- [ ] Zero downtime during 7-day test period
- [ ] All reactors execute successfully (0% failure rate)

---

**Document Status:** Implementation Plan Complete  
**Estimated Total Time:** 3-5 Developer Days  
**Next Action:** Assign to developer or AI agent for execution.
