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
  minimumWallThickness,
  openCenter,
  sampleInnerRadius,
  sampleOuterRadius,
} from './game/clay'
import { projectPointerToAxis, shapingActionFromButtons } from './game/input'
import { computeHandTargets } from './game/handPlacement'
import { ORDERS } from './game/orders'
import { firingMultiplier, paceMultiplier, scoreClay, sellPrice } from './game/scoring'
import {
  GLAZES,
  LEATHER_HARD_MOISTURE,
  addReserveClay,
  addWater,
  applyGlaze,
  attachHandle,
  createInitialCraftState,
  finishForming,
  firePiece,
  firedClayColor,
  firedGlazeColor,
  moistureResponse,
  setKilnTemperature,
  shapingEfficiency,
  structuralPressureGain,
  updateGlazeCoverage,
  updateDrying,
  updateMoisture,
  wetClayColor,
} from './game/process'
import type { ClayProfile, CraftState, GlazeChoice, OrderDefinition, ScoreBreakdown, ShapingAction, WheelState } from './game/types'
import { CAMERA_ENTER_SPEED, updateWheel } from './game/wheel'
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
      <span class="readout-label">LIVE MATERIAL</span>
      <div class="readout-value"><strong id="rpm-value">0</strong><span>RPM</span></div>
      <div class="readout-rule"></div>
      <div class="dimension-row"><span>높이</span><strong id="height-value">18.2 cm</strong></div>
      <div class="dimension-row"><span>최대 폭</span><strong id="width-value">19.7 cm</strong></div>
      <div class="dimension-row"><span>최소 벽</span><strong id="wall-value">—</strong></div>
      <div class="dimension-row"><span>흙 총량</span><strong id="mass-value">1,200 g</strong></div>
      <div class="dimension-row"><span>작업 시간</span><strong id="work-time-value">0초</strong></div>
      <div class="material-meter"><div><span>수분</span><strong id="moisture-value">82%</strong></div><div class="material-track" id="moisture-track" role="progressbar" aria-label="점토 수분" aria-valuemin="0" aria-valuemax="100" aria-valuenow="82" aria-valuetext="적정 · 표면이 안정적입니다"><i id="moisture-fill"></i></div><span class="visually-hidden" id="material-state" role="status" aria-live="polite">수분이 적정해 표면이 안정적입니다.</span></div>
    </aside>
    <aside class="craft-panel" aria-label="제작 과정" data-testid="craft-panel">
      <div class="craft-heading"><span>MAKING PROCESS</span><strong id="stage-name">01 · 중심 열기</strong></div>
      <ol class="stage-list" id="stage-list">
        <li data-stage="opening" class="done"><i>1</i><span>흙 준비</span></li>
        <li data-stage="forming"><i>2</i><span>물레 성형</span></li>
        <li data-stage="leather-hard"><i>3</i><span>건조·마감</span></li>
        <li data-stage="glazing"><i>4</i><span>유약·소성</span></li>
      </ol>
      <p class="stage-guide" id="stage-guide">바로 외형을 빚거나, 중심에서 우클릭해 구멍을 키울 수 있어요.</p>
      <div class="material-actions">
        <button id="water-button" data-testid="water-action"><span>💧</span><b>물 적시기</b><small>W</small></button>
        <button id="clay-button" data-testid="clay-action"><span>●</span><b>흙 붙이기</b><small id="clay-reserve">2개</small></button>
        <button id="handle-button" data-testid="handle-action"><span>∩</span><b>손잡이</b><small>H</small></button>
      </div>
      <div class="handle-tools" id="handle-tools" aria-label="손잡이 모양 조절">
        <div class="tool-row"><label for="handle-width">폭</label><input id="handle-width" type="range" min="70" max="140" value="100"><output id="handle-width-output">100%</output></div>
        <div class="tool-row"><label for="handle-height">높이</label><input id="handle-height" type="range" min="70" max="150" value="100"><output id="handle-height-output">100%</output></div>
        <div class="tool-row"><label for="handle-thickness">두께</label><input id="handle-thickness" type="range" min="60" max="150" value="100"><output id="handle-thickness-output">100%</output></div>
        <div class="tool-row"><label for="handle-position">위치</label><input id="handle-position" type="range" min="32" max="72" value="55"><output id="handle-position-output">55%</output></div>
      </div>
      <div class="drying-tools" id="drying-tools" aria-label="작품 건조" hidden>
        <div class="drying-top"><span>시간 압축 건조</span><strong id="drying-state">건조 대기</strong></div>
        <div class="drying-track" id="drying-track" role="progressbar" aria-label="가죽경도 건조 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="drying-fill"></i></div>
        <button id="drying-button" data-testid="drying-action">건조 시작</button>
        <small>수분과 표면이 천천히 변해 가죽경도에 도달합니다.</small>
      </div>
      <div class="glaze-tools" id="glaze-tools" aria-label="유약 선택">
        <span class="tool-label">GLAZE</span>
        <div class="glaze-options">
          <button class="glaze-button celadon" data-glaze="celadon" aria-label="비취 청자 유약"></button>
          <button class="glaze-button cream" data-glaze="cream" aria-label="쌀빛 백유"></button>
          <button class="glaze-button iron" data-glaze="iron" aria-label="철유 갈색"></button>
          <button class="glaze-button unglazed" data-glaze="unglazed" aria-label="무유약">無</button>
          <strong id="glaze-name">유약을 골라주세요</strong>
        </div>
        <div class="coverage-row"><span>도포율</span><div class="coverage-track"><i id="coverage-fill"></i></div><strong id="coverage-value">0%</strong></div>
        <small class="brush-guide" id="brush-guide">유약을 고른 뒤 도자기 표면을 좌드래그하세요.</small>
      </div>
      <div class="kiln-tools" id="kiln-tools">
        <div class="kiln-top"><span class="tool-label">KILN</span><strong><output id="kiln-output">1220</output>°C</strong></div>
        <input id="kiln-temperature" data-testid="kiln-temperature" type="range" min="900" max="1300" step="10" value="1220" aria-label="가마 온도">
        <div class="kiln-scale"><span>900°</span><span>1300°</span></div>
      </div>
    </aside>
    <div class="bottom-dock">
      <section class="mode-panel" id="mode-panel">
        <div class="mode-copy"><span class="mode-label">CONTROL MODE</span><strong class="mode-name" id="mode-name" data-testid="game-status">시점 조절</strong></div>
        <div class="mode-details">
          <div class="control-hints" id="control-hints"></div>
          <div class="contact-feedback"><span class="contact-dot" id="contact-dot"></span><span id="contact-state">물레가 돌면 손이 커서를 따라갑니다</span></div>
          <div class="pressure-row"><span>손 압력</span><div class="pressure-track"><i id="pressure-fill"></i></div><b id="pressure-value">안정</b></div>
        </div>
      </section>
      <section class="pedal-panel">
        <div class="pedal-top"><span>FOOT PEDAL</span><strong>SPACE</strong></div>
        <div class="speed-track"><div class="speed-fill" id="speed-fill"></div></div>
        <small class="pedal-hint" id="speed-effect">누르는 동안 가속 · 중속이 가장 안정적</small>
      </section>
    </div>
    <div class="game-actions">
      <button class="restart-button" id="restart-button" data-testid="restart-action"><span>↻</span> 다시 시작</button>
      <button class="finish-button" id="finish-button" data-testid="finish-action" disabled>성형 마치기</button>
    </div>
    <div class="toast" id="toast" role="status"></div>

    <section class="modal-layer" id="intro-modal">
      <div class="intro-card">
        <p class="eyebrow">오늘의 공방이 열렸습니다</p>
        <h2>흙이 원하는 모양을<br>천천히 찾아주세요.</h2>
        <p class="intro-lead">한 덩이 흙을 빚고, 수분과 속도를 살피며 형태를 만든 뒤 유약을 입혀 구워냅니다.</p>
        <div class="intro-steps">
          <div class="intro-step"><strong>1</strong><b>덩이에서 시작</b><span>바로 외형을 빚거나 중심을 우클릭해 원하는 만큼 구멍을 냅니다.</span></div>
          <div class="intro-step"><strong>2</strong><b>수분과 성형</b><span>W로 물을 더하며 양손으로 얇고 높게 흙을 늘립니다.</span></div>
          <div class="intro-step"><strong>3</strong><b>접합과 마감</b><span>아래에 흙을 덧대고 손잡이 비율을 따로 다듬습니다.</span></div>
          <div class="intro-step"><strong>4</strong><b>유약과 소성</b><span>표면을 직접 칠하고 온도에 따른 소성 색을 확인합니다.</span></div>
        </div>
        <div class="intro-footer"><small>마우스와 키보드가 필요합니다.</small><button class="primary-button" id="start-button" data-testid="start-action">첫 주문 시작</button></div>
      </div>
    </section>

    <section class="modal-layer" id="result-modal" hidden>
      <div class="result-card">
        <div class="result-head">
          <div><p class="eyebrow" id="result-eyebrow">작업 결과</p><h2 id="result-title">손끝이 만든 좋은 곡선이에요.</h2></div>
          <div class="result-stats">
            <div class="result-price"><span>최종 판매가</span><strong id="result-price">0원</strong><small id="result-price-note">굽기 전 추정 0원</small></div>
            <div class="total-score"><strong id="total-score">84</strong><span>형태 총점</span></div>
          </div>
        </div>
        <div class="result-body">
          <div><div class="comparison" id="comparison"></div><div class="legend"><span><i></i>완성품</span><span><i class="target-key"></i>주문 윤곽</span></div></div>
          <div class="score-list" id="score-list"></div>
        </div>
        <div class="result-finish" id="result-finish"></div>
        <div class="result-actions"><button class="secondary-button" id="result-view-button" data-testid="result-view-action">3D 전체 보기</button><button class="secondary-button" id="retry-button">다시 빚기</button><button class="primary-button" id="next-button">다음 주문</button></div>
      </div>
    </section>
    <div class="result-view-dock" id="result-view-dock" hidden>
      <div><span>FIRED PIECE</span><strong id="result-view-name">완성품 전체 보기</strong><small>드래그로 돌리고 휠로 확대하세요</small></div>
      <button id="result-summary-button">결과표 보기</button>
    </div>
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
const wallValue = getElement<HTMLElement>('#wall-value')
const massValue = getElement<HTMLElement>('#mass-value')
const workTimeValue = getElement<HTMLElement>('#work-time-value')
const moistureValue = getElement<HTMLElement>('#moisture-value')
const moistureTrack = getElement<HTMLElement>('#moisture-track')
const moistureFill = getElement<HTMLElement>('#moisture-fill')
const materialState = getElement<HTMLElement>('#material-state')
const speedFill = getElement<HTMLElement>('#speed-fill')
const speedEffect = getElement<HTMLElement>('#speed-effect')
const modePanel = getElement<HTMLElement>('#mode-panel')
const modeName = getElement<HTMLElement>('#mode-name')
const controlHints = getElement<HTMLElement>('#control-hints')
const contactDot = getElement<HTMLElement>('#contact-dot')
const contactState = getElement<HTMLElement>('#contact-state')
const pressureFill = getElement<HTMLElement>('#pressure-fill')
const pressureValue = getElement<HTMLElement>('#pressure-value')
const finishButton = getElement<HTMLButtonElement>('#finish-button')
const restartButton = getElement<HTMLButtonElement>('#restart-button')
const introModal = getElement<HTMLElement>('#intro-modal')
const resultModal = getElement<HTMLElement>('#result-modal')
const startButton = getElement<HTMLButtonElement>('#start-button')
const retryButton = getElement<HTMLButtonElement>('#retry-button')
const nextButton = getElement<HTMLButtonElement>('#next-button')
const toast = getElement<HTMLElement>('#toast')
const stageName = getElement<HTMLElement>('#stage-name')
const craftPanel = getElement<HTMLElement>('.craft-panel')
const stageList = getElement<HTMLOListElement>('#stage-list')
const stageGuide = getElement<HTMLElement>('#stage-guide')
const waterButton = getElement<HTMLButtonElement>('#water-button')
const clayButton = getElement<HTMLButtonElement>('#clay-button')
const clayReserve = getElement<HTMLElement>('#clay-reserve')
const handleButton = getElement<HTMLButtonElement>('#handle-button')
const handleTools = getElement<HTMLElement>('#handle-tools')
const handleWidth = getElement<HTMLInputElement>('#handle-width')
const handleHeight = getElement<HTMLInputElement>('#handle-height')
const handleThickness = getElement<HTMLInputElement>('#handle-thickness')
const handlePosition = getElement<HTMLInputElement>('#handle-position')
const dryingTools = getElement<HTMLElement>('#drying-tools')
const dryingButton = getElement<HTMLButtonElement>('#drying-button')
const dryingState = getElement<HTMLElement>('#drying-state')
const dryingTrack = getElement<HTMLElement>('#drying-track')
const dryingFill = getElement<HTMLElement>('#drying-fill')
const glazeTools = getElement<HTMLElement>('#glaze-tools')
const glazeName = getElement<HTMLElement>('#glaze-name')
const coverageFill = getElement<HTMLElement>('#coverage-fill')
const coverageValue = getElement<HTMLElement>('#coverage-value')
const brushGuide = getElement<HTMLElement>('#brush-guide')
const kilnTools = getElement<HTMLElement>('#kiln-tools')
const kilnTemperature = getElement<HTMLInputElement>('#kiln-temperature')
const kilnOutput = getElement<HTMLOutputElement>('#kiln-output')
const glazeButtons = [...document.querySelectorAll<HTMLButtonElement>('.glaze-button')]
const resultViewButton = getElement<HTMLButtonElement>('#result-view-button')
const resultSummaryButton = getElement<HTMLButtonElement>('#result-summary-button')
const resultViewDock = getElement<HTMLElement>('#result-view-dock')

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
const accessoryMaterial = new THREE.MeshStandardMaterial({ color: 0xb96643, roughness: 0.66, metalness: 0 })
const ghostMaterial = new THREE.MeshBasicMaterial({
  color: 0xffe3ba,
  transparent: true,
  opacity: 0.11,
  wireframe: true,
  depthWrite: false,
})

let clay: ClayProfile = createInitialClay()
let craft: CraftState = createInitialCraftState()
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
let materialHintCooldown = 0
let materialMotionTime = 0
let handleMesh: THREE.Mesh | null = null
let centerHover = false
let lastMaterialMoisture = craft.moisture
let lastMaterialState = moistureResponse(craft.moisture).state
let dryingActive = false
let dryingStartMoisture = craft.moisture
let elapsedWorkSeconds = 0
let touchedWorkSeconds = 0
const attachedLumpMeshes: THREE.Mesh[] = []

interface HandleShape {
  width: number
  height: number
  thickness: number
  position: number
}

let handleShape: HandleShape = { width: 1, height: 1, thickness: 1, position: 0.55 }

const glazeCanvas = document.createElement('canvas')
glazeCanvas.width = 256
glazeCanvas.height = 128
const glazeContextCandidate = glazeCanvas.getContext('2d')
if (!glazeContextCandidate) throw new Error('유약 텍스처 캔버스를 만들 수 없습니다.')
const glazeContext = glazeContextCandidate
const glazeTexture = new THREE.CanvasTexture(glazeCanvas)
glazeTexture.colorSpace = THREE.SRGBColorSpace
glazeTexture.wrapS = THREE.RepeatWrapping
const GLAZE_GRID_WIDTH = 128
const GLAZE_GRID_HEIGHT = 64
const glazeMask = new Uint8Array(GLAZE_GRID_WIDTH * GLAZE_GRID_HEIGHT)

function setGameState(state: 'intro' | 'playing' | 'result' | 'result-view'): void {
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

function createHandleMesh(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.085 * handleShape.thickness, 14, 40),
    accessoryMaterial,
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  workshop.spinningGroup.add(mesh)
  return mesh
}

function updateHandleGeometry(): void {
  if (!handleMesh) return
  const middleRadius = sampleOuterRadius(clay, handleShape.position)
  handleMesh.position.set(middleRadius + 0.27 * handleShape.width, clay.height * handleShape.position, 0)
  handleMesh.scale.set(handleShape.width, Math.max(0.72, clay.height / 1.45) * handleShape.height, 1)
}

function rebuildHandleGeometry(): void {
  if (!handleMesh) return
  handleMesh.geometry.dispose()
  handleMesh.geometry = new THREE.TorusGeometry(0.38, 0.085 * handleShape.thickness, 14, 40)
  updateHandleGeometry()
}

function removeHandle(): void {
  if (!handleMesh) return
  workshop.spinningGroup.remove(handleMesh)
  handleMesh.geometry.dispose()
  handleMesh = null
}

function addVisibleClayLump(): void {
  const index = attachedLumpMeshes.length
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 22, 14), accessoryMaterial)
  mesh.scale.set(1.08, 0.28, 0.82)
  mesh.position.set(index % 2 === 0 ? -0.34 : 0.34, 0.09 + index * 0.035, index % 2 === 0 ? 0.08 : -0.08)
  mesh.rotation.y = index * 1.7
  mesh.castShadow = true
  mesh.receiveShadow = true
  workshop.spinningGroup.add(mesh)
  attachedLumpMeshes.push(mesh)
}

function clearClayLumps(): void {
  attachedLumpMeshes.forEach((mesh) => {
    workshop.spinningGroup.remove(mesh)
    mesh.geometry.dispose()
  })
  attachedLumpMeshes.length = 0
}

function hexCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}

function resetGlazeMask(): void {
  glazeMask.fill(0)
  craft = updateGlazeCoverage(craft, 0)
  renderSurfaceTexture()
}

function renderSurfaceTexture(): void {
  const fired = craft.stage === 'fired'
  const clayColor = fired ? firedClayColor(craft.kilnTemperature) : wetClayColor(craft.moisture)
  glazeContext.fillStyle = hexCss(clayColor)
  glazeContext.fillRect(0, 0, glazeCanvas.width, glazeCanvas.height)
  if (craft.glaze && craft.glaze !== 'unglazed') {
    const glazeColor = fired ? firedGlazeColor(craft.glaze, craft.kilnTemperature) : GLAZES[craft.glaze].color
    glazeContext.fillStyle = hexCss(glazeColor)
    const cellWidth = glazeCanvas.width / GLAZE_GRID_WIDTH
    const cellHeight = glazeCanvas.height / GLAZE_GRID_HEIGHT
    glazeMask.forEach((painted, index) => {
      if (!painted) return
      const x = (index % GLAZE_GRID_WIDTH) * cellWidth
      const y = Math.floor(index / GLAZE_GRID_WIDTH) * cellHeight
      glazeContext.fillRect(x, y, cellWidth + 1, cellHeight + 1)
    })
  }
  glazeTexture.needsUpdate = true
}

function paintGlazeAtUv(uv: THREE.Vector2): void {
  if (craft.stage !== 'glazing' || !craft.glaze || craft.glaze === 'unglazed') return
  const centerX = Math.round(uv.x * GLAZE_GRID_WIDTH)
  const centerY = Math.round((1 - uv.y) * GLAZE_GRID_HEIGHT)
  const radius = 5
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    if (y < 0 || y >= GLAZE_GRID_HEIGHT) continue
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if ((x - centerX) ** 2 + (y - centerY) ** 2 > radius ** 2) continue
      const wrappedX = (x + GLAZE_GRID_WIDTH) % GLAZE_GRID_WIDTH
      glazeMask[y * GLAZE_GRID_WIDTH + wrappedX] = 1
    }
  }
  const paintedCells = glazeMask.reduce((total, painted) => total + painted, 0)
  craft = updateGlazeCoverage(craft, paintedCells / glazeMask.length)
  renderSurfaceTexture()
}

function paintGlazeFromPointer(clientX: number, clientY: number): void {
  const bounds = renderer.domElement.getBoundingClientRect()
  pointerNdc.set(((clientX - bounds.left) / bounds.width) * 2 - 1, -((clientY - bounds.top) / bounds.height) * 2 + 1)
  raycaster.setFromCamera(pointerNdc, camera)
  const hit = raycaster.intersectObject(clayMesh, false)[0]
  if (hit?.uv) paintGlazeAtUv(hit.uv)
}

function updateClayMaterial(): void {
  const usesSurfaceTexture = craft.stage === 'glazing' || craft.stage === 'fired'
  const material = moistureResponse(craft.moisture)
  if (usesSurfaceTexture) renderSurfaceTexture()
  clayMaterial.map = usesSurfaceTexture ? glazeTexture : null
  clayMaterial.color.setHex(usesSurfaceTexture ? 0xffffff : wetClayColor(craft.moisture))
  clayMaterial.roughness = craft.stage === 'fired'
    ? craft.glaze === 'unglazed' ? 0.72 : 0.28
    : material.state === 'dry' ? 0.96
    : material.state === 'wet' ? 0.34
    : 0.48 + (82 - craft.moisture) * 0.003
  clayMaterial.flatShading = craft.stage === 'forming' && material.state === 'dry'
  clayMaterial.metalness = craft.stage === 'fired' ? 0.04 : 0
  clayMaterial.needsUpdate = true

  const accessoryColor = craft.stage === 'fired'
    ? craft.glaze && craft.glaze !== 'unglazed' && craft.glazeCoverage > 0.55
      ? firedGlazeColor(craft.glaze, craft.kilnTemperature)
      : firedClayColor(craft.kilnTemperature)
    : wetClayColor(craft.moisture)
  accessoryMaterial.color.setHex(accessoryColor)
  accessoryMaterial.roughness = craft.stage === 'fired' ? 0.6 : clayMaterial.roughness
  accessoryMaterial.needsUpdate = true
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
    const normalizedHitHeight = THREE.MathUtils.clamp(local.y / clay.height, 0, 1)
    const outerAtHit = sampleOuterRadius(clay, normalizedHitHeight)
    centerHover = Math.hypot(local.x, local.z) < outerAtHit * 0.56
    setSelection(normalizedHitHeight)
    return
  }

  centerHover = false

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
  const material = moistureResponse(craft.moisture)
  const shaping = wheelState.mode === 'shaping' && collapseAnimation === null
  const drySlip = !reduceMotion && material.state === 'dry' && action !== 'idle'
    ? Math.sin(materialMotionTime * 19) * 0.028 * (1 - material.shapingFactor)
    : 0
  const selectedY = 0.79 + selectedNormalizedHeight * clay.height + drySlip
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
  workshop.contactRing.position.y = selectedNormalizedHeight * clay.height + 0.008 + drySlip
  const ringRadius = outer / 0.82
  workshop.contactRing.scale.set(ringRadius, ringRadius, ringRadius)
  const ringMaterial = workshop.contactRing.material as THREE.MeshBasicMaterial
  ringMaterial.color.setHex(structuralPressure > 0.05
    ? 0xff5f45
    : material.state === 'dry'
      ? 0xf0a36d
      : material.state === 'wet'
        ? 0x83d7cf
        : action === 'widen' ? 0x9fe1af : action === 'narrow' ? 0xffbd79 : 0xffddb2)
  ringMaterial.opacity = action === 'idle' ? 0.48 : 0.88
}

function updateMaterialMotion(deltaSeconds: number): void {
  if (collapseAnimation) return
  materialMotionTime += deltaSeconds
  const material = moistureResponse(craft.moisture)
  const wetMotion = !reduceMotion && craft.stage === 'forming' && material.state === 'wet'
    ? (material.riskMultiplier - 1) * wheelState.speed
    : 0
  gameRoot.dataset.materialMotion = String(wetMotion > 0)
  const blend = 1 - Math.exp(-deltaSeconds * 10)
  clayMesh.rotation.x = THREE.MathUtils.lerp(clayMesh.rotation.x, Math.sin(materialMotionTime * 9) * 0.007 * wetMotion, blend)
  clayMesh.rotation.z = THREE.MathUtils.lerp(clayMesh.rotation.z, Math.cos(materialMotionTime * 7) * 0.013 * wetMotion, blend)
}

function applyContinuousShaping(deltaSeconds: number, pressureDeltaSeconds: number): void {
  if (collapseAnimation) return
  if (craft.stage !== 'forming') return
  if (wheelState.mode !== 'shaping' || structuralCooldown > 0) {
    structuralPressure = Math.max(0, structuralPressure - pressureDeltaSeconds * 2.5)
    return
  }
  const action = currentAction()
  const material = moistureResponse(craft.moisture)
  const efficiency = shapingEfficiency(wheelState.speed, craft.moisture)
  if (efficiency < 0.25) {
    if (material.state === 'dry' && action !== 'idle') {
      structuralPressure = Math.min(1, structuralPressure + structuralPressureGain(pressureDeltaSeconds, wheelState.speed, craft.moisture, false))
      structuralWarningActive = true
    }
    if (materialHintCooldown <= 0) {
      showToast(craft.moisture < 24 ? '흙이 말라 손을 밀어내요 · 물을 적셔주세요' : '물레 속도를 중속으로 맞춰주세요')
      materialHintCooldown = 2.2
    }
    return
  }

  if (centerHover && (action === 'narrow' || action === 'widen')) {
    shapingAccumulator += deltaSeconds
    if (shapingAccumulator < 1 / 30) return
    const openingDirection = action === 'widen' ? 1 : -1
    clay = openCenter(clay, openingDirection * shapingAccumulator * 0.72 * efficiency)
    shapingAccumulator = 0
    replaceMeshGeometry(clayMesh, clay)
    return
  }

  if (action !== 'narrow' && action !== 'widen') {
    structuralPressure = Math.max(0, structuralPressure - pressureDeltaSeconds * 2.5)
    structuralWarningActive = false
    shapingAccumulator = 0
    return
  }

  const atLimit = action === 'narrow' ? isNarrowLimit(clay, selectedIndex) : isWidenLimit(clay, selectedIndex)
  const wetInstability = material.state === 'wet' && wheelState.speed > 0.52
  if (atLimit || wetInstability) {
    structuralPressure = Math.min(1, structuralPressure + structuralPressureGain(pressureDeltaSeconds, wheelState.speed, craft.moisture, atLimit))
    if (!structuralWarningActive) {
      showToast(wetInstability && !atLimit
        ? '물이 고인 표면이 흔들려요 · 손을 떼고 잠시 기다리세요'
        : action === 'narrow' ? '주의 · 계속 누르면 위쪽 점토가 잘려요' : '주의 · 벽이 더 벌어지면 주저앉아요')
      structuralWarningActive = true
    }
    if (structuralPressure >= 1) {
      if (atLimit && action === 'narrow') triggerCut()
      else triggerCollapse(wetInstability && !atLimit)
    }
    if (atLimit) return
  } else {
    structuralPressure = Math.max(0, structuralPressure - pressureDeltaSeconds * 3)
    structuralWarningActive = false
  }

  shapingAccumulator += deltaSeconds
  if (shapingAccumulator < 1 / 30) return
  const shapingDelta = shapingAccumulator
  shapingAccumulator = 0
  const direction = action === 'narrow' ? -1 : 1
  clay = deformRadius(clay, selectedIndex, direction * shapingDelta * 0.22 * efficiency)
  if (material.state === 'wet') {
    clay = changeHeight(clay, -shapingDelta * material.sagRate * (0.6 + wheelState.speed))
  }
  replaceMeshGeometry(clayMesh, clay)
  updateHandleGeometry()
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
  updateHandleGeometry()
  structuralPressure = 0
  structuralWarningActive = false
  structuralCooldown = 0.75
  ignoreButtonsUntilRelease = true
  pointerButtons = 0
  pullAnchorHeight = null
  showToast('점토가 너무 가늘어져 위쪽이 잘려 떨어졌어요')
}

function triggerCollapse(overWet = false): void {
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
  showToast(overWet ? '과한 물과 원심력에 벽이 흔들리기 시작했어요' : '한계를 넘은 벽이 흔들리기 시작했어요')
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
    updateHandleGeometry()
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
  const material = moistureResponse(craft.moisture)
  const maxRadius = Math.max(...clay.outerRadii)
  const efficiency = shapingEfficiency(wheelState.speed, craft.moisture)
  gameRoot.dataset.craftStage = craft.stage
  gameRoot.dataset.opening = clay.opening.toFixed(2)
  gameRoot.dataset.moisture = String(Math.round(craft.moisture))
  gameRoot.dataset.moistureState = material.state
  gameRoot.dataset.glazeCoverage = String(Math.round(craft.glazeCoverage * 100))
  gameRoot.dataset.dryingActive = String(dryingActive)
  gameRoot.dataset.clayColor = clayMaterial.color.getHexString()
  gameRoot.dataset.clayRoughness = clayMaterial.roughness.toFixed(2)
  gameRoot.dataset.clayFlatShading = String(clayMaterial.flatShading)
  gameRoot.dataset.elapsedWorkSeconds = String(elapsedWorkSeconds)
  gameRoot.dataset.touchedWorkSeconds = String(touchedWorkSeconds)
  ghostMesh.visible = craft.stage !== 'fired'
  rpmValue.textContent = String(Math.round(wheelState.speed * 120))
  speedFill.style.width = `${Math.round(wheelState.speed * 100)}%`
  heightValue.textContent = `${(clay.height * 12).toFixed(1)} cm`
  widthValue.textContent = `${(maxRadius * 24).toFixed(1)} cm`
  wallValue.textContent = clay.opening < 0.2 ? '막힌 덩이' : `${(minimumWallThickness(clay) * 12).toFixed(1)} cm`
  massValue.textContent = `${craft.clayMass.toLocaleString('ko-KR')} g`
  workTimeValue.textContent = formatDuration(elapsedWorkSeconds)
  moistureValue.textContent = `${Math.round(craft.moisture)}%`
  const materialCopy = material.state === 'dry'
    ? '과건조 · 표면이 거칠고 손이 미끄러집니다'
    : material.state === 'wet'
      ? '과습 · 표면이 번들거리고 벽이 처집니다'
      : '적정 · 표면이 안정적입니다'
  moistureTrack.setAttribute('aria-valuenow', String(Math.round(craft.moisture)))
  moistureTrack.setAttribute('aria-valuetext', materialCopy)
  if (material.state !== lastMaterialState) {
    materialState.textContent = material.state === 'dry'
      ? '흙이 과하게 말랐습니다. 물을 적셔주세요.'
      : material.state === 'wet'
        ? '흙이 과하게 젖었습니다. 감속하고 손을 떼어 잠시 기다리세요.'
        : '흙의 수분이 적정 구간으로 돌아왔습니다.'
    lastMaterialState = material.state
  }
  moistureFill.style.width = `${Math.round(craft.moisture)}%`
  const speedBand = wheelState.speed < 0.12 ? '저속' : wheelState.speed <= 0.72 ? '안정 속도' : '고속'
  speedEffect.textContent = material.state === 'dry'
    ? `과건조 · ${speedBand} · 물을 적셔주세요`
    : material.state === 'wet'
      ? `과습 · ${speedBand} · 감속 후 기다리기`
      : wheelState.speed < 0.12
    ? 'Space로 가속 · 중속이 가장 안정적'
    : wheelState.speed <= 0.72
      ? `성형 효율 ${Math.round(efficiency * 100)}% · 안정 구간`
      : `성형 효율 ${Math.round(efficiency * 100)}% · 벽 흔들림 주의`
  const modeCopy = craft.stage === 'drying'
    ? dryingActive ? '건조 중' : '건조 준비'
    : craft.stage === 'glazing'
    ? craft.glaze === 'unglazed' ? '무유약 마감' : '유약 칠하기'
    : collapseAnimation
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
  renderer.domElement.classList.toggle('glazing', craft.stage === 'glazing' && craft.glaze !== 'unglazed')
  modePanel.classList.toggle('is-shaping', wheelState.mode === 'shaping' && collapseAnimation === null)
  modePanel.classList.toggle('is-warning', structuralPressure > 0.08)
  modePanel.classList.toggle('is-collapsing', collapseAnimation !== null)
  const hintMode = craft.stage === 'drying' ? 'drying' : craft.stage === 'glazing' ? 'glazing' : wheelState.mode
  if (lastHintMode !== hintMode) {
    controlHints.innerHTML = hintMode === 'drying'
      ? `<div class="hint"><span class="mousecap">1</span>건조 시작</div><div class="hint"><span class="mousecap">색</span>표면 확인</div><div class="hint"><span class="mousecap">%</span>수분 확인</div>`
      : hintMode === 'glazing'
      ? `<div class="hint"><span class="mousecap">좌</span>유약 붓</div><div class="hint"><span class="mousecap">우</span>회전</div><div class="hint"><span class="mousecap">휠</span>확대</div>`
      : wheelState.mode === 'camera'
      ? `<div class="hint"><span class="mousecap">좌</span>회전</div><div class="hint"><span class="mousecap">우</span>이동</div><div class="hint"><span class="mousecap">휠</span>확대</div>`
      : `<div class="hint"><span class="mousecap">좌</span>좁히기</div><div class="hint"><span class="mousecap">우</span>넓히기</div><div class="hint"><span class="mousecap">양쪽</span>높이</div>`
    lastHintMode = hintMode
  }

  const heightPercent = Math.round(selectedNormalizedHeight * 100)
  contactState.textContent = collapseAnimation
    ? '손을 물리고 벽이 내려앉는 모습을 확인하세요'
    : craft.stage === 'drying'
      ? dryingActive ? `수분 ${Math.round(craft.moisture)}% · 표면이 밝아지는 중` : '건조 시작을 눌러 가죽경도까지 말리세요'
    : craft.stage === 'glazing'
      ? craft.glaze === 'unglazed' ? '바탕 흙 그대로 가마에서 구워냅니다' : `도포율 ${Math.round(craft.glazeCoverage * 100)}% · 표면을 좌드래그하세요`
    : centerHover && wheelState.mode === 'shaping'
      ? `중심 구멍 ${Math.round(clay.opening * 100)}% · 우클릭은 키우고 좌클릭은 줄여요`
    : wheelState.mode === 'camera'
    ? '물레가 돌면 손이 커서를 따라갑니다'
    : ignoreButtonsUntilRelease
      ? '손을 떼고 다시 잡아주세요'
      : material.state === 'dry' && action !== 'idle'
        ? '거친 표면에서 접촉점이 미끄러져요 · 물을 적셔주세요'
        : material.state === 'wet' && action !== 'idle'
          ? '표면 물막이 흔들리고 벽이 천천히 처져요'
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

  const stageIndex = craft.stage === 'forming' ? 1 : craft.stage === 'drying' || craft.stage === 'leather-hard' ? 2 : 3
  const stageCopies: Record<CraftState['stage'], { name: string; guide: string }> = {
    forming: { name: '02 · 물레 성형', guide: '외벽은 기존대로 성형하고, 중심에서는 우클릭으로 구멍을 키우고 좌클릭으로 줄여요.' },
    drying: { name: '03 · 건조', guide: dryingActive ? '수분과 표면 변화를 보며 가죽경도까지 기다리세요.' : '성형을 마쳤습니다. 건조를 시작하세요.' },
    'leather-hard': { name: '03 · 가죽경도', guide: '가죽경도에 도달했습니다. 무유약 또는 유약을 고르세요.' },
    glazing: { name: '04 · 유약과 소성', guide: craft.glaze === 'unglazed' ? '바탕 흙은 1000°C 부근에서 가장 안정적입니다.' : '좌드래그로 칠한 뒤 유약에 맞는 온도로 구워내세요.' },
    fired: { name: '완성 · 가마에서 꺼냄', guide: `소성 품질 ${craft.firingQuality ?? 0}% · 완성된 표면과 결과를 확인하세요.` },
  }
  stageName.textContent = stageCopies[craft.stage].name
  stageGuide.textContent = stageCopies[craft.stage].guide
  stageList.querySelectorAll<HTMLElement>('li').forEach((item, index) => {
    item.classList.toggle('active', index === stageIndex && craft.stage !== 'fired')
    item.classList.toggle('done', index < stageIndex || craft.stage === 'fired')
  })

  const formingStage = craft.stage === 'forming'
  craftPanel.classList.toggle('is-finishing', craft.stage === 'drying' || craft.stage === 'leather-hard' || craft.stage === 'glazing' || craft.stage === 'fired')
  const stopped = wheelState.speed <= CAMERA_ENTER_SPEED && wheelState.mode === 'camera'
  waterButton.disabled = !formingStage || craft.moisture >= 98
  clayButton.disabled = !formingStage || craft.reserveLumps <= 0 || !stopped
  handleButton.disabled = craft.stage !== 'forming' || !stopped
  handleButton.classList.toggle('is-done', craft.handleAttached)
  handleButton.querySelector('b')!.textContent = craft.handleAttached ? '손잡이 조절' : '손잡이'
  clayReserve.textContent = `${craft.reserveLumps}개`
  dryingTools.classList.toggle('is-active', craft.stage === 'drying')
  dryingTools.hidden = craft.stage !== 'drying'
  const dryingRange = Math.max(1, dryingStartMoisture - LEATHER_HARD_MOISTURE)
  const dryingProgress = Math.round(THREE.MathUtils.clamp((dryingStartMoisture - craft.moisture) / dryingRange, 0, 1) * 100)
  dryingFill.style.width = `${dryingProgress}%`
  dryingTrack.setAttribute('aria-valuenow', String(dryingProgress))
  dryingState.textContent = dryingActive ? `${dryingProgress}%` : '건조 대기'
  dryingButton.disabled = craft.stage !== 'drying' || dryingActive
  dryingButton.textContent = dryingActive ? '천천히 마르는 중' : '건조 시작'
  glazeTools.classList.toggle('is-active', craft.stage === 'leather-hard' || craft.stage === 'glazing')
  kilnTools.classList.toggle('is-active', craft.stage === 'glazing')
  glazeButtons.forEach((button) => {
    button.disabled = craft.stage !== 'leather-hard' && craft.stage !== 'glazing'
    button.classList.toggle('selected', button.dataset.glaze === craft.glaze)
  })
  glazeName.textContent = craft.glaze === 'unglazed' ? '무유약' : craft.glaze ? GLAZES[craft.glaze].name : '마감을 골라주세요'
  coverageFill.style.width = `${Math.round(craft.glazeCoverage * 100)}%`
  coverageValue.textContent = `${Math.round(craft.glazeCoverage * 100)}%`
  brushGuide.textContent = craft.glaze === 'unglazed' ? '유약 없이 흙 자체의 소성 색을 살립니다.' : '도자기 표면을 좌드래그해 직접 칠하세요.'
  kilnTemperature.disabled = craft.stage !== 'glazing'
  kilnOutput.value = String(craft.kilnTemperature)

  const commonReady = started && stopped && resultModal.hidden && collapseAnimation === null
  finishButton.hidden = craft.stage === 'drying'
  if (craft.stage === 'drying') return
  if (craft.stage === 'forming') {
    finishButton.disabled = !commonReady
    finishButton.textContent = commonReady ? '성형 마치기' : '물레를 멈춰주세요'
  } else if (craft.stage === 'leather-hard') {
    finishButton.disabled = true
    finishButton.textContent = '마감을 골라주세요'
  } else if (craft.stage === 'glazing') {
    finishButton.disabled = !craft.glaze
    finishButton.textContent = `${craft.kilnTemperature}°C로 굽기`
  } else {
    finishButton.disabled = true
    finishButton.textContent = '소성 완료'
  }
}

function showToast(message: string): void {
  toast.textContent = message
  toast.classList.add('show')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1500)
}

function formatDuration(seconds: number): string {
  const rounded = Math.floor(Math.max(0, seconds))
  const minutes = Math.floor(rounded / 60)
  const remainder = rounded % 60
  return minutes > 0 ? `${minutes}분 ${remainder}초` : `${remainder}초`
}

function resetClay(): void {
  collapseAnimation = null
  clayMesh.rotation.set(0, 0, 0)
  clayMesh.position.set(0, 0, 0)
  clay = createInitialClay()
  craft = createInitialCraftState()
  lastMaterialMoisture = craft.moisture
  lastMaterialState = moistureResponse(craft.moisture).state
  materialState.textContent = '수분이 적정해 표면이 안정적입니다.'
  dryingActive = false
  dryingStartMoisture = craft.moisture
  elapsedWorkSeconds = 0
  touchedWorkSeconds = 0
  gameRoot.dataset.elapsedWorkSeconds = '0'
  gameRoot.dataset.touchedWorkSeconds = '0'
  replaceMeshGeometry(clayMesh, clay)
  removeHandle()
  clearClayLumps()
  handleShape = { width: 1, height: 1, thickness: 1, position: 0.55 }
  handleWidth.value = '100'
  handleHeight.value = '100'
  handleThickness.value = '100'
  handlePosition.value = '55'
  handleTools.classList.remove('is-active')
  centerHover = false
  glazeMask.fill(0)
  resultViewDock.hidden = true
  updateClayMaterial()
  clearDetachedPieces()
  wheelState = { speed: 0, pedalDown: false, mode: 'camera' }
  pointerButtons = 0
  pullAnchorHeight = null
  ignoreButtonsUntilRelease = false
  structuralPressure = 0
  structuralWarningActive = false
  structuralCooldown = 0
  shapingAccumulator = 0
  materialHintCooldown = 0
  materialMotionTime = 0
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
  const firing = craft.firingQuality ?? 0
  const firingFactor = firingMultiplier(firing)
  const pace = paceMultiplier(elapsedWorkSeconds, touchedWorkSeconds)
  const finalQuality = Math.round(score.total * firingFactor)
  const estimate = sellPrice(score.total, 1, pace)
  const finalPrice = sellPrice(score.total, firingFactor, pace)
  gameRoot.dataset.shapeScore = String(score.total)
  gameRoot.dataset.firingMultiplier = String(firingFactor)
  gameRoot.dataset.paceMultiplier = String(pace)
  getElement<HTMLElement>('#result-title').textContent = finalQuality >= 90
    ? '주문서보다 더 아름다운 곡선이에요.'
    : finalQuality >= 72
      ? '손끝이 만든 좋은 곡선이에요.'
      : '흙과 조금 더 이야기를 나눠볼까요?'
  getElement<HTMLElement>('#total-score').textContent = String(score.total)
  getElement<HTMLElement>('#result-price').textContent = `${finalPrice.toLocaleString('ko-KR')}원`
  getElement<HTMLElement>('#result-price-note').textContent = `굽기 전 추정 ${estimate.toLocaleString('ko-KR')}원`
  getElement<HTMLElement>('#result-eyebrow').textContent = `${currentOrder.name} · ${formatDuration(elapsedWorkSeconds)} · 작업 속도 ×${pace.toFixed(2)}`
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
    ['소성', firing, '유약과 가마 온도'],
  ].map(([label, value, description]) => `
    <div class="score-row">
      <div class="score-row-top"><span>${label}<small> · ${description}</small></span><strong>${value}</strong></div>
      <div class="score-bar"><i style="width:${value}%"></i></div>
    </div>
  `).join('')
  const finishName = craft.glaze === 'unglazed'
    ? '무유약 테라코타'
    : craft.glaze
      ? GLAZES[craft.glaze].name
      : '마감 없음'
  const firedBodyColor = firedClayColor(craft.kilnTemperature)
  const firedFinishColor = craft.glaze && craft.glaze !== 'unglazed'
    ? firedGlazeColor(craft.glaze, craft.kilnTemperature)
    : firedBodyColor
  getElement<HTMLElement>('#result-finish').innerHTML = `
    <div><span class="finish-swatch" style="--finish-color:${hexCss(firedFinishColor)}"></span><p><small>표면 마감</small><strong>${finishName}</strong></p></div>
    <div><p><small>도포율</small><strong>${craft.glaze === 'unglazed' ? '무유약' : `${Math.round(craft.glazeCoverage * 100)}%`}</strong></p></div>
    <div><p><small>소성 온도</small><strong>${craft.kilnTemperature}°C</strong></p></div>
  `
  nextButton.textContent = orderIndex === ORDERS.length - 1 ? '첫 주문으로' : '다음 주문'
  resultModal.hidden = false
  resultViewDock.hidden = true
  setGameState('result')
}

function finishWork(): void {
  if (finishButton.disabled) return
  pointerButtons = 0
  wheelState.pedalDown = false
  if (craft.stage === 'forming') {
    craft = finishForming(craft)
    dryingActive = false
    dryingStartMoisture = craft.moisture
    wheelState = { speed: 0, pedalDown: false, mode: 'camera' }
    showToast('성형 완료 · 건조를 시작할 준비가 됐어요')
    updateClayMaterial()
    return
  }
  if (craft.stage === 'glazing') {
    craft = firePiece(craft)
    updateClayMaterial()
    showToast(`${craft.kilnTemperature}°C · 가마 불이 올랐습니다`)
    window.setTimeout(() => showResult(scoreClay(clay, currentOrder)), reduceMotion ? 80 : 620)
  }
}

function beginDrying(): void {
  if (craft.stage !== 'drying' || dryingActive) return
  dryingActive = true
  dryingStartMoisture = craft.moisture
  showToast('건조 시작 · 표면과 수분 변화를 지켜보세요')
}

function wetClay(): void {
  const before = craft.moisture
  craft = addWater(craft)
  if (craft.moisture > before) {
    lastMaterialMoisture = craft.moisture
    updateClayMaterial()
    showToast(moistureResponse(craft.moisture).state === 'wet'
      ? '흙이 과하게 젖었어요 · 손을 떼고 잠시 기다리세요'
      : `물을 적셨어요 · 수분 ${Math.round(craft.moisture)}%`)
  }
}

function joinClayLump(): void {
  if (clayButton.disabled) return
  const nextCraft = addReserveClay(craft)
  if (nextCraft === craft) return
  craft = nextCraft
  addVisibleClayLump()
  updateClayMaterial()
  showToast(`본체 아래에 예비 흙덩이 180g을 붙였어요 · 총 ${craft.clayMass}g`)
}

function joinHandle(): void {
  if (handleButton.disabled) return
  if (craft.handleAttached) {
    handleTools.classList.toggle('is-active')
    return
  }
  const nextCraft = attachHandle(craft)
  if (nextCraft === craft) return
  craft = nextCraft
  handleMesh = createHandleMesh()
  updateHandleGeometry()
  handleTools.classList.add('is-active')
  showToast('손잡이를 붙였어요 · 아래 도구로 모양을 다듬어보세요')
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
  if (craft.stage === 'glazing' && (event.buttons & 1) !== 0) {
    paintGlazeFromPointer(event.clientX, event.clientY)
    renderer.domElement.setPointerCapture(event.pointerId)
    return
  }
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
  if (craft.stage === 'glazing' && (event.buttons & 1) !== 0) {
    paintGlazeFromPointer(event.clientX, event.clientY)
    previousPointerX = event.clientX
    previousPointerY = event.clientY
    return
  }
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
  } else if (wheelState.mode === 'shaping' && craft.stage === 'forming') {
    const both = (pointerButtons & 1) !== 0 && (pointerButtons & 2) !== 0
    if (both && craft.stage === 'forming') {
      if (pullAnchorHeight === null) {
        updateSelection(event.clientX, event.clientY)
        pullAnchorHeight = selectedNormalizedHeight
      }
      setSelection(pullAnchorHeight)
      clay = changeHeight(clay, -deltaY * 0.0045 * shapingEfficiency(wheelState.speed, craft.moisture))
      replaceMeshGeometry(clayMesh, clay)
      updateHandleGeometry()
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
  if (event.code === 'Space') {
    event.preventDefault()
    if (started && resultModal.hidden && craft.stage === 'forming') wheelState.pedalDown = true
    return
  }
  if (!started || !resultModal.hidden || event.repeat) return
  if (event.code === 'KeyW') wetClay()
  if (event.code === 'KeyH') joinHandle()
})
window.addEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    event.preventDefault()
    wheelState.pedalDown = false
  }
})
window.addEventListener('blur', () => {
  wheelState.pedalDown = false
  pointerButtons = 0
  pullAnchorHeight = null
  ignoreButtonsUntilRelease = false
})

startButton.addEventListener('click', () => {
  introModal.hidden = true
  started = true
  setGameState('playing')
  renderer.domElement.focus()
  showToast('Space를 눌러 물레를 돌려보세요')
})
finishButton.addEventListener('click', finishWork)
waterButton.addEventListener('click', wetClay)
dryingButton.addEventListener('click', beginDrying)
clayButton.addEventListener('click', joinClayLump)
handleButton.addEventListener('click', joinHandle)
const updateHandleShapeFromControls = (): void => {
  handleShape = {
    width: Number(handleWidth.value) / 100,
    height: Number(handleHeight.value) / 100,
    thickness: Number(handleThickness.value) / 100,
    position: Number(handlePosition.value) / 100,
  }
  getElement<HTMLOutputElement>('#handle-width-output').value = `${handleWidth.value}%`
  getElement<HTMLOutputElement>('#handle-height-output').value = `${handleHeight.value}%`
  getElement<HTMLOutputElement>('#handle-thickness-output').value = `${handleThickness.value}%`
  getElement<HTMLOutputElement>('#handle-position-output').value = `${handlePosition.value}%`
  rebuildHandleGeometry()
}
for (const input of [handleWidth, handleHeight, handleThickness, handlePosition]) {
  input.addEventListener('input', updateHandleShapeFromControls)
}
glazeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const glaze = button.dataset.glaze as GlazeChoice
    const changedFinish = craft.glaze !== glaze
    craft = applyGlaze(craft, glaze)
    if (changedFinish) resetGlazeMask()
    updateClayMaterial()
    showToast(glaze === 'unglazed' ? '유약 없이 흙의 소성 색을 살립니다' : `${GLAZES[glaze].name} 선택 · 표면을 직접 칠해주세요`)
  })
})
kilnTemperature.addEventListener('input', () => {
  craft = setKilnTemperature(craft, Number(kilnTemperature.value))
  kilnOutput.value = String(craft.kilnTemperature)
})
resultViewButton.addEventListener('click', () => {
  resultModal.hidden = true
  resultViewDock.hidden = false
  cameraState.distance = 5.2
  cameraState.pitch = 0.34
  setGameState('result-view')
})
resultSummaryButton.addEventListener('click', () => {
  resultViewDock.hidden = true
  resultModal.hidden = false
  setGameState('result')
})
restartButton.addEventListener('click', requestRestart)
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
updateClayMaterial()
updateHud()

const clock = new THREE.Clock()
function animate(): void {
  const elapsedSeconds = clock.getDelta()
  const deltaSeconds = Math.min(elapsedSeconds, 1 / 30)
  const wheelDeltaSeconds = Math.min(elapsedSeconds, 0.12)
  structuralCooldown = Math.max(0, structuralCooldown - deltaSeconds)
  materialHintCooldown = Math.max(0, materialHintCooldown - deltaSeconds)
  wheelState = updateWheel(wheelState, wheelDeltaSeconds)
  if (started) {
    if (gameRoot.dataset.gameState === 'playing') {
      elapsedWorkSeconds += elapsedSeconds
      if (craft.stage === 'forming' && wheelState.mode === 'shaping' && currentAction() !== 'idle') touchedWorkSeconds += elapsedSeconds
    }
    craft = updateMoisture(craft, Math.min(elapsedSeconds, 5), wheelState.mode === 'shaping' && currentAction() !== 'idle', wheelState.speed)
    const stageBeforeDrying = craft.stage
    craft = updateDrying(craft, wheelDeltaSeconds, dryingActive)
    if ((craft.stage === 'forming' || craft.stage === 'drying' || craft.stage === 'leather-hard') && Math.abs(craft.moisture - lastMaterialMoisture) >= 1) {
      lastMaterialMoisture = craft.moisture
      updateClayMaterial()
    }
    if (stageBeforeDrying === 'drying' && craft.stage === 'leather-hard') {
      dryingActive = false
      lastMaterialMoisture = craft.moisture
      updateClayMaterial()
      showToast('가죽경도 도달 · 표면 마감을 선택할 수 있어요')
    }
  }
  workshop.spinningGroup.rotation.y -= wheelState.speed * deltaSeconds * 7.2
  workshop.pedal.rotation.x = THREE.MathUtils.lerp(
    workshop.pedal.rotation.x,
    wheelState.pedalDown ? -0.22 : 0.08 + Math.sin(performance.now() * 0.006) * wheelState.speed * 0.07,
    1 - Math.exp(-deltaSeconds * 10),
  )

  applyContinuousShaping(deltaSeconds, wheelDeltaSeconds)
  updateCollapseAnimation(wheelDeltaSeconds)
  updateMaterialMotion(deltaSeconds)
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
