# Google Authenticator (TOTP) with Auth0

The React app uses **Auth0 Universal Login**. Google Authenticator and similar apps (Microsoft Authenticator, Authy, etc.) work through Auth0’s **one-time password (OTP / TOTP)** factor. You turn it on in the **Auth0 tenant**, not in application code.

## 1. Enable OTP (authenticator apps)

1. Open [Auth0 Dashboard](https://manage.auth0.com/) → your tenant.
2. Go to **Security** → **Multifactor Auth** (or **Authentication** → **Multifactor** in newer UIs).
3. Enable **One-time password (OTP)** / **Authenticator** (wording varies).
4. For a **global** product that should rely on app-based codes only, **disable** factors you do not want (e.g. SMS/voice) so users are not offered weaker options.

## 2. When users see the MFA step

- **Enrollment:** Auth0 can prompt new users to enroll an authenticator after first successful login (policy-dependent).
- **Sign-in:** After username/password or social login, Auth0 shows the OTP challenge before returning to your app.

No change to `redirect_uri` is required for MFA; the hosted login page handles it.

## 3. Require MFA for everyone (optional)

Use an **Action** on the **Login** flow so every session must complete MFA (when not remembered on device).

1. **Actions** → **Library** → **Build Custom** → **Login / Post Login** (or **Post-Login** in the Login flow).
2. Add this logic (adjust `allowRememberBrowser` to match your security needs):

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const provider = event.connection?.strategy;
  // Skip bots/service accounts if you add a namespaced claim or flag later.
  api.multifactor.enable("any", { allowRememberBrowser: true });
};
```

3. **Deploy** the Action and attach it to the **Login** flow **after** primary authentication, per Auth0’s flow editor.

With only **OTP** enabled in step 1, **“any”** effectively means authenticator-app TOTP (Google Authenticator–compatible).

## 4. Application checklist

- **Application type:** SPA, same as today.
- **Allowed Callback / Logout / Web Origins:** Must match each environment (e.g. `http://localhost:5185`, production `https://app.yourdomain.com`).

## 5. Optional: Sign in with Google **and** MFA

**Sign in with Google** is a separate setting: **Authentication** → **Social** → **Google**. Users can use Google as the first factor; Auth0 still runs **OTP** as the second factor if your policy requires MFA.

---

If MFA is enabled but users never see a prompt, confirm the Action is deployed, the Login flow order is correct, and the user is not bypassing MFA via a remembered device (try another browser or clear Auth0 session).
