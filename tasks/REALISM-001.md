---
id: REALISM-001
title: 직접 성형 기반 형태 맞추기
status: HUMAN_REVIEW
type: feature
profile: web

risk:
  level: medium
  reasons: []

human:
  owner: user
  reviewer_required: true
---

## Problem

제작 공정이 형태 맞추기의 핵심 조작보다 길고 복잡해 짧은 세션의 집중을 흐린다.

## What we are shipping

- 단단한 흙덩어리에서 바로 성형하거나 선택적으로 중심 구멍을 조절하는 플레이
- 부피를 보존하며 높이와 폭, 벽 두께가 연결되는 점토 모델
- 수분, 물그릇과 스펀지, 물레 RPM이 성형 효율과 구조 위험에 작용하는 규칙
- 성형을 마치면 즉시 실루엣·높이·매끄러움으로 결과를 평가하는 단일 루프
- 주문 윤곽 비교와 성형 결과 3D 전체 보기

## What we are not shipping

- 형태 맞추기와 직접 성형에 필요하지 않은 제작 공정
- 계정, 저장, 멀티플레이, 서버 또는 운영 데이터

## Facts

- 앱은 Vite/TypeScript/Three.js 단일 페이지 클라이언트이며 상태는 메모리에 있다.
- 기존 카메라와 직접 성형 입력은 1440×900 E2E 렌더 검증이 있다.

## Decisions

- 제품 목표를 공정 재현이 아닌 점토 직접 조작과 형태 맞추기로 좁힌다.
- 결과 점수와 평가액에는 형태 총점만 사용한다.
- 요청되지 않은 미래 기능은 백로그와 작업 문서에 남기지 않는다.

## Assumptions

- 데스크톱 마우스와 키보드 기반의 짧은 세션을 우선한다.

## Relevant context

- `DESIGN.md`, `FEATURE_BACKLOG.md`, `src/main.ts`, `src/game/process.ts`, `src/game/scoring.ts`

## Allowed scope

- 클라이언트 성형 상태, 점토 수학, Three.js 시각물, HUD, 결과 UI, 테스트와 문서

## Forbidden scope

- 외부 서비스 생성, 배포, 비밀정보, 운영 데이터 변경

## Acceptance criteria

- 물레를 멈춘 뒤 `형태 확인하기`를 누르면 중간 단계 없이 결과가 열린다.
- 결과는 실루엣·높이·매끄러움과 형태 총점만 보여준다.
- 구멍 없이도 결과를 제출할 수 있다.
- 수분, 스펀지, RPM, 예비 흙, 붕괴와 복구가 기존처럼 동작한다.
- 제거한 기능의 UI, 상태, 계산, 테스트, 백로그 항목이 남지 않는다.
- 1440×900 실제 렌더링과 전체 검증이 통과한다.

## Human judgment

- 공정 선택 없이 점토를 빚고 형태를 확인하는 흐름이 짧고 명확한지 판단한다.

## Verification

- `npm run verify`
- 1440×900 실제 렌더링과 콘솔 오류 확인
- Design/Test/Simplicity critic 및 `bass gate pre-review`

## Rollback

- REALISM-001에서 변경한 게임 상태, 결과 흐름, UI, 문서와 테스트를 함께 되돌린다.
