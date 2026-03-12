import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { healthRoutes } from './routes/health'
import { userRoutes } from './routes/users'
import { workoutRoutes } from './routes/workouts'

const app = Fastify({ logger: true })

async function main() {
  await app.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true
  })
  app.register(healthRoutes, { prefix: '/api' })
  app.register(userRoutes, { prefix: '/api/v1' })
  app.register(workoutRoutes, { prefix: '/api/v1' })

  const port = Number(process.env.PORT ?? 3000)
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Server running on http://localhost:${port}`)
}

main().catch(err => { console.error(err); process.exit(1) })
