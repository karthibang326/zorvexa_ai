replicaCount: ${replicas}
image:
  repository: ${image}
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 80
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

