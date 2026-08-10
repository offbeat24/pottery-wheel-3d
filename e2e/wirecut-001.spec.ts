import { expect, test } from '@playwright/test'
import { createInitialClay, wireCutClayAt } from '../src/game/clay'
import { ORDERS } from '../src/game/orders'
import { scoreClay } from '../src/game/scoring'

test('stopped wheel wire drag cuts the clay at the chosen height', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await page.goto('/')
  const game = page.getByTestId('game-root')
  const canvas = page.getByTestId('game-surface').locator('canvas')
  const height = async () => Number.parseFloat(await page.locator('#height-value').innerText())

  await page.getByTestId('start-action').click()
  await page.keyboard.down('Space')
  await expect.poll(async () => Number(await page.locator('#rpm-value').innerText())).toBeGreaterThan(10)
  await expect(page.getByTestId('wire-action')).toBeDisabled()
  await page.keyboard.press('KeyC')
  await expect(game).toHaveAttribute('data-wire-mode', 'false')
  await page.keyboard.up('Space')
  await expect.poll(async () => Number(await page.locator('#rpm-value').innerText())).toBe(0)
  await expect(page.getByTestId('wire-action')).toBeEnabled()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  const clayX = box!.x + box!.width * 0.5
  const clayY = box!.y + box!.height * 0.52
  const initialHeight = await height()

  await page.getByTestId('wire-action').click()
  await page.mouse.move(clayX, clayY)
  await page.mouse.down()
  await page.mouse.move(clayX + 150, clayY)
  await page.keyboard.down('Space')
  await expect(game).toHaveAttribute('data-wire-mode', 'false')
  await page.mouse.up()
  expect(await height()).toBe(initialHeight)
  await page.keyboard.up('Space')
  await expect.poll(async () => Number(await page.locator('#rpm-value').innerText())).toBe(0)

  await page.getByTestId('wire-action').click()
  await expect(game).toHaveAttribute('data-wire-mode', 'true')

  await page.mouse.move(box!.x + 80, box!.y + 80)
  await page.mouse.down()
  await page.mouse.move(box!.x + 230, box!.y + 80)
  await page.mouse.up()
  expect(await height()).toBe(initialHeight)

  await page.mouse.move(clayX, clayY)
  await page.mouse.down()
  await page.mouse.move(clayX + 40, clayY)
  await page.mouse.up()
  expect(await height()).toBe(initialHeight)
  await expect(game).toHaveAttribute('data-wire-mode', 'true')

  await page.mouse.move(clayX, clayY)
  await page.mouse.down()
  await page.mouse.move(clayX + 150, clayY + 80)
  await page.mouse.up()
  expect(await height()).toBe(initialHeight)

  await page.mouse.move(clayX, clayY)
  await page.mouse.down()
  await page.mouse.move(clayX + 150, clayY)
  await expect(page.getByTestId('wire-line')).toBeVisible()
  const firstCutIndex = Number(await game.getAttribute('data-wire-cut-index'))
  const expectedFirstCut = wireCutClayAt(createInitialClay(), firstCutIndex).remaining
  await testInfo.attach('wire-drag-1440x900', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.mouse.up()
  await expect.poll(height).toBeLessThan(initialHeight)
  expect(await height()).toBe(Number((expectedFirstCut.height * 12).toFixed(1)))
  await expect(game).toHaveAttribute('data-wire-mode', 'false')
  await expect(game).toHaveAttribute('data-detached-count', '1')
  const cutHeight = await height()

  await testInfo.attach('wire-cut-1440x900', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await page.getByTestId('restart-action').click()
  await page.getByTestId('restart-action').click()
  await expect.poll(height).toBe(initialHeight)
  await expect(game).toHaveAttribute('data-wire-mode', 'false')
  await expect(game).toHaveAttribute('data-detached-count', '0')
  expect(await height()).toBeGreaterThan(cutHeight)

  await page.getByTestId('wire-action').click()
  const secondClayY = box!.y + box!.height * 0.44
  await page.mouse.move(clayX, secondClayY)
  await page.mouse.down()
  await page.mouse.move(clayX + 150, secondClayY)
  const secondCutIndex = Number(await game.getAttribute('data-wire-cut-index'))
  const expectedSecondCut = wireCutClayAt(createInitialClay(), secondCutIndex).remaining
  expect(secondCutIndex).not.toBe(firstCutIndex)
  expect(expectedSecondCut.height).not.toBe(expectedFirstCut.height)
  await page.mouse.up()
  await expect.poll(height).toBeLessThan(initialHeight)
  expect(await height()).toBe(Number((expectedSecondCut.height * 12).toFixed(1)))
  await page.getByTestId('finish-action').click()
  await expect(game).toHaveAttribute('data-game-state', 'result')
  const cutScore = Number(await game.getAttribute('data-shape-score'))
  expect(cutScore).toBe(scoreClay(expectedSecondCut, ORDERS[0]).total)
})
