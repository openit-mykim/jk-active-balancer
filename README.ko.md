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

제외: 다른 JK 모델, 그리고 **활성화된** 설정 쓰기. 업스트림이 JK04에 정의한 유일한
레지스터(밸런서 스위치 `0x6C`)에 대한 쓰기 경로와 read-back 검증은 구현되어 있지만,
실장비 검증 전까지 장치 프로파일에서 비활성입니다(설계 §15, 결정 D011). 밸런스
시작/델타 전압은 업스트림에 JK04 쓰기 레지스터가 없습니다.

## 모노레포 구조

```text
apps/web            Vite + React + TS, Web Bluetooth PWA
apps/mobile         React Native 0.87.1 앱(Android + iOS), npm 프로젝트
packages/jk-protocol     JK04 상수·CRC·프레임·디코더·프로파일
packages/ble-core        BleTransport·BmsSession·워치독·로거·디버그 export·Mock
packages/ble-web         Web Bluetooth 어댑터
packages/ble-react-native react-native-ble-plx 어댑터
packages/device-model    도메인 모델·통계·히스토리/CSV
packages/ui-common       셀 그리드 레이아웃·색상 임계값
fixtures/jk-b2a16s       device-info / settings / status / malformed
docs/                    프로토콜 설계·결정 로그·업스트림 고정
.github/workflows/ci.yml lint / typecheck / unit-test / web-build / android-build / ios-build
```

`apps/mobile`은 pnpm 워크스페이스 밖의 독립 npm 프로젝트이며, `packages/*`를
Metro를 통해 TypeScript 소스로 사용합니다(`docs/decision-log.md` D005, D013,
`apps/mobile/README.md`).

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

Phase 1 소프트웨어 구현 완료: JK04 코덱, 설정/device-info/cell-info 디코더,
재접속·워치독을 갖춘 연결 세션, raw 로거, 디버그 export, fixture 리플레이, Web
Bluetooth 대시보드, React Native 앱. 모두 업스트림 문서화 프레임으로 테스트했으며
**실장비 JK-B2A16S 검증은 아직 없습니다**. `PROJECT_STATUS.md`를 참고하십시오.

## 안전

설정 쓰기는 배터리 안전에 영향을 줄 수 있습니다. 배포 프로파일은 장치에 절대 쓰지
않습니다. 향후 쓰기 경로는 capability 게이트·화이트리스트·staged 검증·read-back을
모두 통과해야 하며, BLE 쓰기 성공만으로 올바른 설정이라고 판단하지 않습니다.

본 프로젝트는 지콩(JIKONG)과 무관한 비공식 커뮤니티 프로젝트입니다.

## 라이선스

MIT. `LICENSE` 참고.
