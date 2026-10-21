import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const venv = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend', 'venv')
const bin = path.join(venv, process.platform === 'win32' ? 'Scripts' : 'bin')
const [command, ...args] = process.argv.slice(2)

// backend/.env names the Docker hosts; run locally, the services are on localhost.
const env = {
  ...process.env,
  PATH: bin + path.delimiter + process.env.PATH,
  VIRTUAL_ENV: venv,
  NEO4J_URI: 'bolt://localhost:7687',
  RABBITMQ_URL: 'amqp://guest:guest@localhost:5672//',
  REDIS_URL: 'redis://localhost:6379/0',
  LLM_BASE_URL: 'http://localhost:1234/v1',
}

const child = spawn(path.join(bin, command), args, { env, stdio: 'inherit' })
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)))
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
