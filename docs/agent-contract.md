# Agent Execution Contract (jk-active-balancer)

> 이 문서는 저장소에서 작업하는 AI 코딩 에이전트를 위한 실행 계약입니다.
> 루트에 `AGENTS.md`가 준비되면 그 파일이 정본이 되고, 이 문서는 같은 내용의 사본으로 유지합니다.

## 먼저 읽을 것

1. `PROJECT_STATUS.md`
2. `docs/protocol-design.md`
3. `docs/architecture.md`
4. `docs/testing.md`
5. `docs/dependency-pins.md`
6. `docs/decision-log.md`
7. `docs/upstream-lock.json`

`README.md`만 보고 구현을 시작하지 않는다.

## 프로젝트 목표

**jk-active-balancer** — JK-B2A16S(JK04 / BLE) 모니터 앱. Android·iOS 네이티브와 Chrome(Web Bluetooth)을 지원한다. JiKong 비공식 앱이다.

Phase 1 범위는 고정이며 넓히지 않는다:

- 장치: `JK-B2A16S`, hardware `3.0`, software `3.3.0`
- 프로토콜: `JK04`만
- BLE: Service `0xFFE0`, Characteristic `0xFFE1`
- 범위: **읽기 전용 + 진단** (스캔·연결·자동 재연결·device info·셀 전압·델타·밸런서 상태·raw 패킷 로거·fixture 리플레이)

다른 JK 모델, `JK02_24S`, `JK02_32S`, RS485, CAN은 Phase 1 범위 밖이다.

## 실행 규칙

작업 전에 항상 `PROJECT_STATUS.md`를 확인하고 **첫 번째 미완 단계**를 이어간다. 뒤 단계 기능이 더 흥미로워 보여도 건너뛰지 않는다.

설계 결정은 `docs/decision-log.md`에 `D` 번호로 기록한다. 기존 결정을 바꾸면 새 항목을 추가하고 과거 기록을 조용히 고치지 않는다.

## 절대 규칙

1. **프로토콜을 추측하지 않는다.** 패킷 레이아웃·오프셋·명령·체크섬은 핀된 업스트림 `syssi/esphome-jk-bms`(`docs/upstream-lock.json`) 또는 실장비 캡처에서만 온다. `JK02` 레이아웃이나 RS485/CAN 레지스터 맵을 BLE `JK04` 경로에 적용하지 않는다.
2. **계층을 분리한다.** BLE transport, frame assembly, protocol decode, device model, UI를 각각 다른 패키지에 둔다. UI 컴포넌트 안에서 패킷을 파싱하지 않는다. BLE notification 한 건은 완전한 프레임이 아니라 조각이다.
3. **fixture가 파서보다 먼저다.** fixture 테스트를 먼저 쓴다. 모든 fixture는 출처를 표기한다 — 실장비 캡처는 캡처 데이터로, 합성 프레임은 파일명에 `synthetic`을 넣고 `fixtures/jk-b2a16s/README.md` 표에 등록한다. 합성 프레임을 실측으로 표기하지 않는다.
4. **읽기 전용이 먼저다.** 설정 쓰기는 `JkSettingsWriter` 인터페이스 뒤에 두고, 업스트림 검증 레지스터·fixture·실장비 read-back이 모두 갖춰지기 전까지 비활성으로 둔다(설계 §15, §34). raw `writeRegister(address, value)`를 UI에 노출하지 않는다.
5. **플랫폼 한계를 인정한다.** iOS Safari와 iOS Chrome은 Web Bluetooth를 지원하지 않는다. 웹 빌드로 iPhone을 지원하려 시도하지 않는다 — iPhone은 네이티브 앱으로 배포한다.
6. **버전은 exact로 고정한다.** 의존성에 `^`·`~`를 쓰지 않는다. `scripts/check-pins.mjs`가 CI에서 강제한다. 업스트림은 커밋을 기록하고 `main`을 자동 추적하지 않는다.
7. **라이선스를 지킨다.** `syssi/esphome-jk-bms`는 Apache-2.0이므로 귀속 표시와 라이선스 사본을 `THIRD_PARTY_LICENSES/`에 유지한다. `encap/better-bms-app`은 **라이선스가 없으므로** 코드를 절대 복사하지 않는다 — 문서화된 BLE·Web Bluetooth 운용 교훈만 설계 노트에 참고한다.
8. **비공식 앱임을 유지한다.** JiKong과 제휴 관계가 없다. 코드·UI 문구·릴리스 노트에서 제조사 보증을 암시하지 않는다.

## 검증 규율

- 실제로 실행한 것만 보고한다. 실제 명령 출력을 붙이고, 돌리지 않은 테스트를 통과했다고 쓰지 않는다.
- 완료 조건: 로컬 집중 테스트 통과 + 푸시한 커밋의 CI green + 원격 커밋 SHA read-back.
- 실장비 JK-B2A16S 캡처가 생기기 전까지 하드웨어 관련 주장은 `NOT HARDWARE VERIFIED`로 표기한다.
- 결함을 찾으면 **회귀인지 기존 결함인지 먼저 판정**하고 어느 쪽인지 밝힌다.

## 작업 방식

- 사소하지 않은 변경은 격리된 Paseo 워크트리에서 한다. 워크트리 하나에 작업 하나, 브랜치 접두사는 변경 성격에 맞춘다(`feat/`, `fix/`, `refactor/`, `test/`, `chore/`).
- 무관한 변경을 한 커밋에 섞지 않는다. 경로를 명시해 스테이징한다.
- 동작을 바꾸는 커밋에서는 `PROJECT_STATUS.md`와 `docs/decision-log.md`를 같은 커밋에서 갱신한다.
