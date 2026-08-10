---
id: WIRECUT-001
title: 성형 중 실 자르기
status: HUMAN_REVIEW
type: feature
profile: web

risk:
  level: medium
  reasons: []

# models 는 생략하면 프로파일/프로젝트 설정을 따른다. 필요할 때만 override.
# models:
#   worker: auto

human:
  owner: user
  reviewer_required: true
---

## Problem

성형 중 원하는 높이를 깔끔하게 정리하려면 현재의 구조 실패 절단이 아니라 플레이어가
의도적으로 실을 일직선으로 통과시키는 조작이 필요하다.

## What we are shipping

- 물레를 멈춘 상태에서 선택하는 `실 자르기` 도구
- 점토를 가로지르는 수평 드래그와 실 선 미리보기
- 드래그 높이에서 윗부분을 실제 단면으로 분리하는 기존 점토 절단 결과 재사용
- 재시작과 결과 흐름에 연결된 도구 상태 복구

## What we are not shipping

- 자유 곡선 절단, 여러 조각 접합, 별도 절단판

## Facts

- `cutClayAt`과 분리 조각 애니메이션이 구조 실패 경로에 이미 있다.
- 현재 직접 성형은 하나의 `ClayProfile`을 사용한다.

## Decisions

- 새 절단 물리는 만들지 않고 기존 단면 절단과 분리 조각 표현을 재사용한다.
- 실 제스처는 시작 높이를 고정한 수평선으로 제한한다.

## Assumptions

- 데스크톱 마우스 입력을 우선한다.

## Relevant context

- `src/game/clay.ts`, `src/main.ts`, `src/styles.css`, `tests/clay.test.ts`, `e2e/wirecut-001.spec.ts`

## Allowed scope

- 실 도구 UI, 포인터 입력, 단면 절단, 분리 애니메이션, 관련 문서와 테스트

## Forbidden scope

- 결과 점수 정책, 주문 데이터, 외부 서비스와 운영 데이터

## Acceptance criteria

- 성형 중 물레를 멈추면 실 도구를 선택할 수 있다.
- 점토 위에서 수평으로 충분히 길게 드래그하면 선택 높이의 윗부분이 분리된다.
- 짧은 드래그와 빈 공간 드래그는 점토를 자르지 않는다.
- 절단 뒤 남은 단면, 높이 HUD와 결과 점수가 같은 프로필을 사용한다.
- 재시작하면 실 도구와 절단 조각이 초기화된다.
- 실제 1440×900 렌더와 전체 검증이 통과한다.

## Human judgment

- 실 선과 분리 동작이 수치 버튼이 아니라 직접 자르는 손동작으로 읽히는지 판단한다.

## Verification

- `npm run verify`
- 1440×900 실 드래그 렌더와 콘솔 오류 확인
- Design/Test/Simplicity critic 및 `bass gate pre-review`

## Rollback

- 실 도구 UI와 포인터 경로를 제거하고 기존 구조 실패 절단만 유지한다.
