import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const backend = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend')
const venv = path.join(backend, 'venv')
const bin = path.join(venv, process.platform === 'win32' ? 'Scripts' : 'bin')
const [command, ...args] = process.argv.slice(2)

// backend/.env names the Docker hosts; run locally, the services are on localhost.
const DOCKER_HOSTS = new Set(['neo4j', 'rabbitmq', 'redis', 'host.docker.internal'])
const local = {}
for (const line of readFileSync(path.join(backend, '.env'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^(NEO4J_URI|RABBITMQ_URL|REDIS_URL|LLM_BASE_URL)=(.+)$/)
  if (!match) continue
  const url = new URL(match[2].trim())
  if (!DOCKER_HOSTS.has(url.hostname)) continue
  url.hostname = '127.0.0.1'
  local[match[1]] = url.href
}

const env = {
  ...process.env,
  PATH: bin + path.delimiter + process.env.PATH,
  VIRTUAL_ENV: venv,
  ...local,
}

const child = spawn(path.join(bin, command), args, { env, stdio: 'inherit' })
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)))
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
