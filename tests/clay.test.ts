import { describe, expect, it } from 'vitest'
import {
  MAX_HEIGHT,
  MAX_OUTER_RADIUS,
  MIN_HEIGHT,
  MIN_OUTER_RADIUS,
  MIN_WALL_THICKNESS,
  WIDEN_LIMIT_RADIUS,
  collapseWideSection,
  changeHeight,
  createInitialClay,
  cutClayAt,
  deformRadius,
  estimateClayVolume,
  interpolateClayProfile,
  isNarrowLimit,
  isWidenLimit,
  minimumWallThickness,
  openCenter,
} from '../src/game/clay'

describe('점토 단면 변형', () => {
  it('선택 높이 주변을 멀리 떨어진 단면보다 크게 변형한다', () => {
    const clay = createInitialClay()
    const center = Math.floor(clay.outerRadii.length / 2)
    const changed = deformRadius(clay, center, -0.2)

    expect(clay.outerRadii[center] - changed.outerRadii[center]).toBeGreaterThan(0.15)
    expect(Math.abs(clay.outerRadii[0] - changed.outerRadii[0])).toBeLessThan(
      clay.outerRadii[center] - changed.outerRadii[center],
    )
  })

  it('극단적인 입력에도 반지름과 벽 두께 제한을 지킨다', () => {
    let clay = createInitialClay()
    for (let index = 0; index < 200; index += 1) clay = deformRadius(clay, 24, index % 2 ? 1 : -1)

    clay.outerRadii.forEach((radius, index) => {
      expect(radius).toBeGreaterThanOrEqual(MIN_OUTER_RADIUS)
      expect(radius).toBeLessThanOrEqual(MAX_OUTER_RADIUS)
      expect(radius - clay.innerRadii[index]).toBeGreaterThanOrEqual(MIN_WALL_THICKNESS - 0.0001)
    })
  })

  it('끌어올리기와 누르기의 높이 제한을 지킨다', () => {
    const clay = createInitialClay()
    expect(changeHeight(clay, 100).height).toBe(MAX_HEIGHT)
    expect(changeHeight(clay, -100).height).toBe(MIN_HEIGHT)
  })

  it('끌어올릴 때 반지름을 줄여 부피 변화를 보정한다', () => {
    const clay = openCenter(createInitialClay(), 1)
    const taller = changeHeight(clay, 0.35)
    expect(taller.outerRadii[20]).toBeLessThan(clay.outerRadii[20])
    expect(minimumWallThickness(taller)).toBeLessThan(minimumWallThickness(clay))
    expect(estimateClayVolume(taller)).toBeCloseTo(estimateClayVolume(clay), 2)
  })

  it('처음에는 막힌 흙덩이이고 중심을 파면 내부 공간이 열린다', () => {
    const mound = createInitialClay()
    const opened = openCenter(mound, 1)
    expect(mound.opening).toBe(0)
    expect(mound.innerRadii.at(-1)).toBeCloseTo(0.025)
    expect(opened.opening).toBe(1)
    expect(opened.innerRadii.at(-1)).toBeGreaterThan(0.4)
    expect(estimateClayVolume(opened)).toBeCloseTo(estimateClayVolume(mound), 2)
  })

  it('넓힐 때 총 부피를 보존하면서 선택 단면의 벽이 얇아진다', () => {
    const opened = openCenter(createInitialClay(), 1)
    const center = Math.floor(opened.outerRadii.length * 0.65)
    const widened = deformRadius(opened, center, 0.08)
    const beforeWall = opened.outerRadii[center] - opened.innerRadii[center]
    const afterWall = widened.outerRadii[center] - widened.innerRadii[center]
    expect(afterWall).toBeLessThan(beforeWall)
    expect(estimateClayVolume(widened)).toBeCloseTo(estimateClayVolume(opened), 2)
  })

  it('충분히 가는 단면에서는 위쪽 점토를 분리한다', () => {
    let clay = createInitialClay()
    for (let index = 0; index < 20; index += 1) clay = deformRadius(clay, 30, -0.1)
    expect(isNarrowLimit(clay, 30)).toBe(true)

    const cut = cutClayAt(clay, 30)
    expect(cut).not.toBeNull()
    expect(cut!.remaining.height).toBeLessThan(clay.height)
    expect(cut!.detached.height).toBeGreaterThan(0.2)
    expect(cut!.remaining.outerRadii).toHaveLength(clay.outerRadii.length)
  })

  it('너무 넓어진 단면을 주저앉혀 구조 한계 안으로 되돌린다', () => {
    let clay = createInitialClay()
    for (let index = 0; index < 30; index += 1) clay = deformRadius(clay, 24, 0.1)
    expect(clay.outerRadii[24]).toBeGreaterThanOrEqual(WIDEN_LIMIT_RADIUS)
    expect(isWidenLimit(clay, 24)).toBe(true)

    const collapsed = collapseWideSection(clay, 24)
    expect(collapsed.outerRadii[24]).toBeLessThan(clay.outerRadii[24])
    expect(collapsed.height).toBeLessThan(clay.height)
  })

  it('잘린 뒤 남은 낮은 점토를 끌어올릴 때 높이가 순간적으로 튀지 않는다', () => {
    let clay = createInitialClay()
    for (let index = 0; index < 20; index += 1) clay = deformRadius(clay, 12, -0.1)
    const cut = cutClayAt(clay, 12)
    expect(cut).not.toBeNull()
    const pulled = changeHeight(cut!.remaining, 0.01)
    expect(pulled.height - cut!.remaining.height).toBeCloseTo(0.01)
  })

  it('주저앉기 전후 단면을 연속적으로 보간한다', () => {
    let clay = createInitialClay()
    for (let index = 0; index < 30; index += 1) clay = deformRadius(clay, 24, 0.1)
    const collapsed = collapseWideSection(clay, 24)
    const halfway = interpolateClayProfile(clay, collapsed, 0.5)

    expect(interpolateClayProfile(clay, collapsed, 0).height).toBeCloseTo(clay.height)
    expect(interpolateClayProfile(clay, collapsed, 1).height).toBeCloseTo(collapsed.height)
    expect(halfway.height).toBeLessThan(clay.height)
    expect(halfway.height).toBeGreaterThan(collapsed.height)
    expect(halfway.outerRadii[24]).toBeLessThan(clay.outerRadii[24])
  })
})
