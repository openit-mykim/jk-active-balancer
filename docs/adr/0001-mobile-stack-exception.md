# ADR 0001 (제안) — 모바일 스택 예외: React Native 유지

- 상태: **제안 — 대표 승인 필요** (위키 "모바일 앱 개발 표준" §0.4, §2)
- 작성: 2026-11-16, Claude Code (jk-active-balancer)
- 관련: 위키 `infra/개발표준_도구/모바일앱_개발표준.md`, 설계서 `personal/hobby/battery/jk-active-balancer-detailed-design-v1.1.md`, 결정 로그 D005·D013·D016·D017

## 충돌 지점

표준 §1은 신규 앱을 "Android 코틀린 → iOS 스위프트, 로직은 KMP 공유"로 하고 React Native를 신규 앱의 기본 스택으로 쓰지 않는다.
jk-active-balancer 모바일 앱은 React Native 0.87.1이다.

적용 범위(§2)가 애매하다.
- 표준 적용일은 2026-11-10이고, 이 프로젝트는 2026-10-02에 RN으로 착수했다(설계서 v1.1 §4 결정).
- "이미 양 플랫폼 배포 운영 중" 예외에는 해당하지 않는다(미배포).

## 판단 근거 (§0.2 판단 규칙 대조)

| 질문 | RN 유지(현행) | Kotlin + KMP 전환 |
|---|---|---|
| 상태·로직·계약이 한 곳에 모이는가 | **예** — 프로토콜·세션·도메인·토큰·문구가 TS 한 곳(`packages/*`)에 있고, 웹(Web Bluetooth)과 모바일이 같은 코드를 쓴다 | 아니오 — 웹은 TS로 남으므로 같은 JK04 프로토콜을 TS와 Kotlin 두 곳에 구현해야 한다 |
| 같은 결정을 두 곳에 적는가 | 아니오 | **예** (프로토콜 디코더·세션 상태머신·화면 결정 로직) |
| 수정 지점을 이름 하나로 지정할 수 있는가 | 예 (`@jk-active-balancer/jk-protocol` 등) | 플랫폼별로 둘 |
| 실패를 실행 결과로 확인할 수 있는가 | 예 (vitest 145건 + CI android/ios 빌드 + 실기기) | 예 |

표준 §0 상위 원칙("진실의 원천 하나")은 세부 규칙보다 우선한다고 표준 스스로 정한다. 웹 앱이 제품 요구사항(설계서 §0: Chrome Web Bluetooth 지원)인 이 프로젝트에서는 RN 유지가 상위 원칙에 더 맞다.
§4.2의 RN 반증 사례(gesture-handler / svg 코드젠 충돌)는 해당 라이브러리를 쓰지 않아 재현되지 않는다. 네이티브 의존성은 `react-native-ble-plx`, `react-native-safe-area-context`, `@react-native-async-storage/async-storage` 3개이고, CI android-build / ios-build가 매 커밋 통과한다.

## 대안

1. **(권장) RN 유지 + 표준 나머지 항목 준수.** 디자인 토큰, 저장소 스키마 버전, 접근성, i18n, 버전 단일 출처, 릴리스 가드 등을 지킨다. 점검 결과는 `docs/mobile-standard-audit.md`에 있다.
2. Android를 Kotlin 네이티브로 재작성하고 프로토콜을 KMP로 옮긴다. 웹은 TS 유지(이중 구현) 또는 Kotlin/JS(웹 Bluetooth 바인딩 신규 작성)로 간다. 전 기능 재구현이 필요하고 iOS 일정은 별도다.
3. 네이티브 셸 + 웹뷰 하이브리드(표준 §1 인정 수단). 그러나 BLE는 네이티브 필수(§3.1)라 브리지 명세·버전 협상이 추가되고, 화면 대부분이 실시간 BLE 데이터라 이점이 작다.

## 요청

대안 1을 승인하면 위키 표준 §9 현황 표에 이 프로젝트를 예외로 등재해 주기 바란다. 대안 2·3을 택하면 착수 범위와 일정을 별도로 산정한다.
