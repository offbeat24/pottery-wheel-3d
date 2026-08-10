---
id: KILN-001
title: 온도와 열작업 기반 소성
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

900~1300°C 숫자는 선택할 수 있지만 저온·적정·고온이 형태와 유약에 미치는 차이가 충분히 일관되지 않는다.

## What we are shipping

- 흙과 유약별 적정 소성 범위를 명시한다.
- 낮은 온도에서는 미성숙·무광·약한 발색이 나타난다.
- 적정 온도에서는 의도한 색과 표면이 나온다.
- 높은 온도에서는 변형·유약 흐름·색 변화 위험이 커진다.
- 단순 온도 숫자뿐 아니라 시간과 열작업을 게임용 규칙으로 반영한다.

## What we are not shipping

- 실제 cone 데이터베이스, 가마 내부 위치별 CFD, 연료 종류

## Facts

현재 온도와 유약 종류에 따른 점수·색 계산이 일부 구현되어 있다.

## Decisions

실제 범위를 참고하되 짧은 세션용 명시적 구간 모델을 사용한다.

## Assumptions

하나의 전기가마와 한 종류의 기본 점토를 사용한다.

## Relevant context

`src/game/process.ts`, 가마 UI, 결과 재질

## Allowed scope

온도·열작업 규칙, 형태 변형, 색·유약 결과, 관련 테스트

## Forbidden scope

건조·초벌 단계, 주문 생성, 유약 입력 방식

## Acceptance criteria

- 무유약과 각 유약이 저온·적정·고온에서 다른 결과를 낸다.
- 너무 높은 온도는 형태 변형 위험을 만든다.
- 결과 화면이 선택 온도와 실제 재질 상태를 동일하게 설명한다.
- 900·1300 경계와 모든 유약 조합이 테스트된다.

## Human judgment

온도 선택이 정답 맞히기가 아니라 재료 판단처럼 느껴지는가?

## Verification

조합 테이블 unit 테스트, 소성 결과 E2E, 렌더 비교

## Rollback

열작업·변형을 제거하고 기존 단일 온도 점수 모델로 복구한다.
