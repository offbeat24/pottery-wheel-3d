import { expect, test } from '@playwright/test'

test('수분 상태별 물성과 붕괴·복구 경로가 실제 조작에 연결된다', async ({ page }) => {
  test.setTimeout(60_000)
  await page.clock.install()
  await page.goto('/')
  await page.getByTestId('start-action').click()

  const game = page.getByTestId('game-root')
  const canvas = page.getByTestId('game-surface').locator('canvas')
  const modePanel = page.locator('#mode-panel')
  const moistureTrack = page.locator('#moisture-track')
  const readHeight = async () => Number.parseFloat((await page.locator('#height-value').textContent()) ?? '0')
  const readMaxRadius = async () => Number(await game.getAttribute('data-max-radius'))
  const advanceFrames = async (count: number) => {
    for (let frame = 0; frame < count; frame += 1) await page.clock.fastForward(100)
  }
  const moveToClayWall = async () => {
    const box = await canvas.boundingBox()
    if (!box) throw new Error('점토 캔버스의 위치를 찾을 수 없습니다.')
    await page.mouse.move(box.x + box.width * 0.67, box.y + box.height * 0.43)
  }
  const moveToClaySurface = async () => {
    const box = await canvas.boundingBox()
    if (!box) throw new Error('점토 캔버스의 위치를 찾을 수 없습니다.')
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.52)
  }
  const wetClayAndPutSpongeDown = async () => {
    await page.getByTestId('water-action').click()
    await expect(game).toHaveAttribute('data-sponge', '100')
    await moveToClaySurface()
    await page.mouse.down({ button: 'left' })
    await advanceFrames(18)
    await page.mouse.up({ button: 'left' })
    await page.mouse.down({ button: 'right' })
    await page.mouse.up({ button: 'right' })
    await expect(game).toHaveAttribute('data-sponge', '0')
  }

  await expect(game).toHaveAttribute('data-moisture-state', 'balanced')
  const balancedRadiusBefore = await readMaxRadius()
  await page.keyboard.down('Space')
  await advanceFrames(8)
  await moveToClayWall()
  await page.mouse.down({ button: 'right' })
  await advanceFrames(8)
  await page.mouse.up({ button: 'right' })
  const balancedRadiusDelta = Math.abs(await readMaxRadius() - balancedRadiusBefore)
  expect(balancedRadiusDelta).toBeGreaterThan(0)
  await page.keyboard.up('Space')

  await page.getByTestId('restart-action').click()
  await page.getByTestId('restart-action').click()
  await wetClayAndPutSpongeDown()
  await expect(game).toHaveAttribute('data-moisture-state', 'wet')
  await expect(moistureTrack).toHaveAttribute('aria-valuetext', /과습/)
  await expect(page.locator('#speed-effect')).toContainText('감속 후 기다리기')
  expect(Number(await game.getAttribute('data-clay-roughness'))).toBeLessThan(0.4)
  expect(await game.getAttribute('data-clay-flat-shading')).toBe('false')
  const wetFillColor = await page.locator('#moisture-fill').evaluate((element) => getComputedStyle(element).backgroundColor)

  await page.keyboard.down('Space')
  await advanceFrames(8)
  const collapseHeightBefore = await readHeight()
  await expect(game).toHaveAttribute('data-moisture-state', 'wet')
  await expect(game).toHaveAttribute('data-material-motion', 'true')
  await moveToClayWall()
  await page.mouse.down({ button: 'right' })
  await advanceFrames(8)

  let collapsing = false
  for (let step = 0; step < 20 && !collapsing; step += 1) {
    await advanceFrames(1)
    collapsing = (await modePanel.getAttribute('class'))?.includes('is-collapsing') ?? false
  }
  expect(collapsing).toBe(true)
  await expect(page.getByTestId('finish-action')).toBeDisabled()

  await advanceFrames(15)
  expect(await readHeight()).toBeLessThan(collapseHeightBefore - 0.5)
  await page.mouse.up({ button: 'right' })
  await page.keyboard.up('Space')
  await page.clock.fastForward(5_000)
  await expect(game).toHaveAttribute('data-moisture-state', 'balanced')
  await expect(page.locator('#pressure-value')).toHaveText('안정')

  await page.getByTestId('restart-action').click()
  await page.getByTestId('restart-action').click()
  await page.keyboard.down('Space')
  await advanceFrames(8)
  await moveToClayWall()
  await page.mouse.down({ button: 'left' })
  await page.mouse.down({ button: 'right' })
  for (let step = 0; step < 6 && await game.getAttribute('data-moisture-state') !== 'dry'; step += 1) {
    await page.clock.fastForward(5_000)
  }
  await advanceFrames(10)
  await expect(game).toHaveAttribute('data-moisture-state', 'dry')
  await expect(moistureTrack).toHaveAttribute('aria-valuetext', /과건조/)
  await expect(page.locator('#speed-effect')).toContainText('물을 적셔주세요')
  expect(Number(await game.getAttribute('data-clay-roughness'))).toBeGreaterThan(0.9)
  expect(await game.getAttribute('data-clay-flat-shading')).toBe('true')
  expect(await page.locator('#moisture-fill').evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(wetFillColor)
  await expect(page.locator('#pressure-value')).toHaveText(/주의|위험/)

  const dryRadiusBefore = await readMaxRadius()
  await page.mouse.up({ button: 'left' })
  await advanceFrames(8)
  expect(Math.abs(await readMaxRadius() - dryRadiusBefore)).toBeLessThan(balancedRadiusDelta)

  await page.mouse.up({ button: 'right' })
  await page.keyboard.up('Space')
  await wetClayAndPutSpongeDown()
  await expect(game).toHaveAttribute('data-moisture-state', 'balanced')
  await expect(page.locator('#pressure-value')).toHaveText('안정')
})

test('동작 줄이기에서는 과습 반복 흔들림을 끈다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install()
  await page.goto('/')
  await page.getByTestId('start-action').click()
  await page.getByTestId('water-action').click()
  const canvas = page.getByTestId('game-surface').locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('점토 캔버스의 위치를 찾을 수 없습니다.')
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.52)
  await page.mouse.down({ button: 'left' })
  for (let frame = 0; frame < 18; frame += 1) await page.clock.fastForward(100)
  await page.mouse.up({ button: 'left' })
  await page.keyboard.down('Space')
  for (let frame = 0; frame < 8; frame += 1) await page.clock.fastForward(100)
  await expect(page.getByTestId('game-root')).toHaveAttribute('data-material-motion', 'false')
  await page.keyboard.up('Space')
})
