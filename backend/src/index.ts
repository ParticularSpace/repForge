import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { healthRoutes } from './routes/health'
import { userRoutes } from './routes/users'
import { workoutRoutes } from './routes/workouts'
import { profileRoutes } from './routes/profile'
import { achievementRoutes } from './routes/achievements'
import { exerciseRoutes } from './routes/exercises'
import { templateRoutes } from './routes/templates'
import { stripeWebhookRoutes, subscriptionRoutes } from './routes/stripe'
import { adminRoutes } from './routes/admin'

const app = Fastify({ logger: true })

async function main() {
  const envOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
  // Always allow localhost in development; production origins come from FRONTEND_URL
  const allowedOrigins = [...new Set([...envOrigins, 'http://localhost:5173'])]

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error('Not allowed by CORS'), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // Global rate limiting — Stripe webhook is excluded via allowList
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: (req) => req.url.startsWith('/api/webhooks/'),
    errorResponseBuilder: () => ({
      statusCode: 429,
      message: 'Too many requests. Please slow down.',
    }),
  })

  // Override JSON content-type parser to preserve raw body for Stripe webhook verification.
  // This runs for all JSON requests; rawBody is only consumed by the webhook route.
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
    ;(req as any).rawBody = body as Buffer
    try {
      done(null, JSON.parse((body as Buffer).toString()))
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  app.register(healthRoutes, { prefix: '/api' })
  app.register(userRoutes, { prefix: '/api/v1' })
  app.register(workoutRoutes, { prefix: '/api/v1' })
  app.register(profileRoutes, { prefix: '/api/v1' })
  app.register(achievementRoutes, { prefix: '/api/v1' })
  app.register(exerciseRoutes, { prefix: '/api/v1' })
  app.register(templateRoutes, { prefix: '/api/v1' })
  // Stripe webhook lives at /api/webhooks/stripe (no auth, raw body)
  app.register(stripeWebhookRoutes, { prefix: '/api' })
  // Subscription management routes at /api/v1/subscriptions/*
  app.register(subscriptionRoutes, { prefix: '/api/v1' })
  // Admin routes at /api/v1/admin/*
  app.register(adminRoutes, { prefix: '/api/v1/admin' })

  const port = Number(process.env.PORT ?? 3000)
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Server running on http://localhost:${port}`)
}

main().catch(err => { console.error(err); process.exit(1) })
