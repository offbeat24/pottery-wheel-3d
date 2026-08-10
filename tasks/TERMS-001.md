---
id: TERMS-001
title: 도예 용어와 상황별 도움말
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

일부 UI 단어가 실제 도예 용어와 다르고 우상단 안내 문구가 상황과 무관하거나 이해하기 어렵다.

## What we are shipping

- 단계와 도구 이름을 실제 도예 용어로 정리한다.
- 처음 등장하는 용어에는 짧고 쉬운 설명을 제공한다.
- 우상단 텍스트를 현재 단계·도구에 맞는 도움말 패널로 교체한다.
- 도움말을 열고 닫을 수 있고 조작을 가리지 않게 한다.

## What we are not shipping

- 긴 도예 교과서, 다국어 번역, 음성 튜토리얼

## Facts

현재 단계·도구·상태 문구가 여러 위치에 직접 작성되어 있다.

## Decisions

용어 사전 데이터를 하나 두고 HUD와 도움말이 공유한다.

## Assumptions

전문 용어 뒤에 초보자용 한 줄 풀이를 붙인다.

## Relevant context

`src/main.ts` HUD·도움 문구, `README.md`, `DESIGN.md`

## Allowed scope

용어 데이터, 도움말 UI, 단계별 안내, 접근성·테스트

## Forbidden scope

게임 물성·점수·3D 기능 변경

## Acceptance criteria

- 중심잡기·성형·건조·가죽경도·굽깎기·초벌·시유·재벌 용어가 일관된다.
- 도움말이 현재 단계와 선택 도구에 맞게 바뀐다.
- 키보드와 스크린리더로 도움말을 사용할 수 있다.
- 1440×900에서 점토와 핵심 조작을 가리지 않는다.

## Human judgment

초보자도 이해하면서 실제 도예 용어를 배우는가?

## Verification

문구·접근성 테스트, 단계별 E2E, 실제 HUD 확인

## Rollback

용어 사전과 도움말을 제거하고 기존 정적 안내 문구로 복구한다.
