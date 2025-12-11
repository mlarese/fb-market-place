# Quofind Marketplace - Guida al Deploy AWS

## Indice

1. [Prerequisiti](#prerequisiti)
2. [Stima Costi](#stima-costi)
3. [Deploy via CLI (Raccomandato)](#deploy-via-cli)
4. [Deploy via Console Web](#deploy-via-console-web)
5. [Configurazione Post-Deploy](#configurazione-post-deploy)
6. [Ottimizzazioni Free Tier](#ottimizzazioni-free-tier)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisiti

### Software Richiesto

```bash
# AWS CLI v2
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# SAM CLI
brew install aws-sam-cli

# Node.js 18+
brew install node@18

# Verifica installazioni
aws --version      # aws-cli/2.x.x
sam --version      # SAM CLI, version 1.x.x
node --version     # v18.x.x o superiore
```

### Configurazione AWS

```bash
# Configura credenziali AWS
aws configure
# AWS Access Key ID: [YOUR_ACCESS_KEY]
# AWS Secret Access Key: [YOUR_SECRET_KEY]
# Default region name: eu-south-1
# Default output format: json

# Verifica configurazione
aws sts get-caller-identity
```

### Credenziali Necessarie

Prima del deploy, raccogli queste credenziali:

| Credenziale | Dove Ottenerla |
|-------------|----------------|
| `FACEBOOK_APP_ID` | [Facebook Developers](https://developers.facebook.com/) → App → Settings → Basic |
| `FACEBOOK_APP_SECRET` | [Facebook Developers](https://developers.facebook.com/) → App → Settings → Basic |
| `FACEBOOK_PAGE_TOKEN` | Graph API Explorer → Generate Page Access Token |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) |

---

## Stima Costi

### Free Tier (Primi 12 mesi + Always Free)

| Servizio | Free Tier | Dopo Free Tier |
|----------|-----------|----------------|
| Lambda | 1M req/mese + 400K GB-sec | $0.20/1M req |
| API Gateway | 1M chiamate/mese | $3.50/1M req |
| DynamoDB | 25GB + 25 WCU/RCU | $1.25/1M WCU |
| OpenSearch | **NON INCLUSO** | ~$50/mese (t3.small x2) |
| Secrets Manager | **NON INCLUSO** | $0.40/secret/mese |
| CloudWatch | 5GB logs | $0.50/GB |
| S3 | 5GB (12 mesi) | $0.023/GB |

### Costo Stimato Mensile

| Ambiente | Traffico | Costo/Mese |
|----------|----------|------------|
| **Dev** (minimal) | 1K req/giorno | **~$55** |
| **Staging** | 10K req/giorno | **~$70** |
| **Prod** | 100K req/giorno | **~$150** |

> **Nota**: OpenSearch (~$50) e Secrets Manager (~$2) sono i costi fissi principali.

---

## Deploy via CLI

### 1. Clona e Prepara

```bash
# Clona repository
git clone https://github.com/mlarese/fb-market-place.git
cd fb-market-place

# Installa dipendenze
npm install
cd src && npm install && cd ..
```

### 2. Configura Parametri

Crea file `.env.deploy` (non committare!):

```bash
# .env.deploy
export FACEBOOK_APP_ID="your-app-id"
export FACEBOOK_APP_SECRET="your-app-secret"
export FACEBOOK_PAGE_TOKEN="your-page-token"
export OPENAI_API_KEY="sk-your-openai-key"
export AWS_REGION="eu-south-1"
export ENVIRONMENT="dev"
```

### 3. Build

```bash
# Carica variabili
source .env.deploy

# Build con SAM
sam build

# Output atteso:
# Building codebase...
# Build Succeeded
# Built Artifacts: .aws-sam/build
```

### 4. Deploy Dev (Prima Volta)

```bash
# Deploy guidato (prima volta)
sam deploy --guided \
  --stack-name quofind-marketplace-dev \
  --region eu-south-1 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    Environment=dev \
    FacebookAppId=$FACEBOOK_APP_ID \
    FacebookAppSecret=$FACEBOOK_APP_SECRET \
    FacebookPageToken=$FACEBOOK_PAGE_TOKEN \
    OpenAIApiKey=$OPENAI_API_KEY

# Rispondi alle domande:
# Confirm changes before deploy? [Y/n]: Y
# Allow SAM CLI IAM role creation? [Y/n]: Y
# Save arguments to configuration file? [Y/n]: Y
```

### 5. Deploy Successivi

```bash
# Dev (senza conferma)
npm run deploy:dev

# Oppure manualmente
sam deploy --config-env dev \
  --parameter-overrides \
    Environment=dev \
    FacebookAppId=$FACEBOOK_APP_ID \
    FacebookAppSecret=$FACEBOOK_APP_SECRET \
    FacebookPageToken=$FACEBOOK_PAGE_TOKEN \
    OpenAIApiKey=$OPENAI_API_KEY
```

### 6. Deploy Produzione

```bash
# Build ottimizzato
sam build --use-container --parallel

# Deploy prod (con conferma)
sam deploy --config-env prod \
  --parameter-overrides \
    Environment=prod \
    FacebookAppId=$FACEBOOK_APP_ID \
    FacebookAppSecret=$FACEBOOK_APP_SECRET \
    FacebookPageToken=$FACEBOOK_PAGE_TOKEN \
    OpenAIApiKey=$OPENAI_API_KEY
```

### 7. Verifica Deploy

```bash
# Ottieni output dello stack
aws cloudformation describe-stacks \
  --stack-name quofind-marketplace-dev \
  --query 'Stacks[0].Outputs' \
  --output table

# Output attesi:
# - ApiEndpoint: https://xxxxx.execute-api.eu-south-1.amazonaws.com/dev
# - WebhookUrl: https://xxxxx.execute-api.eu-south-1.amazonaws.com/dev/webhook
# - OpenSearchEndpoint: xxxxx.eu-south-1.es.amazonaws.com

# Test endpoint
curl https://xxxxx.execute-api.eu-south-1.amazonaws.com/dev/listings
```

---

## Deploy via Console Web

### Step 1: Crea S3 Bucket per Artifacts

1. Vai su [S3 Console](https://s3.console.aws.amazon.com/)
2. **Create bucket**
   - Name: `quofind-deployment-artifacts`
   - Region: `eu-south-1`
   - Block all public access: **Yes**
3. Click **Create bucket**

### Step 2: Upload Package

```bash
# Prepara package locale
sam build
sam package \
  --output-template-file packaged.yaml \
  --s3-bucket quofind-deployment-artifacts \
  --s3-prefix quofind-marketplace
```

### Step 3: Deploy CloudFormation Stack

1. Vai su [CloudFormation Console](https://console.aws.amazon.com/cloudformation/)
2. **Create stack** → **With new resources**
3. **Specify template**:
   - Upload template: `packaged.yaml` (generato sopra)
4. **Stack name**: `quofind-marketplace-dev`
5. **Parameters**:

| Parameter | Value |
|-----------|-------|
| Environment | `dev` |
| FacebookAppId | `[your-app-id]` |
| FacebookAppSecret | `[your-secret]` |
| FacebookPageToken | `[your-token]` |
| OpenAIApiKey | `[sk-your-key]` |
| N8nWebhookUrl | (lascia vuoto) |

6. **Configure stack options**:
   - Tags: `Project=Quofind`, `Environment=dev`
7. **Review**:
   - Check: "I acknowledge that AWS CloudFormation might create IAM resources"
8. **Create stack**

> **Tempo stimato**: 15-20 minuti (OpenSearch impiega più tempo)

### Step 4: Verifica Risorse Create

1. **DynamoDB**: [DynamoDB Console](https://console.aws.amazon.com/dynamodb/) → Tables
   - Verifica 9 tabelle create: `MarketplaceListings-dev`, `MarketplaceRequests-dev`, etc.

2. **Lambda**: [Lambda Console](https://console.aws.amazon.com/lambda/) → Functions
   - Verifica 12 funzioni: `quofind-listings-dev`, `quofind-payments-dev`, etc.

3. **API Gateway**: [API Gateway Console](https://console.aws.amazon.com/apigateway/)
   - Verifica API: `QuofindMarketplaceAPI-dev`
   - Copia l'Invoke URL

4. **OpenSearch**: [OpenSearch Console](https://console.aws.amazon.com/aos/)
   - Verifica domain: `quofind-dev`
   - Status: Active (verde)

5. **Secrets Manager**: [Secrets Console](https://console.aws.amazon.com/secretsmanager/)
   - Verifica secret: `quofind-marketplace-dev-secrets`

---

## Configurazione Post-Deploy

### 1. Configura Facebook Webhook

1. Vai su [Facebook Developers](https://developers.facebook.com/)
2. Seleziona la tua App → **Webhooks** → **Add Subscription**
3. Configura:
   - **Callback URL**: `https://xxxxx.execute-api.eu-south-1.amazonaws.com/dev/webhook`
   - **Verify Token**: `quofind_verify_2024`
   - **Subscription Fields**: `messages`, `feed`, `messaging_postbacks`
4. Click **Verify and Save**

### 2. Testa API Endpoints

```bash
API_URL="https://xxxxx.execute-api.eu-south-1.amazonaws.com/dev"

# Health check
curl $API_URL/listings

# Crea listing di test
curl -X POST $API_URL/listings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-1",
    "title": "Test Listing",
    "description": "Test description",
    "category": "elettronica",
    "price": 100
  }'

# Cerca listings
curl "$API_URL/listings?q=test&category=elettronica"
```

### 3. Configura n8n (Opzionale)

Se usi n8n per i workflow:

```bash
# Aggiorna parametro
aws ssm put-parameter \
  --name "/quofind/dev/n8n-webhook-url" \
  --value "https://your-n8n-instance.com/webhook/xxxx" \
  --type String
```

---

## Ottimizzazioni Free Tier

### 1. Rimuovi OpenSearch (Risparmio: ~$50/mese)

Se non serve full-text search, puoi usare DynamoDB scan + filter:

```bash
# Nel template.yaml, commenta/rimuovi:
# - OpenSearchDomain
# - Riferimenti a OPENSEARCH_ENDPOINT
# - Policy es:* nelle Lambda
```

### 2. Usa SSM Parameter Store invece di Secrets Manager

Risparmio: ~$2/mese (free tier SSM)

```yaml
# Invece di AWS::SecretsManager::Secret
QuofindSecrets:
  Type: AWS::SSM::Parameter
  Properties:
    Name: /quofind/secrets
    Type: SecureString
    Value: !Sub '{"FACEBOOK_APP_ID":"${FacebookAppId}",...}'
```

### 3. Riduci CloudWatch Logs Retention

```yaml
# Nel template.yaml, aggiungi a ogni LogGroup:
RetentionInDays: 7  # invece di 30
```

### 4. Disabilita PITR in Dev

```yaml
# Per tabelle DynamoDB in dev:
PointInTimeRecoverySpecification:
  PointInTimeRecoveryEnabled: false
```

### 5. Script Cleanup Risorse Dev

```bash
#!/bin/bash
# cleanup-dev.sh - Esegui a fine giornata per risparmiare

# Scala OpenSearch a zero (richiede cold storage)
aws opensearch update-domain-config \
  --domain-name quofind-dev \
  --cluster-config InstanceType=t3.small.search,InstanceCount=1

# Pulisci logs vecchi
aws logs delete-log-group --log-group-name /aws/lambda/quofind-listings-dev
```

---

## Troubleshooting

### Errore: "CREATE_FAILED - OpenSearch"

```
Resource handler returned message: "You do not have sufficient permissions"
```

**Soluzione**: L'account deve avere il service-linked role per OpenSearch:

```bash
aws iam create-service-linked-role --aws-service-name opensearchservice.amazonaws.com
```

### Errore: "Lambda timeout"

```
Task timed out after X seconds
```

**Soluzione**: Aumenta timeout nel template.yaml:

```yaml
Timeout: 60  # secondi
```

### Errore: "DynamoDB AccessDeniedException"

```
User is not authorized to perform: dynamodb:PutItem
```

**Soluzione**: Verifica che le policy Lambda includano la tabella corretta:

```yaml
Policies:
  - DynamoDBCrudPolicy:
      TableName: !Ref MarketplaceListingsTable
```

### Errore: "Facebook Webhook verification failed"

**Soluzione**:
1. Verifica che il verify token sia `quofind_verify_2024`
2. Controlla i log Lambda:

```bash
aws logs tail /aws/lambda/quofind-facebook-webhook-dev --follow
```

### Rollback Stack

```bash
# Se qualcosa va storto
aws cloudformation delete-stack --stack-name quofind-marketplace-dev

# Attendi eliminazione
aws cloudformation wait stack-delete-complete --stack-name quofind-marketplace-dev
```

---

## Comandi Utili

```bash
# Stato stack
aws cloudformation describe-stacks --stack-name quofind-marketplace-dev

# Lista Lambda functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `quofind`)].[FunctionName,Runtime,MemorySize]' --output table

# Logs in tempo reale
sam logs -n quofind-listings-dev --tail

# Costi attuali
aws ce get-cost-and-usage \
  --time-period Start=2025-12-01,End=2025-12-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter '{"Tags":{"Key":"Project","Values":["Quofind"]}}'

# Elimina stack completo
sam delete --stack-name quofind-marketplace-dev
```

---

## Risorse Aggiuntive

- [SAM CLI Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [AWS Free Tier](https://aws.amazon.com/free/)
