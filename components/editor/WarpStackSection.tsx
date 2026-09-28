'use client'

import { useState } from 'react'
import { SliderField } from '@/components/editor/SliderField'
import { Text } from '@/components/ui/Text'
import type { Layer } from '@/lib/document/types'
import { WARP_EFFECTS, WARP_TYPES } from '@/lib/warp/registry'
import { activeEffectOf, type WarpEffect } from '@/lib/warp/stack'
import type { WarpType } from '@/lib/warp/types'
import { useEditorStore } from '@/store/editorStore'

/** 효과마다 캔버스에서 무엇을 끌면 되는지 알려준다 */
const WARP_GUIDE: Record<WarpType, string> = {
  arc: '양 끝의 흰 점을 위아래로 끌면 휘는 정도가 바뀝니다. 보라색 기준점은 곡선 위 어디로든 옮길 수 있으며, 그 지점은 휘어도 제자리에 남고 나머지 글자가 그 둘레로 감깁니다. 위아래로 끌면 글자가 곡선의 어디에 올라앉을지(기준선)가 바뀌어, 아래로 내리면 곡선 위에 서고 위로 올리면 매달립니다. 원 전체를 돌리려면 회전 슬라이더를 쓰세요.',
  mesh: '격자의 점 16개를 각각 끌어 자유롭게 변형합니다. 여러 개를 한꺼번에 다루려면 레이어를 더블클릭해 점 편집으로 들어가세요. 네 귀퉁이 점은 모서리와 정확히 붙어 움직입니다.',
  perspective:
    '네 모서리 점을 끌어 원근을 만듭니다. 여러 모서리를 함께 옮기려면 레이어를 더블클릭해 점 편집으로 들어가세요. 위쪽을 좁히면 멀어지는 느낌이 납니다.',
  bulge:
    '가운데 점을 끌면 점선 원은 제자리에 둔 채 가장 크게 부푸는 지점만 옮겨집니다. 원 전체를 옮기려면 점선 원을 잡아 끄세요. 오른쪽 점으로 영향 범위를, 세기를 음수로 하면 오목해집니다.',
}

function IconButton({
  title,
  onClick,
  disabled = false,
  danger = false,
  children,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`px-1 text-fg-tertiary disabled:opacity-30 ${
        danger ? 'hover:text-semantic-error' : 'hover:text-fg-primary'
      }`}
    >
      <Text variant="caption12" as="span">
        {children}
      </Text>
    </button>
  )
}

function EffectBody({ layerId, effect }: { layerId: string; effect: WarpEffect }) {
  const setWarpEffectType = useEditorStore((state) => state.setWarpEffectType)
  const updateWarpParams = useEditorStore((state) => state.updateWarpParams)

  return (
    <div className="flex flex-col gap-2 border-t border-border px-2 py-2">
      <select
        value={effect.type}
        aria-label="효과 종류"
        onChange={(event) => setWarpEffectType(layerId, effect.id, event.target.value as WarpType)}
        className="w-full rounded border border-border bg-surface px-2 py-1.5 text-[13px] leading-[18px] outline-none focus:border-blue-800"
      >
        {WARP_TYPES.map((type) => (
          <option key={type} value={type}>
            {WARP_EFFECTS[type].label}
          </option>
        ))}
      </select>

      {WARP_EFFECTS[effect.type].sliders.map((slider) => (
        <SliderField
          key={slider.key}
          label={slider.label}
          min={slider.min}
          max={slider.max}
          step={slider.step}
          suffix={slider.unit}
          displayScale={slider.displayScale}
          value={Number((effect.params as unknown as Record<string, number>)[slider.key] ?? 0)}
          onChange={(value) => updateWarpParams(layerId, effect.id, { [slider.key]: value })}
        />
      ))}

      {effect.type === 'bulge' && (effect.params.peakX !== 0 || effect.params.peakY !== 0) && (
        <button
          type="button"
          onClick={() => updateWarpParams(layerId, effect.id, { peakX: 0, peakY: 0 })}
          className="w-full rounded-md border border-border py-1.5 hover:bg-surface-minimal"
        >
          <Text variant="caption12" as="span" color="text-fg-secondary">
            중앙점을 원 중심으로
          </Text>
        </button>
      )}

      <Text variant="caption12" color="text-fg-tertiary">
        {effect.enabled
          ? WARP_GUIDE[effect.type]
          : '꺼 둔 효과라 결과에 반영되지 않고 캔버스에 조작점도 보이지 않습니다. 👁 를 눌러 다시 켜세요.'}
      </Text>
    </div>
  )
}

/**
 * 레이어에 쌓인 왜곡 효과 목록.
 *
 * 위에서부터 차례로 적용되며, 한 번에 하나만 펼쳐 그 효과의 조작점을 캔버스에 보여준다.
 */
export function WarpStackSection({ layer }: { layer: Layer }) {
  const activeWarpId = useEditorStore((state) => state.activeWarpId)
  const addWarpEffect = useEditorStore((state) => state.addWarpEffect)
  const removeWarpEffect = useEditorStore((state) => state.removeWarpEffect)
  const moveWarpEffect = useEditorStore((state) => state.moveWarpEffect)
  const toggleWarpEffect = useEditorStore((state) => state.toggleWarpEffect)
  const setActiveWarp = useEditorStore((state) => state.setActiveWarp)
  const [adding, setAdding] = useState(false)

  const open = activeEffectOf(layer.warps, activeWarpId)
  const count = layer.warps.length

  return (
    <section className="border-b border-border px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <Text variant="caption12" as="h3" color="text-fg-tertiary">
          왜곡
        </Text>
        <button
          type="button"
          onClick={() => setAdding((value) => !value)}
          aria-expanded={adding}
          className="rounded border border-border px-2 py-0.5 hover:bg-surface-minimal"
        >
          <Text variant="caption12" as="span" color="text-fg-secondary">
            {adding ? '닫기' : '+ 효과 추가'}
          </Text>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {adding && (
          <div className="grid grid-cols-2 gap-1">
            {WARP_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  addWarpEffect(layer.id, type)
                  setAdding(false)
                }}
                className="rounded border border-border py-1.5 hover:border-blue-800 hover:bg-surface-minimal"
              >
                <Text variant="caption12" as="span" color="text-fg-secondary">
                  {WARP_EFFECTS[type].label}
                </Text>
              </button>
            ))}
          </div>
        )}

        {count === 0 && !adding && (
          <Text variant="caption12" color="text-fg-tertiary">
            걸린 왜곡이 없습니다. [+ 효과 추가]로 더하세요.
          </Text>
        )}

        {count > 1 && (
          <Text variant="caption12" color="text-fg-tertiary">
            위에서부터 차례로 적용됩니다. 순서를 바꾸면 결과도 달라집니다.
          </Text>
        )}

        {layer.warps.map((effect, index) => {
          const expanded = open?.id === effect.id
          return (
            <div
              key={effect.id}
              className={`rounded-md border ${expanded ? 'border-blue-800' : 'border-border'}`}
            >
              <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={() => setActiveWarp(effect.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setActiveWarp(effect.id)
                  }
                }}
                className="flex cursor-pointer items-center gap-1 px-2 py-1.5"
              >
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <Text variant="caption12" as="span" color="text-fg-tertiary">
                    {expanded ? '▾' : '▸'}
                  </Text>
                  <Text
                    variant="ui13"
                    as="span"
                    color={effect.enabled ? 'text-fg-primary' : 'text-fg-tertiary'}
                    className="truncate"
                  >
                    {count > 1 ? `${index + 1}. ` : ''}
                    {WARP_EFFECTS[effect.type].label}
                  </Text>
                </span>
                <IconButton
                  title={effect.enabled ? '끄기' : '켜기'}
                  onClick={() => toggleWarpEffect(layer.id, effect.id)}
                >
                  {effect.enabled ? '👁' : '🚫'}
                </IconButton>
                <IconButton
                  title="위로"
                  disabled={index === 0}
                  onClick={() => moveWarpEffect(layer.id, effect.id, 'up')}
                >
                  ↑
                </IconButton>
                <IconButton
                  title="아래로"
                  disabled={index === count - 1}
                  onClick={() => moveWarpEffect(layer.id, effect.id, 'down')}
                >
                  ↓
                </IconButton>
                <IconButton
                  title="삭제"
                  danger
                  onClick={() => removeWarpEffect(layer.id, effect.id)}
                >
                  ✕
                </IconButton>
              </div>

              {expanded && <EffectBody layerId={layer.id} effect={effect} />}
            </div>
          )
        })}
      </div>
    </section>
  )
}
