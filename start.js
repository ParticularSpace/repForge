#!/usr/bin/env node

const { concurrently } = require('concurrently')
const path = require('path')

const teal  = '\x1b[36m'
const green = '\x1b[32m'
const white = '\x1b[97m'
const dim   = '\x1b[2m'
const reset = '\x1b[0m'
const bold  = '\x1b[1m'

console.clear()
console.log()
console.log(`${teal}${bold}  ██████╗ ███████╗██████╗ ████████╗██████╗  █████╗  ██████╗██╗  ██╗${reset}`)
console.log(`${teal}${bold}  ██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝${reset}`)
console.log(`${teal}${bold}  ██████╔╝█████╗  ██████╔╝   ██║   ██████╔╝███████║██║     █████╔╝ ${reset}`)
console.log(`${teal}${bold}  ██╔══██╗██╔══╝  ██╔═══╝    ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ${reset}`)
console.log(`${teal}${bold}  ██║  ██║███████╗██║        ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗${reset}`)
console.log(`${teal}${bold}  ╚═╝  ╚═╝╚══════╝╚═╝        ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝${reset}`)
console.log()
console.log(`${white}${bold}  AI-powered workout tracker${reset}`)
console.log()
console.log(`${dim}  ─────────────────────────────────────────────────${reset}`)
console.log(`${green}  ✓ Frontend  ${reset}${white}→  http://localhost:5173${reset}`)
console.log(`${green}  ✓ Backend   ${reset}${white}→  http://localhost:3000${reset}`)
console.log(`${dim}  ─────────────────────────────────────────────────${reset}`)
console.log()
console.log(`${dim}  Starting servers... (Ctrl+C to stop)${reset}`)
console.log()

const root = path.resolve(__dirname)

const { result } = concurrently(
  [
    {
      command: 'npm run dev',
      name: 'API',
      cwd: path.join(root, 'backend'),
      prefixColor: 'cyan',
    },
    {
      command: 'npm run dev',
      name: 'WEB',
      cwd: path.join(root, 'frontend'),
      prefixColor: 'magenta',
    },
  ],
  {
    prefix: '[{name}]',
    killOthersOn: { condition: 'failure' },
    restartTries: 0,
  }
)

result.then(
  () => console.log(`\n${teal}  All servers stopped.${reset}\n`),
  () => {}
)

process.on('SIGINT', () => {
  console.log(`\n\n${teal}  RepFlow stopped. See you at the gym! 💪${reset}\n`)
})
