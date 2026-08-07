import * as THREE from 'three'

export interface WorkshopObjects {
  spinningGroup: THREE.Group
  pedal: THREE.Group
  leftHand: THREE.Group
  rightHand: THREE.Group
  contactRing: THREE.Mesh
}

const shadow = (object: THREE.Object3D): void => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
}

export function createWorkshop(scene: THREE.Scene): WorkshopObjects {
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x9d6546, roughness: 0.93 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 15), floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.06
  floor.receiveShadow = true
  scene.add(floor)

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 9),
    new THREE.MeshStandardMaterial({ color: 0xc89168, roughness: 1 }),
  )
  backWall.position.set(0, 4.4, -4.8)
  backWall.receiveShadow = true
  scene.add(backWall)

  addWindow(scene)
  addShelves(scene)
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

  return { spinningGroup, pedal, leftHand, rightHand, contactRing }
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

function addShelves(scene: THREE.Scene): void {
  const shelfMaterial = new THREE.MeshStandardMaterial({ color: 0x67412d, roughness: 0.9 })
  for (const y of [2.1, 3.2]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.13, 0.62), shelfMaterial)
    shelf.position.set(-3.25, y, -4.25)
    shelf.castShadow = true
    scene.add(shelf)
  }

  const colors = [0x985239, 0xb56f4c, 0x6f765b, 0xc28a5f, 0x8a5c45, 0xd19b72]
  colors.forEach((color, index) => {
    const pot = createDisplayPot(color, 0.32 + (index % 3) * 0.06)
    pot.position.set(-4.25 + (index % 3) * 1.02, index < 3 ? 2.23 : 3.33, -4.12)
    pot.rotation.y = index * 0.7
    scene.add(pot)
  })
}

function createDisplayPot(color: number, scale: number): THREE.Mesh {
  const points = [
    new THREE.Vector2(0.48, 0),
    new THREE.Vector2(0.54, 0.25),
    new THREE.Vector2(0.65, 0.7),
    new THREE.Vector2(0.42, 1.05),
    new THREE.Vector2(0.45, 1.15),
  ]
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(points, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.82 }),
  )
  mesh.scale.setScalar(scale)
  mesh.castShadow = true
  return mesh
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
  return hand
}
