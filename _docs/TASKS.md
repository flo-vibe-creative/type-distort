# Type Distort — 구현 계획

기획서: [_docs/PRD.md](./PRD.md)

## 진행 현황

| 구분 | 개수 |
| --- | --- |
| 전체 기능 | 10 |
| ✅ 완료 | 10 |
| 🔄 진행 중 | 0 |
| ⏳ 예정 | 0 |

| # | 기능 | Status |
| --- | --- | --- |
| 1 | 프로젝트 기반 세팅 | ✅ 완료 |
| 2 | 왜곡 엔진 (계산식 4종) | ✅ 완료 |
| 3 | SVG 가져오기 | ✅ 완료 |
| 4 | 이미지(PNG·JPEG) 가져오기 | ✅ 완료 |
| 5 | 레이어 시스템 & 캔버스 화면 | ✅ 완료 |
| 6 | 배치 편집 (이동·크기·회전) | ✅ 완료 |
| 7 | 왜곡 편집 UI (핸들·슬라이더) | ✅ 완료 |
| 8 | 내보내기 (SVG·PNG·JPEG) | ✅ 완료 |
| 9 | 되돌리기 & 자동 저장 | ✅ 완료 |
| 10 | 마무리 (에러 안내 · 레퍼런스 재현 검증) | ✅ 완료 |

---

## 파일 구조

| 경로 | 책임 |
| --- | --- |
| `app/page.tsx` | 에디터 화면 3분할 레이아웃 |
| `lib/warp/types.ts` | 왜곡 타입·파라미터 정의 |
| `lib/warp/arc.ts` | 아크/링 좌표 변환 |
| `lib/warp/bulge.ts` | 볼록·웨이브 좌표 변환 |
| `lib/warp/perspective.ts` | 원근 좌표 변환 |
| `lib/warp/mesh.ts` | 4×4 격자 보간 좌표 변환 |
| `lib/warp/registry.ts` | 효과 등록·기본값·조회 |
| `lib/geometry/matrix.ts` | 2D 아핀 행렬, 4점 호모그래피 |
| `lib/geometry/bbox.ts` | 경계 상자 계산 |
| `lib/svg/parse.ts` | SVG 문자열 → 도형 목록 정규화 |
| `lib/svg/flatten.ts` | 곡선 → 점열 적응형 세분화 |
| `lib/svg/serialize.ts` | 점열 → path `d` 문자열 |
| `lib/raster/loadImage.ts` | 이미지 로드·4096px 제한 |
| `lib/raster/glRenderer.ts` | WebGL 격자 메쉬 렌더러 |
| `lib/export/toSvg.ts` | SVG 마크업 생성 |
| `lib/export/exportDocument.ts` | 형식별 내보내기·다운로드 |
| `lib/render/canvasBounds.ts` | 캔버스 위 내용 범위 계산 |

| `lib/document/types.ts` | 문서·레이어 데이터 구조 |
| `lib/document/createLayer.ts` | 가져온 파일 → 레이어 변환 |
| `lib/document/importFiles.ts` | 여러 파일 일괄 가져오기 + 실패 수집 |
| `lib/render/warpShape.ts` | 경로에 왜곡 적용 → `d` 문자열, 세분화 정밀도 결정 |
| `lib/render/layerBounds.ts` | 왜곡된 모양이 차지하는 범위 계산 |
| `hooks/useFileImport.ts` | 가져오기 흐름 (버튼·드래그 공통) |
| `store/editorStore.ts` | 문서 상태·선택·모드·되돌리기 |
| `store/noticeStore.ts` | 사용자 안내 메시지 |
| `store/persist.ts` | 브라우저 자동 저장·복구 |
| `lib/storage/idb.ts` | 이미지 원본 보관 (IndexedDB) |
| `hooks/useDocumentPersistence.ts` | 자동 저장·복구 연결 |
| `components/editor/Toolbar.tsx` | 상단 바 |
| `components/editor/LayerPanel.tsx` | 좌측 레이어 목록 |
| `components/editor/CanvasStage.tsx` | 중앙 캔버스 뷰포트 (줌·팬·히트테스트) |
| `components/editor/LayerView.tsx` | 레이어 종류별 렌더러 분기 |
| `components/editor/VectorLayerView.tsx` | 벡터 레이어 SVG 렌더 |
| `components/editor/RasterLayerView.tsx` | 이미지 레이어 WebGL 렌더 |
| `lib/render/layerFrame.ts` | 좌표 변환, 크기 조절·회전 계산 |
| `lib/render/overlay.ts` | 캔버스 밖까지 클릭되도록 넓힌 오버레이 크기 |
| `hooks/useLayerInteraction.ts` | 이동·크기·회전 드래그 |
| `hooks/useEditorKeyboard.ts` | 단축키 |
| `components/editor/NumberField.tsx` | 숫자 입력 칸 |
| `components/editor/ColorField.tsx` | 색 견본·코드 입력 |
| `components/editor/PanelSection.tsx` | 설정 패널 묶음 |
| `components/editor/CanvasBackgroundSection.tsx` | 캔버스 배경 설정 |
| `lib/format/color.ts` | 색 표기 정리 |
| `hooks/useObjectUrl.ts` | 파일을 화면에서 참조할 임시 주소로 |
| `hooks/useNumericDraft.ts` | 숫자 입력 공통 동작 |
| `lib/format/number.ts` | 숫자 표시·해석 |
| `components/editor/SelectionFrame.tsx` | 선택 상자와 크기·회전 핸들 |
| `lib/warp/handles.ts` | 왜곡 조작점 위치·드래그 계산 |
| `lib/svg/glyphs.ts` | 도형을 글자 단위로 나누기 |
| `lib/render/letterSpacing.ts` | 자간 적용 |
| `lib/render/layerSource.ts` | 자간을 반영한 도형·왜곡 기준 크기 |
| `lib/render/marquee.ts` | 영역 안 레이어 골라내기 |
| `lib/render/warpSelection.ts` | 영역 안 조작점·줄 단위 골라내기 |
| `hooks/useWarpMarquee.ts` | 점 편집 중 영역 선택 |
| `hooks/useLayerMarquee.ts` | 드래그로 영역 그려 레이어 선택 |
| `hooks/useWarpInteraction.ts` | 왜곡 조작점 드래그 |
| `components/editor/SliderField.tsx` | 슬라이더 |
| `components/editor/WarpHandles.tsx` | 왜곡 핸들 (효과별 분기) |
| `components/editor/InspectorPanel.tsx` | 우측 배치/왜곡 탭 |
| `components/editor/ExportDialog.tsx` | 내보내기 옵션 창 |
| `components/editor/DropZone.tsx` | 파일 드래그&드롭 |
| `components/editor/NoticeList.tsx` | 안내 메시지 표시 |

---

## 기능 1. 프로젝트 기반 세팅

**Status:** ✅ 완료
**목표:** 브라우저에서 빈 에디터 화면(좌·중·우 3분할)이 뜨고, 테스트를 돌릴 수 있다.

- [x] Next.js 정적 빌드 설정 (`output: 'export'`, `basePath: '/type-distort'`) + TypeScript + Tailwind 구성
- [x] FLO 디자인 시스템 토큰(`tailwind.config.js`, `globals.css`)과 UI 컴포넌트(`Text`, `Button`, `Card`, `Spinner`) 이관
- [x] Vitest 설치 및 `npm test` 동작 확인
- [x] `app/page.tsx`에 3분할 레이아웃 뼈대 (상단 바 / 좌 레이어 / 중앙 캔버스 / 우 패널)
- [x] `npm run dev`로 화면 확인 후 커밋

## 기능 2. 왜곡 엔진 (계산식 4종)

**Status:** ✅ 완료
**목표:** 점 하나를 넣으면 왜곡된 점이 나오는 계산식 4개가 테스트로 검증된 채 완성된다. 화면은 아직 없다.

- [x] `lib/warp/types.ts` — `WarpFn = (u, v, params) => [x, y]` 공통 규격 정의
- [x] 아크: 기본값에서 입력=출력, 각도 180°에서 반원 배치 검증 테스트 → 구현
- [x] 볼록·웨이브: 세기 0에서 입력=출력, 중심점 불변 검증 테스트 → 구현 (파동 수 0 = 순수 볼록)
- [x] 퍼스펙티브: 4점 호모그래피 (`lib/geometry/matrix.ts`) — 정사각형 → 사다리꼴 매핑 테스트 → 구현
- [x] 메쉬: 4×4 격자, 격자를 안 움직이면 입력=출력 검증 테스트 → 구현
- [x] `lib/warp/registry.ts` — 효과 목록·기본 파라미터·한국어 라벨 등록
- [x] 전체 테스트 통과 확인 후 커밋

## 기능 3. SVG 가져오기

**Status:** ✅ 완료
**목표:** SVG 파일을 넣으면 글자 외곽선 점열로 변환되고, 왜곡 불가한 파일은 이유와 해결책이 안내된다.

- [x] `lib/svg/parse.ts` — `path·rect·circle·ellipse·polygon·polyline·line`을 경로로 정규화, `<g>` 및 `transform` 펼치기, 채우기 색 보존
- [x] `<text>` 감지 시 해당 파일을 거부하고 "윤곽선으로 변환 후 다시 저장" 안내 반환
- [x] `lib/svg/flatten.ts` — 베지에 곡선을 허용 오차 기반으로 잘게 나눠 점열 생성 (오차를 줄이면 점이 늘어나는지 테스트)
- [x] `lib/svg/serialize.ts` — 점열을 다시 `d` 문자열로 (왕복 후 형태 유지 테스트)
- [x] 실제 SVG 샘플 파일로 파싱 테스트 작성 후 커밋

## 기능 4. 이미지(PNG·JPEG) 가져오기

**Status:** ✅ 완료
**목표:** 이미지 파일을 넣으면 렌더에 쓸 수 있는 형태로 로드되고, 너무 큰 이미지는 자동으로 줄어든다.

- [x] `lib/raster/loadImage.ts` — 파일 → `ImageBitmap`, 원본 크기·투명 여부 파악
- [x] 긴 변 4096px 초과 시 비율 유지하며 축소 (축소 여부·배율 테스트)
- [x] 지원하지 않는 형식일 때 한국어 안내 반환
- [x] 테스트 통과 확인 후 커밋

## 기능 5. 레이어 시스템 & 캔버스 화면

**Status:** ✅ 완료
**목표:** 파일을 끌어다 놓으면 레이어로 쌓이고, 캔버스에 왜곡이 적용된 모습이 보인다. 줌·팬이 된다.

- [x] `store/editorStore.ts` — 문서 구조(캔버스·레이어 배열), 레이어 추가/삭제/순서/숨김/선택 (상태 변경 테스트)
- [x] `components/editor/DropZone.tsx` + `Toolbar.tsx` 가져오기 버튼 — 다중 파일 처리
- [x] `components/editor/LayerPanel.tsx` — 목록, 벡터/이미지 아이콘 구분, 선택·순서·숨김·삭제
- [x] `components/editor/VectorLayerView.tsx` — 점열에 warp 적용 후 SVG `<path>` 렌더
- [x] `components/editor/RasterLayerView.tsx` + `lib/raster/glRenderer.ts` — WebGL 격자 메쉬로 이미지 렌더
- [x] `components/editor/CanvasStage.tsx` — 두 렌더러 겹치기, 휠 확대/축소, 스페이스+드래그 이동
- [x] SVG·PNG를 실제로 넣어 화면에 뜨는지 확인 후 커밋

## 기능 6. 배치 편집 (이동·크기·회전)

**Status:** ✅ 완료
**목표:** 피그마처럼 레이어를 클릭해 선택하고 드래그해서 옮기고, 모서리로 크기·회전을 조절할 수 있다.

- [x] 레이어별 `transform`(위치·크기·회전)을 렌더에 반영 (왜곡 결과에 곱해지는 순서 검증 테스트)
- [x] 캔버스 클릭 히트테스트 — 실제로 그려진 도형만 선택되도록 DOM 기준으로 판정 (겹치면 위에 그려진 것이 우선)
- [x] `components/editor/TransformHandles.tsx` — 바운딩 박스, 드래그 이동
- [x] 모서리 드래그로 크기 조절, 모서리 바깥에서 회전
- [x] 단축키 — `Shift` 축 고정 / 비율 유지, 방향키 1px, `Shift`+방향키 10px, `Esc` 선택 해제
- [x] `InspectorPanel.tsx` 배치 탭에 숫자 입력 필드 연결 (양방향 동기화)
- [x] 직접 조작해보고 커밋

## 기능 7. 왜곡 편집 UI (핸들·슬라이더)

**Status:** ✅ 완료
**목표:** 레이어를 더블클릭하면 왜곡 모드로 들어가고, 핸들과 슬라이더로 네 효과를 실시간 조작할 수 있다.

- [x] 모드 전환 — 더블클릭/`왜곡` 탭으로 진입, `Esc`로 배치 모드 복귀 (핸들 색상 구분)
- [x] `InspectorPanel.tsx` 왜곡 탭 — 효과 선택 드롭다운 + 효과별 슬라이더 + 초기화 버튼
- [x] `WarpHandles.tsx` — 아크(호 곡선 + 양 끝점 + 기준선 점), 볼록(중심점 + 반경 원)
- [x] `WarpHandles.tsx` — 퍼스펙티브(모서리 4개), 메쉬(격자점 16개)
- [x] 핸들 ↔ 슬라이더 양방향 동기화
- [x] 드래그 중 낮은 정밀도 미리보기 → 놓으면 고정밀 재렌더
- [x] 네 효과를 모두 조작해보고 커밋
- [x] 아크 기준선 조절 추가 — 글자가 곡선의 어느 높이에 올라앉을지 핸들·슬라이더로 조절
- [x] 자간 조절 추가 — 모든 효과에 공통으로 걸리는 글자 사이 간격 (벡터 레이어 전용)
- [x] 슬라이더 옆 숫자 직접 입력 — 단위 포함 입력, 범위 보정, 방향키 조절
- [x] 조작점 여러 개 선택 — Shift로 더하고 빼며, 고른 점들을 함께 이동 (메쉬·퍼스펙티브)
- [x] 드래그로 영역을 그려 여러 조작점 한 번에 선택
- [x] 배치/왜곡 탭을 없애고 한 패널로 통합 — 클릭 즉시 이동, 빈 곳 드래그로 레이어 여러 개 선택
- [x] 점 편집 상태 추가 — 더블클릭으로 들어가 어디서든 드래그로 조작점을 감싸 고르기
- [x] 메쉬 격자의 가로줄·세로줄을 눌러 그 줄의 네 점 통째로 선택
- [x] 캔버스 배경 — 배경색과 배경 이미지(채우기·맞추기·늘이기)
- [x] 레이어별 글자 색 덮어쓰기

## 기능 8. 내보내기 (SVG·PNG·JPEG)

**Status:** ✅ 완료
**목표:** 작업 결과를 원하는 형식으로 저장할 수 있고, 형식별 한계가 미리 안내된다.

- [x] `lib/export/toSvg.ts` — 벡터 레이어는 왜곡된 경로로, 이미지 레이어는 비트맵으로 구워 `<image>` 삽입
- [x] `lib/export/exportDocument.ts` — 같은 SVG 마크업을 그림으로 구워 PNG 렌더 (배율 1x/2x/4x, 투명 배경 on/off)
- [x] JPEG — 품질 슬라이더, 배경색 지정 (투명 불가 안내)
- [x] `components/editor/ExportDialog.tsx` — 형식·옵션 선택, 이미지 레이어 포함 시 SVG 경고 문구
- [x] `내용에 맞춰 자르기` — 보이는 레이어 전체 경계로 캔버스 크기 재조정 (`lib/geometry/bbox.ts`, 경계 계산 테스트)
- [x] 세 형식 모두 실제로 저장해 열어보고 커밋

## 기능 9. 되돌리기 & 자동 저장

**Status:** ✅ 완료
**목표:** 실수해도 되돌릴 수 있고, 새로고침해도 작업이 남아 있다.

- [x] 문서 스냅샷 기반 되돌리기/다시하기 50단계 (`Cmd+Z` / `Cmd+Shift+Z`) — 순서 검증 테스트
- [x] 드래그 중에는 스냅샷을 쌓지 않고 놓을 때 1회만 기록
- [x] `store/persist.ts` — 문서와 이미지 원본을 브라우저에 자동 저장
- [x] 새로고침 시 복구, 손상된 저장본은 무시하고 빈 문서로 시작
- [x] 새로고침·되돌리기 확인 후 커밋

## 기능 10. 마무리 (에러 안내 · 레퍼런스 재현 검증)

**Status:** ✅ 완료
**목표:** 실패 상황이 모두 한국어로 친절하게 안내되고, 레퍼런스 그래픽 4종을 이 툴로 재현할 수 있다.

- [x] 에러 안내 통일 — `왜 이렇게 됐는지 → 어떻게 하면 되는지` 형식의 토스트/배너
- [x] 빈 캔버스 내보내기 차단, 지원하지 않는 파일 안내
- [x] 레퍼런스 재현 — 아크(`GET LOST IN THE BEAT`), 메쉬(`UNLEASH THE POWER OF THREE`), 퍼스펙티브(`PEERSPACE`), 볼록(`Awesome`)
- [x] `npm run build` 정적 빌드 성공 확인
- [x] 전체 테스트 통과 확인 후 커밋
