# Stripe payment setup (Zorvexa pricing / Growth checkout)

The **Pricing** page calls your API: `POST /api/billing/create-checkout` with plan `growth`. The API needs Stripe credentials in **`backend/.env`** (not the frontend `.env`).

## 1. Stripe account and secret key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) (use **Test mode** while developing).
2. **Developers → API keys** → copy **Secret key** (`sk_test_…` or `sk_live_…`).
3. In `backend/.env`:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxx
```

Restart the backend after any change.

## 2. Create a recurring Price (required for Growth)

The Growth tier uses **`STRIPE_PRICE_GROWTH`**, which must be a **Price** id (`price_…`), not a Product id.

1. **Product catalog → Add product** (e.g. name: `Zorvexa Growth`).
2. **Add price** → **Recurring** → choose billing period (e.g. monthly) → set amount (e.g. `$199`).
3. Save and copy the **Price ID** (starts with `price_`).
4. In `backend/.env`:

```env
STRIPE_PRICE_GROWTH=price_xxxxxxxx
```

Optional: create more prices for Starter / Enterprise and set:

```env
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

## 3. Webhook (subscriptions / renewals)

1. **Developers → Webhooks → Add endpoint**.
2. URL: your public API base + `/api/billing/webhook`  
   Example: `https://api.yourdomain.com/api/billing/webhook`  
   Local: use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward:  
   `stripe listen --forward-to localhost:5002/api/billing/webhook`
3. Copy the **Signing secret** (`whsec_…`) into:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
```

## 4. Supabase sign-in + API

If users sign in with Supabase, the backend must accept their JWT:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
```

Use the **same** URL as `VITE_SUPABASE_URL` in the frontend (no trailing slash).

## 5. Restart the API after editing `.env`

`npm run dev:free` may start **only Vite** if port **5002** already has a healthy API. That process keeps the **old** environment until you stop it and start the backend again. Use `npm run dev:all` from the repo root, or restart `npm run dev` inside `backend/`.

## 6. Optional: dummy checkout (development only)

**Default is off** — users always go through **real Stripe Checkout** when keys and Price ids are set.

If you explicitly need a no-Stripe redirect (e.g. UI wiring tests), only in **development**:

```env
BILLING_DUMMY_CHECKOUT=true
```

Do **not** set this in production.

## Checklist

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_PRICE_GROWTH` | Growth plan Checkout line item |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook events |
| `SUPABASE_URL` | Supabase JWT for `/api/billing/*` |
| `BILLING_DUMMY_CHECKOUT` | Optional dev-only fake redirect (default `false`) |

After editing `backend/.env`, restart: `cd backend && npm run dev`.
