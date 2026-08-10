import { expect, test } from '@playwright/test'

test('85% 부근 회전에서도 모든 성형 입력이 100% 효율로 연결된다', async ({ page }, testInfo) => {
  await page.goto('/')
  const game = page.getByTestId('game-root')
  const canvas = page.getByTestId('game-surface').locator('canvas')
  await page.getByTestId('start-action').click()
  const reachHighEfficiency = async () => {
    await page.keyboard.down('Space')
    await expect.poll(async () => Number(await page.locator('#rpm-value').innerText())).toBeGreaterThanOrEqual(98)
    await page.keyboard.up('Space')
    await expect(page.locator('#speed-effect')).toContainText('성형 효율 100% · 안정 구간')
  }

  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  const centerX = box!.x + box!.width * 0.5
  const outerX = box!.x + box!.width * 0.58

  await reachHighEfficiency()
  const openingBefore = Number(await game.getAttribute('data-opening'))
  await page.mouse.move(centerX, box!.y + box!.height * 0.34)
  await page.mouse.down({ button: 'right' })
  await page.waitForTimeout(180)
  await page.mouse.up({ button: 'right' })
  await expect.poll(async () => Number(await game.getAttribute('data-opening'))).toBeGreaterThan(openingBefore)

  await reachHighEfficiency()
  await page.mouse.move(outerX, box!.y + box!.height * 0.48)
  await page.waitForTimeout(50)
  const radiusBefore = Number(await game.getAttribute('data-selected-radius'))
  await page.mouse.down({ button: 'left' })
  await expect(page.getByTestId('game-status')).toHaveText('좁히는 중')
  await expect.poll(async () => Number(await game.getAttribute('data-selected-radius'))).toBeLessThan(radiusBefore)
  await page.mouse.up({ button: 'left' })

  await reachHighEfficiency()
  const heightBefore = Number.parseFloat(await page.locator('#height-value').innerText())
  await page.mouse.down({ button: 'left' })
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(outerX, box!.y + box!.height * 0.4, { steps: 4 })
  await page.mouse.up({ button: 'right' })
  await page.mouse.up({ button: 'left' })
  await expect.poll(async () => Number.parseFloat(await page.locator('#height-value').innerText())).toBeGreaterThan(heightBefore)

  await testInfo.attach('efficiency-85-percent-1440x900', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})
