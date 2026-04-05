## API Gateway WebSocket (Production)

Use API Gateway WebSocket in front of AstraOps SSE/streaming endpoints for globally distributed clients.

### Recommended Setup

- Route selection expression: `$request.body.action`
- Routes:
  - `$connect`
  - `$disconnect`
  - `stream.subscribe`
  - `stream.unsubscribe`
- Integrations:
  - Lambda proxy to publish to Kafka/MSK or EventBridge
  - Backend service endpoint (ECS/EKS) for stream auth + tenant scope

### Security

- JWT authorizer (Auth0/Clerk token)
- Tenant claims required:
  - `orgId`
  - `projectId`
  - `envId`
- Apply WAF + rate limits per connection and per message.

### Data Flow

1. UI opens socket with bearer token
2. Gateway authorizer validates token
3. Subscription stored with tenant scope
4. Kafka events fan out only to scoped subscribers
5. AI decisions/actions stream back to clients

