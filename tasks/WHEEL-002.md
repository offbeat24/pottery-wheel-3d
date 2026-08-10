---
id: WHEEL-002
title: 물레 속도 물성 체감 강화
status: CAPTURED

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

RPM이 성형 효율과 위험 계산에 들어가지만 플레이어가 속도 차이를 손으로 충분히 느끼기 어렵다.

## What we are shipping

- 저속에서는 흙이 잘 움직이지 않고 입력 반응이 둔하게 한다.
- 적정 속도에서는 가장 정밀하고 효율적으로 성형된다.
- 고속에서는 입력이 과장되고 흔들림·붕괴 위험이 증가한다.
- 같은 손동작의 실제 profile 변화가 RPM에 따라 명확히 달라진다.

## What we are not shipping

- 실제 모터 토크·관성 물리, 새로운 페달 장치

## Facts

현재 RPM 효율과 위험 배수 함수가 있고 페달 입력이 있다.

## Decisions

기존 함수를 유지하고 형태 변화·시각 피드백 연결을 강화한다.

## Assumptions

현재 0~100% 속도 표시를 계속 사용한다.

## Relevant context

`src/game/process.ts`, `src/main.ts` 성형 loop·RPM HUD

## Allowed scope

성형 효율, 구조 위험, 흔들림 피드백, 관련 테스트

## Forbidden scope

물그릇·수분 경계 재설계, 가마 공정

## Acceptance criteria

- 동일 입력의 profile 변화가 저속·적정·고속에서 다르다.
- 적정 속도 범위를 숫자와 체감으로 이해할 수 있다.
- 고속 위험이 형태 흔들림으로 먼저 예고된다.
- RPM 경계와 실제 통합 변화가 테스트된다.

## Human judgment

속도 선택이 단순 게이지 맞추기가 아니라 손 조작에 직접 작용하는가?

## Verification

RPM 경계 unit 테스트, 동일 입력 비교 E2E, 실제 렌더 확인

## Rollback

강화된 변화·피드백을 제거하고 기존 RPM 효율 모델로 복구한다.
