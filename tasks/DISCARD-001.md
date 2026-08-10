---
id: DISCARD-001
title: 성형 중 젖은 작품 폐기
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

성형 중 다시 만들고 싶을 때 즉시 리셋되어 작품을 실제로 뭉개고 치우는 감각이 없다.

## What we are shipping

- 성형 중 폐기를 선택하면 손이 주먹으로 바뀌어 젖은 작품을 눌러 무너뜨린다.
- 무너진 흙을 물레에서 치운 뒤 새 흙덩이가 놓인다.
- 애니메이션 중 다른 입력을 잠그고 완료 후 같은 주문을 다시 시작한다.

## What we are not shipping

- 폭력적인 신체 표현, 파편 물리, 점수 결과물 깨기

## Facts

현재 다시 시작은 상태를 즉시 초기화한다.

## Decisions

짧은 단계 애니메이션과 기존 reset 함수를 연결한다.

## Assumptions

젖은 흙은 깨지지 않고 찌그러져 치워진다.

## Relevant context

재시작 버튼, 손 메시, 점토 변형·reset

## Allowed scope

주먹·붕괴·치우기 애니메이션, 입력 잠금, 관련 테스트

## Forbidden scope

구운 도자기 파손, 주문 변경

## Acceptance criteria

- 확인 후 젖은 작품이 눌려 무너지고 치워진다.
- 애니메이션 중 성형·카메라·마감 입력이 실행되지 않는다.
- 완료 후 모든 제작 상태가 정확히 초기화된다.
- 반복 실행해도 메시나 이벤트가 누적되지 않는다.

## Human judgment

애니메이션이 불쾌하거나 과장되지 않고 작업장 행동처럼 보이는가?

## Verification

reset unit 테스트, 입력 잠금·애니메이션 E2E, 실제 렌더 확인

## Rollback

애니메이션을 제거하고 즉시 재시작으로 복구한다.
