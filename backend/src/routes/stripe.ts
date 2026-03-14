import { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { authenticate } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { isPro } from '../lib/userPlan'

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

// ─── Webhook — registered under /api (no auth, raw body required) ─────────────

export async function stripeWebhookRoutes(fastify: FastifyInstance) {
  fastify.post('/webhooks/stripe', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string
    const rawBody = request.rawBody

    if (!sig || !rawBody) {
      return reply.status(400).send({ error: 'Missing stripe-signature header or body' })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
      return reply.status(400).send({ error: `Webhook error: ${(err as Error).message}` })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const clientRefId = session.client_reference_id

        const user = clientRefId
          ? await prisma.user.findUnique({ where: { id: clientRefId } })
          : await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: 'pro',
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })

        if (user) {
          let status = user.subscriptionStatus
          if (subscription.status === 'active') status = 'pro'
          else if (subscription.status === 'past_due') status = 'past_due'

          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: status,
              subscriptionEndsAt: new Date((subscription as any).current_period_end * 1000),
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: 'cancelled',
              subscriptionEndsAt: new Date(),
            },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { subscriptionStatus: 'past_due' },
          })
        }
        break
      }
    }

    return reply.status(200).send({ received: true })
  })
}

// ─── Subscription routes — registered under /api/v1 ─────────────────────────

export async function subscriptionRoutes(fastify: FastifyInstance) {
  // POST /subscriptions/checkout — create Stripe Checkout session
  fastify.post('/subscriptions/checkout', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request as any).user.id
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, email: true },
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      client_reference_id: userId,
      customer: userRecord?.stripeCustomerId ?? undefined,
      customer_email: !userRecord?.stripeCustomerId ? (userRecord?.email ?? undefined) : undefined,
      success_url: `${process.env.FRONTEND_URL}/upgrade/success`,
      cancel_url: `${process.env.FRONTEND_URL}/upgrade/cancelled`,
      metadata: { userId },
    })

    return { checkoutUrl: session.url }
  })

  // POST /subscriptions/portal — create Stripe Customer Portal session
  fastify.post('/subscriptions/portal', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request as any).user.id
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    if (!userRecord?.stripeCustomerId) {
      return reply.status(400).send({ error: 'No billing account found' })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userRecord.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/profile`,
    })

    return { portalUrl: portalSession.url }
  })

  // GET /subscriptions/status — current user's subscription status
  fastify.get('/subscriptions/status', { preHandler: [authenticate] }, async (request) => {
    const userId = (request as any).user.id
    const userEmail = (request as any).user.email ?? ''
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        proGrantedByAdmin: true,
        subscriptionEndsAt: true,
      },
    })

    const userForPlan = {
      subscriptionStatus: userRecord?.subscriptionStatus ?? 'free',
      proGrantedByAdmin: userRecord?.proGrantedByAdmin ?? false,
      email: userEmail,
    }

    return {
      status: userForPlan.subscriptionStatus,
      isPro: isPro(userForPlan),
      grantedByAdmin: userForPlan.proGrantedByAdmin,
      endsAt: userRecord?.subscriptionEndsAt?.toISOString() ?? null,
      limits: {
        aiGenerationsPerWeek: isPro(userForPlan) ? -1 : 3,
        savedTemplates: isPro(userForPlan) ? -1 : 3,
      },
    }
  })
}
