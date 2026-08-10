import { expect, test } from '@playwright/test'

// 물그릇에서 스펀지를 적셔 점토에 직접 바르는 흐름. 좌표를 짐작하지 않고,
// 물그릇이 실제로 그 자리에 보이는지(커서가 pointer로 바뀌는지)까지 함께 고정한다.
const BOWL_X_RATIO = 0.707
const BOWL_Y_RATIO = 0.718

// WebGL 렌더와 실제 드래그를 여러 번 거치므로 기본 30초로는 병렬 실행에서 모자란다.
test.slow()

test('물그릇과 스펀지로 물을 직접 바른다', async ({ page }, testInfo) => {
  const browserErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`))

  await page.goto('/')
  const game = page.getByTestId('game-root')
  const canvas = page.locator('#scene-host canvas')
  await page.getByTestId('start-action').click()
  const box = (await canvas.boundingBox())!
  const clay = { x: box.x + box.width / 2, y: box.y + box.height * 0.52 }
  const bowl = { x: box.x + box.width * BOWL_X_RATIO, y: box.y + box.height * BOWL_Y_RATIO }
  const cursor = () => canvas.evaluate((element) => getComputedStyle(element).cursor)
  const moisture = async () => Number(await game.getAttribute('data-moisture'))
  const sponge = async () => Number(await game.getAttribute('data-sponge'))

  await expect(game).toHaveAttribute('data-sponge', '0')
  const startMoisture = await moisture()
  expect(startMoisture).toBeGreaterThan(70)

  // 마른 스펀지는 아무리 문질러도 수분을 올리지 않는다.
  await page.mouse.move(clay.x, clay.y)
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
  expect(await moisture()).toBeLessThanOrEqual(startMoisture)
  await expect(game).toHaveAttribute('data-sponge', '0')

  // 물그릇은 화면에 보이고 클릭할 수 있는 물건으로 알려준다.
  await page.mouse.move(bowl.x, bowl.y)
  await expect.poll(cursor).toBe('pointer')
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.12)
  await expect.poll(cursor).not.toBe('pointer')

  // 물그릇을 클릭하면 스펀지가 가득 젖는다.
  await page.mouse.click(bowl.x, bowl.y)
  await expect(game).toHaveAttribute('data-sponge', '100')
  await expect(page.locator('#mode-name')).toHaveText('물 바를 준비')

  // 점토를 좌드래그하면 수분이 연속으로 오르고 스펀지 물이 줄어든다.
  const beforeRub = await moisture()
  await page.mouse.move(clay.x, clay.y)
  await page.mouse.down()
  await expect(page.locator('#mode-name')).toHaveText('물 바르는 중')
  await expect.poll(moisture).toBeGreaterThan(beforeRub)
  await expect.poll(sponge).toBeLessThan(100)
  await expect.poll(moisture, { timeout: 8_000 }).toBe(100)
  await page.mouse.up()
  const spongeAfterRub = await sponge()
  expect(spongeAfterRub).toBeGreaterThan(0)
  expect(spongeAfterRub).toBeLessThan(100)

  await testInfo.attach('water-bowl-1440x900', { body: await page.screenshot(), contentType: 'image/png' })

  // 남은 물이 줄어든 스펀지는 물그릇에서 다시 적실 수 있다.
  await page.mouse.click(bowl.x, bowl.y)
  await expect(game).toHaveAttribute('data-sponge', '100')

  // 스펀지를 든 동안에는 같은 좌드래그가 흙을 밀지 않는다. 성형과 물 바르기가 섞이면 안 된다.
  await page.keyboard.down('Space')
  await expect.poll(async () => page.locator('#mode-name').textContent()).toBe('물 바를 준비')
  const widthWhileHolding = await page.locator('#width-value').textContent()
  await page.mouse.move(clay.x, clay.y)
  await page.mouse.down()
  await page.waitForTimeout(500)
  await page.mouse.up()
  await page.keyboard.up('Space')
  expect(await page.locator('#width-value').textContent()).toBe(widthWhileHolding)

  // 우클릭으로 내려놓으면 성형 입력으로 돌아온다.
  await page.mouse.move(clay.x, clay.y)
  await page.mouse.down({ button: 'right' })
  await page.mouse.up({ button: 'right' })
  await expect(game).toHaveAttribute('data-sponge', '0')
  await expect(page.locator('#mode-name')).toHaveText('시점 조절')

  // 스펀지를 내려놓은 뒤에는 같은 좌드래그가 다시 성형으로 쓰인다.
  await page.keyboard.down('Space')
  await expect.poll(async () => page.locator('#mode-name').textContent()).not.toBe('시점 조절')
  const widthBefore = await page.locator('#width-value').textContent()
  await page.mouse.move(clay.x, clay.y)
  await page.mouse.down()
  await page.waitForTimeout(600)
  await page.mouse.up()
  await page.keyboard.up('Space')
  await expect.poll(async () => page.locator('#width-value').textContent()).not.toBe(widthBefore)

  // 재시작하면 수분과 스펀지가 초기값으로 돌아온다.
  await page.mouse.click(bowl.x, bowl.y)
  await expect(game).toHaveAttribute('data-sponge', '100')
  await page.getByTestId('restart-action').click()
  await page.getByTestId('restart-action').click()
  await expect(game).toHaveAttribute('data-sponge', '0')
  await expect.poll(moisture).toBe(startMoisture)

  expect(browserErrors).toEqual([])
})
