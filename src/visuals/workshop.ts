import * as THREE from 'three'
import type { ShelfEffect, StudioEffect } from '../game/shop'

export interface WorkshopObjects {
  spinningGroup: THREE.Group
  pedal: THREE.Group
  leftHand: THREE.Group
  rightHand: THREE.Group
  contactRing: THREE.Mesh
  displaySlots: THREE.Vector3[]
  /** 이사한 공방의 벽과 바닥을 칠한다. 배경색과 조명은 호출한 쪽에서 맞춘다. */
  applyStudio: (studio: StudioEffect) => void
  /** 전시 선반의 판재와 테를 바꾼다. */
  applyShelf: (shelf: ShelfEffect) => void
  /** 가마 아궁이의 불빛. 굽는 동안 켜고, 시간이 지나면 과열 색으로 바꾼다. */
  setKilnFiring: (firing: boolean, overdue?: boolean) => void
  /** 가마에서 작품이 나오는 자리. */
  kilnMouth: THREE.Vector3
  /** 클릭으로 작품을 꺼낼 수 있는 가마 본체. */
  kilnGroup: THREE.Group
}

const shadow = (object: THREE.Object3D): void => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
}

export function createWorkshop(scene: THREE.Scene, displaySlotCount: number): WorkshopObjects {
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x9d6546, roughness: 0.93 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 15), floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.06
  floor.receiveShadow = true
  scene.add(floor)

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xc89168, roughness: 1 })
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), wallMaterial)
  backWall.position.set(0, 4.4, -4.8)
  backWall.receiveShadow = true
  scene.add(backWall)

  addWindow(scene)
  const shelves = addShelves(scene, displaySlotCount)
  const displaySlots = shelves.slots
  addFloorDetails(scene)

  const table = new THREE.Group()
  const wood = new THREE.MeshStandardMaterial({ color: 0x70442e, roughness: 0.82 })
  const woodLight = new THREE.MeshStandardMaterial({ color: 0x8f5939, roughness: 0.86 })
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.32, 2.55), woodLight)
  top.position.y = 0.24
  table.add(top)
  for (const x of [-1.85, 1.85]) {
    for (const z of [-0.94, 0.94]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.25, 0.25), wood)
      leg.position.set(x, -0.45, z)
      table.add(leg)
    }
  }
  table.position.z = 0.05
  shadow(table)
  scene.add(table)

  const wheelBase = new THREE.Group()
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x523a2e, roughness: 0.78 })
  const creamMaterial = new THREE.MeshStandardMaterial({ color: 0xd7b98f, roughness: 0.86 })
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.38, 0.18, 48), creamMaterial)
  basin.position.y = 0.52
  wheelBase.add(basin)
  const basinRim = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.09, 12, 64), creamMaterial)
  basinRim.rotation.x = Math.PI / 2
  basinRim.position.y = 0.64
  wheelBase.add(basinRim)
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.35, 24), baseMaterial)
  axle.position.y = 0.62
  wheelBase.add(axle)
  shadow(wheelBase)
  scene.add(wheelBase)

  const spinningGroup = new THREE.Group()
  spinningGroup.position.y = 0.79
  const wheelHead = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.12, 0.12, 64),
    new THREE.MeshStandardMaterial({ color: 0x5b493d, roughness: 0.56, metalness: 0.08 }),
  )
  wheelHead.position.y = -0.08
  spinningGroup.add(wheelHead)
  const wheelGroove = new THREE.Mesh(
    new THREE.TorusGeometry(0.89, 0.014, 7, 64),
    new THREE.MeshStandardMaterial({ color: 0x302720, roughness: 0.6 }),
  )
  wheelGroove.rotation.x = Math.PI / 2
  wheelGroove.position.y = -0.012
  spinningGroup.add(wheelGroove)
  shadow(spinningGroup)
  scene.add(spinningGroup)

  const pedal = createPedal()
  scene.add(pedal)

  const kiln = new THREE.Group()
  const brick = new THREE.MeshStandardMaterial({ color: 0x8a5b45, roughness: 0.95 })
  const darkBrick = new THREE.MeshStandardMaterial({ color: 0x5f4034, roughness: 0.86 })
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.98, 1.5, 20), brick)
  body.position.y = 0.75
  kiln.add(body)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.86, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), brick)
  dome.position.y = 1.5
  kiln.add(dome)
  for (const y of [0.95, 1.28]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 8, 24), darkBrick)
    band.rotation.x = Math.PI / 2
    band.position.y = y
    kiln.add(band)
  }
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.5, 12), darkBrick)
  chimney.position.y = 2.22
  kiln.add(chimney)

  // 아궁이: 벽돌을 파낸 아치 구멍에 잉걸불과 장작을 넣는다.
  const emberMaterial = new THREE.MeshBasicMaterial({ color: 0x2a1a14 })
  const mouth = new THREE.Group()
  mouth.position.set(0, 0, 0.98)
  // 불은 벽면에 뚫린 아치 구멍으로 보인다. 벽 안쪽에 두면 몸통에 가려 보이지 않는다.
  const fireBody = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.34), emberMaterial)
  fireBody.position.set(0, 0.28, 0.06)
  mouth.add(fireBody)
  const fireArch = new THREE.Mesh(new THREE.CircleGeometry(0.31, 18, 0, Math.PI), emberMaterial)
  fireArch.position.set(0, 0.45, 0.06)
  mouth.add(fireArch)
  for (const x of [-0.5, 0.5]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.3), darkBrick)
    jamb.position.set(x, 0.36, -0.02)
    mouth.add(jamb)
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.1, 8, 20, Math.PI), darkBrick)
  arch.position.set(0, 0.45, 0.04)
  mouth.add(arch)
  const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.14, 0.42), darkBrick)
  hearth.position.set(0, 0.04, 0.02)
  mouth.add(hearth)
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.56, 8), new THREE.MeshStandardMaterial({ color: 0x4b3226, roughness: 1 }))
  log.rotation.set(0, 0, Math.PI / 2 + 0.1)
  log.position.set(0, 0.2, 0.1)
  mouth.add(log)
  kiln.add(mouth)

  kiln.position.set(-3.45, 0, 0.35)
  kiln.rotation.y = 1.0
  shadow(kiln)
  // 목표 고스트(depthTest: false)가 가마 불을 덮지 않도록 손과 같은 순서로 올린다.
  kiln.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material.transparent = true
      child.renderOrder = 3
    }
  })
  scene.add(kiln)
  const kilnLight = new THREE.PointLight(0xff8a3c, 0, 3.5, 2)
  kilnLight.position.set(-3.0, 0.5, 0.9)
  scene.add(kilnLight)
  const setKilnFiring = (firing: boolean, overdue = false): void => {
    emberMaterial.color.setHex(firing ? (overdue ? 0xffe8a8 : 0xff9a3c) : 0x2a1a14)
    kilnLight.color.setHex(overdue ? 0xffd08a : 0xff8a3c)
    kilnLight.intensity = firing ? (overdue ? 14 : 9) : 0
  }
  const kilnMouth = new THREE.Vector3(-3.45, 1.9, 0.35)

  const leftHand = createHand('left')
  const rightHand = createHand('right')
  scene.add(leftHand, rightHand)

  const contactRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.014, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0xffddb2, transparent: true, opacity: 0.72, depthWrite: false }),
  )
  contactRing.rotation.x = Math.PI / 2
  contactRing.visible = false
  spinningGroup.add(contactRing)

  // 이사는 한눈에 보여야 한다. 벽과 바닥을 함께 칠한다.
  const applyStudio = (studio: StudioEffect): void => {
    floorMaterial.color.setHex(studio.floor)
    wallMaterial.color.setHex(studio.wall)
    wallMaterial.roughness = 0.95
  }

  return {
    spinningGroup,
    pedal,
    leftHand,
    rightHand,
    contactRing,
    displaySlots,
    applyStudio,
    applyShelf: shelves.apply,
    setKilnFiring,
    kilnMouth,
    kilnGroup: kiln,
  }
}

function addWindow(scene: THREE.Scene): void {
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x694632, roughness: 0.88 })
  const glow = new THREE.MeshBasicMaterial({ color: 0xffe9b5 })
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.5), glow)
  pane.position.set(2.65, 3.65, -4.76)
  scene.add(pane)
  for (const x of [1.02, 4.28]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.75, 0.12), frameMaterial)
    beam.position.set(x, 3.65, -4.68)
    scene.add(beam)
  }
  for (const y of [2.38, 4.92]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.12), frameMaterial)
    beam.position.set(2.65, y, -4.68)
    scene.add(beam)
  }
  const crossX = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.11), frameMaterial)
  crossX.position.set(2.65, 3.65, -4.67)
  const crossY = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.1, 0.11), frameMaterial)
  crossY.position.set(2.65, 3.65, -4.67)
  scene.add(crossX, crossY)
}

// 선반은 완성한 작품을 올려두는 전시대다. 슬롯은 아래 칸부터 채운다.
function addShelves(scene: THREE.Scene, slotCount: number): { slots: THREE.Vector3[]; apply: (shelf: ShelfEffect) => void } {
  const shelfMaterial = new THREE.MeshStandardMaterial({ color: 0x67412d, roughness: 0.9 })
  const shelfY = [2.1, 3.2]
  for (const y of shelfY) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.13, 0.62), shelfMaterial)
    shelf.position.set(-3.25, y, -4.25)
    shelf.castShadow = true
    scene.add(shelf)
  }

  // 진열장: 판재를 다시 칠하고 테와 받침대를 붙인다. 장식은 처음 한 번만 만든다.
  const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.34, metalness: 0.72 })
  let trimAdded = false
  const apply = (shelf: ShelfEffect): void => {
    shelfMaterial.color.setHex(shelf.board)
    shelfMaterial.roughness = shelf.boardRoughness
    trimMaterial.color.setHex(shelf.trim)
    trimMaterial.metalness = shelf.trimMetalness
    if (trimAdded) return
    trimAdded = true
    for (const y of shelfY) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(3.44, 0.035, 0.66), trimMaterial)
      trim.position.set(-3.25, y - 0.08, -4.25)
      scene.add(trim)
      for (const x of [-4.85, -1.65]) {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.07), trimMaterial)
        bracket.position.set(x, y - 0.24, -4.25)
        bracket.castShadow = true
        scene.add(bracket)
      }
    }
  }

  const lowerCount = Math.ceil(slotCount / 2)
  const slots = Array.from({ length: slotCount }, (_, index) => {
    const isLower = index < lowerCount
    const column = isLower ? index : index - lowerCount
    const columns = isLower ? lowerCount : slotCount - lowerCount
    const step = 3.0 / Math.max(1, columns)
    const x = -3.25 - (3.0 - step) / 2 + column * step
    return new THREE.Vector3(x, isLower ? 2.17 : 3.27, -4.12)
  })

  return { slots, apply }
}

function addFloorDetails(scene: THREE.Scene): void {
  const basket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.43, 0.72, 12, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xa77b4f, roughness: 1, side: THREE.DoubleSide }),
  )
  basket.position.set(3.25, 0.32, -1.6)
  basket.rotation.z = -0.04
  basket.castShadow = true
  scene.add(basket)

  const stool = new THREE.Group()
  const stoolMaterial = new THREE.MeshStandardMaterial({ color: 0x69432f, roughness: 0.9 })
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.58, 0.16, 24), stoolMaterial)
  seat.position.y = 0.95
  stool.add(seat)
  for (const x of [-0.38, 0.38]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.95, 0.13), stoolMaterial)
    leg.position.set(x, 0.45, 0)
    leg.rotation.z = x * 0.13
    stool.add(leg)
  }
  stool.position.set(-3.3, 0, 0.8)
  shadow(stool)
  scene.add(stool)
}

function createPedal(): THREE.Group {
  const group = new THREE.Group()
  group.position.set(0.15, 0.08, 1.55)
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.11, 1.05),
    new THREE.MeshStandardMaterial({ color: 0x44352c, roughness: 0.7, metalness: 0.08 }),
  )
  arm.position.z = -0.4
  group.add(arm)
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.12, 0.46),
    new THREE.MeshStandardMaterial({ color: 0x79513a, roughness: 0.78 }),
  )
  pad.position.z = 0.15
  group.add(pad)
  shadow(group)
  return group
}

function createHand(side: 'left' | 'right'): THREE.Group {
  const hand = new THREE.Group()
  hand.userData.side = side
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8a17d, roughness: 0.72 })
  const cuff = new THREE.MeshStandardMaterial({ color: side === 'left' ? 0x6f7d60 : 0x9b5c45, roughness: 0.88 })
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), skin)
  palm.scale.set(1.15, 0.72, 0.9)
  hand.add(palm)
  for (let index = -1; index <= 1; index += 1) {
    const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.34, 8), skin)
    finger.rotation.z = Math.PI / 2
    finger.position.set(side === 'left' ? 0.2 : -0.2, index * 0.085, 0)
    hand.add(finger)
  }
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.29, 0.55, 12), cuff)
  sleeve.rotation.z = Math.PI / 2
  sleeve.position.x = side === 'left' ? -0.42 : 0.42
  hand.add(sleeve)
  hand.rotation.z = side === 'left' ? -0.22 : 0.22
  shadow(hand)
  // 목표 고스트(depthTest: false)는 투명 패스에서 그려진다. 손도 투명 패스로 옮기고 뒤에 그려 고스트 위에 오게 한다.
  hand.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material.transparent = true
      child.renderOrder = 3
    }
  })
  return hand
}
