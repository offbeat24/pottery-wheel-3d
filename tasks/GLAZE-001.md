---
id: GLAZE-001
title: 직접 시유와 불완전 도포 결함
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

유약을 덜 바른 부분의 결과가 약하고, 시유 중 카메라가 돌아가지 않으며 붓칠과 담금 중 어떤 조작이 적합한지 정리되지 않았다.

## What we are shipping

- 붓칠과 담금 시유를 작은 프로토타입으로 비교해 한 방식을 선택한다.
- 선택한 방식으로 플레이어가 직접 표면을 시유한다.
- 얇음·적정·두꺼움과 미도포 영역을 기록한다.
- 소성 후 핀홀, 얼룩, 흙 노출, 흘러내림 같은 차이를 단순화해 표현한다.
- 시유 중 작품 회전·줌이 정상 동작한다.

## What we are not shipping

- 실제 화학 유약 계산, 수십 종 유약, 사실적인 액체 유체

## Facts

현재 본체 UV mask 기반 직접 칠하기와 도포율이 있다.

## Decisions

도포 mask를 단일 원천으로 정리하고 카메라와 시유 포인터 모드를 분리한다.

## Assumptions

유약 종류는 현재 선택지를 우선 재사용한다.

## Relevant context

`src/main.ts`의 glaze mask·포인터·카메라, `src/game/process.ts`

## Allowed scope

시유 입력, 카메라 충돌, 도포 두께, 소성 결함, 관련 테스트

## Forbidden scope

가마 열작업 전체 재설계, 주문 시스템

## Acceptance criteria

- 선택한 시유 방식의 이유가 DESIGN에 기록된다.
- 시유하면서 작품을 회전·확대할 수 있다.
- 미도포·얇음·적정·과도포가 결과 표면에서 구별된다.
- 유약 변경과 재시작 시 mask가 정확히 초기화된다.
- 손잡이와 덧댄 흙도 의도한 방식으로 시유된다.

## Human judgment

직접 바르는 손맛과 전체 표면 확인이 모두 가능한가?

## Verification

mask·두께 unit 테스트, 카메라/시유 E2E, 소성 전후 렌더 비교

## Rollback

두께·결함을 제거하고 현재 단일 도포율 기반 시유로 복구한다.
