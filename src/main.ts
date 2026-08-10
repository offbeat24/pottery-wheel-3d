import * as THREE from 'three'
import './styles.css'
import {
  PROFILE_SAMPLES,
  cloneProfile,
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
  smoothProfile,
} from './game/clay'
import { projectPointerToAxis, shapingActionFromButtons } from './game/input'
import { computeHandTargets } from './game/handPlacement'
import { parseEarnings, parseGallery } from './game/gallery'
import { ORDERS, availableOrders } from './game/orders'
import { FIRING_SECONDS, FIRING_WINDOW, firingQuality, paceMultiplier, scoreClay, sellPrice } from './game/scoring'
import { CARVING_KNIFE, SHOP_CATEGORY_LABEL, SHOP_ITEMS, bestOwned, parseOwned, priceMultiplier } from './game/shop'
import type { ShopCategory } from './game/shop'
import type { ClayProfile, OrderDefinition, ScoreBreakdown, ShapingAction, WheelState } from './game/types'
import { MAX_TEARING, fragility, moistureLabel, surfaceTearing, updateMoisture, workability } from './game/moisture'
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
      <div class="dimension-row"><span>작업 시간</span><strong id="pace-value">0초</strong></div>
      <div class="dimension-row"><span>가마</span><strong id="kiln-value">비어 있음</strong></div>
      <div class="dimension-row"><span>공방 수익</span><strong id="earnings-value">0원</strong></div>
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
      <button class="restart-button" id="shop-button"><span>￦</span> 공방 상점</button>
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

    <section class="modal-layer" id="shop-modal" hidden>
      <div class="result-card shop-card">
        <div class="result-head">
          <div><p class="eyebrow">공방 상점</p><h2>번 돈으로 공방을 갖춰보세요.</h2></div>
          <div class="total-score"><strong id="shop-earnings">0</strong><span>원</span></div>
        </div>
        <div class="shop-list" id="shop-list"></div>
        <div class="result-actions shop-actions"><button class="ghost-button" id="reset-button">처음부터 다시</button><button class="primary-button" id="shop-close">작업으로 돌아가기</button></div>
      </div>
    </section>

    <section class="modal-layer" id="result-modal" hidden>
      <div class="result-card">
        <div class="result-head">
          <div><p class="eyebrow" id="result-eyebrow">작업 결과</p><h2 id="result-title">손끝이 만든 좋은 곡선이에요.</h2></div>
          <div class="total-score"><strong id="total-score">84</strong><span>100점 만점</span><b id="result-price">14,000원</b></div>
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
const earningsValue = getElement<HTMLElement>('#earnings-value')
const kilnValue = getElement<HTMLElement>('#kiln-value')
const paceValue = getElement<HTMLElement>('#pace-value')
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
const shopButton = getElement<HTMLButtonElement>('#shop-button')
const shopModal = getElement<HTMLElement>('#shop-modal')
const shopList = getElement<HTMLElement>('#shop-list')
const shopEarnings = getElement<HTMLElement>('#shop-earnings')
const shopClose = getElement<HTMLButtonElement>('#shop-close')
const resetButton = getElement<HTMLButtonElement>('#reset-button')
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

const workshop = createWorkshop(scene, ORDERS.length)
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
let activeOrders = ORDERS
let currentOrder = ORDERS[orderIndex]
let wheelState: WheelState = { speed: 0, pedalDown: false, mode: 'camera' }
let previousMode = wheelState.mode
let started = false
let pointerButtons = 0
let selectedNormalizedHeight = 0.58
let selectedIndex = Math.round(selectedNormalizedHeight * (PROFILE_SAMPLES - 1))
let previousPointerX = 0
let previousPointerY = 0
let pressStartX = 0
let pressStartY = 0
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
let surfaceDamage = 0
// 완성까지 걸린 시간과 그중 실제로 흙을 만진 시간. 둘이 판매가 배수를 만든다.
let workSeconds = 0
let shapedSeconds = 0
// 조각칼로 새긴 높이를 새긴 순서대로 담는다. 기법 점수가 위치와 순서를 여기서 읽는다.
let carvings: number[] = []
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

const GALLERY_KEY = 'pottery-wheel-3d:gallery'
const EARNINGS_KEY = 'pottery-wheel-3d:earnings'
const OWNED_KEY = 'pottery-wheel-3d:owned'
const PIECE_SCALE = 0.26
type ExhibitedPiece = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
const exhibited: (ExhibitedPiece | null)[] = ORDERS.map(() => null)
const gallery = parseGallery(readStored(GALLERY_KEY))
let earnings = parseEarnings(readStored(EARNINGS_KEY))
let pendingSaleIndex = -1
let saleTimer = 0
const owned = parseOwned(readStored(OWNED_KEY))
let hoveredPiece: ExhibitedPiece | null = null
let flight: { piece: ExhibitedPiece; from: THREE.Vector3; to: THREE.Vector3; progress: number } | null = null
let kiln: {
  slotIndex: number
  profile: ClayProfile
  damage: number
  pace: number
  carvings: number[]
  elapsed: number
} | null = null
let saleHintShown = Object.keys(gallery).length > 0
let resetConfirming = false
let resetTimer = 0
updateEarnings()
ORDERS.forEach((order, index) => {
  const saved = gallery[order.id]
  if (saved) placePiece(index, buildSafeProfile(saved.height, saved.outerRadii))
})
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
  const tearing = surfaceTearing(moisture)
  surfaceDamage = Math.min(1, surfaceDamage + (tearing / MAX_TEARING) * shapingDelta * 0.5)
  clay = tearDrySurface(clay, tearing)
  replaceMeshGeometry(clayMesh, clay)
}

// 마른 흙을 밀면 손이 닿은 자리가 튼다. 매끄러움 점수로 바로 이어지고 물을 묻혀 다듬어야 사라진다.
function tearDrySurface(profile: ClayProfile, amount: number): ClayProfile {
  if (amount <= 0) return profile
  const radii = [...profile.outerRadii]
  const from = Math.max(0, selectedIndex - 3)
  const to = Math.min(radii.length - 1, selectedIndex + 3)
  for (let index = from; index <= to; index += 1) {
    radii[index] += index % 2 === 0 ? amount : -amount
  }
  return buildSafeProfile(profile.height, radii)
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
  const progress = activeOrders.map((_, index) => {
    const className = index === orderIndex ? 'active' : index < orderIndex ? 'done' : ''
    return `<span class="${className}"></span>`
  }).join('')
  const technique = currentOrder.technique
  const techniqueLine = technique
    ? `<p class="order-technique">E 새김 · 높이 ${technique.grooves.map((groove) => `${Math.round(groove * 100)}%`).join(' · ')}${technique.ordered ? '<br>아래에서 위 순서로' : ''}</p>`
    : ''
  orderCard.innerHTML = `
    <p class="order-kicker">${currentOrder.subtitle.toUpperCase()}</p>
    <h2 class="order-title">${currentOrder.name}</h2>
    <p class="order-description">${currentOrder.description}</p>
    ${techniqueLine}
    <div class="silhouette-wrap">${silhouetteSvg(currentOrder.outerRadii, currentOrder.height, currentOrder.accent)}</div>
    <div class="order-progress">${progress}<b class="order-count">${orderIndex + 1} / ${activeOrders.length}</b></div>
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
      : `<div class="hint"><span class="mousecap">좌</span>좁히기</div><div class="hint"><span class="mousecap">우</span>넓히기</div><div class="hint"><span class="mousecap">양쪽</span>높이</div><div class="hint"><span class="mousecap">W</span>물</div>${owned.includes(CARVING_KNIFE) ? `<div class="hint"><span class="mousecap">E</span>새김</div>` : ''}`
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
  if (!kiln) kilnValue.textContent = '비어 있음'
  else {
    const left = Math.round(FIRING_SECONDS - kiln.elapsed)
    kilnValue.textContent = left > 0 ? `${left}초 남음` : left > -FIRING_WINDOW ? '지금 꺼내세요' : `${-left}초 지남`
  }
  paceValue.textContent = formatSeconds(workSeconds)
  moistureFill.style.width = `${Math.round(moisture * 100)}%`
  moistureValue.textContent = moistureLabel(moisture)
  modePanel.classList.toggle('is-dry', moisture < 0.3)

  const canFinish = started && wheelState.mode === 'camera' && wheelState.speed <= CAMERA_ENTER_SPEED && resultModal.hidden && collapseAnimation === null
  finishButton.disabled = !canFinish
  finishButton.textContent = canFinish ? '완성하기' : '물레를 멈춰주세요'
}

function formatSeconds(seconds: number): string {
  const whole = Math.floor(seconds)
  if (whole < 60) return `${whole}초`
  return `${Math.floor(whole / 60)}분 ${String(whole % 60).padStart(2, '0')}초`
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
  surfaceDamage = 0
  workSeconds = 0
  shapedSeconds = 0
  carvings = []
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

function showResult(score: ScoreBreakdown, pace: number): void {
  const paceLabel = `${formatSeconds(workSeconds)} · 작업 속도 ×${pace.toFixed(2)}`
  getElement<HTMLElement>('#result-eyebrow').textContent = `${currentOrder.name} · ${paceLabel}`
  getElement<HTMLElement>('#result-title').textContent = score.total >= 90
    ? '주문서보다 더 아름다운 곡선이에요.'
    : score.total >= 72
      ? '손끝이 만든 좋은 곡선이에요.'
      : '흙과 조금 더 이야기를 나눠볼까요?'
  getElement<HTMLElement>('#total-score').textContent = String(score.total)
  getElement<HTMLElement>('#result-price').textContent = `${sellPrice(score, priceMultiplier(owned) * pace).toLocaleString('ko-KR')}원에 팔 수 있어요`
  const comparison = getElement<HTMLElement>('#comparison')
  comparison.innerHTML = silhouetteSvg(
    currentOrder.outerRadii,
    currentOrder.height,
    currentOrder.accent,
    { radii: clay.outerRadii, height: clay.height },
  )
  const scoreList = getElement<HTMLElement>('#score-list')
  const rows: [string, number, string][] = [
    ['실루엣', score.silhouette, '형태의 바깥 곡선'],
    ['높이', score.height, '주문과의 비율'],
    ['매끄러움', score.smoothness, '표면의 고른 정도'],
  ]
  if (currentOrder.technique) rows.push(['기법', score.technique, '새김의 자리와 순서'])
  scoreList.innerHTML = rows.map(([label, value, description]) => `
    <div class="score-row">
      <div class="score-row-top"><span>${label}<small> · ${description}</small></span><strong>${value}</strong></div>
      <div class="score-bar"><i style="width:${value}%"></i></div>
    </div>
  `).join('')
  nextButton.textContent = orderIndex === activeOrders.length - 1 ? '첫 주문으로' : '다음 주문'
  resultModal.hidden = false
  setGameState('result')
}

function finishWork(): void {
  if (finishButton.disabled) return
  pointerButtons = 0
  wheelState.pedalDown = false
  const pace = paceMultiplier(workSeconds, shapedSeconds)
  loadKiln(ORDERS.indexOf(currentOrder), pace)
  showResult(scoreClay(clay, currentOrder, surfaceDamage, carvings), pace)
}

// 완성한 작품을 선반에 올린다. 같은 주문을 다시 빚으면 그 자리의 작품만 교체한다.
// 완성한 작품은 곧장 선반으로 가지 않고 가마에서 구워진다. 굽는 동안 다음 주문을 빚는다.
function loadKiln(slotIndex: number, pace: number): void {
  if (kiln) unloadKiln()
  kiln = { slotIndex, profile: cloneProfile(clay), damage: surfaceDamage, pace, carvings: [...carvings], elapsed: 0 }
  workshop.setKilnFiring(true)
  showToast(`${ORDERS[slotIndex].name} · 가마에 넣었어요 · ${FIRING_SECONDS}초 뒤에 꺼내세요`)
}

function updateKiln(deltaSeconds: number): void {
  if (!kiln) return
  const wasOverdue = kiln.elapsed > FIRING_SECONDS + FIRING_WINDOW
  kiln.elapsed += deltaSeconds
  const overdue = kiln.elapsed > FIRING_SECONDS + FIRING_WINDOW
  if (overdue !== wasOverdue) workshop.setKilnFiring(true, overdue)
  if (!wasOverdue && overdue) showToast('가마가 과열되고 있어요 · 어서 꺼내세요')
}

// 가마를 클릭하면 꺼낸다. 알맞은 때보다 이르거나 늦으면 굽기 완성도가 떨어진다.
function unloadKiln(): void {
  if (!kiln) return
  const { slotIndex, profile, damage, pace, carvings: saved, elapsed } = kiln
  const quality = firingQuality(elapsed)
  kiln = null
  workshop.setKilnFiring(false)
  exhibit(slotIndex, profile, damage, quality, pace, saved, workshop.kilnMouth)
  const label = quality >= 1 ? '알맞게 구웠어요' : elapsed < FIRING_SECONDS ? '설익었어요' : '너무 오래 구웠어요'
  showToast(`${ORDERS[slotIndex].name} · ${label} · 굽기 ${Math.round(quality * 100)}%`)
}

function exhibit(
  slotIndex: number,
  profile: ClayProfile,
  damage: number,
  firing: number,
  pace: number,
  carved: number[],
  from: THREE.Vector3,
): void {
  // 앞선 작품이 아직 날아가는 중이면 먼저 제자리에 앉힌다. 그대로 두면 공중에 남는다.
  settleFlight()
  gallery[ORDERS[slotIndex].id] = {
    height: profile.height,
    outerRadii: [...profile.outerRadii],
    damage,
    firing,
    pace,
    carvings: [...carved],
  }
  const piece = placePiece(slotIndex, profile)
  // 결과 화면이 닫힌 뒤 작품이 물레에서 선반으로 옮겨가는 것을 보여준다.
  flight = {
    piece,
    from: from.clone(),
    to: workshop.displaySlots[slotIndex].clone(),
    progress: 0,
  }
  applyFlight()
  saveGallery()
  if (exhibited.every(Boolean)) showToast(`${ORDERS.length}점을 모두 완성해 선반에 전시했어요`)
}

function applyFlight(): void {
  if (!flight) return
  const eased = flight.progress * flight.progress * (3 - 2 * flight.progress)
  flight.piece.position.lerpVectors(flight.from, flight.to, eased)
  flight.piece.position.y += Math.sin(Math.PI * eased) * 0.7
  flight.piece.scale.setScalar(1 - (1 - PIECE_SCALE) * eased)
  flight.piece.rotation.y = eased * Math.PI * 2
}

function updateFlight(deltaSeconds: number): void {
  if (!flight || !resultModal.hidden) return
  flight.progress = Math.min(1, flight.progress + deltaSeconds / 1.1)
  applyFlight()
  if (flight.progress < 1) return
  settleFlight()
  if (!saleHintShown) {
    saleHintShown = true
    showToast('선반의 작품을 클릭하면 팔 수 있어요')
  }
}

function settleFlight(): void {
  if (!flight) return
  flight.progress = 1
  applyFlight()
  flight.piece.rotation.y = exhibited.indexOf(flight.piece) * 0.7
  flight = null
}

function placePiece(slotIndex: number, profile: ClayProfile): ExhibitedPiece {
  const previous = exhibited[slotIndex]
  if (previous) {
    if (flight?.piece === previous) flight = null
    if (hoveredPiece === previous) setHoveredPiece(null)
    scene.remove(previous)
    previous.geometry.dispose()
    previous.material.dispose()
  }
  const piece = new THREE.Mesh(
    createClayGeometry(profile, 28),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(ORDERS[slotIndex].accent).multiplyScalar(0.82), roughness: 0.38 }),
  )
  piece.scale.setScalar(PIECE_SCALE)
  piece.position.copy(workshop.displaySlots[slotIndex])
  piece.rotation.y = slotIndex * 0.7
  piece.castShadow = true
  scene.add(piece)
  exhibited[slotIndex] = piece
  return piece
}

function renderShop(): void {
  shopEarnings.textContent = earnings.toLocaleString('ko-KR')
  const categories: ShopCategory[] = ['tool', 'studio', 'shelf']
  shopList.innerHTML = categories.map((category) => {
    const rows = SHOP_ITEMS.filter((item) => item.category === category).map((item) => {
      const isOwned = owned.includes(item.id)
      const affordable = earnings >= item.price
      const label = isOwned ? '보유 중' : `${item.price.toLocaleString('ko-KR')}원`
      return `
        <div class="shop-row${isOwned ? ' is-owned' : ''}">
          <div><strong>${item.name}</strong><small>${item.description}</small></div>
          <button class="secondary-button" data-shop-id="${item.id}" ${isOwned || !affordable ? 'disabled' : ''}>${label}</button>
        </div>
      `
    }).join('')
    return `<section class="shop-section"><h3>${SHOP_CATEGORY_LABEL[category]}</h3>${rows}</section>`
  }).join('')
}

// 되돌릴 수 없는 초기화라 두 번 눌러야 실행한다.
function requestFullReset(): void {
  if (!resetConfirming) {
    resetConfirming = true
    resetButton.textContent = '한 번 더 누르면 삭제'
    resetButton.classList.add('is-confirming')
    resetTimer = window.setTimeout(() => {
      resetConfirming = false
      resetButton.textContent = '처음부터 다시'
      resetButton.classList.remove('is-confirming')
    }, 2600)
    return
  }
  window.clearTimeout(resetTimer)
  for (const key of [GALLERY_KEY, EARNINGS_KEY, OWNED_KEY]) {
    try {
      localStorage.removeItem(key)
    } catch {
      // 지우지 못해도 새로고침은 진행한다.
    }
  }
  window.location.reload()
}

function buyItem(itemId: string): void {
  const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId)
  if (!item || owned.includes(item.id) || earnings < item.price) return
  earnings -= item.price
  owned.push(item.id)
  saveEarnings()
  saveOwned()
  updateEarnings()
  applyOwnedEffects()
  renderShop()
  showToast(`${item.name} · 구입 완료`)
}

function applyOwnedEffects(): void {
  const studio = bestOwned(owned, 'studio')?.studio
  if (studio) {
    workshop.applyStudio(studio)
    scene.background = new THREE.Color(studio.background)
    scene.fog = new THREE.Fog(studio.background, 9.5, 16)
    hemisphereLight.color.setHex(0xfff4e2)
    hemisphereLight.intensity = studio.hemisphereIntensity
    sun.intensity = studio.sunIntensity
  }
  const shelf = bestOwned(owned, 'shelf')?.shelf
  if (shelf) workshop.applyShelf(shelf)
  const previousOrder = currentOrder
  activeOrders = availableOrders(owned)
  orderIndex = Math.max(0, activeOrders.indexOf(previousOrder))
  currentOrder = activeOrders[orderIndex]
  lastHintMode = ''
  updateOrderCard()
}

// 조각칼로 선택한 높이에 가는 홈을 새긴다. 손 성형보다 훨씬 좁게 파인다.
function carveGroove(): void {
  if (!owned.includes(CARVING_KNIFE)) {
    showToast('조각칼이 있어야 문양을 새길 수 있어요 · 공방 상점')
    return
  }
  if (!started || !resultModal.hidden || wheelState.mode !== 'shaping' || collapseAnimation !== null) return
  clay = deformRadius(clay, selectedIndex, -0.05 * workability(moisture), 1.1)
  replaceMeshGeometry(clayMesh, clay)
  soundscape.splash()
  // 같은 자리를 더 파는 것은 새 홈이 아니다. 기록이 늘면 군더더기로 깎인다.
  const sameGroove = carvings.some((height) => Math.abs(height - selectedNormalizedHeight) < 0.03)
  if (!sameGroove) carvings.push(selectedNormalizedHeight)
  showToast(`높이 ${Math.round(selectedNormalizedHeight * 100)}%에 홈을 새겼어요 · ${carvings.length}줄`)
}

function saveOwned(): void {
  try {
    localStorage.setItem(OWNED_KEY, JSON.stringify(owned))
  } catch {
    showToast('구입 내역을 저장하지 못했어요 · 이번 세션에만 남습니다')
  }
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function hitsKiln(clientX: number, clientY: number): boolean {
  setPointerNdc(clientX, clientY)
  raycaster.setFromCamera(pointerNdc, camera)
  return raycaster.intersectObject(workshop.kilnGroup, true).length > 0
}

function setPointerNdc(clientX: number, clientY: number): void {
  const bounds = renderer.domElement.getBoundingClientRect()
  pointerNdc.set(
    ((clientX - bounds.left) / bounds.width) * 2 - 1,
    -((clientY - bounds.top) / bounds.height) * 2 + 1,
  )
}

function pickPiece(clientX: number, clientY: number): ExhibitedPiece | null {
  const pieces = exhibited.filter((piece): piece is ExhibitedPiece => piece !== null)
  if (pieces.length === 0) return null

  setPointerNdc(clientX, clientY)
  raycaster.setFromCamera(pointerNdc, camera)
  const hit = raycaster.intersectObjects(pieces, false)[0]
  return hit ? (hit.object as ExhibitedPiece) : null
}

// 팔 수 있는 작품은 커서와 밝기로 알린다.
function setHoveredPiece(piece: ExhibitedPiece | null): void {
  if (hoveredPiece === piece) return
  hoveredPiece?.material.emissive.setHex(0x000000)
  hoveredPiece = piece
  hoveredPiece?.material.emissive.setHex(0x5a3a16)
  renderer.domElement.style.cursor = piece ? 'pointer' : ''
}

// 선반의 작품을 클릭하면 값을 알려주고, 한 번 더 누르면 판다.
function trySell(clientX: number, clientY: number): void {
  if (kiln && hitsKiln(clientX, clientY)) {
    unloadKiln()
    return
  }
  const picked = pickPiece(clientX, clientY)
  const slotIndex = picked ? exhibited.indexOf(picked) : -1
  if (slotIndex < 0) {
    resetSaleConfirmation()
    return
  }

  const order = ORDERS[slotIndex]
  const saved = gallery[order.id]
  if (!saved) return
  const score = scoreClay(buildSafeProfile(saved.height, saved.outerRadii), order, saved.damage, saved.carvings)
  const price = sellPrice({ ...score, total: Math.round(score.total * saved.firing) }, priceMultiplier(owned) * saved.pace)

  if (pendingSaleIndex !== slotIndex) {
    pendingSaleIndex = slotIndex
    window.clearTimeout(saleTimer)
    saleTimer = window.setTimeout(resetSaleConfirmation, 2600)
    showToast(`${order.name} · ${price.toLocaleString('ko-KR')}원 · 한 번 더 누르면 판매`)
    return
  }

  resetSaleConfirmation()
  const piece = exhibited[slotIndex]
  if (piece) {
    if (flight?.piece === piece) flight = null
    if (hoveredPiece === piece) setHoveredPiece(null)
    scene.remove(piece)
    piece.geometry.dispose()
    piece.material.dispose()
  }
  exhibited[slotIndex] = null
  delete gallery[order.id]
  saveGallery()
  earnings += price
  saveEarnings()
  updateEarnings()
  showToast(`${order.name} · ${price.toLocaleString('ko-KR')}원에 팔았어요`)
}

function resetSaleConfirmation(): void {
  window.clearTimeout(saleTimer)
  pendingSaleIndex = -1
}

function updateEarnings(): void {
  earningsValue.textContent = `${earnings.toLocaleString('ko-KR')}원`
}

function saveEarnings(): void {
  try {
    localStorage.setItem(EARNINGS_KEY, String(earnings))
  } catch {
    showToast('수익을 저장하지 못했어요 · 이번 세션에만 남습니다')
  }
}

function saveGallery(): void {
  // 저장 실패(용량 초과, 프라이빗 모드)는 전시 자체를 막지 않는다.
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery))
  } catch {
    showToast('전시를 저장하지 못했어요 · 이번 세션에만 남습니다')
  }
}

renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault())
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (!started || !resultModal.hidden) return
  event.preventDefault()
  previousPointerX = event.clientX
  previousPointerY = event.clientY
  pressStartX = event.clientX
  pressStartY = event.clientY
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

  if (wheelState.mode === 'camera' && pointerButtons === 0) {
    setHoveredPiece(pickPiece(event.clientX, event.clientY))
    // 작품에서 벗어나면 setHoveredPiece가 커서를 지우지만, 가마에서 벗어날 때는 여기서 지워야 한다.
    if (!hoveredPiece) {
      renderer.domElement.style.cursor = kiln && hitsKiln(event.clientX, event.clientY) ? 'pointer' : ''
    }
  } else {
    setHoveredPiece(null)
  }

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
  const dragged = Math.hypot(event.clientX - pressStartX, event.clientY - pressStartY) > 5
  if (event.button === 0 && !dragged && wheelState.mode === 'camera' && resultModal.hidden) {
    trySell(event.clientX, event.clientY)
  }
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
  if (event.code === 'KeyE') {
    if (!event.repeat) carveGroove()
    return
  }
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
shopButton.addEventListener('click', () => {
  renderShop()
  shopModal.hidden = false
})
shopClose.addEventListener('click', () => {
  shopModal.hidden = true
})
resetButton.addEventListener('click', requestFullReset)
shopList.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-shop-id]')
  if (target?.dataset.shopId) buyItem(target.dataset.shopId)
})
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
  orderIndex = (orderIndex + 1) % activeOrders.length
  currentOrder = activeOrders[orderIndex]
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
applyOwnedEffects()
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
  // 물을 묻히며 돌리면 표면이 고와진다. 트임을 되돌리는 유일한 방법이다.
  if (wetting && wheelState.speed > CAMERA_ENTER_SPEED && collapseAnimation === null) {
    clay = buildSafeProfile(clay.height, smoothProfile(clay.outerRadii, Math.min(0.4, deltaSeconds * 3)))
    surfaceDamage = Math.max(0, surfaceDamage - deltaSeconds * 0.5)
    replaceMeshGeometry(clayMesh, clay)
  }
  // 상점을 둘러보는 시간은 작업 시간이 아니다.
  if (started && resultModal.hidden && shopModal.hidden) {
    workSeconds += deltaSeconds
    if (shapingNow && currentAction() !== 'idle') shapedSeconds += deltaSeconds
  }
  if (wasDry && moisture >= 0.3) showToast('흙이 다시 촉촉해졌어요')
  else if (!wasDry && moisture < 0.3) showToast('흙이 메말라가요 · W를 눌러 물을 묻히세요')
  clayMaterial.color.setHex(0xb96643).lerp(DRY_CLAY_COLOR, 1 - moisture)
  soundscape.update(wheelState.speed, currentAction(), shapingNow, deltaSeconds)

  updateKiln(deltaSeconds)
  updateFlight(deltaSeconds)
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
