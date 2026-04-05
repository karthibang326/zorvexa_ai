apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${appName}.fullname" . }}
  labels:
    app.kubernetes.io/name: {{ include "${appName}.name" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ include "${appName}.name" . }}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: {{ include "${appName}.name" . }}
    spec:
      containers:
        - name: ${appName}
          image: "{{ .Values.image.repository }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: 3000

