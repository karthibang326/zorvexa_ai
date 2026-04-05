# Auth0 application checklist (Zorvexa)

Use this so login, sign-up, and API tokens work in **local dev** and **production** without the generic **“Oops!, something went wrong”** page.

## 1. Application type

- **Applications → Applications → [Your SPA]**
- **Application Type:** Single Page Application  
- **Token Endpoint Authentication Method:** None  

## 2. URLs (exact match)

Auth0 compares strings exactly. Use the **same** scheme (`http` vs `https`), host, and port your browser shows. **Do not** add a trailing slash unless you also use one in the app (this repo uses `window.location.origin`, which has **no** trailing slash).

### Local development — `http://localhost:5173`

Add **each** of these (comma-separated lists as needed):

| Field | Example value |
|--------|----------------|
| **Allowed Callback URLs** | `http://localhost:5173` |
| **Allowed Logout URLs** | `http://localhost:5173` |
| **Allowed Web Origins** | `http://localhost:5173` |

If you use **`127.0.0.1`** or another port, add those as **separate** entries (e.g. `http://127.0.0.1:5173`).

### Production — `https://zorvexa-ai.com`

Add the same three fields for **each** public origin users hit (scheme + host + port, exact match), for example:

`https://zorvexa-ai.com`, `https://www.zorvexa-ai.com`, and `https://app.zorvexa-ai.com` if you use a subdomain.

(No trailing slash, unless you intentionally standardize on it everywhere.)

### Optional: override redirect in builds

If you must force a fixed callback (unusual), set **`VITE_AUTH0_REDIRECT_URI`** in the frontend `.env` to that exact URL and add it to the three Auth0 lists above.

## 3. API audience (access tokens for the backend)

If the frontend sets **`VITE_AUTH0_AUDIENCE`** (e.g. `https://zorvexa-api`):

1. **Auth0 → APIs → Create API** (or pick existing) with that **Identifier**.
2. **Applications → [Your SPA] → APIs** — **Authorize** that API for this application.

If the API is not authorized, Universal Login often fails with a **generic** error.  
**Escape hatch:** set `VITE_AUTH0_SKIP_AUDIENCE_ON_LOGIN=true` and keep requesting the access token in the app with `getAccessTokenSilently({ authorizationParams: { audience } })` after sign-in.

Match the backend:

- **`AUTH_AUDIENCE`** (e.g. `https://zorvexa-api`) when using `AUTH_PROVIDER=auth0`.

## 4. Database + social

- **Authentication → Database → [Username-Password]** — enable your SPA under **Applications**; allow sign-ups if you use email/password sign-up.
- **Authentication → Social → Google** — configure if you use “Continue with Google”.

## 5. Debugging

1. On the Auth0 error page, open **See details for this error**.
2. **Monitoring → Logs** — full server-side reason.
3. Temporarily disable **Actions** on Login / Pre-user registration if they fail.

## 6. Backend CORS

Set **`CORS_ORIGINS`** in `backend/.env` to include every browser origin that calls the API, e.g.:

`http://localhost:5173,https://zorvexa-ai.com,https://www.zorvexa-ai.com`

(Comma-separated, no spaces required.)
