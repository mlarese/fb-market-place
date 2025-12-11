#!/bin/bash
# Quofind Marketplace - Deploy Script
# Usage: ./scripts/deploy.sh [dev|staging|prod]

set -e

ENV=${1:-dev}
STACK_NAME="quofind-marketplace-$ENV"
REGION=${AWS_REGION:-eu-south-1}

echo "=========================================="
echo "Quofind Marketplace - Deploy to $ENV"
echo "=========================================="

# Check prerequisites
command -v aws >/dev/null 2>&1 || { echo "AWS CLI required. Install: brew install awscli"; exit 1; }
command -v sam >/dev/null 2>&1 || { echo "SAM CLI required. Install: brew install aws-sam-cli"; exit 1; }

# Check credentials
if [ -z "$FACEBOOK_APP_ID" ] || [ -z "$FACEBOOK_APP_SECRET" ] || [ -z "$FACEBOOK_PAGE_TOKEN" ] || [ -z "$OPENAI_API_KEY" ]; then
    echo ""
    echo "Missing credentials. Set environment variables:"
    echo "  export FACEBOOK_APP_ID='your-app-id'"
    echo "  export FACEBOOK_APP_SECRET='your-secret'"
    echo "  export FACEBOOK_PAGE_TOKEN='your-token'"
    echo "  export OPENAI_API_KEY='sk-your-key'"
    echo ""
    echo "Or create .env.deploy file and run: source .env.deploy"
    exit 1
fi

echo "Region: $REGION"
echo "Stack: $STACK_NAME"
echo ""

# Build
echo "[1/3] Building..."
sam build --parallel

# Validate
echo "[2/3] Validating template..."
sam validate --lint

# Deploy
echo "[3/3] Deploying to $ENV..."

if [ "$ENV" == "prod" ]; then
    # Prod: with confirmation
    sam deploy \
        --stack-name $STACK_NAME \
        --region $REGION \
        --capabilities CAPABILITY_IAM \
        --confirm-changeset \
        --parameter-overrides \
            Environment=$ENV \
            FacebookAppId=$FACEBOOK_APP_ID \
            FacebookAppSecret=$FACEBOOK_APP_SECRET \
            FacebookPageToken=$FACEBOOK_PAGE_TOKEN \
            OpenAIApiKey=$OPENAI_API_KEY
else
    # Dev/Staging: no confirmation
    sam deploy \
        --stack-name $STACK_NAME \
        --region $REGION \
        --capabilities CAPABILITY_IAM \
        --no-confirm-changeset \
        --parameter-overrides \
            Environment=$ENV \
            FacebookAppId=$FACEBOOK_APP_ID \
            FacebookAppSecret=$FACEBOOK_APP_SECRET \
            FacebookPageToken=$FACEBOOK_PAGE_TOKEN \
            OpenAIApiKey=$OPENAI_API_KEY
fi

# Get outputs
echo ""
echo "=========================================="
echo "Deploy Complete!"
echo "=========================================="
echo ""

aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

echo ""
echo "Next steps:"
echo "1. Configure Facebook Webhook with the WebhookUrl above"
echo "2. Test: curl \$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==\`ApiEndpoint\`].OutputValue' --output text)/listings"
