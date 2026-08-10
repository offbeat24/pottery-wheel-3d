---
id: SCORING-001
title: 형태 점수와 평가액
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

형태 맞추기 결과를 일관된 점수와 금액으로 읽을 수 있어야 한다.

## Decisions

- 실루엣 65%, 높이 25%, 매끄러움 10%를 형태 총점으로 합산한다.
- 형태 총점에 2.4제곱 곡선을 적용해 평가액을 계산한다.
- 결과는 세부 형태 점수, 형태 총점, 평가액만 보여준다.

## Relevant context

- `src/game/scoring.ts`, `src/main.ts`, `tests/scoring.test.ts`, `e2e/quality.spec.ts`

## Acceptance criteria

- 목표 단면과 같은 점토는 99점 이상이다.
- 30/60/87/100점의 평가액은 각각 2,600/9,500/21,800/30,000원이다.
- 결과 화면에서 실루엣·높이·매끄러움과 형태 총점을 읽을 수 있다.
- 작업 시간은 결과 화면에서 멈추며 재시작과 다음 주문에서 초기화된다.

## Verification

- `npm run verify`
- 1440×900 결과 화면 렌더링과 콘솔 오류 확인

## Rollback

- 점수 정책 함수, 결과 UI와 관련 테스트·문서를 함께 되돌린다.
