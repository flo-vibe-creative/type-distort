import type { Bounds } from '@/lib/geometry/bbox'
import { applyWarp, type WarpState } from '@/lib/warp/registry'

/**
 * 이미지 레이어를 격자 메쉬로 늘려 그리는 WebGL 렌더러.
 *
 * 브라우저는 한 페이지에서 만들 수 있는 WebGL 컨텍스트 수가 제한되어 있어,
 * 컨텍스트를 하나만 두고 여기에 그린 결과를 레이어별 캔버스로 옮겨 그린다.
 * 덕분에 레이어 개수에 제한이 없고 벡터 레이어와 순서를 자유롭게 섞을 수 있다.
 */

const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
uniform vec2 u_resolution;
varying vec2 v_texCoord;
void main() {
  // 픽셀 좌표를 클립 좌표로 바꾼다 (y축은 화면 기준으로 뒤집는다)
  vec2 normalized = a_position / u_resolution;
  gl_Position = vec4(normalized.x * 2.0 - 1.0, 1.0 - normalized.y * 2.0, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`

const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_texCoord;
void main() {
  gl_FragColor = texture2D(u_texture, v_texCoord);
}
`

interface GlContext {
  canvas: HTMLCanvasElement
  gl: WebGLRenderingContext
  program: WebGLProgram
  positionBuffer: WebGLBuffer
  texCoordBuffer: WebGLBuffer
  indexBuffer: WebGLBuffer
  texture: WebGLTexture
  positionLocation: number
  texCoordLocation: number
  resolutionLocation: WebGLUniformLocation | null
}

let shared: GlContext | null = null
let unavailable = false

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function getContext(): GlContext | null {
  if (shared) return shared
  if (unavailable || typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl', {
    premultipliedAlpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  })
  if (!gl) {
    unavailable = true
    return null
  }

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (!vertex || !fragment || !program) {
    unavailable = true
    return null
  }
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    unavailable = true
    return null
  }

  const positionBuffer = gl.createBuffer()
  const texCoordBuffer = gl.createBuffer()
  const indexBuffer = gl.createBuffer()
  const texture = gl.createTexture()
  if (!positionBuffer || !texCoordBuffer || !indexBuffer || !texture) {
    unavailable = true
    return null
  }

  shared = {
    canvas,
    gl,
    program,
    positionBuffer,
    texCoordBuffer,
    indexBuffer,
    texture,
    positionLocation: gl.getAttribLocation(program, 'a_position'),
    texCoordLocation: gl.getAttribLocation(program, 'a_texCoord'),
    resolutionLocation: gl.getUniformLocation(program, 'u_resolution'),
  }
  return shared
}

export interface WarpedBitmapRequest {
  bitmap: ImageBitmap
  warp: WarpState
  /** 원본 이미지 크기 (왜곡의 기준 영역) */
  sourceWidth: number
  sourceHeight: number
  /** 왜곡 결과가 차지하는 범위 (레이어 좌표계) */
  bounds: Bounds
  /** 레이어 좌표 1px을 결과 이미지 몇 px으로 그릴지 */
  pixelScale: number
  /** 격자 조밀도. 클수록 곡면이 매끄럽지만 느려진다. */
  gridSize: number
}

/**
 * 왜곡한 이미지를 그려 공유 캔버스를 돌려준다.
 * 돌려받은 캔버스는 다음 호출 때 덮어써지므로 즉시 복사해 써야 한다.
 */
export function renderWarpedBitmap(request: WarpedBitmapRequest): HTMLCanvasElement | null {
  const context = getContext()
  if (!context) return null
  if (request.sourceWidth <= 0 || request.sourceHeight <= 0) return null

  const { gl, canvas } = context
  const outputWidth = Math.max(1, Math.round((request.bounds.maxX - request.bounds.minX) * request.pixelScale))
  const outputHeight = Math.max(1, Math.round((request.bounds.maxY - request.bounds.minY) * request.pixelScale))
  const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
  if (outputWidth > maxSize || outputHeight > maxSize) return null

  canvas.width = outputWidth
  canvas.height = outputHeight
  gl.viewport(0, 0, outputWidth, outputHeight)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  const steps = Math.max(2, request.gridSize)
  const sourceSize = { width: request.sourceWidth, height: request.sourceHeight }
  const vertexCount = (steps + 1) * (steps + 1)
  const positions = new Float32Array(vertexCount * 2)
  const texCoords = new Float32Array(vertexCount * 2)

  let cursor = 0
  for (let row = 0; row <= steps; row += 1) {
    const v = row / steps
    for (let col = 0; col <= steps; col += 1) {
      const u = col / steps
      const point = applyWarp(request.warp, u, v, sourceSize)
      positions[cursor * 2] = (point.x - request.bounds.minX) * request.pixelScale
      positions[cursor * 2 + 1] = (point.y - request.bounds.minY) * request.pixelScale
      texCoords[cursor * 2] = u
      texCoords[cursor * 2 + 1] = v
      cursor += 1
    }
  }

  const indices = new Uint16Array(steps * steps * 6)
  let index = 0
  for (let row = 0; row < steps; row += 1) {
    for (let col = 0; col < steps; col += 1) {
      const topLeft = row * (steps + 1) + col
      const topRight = topLeft + 1
      const bottomLeft = topLeft + (steps + 1)
      const bottomRight = bottomLeft + 1
      indices[index++] = topLeft
      indices[index++] = bottomLeft
      indices[index++] = topRight
      indices[index++] = topRight
      indices[index++] = bottomLeft
      indices[index++] = bottomRight
    }
  }

  gl.useProgram(context.program)

  gl.bindBuffer(gl.ARRAY_BUFFER, context.positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW)
  gl.enableVertexAttribArray(context.positionLocation)
  gl.vertexAttribPointer(context.positionLocation, 2, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ARRAY_BUFFER, context.texCoordBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.DYNAMIC_DRAW)
  gl.enableVertexAttribArray(context.texCoordLocation)
  gl.vertexAttribPointer(context.texCoordLocation, 2, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, context.indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW)

  gl.bindTexture(gl.TEXTURE_2D, context.texture)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, request.bitmap)

  if (context.resolutionLocation) {
    gl.uniform2f(context.resolutionLocation, outputWidth, outputHeight)
  }

  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0)
  return canvas
}

/** WebGL을 쓸 수 없는 환경인지 (안내 문구용) */
export function isWebglAvailable(): boolean {
  return getContext() !== null
}
