# AstraOps Launch Mode Checklist

Production SaaS pillars and completion status.

## 1) Authentication + RBAC

- [x] JWT auth middleware on backend routes
- [x] RBAC roles include `owner`, `admin`, `viewer` (+ operator/auditor)
- [x] Issuer/audience checks for external IdP tokens
- [ ] Frontend hosted login/signup with Auth0 or Clerk UI

## 2) Multi-Tenant Architecture

- [x] Org / Project / Environment data models in Prisma
- [x] Tenant context middleware (`orgId`, `projectId`, `envId`)
- [x] Org hierarchy APIs (`/api/org/*`)
- [ ] Cluster entity persistence tied to org/project/env

## 3) Cloud Connect (AWS/GCP/Azure)

- [x] Connect API for AWS IAM Role / GCP SA / Azure client secret
- [x] Connection listing API scoped to tenant context
- [x] Cloud execution + metrics + optimization endpoints
- [ ] Encrypted credential vault persistence (Secrets Manager/KMS)

## 4) Billing (Stripe)

- [x] Checkout + webhook + usage tracking APIs
- [x] Plan endpoints (`free`, `pro`, `enterprise`)
- [x] Cluster reservation limit checks for monetization gating
- [ ] Frontend billing dashboard with upgrade/downgrade UX

## 5) Deployment

- [x] Frontend Vercel config present
- [x] Backend ECS task definition scaffold
- [x] Backend EKS deployment/service scaffold
- [x] API Gateway WebSocket production notes
- [ ] CI/CD wiring for environment promotion and secret injection

## Security + Observability

- [x] API rate limiting
- [x] JWT auth + tenant scope enforcement
- [x] AI action audit model/logging
- [x] Metrics endpoint (`/metrics`)
- [ ] mTLS service-to-service enforcement in deployment runtime

