# Vinh Khanh Food Tour — Operations Runbook

> **Last updated:** 2026-04-05  
> **System:** ASP.NET 10 API on AWS ECS Fargate + CloudFront SPA + MAUI mobile app

---

## 1. Architecture Overview

```
Internet → CloudFront → S3 (admin-frontend, vendor-frontend)
         → ALB (HTTPS 443) → ECS Fargate → VinhKhanh.API (.NET 10)
                                          → RDS MySQL 8.0 (private subnet)
                                          → S3 vinhkhanh-assets (audio/zip)
Mobile App (iOS / Android) → ALB API endpoint
```

---

## 2. Redeploy Backend (Rolling Update)

```bash
# 1. Authenticate ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin \
  <ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com

# 2. Build from repo root (Dockerfile at root, build context = root)
docker build -f Dockerfile -t vinhkhanh-api .

# 3. Tag & push
docker tag vinhkhanh-api:latest \
  <ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/vinhkhanh-api:latest
docker push \
  <ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/vinhkhanh-api:latest

# 4. Force new ECS deployment (rolling update, no downtime)
aws ecs update-service \
  --cluster vinhkhanh-cluster \
  --service vinhkhanh-api \
  --force-new-deployment \
  --region ap-southeast-1
```

**Verify:** Watch ECS events in AWS Console → Clusters → vinhkhanh-cluster → Services → Events tab

---

## 3. Rollback Backend

```bash
# List recent task definition revisions
aws ecs list-task-definitions \
  --family-prefix vinhkhanh-api \
  --sort DESC \
  --region ap-southeast-1

# Roll back to the previous revision (e.g., :5 → :4)
aws ecs update-service \
  --cluster vinhkhanh-cluster \
  --service vinhkhanh-api \
  --task-definition vinhkhanh-api:<PREVIOUS_REVISION> \
  --region ap-southeast-1
```

---

## 4. Redeploy Admin Frontend

```bash
cd admin-frontend
npm ci
npm run build

# Sync immutable assets (hashed filenames)
aws s3 sync ./dist s3://vinhkhanh-frontend \
  --delete \
  --cache-control "max-age=31536000,immutable" \
  --exclude "index.html"

# Reset cache for index.html
aws s3 cp ./dist/index.html s3://vinhkhanh-frontend/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

# Invalidate CloudFront for index.html
aws cloudfront create-invalidation \
  --distribution-id <CF_DISTRIBUTION_ID> \
  --paths "/index.html" \
  --region us-east-1
```

---

## 5. Database — Connect via RDS Proxy / Bastion

```bash
# Option A: SSM Session Manager (no SSH key required if bastion has SSM role)
aws ssm start-session --target <BASTION_INSTANCE_ID> --region ap-southeast-1

# On bastion:
mysql -h <RDS_CLUSTER_ENDPOINT> -u admin -p vinhkhanh

# Option B: RDS Query Editor (AWS Console > RDS > Query Editor)
# Select the cluster, use Secrets Manager secret for credentials
```

---

## 6. View Application Logs

```bash
# Stream API logs in real time
aws logs tail /ecs/vinhkhanh-api \
  --follow \
  --format short \
  --region ap-southeast-1

# Filter for errors only
aws logs filter-log-events \
  --log-group-name /ecs/vinhkhanh-api \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000) \
  --region ap-southeast-1
```

---

## 7. Secrets Management

| Secret Name | Description |
|---|---|
| `/vinhkhanh/prod/db-password` | RDS MySQL password for `admin` user |
| `/vinhkhanh/prod/jwt-key` | JWT signing key (min 32 bytes) |
| `/vinhkhanh/prod/azure-tts-key` | Azure Cognitive Services TTS key |
| `/vinhkhanh/prod/google-maps-key` | Google Maps API key (admin frontend) |

```bash
# Rotate a secret
aws secretsmanager put-secret-value \
  --secret-id /vinhkhanh/prod/jwt-key \
  --secret-string "NEW_SECRET_VALUE" \
  --region ap-southeast-1

# After rotating secrets, force new ECS deployment to pick up new values:
aws ecs update-service \
  --cluster vinhkhanh-cluster --service vinhkhanh-api \
  --force-new-deployment --region ap-southeast-1
```

---

## 8. Mobile App Release Process

### Android (Google Play)

```bash
cd mobile/VinhKhanh.Mobile

# Set signing env vars (also stored in GitHub Actions secrets)
export ANDROID_KEYSTORE=true
export ANDROID_KEYSTORE_PATH="/path/to/vinhkhanh.keystore"
export ANDROID_KEY_ALIAS="vinhkhanh"
export ANDROID_KEY_PASS="$KEYSTORE_KEY_PASSWORD"
export ANDROID_STORE_PASS="$KEYSTORE_STORE_PASSWORD"

# Build signed AAB
& "C:\app\dotnet\dotnet.exe" publish \
  -f net10.0-android \
  -c Release \
  /p:ApplicationDisplayVersion=1.1 \
  /p:ApplicationVersion=2

# Output: bin/Release/net10.0-android/publish/com.vinhkhanh.foodtour.aab
# Upload to Google Play Console → Testing → Internal testing → first
```

### iOS (App Store)

```bash
# Requires Mac + Xcode + Apple Developer account
dotnet publish -f net10.0-ios -c Release \
  /p:RuntimeIdentifier=ios-arm64 \
  /p:CodesignKey="Apple Distribution: ..." \
  /p:CodesignEntitlements=Platforms/iOS/Entitlements.plist

# Upload .ipa via Transporter or Xcode Organizer to TestFlight first
```

---

## 9. CloudWatch Alarms

| Alarm | Threshold | Action |
|---|---|---|
| ECS CPU | > 80% for 5 min | Email via SNS |
| ECS Memory | > 80% for 5 min | Email via SNS |
| ALB 5xx rate | > 10 errors/min | Email via SNS |
| RDS storage | > 80% used | Email via SNS |
| RDS CPU | > 80% for 5 min | Email via SNS |

```bash
# View current alarm state
aws cloudwatch describe-alarms \
  --alarm-name-prefix vinhkhanh \
  --region ap-southeast-1
```

---

## 10. Incident Response Checklist

1. **Check ALB 5xx rate** → CloudWatch Metrics → ApplicationELB → HTTPCode_Target_5XX_Count  
2. **Check ECS task health** → ECS Console → Service → Tasks tab → stopped task reason  
3. **Check application logs** → `aws logs tail /ecs/vinhkhanh-api --follow`  
4. **Check RDS connectivity** → can bastion reach RDS on port 3306?  
5. **If code bug** → rollback ECS to previous task revision (see Section 3)  
6. **If secret rotated but not deployed** → force new ECS deployment (Section 2, step 4)  
7. **If S3 outage** → audio/zip downloads will fail gracefully; mobile uses offline cache
