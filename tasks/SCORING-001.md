---
id: SCORING-001
title: 점수·판매가 정책
status: HUMAN_REVIEW
type: feature
profile: web

risk:
  level: low
  reasons: []

human:
  owner: user
  reviewer_required: true
---

## Problem

현재 결과 화면은 형태 점수와 소성 품질을 선형 합산하지만, 작품의 값과 작업 속도에 대한
일관된 정책이 없다. 가마 실수와 숙련된 작업 속도가 결과에 어떤 영향을 주는지도 금액으로
읽히지 않는다.

## Facts

- 현재 결과 화면은 소성 뒤에 열리며 선반·상점·영속 저장은 없다.
- 형태 총점은 `src/game/scoring.ts`, 소성 품질은 `src/game/process.ts`에서 계산한다.

## Decisions

- 현재 루프에서는 판매를 저장하지 않고 결과 화면에 굽기 전 추정가와 최종 평가액을 함께 보여준다.
- 원본 프롬프트의 예시 금액과 공식이 다를 때는 명시된 2.4제곱 공식을 원천으로 삼는다.

## Assumptions

- 판매가 표시는 다음 주문으로 넘어가기 전 공정 숙련을 설명하는 피드백으로 충분하다.

## Relevant context

- `DESIGN.md`, `src/game/scoring.ts`, `src/game/process.ts`, `src/main.ts`

## Allowed scope

- 클라이언트 점수 정책, 세션 작업 시간, 결과 UI, 단위/E2E 테스트와 문서

## Forbidden scope

- 영속 재화, 상점, 공방 업그레이드, 외부 서비스와 운영 데이터

## What we are shipping

- 형태 총점에 2.4제곱 곡선을 적용한 판매가
- 굽기 품질은 점수와 함께 곡선 안에, 작업 속도는 곡선 밖에 적용하는 정책
- 흙 접촉 시간이 충분할 때만 받을 수 있는 빠른 작업 보너스
- HUD의 작업 시간과 결과 화면의 굽기 전 추정가·최종 판매가

## What we are not shipping

- 상점, 공방 업그레이드, 선반 저장, localStorage 또는 재화 지출
- 도구와 기법 주문

## Acceptance criteria

- 명시 공식에 따라 30/60/87/100점의 기본 판매가가 각각 2,600/9,500/21,800/30,000원이다.
- 굽기 품질은 0.5~1 범위에서 총점과 곱해진 뒤 점수 곡선을 통과한다.
- 작업 속도 배수는 0.7~1.35이며 빠른 작업 보너스는 흙 접촉 8초까지 비례한다.
- 결과 화면에서 굽기 전 추정가와 굽기 반영 최종 판매가가 명확히 구분된다.
- 작업 시간은 제작 중 흐르고 결과 화면에서는 멈추며 다시 시작·다음 주문에서 초기화된다.

## Verification

- `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`, `npm run verify`
- 1440×900 결과 화면 렌더링과 콘솔 오류 확인
- Design/Test/Simplicity critic 및 `bass gate pre-review`

## Human judgment

- 가격 정보가 중앙 작품보다 강하게 보이지 않으면서 굽기 실수와 작업 속도의 영향을 이해시키는지 판단한다.

## Rollback

- 점수 정책 함수, 작업 시간 상태, 결과 금액 UI와 관련 테스트·문서를 함께 되돌린다.
