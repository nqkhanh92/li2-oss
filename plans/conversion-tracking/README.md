# Conversion Tracking - li2-app

## Overview
Frontend implementation for conversion tracking POC: database schema, API routes, dashboard UI, and SDK package.

## Plan Access
**Premium-only feature** - Conversion tracking is gated by plan:
- Feature key: `ADVANCED_FEATURE_KEYS.CONVERSION_TRACKING`
- Enabled for: Premium, Premium Trial plans
- Validation: `ensureOrgPlan(orgId, ADVANCED_FEATURE_KEYS.CONVERSION_TRACKING)`

## POC Scope
| Feature | POC (Build Now) | Future Extension |
|---------|-----------------|------------------|
| Event Types | Lead only | Sale, custom events |
| Customer Fields | email, phone, name | avatar, external_id, metadata |
| Dashboard | Simple list views | Funnel charts, analytics |
| Plan Access | Premium only | Quota-based limits |

---

## 1. Database Schema

### 1.1 Create Migration
**File:** `supabase/migrations/YYYYMMDDHHMMSS_create_conversion_tracking.sql`

```sql
-- Event type enum for type safety
CREATE TYPE conversion_event_type AS ENUM ('lead', 'sale');

-- conversion_events table (supports both leads and sales)
CREATE TABLE "public"."conversion_events" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "organization_id" uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    "touch_point_id" uuid REFERENCES touch_points(id) ON DELETE SET NULL,
    "visit_id" uuid,
    "click_id" text NOT NULL,

    -- Event identification
    "event_type" conversion_event_type NOT NULL DEFAULT 'lead',
    "event_name" text NOT NULL DEFAULT 'lead',

    -- Customer link
    "customer_profile_id" uuid,

    -- Sale-specific fields (nullable for leads)
    "amount" bigint,
    "currency" text,
    "payment_processor" text,
    "invoice_id" text,
    "lead_event_id" uuid,

    -- Context
    "metadata" jsonb,
    "ip" inet,
    "user_agent" text,
    "referrer" text
);

-- customer_profiles table
CREATE TABLE "public"."customer_profiles" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    "organization_id" uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    "email" text,
    "phone" text,
    "name" text,
    "external_id" text,
    "avatar_url" text,
    "first_click_id" text,
    "first_touch_point_id" uuid,
    "metadata" jsonb,

    -- Aggregate stats
    "lead_count" int DEFAULT 0,
    "sale_count" int DEFAULT 0,
    "total_revenue" bigint DEFAULT 0
);

-- Add conversion_tracking to touch_points
ALTER TABLE "public"."touch_points"
ADD COLUMN IF NOT EXISTS "conversion_tracking" jsonb;

-- Indexes
CREATE INDEX idx_conversion_events_click_id ON conversion_events(click_id);
CREATE INDEX idx_conversion_events_org_id ON conversion_events(organization_id);
CREATE INDEX idx_conversion_events_type ON conversion_events(event_type);
CREATE INDEX idx_conversion_events_customer ON conversion_events(customer_profile_id);
CREATE UNIQUE INDEX idx_customer_profiles_org_email ON customer_profiles(organization_id, email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_customer_profiles_org_external_id ON customer_profiles(organization_id, external_id) WHERE external_id IS NOT NULL;

-- Self-referential FK for lead → sale linking
ALTER TABLE conversion_events
    ADD CONSTRAINT conversion_events_lead_fkey
    FOREIGN KEY (lead_event_id) REFERENCES conversion_events(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
```

### 1.2 Generate Types
```bash
yarn db-types
```

---

## 2. SDK Package (@li2/analytics)

### 2.1 Create Package
**Location:** Create new folder `packages/li2-analytics/` or separate repo

```
packages/li2-analytics/
├── package.json
├── tsconfig.json
├── rollup.config.js
└── src/
    ├── index.ts
    ├── Li2Analytics.ts
    └── types.ts
```

### 2.2 SDK Implementation

```typescript
// src/types.ts
export interface Li2Config {
  apiEndpoint?: string;
  cookieName?: string;
  cookieExpiry?: number;
  debug?: boolean;
}

export interface LeadData {
  eventName?: string;
  email?: string;
  phone?: string;
  name?: string;
  externalId?: string;
  metadata?: Record<string, any>;
}

export interface TrackResponse {
  success: boolean;
  customerId?: string;
  error?: string;
}

// src/Li2Analytics.ts
class Li2Analytics {
  private config: Li2Config;
  private li2Id: string | null = null;

  constructor(config: Li2Config = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || 'https://api.li2.ai',
      cookieName: config.cookieName || 'li2_id',
      cookieExpiry: config.cookieExpiry || 30,
      debug: config.debug || false,
    };
    this.init();
  }

  private init(): void {
    // Capture li2_id from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlLi2Id = urlParams.get('li2_id');

    if (urlLi2Id) {
      this.li2Id = urlLi2Id;
      this.storeCookie(urlLi2Id);
    } else {
      this.li2Id = this.getCookie();
    }
  }

  private storeCookie(id: string): void {
    const expires = new Date();
    expires.setDate(expires.getDate() + this.config.cookieExpiry!);
    document.cookie = `${this.config.cookieName}=${id}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  }

  private getCookie(): string | null {
    const match = document.cookie.match(new RegExp(`${this.config.cookieName}=([^;]+)`));
    return match ? match[1] : null;
  }

  getLi2Id(): string | null {
    return this.li2Id;
  }

  async trackLead(data: LeadData): Promise<TrackResponse> {
    if (!this.li2Id) {
      return { success: false, error: 'No li2_id found' };
    }

    try {
      const response = await fetch(`${this.config.apiEndpoint}/api/v1/track/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          click_id: this.li2Id,
          event_name: data.eventName || 'lead',
          email: data.email,
          phone: data.phone,
          name: data.name,
          external_id: data.externalId,
          metadata: data.metadata,
        }),
      });

      const result = await response.json();
      return response.ok
        ? { success: true, customerId: result.customer_id }
        : { success: false, error: result.message };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

export default Li2Analytics;
```

### 2.3 Usage Example
```html
<script src="https://cdn.li2.ai/analytics.min.js"></script>
<script>
  const li2 = new Li2Analytics({ debug: true });

  form.onsubmit = async () => {
    await li2.trackLead({
      email: emailInput.value,
      phone: phoneInput.value,
      name: nameInput.value
    });
  };
</script>
```

---

## 3. API Routes

### 3.1 Files to Create

| File | Purpose |
|------|---------|
| `src/core/types/conversion.type.ts` | TypeScript types |
| `src/core/repositories/conversion.repository.ts` | Data access |
| `src/core/services/conversion.service.ts` | Service layer |
| `src/app/api/organizations/[org_id]/conversions/route.ts` | Conversions API |
| `src/app/api/organizations/[org_id]/customers/route.ts` | Customers API |

### 3.2 Types
```typescript
// src/core/types/conversion.type.ts
import { Tables } from '@/shared/types/database.types'

export type ConversionEvent = Tables<'conversion_events'>
export type CustomerProfile = Tables<'customer_profiles'>

export type ConversionEventWithDetails = ConversionEvent & {
  touch_points?: Pick<Tables<'touch_points'>, 'id' | 'name' | 'short_url'>
  customer_profiles?: Pick<CustomerProfile, 'id' | 'email' | 'name'>
}
```

### 3.3 Repository
```typescript
// src/core/repositories/conversion.repository.ts
export class ConversionRepository extends BaseRepository<'conversion_events'> {
  async findAllByOrganization(orgId: string, options?: { limit?: number; offset?: number }) {
    const { data, error, count } = await this.query()
      .select(`*, touch_points(id, name, short_url), customer_profiles(id, email, name)`, { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(options?.limit || 50)
      .returns<ConversionEventWithDetails[]>()

    if (error) throw error
    return { data, count }
  }
}
```

---

## 4. Dashboard UI

### 4.1 Feature Structure
```
src/features/conversions/
├── components/
│   ├── ConversionEventsList.tsx
│   └── CustomerProfilesList.tsx
├── hooks/
│   ├── useConversions.ts
│   └── useCustomerProfiles.ts
└── index.ts
```

### 4.2 Touch-Point Form Update
Add "Enable Conversion Tracking" toggle to touch-point create/edit form:
- File: `src/features/touch-points/components/forms/`
- Updates `conversion_tracking: { enabled: true }` in touch_points table

---

## Implementation Checklist

- [ ] Create migration file
- [ ] Run migration & generate types
- [ ] Create SDK package structure
- [ ] Implement Li2Analytics class
- [ ] Build SDK (UMD + ESM)
- [ ] Create conversion types
- [ ] Create conversion repository
- [ ] Create conversion service
- [ ] Create API routes
- [ ] Create ConversionEventsList component
- [ ] Create CustomerProfilesList component
- [ ] Add conversion tracking toggle to touch-point form
