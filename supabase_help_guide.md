# Supabase Local Development Guide

To successfully run Edge Functions (like `create-checkout`) in your local development environment, you must ensure the Supabase backend is active.

## Quick Start

Follow these steps to start your local backend:

1.  **Ensure Docker is running**: Supabase local development depends on Docker.
2.  **Start Supabase**:
    ```bash
    npm run supabase:start
    ```
    *This starts the database, auth service, and storage.*
3.  **Serve Edge Functions**:
    In a **separate** terminal window, run:
    ```bash
    npm run supabase:functions
    ```
    *This hosts your functions at `http://localhost:54321/functions/v1/`.*

## Troubleshooting Connection Errors

If you see "Backend unreachable" in the UI:

- **Check Terminal**: Ensure the terminal running `supabase functions serve` is active and hasn't crashed.
- **Check Docker**: Ensure Docker Desktop (or your Docker engine) is running.
- **Check Secrets**: Local functions use the `.env` file in the root. If you've added new keys, restart the functions service.

## Deploying to Production

When you are ready to go live, deploy your functions to Supabase Cloud:

```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```
*Note: You must also set your environment variables (secrets) in the Supabase Dashboard.*

## Signup / verification email still says “Quantum-Ops-AI” or “Quantum Ops AI”

Changing the code in Git **does not** change what users receive until you update **Lovable** (sender name) and **hosted Supabase** (email HTML). The repo only contains templates for reference and for local `supabase start`.

Auth emails are sent by **Supabase Auth**; on Lovable they are often relayed from **`no-reply@md.lovable-app.email`**. The **From** display name (e.g. “Quantum-Ops-AI”) almost always comes from your **Lovable project name**, not from `index.html`.

### 1. Fix the sender name (Lovable) — required for “From: Zorvexa”

1. Open your app on [Lovable](https://lovable.dev).
2. Rename the project from **Quantum-Ops-AI** / **Quantum Ops AI** to **Zorvexa** (Project settings / title — exact UI may say “Rename” or edit the project name).
3. Publish / sync again if Lovable asks. **New** signup emails should show **Zorvexa** next to the address.

If the name does not change, check Lovable’s docs or support for **email sender / branding** (some workspaces have a separate field).

### 2. Fix the email body (Supabase Dashboard) — required for “Thanks for signing up for Zorvexa”

Use the Supabase project that matches your app’s **`VITE_SUPABASE_URL`** (same project ref in the URL).

1. [Supabase Dashboard](https://supabase.com/dashboard) → select that project → **Authentication** → **Emails** (or **Email templates**, depending on UI version).
2. Open **Confirm signup**.
3. Set **Subject** to: `Confirm your Zorvexa account` (or similar).
4. Replace the **message body** with the full contents of this repo file: **`supabase/templates/confirmation.html`**.  
   Do **not** remove Supabase variables: `{{ .ConfirmationURL }}`, `{{ .Email }}` (and any others the editor shows as required).
5. Click **Save**.
6. Optional: repeat for **Reset password** using **`supabase/templates/recovery.html`**.

After saving, trigger a **new** test signup (old queued emails won’t change).

### 3. Local development

If you use `supabase start`, templates are wired in `supabase/config.toml`. After editing `supabase/templates/`, run `supabase stop && supabase start` to pick up changes.

## Google Authenticator (TOTP) on every login

The app enforces **TOTP MFA** for Supabase email/password users when `VITE_REQUIRE_TOTP_MFA` is not set to `false` (see root `.env.example`).

1. **Supabase Dashboard** → **Authentication** → **Sign In / Providers** → enable **Multi-factor authentication (Phone or TOTP)** and ensure **TOTP** is allowed.
2. Users **without** a verified authenticator are sent to `/auth/mfa-setup` after sign-in to scan a QR code and confirm a 6-digit code.
3. On **every subsequent login**, after the password they are sent to `/auth/mfa-verify` to enter a TOTP code before the dashboard loads.
4. For local demos without MFA, set `VITE_REQUIRE_TOTP_MFA=false` in `.env` and restart Vite.

**Authenticator label (Google Authenticator shows a UUID):** Enrollment uses `issuer` + `friendlyName` from `src/shared/branding.ts` (`BRAND_TOTP_ISSUER`, `BRAND_TOTP_FRIENDLY_NAME`) so new QR codes show **Zorvexa** instead of the Supabase/Lovable project id. Entries you added **before** this change keep the old label until you remove that factor in the app (and re-enroll if needed).
