# Stripe Setup Guide

This guide walks you through setting up Stripe for ReadyLayer billing. The code is already implemented and ready; you just need to configure Stripe products and add the secrets to your environment.

---

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Access to your Supabase project (for storing secrets)
- Access to your GitHub repository (for storing secrets in GitHub Actions/secrets)

---

## Step 1: Create Stripe Products

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Products** → **Add Product**

### Create Growth Tier Product

- **Name:** ReadyLayer Growth
- **Description:** Growth tier - $99/month
- **Pricing Model:** Recurring
- **Price:** $99.00 USD
- **Billing Period:** Monthly
- **Metadata:**
  - `plan`: `growth`
  - `tier`: `growth`

**Copy the Price ID** (starts with `price_`) — you'll need this for `STRIPE_PRICE_ID_GROWTH`

### Create Scale Tier Product

- **Name:** ReadyLayer Scale
- **Description:** Scale tier - $499/month
- **Pricing Model:** Recurring
- **Price:** $499.00 USD
- **Billing Period:** Monthly
- **Metadata:**
  - `plan`: `scale`
  - `tier`: `scale`

**Copy the Price ID** (starts with `price_`) — you'll need this for `STRIPE_PRICE_ID_SCALE`

---

## Step 2: Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **API Keys**
2. Copy your **Secret Key** (starts with `sk_test_` for test mode or `sk_live_` for production)
   - Use test mode for development
   - Use live mode for production

---

## Step 3: Set Up Webhook Endpoint

1. Go to **Developers** → **Webhooks** → **Add Endpoint**
2. **Endpoint URL:** `https://your-domain.com/api/webhooks/stripe`
   - Replace `your-domain.com` with your actual domain
   - For local testing: Use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks
3. **Events to send:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
4. Click **Add Endpoint**
5. **Copy the Signing Secret** (starts with `whsec_`) — you'll need this for `STRIPE_WEBHOOK_SECRET`

---

## Step 4: Add Secrets to Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **API** → **Environment Variables** (or use Supabase Secrets)
3. Add the following secrets:

```
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRICE_ID_GROWTH=price_your_growth_price_id_here
STRIPE_PRICE_ID_SCALE=price_your_scale_price_id_here
```

**Note:** Replace the placeholder values with your actual Stripe keys and price IDs.

---

## Step 5: Add Secrets to GitHub Repository

If you're using GitHub Actions or need to store secrets in GitHub:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID_GROWTH`
   - `STRIPE_PRICE_ID_SCALE`

---

## Step 6: Verify Configuration

### Test Webhook Locally (Optional)

If you want to test webhooks locally before deploying:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will give you a webhook signing secret for local testing.

### Test Checkout Flow

1. Start your ReadyLayer server
2. Make a POST request to `/api/v1/billing/checkout`:
   ```json
   {
     "organizationId": "your-org-id",
     "plan": "growth"
   }
   ```
3. You should receive a checkout session URL
4. Complete the checkout in Stripe test mode
5. Verify the webhook is received and subscription is created

---

## Step 7: Production Checklist

Before going live:

- [ ] Switch to **live mode** in Stripe Dashboard
- [ ] Update `STRIPE_SECRET_KEY` to live key (`sk_live_...`)
- [ ] Create production webhook endpoint
- [ ] Update `STRIPE_WEBHOOK_SECRET` to production webhook secret
- [ ] Verify webhook endpoint is accessible (HTTPS required)
- [ ] Test checkout flow in production mode
- [ ] Monitor webhook delivery in Stripe Dashboard

---

## Troubleshooting

### Webhook Not Received

1. Check webhook endpoint URL is correct
2. Verify webhook secret matches Stripe dashboard
3. Check server logs for errors
4. Verify webhook endpoint is accessible (not behind firewall)

### Checkout Fails

1. Verify `STRIPE_SECRET_KEY` is set correctly
2. Verify `STRIPE_PRICE_ID_GROWTH` and `STRIPE_PRICE_ID_SCALE` are set
3. Check Stripe Dashboard → **Logs** for API errors
4. Verify customer creation succeeds

### Subscription Not Created

1. Check webhook logs in Stripe Dashboard
2. Verify webhook handler is processing events
3. Check database for subscription records
4. Review server logs for errors

---

## Security Notes

- **Never commit Stripe keys to git**
- Use environment variables or secrets management
- Rotate keys if exposed
- Use test mode for development
- Use live mode only in production

---

## Support

If you encounter issues:
1. Check Stripe Dashboard → **Logs** for API errors
2. Review ReadyLayer server logs
3. Verify environment variables are set correctly
4. Test webhook delivery in Stripe Dashboard

For Stripe-specific issues, see [Stripe Documentation](https://stripe.com/docs).
