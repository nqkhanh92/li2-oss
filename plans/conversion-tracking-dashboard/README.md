# Conversion Tracking Dashboard - Frontend Implementation Plan

## Overview
Add frontend UI for the conversion tracking feature:
1. **Touch Point Settings** - Toggle to enable/disable conversion tracking per touch point
2. **Dashboard Page** - View conversion events and customer profiles

## Scope (POC)

| Feature | POC | Future |
|---------|-----|--------|
| Touch Point Toggle | Enable/disable conversion tracking | Advanced settings |
| Conversion Events List | Basic table with filters | Charts, export |
| Customer Profiles List | Basic table | Detail view, merge |
| Stats Cards | Total leads, customers | Time-series charts |

---

## Part 1: Touch Point Settings Toggle

### Files to Create/Modify

#### 1.1 Schema (Modify)
**File:** `src/shared/schemas/touch-points/tracking.schema.ts`
```typescript
// Add to existing file
export const conversionTrackingSchema = z.object({
  enabled: strictBoolean.default(false),
})
```

#### 1.2 Form Component (Create)
**File:** `src/features/touch-points/components/forms/tracking/conversion-tracking-form.tsx`

```typescript
// Simple toggle form following link-cloaking-form.tsx pattern
- FormField with Switch component
- Label: "Enable Conversion Tracking"
- Description: "Add li2_id parameter to redirect URL for lead attribution"
- Submit handler: { conversion_tracking: { enabled: boolean } }
```

#### 1.3 Section Component (Create)
**File:** `src/features/touch-points/components/touch-point-detail-advanced/conversion-tracking-section.tsx`

```typescript
// Follow link-cloaking-section.tsx pattern
- useShowTouchPoint() for data
- useUpdateTouchPointForm() for mutations
- Extract defaultValues from touchPoint?.conversion_tracking
- Pass to ConversionTrackingForm
```

#### 1.4 Menu Configuration (Modify)
**File:** `src/features/touch-points/components/touch-point-detail-advanced/menu.tsx`

Add to `tracking_n_analytics` section:
```typescript
{
  key: 'conversion_tracking',
  planKey: ADVANCED_FEATURE_KEYS.CONVERSION_TRACKING,
  Icon: TrendingUp, // or similar
  label: 'advancedOptionMenu.items.conversion_tracking.title',
  Component: ConversionTrackingSection,
  description: 'advancedOptionMenu.items.conversion_tracking.description',
}
```

#### 1.5 Translations (Modify)
**File:** `public/locales/en/touchpoint.json`
```json
{
  "advancedOptionMenu": {
    "items": {
      "conversion_tracking": {
        "title": "Conversion Tracking",
        "description": "Track leads and conversions from this touch point"
      }
    }
  }
}
```

---

## Part 2: Conversions Dashboard Page

### File Structure
```
src/
├── app/(protected)/org/[org_id]/conversions/
│   └── page.tsx
├── features/conversions/
│   ├── components/
│   │   ├── conversions-view.tsx (main view)
│   │   ├── conversions-list.tsx (events table)
│   │   ├── customer-profiles-list.tsx (customers table)
│   │   ├── conversion-stats.tsx (stats cards)
│   │   └── columns/
│   │       ├── conversion-columns.tsx
│   │       └── customer-columns.tsx
│   ├── hooks/
│   │   ├── queries.ts
│   │   └── mutations.ts (if needed)
│   └── types.ts
├── core/
│   ├── services/conversion.service.ts
│   └── repositories/conversion.repository.ts
└── app/api/organizations/[org_id]/
    ├── conversions/
    │   ├── route.ts (GET list)
    │   └── stats/route.ts (GET stats)
    └── customers/
        └── route.ts (GET list)
```

### 2.1 Page Component
**File:** `src/app/(protected)/org/[org_id]/conversions/page.tsx`
```typescript
export default function ConversionsPage() {
  return (
    <ContentLayout title="Conversions" isBackable={false}>
      <ConversionsView />
    </ContentLayout>
  )
}
```

### 2.2 Main View Component
**File:** `src/features/conversions/components/conversions-view.tsx`
```typescript
// Layout:
// - Stats cards row (ConversionStats)
// - Tabs: "Events" | "Customers"
//   - Events tab: ConversionsList
//   - Customers tab: CustomerProfilesList
```

### 2.3 Stats Cards
**File:** `src/features/conversions/components/conversion-stats.tsx`
```typescript
// Display:
// - Total Leads (count)
// - Total Customers (count)
// - Conversion Rate (optional)
// Follow dashboard-performance-overview.tsx pattern
```

### 2.4 Conversions List (Events)
**File:** `src/features/conversions/components/conversions-list.tsx`
```typescript
// Table columns:
// - Event Name
// - Customer (email/name)
// - Touch Point (link)
// - Created At
// - Click ID (truncated)

// Features:
// - Pagination
// - Search (email, name)
// - Date range filter
// - Sorting
```

### 2.5 Customer Profiles List
**File:** `src/features/conversions/components/customer-profiles-list.tsx`
```typescript
// Table columns:
// - Name
// - Email
// - Phone
// - Lead Count
// - First Touch Point
// - Created At

// Features:
// - Pagination
// - Search (email, name)
// - Sorting
```

---

## Part 3: API Endpoints

### 3.1 GET /organizations/[org_id]/conversions
**File:** `src/app/api/organizations/[org_id]/conversions/route.ts`
```typescript
// Query params: pagination, search, sorting, date_from, date_to
// Response: PaginationResponse<ConversionEvent>
// Joins: customer_profiles, touch_points
```

### 3.2 GET /organizations/[org_id]/conversions/stats
**File:** `src/app/api/organizations/[org_id]/conversions/stats/route.ts`
```typescript
// Response: { totalLeads: number, totalCustomers: number }
```

### 3.3 GET /organizations/[org_id]/customers
**File:** `src/app/api/organizations/[org_id]/customers/route.ts`
```typescript
// Query params: pagination, search, sorting
// Response: PaginationResponse<CustomerProfile>
```

---

## Part 4: Data Types

### 4.1 TypeScript Types
**File:** `src/features/conversions/types.ts`
```typescript
export interface ConversionEvent {
  id: string
  created_at: string
  organization_id: string
  touch_point_id: string | null
  click_id: string
  event_type: 'lead' | 'sale'
  event_name: string
  customer_profile_id: string | null
  metadata: Record<string, unknown> | null
  // Joined fields
  customer?: CustomerProfile
  touch_point?: { id: string; name: string }
}

export interface CustomerProfile {
  id: string
  created_at: string
  organization_id: string
  email: string | null
  phone: string | null
  name: string | null
  external_id: string | null
  first_click_id: string | null
  first_touch_point_id: string | null
  lead_count: number
  sale_count: number
  total_revenue: number
}

export interface ConversionStats {
  totalLeads: number
  totalCustomers: number
}
```

---

## Part 5: React Query Hooks

**File:** `src/features/conversions/hooks/queries.ts`
```typescript
export const useGetConversions = (org_id: string, params: SearchFilterPagination)
export const useGetConversionStats = (org_id: string)
export const useGetCustomerProfiles = (org_id: string, params: SearchFilterPagination)
```

---

## Part 6: Navigation

### Add to Sidebar (if needed)
**File:** `src/shared/components/layout/sidebar/menu-list.ts`
```typescript
// Add "Conversions" menu item under Analytics or as new section
// Icon: TrendingUp or similar
// Route: /org/[org_id]/conversions
// Requires: ADVANCED_FEATURE_KEYS.CONVERSION_TRACKING
```

---

## Implementation Order

### Phase 1: Touch Point Toggle
1. [ ] Add schema to `tracking.schema.ts`
2. [ ] Create form component `conversion-tracking-form.tsx`
3. [ ] Create section component `conversion-tracking-section.tsx`
4. [ ] Add menu item to `menu.tsx`
5. [ ] Add translations to `touchpoint.json`

### Phase 2: Core Services & API
6. [ ] Create types `src/features/conversions/types.ts`
7. [ ] Create repository `src/core/repositories/conversion.repository.ts`
8. [ ] Create service `src/core/services/conversion.service.ts`
9. [ ] Create API: GET `/conversions`
10. [ ] Create API: GET `/conversions/stats`
11. [ ] Create API: GET `/customers`

### Phase 3: Dashboard UI
12. [ ] Create page `src/app/(protected)/org/[org_id]/conversions/page.tsx`
13. [ ] Create React Query hooks
14. [ ] Create stats cards component
15. [ ] Create conversions list component
16. [ ] Create customer profiles list component
17. [ ] Add sidebar navigation link

---

## Dependencies

- Database migration: ✅ Complete (`20251231150852_create_conversion_tracking.sql`)
- Plan permission: ✅ Complete (`CONVERSION_TRACKING` in plan-permission.ts)
- Backend API: ✅ Complete (`POST /api/v1/track/lead`)
- SDK: ✅ Complete (`@li2/analytics`)

---

## Patterns Reference

| Pattern | Reference File |
|---------|----------------|
| Toggle Form | `forms/privacy-security/link-cloaking-form.tsx` |
| Section Component | `touch-point-detail-advanced/link-cloaking-section.tsx` |
| Menu Item | `touch-point-detail-advanced/menu.tsx` |
| Stats Cards | `dashboard/components/sections/dashboard-performance-overview.tsx` |
| Data Table | `campaigns/components/campaign-list.tsx` |
| Query Hook | `campaigns/hooks/queries.ts` |
| API Route | `app/api/organizations/[org_id]/campaigns/route.ts` |
