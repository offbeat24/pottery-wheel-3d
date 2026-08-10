// 대회 제출용 숏츠 영상 녹화. 1080×1920 세로로 실제 플레이를 녹화한 뒤 ffmpeg으로 mp4로 굽는다.
// 사용법: `npm run dev`를 띄운 상태에서 `node scripts/record-showcase.mjs`
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173/'
const OUT = process.env.OUT_DIR ?? 'showcase'
const RAW = join(OUT, 'raw')
const TARGET_SECONDS = Number(process.env.TARGET_SECONDS ?? 55)
const W = 1080
const H = 1920

// 물레 위 점토는 화면 가운데에 선다. 높이 비율 → 화면 y.
const CENTER_X = 540
const clayY = (normalizedHeight) => Math.round(1250 - normalizedHeight * 780)
// 시점 조작은 픽셀 단위 드래그로만 가능하다. 확인된 값이라 상수로 둔다.
// 좌드래그 -120px = yaw +0.72rad(가마 쪽), 우드래그 +200px = 시선을 가마로 밀기, 휠 +500 = 최대 거리.
const KILN_TURN = 120
const KILN_PAN = 200
const ZOOM_OUT = 500
// 선반 첫 칸은 얕게 돌리고(40px) 시선을 위로 올려야(우드래그 아래로 100px) 화면에 든다.
const SHELF_TURN = 40
const SHELF_ZOOM = 300
const SHELF_LIFT = 100

rmSync(OUT, { recursive: true, force: true })
mkdirSync(RAW, { recursive: true })

const browser = await chromium.launch({ headless: false })
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: RAW, size: { width: W, height: H } },
})

// 오늘 처음 문을 연 공방이 아니라, 이미 몇 점 팔아본 공방에서 시작한다.
await context.addInitScript(() => {
  localStorage.setItem('pottery-wheel-3d:earnings', '52000')
  localStorage.setItem('pottery-wheel-3d:owned', '[]')
  localStorage.removeItem('pottery-wheel-3d:gallery')
})

const page = await context.newPage()

// 자막은 페이지 안에 얹는다. 이 ffmpeg 빌드에는 drawtext가 없고, 브라우저가 한글을 훨씬 잘 그린다.
async function installCaption() {
  await page.evaluate(() => {
    const el = document.createElement('div')
    el.id = 'showcase-caption'
    el.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:210px', 'transform:translateX(-50%)',
      'max-width:86vw', 'padding:18px 34px', 'border-radius:999px',
      'background:rgba(38,22,15,0.62)', 'color:#fff6e6',
      'font:700 44px/1.3 Pretendard, -apple-system, sans-serif', 'letter-spacing:-0.5px',
      'text-align:center', 'white-space:nowrap', 'pointer-events:none', 'z-index:99',
      'opacity:0', 'transition:opacity 260ms ease',
    ].join(';')
    document.body.append(el)
  })
}
const caption = (text) =>
  page.evaluate((value) => {
    const el = document.querySelector('#showcase-caption')
    if (!el) return
    el.textContent = value
    el.style.opacity = value ? '1' : '0'
  }, text)

const shots = []
const shot = async (name) => {
  shots.push(name)
  await page.screenshot({ path: join(OUT, `beat-${String(shots.length).padStart(2, '0')}-${name}.png`) })
}
const wait = (ms) => page.waitForTimeout(ms)
const earnings = () => page.locator('#earnings-value').textContent()

/** 실제 손처럼 천천히 끌기. duration 동안 나눠 움직여야 성형이 누적된다. */
async function drag(from, to, { button = 'left', duration = 1000, steps = 24 } = {}) {
  // 시작점으로 한 번 움직여 둔다. 같은 좌표면 Playwright가 이벤트를 생략하므로 살짝 비껴 지나간다.
  await page.mouse.move(from.x + 2, from.y + 2)
  await page.mouse.move(from.x, from.y)
  const buttons = Array.isArray(button) ? button : [button]
  for (const b of buttons) await page.mouse.down({ button: b })
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)
    await wait(duration / steps)
  }
  for (const b of [...buttons].reverse()) await page.mouse.up({ button: b })
}

const turn = (pixels, duration) =>
  drag({ x: 640, y: 900 }, { x: 640 - pixels, y: 900 }, { button: 'left', duration, steps: 24 })
const pan = ({ x = 0, y = 0 }, duration) =>
  drag({ x: 640, y: 900 }, { x: 640 + x, y: 900 + y }, { button: 'right', duration, steps: 20 })
async function zoom(amount) {
  await page.mouse.move(CENTER_X, 1000)
  await page.mouse.wheel(0, amount)
  await wait(400)
}

/** 가마와 선반 작품은 커서가 pointer로 바뀌는 지점으로 찾는다. 좌표를 박으면 시점이 조금만 달라져도 깨진다. */
async function findHotspot(points) {
  for (const point of points) {
    await page.mouse.move(point.x, point.y)
    await wait(40)
    const cursor = await page.evaluate(
      () => getComputedStyle(document.querySelector('#scene-host canvas')).cursor,
    )
    if (cursor === 'pointer') return point
  }
  return null
}

const grid = (xs, ys) => ys.flatMap((y) => xs.map((x) => ({ x, y })))
const stopped = () =>
  page.waitForFunction(() => document.querySelector('#finish-button')?.disabled === false, null, { timeout: 15_000 })

await page.goto(BASE)
await page.waitForSelector('[data-testid="start-action"]')
await installCaption()
await caption('브라우저에서 두 손으로 빚는 3D 도예')
await wait(1900)
await shot('intro')

// 1. 첫 주문: 아침 찻잔
await page.getByTestId('start-action').click()
await wait(500)
await caption('Space를 밟으면 물레가 돌아간다')
await page.keyboard.down('Space')
await wait(2000)
await shot('spinning')

// 몸통 전체를 아래에서 위로 훑어 좁힌다.
await caption('좌클릭 · 바깥손으로 좁히기')
await drag({ x: CENTER_X, y: clayY(0.1) }, { x: CENTER_X, y: clayY(0.95) }, { button: 'left', duration: 3600, steps: 44 })
await shot('narrow')
// 배를 살짝 부풀린다.
await caption('우클릭 · 안쪽손으로 넓히기')
await drag({ x: CENTER_X, y: clayY(0.4) }, { x: CENTER_X, y: clayY(0.55) }, { button: 'right', duration: 1200, steps: 15 })
await shot('widen')
// 양쪽을 누른 채 키를 올렸다가, 주문 윤곽보다 커진 만큼 다시 내린다.
await caption('양쪽을 누른 채 위아래로 · 키 잡기')
await drag({ x: CENTER_X, y: clayY(0.6) }, { x: CENTER_X, y: clayY(0.6) - 70 }, { button: ['left', 'right'], duration: 1400, steps: 18 })
await shot('pull')
await drag({ x: CENTER_X, y: clayY(0.6) }, { x: CENTER_X, y: clayY(0.6) + 62 }, { button: ['left', 'right'], duration: 1200, steps: 16 })
// 물을 묻혀 표면을 다듬는다.
await caption('흙이 마르면 W로 물을 묻힌다')
await page.keyboard.down('KeyW')
await wait(1900)
await page.keyboard.up('KeyW')
await shot('water')

await caption('물레를 멈추면 완성할 수 있다')
await page.keyboard.up('Space')
await stopped()
await wait(400)
await shot('stopped')

await page.getByRole('button', { name: '완성하기' }).click()
const firedAt = Date.now()
await caption('주문 윤곽과 겹쳐 점수와 값이 정해진다')
await wait(4000)
await shot('result')
await page.locator('#next-button').click()
await wait(600)

// 2. 가마가 도는 동안 다음 주문을 빚는다 — 이게 이 게임의 리듬이다.
await caption('가마가 굽는 동안 다음 주문을 빚는다')
await page.keyboard.down('Space')
await wait(1600)
// 벽이 한계(주저앉음)에 닿지 않게 한 자리를 오래 밀지 않고 훑는다.
await drag({ x: CENTER_X, y: clayY(0.4) }, { x: CENTER_X, y: clayY(0.92) }, { button: 'right', duration: 1300, steps: 18 })
await drag({ x: CENTER_X, y: clayY(0.85) }, { x: CENTER_X, y: clayY(0.55) }, { button: 'right', duration: 900, steps: 12 })
await shot('bowl-flare')
// 키를 낮춰 낮고 넉넉한 사발로.
await drag({ x: CENTER_X, y: clayY(0.6) }, { x: CENTER_X, y: clayY(0.6) + 80 }, { button: ['left', 'right'], duration: 2000, steps: 24 })
await page.keyboard.down('KeyW')
await wait(1400)
await page.keyboard.up('KeyW')
await shot('bowl')
await page.keyboard.up('Space')
await stopped()

// 3. 가마 앞으로 시점을 돌리고 알맞은 때를 기다린다.
await caption('35초 · 이르면 설익고 늦으면 과하다')
await zoom(ZOOM_OUT)
await turn(KILN_TURN, 1500)
await pan({ x: KILN_PAN }, 1100)
await shot('kiln-view')
const kilnSpot = await findHotspot(grid([120, 220, 320, 440], [560, 700, 840, 960, 1080]))
if (!kilnSpot) throw new Error(`가마를 화면에서 찾지 못했습니다 · 가마 상태: ${await page.locator('#kiln-value').textContent()}`)
await page.waitForFunction(() => document.querySelector('#kiln-value')?.textContent === '지금 꺼내세요', null, {
  timeout: 60_000,
})
console.log(`가마 대기 ${((Date.now() - firedAt) / 1000).toFixed(1)}초`)
await caption('지금이다')
await page.mouse.click(kilnSpot.x, kilnSpot.y)
await caption('알맞게 구웠다 · 굽기 100%')
await wait(1600)
await shot('unloaded')

// 4. 선반으로 시점을 돌려 작품을 팔고, 번 돈으로 공방을 옮긴다.
// 선반 첫 칸은 가마보다 얕게 돌리고 시선을 올려야 잡힌다(프로브로 확인한 값).
await turn(SHELF_TURN - KILN_TURN, 1400)
await zoom(SHELF_ZOOM - ZOOM_OUT)
await pan({ x: 0, y: SHELF_LIFT }, 900)
await shot('shelf-view')
const before = await earnings()
// 선반 칸이 화면에 들어올 때까지 조금씩 더 돌려본다. 시점을 열린 값으로 계산해두면 한 번 밀릴 때 전체가 깨진다.
let pieceSpot = null
for (let attempt = 0; attempt < 4 && !pieceSpot; attempt += 1) {
  if (attempt > 0) await turn(-40, 600)
  pieceSpot = await findHotspot(grid([460, 520, 580, 640, 700, 760, 820, 880], [200, 260, 320, 380, 440, 500]))
}
if (!pieceSpot) throw new Error('선반 위 작품을 화면에서 찾지 못했습니다')
await shot('shelf-found')
await caption('선반의 작품은 클릭해서 판다')
await page.mouse.click(pieceSpot.x, pieceSpot.y)
await wait(1200)
await shot('price')
await page.mouse.click(pieceSpot.x, pieceSpot.y)
await wait(1300)
await shot('sold')
if ((await earnings()) === before) throw new Error(`작품이 팔리지 않았습니다 · 수익 ${before}`)

await caption('번 돈으로 공방을 갖춘다')
await page.locator('#shop-button').click()
await wait(1400)
await shot('shop')
await page.locator('[data-shop-id="wide-studio"]').click()
await wait(1100)
await page.locator('#shop-close').click()
await caption('볕이 드는 공방으로 옮겼다')
await wait(1000)
await shot('new-studio')

// 5. 마지막으로 새 공방을 천천히 보여준다. 거리는 상한이 있으니 넉넉히 밀어 최대까지 뺀다.
await zoom(900)
await pan({ x: -KILN_PAN, y: -SHELF_LIFT }, 900)
await caption('고요한 물레')
await drag({ x: 560, y: 900 }, { x: 700, y: 852 }, { button: 'left', duration: 2600, steps: 30 })
await wait(1400)
await shot('closing')

await page.close()
await context.close()
await browser.close()

// 녹화는 실시간이라 30~60초를 넘는다. 숏츠 길이에 맞춰 배속만 조절해 굽는다.
const rawFile = join(RAW, readdirSync(RAW).find((name) => name.endsWith('.webm')))
const out = join(OUT, 'pottery-wheel-shorts.mp4')
const duration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]))
const speed = Math.max(1, duration(rawFile) / TARGET_SECONDS)
execFileSync(
  'ffmpeg',
  ['-y', '-i', rawFile,
    '-filter:v', `setpts=PTS/${speed.toFixed(3)},scale=${W}:${H}:flags=lanczos,fps=30`,
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', out],
  { stdio: 'inherit' },
)
console.log(`\n${out} · ${duration(out).toFixed(1)}초 · ${W}×${H} · 원본 ${duration(rawFile).toFixed(1)}초에서 ${speed.toFixed(2)}배속`)
