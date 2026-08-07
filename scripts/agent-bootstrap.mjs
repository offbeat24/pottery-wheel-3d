import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function fail(stage, message) {
  console.error(`\n[setup:agent] FAILED ${stage}`)
  console.error(message)
  console.error('성공한 설치 결과는 그대로 재사용할 수 있습니다. 원인을 해결한 뒤 다시 `작업시작`을 입력하세요.')
  process.exit(1)
}

function run(stage, command, args, options = {}) {
  console.log(`\n[setup:agent] ${stage}`)
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: process.env,
  })
  if (result.error) fail(stage, result.error.message)
  if (result.status !== 0) {
    if (options.capture) {
      if (result.stdout) console.error(result.stdout.trim())
      if (result.stderr) console.error(result.stderr.trim())
    }
    fail(stage, `${command} ${args.join(' ')} exited with status ${result.status}`)
  }
  return options.capture ? result.stdout.trim() : ''
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function parseNodeVersion() {
  const [major, minor, patch] = process.versions.node.split('.').map(Number)
  return { major, minor, patch }
}

function nodeIsSupported() {
  const { major, minor, patch } = parseNodeVersion()
  return major > 20 || (major === 20 && (minor > 19 || (minor === 19 && patch >= 0)))
}

if (!nodeIsSupported()) {
  fail('node-version', `Node >=20.19.0 is required; current version is ${process.versions.node}.`)
}

let lock
try {
  lock = JSON.parse(readFileSync(resolve(root, 'harness.lock.json'), 'utf8'))
} catch (error) {
  fail('harness-lock', `harness.lock.json을 읽을 수 없습니다: ${error.message}`)
}

if (lock.schemaVersion !== 1 || lock.package?.name !== 'bass-platform') {
  fail('harness-lock', '지원하지 않는 harness lock 형식입니다.')
}
if (lock.package.version !== '0.2.1' || lock.source.commit !== '043a31e') {
  fail('harness-lock', '검토된 BASS package version 또는 source commit과 일치하지 않습니다.')
}
if (JSON.stringify(lock.profiles) !== JSON.stringify(['common', 'web'])) {
  fail('harness-lock', '활성 profile은 common,web이어야 합니다.')
}

let tarball
try {
  tarball = readFileSync(resolve(root, lock.package.file))
} catch (error) {
  fail('package-checksum', `${lock.package.file}을 읽을 수 없습니다: ${error.message}`)
}
const actualChecksum = sha256(tarball)
if (actualChecksum !== lock.package.sha256) {
  fail('package-checksum', `BASS tarball SHA-256 불일치\nexpected: ${lock.package.sha256}\nactual:   ${actualChecksum}`)
}

const fingerprintFiles = ['harness.lock.json', 'bass.yaml', 'AGENTS.md', 'CLAUDE.md']
const fingerprintHash = createHash('sha256')
for (const file of fingerprintFiles) {
  fingerprintHash.update(file)
  fingerprintHash.update('\0')
  fingerprintHash.update(readFileSync(resolve(root, file)))
  fingerprintHash.update('\0')
}
const fingerprint = fingerprintHash.digest('hex')
const packageJsonChecksum = sha256(readFileSync(resolve(root, 'package.json')))
const packageLockChecksum = sha256(readFileSync(resolve(root, 'package-lock.json')))
const bootstrapRuntimeHash = createHash('sha256')
for (const file of ['scripts/agent-bootstrap.mjs', 'playwright.config.ts', 'e2e/quality.spec.ts']) {
  bootstrapRuntimeHash.update(file)
  bootstrapRuntimeHash.update('\0')
  bootstrapRuntimeHash.update(readFileSync(resolve(root, file)))
  bootstrapRuntimeHash.update('\0')
}
const bootstrapRuntimeChecksum = bootstrapRuntimeHash.digest('hex')
const setupKey = sha256(Buffer.from(JSON.stringify({
  fingerprint,
  packageJsonChecksum,
  packageLockChecksum,
  bootstrapRuntimeChecksum,
  node: process.versions.node,
  platform: process.platform,
  arch: process.arch,
})))
const stateDirectory = resolve(root, '.agent-cache')
const stateFile = resolve(stateDirectory, 'bootstrap-state.json')

const branch = run('git-branch', 'git', ['branch', '--show-current'], { capture: true }) || '(detached)'
const beforeStatus = run('git-status-before', 'git', ['status', '--porcelain=v1'], { capture: true })

let previousState = null
try {
  previousState = JSON.parse(readFileSync(stateFile, 'utf8'))
} catch {
  // A missing or invalid local cache means a full first-time setup.
}
const executableSuffix = process.platform === 'win32' ? '.cmd' : ''
const localInstallPresent = existsSync(resolve(root, 'node_modules', '.bin', `bass${executableSuffix}`))
  && existsSync(resolve(root, 'node_modules', '.bin', `playwright${executableSuffix}`))

if (previousState?.setupKey === setupKey && previousState?.verification === 'passed' && localInstallPresent) {
  console.log('\n[setup:agent] SETUP_REUSED')
  console.log(`branch: ${branch}`)
  console.log(`preexisting_changes: ${beforeStatus ? 'yes' : 'no'}`)
  console.log(`bass_source: ${lock.source.branch}@${lock.source.commit}`)
  console.log(`active_profiles: ${lock.profiles.join(',')}`)
  console.log(`contract_fingerprint: ${fingerprint}`)
  console.log(`verified_at: ${previousState.verifiedAt}`)
  console.log('initial setup is already complete; continue with the natural-language task')
  process.exit(0)
}

run('dependencies', npm, ['ci'])
run('playwright-chromium', npx, ['--no-install', 'playwright', 'install', 'chromium'])
run('bass-doctor', npm, ['run', 'check:agents'])
run('bass-config', npm, ['run', 'bass', '--', 'config', 'explain'])
run('bass-agent-guide', npm, ['run', 'bass', '--', 'agent', 'guide', '--json'])
run('full-verification', npm, ['run', 'verify'])

const afterStatus = run('git-status-after', 'git', ['status', '--porcelain=v1'], { capture: true })
if (afterStatus !== beforeStatus) {
  fail('tracked-worktree-integrity', `bootstrap 전후 Git 상태가 달라졌습니다.\n--- before ---\n${beforeStatus || '(clean)'}\n--- after ---\n${afterStatus || '(clean)'}`)
}

mkdirSync(stateDirectory, { recursive: true })
writeFileSync(stateFile, `${JSON.stringify({
  schemaVersion: 1,
  setupKey,
  fingerprint,
  packageJsonChecksum,
  packageLockChecksum,
  bootstrapRuntimeChecksum,
  node: process.versions.node,
  platform: process.platform,
  arch: process.arch,
  verification: 'passed',
  verifiedAt: new Date().toISOString(),
}, null, 2)}\n`)

console.log('\n[setup:agent] SETUP_READY')
console.log(`branch: ${branch}`)
console.log(`preexisting_changes: ${beforeStatus ? 'yes' : 'no'}`)
console.log(`bass_source: ${lock.source.branch}@${lock.source.commit}`)
console.log(`bass_package_sha256: ${actualChecksum}`)
console.log(`active_profiles: ${lock.profiles.join(',')}`)
console.log(`contract_fingerprint: ${fingerprint}`)
console.log('verification: doctor + typecheck + unit + browser + build passed')
