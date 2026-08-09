import type { ShapingAction } from '../game/types'

// 효과음은 파일 없이 Web Audio 로 합성한다. 물레 소리는 지속음이라 노이즈를 필터로 깎아 쓰고,
// 게인만 상태에 맞춰 움직인다. 배경음악만 외부 파일(public/bgm.mp3)을 쓰고, 없으면 조용히 넘어간다.
export const MUSIC_URL = '/bgm.mp3'

const WHEEL_GAIN = 0.16
const CLAY_GAIN = 0.13
const MUSIC_GAIN = 0.28

export interface Soundscape {
  /** 브라우저는 사용자 제스처 이후에만 오디오를 허용한다. 시작 버튼에서 호출한다. */
  start(): void
  update(speed: number, action: ShapingAction, shaping: boolean, deltaSeconds: number): void
  splash(): void
  setMuted(muted: boolean): void
  muted: boolean
}

export function createSoundscape(): Soundscape {
  let context: AudioContext | null = null
  let master: GainNode | null = null
  let wheelGain: GainNode | null = null
  let wheelFilter: BiquadFilterNode | null = null
  let clayGain: GainNode | null = null
  let clayFilter: BiquadFilterNode | null = null
  let music: HTMLAudioElement | null = null
  let muted = false

  function noiseBuffer(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    // 브라운 노이즈. 백색 노이즈는 쉿 소리가 강해 공방 분위기를 깬다.
    let last = 0
    for (let index = 0; index < data.length; index += 1) {
      last = (last + (Math.random() * 2 - 1) * 0.06) * 0.985
      data[index] = last * 3.2
    }
    return buffer
  }

  function loop(ctx: AudioContext, destination: AudioNode, type: BiquadFilterType, frequency: number) {
    const source = ctx.createBufferSource()
    source.buffer = noiseBuffer(ctx)
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    const gain = ctx.createGain()
    gain.gain.value = 0
    source.connect(filter).connect(gain).connect(destination)
    source.start()
    return { gain, filter }
  }

  const soundscape: Soundscape = {
    get muted() {
      return muted
    },

    start(): void {
      if (context) {
        void context.resume()
        return
      }
      context = new AudioContext()
      master = context.createGain()
      master.gain.value = muted ? 0 : 1
      master.connect(context.destination)

      const wheel = loop(context, master, 'lowpass', 220)
      wheelGain = wheel.gain
      wheelFilter = wheel.filter
      const clay = loop(context, master, 'bandpass', 900)
      clayGain = clay.gain
      clayFilter = clay.filter

      music = new Audio(MUSIC_URL)
      music.loop = true
      music.volume = muted ? 0 : MUSIC_GAIN
      // 파일을 넣지 않았으면 조용히 넘어간다. 배경음악은 선택 사항이다.
      music.addEventListener('error', () => { music = null })
      void music.play().catch(() => undefined)
    },

    update(speed: number, action: ShapingAction, shaping: boolean, deltaSeconds: number): void {
      if (!context || !wheelGain || !wheelFilter || !clayGain || !clayFilter) return
      const blend = 1 - Math.exp(-deltaSeconds * 8)

      wheelGain.gain.value += (speed * WHEEL_GAIN - wheelGain.gain.value) * blend
      wheelFilter.frequency.value = 180 + speed * 420

      const rubbing = shaping && action !== 'idle'
      clayGain.gain.value += ((rubbing ? CLAY_GAIN * (0.4 + speed) : 0) - clayGain.gain.value) * blend
      clayFilter.frequency.value = action === 'narrow' ? 1250 : action === 'widen' ? 760 : 980
    },

    splash(): void {
      if (!context || !master) return
      const source = context.createBufferSource()
      source.buffer = noiseBuffer(context)
      const filter = context.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1800, context.currentTime)
      filter.frequency.exponentialRampToValueAtTime(420, context.currentTime + 0.35)
      const gain = context.createGain()
      gain.gain.setValueAtTime(0.22, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.4)
      source.connect(filter).connect(gain).connect(master)
      source.start()
      source.stop(context.currentTime + 0.42)
    },

    setMuted(next: boolean): void {
      muted = next
      if (master) master.gain.value = muted ? 0 : 1
      if (music) music.volume = muted ? 0 : MUSIC_GAIN
    },
  }

  return soundscape
}
