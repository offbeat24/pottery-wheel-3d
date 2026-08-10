import { expect, test } from '@playwright/test'

test('core pottery capability works at 1440×900', async ({ page }, testInfo) => {
  test.setTimeout(240_000)

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
  await expect(page.getByTestId('craft-panel')).toContainText('물레 성형')
  await expect(page.getByTestId('finish-action')).toBeEnabled()
  await expect(page.getByTestId('handle-action')).toHaveCount(0)
  await expect(page.getByTestId('drying-action')).toHaveCount(0)
  await expect(page.getByTestId('kiln-temperature')).toHaveCount(0)
  await expect(page.locator('[data-glaze]')).toHaveCount(0)
  await expect(game).not.toHaveAttribute('data-firing-multiplier')
  await expect(game).not.toHaveAttribute('data-glaze-coverage')

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
  await page.mouse.down({ button: 'right' })
  await page.waitForTimeout(500)
  await page.mouse.up({ button: 'right' })
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
  // 물은 스펀지로만 바른다. 보조 버튼은 물그릇에서 스펀지를 적시는 역할이다.
  await page.getByTestId('water-action').click()
  await expect(game).toHaveAttribute('data-sponge', '100')
  await page.mouse.move(canvasBox!.x + canvasBox!.width / 2, canvasBox!.y + canvasBox!.height * 0.52)
  await page.mouse.down()
  await expect.poll(async () => Number(await game.getAttribute('data-moisture')), { timeout: 8_000 }).toBeGreaterThan(88)
  await page.mouse.up()
  const heightBeforeClay = await page.locator('#height-value').textContent()
  const widthBeforeClay = await page.locator('#width-value').textContent()
  await page.getByTestId('clay-action').click()
  await expect(page.locator('#clay-reserve')).toHaveText('1개')
  await expect(page.locator('#height-value')).not.toHaveText(heightBeforeClay!)
  await expect(page.locator('#width-value')).toHaveText(widthBeforeClay!)
  await page.getByTestId('finish-action').click()
  await expect(game).toHaveAttribute('data-game-state', 'result')
  await expect(page.locator('#result-modal')).toBeVisible()
  await expect(page.locator('#score-list')).toContainText('실루엣')
  await expect(page.locator('#score-list')).toContainText('높이')
  await expect(page.locator('#score-list')).toContainText('매끄러움')
  await expect(page.locator('#result-price')).toHaveText(/^[\d,]+원$/)
  const shapeScore = Number(await game.getAttribute('data-shape-score'))
  const elapsedWorkSeconds = Number(await game.getAttribute('data-elapsed-work-seconds'))
  const expectedPrice = Math.round((1000 + 29000 * (shapeScore / 100) ** 2.4) / 100) * 100
  await expect(page.locator('#result-price')).toHaveText(`${expectedPrice.toLocaleString('ko-KR')}원`)
  const completedWorkTime = await page.locator('#work-time-value').textContent()
  await page.waitForTimeout(1_100)
  await expect(page.locator('#work-time-value')).toHaveText(completedWorkTime!)
  await testInfo.attach('shape-result-1440x900', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('result-view-action').click()
  await expect(game).toHaveAttribute('data-game-state', 'result-view')
  await expect(page.locator('#result-modal')).toBeHidden()
  await expect(page.locator('#result-view-dock')).toBeVisible()
  await testInfo.attach('shape-result-full-view-1440x900', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.locator('#result-summary-button').click()

  await page.locator('#next-button').click()
  const nextOrderElapsed = Number(await game.getAttribute('data-elapsed-work-seconds'))
  expect(nextOrderElapsed).toBeLessThan(elapsedWorkSeconds)
  await expect.poll(async () => Number(await game.getAttribute('data-elapsed-work-seconds'))).toBeGreaterThan(nextOrderElapsed)
  await page.getByTestId('restart-action').click()
  const restartedElapsed = await page.getByTestId('restart-action').evaluate((button) => {
    (button as HTMLButtonElement).click()
    return document.querySelector<HTMLElement>('[data-testid="game-root"]')?.dataset.elapsedWorkSeconds
  })
  expect(restartedElapsed).toBe('0')
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
  await expect(game).toHaveAttribute('data-game-state', 'result')
  await expect(page.locator('#result-modal')).toBeVisible()
  await expect(game).toHaveAttribute('data-opening', '0.00')
})
