# jk-active-balancer

[English README](README.md)

**지콩(JiKong) JK-B2A16S 2S-16S 2A 스마트 액티브 밸런서**용 비공식 오픈소스
모니터입니다. Android/iOS는 React Native, 데스크톱·Android Chrome은 Web Bluetooth
PWA로 동작합니다.

> **에이전트 인계:** Hermes 또는 다른 코딩 에이전트는 `AGENTS.md`를 먼저 읽고
> `PROJECT_STATUS.md`를 확인하십시오. 이 저장소는 GitHub 경로만으로 작업을
> 이어갈 수 있도록 준비되어 있습니다.

## Phase 1 범위

검증된 단일 장치, 읽기 전용:

```text
모델      JK-B2A16S
하드웨어  3.0
소프트웨어 3.3.0
프로토콜  JK04
서비스    FFE0   캐릭터리스틱 FFE1
```

포함: 스캔, 연결, 자동 재접속, 장치 정보, JK04 자동 감지, 셀 1~16 전압,
min/max/delta/average, 밸런서 상태·전류, 설정 읽기, raw 패킷 로거, fixture
리플레이, Android/iOS/PWA 빌드.

제외: **설정 쓰기(Write)** 와 다른 JK 모델. 설정 쓰기는 Phase 2의 화이트리스트
전용 기능입니다(설계 §15). 인터페이스(`JkSettingsWriter`)만 존재하고 모든 메서드는
거부됩니다.

## 모노레포 구조

```text
apps/web            Vite + React + TS, Web Bluetooth PWA
apps/mobile         React Native 골격
packages/jk-protocol     JK04 상수·CRC·프레임·디코더·프로파일
packages/ble-core        BleTransport·상태머신·재접속·파이프라인·Mock
packages/ble-web         Web Bluetooth 어댑터
packages/ble-react-native react-native-ble-plx 어댑터(구조)
packages/device-model    배터리/셀/밸런서 도메인 모델
packages/ui-common       셀 그리드 레이아웃 헬퍼
fixtures/jk-b2a16s       device-info / settings / status / malformed
docs/                    프로토콜 설계·결정 로그·업스트림 고정
.github/workflows/ci.yml lint / typecheck / unit-test / web-build
```

`apps/mobile`은 골격만 있고 아직 pnpm 워크스페이스 멤버가 아닙니다. Phase 1
설치를 가볍고 결정적으로 유지하기 위한 결정입니다(`docs/decision-log.md` D005).

## 개발

요구사항: Node >= 22.12(개발 환경 Node 26.8.1), pnpm 12.8.1.

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm build:web
bash scripts/verify.sh
```

의존성은 exact 버전으로 고정하며, `pnpm check:pins`가 `^`/`~`를 거부합니다
(설계 §32).

## 프로토콜 근거

프로토콜 사실·패킷 레이아웃·예시 프레임은 `syssi/esphome-jk-bms`에서 가져왔습니다.

```text
tag 3.0.0   commit b3016df3799095c0760e0a578d04dc7185a1c74a   Apache-2.0
```

업스트림 소스 코드는 복사하지 않았습니다. `THIRD_PARTY_NOTICES.md`와
`docs/upstream-lock.json`을 참고하십시오.

`encap/better-bms-app`은 Web Bluetooth UX 참고용입니다. **라이선스가 없으므로**
코드를 재사용하지 않습니다.

## 현재 상태

Phase 1 초기 스캐폴드입니다. JK04 코덱, 프레임 조립기, device-info/cell-info
디코더와 도메인·전송 계층은 구현되어 있고 실제 업스트림 프레임 기반 테스트를
통과합니다. 실장비 캡처와 네이티브 빌드는 `PROJECT_STATUS.md`에 추적됩니다.

## 안전

설정 쓰기는 배터리 안전에 영향을 줄 수 있습니다. Phase 1은 장치에 절대 쓰지
않습니다. 향후 쓰기 경로는 capability 게이트·화이트리스트·staged 검증·read-back을
모두 통과해야 하며, BLE 쓰기 성공만으로 올바른 설정이라고 판단하지 않습니다.

본 프로젝트는 지콩(JIKONG)과 무관한 비공식 커뮤니티 프로젝트입니다.

## 라이선스

MIT. `LICENSE` 참고.
