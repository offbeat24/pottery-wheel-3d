import * as THREE from 'three'
import './styles.css'
import {
  PROFILE_SAMPLES,
  buildSafeProfile,
  changeHeight,
  collapseWideSection,
  createInitialClay,
  cutClayAt,
  deformRadius,
  interpolateClayProfile,
  isNarrowLimit,
  isWidenLimit,
  sampleInnerRadius,
  sampleOuterRadius,
} from './game/clay'
import { projectPointerToAxis, shapingActionFromButtons } from './game/input'
import { computeHandTargets } from './game/handPlacement'
import { ORDERS } from './game/orders'
import { scoreClay } from './game/scoring'
import type { ClayProfile, OrderDefinition, ScoreBreakdown, ShapingAction, WheelState } from './game/types'
import { fragility, moistureLabel, updateMoisture, workability } from './game/moisture'
import { CAMERA_ENTER_SPEED, updateWheel } from './game/wheel'
import { createSoundscape } from './audio/soundscape'
import { createClayGeometry, replaceMeshGeometry } from './visuals/clayMesh'
import { createWorkshop } from './visuals/workshop'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('앱 컨테이너를 찾을 수 없습니다.')

app.innerHTML = `
  <main class="game-shell" aria-label="3D 도자기 물레 게임" data-testid="game-root" data-game-state="intro">
    <div class="scene-host" id="scene-host" data-testid="game-surface"></div>
    <div class="grain"></div>
    <header class="top-bar">
      <div class="brand"><span class="brand-kicker">A SMALL POTTERY STUDIO</span><h1>고요한 물레</h1></div>
      <div class="soundless-badge">천천히, 흙의 결을 따라</div>
    </header>
    <section class="order-card" id="order-card" aria-live="polite"></section>
    <aside class="work-readout" aria-label="작업 치수">
      <span class="readout-label">CURRENT FORM</span>
      <div class="readout-value"><strong id="rpm-value">0</strong><span>RPM</span></div>
      <div class="readout-rule"></div>
      <div class="dimension-row"><span>높이</span><strong id="height-value">18.2 cm</strong></div>
      <div class="dimension-row"><span>최대 폭</span><strong id="width-value">19.7 cm</strong></div>
    </aside>
    <div class="bottom-dock">
      <section class="mode-panel" id="mode-panel">
        <div class="mode-copy"><span class="mode-label">CONTROL MODE</span><strong class="mode-name" id="mode-name" data-testid="game-status">시점 조절</strong></div>
        <div class="mode-details">
          <div class="control-hints" id="control-hints"></div>
          <div class="contact-feedback"><span class="contact-dot" id="contact-dot"></span><span id="contact-state">물레가 돌면 손이 커서를 따라갑니다</span></div>
          <div class="pressure-row"><span>손 압력</span><div class="pressure-track"><i id="pressure-fill"></i></div><b id="pressure-value">안정</b></div>
          <div class="pressure-row moisture-row"><span>흙 물기</span><div class="pressure-track"><i id="moisture-fill"></i></div><b id="moisture-value">촉촉</b></div>
        </div>
      </section>
      <section class="pedal-panel">
        <div class="pedal-top"><span>FOOT PEDAL</span><strong>SPACE</strong></div>
        <div class="speed-track"><div class="speed-fill" id="speed-fill"></div></div>
        <small class="pedal-hint">누르는 동안 가속</small>
      </section>
    </div>
    <div class="game-actions">
      <button class="restart-button" id="sound-button" aria-pressed="false"><span>♪</span> 소리 끄기</button>
      <button class="restart-button" id="restart-button" data-testid="restart-action"><span>↻</span> 다시 시작</button>
      <button class="finish-button" id="finish-button" disabled>물레를 멈춰주세요</button>
    </div>
    <div class="toast" id="toast" role="status"></div>

    <section class="modal-layer" id="intro-modal">
      <div class="intro-card">
        <p class="eyebrow">오늘의 공방이 열렸습니다</p>
        <h2>흙이 원하는 모양을<br>천천히 찾아주세요.</h2>
        <p class="intro-lead">발로 물레를 돌리고 두 손으로 형태를 잡습니다. 정답보다 손끝의 리듬을 즐겨보세요.</p>
        <div class="intro-steps">
          <div class="intro-step"><strong>1</strong><b>물레 돌리기</b><span>Space를 누르는 동안 물레가 빨라집니다.</span></div>
          <div class="intro-step"><strong>2</strong><b>양손 성형</b><span>좌클릭은 좁히고 우클릭은 넓힙니다.</span></div>
          <div class="intro-step"><strong>3</strong><b>높이 만들기</b><span>양쪽 클릭을 누른 채 위아래로 움직입니다.</span></div>
          <div class="intro-step"><strong>4</strong><b>물 적시기</b><span>흙이 마르면 W를 눌러 물을 묻힙니다.</span></div>
        </div>
        <div class="intro-footer"><small>마우스와 키보드가 필요합니다.</small><button class="primary-button" id="start-button" data-testid="start-action">첫 주문 시작</button></div>
      </div>
    </section>

    <section class="modal-layer" id="result-modal" hidden>
      <div class="result-card">
        <div class="result-head">
          <div><p class="eyebrow" id="result-eyebrow">작업 결과</p><h2 id="result-title">손끝이 만든 좋은 곡선이에요.</h2></div>
          <div class="total-score"><strong id="total-score">84</strong><span>100점 만점</span></div>
        </div>
        <div class="result-body">
          <div><div class="comparison" id="comparison"></div><div class="legend"><span><i></i>완성품</span><span><i class="target-key"></i>주문 윤곽</span></div></div>
          <div class="score-list" id="score-list"></div>
        </div>
        <div class="result-actions"><button class="secondary-button" id="retry-button">다시 빚기</button><button class="primary-button" id="next-button">다음 주문</button></div>
      </div>
    </section>
  </main>
`

function getElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`${selector} 요소를 찾을 수 없습니다.`)
  return element
}

const sceneHost = getElement<HTMLDivElement>('#scene-host')
const gameRoot = getElement<HTMLElement>('[data-testid="game-root"]')
const orderCard = getElement<HTMLElement>('#order-card')
const rpmValue = getElement<HTMLElement>('#rpm-value')
const heightValue = getElement<HTMLElement>('#height-value')
const widthValue = getElement<HTMLElement>('#width-value')
const speedFill = getElement<HTMLElement>('#speed-fill')
const modePanel = getElement<HTMLElement>('#mode-panel')
const modeName = getElement<HTMLElement>('#mode-name')
const controlHints = getElement<HTMLElement>('#control-hints')
const contactDot = getElement<HTMLElement>('#contact-dot')
const contactState = getElement<HTMLElement>('#contact-state')
const pressureFill = getElement<HTMLElement>('#pressure-fill')
const pressureValue = getElement<HTMLElement>('#pressure-value')
const moistureFill = getElement<HTMLElement>('#moisture-fill')
const moistureValue = getElement<HTMLElement>('#moisture-value')
const soundButton = getElement<HTMLButtonElement>('#sound-button')
const finishButton = getElement<HTMLButtonElement>('#finish-button')
const restartButton = getElement<HTMLButtonElement>('#restart-button')
const introModal = getElement<HTMLElement>('#intro-modal')
const resultModal = getElement<HTMLElement>('#result-modal')
const startButton = getElement<HTMLButtonElement>('#start-button')
const retryButton = getElement<HTMLButtonElement>('#retry-button')
const nextButton = getElement<HTMLButtonElement>('#next-button')
const toast = getElement<HTMLElement>('#toast')

const scene = new THREE.Scene()
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
scene.background = new THREE.Color(0xb97b53)
scene.fog = new THREE.Fog(0xb97b53, 8.5, 14)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.04
sceneHost.append(renderer.domElement)

const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 40)
const cameraState = {
  yaw: 0.58,
  pitch: 0.38,
  distance: 6.1,
  target: new THREE.Vector3(0, 1.32, 0.05),
}

const hemisphereLight = new THREE.HemisphereLight(0xffedcf, 0x704633, 2.1)
scene.add(hemisphereLight)
const sun = new THREE.DirectionalLight(0xffdfaa, 4.2)
sun.position.set(4.5, 7.5, 2.5)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -6
sun.shadow.camera.right = 6
sun.shadow.camera.top = 7
sun.shadow.camera.bottom = -4
sun.shadow.bias = -0.00025
scene.add(sun)
const warmFill = new THREE.PointLight(0xffb06d, 22, 8, 2)
warmFill.position.set(-3.5, 3.2, 2.7)
scene.add(warmFill)

const workshop = createWorkshop(scene)
const clayMaterial = new THREE.MeshStandardMaterial({
  color: 0xb96643,
  roughness: 0.66,
  metalness: 0,
  side: THREE.DoubleSide,
})
const ghostMaterial = new THREE.MeshBasicMaterial({
  color: 0xfff1d8,
  transparent: true,
  opacity: 0.22,
  side: THREE.FrontSide,
  depthWrite: false,
  depthTest: false,
})

let clay: ClayProfile = createInitialClay()
let orderIndex = 0
let currentOrder = ORDERS[orderIndex]
let wheelState: WheelState = { speed: 0, pedalDown: false, mode: 'camera' }
let previousMode = wheelState.mode
let started = false
let pointerButtons = 0
let selectedNormalizedHeight = 0.58
let selectedIndex = Math.round(selectedNormalizedHeight * (PROFILE_SAMPLES - 1))
let previousPointerX = 0
let previousPointerY = 0
let latestPointerX = 0
let latestPointerY = 0
let pointerKnown = false
let pullAnchorHeight: number | null = null
let ignoreButtonsUntilRelease = false
let structuralPressure = 0
let structuralWarningActive = false
let structuralCooldown = 0
let shapingAccumulator = 0
let lastHintMode = ''
let toastTimer = 0
let restartTimer = 0
let restartConfirming = false
let moisture = 1
let wetting = false
const soundscape = createSoundscape()

function setGameState(state: 'intro' | 'playing' | 'result'): void {
  gameRoot.dataset.gameState = state
}

interface CollapseAnimation {
  from: ClayProfile
  to: ClayProfile
  elapsed: number
  duration: number
  meshAccumulator: number
}

let collapseAnimation: CollapseAnimation | null = null

interface DetachedPiece {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  angularVelocity: THREE.Vector3
  bounces: number
  age: number
}

const detachedPieces: DetachedPiece[] = []

const clayMesh = new THREE.Mesh(createClayGeometry(clay), clayMaterial)
clayMesh.castShadow = true
clayMesh.receiveShadow = true
workshop.spinningGroup.add(clayMesh)

let ghostMesh = createGhostMesh(currentOrder)
workshop.spinningGroup.add(ghostMesh)

const DRY_CLAY_COLOR = new THREE.Color(0xcf9d7c)
const raycaster = new THREE.Raycaster()
const pointerNdc = new THREE.Vector2()

function createGhostMesh(order: OrderDefinition): THREE.Mesh {
  const ghostProfile = buildSafeProfile(order.height, order.outerRadii)
  const mesh = new THREE.Mesh(createClayGeometry(ghostProfile, 32), ghostMaterial)
  mesh.renderOrder = 2
  return mesh
}

function replaceGhost(order: OrderDefinition): void {
  workshop.spinningGroup.remove(ghostMesh)
  ghostMesh.geometry.dispose()
  ghostMesh = createGhostMesh(order)
  workshop.spinningGroup.add(ghostMesh)
}

function updateCamera(): void {
  const horizontal = Math.cos(cameraState.pitch) * cameraState.distance
  camera.position.set(
    cameraState.target.x + Math.sin(cameraState.yaw) * horizontal,
    cameraState.target.y + Math.sin(cameraState.pitch) * cameraState.distance,
    cameraState.target.z + Math.cos(cameraState.yaw) * horizontal,
  )
  camera.lookAt(cameraState.target)
}

function setSelection(normalizedHeight: number): void {
  selectedNormalizedHeight = THREE.MathUtils.clamp(normalizedHeight, 0.03, 0.98)
  selectedIndex = Math.round(selectedNormalizedHeight * (PROFILE_SAMPLES - 1))
}

function updateSelection(clientX: number, clientY: number): void {
  const bounds = renderer.domElement.getBoundingClientRect()
  pointerNdc.set(
    ((clientX - bounds.left) / bounds.width) * 2 - 1,
    -((clientY - bounds.top) / bounds.height) * 2 + 1,
  )
  raycaster.setFromCamera(pointerNdc, camera)
  const hit = raycaster.intersectObject(clayMesh, false)[0]
  if (hit) {
    const local = clayMesh.worldToLocal(hit.point.clone())
    setSelection(local.y / clay.height)
    return
  }

  const baseWorld = workshop.spinningGroup.localToWorld(new THREE.Vector3(0, 0, 0))
  const topWorld = workshop.spinningGroup.localToWorld(new THREE.Vector3(0, clay.height, 0))
  const baseProjected = baseWorld.project(camera)
  const topProjected = topWorld.project(camera)
  const toScreen = (point: THREE.Vector3): { x: number; y: number } => ({
    x: bounds.left + (point.x + 1) * 0.5 * bounds.width,
    y: bounds.top + (1 - point.y) * 0.5 * bounds.height,
  })
  setSelection(projectPointerToAxis({ x: clientX, y: clientY }, toScreen(baseProjected), toScreen(topProjected)))
}

function currentAction(): ShapingAction {
  return shapingActionFromButtons(pointerButtons)
}

function updateHands(deltaSeconds: number): void {
  const action = currentAction()
  const shaping = wheelState.mode === 'shaping' && collapseAnimation === null
  const selectedY = 0.79 + selectedNormalizedHeight * clay.height
  const outer = sampleOuterRadius(clay, selectedNormalizedHeight)
  const inner = sampleInnerRadius(clay, selectedNormalizedHeight)
  const center = new THREE.Vector3(0, selectedY, 0)
  const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  cameraRight.y = 0
  cameraRight.normalize()
  const towardCamera = camera.position.clone().sub(center)
  towardCamera.y = 0
  towardCamera.normalize()
  const { left: leftTarget, right: rightTarget } = computeHandTargets({
    center,
    cameraRight,
    towardCamera,
    outerRadius: outer,
    innerRadius: inner,
    action,
    shaping,
  })

  const blend = 1 - Math.exp(-deltaSeconds * 20)
  workshop.leftHand.position.lerp(leftTarget, blend)
  workshop.rightHand.position.lerp(rightTarget, blend)
  const leftDirection = center.clone().sub(leftTarget).normalize()
  const rightDirection = center.clone().sub(rightTarget).normalize()
  const leftRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), leftDirection)
  const rightRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-1, 0, 0), rightDirection)
  workshop.leftHand.quaternion.slerp(leftRotation, blend)
  workshop.rightHand.quaternion.slerp(rightRotation, blend)
  const activeScale = action === 'idle' ? 1 : 1.035
  workshop.leftHand.scale.lerp(new THREE.Vector3(activeScale, activeScale, activeScale), blend)
  workshop.rightHand.scale.lerp(new THREE.Vector3(activeScale, activeScale, activeScale), blend)

  workshop.contactRing.visible = shaping && pointerKnown
  workshop.contactRing.position.y = selectedNormalizedHeight * clay.height + 0.008
  const ringRadius = outer / 0.82
  workshop.contactRing.scale.set(ringRadius, ringRadius, ringRadius)
  const ringMaterial = workshop.contactRing.material as THREE.MeshBasicMaterial
  ringMaterial.color.setHex(structuralPressure > 0.05 ? 0xff5f45 : action === 'widen' ? 0x9fe1af : action === 'narrow' ? 0xffbd79 : 0xffddb2)
  ringMaterial.opacity = action === 'idle' ? 0.48 : 0.88
}

function applyContinuousShaping(deltaSeconds: number): void {
  if (collapseAnimation) return
  if (wheelState.mode !== 'shaping' || structuralCooldown > 0) {
    structuralPressure = Math.max(0, structuralPressure - deltaSeconds * 2.5)
    return
  }
  const action = currentAction()
  if (action !== 'narrow' && action !== 'widen') {
    structuralPressure = Math.max(0, structuralPressure - deltaSeconds * 2.5)
    structuralWarningActive = false
    shapingAccumulator = 0
    return
  }

  const atLimit = action === 'narrow' ? isNarrowLimit(clay, selectedIndex) : isWidenLimit(clay, selectedIndex)
  if (atLimit) {
    structuralPressure = Math.min(1, structuralPressure + (deltaSeconds / 0.58) * fragility(moisture))
    if (!structuralWarningActive) {
      showToast(action === 'narrow' ? '주의 · 계속 누르면 위쪽 점토가 잘려요' : '주의 · 벽이 더 벌어지면 주저앉아요')
      structuralWarningActive = true
    }
    if (structuralPressure >= 1) {
      if (action === 'narrow') triggerCut()
      else triggerCollapse()
    }
    return
  }

  structuralPressure = Math.max(0, structuralPressure - deltaSeconds * 3)
  structuralWarningActive = false
  shapingAccumulator += deltaSeconds
  if (shapingAccumulator < 1 / 30) return
  const shapingDelta = shapingAccumulator
  shapingAccumulator = 0
  const direction = action === 'narrow' ? -1 : 1
  clay = deformRadius(clay, selectedIndex, direction * shapingDelta * 0.2 * workability(moisture))
  replaceMeshGeometry(clayMesh, clay)
}

function triggerCut(): void {
  const cut = cutClayAt(clay, selectedIndex)
  if (!cut) {
    structuralPressure = 0
    return
  }

  const pieceMesh = new THREE.Mesh(createClayGeometry(cut.detached), clayMaterial)
  pieceMesh.castShadow = true
  pieceMesh.receiveShadow = true
  pieceMesh.position.copy(workshop.spinningGroup.localToWorld(new THREE.Vector3(0, cut.cutHeight, 0)))
  pieceMesh.rotation.y = workshop.spinningGroup.rotation.y
  scene.add(pieceMesh)

  const towardCamera = camera.position.clone().sub(pieceMesh.position)
  towardCamera.y = 0
  towardCamera.normalize()
  const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  cameraRight.y = 0
  cameraRight.normalize()
  detachedPieces.push({
    mesh: pieceMesh,
    velocity: towardCamera.multiplyScalar(0.66).addScaledVector(cameraRight, 0.34).setY(0.44),
    angularVelocity: new THREE.Vector3(1.8, 0.9, -2.1),
    bounces: 0,
    age: 0,
  })

  clay = cut.remaining
  setSelection(0.9)
  replaceMeshGeometry(clayMesh, clay)
  structuralPressure = 0
  structuralWarningActive = false
  structuralCooldown = 0.75
  ignoreButtonsUntilRelease = true
  pointerButtons = 0
  pullAnchorHeight = null
  showToast('점토가 너무 가늘어져 위쪽이 잘려 떨어졌어요')
}

function triggerCollapse(): void {
  collapseAnimation = {
    from: clay,
    to: collapseWideSection(clay, selectedIndex),
    elapsed: 0,
    duration: reduceMotion ? 0.24 : 1.15,
    meshAccumulator: 0,
  }
  wheelState = { ...wheelState, pedalDown: false, speed: Math.min(wheelState.speed, 0.36) }
  structuralPressure = 1
  structuralWarningActive = false
  structuralCooldown = 1.65
  ignoreButtonsUntilRelease = true
  pointerButtons = 0
  pullAnchorHeight = null
  showToast('한계를 넘은 벽이 흔들리기 시작했어요')
}

function updateCollapseAnimation(deltaSeconds: number): void {
  if (!collapseAnimation) return
  collapseAnimation.elapsed += deltaSeconds
  collapseAnimation.meshAccumulator += deltaSeconds
  const rawProgress = Math.min(1, collapseAnimation.elapsed / collapseAnimation.duration)
  const fallingProgress = rawProgress <= 0.18
    ? 0
    : 1 - Math.pow(1 - (rawProgress - 0.18) / 0.82, 3)

  if (collapseAnimation.meshAccumulator >= 1 / 30 || rawProgress >= 1) {
    clay = interpolateClayProfile(collapseAnimation.from, collapseAnimation.to, fallingProgress)
    replaceMeshGeometry(clayMesh, clay)
    collapseAnimation.meshAccumulator = 0
  }

  const wobbleEnvelope = reduceMotion ? 0 : Math.sin(rawProgress * Math.PI)
  clayMesh.rotation.z = Math.sin(rawProgress * Math.PI * 7) * 0.055 * wobbleEnvelope
  clayMesh.rotation.x = Math.cos(rawProgress * Math.PI * 5) * 0.025 * wobbleEnvelope
  clayMesh.position.y = -Math.sin(rawProgress * Math.PI) * 0.045

  if (rawProgress >= 1) {
    clay = collapseAnimation.to
    replaceMeshGeometry(clayMesh, clay)
    clayMesh.rotation.set(0, 0, 0)
    clayMesh.position.set(0, 0, 0)
    collapseAnimation = null
    structuralPressure = 0
    showToast('벽이 주저앉았어요 · 손을 떼고 다시 잡아주세요')
  }
}

function updateDetachedPieces(deltaSeconds: number): void {
  for (let index = detachedPieces.length - 1; index >= 0; index -= 1) {
    const piece = detachedPieces[index]
    piece.age += deltaSeconds
    piece.velocity.y -= 4.3 * deltaSeconds
    piece.mesh.position.addScaledVector(piece.velocity, deltaSeconds)
    piece.mesh.rotation.x += piece.angularVelocity.x * deltaSeconds
    piece.mesh.rotation.y += piece.angularVelocity.y * deltaSeconds
    piece.mesh.rotation.z += piece.angularVelocity.z * deltaSeconds

    if (piece.mesh.position.y <= 0.43 && piece.velocity.y < 0 && piece.bounces < 2) {
      piece.mesh.position.y = 0.43
      piece.velocity.y *= -0.28
      piece.velocity.x *= 0.72
      piece.velocity.z *= 0.72
      piece.angularVelocity.multiplyScalar(0.7)
      piece.bounces += 1
    } else if (piece.mesh.position.y <= 0.43 && piece.bounces >= 2) {
      piece.mesh.position.y = 0.43
      piece.velocity.set(0, 0, 0)
      piece.angularVelocity.multiplyScalar(Math.max(0, 1 - deltaSeconds * 5))
    }

    if (piece.age > 9) {
      scene.remove(piece.mesh)
      piece.mesh.geometry.dispose()
      detachedPieces.splice(index, 1)
    }
  }
}

function clearDetachedPieces(): void {
  detachedPieces.forEach((piece) => {
    scene.remove(piece.mesh)
    piece.mesh.geometry.dispose()
  })
  detachedPieces.length = 0
}

function updateOrderCard(): void {
  const progress = ORDERS.map((_, index) => {
    const className = index === orderIndex ? 'active' : index < orderIndex ? 'done' : ''
    return `<span class="${className}"></span>`
  }).join('')
  orderCard.innerHTML = `
    <p class="order-kicker">${currentOrder.subtitle.toUpperCase()}</p>
    <h2 class="order-title">${currentOrder.name}</h2>
    <p class="order-description">${currentOrder.description}</p>
    <div class="silhouette-wrap">${silhouetteSvg(currentOrder.outerRadii, currentOrder.height, currentOrder.accent)}</div>
    <div class="order-progress">${progress}<b class="order-count">${orderIndex + 1} / ${ORDERS.length}</b></div>
  `
}

function silhouetteSvg(radii: number[], height: number, color: string, second?: { radii: number[]; height: number }): string {
  const firstPath = profilePath(radii, height)
  const secondPath = second ? profilePath(second.radii, second.height) : ''
  return `<svg viewBox="0 0 200 220" role="img" aria-label="도자기 목표 실루엣">
    <path d="${firstPath}" fill="${color}" class="target-fill"></path>
    <path d="${firstPath}" stroke="${color}" class="target-line"></path>
    ${second ? `<path d="${secondPath}" class="player-line"></path><path d="${firstPath}" class="result-target-line"></path>` : ''}
  </svg>`
}

function profilePath(radii: number[], height: number): string {
  const centerX = 100
  const bottomY = 202
  const scaleX = 62
  const scaleY = 86
  const maxHeight = 2.1
  const heightPixels = (height / maxHeight) * scaleY * 2
  const last = radii.length - 1
  const left = radii.map((radius, index) => {
    const y = bottomY - (index / last) * heightPixels
    return `${centerX - radius * scaleX},${y}`
  })
  const right = [...radii].reverse().map((radius, reverseIndex) => {
    const index = last - reverseIndex
    const y = bottomY - (index / last) * heightPixels
    return `${centerX + radius * scaleX},${y}`
  })
  return `M ${left[0]} L ${left.slice(1).join(' L ')} L ${right.join(' L ')} Z`
}

function updateHud(): void {
  const action = currentAction()
  const maxRadius = Math.max(...clay.outerRadii)
  rpmValue.textContent = String(Math.round(wheelState.speed * 120))
  speedFill.style.width = `${Math.round(wheelState.speed * 100)}%`
  heightValue.textContent = `${(clay.height * 12).toFixed(1)} cm`
  widthValue.textContent = `${(maxRadius * 24).toFixed(1)} cm`
  const modeCopy = collapseAnimation
    ? '주저앉는 중'
    : wheelState.mode === 'camera'
    ? '시점 조절'
    : action === 'narrow'
      ? '좁히는 중'
      : action === 'widen'
        ? '넓히는 중'
        : action === 'pull'
          ? '높이 잡는 중'
          : '성형 중'
  modeName.textContent = modeCopy
  renderer.domElement.classList.toggle('shaping', wheelState.mode === 'shaping' && collapseAnimation === null)
  modePanel.classList.toggle('is-shaping', wheelState.mode === 'shaping' && collapseAnimation === null)
  modePanel.classList.toggle('is-warning', structuralPressure > 0.08)
  modePanel.classList.toggle('is-collapsing', collapseAnimation !== null)
  if (lastHintMode !== wheelState.mode) {
    controlHints.innerHTML = wheelState.mode === 'camera'
      ? `<div class="hint"><span class="mousecap">좌</span>회전</div><div class="hint"><span class="mousecap">우</span>이동</div><div class="hint"><span class="mousecap">휠</span>확대</div>`
      : `<div class="hint"><span class="mousecap">좌</span>좁히기</div><div class="hint"><span class="mousecap">우</span>넓히기</div><div class="hint"><span class="mousecap">양쪽</span>높이</div><div class="hint"><span class="mousecap">W</span>물</div>`
    lastHintMode = wheelState.mode
  }

  const heightPercent = Math.round(selectedNormalizedHeight * 100)
  contactState.textContent = collapseAnimation
    ? '손을 물리고 벽이 내려앉는 모습을 확인하세요'
    : wheelState.mode === 'camera'
    ? '물레가 돌면 손이 커서를 따라갑니다'
    : ignoreButtonsUntilRelease
      ? '손을 떼고 다시 잡아주세요'
      : action === 'narrow'
        ? `높이 ${heightPercent}% · 바깥손으로 좁히는 중`
        : action === 'widen'
          ? `높이 ${heightPercent}% · 안쪽손으로 넓히는 중`
          : action === 'pull'
            ? `높이 ${heightPercent}% · 잡은 단면을 유지하는 중`
            : `작업 높이 ${heightPercent}% · 커서를 움직여 선택`
  contactDot.className = `contact-dot ${wheelState.mode === 'shaping' ? `is-${action}` : ''}`
  pressureFill.style.width = `${Math.round(structuralPressure * 100)}%`
  pressureValue.textContent = collapseAnimation ? '붕괴' : structuralPressure >= 0.72 ? '위험' : structuralPressure > 0.08 ? '주의' : '안정'
  moistureFill.style.width = `${Math.round(moisture * 100)}%`
  moistureValue.textContent = moistureLabel(moisture)
  modePanel.classList.toggle('is-dry', moisture < 0.3)

  const canFinish = started && wheelState.mode === 'camera' && wheelState.speed <= CAMERA_ENTER_SPEED && resultModal.hidden && collapseAnimation === null
  finishButton.disabled = !canFinish
  finishButton.textContent = canFinish ? '완성하기' : '물레를 멈춰주세요'
}

function showToast(message: string): void {
  toast.textContent = message
  toast.classList.add('show')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1500)
}

function resetClay(): void {
  collapseAnimation = null
  clayMesh.rotation.set(0, 0, 0)
  clayMesh.position.set(0, 0, 0)
  clay = createInitialClay()
  replaceMeshGeometry(clayMesh, clay)
  clearDetachedPieces()
  wheelState = { speed: 0, pedalDown: false, mode: 'camera' }
  pointerButtons = 0
  pullAnchorHeight = null
  ignoreButtonsUntilRelease = false
  structuralPressure = 0
  structuralWarningActive = false
  structuralCooldown = 0
  shapingAccumulator = 0
  moisture = 1
  wetting = false
  selectedNormalizedHeight = 0.58
  selectedIndex = Math.round(selectedNormalizedHeight * (PROFILE_SAMPLES - 1))
  resetRestartConfirmation()
}

function resetRestartConfirmation(): void {
  restartConfirming = false
  window.clearTimeout(restartTimer)
  restartButton.classList.remove('is-confirming')
  restartButton.innerHTML = '<span>↻</span> 다시 시작'
}

function requestRestart(): void {
  if (!restartConfirming) {
    restartConfirming = true
    restartButton.classList.add('is-confirming')
    restartButton.textContent = '한 번 더 누르면 재시작'
    showToast('현재 점토를 처음 상태로 되돌릴까요?')
    restartTimer = window.setTimeout(resetRestartConfirmation, 2200)
    return
  }

  resetClay()
  setGameState('playing')
  showToast(`${currentOrder.name} 점토를 처음부터 다시 시작해요`)
}

function showResult(score: ScoreBreakdown): void {
  getElement<HTMLElement>('#result-eyebrow').textContent = `${currentOrder.name} · 작업 결과`
  getElement<HTMLElement>('#result-title').textContent = score.total >= 90
    ? '주문서보다 더 아름다운 곡선이에요.'
    : score.total >= 72
      ? '손끝이 만든 좋은 곡선이에요.'
      : '흙과 조금 더 이야기를 나눠볼까요?'
  getElement<HTMLElement>('#total-score').textContent = String(score.total)
  const comparison = getElement<HTMLElement>('#comparison')
  comparison.innerHTML = silhouetteSvg(
    currentOrder.outerRadii,
    currentOrder.height,
    currentOrder.accent,
    { radii: clay.outerRadii, height: clay.height },
  )
  const scoreList = getElement<HTMLElement>('#score-list')
  scoreList.innerHTML = [
    ['실루엣', score.silhouette, '형태의 바깥 곡선'],
    ['높이', score.height, '주문과의 비율'],
    ['매끄러움', score.smoothness, '표면의 고른 정도'],
  ].map(([label, value, description]) => `
    <div class="score-row">
      <div class="score-row-top"><span>${label}<small> · ${description}</small></span><strong>${value}</strong></div>
      <div class="score-bar"><i style="width:${value}%"></i></div>
    </div>
  `).join('')
  nextButton.textContent = orderIndex === ORDERS.length - 1 ? '첫 주문으로' : '다음 주문'
  resultModal.hidden = false
  setGameState('result')
}

function finishWork(): void {
  if (finishButton.disabled) return
  pointerButtons = 0
  wheelState.pedalDown = false
  showResult(scoreClay(clay, currentOrder))
}

renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault())
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (!started || !resultModal.hidden) return
  event.preventDefault()
  previousPointerX = event.clientX
  previousPointerY = event.clientY
  latestPointerX = event.clientX
  latestPointerY = event.clientY
  pointerKnown = true
  if (ignoreButtonsUntilRelease) {
    pointerButtons = 0
    return
  }
  pointerButtons = event.buttons
  if (wheelState.mode === 'shaping') {
    updateSelection(event.clientX, event.clientY)
    if (currentAction() === 'pull') pullAnchorHeight = selectedNormalizedHeight
  }
  renderer.domElement.setPointerCapture(event.pointerId)
})

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!started || !resultModal.hidden) return
  const deltaX = event.clientX - previousPointerX
  const deltaY = event.clientY - previousPointerY
  latestPointerX = event.clientX
  latestPointerY = event.clientY
  pointerKnown = true
  if (ignoreButtonsUntilRelease) {
    pointerButtons = 0
    if (event.buttons === 0) ignoreButtonsUntilRelease = false
    previousPointerX = event.clientX
    previousPointerY = event.clientY
    return
  }
  pointerButtons = event.buttons

  if (wheelState.mode === 'camera' && pointerButtons !== 0) {
    if ((pointerButtons & 1) !== 0) {
      cameraState.yaw -= deltaX * 0.006
      cameraState.pitch = THREE.MathUtils.clamp(cameraState.pitch - deltaY * 0.005, 0.18, 1.02)
    } else if ((pointerButtons & 2) !== 0) {
      cameraState.target.x = THREE.MathUtils.clamp(cameraState.target.x - deltaX * 0.004, -0.8, 0.8)
      cameraState.target.y = THREE.MathUtils.clamp(cameraState.target.y + deltaY * 0.004, 0.8, 1.8)
    }
  } else if (wheelState.mode === 'shaping') {
    const both = (pointerButtons & 1) !== 0 && (pointerButtons & 2) !== 0
    if (both) {
      if (pullAnchorHeight === null) {
        updateSelection(event.clientX, event.clientY)
        pullAnchorHeight = selectedNormalizedHeight
      }
      setSelection(pullAnchorHeight)
      clay = changeHeight(clay, -deltaY * 0.0045)
      replaceMeshGeometry(clayMesh, clay)
    } else {
      pullAnchorHeight = null
      updateSelection(event.clientX, event.clientY)
    }
  }

  previousPointerX = event.clientX
  previousPointerY = event.clientY
})

const releasePointer = (event: PointerEvent): void => {
  if (ignoreButtonsUntilRelease && event.buttons === 0) ignoreButtonsUntilRelease = false
  pointerButtons = ignoreButtonsUntilRelease ? 0 : event.buttons
  if (currentAction() !== 'pull') pullAnchorHeight = null
  if (pointerButtons === 0 && renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId)
  }
}
renderer.domElement.addEventListener('pointerup', releasePointer)
renderer.domElement.addEventListener('pointercancel', releasePointer)
window.addEventListener('pointerup', (event) => {
  if (event.buttons === 0) {
    pointerButtons = 0
    pullAnchorHeight = null
    ignoreButtonsUntilRelease = false
  }
})
renderer.domElement.addEventListener('wheel', (event) => {
  if (!started || wheelState.mode !== 'camera') return
  event.preventDefault()
  cameraState.distance = THREE.MathUtils.clamp(cameraState.distance + event.deltaY * 0.004, 4.2, 8.1)
}, { passive: false })

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyW') {
    if (!started || !resultModal.hidden || wetting) return
    wetting = true
    soundscape.splash()
    return
  }
  if (event.code !== 'Space') return
  event.preventDefault()
  if (started && resultModal.hidden) wheelState.pedalDown = true
})
window.addEventListener('keyup', (event) => {
  if (event.code === 'KeyW') {
    wetting = false
    return
  }
  if (event.code !== 'Space') return
  event.preventDefault()
  wheelState.pedalDown = false
})
window.addEventListener('blur', () => {
  wheelState.pedalDown = false
  wetting = false
  pointerButtons = 0
  pullAnchorHeight = null
  ignoreButtonsUntilRelease = false
})

startButton.addEventListener('click', () => {
  introModal.hidden = true
  started = true
  setGameState('playing')
  soundscape.start()
  renderer.domElement.focus()
  showToast('Space를 눌러 물레를 돌려보세요')
})
finishButton.addEventListener('click', finishWork)
restartButton.addEventListener('click', requestRestart)
soundButton.addEventListener('click', () => {
  soundscape.setMuted(!soundscape.muted)
  soundButton.setAttribute('aria-pressed', String(soundscape.muted))
  soundButton.innerHTML = soundscape.muted ? '<span>♪</span> 소리 켜기' : '<span>♪</span> 소리 끄기'
})
retryButton.addEventListener('click', () => {
  resultModal.hidden = true
  resetClay()
  setGameState('playing')
  showToast(`${currentOrder.name}, 다시 천천히 빚어봐요`)
})
nextButton.addEventListener('click', () => {
  orderIndex = (orderIndex + 1) % ORDERS.length
  currentOrder = ORDERS[orderIndex]
  resultModal.hidden = true
  resetClay()
  setGameState('playing')
  replaceGhost(currentOrder)
  updateOrderCard()
  showToast(`${currentOrder.name} 주문이 도착했어요`)
})

const resizeObserver = new ResizeObserver(() => {
  const width = sceneHost.clientWidth
  const height = sceneHost.clientHeight
  renderer.setSize(width, height, false)
  camera.aspect = width / Math.max(1, height)
  camera.updateProjectionMatrix()
})
resizeObserver.observe(sceneHost)

updateCamera()
updateOrderCard()
updateHud()

const clock = new THREE.Clock()
function animate(): void {
  const deltaSeconds = Math.min(clock.getDelta(), 1 / 30)
  structuralCooldown = Math.max(0, structuralCooldown - deltaSeconds)
  wheelState = updateWheel(wheelState, deltaSeconds)
  workshop.spinningGroup.rotation.y -= wheelState.speed * deltaSeconds * 7.2
  workshop.pedal.rotation.x = THREE.MathUtils.lerp(
    workshop.pedal.rotation.x,
    wheelState.pedalDown ? -0.22 : 0.08 + Math.sin(performance.now() * 0.006) * wheelState.speed * 0.07,
    1 - Math.exp(-deltaSeconds * 10),
  )

  const shapingNow = wheelState.mode === 'shaping' && collapseAnimation === null
  const wasDry = moisture < 0.3
  moisture = updateMoisture({
    moisture,
    deltaSeconds,
    spinning: wheelState.speed > CAMERA_ENTER_SPEED,
    shaping: shapingNow && currentAction() !== 'idle',
    wetting,
  })
  if (wasDry && moisture >= 0.3) showToast('흙이 다시 촉촉해졌어요')
  else if (!wasDry && moisture < 0.3) showToast('흙이 메말라가요 · W를 눌러 물을 묻히세요')
  clayMaterial.color.setHex(0xb96643).lerp(DRY_CLAY_COLOR, 1 - moisture)
  soundscape.update(wheelState.speed, currentAction(), shapingNow, deltaSeconds)

  applyContinuousShaping(deltaSeconds)
  updateCollapseAnimation(deltaSeconds)
  updateDetachedPieces(deltaSeconds)
  updateHands(deltaSeconds)
  updateCamera()
  updateHud()

  if (wheelState.mode !== previousMode) {
    if (wheelState.mode === 'shaping' && pointerKnown) updateSelection(latestPointerX, latestPointerY)
    if (wheelState.mode === 'camera') {
      ignoreButtonsUntilRelease = pointerButtons !== 0
      pointerButtons = 0
      pullAnchorHeight = null
    }
    showToast(wheelState.mode === 'shaping' ? '성형 모드 · 커서 높이에서 흙을 만지세요' : '물레 정지 · 시점을 조절할 수 있어요')
    previousMode = wheelState.mode
  }

  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
animate()
