export const DASHBOARD_DATA = {
  systemHealth: [
    { label: "prod-us-east", status: "Healthy" as const, region: "US East (N. Virginia)", uptime: "99.99%" },
    { label: "prod-eu-west", status: "Healthy" as const, region: "EU West (Ireland)", uptime: "99.98%" },
    { label: "staging", status: "Degraded" as const, region: "EU West (Ireland)", uptime: "98.5%" },
  ],
  security: {
    overview: [
      { label: "Total Vulnerabilities", value: "24", sub: "8 Critical", icon: "ShieldAlert", color: "text-red-500", bg: "bg-red-500/10" },
      { label: "Active Threats", value: "3", sub: "Real-time", icon: "AlertTriangle", color: "text-orange-500", bg: "bg-orange-500/10" },
      { label: "Secrets Exposed", value: "12", sub: "3 Critical", icon: "Key", color: "text-yellow-500", bg: "bg-yellow-500/10" },
      { label: "Compliance Score", value: "94%", sub: "A- Grade", icon: "CheckCircle", color: "text-green-500", bg: "bg-green-500/10" },
    ],
    vulnerabilities: [
      { service: "api-gateway", type: "CVE-2024-1234", severity: "Critical", status: "Open", time: "12m ago" },
      { service: "auth-service", type: "Dependency", severity: "High", status: "Open", time: "1h ago" },
      { service: "payment-worker", type: "Container", severity: "Medium", status: "Fixed", time: "3h ago" },
      { service: "data-ingest", type: "CVE-2023-5678", severity: "Low", status: "Open", time: "5h ago" },
    ],
    secrets: [
      { name: "AWS_SECRET_KEY", file: "config/aws.yml", risk: "Critical" },
      { name: "STRIPE_API_TOKEN", file: ".env.production", risk: "High" },
      { name: "DB_PASSWORD", file: "docker-compose.yml", risk: "Medium" },
    ],
    threatFeed: [
      { type: "Suspicious Activity", message: "Multiple failed login attempts from IP 192.168.1.45", time: "2m ago", level: "warning" },
      { type: "IP Anomaly", message: "Traffic spike from unusual geographic location (RU)", time: "15m ago", level: "danger" },
      { type: "Unauthorized Access", message: "Attempted access to /admin/config by user-882", time: "45m ago", level: "critical" },
    ],
    compliance: [
      { name: "SOC2", status: "Passed", checks: "142/142" },
      { name: "GDPR", status: "Failed", checks: "88/94" },
      { name: "ISO 27001", status: "In Progress", checks: "110/120" },
    ],
  },
  cost: {
    overview: [
      { label: "Total Monthly Cost", value: "$3,142", trend: "+12%", icon: "DollarSign", color: "text-foreground" },
      { label: "Cost Today", value: "$104.20", trend: "+$4.50", icon: "RefreshCw", color: "text-foreground" },
      { label: "Projected Cost", value: "$3,850", trend: "Based on AI model", icon: "TrendingUp", color: "text-orange-500" },
      { label: "Cost Savings", value: "$655", trend: "Identified Potential", icon: "Target", color: "text-green-500" },
    ],
    chartData: [
      { name: 'Mon', cost: 420, baseline: 400 },
      { name: 'Tue', cost: 450, baseline: 400 },
      { name: 'Wed', cost: 680, baseline: 400 },
      { name: 'Thu', cost: 410, baseline: 400 },
      { name: 'Fri', cost: 390, baseline: 400 },
      { name: 'Sat', cost: 380, baseline: 400 },
      { name: 'Sun', cost: 370, baseline: 400 },
    ],
    serviceBreakdown: [
      { name: 'API Services', value: 1200, color: '#10b981' },
      { name: 'Databases', value: 850, color: '#3b82f6' },
      { name: 'Workers', value: 650, color: '#8b5cf6' },
      { name: 'CDN & Networking', value: 300, color: '#f59e0b' },
    ],
    providerBreakdown: [
      { name: 'AWS', value: 2100, color: '#f97316' },
      { name: 'GCP', value: 600, color: '#3b82f6' },
      { name: 'Azure', value: 300, color: '#0ea5e9' },
    ],
    waste: [
      { type: "Idle EC2 Instances", impact: "$420/mo", severity: "high" },
      { type: "Unused S3 Buckets", impact: "$85/mo", severity: "medium" },
      { type: "Over-provisioned RDS", impact: "$150/mo", severity: "low" },
    ],
    recommendations: [
      { text: "Reduce 30% cost by scaling down worker pool during off-peak hours.", icon: "Lightbulb", color: "text-primary" },
      { text: "Move data-ingest workload from us-east-1 to us-west-2 for 15% savings.", icon: "Globe", color: "text-blue-500" },
      { text: "Switch to Graviton instances for 20% better price/performance.", icon: "Zap", color: "text-yellow-500" },
    ],
  },
  monitoring: {
    metrics: [
      { label: "Uptime", value: "99.97%", trend: "+0.02%", icon: "Activity", color: "text-primary" },
      { label: "Deployments", value: "147", trend: "+12 today", icon: "Zap", color: "text-primary" },
      { label: "Incidents", value: "3", trend: "-67% MTD", icon: "AlertCircle", color: "text-orange-500" },
      { label: "AI Actions", value: "1.2K", trend: "this week", icon: "Sparkles", color: "text-primary" },
    ],
    recentActivity: [
      { dot: "bg-primary", title: "Deployment completed", sub: "api-gateway v3.2.1", time: "2m ago" },
      { dot: "bg-primary", title: "AI resolved incident", sub: "memory spike on worker-03", time: "14m ago" },
      { dot: "bg-orange-500", title: "Anomaly detected", sub: "latency p99 > 500ms", time: "28m ago" },
      { dot: "bg-purple-500", title: "Workflow triggered", sub: "auto-scale pipeline", time: "1h ago" },
    ],
  }
};
