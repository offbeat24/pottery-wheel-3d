import { expect, test } from '@playwright/test'

test('core pottery capability works at 1440×900', async ({ page }, testInfo) => {
  test.setTimeout(150_000)

  const browserErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`))

  await page.goto('/')

  const game = page.getByTestId('game-root')
  const surface = page.getByTestId('game-surface')
  await expect(game).toBeVisible()
  await expect(surface).toBeVisible()
  const canvas = surface.locator('canvas')
  await expect(canvas).toBeVisible()
  await expect(page.getByTestId('start-action')).toBeVisible()
  await expect(game).toHaveAttribute('data-game-state', 'intro')

  await page.getByTestId('start-action').click()
  await expect(game).toHaveAttribute('data-game-state', 'playing')
  await expect(game).toHaveAttribute('data-craft-stage', 'forming')
  await expect(page.getByTestId('craft-panel')).toContainText('물레 성형')
  await expect(page.getByTestId('finish-action')).toBeEnabled()

  await page.keyboard.down('Space')
  await page.waitForTimeout(650)
  await expect.poll(async () => Number(await page.locator('#rpm-value').textContent())).toBeGreaterThan(30)
  await expect(page.getByTestId('game-status')).not.toHaveText('시점 조절')

  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.5, canvasBox!.y + canvasBox!.height * 0.34)
  const openingBefore = Number(await game.getAttribute('data-opening'))
  await page.mouse.down({ button: 'right' })
  await expect.poll(async () => Number(await game.getAttribute('data-opening')), { timeout: 3_000 }).toBeGreaterThan(openingBefore + 0.02)
  await page.mouse.up({ button: 'right' })
  const enlargedOpening = Number(await game.getAttribute('data-opening'))
  expect(enlargedOpening).toBeGreaterThan(openingBefore)
  await page.mouse.down({ button: 'left' })
  await page.waitForTimeout(220)
  await page.mouse.up({ button: 'left' })
  await expect.poll(async () => Number(await game.getAttribute('data-opening'))).toBeLessThan(enlargedOpening)
  await page.keyboard.up('Space')

  const renderHealth = await canvas.evaluate(async (element) => {
    const canvasElement = element as HTMLCanvasElement
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const context = canvasElement.getContext('webgl2')
    if (!context) return { width: canvasElement.width, height: canvasElement.height, contextLost: true, centerAlpha: 0 }
    const centerPixel = new Uint8Array(4)
    context.readPixels(
      Math.floor(canvasElement.width / 2),
      Math.floor(canvasElement.height / 2),
      1,
      1,
      context.RGBA,
      context.UNSIGNED_BYTE,
      centerPixel,
    )
    return {
      width: canvasElement.width,
      height: canvasElement.height,
      contextLost: context.isContextLost(),
      centerAlpha: centerPixel[3],
    }
  })
  expect(renderHealth.width).toBeGreaterThanOrEqual(1400)
  expect(renderHealth.height).toBeGreaterThanOrEqual(880)
  expect(renderHealth.contextLost).toBe(false)
  expect(renderHealth.centerAlpha).toBeGreaterThan(0)

  await testInfo.attach('game-surface-1440x900', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await expect.poll(async () => Number(await page.locator('#rpm-value').textContent()), { timeout: 8_000 }).toBe(0)
  await page.getByTestId('water-action').click()
  await expect(game).toHaveAttribute('data-moisture', '100')
  const heightBeforeClay = await page.locator('#height-value').textContent()
  const widthBeforeClay = await page.locator('#width-value').textContent()
  await page.getByTestId('clay-action').click()
  await expect(page.locator('#clay-reserve')).toHaveText('1개')
  await expect(page.locator('#height-value')).toHaveText(heightBeforeClay!)
  await expect(page.locator('#width-value')).toHaveText(widthBeforeClay!)
  await page.getByTestId('handle-action').click()
  await expect(page.getByTestId('handle-action')).toHaveClass(/is-done/)
  await page.locator('#handle-width').fill('125')
  await page.locator('#handle-height').fill('135')
  await page.locator('#handle-thickness').fill('75')
  await expect(page.locator('#handle-width-output')).toHaveText('125%')

  await page.getByTestId('finish-action').click()
  await expect(game).toHaveAttribute('data-craft-stage', 'drying')
  await expect(game).toHaveAttribute('data-moisture', '100')
  await expect(page.locator('[data-glaze="celadon"]')).toBeDisabled()
  const wetColor = await game.getAttribute('data-clay-color')
  await page.getByTestId('drying-action').click()
  await expect(game).toHaveAttribute('data-drying-active', 'true')
  await expect.poll(async () => Number(await game.getAttribute('data-moisture'))).toBeLessThan(100)
  expect(Number(await game.getAttribute('data-moisture'))).toBeGreaterThan(18)
  await expect(game).toHaveAttribute('data-craft-stage', 'drying')
  await expect(page.locator('[data-glaze="celadon"]')).toBeDisabled()
  await expect(page.getByTestId('finish-action')).toBeHidden()
  await expect.poll(async () => game.getAttribute('data-clay-color')).not.toBe(wetColor)
  await expect(page.locator('#drying-track')).toHaveAttribute('aria-valuenow', /[1-9]/)
  await expect.poll(async () => game.getAttribute('data-craft-stage'), { timeout: 6_000 }).toBe('leather-hard')
  await expect(game).toHaveAttribute('data-moisture', '18')
  await page.locator('[data-glaze="celadon"]').click()
  await expect(game).toHaveAttribute('data-craft-stage', 'glazing')
  await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.43, canvasBox!.y + canvasBox!.height * 0.35)
  await page.mouse.down()
  await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.56, canvasBox!.y + canvasBox!.height * 0.65, { steps: 18 })
  await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.43, canvasBox!.y + canvasBox!.height * 0.58, { steps: 12 })
  await page.mouse.up()
  await expect.poll(async () => Number(await game.getAttribute('data-glaze-coverage'))).toBeGreaterThan(0)
  await page.getByTestId('kiln-temperature').fill('900')
  await expect(page.locator('#kiln-output')).toHaveText('900')
  await page.getByTestId('finish-action').click()
  await expect(game).toHaveAttribute('data-craft-stage', 'fired')
  await expect(game).toHaveAttribute('data-game-state', 'result')
  await expect(page.locator('#result-modal')).toBeVisible()
  await expect(page.locator('#result-finish')).toContainText('900°C')
  await testInfo.attach('fired-piece-1440x900', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('result-view-action').click()
  await expect(game).toHaveAttribute('data-game-state', 'result-view')
  await expect(page.locator('#result-modal')).toBeHidden()
  await expect(page.locator('#result-view-dock')).toBeVisible()
  await testInfo.attach('fired-piece-full-view-1440x900', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.locator('#result-summary-button').click()

  await page.locator('#retry-button').click()

  await page.getByTestId('restart-action').click()
  await page.getByTestId('restart-action').click()
  await expect(page.locator('#rpm-value')).toHaveText('0')
  await expect(page.getByTestId('game-status')).toHaveText('시점 조절')
  await expect(game).toHaveAttribute('data-game-state', 'playing')
  expect(browserErrors).toEqual([])
})

test('solid clay can advance without opening a center hole', async ({ page }) => {
  await page.goto('/')
  const game = page.getByTestId('game-root')
  await page.getByTestId('start-action').click()

  await expect(game).toHaveAttribute('data-opening', '0.00')
  await expect(page.getByTestId('finish-action')).toBeEnabled()
  await page.getByTestId('finish-action').click()
  await expect(game).toHaveAttribute('data-craft-stage', 'drying')
  await expect(game).toHaveAttribute('data-opening', '0.00')
  await page.getByTestId('drying-action').click()
  await expect.poll(async () => game.getAttribute('data-craft-stage'), { timeout: 6_000 }).toBe('leather-hard')
  await expect(game).toHaveAttribute('data-moisture', '18')
  await expect(game).toHaveAttribute('data-opening', '0.00')
})
