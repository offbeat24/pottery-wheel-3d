import { expect, test } from '@playwright/test'

test('core pottery capability works at 1440×900', async ({ page }, testInfo) => {
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

  await page.keyboard.down('Space')
  await expect.poll(async () => Number(await page.locator('#rpm-value').textContent())).toBeGreaterThan(0)
  await expect(page.getByTestId('game-status')).not.toHaveText('시점 조절')
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

  await page.getByTestId('restart-action').click()
  await page.getByTestId('restart-action').click()
  await expect(page.locator('#rpm-value')).toHaveText('0')
  await expect(page.getByTestId('game-status')).toHaveText('시점 조절')
  await expect(game).toHaveAttribute('data-game-state', 'playing')
  expect(browserErrors).toEqual([])
})
