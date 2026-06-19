# SnapPrompt — PRD

> Chrome 익스텐션: 웹서핑 중 마음에 든 LLM 프롬프트를 빠르게 저장하고("Snap"), LLM 사이트에서 단축키 한 번으로 꺼내 쓰는 도구.

| 항목 | 값 |
| --- | --- |
| 문서 버전 | 1.0 |
| 작성일 | 2026-05-29 (최종 갱신 2026-06-01) |
| 상태 | v1.0.0 구현 완료 · 웹스토어 비공개(Unlisted) 검토 중 |
| 작성자 | kyocustom@gmail.com |

### 변경 이력
- **1.0** (2026-06-01): v1.0.0 출시 기준으로 최신화. 변수 8타입+조건부, 이미지·영상 생성 옵션(파라미터 토글·네거티브·레퍼런스·조립 엔진), 버전 히스토리·A/B 비교·삽입 기록, 표시 모드 3종(팝업/창/사이드 패널, 마지막 모드 기억), 커스텀 i18n 런타임 반영. 옴니박스 키워드는 시도 후 호환성 문제로 제거.
- **0.2** (2026-05-29): Q1~Q8 결정 확정, 추가 이슈 10건 반영. 이름 SnapPrompt 확정. Fuse.js, 무제한 폴더, 다크 모드, i18n MVP 포함.
- **0.1** (2026-05-29): 브레인스토밍 결과 초안.

---

## 1. 개요

### 1.1 문제 정의

LLM이 일상화되면서 좋은 프롬프트를 발견하는 일이 잦다. 하지만 현재의 보관/재사용 흐름은 마찰이 크다:

- **저장 측면**: 메모장, Notion, 북마크 등 도구가 분산되어 있고, 저장 자체가 컨텍스트 스위칭을 일으킨다.
- **재사용 측면**: 보관해둔 프롬프트를 다시 찾고, 변수 부분(예: 코드, 주제)을 수동으로 바꿔서 LLM 입력창에 붙여넣어야 한다.
- **변수 관리 측면**: 같은 프롬프트를 매번 일부만 바꿔서 쓰는 경우, 템플릿화가 안 되어 있어 매번 처음부터 수정한다.

### 1.2 솔루션 요약

웹 어디서든 텍스트를 선택 → 우클릭 또는 단축키로 저장(Snap). LLM 사이트(또는 일반 입력창)에서 단축키 한 번으로 검색 가능한 피커를 띄우고, 변수가 있으면 폼으로 채워서 자동 삽입. 이미지·영상 생성 프롬프트는 파라미터 토글·네거티브·레퍼런스까지 함께 조립하며, 편집 이력과 삽입 기록으로 반복 작업을 돕는다.

### 1.3 차별화 포인트

기존 도구들(AIPRM, PromptBox, TextExpander 등)과의 차이:

- **범용 자동 삽입**: 특정 LLM 사이트가 아닌, 포커스된 모든 입력창에 삽입 가능
- **강력한 변수 템플릿**: `{{변수|기본값}}` 외에 드롭다운·날짜·숫자·컬러·토글·코드·조건부 블록(`{{#if}}`)까지 8타입, 모달 폼으로 채움
- **이미지·영상 생성 도메인**: Midjourney·Pika 파라미터 토글, 네거티브 프롬프트, 레퍼런스 이미지를 `[레퍼런스]+[본문]+[파라미터]+[네거티브]`로 자동 조립
- **반복·이터레이션 지원**: 편집 버전 히스토리·되돌리기·A/B 비교, 삽입 기록과 최근 사용값 재사용
- **로컬 우선 + JSON 백업**: 외부 서버 의존 없음, 데이터 소유권은 사용자에게
- **여러 표시 모드**: 툴바 팝업 · 분리된 창 · 사이드 패널 (마지막 사용 모드 기억) + 인라인 피커
- **퍼지 검색**: 오타·일부 단어만 기억나도 찾을 수 있음

---

## 2. 목표와 비목표

### 2.1 목표 (Goals)

1. 웹페이지에서 발견한 프롬프트를 10초 이내에 저장할 수 있다.
2. 저장된 프롬프트를 LLM 입력창에 단축키 한 번으로 가져올 수 있다.
3. 변수가 포함된 프롬프트를 폼으로 채워서 완성된 형태로 삽입한다.
4. 사용자 데이터는 로컬에 저장되고, JSON으로 백업/복원할 수 있다.
5. 폴더와 태그로 프롬프트를 분류·검색할 수 있다.
6. 다크/라이트 테마, 한국어/영어 UI를 시스템 설정에 맞춰 자동 제공한다.
7. 이미지·영상 생성 프롬프트의 파라미터·네거티브·레퍼런스를 한 번에 구성·삽입할 수 있다.
8. 편집 이력·삽입 기록으로 프롬프트를 반복 개선하고 비교할 수 있다.

### 2.2 비목표 (Non-Goals, v1 기준)

- 클라우드 동기화 (구글 계정 sync 포함, 100KB 한도 때문에 안전성 떨어짐)
- 프롬프트 공유 / 마켓플레이스 / 커뮤니티
- LLM API 직접 호출 (프롬프트 실행 X — 어디까지나 "관리·삽입" 도구)
- 모바일 / 다른 브라우저(Firefox, Safari) 지원
- 협업 / 팀 공유 기능
- AI 기반 프롬프트 자동 분류/추천

---

## 3. 타겟 사용자

### 3.1 주 페르소나: LLM 헤비 유저

- LLM을 매일 여러 차례 사용
- 코딩, 글쓰기, 번역, 학습 등 다양한 용도
- 좋은 프롬프트를 트위터/블로그/공유 사이트에서 자주 발견함
- 같은 류의 프롬프트(코드 리뷰, 번역, 요약 등)를 반복적으로 사용
- 기술적 학습 능력 있음 (단축키, 변수 문법 등 익숙)

### 3.2 부 페르소나: 업무 자동화 사용자

- 직무상 LLM을 자주 활용 (마케팅, 콘텐츠, 고객 응대 등)
- 회사/팀이 가진 표준 프롬프트가 있고 그걸 일관되게 쓰고 싶음
- 단순 텍스트 관리 도구로 시작해서 점차 변수화에 익숙해질 사용자

---

## 4. 핵심 사용자 여정

### 4.1 저장 흐름 (Capture / Snap)

```
[1] 웹페이지에서 프롬프트 텍스트 선택

[2] 다음 중 하나로 저장 트리거
   (a) 우클릭 → "SnapPrompt에 저장"
   (b) 사용자가 지정한 단축키

[3] 저장 모달(콘텐츠 스크립트 오버레이) 등장
   ├─ 제목: 자동 추정(첫 줄 또는 첫 60자) + 편집 가능
   ├─ 본문: 선택한 텍스트가 미리 채워짐
   ├─ 변수: 본문에서 {{...|...}} 자동 추출, 사용자가 추가/편집 가능
   ├─ 폴더: 드롭다운 + 신규 생성
   ├─ 태그: 자유 입력 (쉼표 또는 Enter로 구분, 기존 태그 자동완성)
   ├─ 메모: 선택적
   └─ 출처 URL: 자동 기록

[4] 중복 본문이 있으면 "이미 비슷한 게 있어요" 경고 + [기존 보기 / 어쨌든 저장]

[5] 저장 → chrome.storage.local 기록 → 모달 닫힘 → 토스트 알림
```

### 4.2 사용 흐름 — A. 팝업 경로 (주 흐름)

```
[1] 익스텐션 아이콘 클릭 → 팝업 열림 (400x600)

[2] 검색바에 키워드 입력 (Fuse.js 퍼지 매칭, 제목/본문/태그)
   ├─ 필터: 폴더 트리, 태그(다중 선택), 즐겨찾기
   └─ 결과 리스트: 제목 + 첫 줄 미리보기 + 태그 배지 + 변수 개수

[3] 사용 방식 선택
   (a) [복사] 버튼 → 변수 있으면 모달 → 입력 후 클립보드 복사
   (b) [삽입] 버튼 → 활성 탭의 포커스된 입력창에 삽입 시도
   (c) 카드 클릭 → 인플레이스 상세 보기 → [편집] 가능
   (d) [⭐] 즐겨찾기 토글
```

### 4.3 사용 흐름 — B. 인라인 피커 (보조 흐름 1)

```
[1] LLM 사이트 또는 아무 contenteditable/textarea에 포커스

[2] 단축키 입력 (사용자 지정)

[3] Spotlight 스타일 피커가 페이지 위에 오버레이
   ├─ 검색 인풋 + 결과 리스트
   ├─ ↑↓ 탐색, Enter 선택, Esc 닫기
   └─ 기본 정렬: 최근 사용 + 자주 사용 가중치

[4] 프롬프트 선택
   ├─ 변수 있음: 변수 입력 모달 → 입력 → [삽입] 클릭
   └─ 변수 없음: 즉시 현재 포커스된 입력창에 삽입

[5] 입력창에 텍스트가 들어가 있고, 사용자는 Enter로 전송
```

### 4.4 사용 흐름 — C. 플로팅 버튼 (보조 흐름 2)

```
[1] 텍스트 입력창 포커스 시 옆에 작은 플로팅 버튼이 페이드인

[2] 버튼 클릭 → 인라인 피커 발동 (4.3과 동일)

[3] 옵션에서 플로팅 버튼 ON/OFF 가능, 활성 사이트(화이트리스트) 추가/제거 가능
```

### 4.5 첫 사용 흐름 (Onboarding)

```
[1] 설치 직후 옵션 페이지가 새 탭으로 자동 오픈

[2] 환영 화면 (4단계)
   ├─ 1단계: 단축키 설정 안내 (chrome://extensions/shortcuts 링크 + 가이드)
   ├─ 2단계: 샘플 프롬프트 5개 추가 / 빈 상태로 시작 선택
   ├─ 3단계: 기능 하이라이트 (변수·이미지/영상 옵션·버전 기록·표시 모드)
   └─ 4단계: 다크 모드, 언어 확인 (자동 감지된 값 표시 + 변경 가능)

[3] "시작하기" → 옵션 페이지 메인으로 전환
```

---

## 5. 기능 요구사항

### F1. 프롬프트 저장 (Snap)

- F1.1 선택한 텍스트로부터 저장 모달 열기 (우클릭 메뉴, 단축키)
- F1.2 저장 모달 필드: 제목, 본문, 변수, 폴더, 태그, 메모, 출처 URL
- F1.3 본문에서 `{{변수명}}` 또는 `{{변수명|기본값}}` 자동 추출 → 변수 리스트에 미리 채움
- F1.4 폴더 미선택 시 "분류 없음"으로 저장
- F1.5 출처 URL 자동 캡처 (편집 가능)
- F1.6 저장 직후 토스트 알림 ("저장됨 - 팝업에서 확인")
- F1.7 **중복 감지**: 본문이 기존 항목과 완전 일치하면 모달에 경고 표시 + [기존 보기] / [어쨌든 저장] 선택
- F1.8 키보드: Cmd+Enter 저장, Esc 취소

### F2. 검색과 탐색

- F2.1 **퍼지 검색** (Fuse.js): 오타·부분 단어 대응. 검색 대상은 제목 + 본문 + 태그
- F2.2 정렬 옵션: 최근 사용 / 최근 저장 / 자주 쓴 순 / 이름순
- F2.3 필터: 폴더(트리에서 선택), 태그(다중), 즐겨찾기, 종류(전체 → 일반 → 이미지 → 영상 순환)
- F2.4 빈 결과 시 "검색 결과 없음 + 새 프롬프트 만들기" CTA
- F2.5 검색·필터 상태는 팝업 세션 동안 유지, 닫으면 초기화

### F3. 변수 시스템

- F3.1 변수 문법: `{{name}}` · `{{name|기본값}}` · `{{name:type(...)}}`. 타입 8종(text·textarea·number·date·color·select·boolean·code) + 조건부 블록 `{{#if name}}…{{/if}}` (상세 §6.3)
- F3.2 변수 입력 모달: 타입별 컨트롤(입력·드롭다운·토글·컬러피커 등) 자동 렌더
- F3.3 모달 하단에 "미리보기" — 변수 치환 + (이미지/영상이면) 파라미터·네거티브까지 조립된 최종 결과 표시
- F3.4 변수도 없고 이미지/영상도 아닌 프롬프트는 모달 생략하고 바로 복사/삽입
- F3.5 "마지막 입력값 기억" 옵션(설정) + 변수 모달의 "최근 사용값" 칩(직전 N개 fill-set 재적용)
- F3.6 변수 프리셋(채움 세트) 저장/적용
- F3.7 모달은 Esc로 취소, Cmd+Enter로 적용

### F4. 자동 삽입 (Insert)

- F4.1 단축키 → 인라인 피커 발동
- F4.2 옵션: 포커스 시 플로팅 버튼 표시 ON/OFF
- F4.3 삽입 대상: `document.activeElement`
  - textarea / input: `selectionStart`에 삽입, 커서 위치 보존
  - contenteditable: `document.execCommand('insertText')` (React/Vue state 동기화 위함)
  - 폴백: `InputEvent` dispatch
- F4.4 삽입 후 입력창에 포커스 유지, 커서는 삽입 끝 지점
- F4.5 삽입 실패 시 클립보드로 폴백 + 토스트 알림

### F5. 콘텐츠 스크립트 격리

- F5.1 모든 콘텐츠 스크립트 UI(저장 모달, 인라인 피커, 변수 모달, 플로팅 버튼, 토스트)는 **Shadow DOM** 안에 렌더링
- F5.2 페이지 스타일과 완전 격리, 페이지 JS에서 접근 불가
- F5.3 z-index는 최대값(2147483647) 사용
- F5.4 키보드 이벤트는 캡처 단계에서 처리하여 페이지의 keydown 핸들러 간섭 회피

### F6. 분류 (폴더 + 태그)

- F6.1 **폴더**: 계층 구조 **무제한 깊이**, 한 프롬프트는 1개 폴더에만 소속
- F6.2 **태그**: N:M, 자유 입력, 자동완성
- F6.3 팝업의 왼쪽 사이드에 폴더 트리 (접기/펼치기)
- F6.4 폴더 CRUD: 옵션 페이지에서 관리. 삭제 시 하위 폴더는 부모로 승격, 프롬프트는 "분류 없음"으로
- F6.5 태그 자동완성: 기존 태그 중 매칭되는 것 제안
- F6.6 옵션 페이지에서 태그 이름변경/병합/삭제 가능

### F7. 편집

- F7.1 팝업의 카드 클릭 → 같은 팝업 안에서 인플레이스 편집 뷰로 전환
- F7.2 편집 뷰 필드는 저장 모달과 동일
- F7.3 [저장] / [취소] / [삭제] 버튼. 삭제는 이중 확인
- F7.4 변수 추출은 본문 수정 시 실시간 갱신 (수동 추가/제거도 가능)
- F7.5 옵션 페이지에도 전체 프롬프트 리스트 + 편집 UI 제공 (대량 관리용)

### F8. 백업과 복원

- F8.1 수동 export: 옵션 페이지에서 "JSON으로 내보내기"
- F8.2 수동 import: JSON 파일 업로드 → 미리보기 + 충돌 항목 표시
- F8.3 **Import 충돌 정책**: 동일 ID 발견 시 항목별로 [건너뛰기 / 덮어쓰기 / 새 ID로 추가] 선택 (또는 전체 일괄 적용)
- F8.4 ~~자동 백업~~ — **제거됨(v1.0.0)**. 웹스토어 최소 권한 정책에 맞춰 `chrome.downloads`/`chrome.alarms` 권한을 없앴다. 수동 export만 제공.
- F8.5 export는 권한 없이 동작 — Blob + `<a download>` 앵커 클릭으로 다운로드 폴더에 저장(`downloadBackup`).
- F8.6 백업 파일명: `snapprompt-backup-YYYY-MM-DD.json`
- F8.7 **내부 스냅샷**: 앱(팝업/옵션) 오픈 시 마지막 스냅샷이 24h 이상 오래됐으면 `chrome.storage.local`에 스냅샷 적재(`maybeSnapshot`), 최근 N개(기본 7개) 유지 (롤백용). alarms 없이 동작.
- F8.8 옵션에서 스냅샷 목록 보기 + 특정 시점으로 롤백 가능
- F8.9 마지막 외부 백업이 30일 이상 오래되면 옵션 페이지에 배너로 안내

### F9. 옵션 / 설정 페이지

- F9.1 폴더 관리 (트리 뷰, CRUD)
- F9.2 태그 관리 (목록, 이름변경/병합/삭제)
- F9.3 백업 설정 (수동 내보내기/가져오기, 마지막 백업 시각, 스냅샷 롤백 — 자동 백업 주기는 제거됨)
- F9.4 단축키 안내 (실제 변경은 `chrome://extensions/shortcuts` 링크)
- F9.5 플로팅 버튼 ON/OFF
- F9.6 테마: 시스템 / 라이트 / 다크
- F9.7 언어: 시스템 / 한국어 / 영어
- F9.8 데이터 전체 삭제 (이중 확인)
- F9.9 **활성 사이트(플로팅 버튼 대상)**: 잘 알려진 LLM 사이트(`DEFAULT_ALLOWED_HOSTS` = 콘텐츠 스크립트 정적 matches)에서만 플로팅 버튼이 뜨며, 옵션에서 사이트별로 on/off 토글. 우클릭/단축키 저장·삽입은 모든 사이트에서 `activeTab` on-demand 주입으로 동작. 광범위 호스트 권한을 두지 않으므로 **임의 사이트 영구 추가는 없음**. — v0.x의 블랙리스트(disabledHosts)에서 전환
- F9.10 전체 프롬프트 리스트 (관리 모드, 다중 선택 + 일괄 폴더 이동 / 태그 추가 / 삭제)
- F9.11 통계 대시보드 (프롬프트/폴더 수, 총 사용 횟수, 많이 쓴 프롬프트)
- F9.12 기록 탭 (최근 삽입/복사 로그, 항목 복사, 전체 삭제)
- F9.13 스타터 팩 추가 (이미지·영상·코딩·글쓰기·마케팅·업무 6종, 폴더로 추가 / 중복 방지)

### F10. 컴포넌트 간 동기화

- F10.1 모든 컴포넌트(팝업, 콘텐츠 스크립트, 옵션 페이지)는 `chrome.storage.onChanged` 리스너로 데이터 변경을 감지하여 UI 갱신
- F10.2 같은 사용자가 여러 창을 열어둔 상황에서도 일관성 유지
- F10.3 인라인 피커에서 프롬프트를 사용하면 `useCount`, `lastUsedAt` 갱신 → 다른 열린 팝업/옵션도 자동 갱신

### F11. 다크 모드 / 테마

- F11.1 기본값: 시스템 (`prefers-color-scheme`)
- F11.2 옵션에서 라이트 / 다크 강제 선택 가능
- F11.3 모든 UI 표면(팝업, 옵션, 콘텐츠 스크립트 모달/피커) 일관 적용
- F11.4 색상 토큰은 CSS 변수로 일원화

### F12. 다국어 (i18n)

- F12.1 지원 언어: 한국어·영어·일본어·중국어(간체). 샘플/스타터팩 내용도 언어별 제공
- F12.2 **커스텀 i18n 런타임** 사용 (`src/shared/i18n.ts`의 `t()` + `locale` 시그널). `chrome.i18n.getMessage`는 브라우저 로케일에 고정되어 런타임 전환이 안 되므로 직접 카탈로그(ko/en) 보유
- F12.3 기본값: 시스템 로케일 자동 감지
- F12.4 옵션에서 수동 변경 가능 (즉시 리렌더)
- F12.5 사용자 입력 데이터(프롬프트 본문 등)는 그대로, UI 라벨만 번역

### F13. 우클릭 컨텍스트 메뉴

- F13.1 텍스트 선택 시 "SnapPrompt에 저장" 메뉴 표시
- F13.2 페이지 우클릭 시 "SnapPrompt 열기" (단축키 대안)

### F14. 온보딩

- F14.1 첫 설치 시 옵션 페이지가 새 탭으로 자동 오픈
- F14.2 4단계 가이드 (단축키 안내 → 샘플 추가 → 기능 하이라이트 → 테마/언어 확인)
- F14.3 샘플 프롬프트 5개(핵심 요약&할 일, 코드 리뷰, 자연스러운 번역, 이미지 프롬프트, 쉬운 설명) 추가 옵션 — 이미지 샘플은 kind=image + 파라미터/네거티브 포함
- F14.4 "건너뛰기/완료" 후에는 옵션 페이지 일반 뷰로 진입

### F15. 이미지·영상 생성 옵션

- F15.1 프롬프트 종류(kind): 일반 / 이미지 / 영상. 이미지·영상은 생성 옵션 섹션 노출 + 목록·피커에 🖼/🎬 배지
- F15.2 파라미터 토글: 행 단위(사용 체크·이름·컨트롤·토큰·값) + 토큰 실시간 미리보기. 프리셋 팩(Midjourney `--ar`·`--v`… / Pika `-ar`·`-camera`…) + 커스텀 추가
- F15.3 네거티브 프롬프트: 본문과 별도, 출력 방식 선택(라벨 줄 `Negative prompt:` / Midjourney `--no`)
- F15.4 레퍼런스 이미지: URL + 메모 + 썸네일, 본문 앞에 prepend
- F15.5 조립 순서: `[레퍼런스] [본문(치환)] [--파라미터] [네거티브]`. 모든 삽입/복사 경로가 `assemblePrompt` 한 곳을 사용
- F15.6 이미지·영상 프롬프트는 변수가 없어도 삽입 모달을 띄워 파라미터를 그때그때 토글 가능

### F16. 히스토리 / 이터레이션

- F16.1 편집 버전: 저장 시 직전 내용이 바뀌었으면 자동 스냅샷(`Prompt.versions`, 최대 15개)
- F16.2 편집기에 "변경 기록" — 버전 목록·되돌리기, 두 항목(현재 편집본 포함) 선택 시 좌우 비교(A/B)
- F16.3 삽입 기록: 삽입/복사 시 최종 텍스트·변수값·사이트를 로그에 기록(전역, 최대 200개)
- F16.4 변수 모달의 "최근 사용값" 칩(F3.5) + 옵션 "기록" 탭(F9.12)에서 활용

### F17. 표시 모드

- F17.1 세 가지 표시 모드: 툴바 팝업 · 분리된 창(`windows.create`) · 사이드 패널(`sidePanel`)
- F17.2 헤더의 3-way 전환기로 모드 변경, 현재 모드 강조
- F17.3 **마지막 사용 모드 기억** — 툴바 아이콘 동작을 모드에 맞게 재구성(default=팝업, window=`onClicked`→창, panel=클릭 시 패널). 설정 `popupMode`에 저장, SW 기동마다 재적용

---

## 6. 데이터 모델

### 6.1 핵심 타입

```typescript
type Prompt = {
  id: string;                  // crypto.randomUUID()
  title: string;
  body: string;
  variables: Variable[];
  folderId: string | null;     // null이면 "분류 없음"
  tags: string[];
  memo: string | null;
  sourceUrl: string | null;
  favorite: boolean;
  presets?: VariablePreset[];  // 변수 채움 세트 (F3.6)
  // 이미지·영상 생성 옵션 (F15) — 없으면 일반 프롬프트
  kind?: 'general' | 'image' | 'video';
  negativePrompt?: string | null;
  negativeStyle?: 'label' | 'mj';
  params?: ImageParam[];       // 파라미터 토글 목록
  references?: ReferenceImage[];
  versions?: PromptVersion[];  // 편집 이력 (F16, 최대 15개)
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  useCount: number;
};

type VariableType =
  | 'text' | 'textarea' | 'select' | 'date' | 'number' | 'color' | 'boolean' | 'code';

type Variable = {
  name: string;                // {{name|default}}의 name
  type: VariableType;          // {{name:type(...)}}에서 파싱
  defaultValue: string | null; // {{name|default}}의 default
  options: string[];           // select 옵션 / code 언어
  lastValue: string | null;    // F3.5 마지막 입력값
  multiline: boolean;          // 여러 줄 입력 여부
};

type VariablePreset = { name: string; values: Record<string, string> };

type ImageParam = {
  id: string; label: string;
  token: string;               // '{}'가 값 자리, toggle은 값 없는 플래그
  control: 'select' | 'text' | 'number' | 'toggle';
  value: string; options?: string[]; enabled: boolean;
};
type ReferenceImage = { id: string; url: string; note?: string };
type PromptVersion = {
  at: number; title: string; body: string;
  kind?: Prompt['kind']; negativePrompt?: string | null;
  negativeStyle?: Prompt['negativeStyle']; params?: ImageParam[]; references?: ReferenceImage[];
};
type InsertionRecord = {
  id: string; promptId: string; at: number; title: string;
  text: string; values: Record<string, string>; host?: string;
};

type Folder = {
  id: string;
  name: string;
  parentId: string | null;     // 계층 구조, 무제한 깊이
  createdAt: number;
  order: number;               // 같은 부모 내 정렬
};

type Settings = {
  floatingButton: boolean;
  lastBackupAt: number | null;
  defaultFolderId: string | null;
  insertionMode: 'auto' | 'clipboard-fallback';
  rememberVariableValues: boolean;
  theme: 'system' | 'light' | 'dark';
  language: 'system' | 'ko' | 'en' | 'ja' | 'zh';
  onboardingCompletedAt: number | null;
  allowedHosts: string[];      // 활성 사이트 화이트리스트 (F9.9), 기본 = DEFAULT_ALLOWED_HOSTS
  popupMode: 'default' | 'window' | 'panel'; // 마지막 표시 모드 (F17.3)
};
// backupFrequency 는 v1.0.0에서 제거(자동 백업 폐지). language 는 4개국어로 확장.

type Snapshot = {
  createdAt: number;
  prompts: Prompt[];
  folders: Folder[];
};

type BackupFile = {
  version: 1;
  app: 'snapprompt';
  exportedAt: number;
  prompts: Prompt[];
  folders: Folder[];
  settings: Partial<Settings>;
};
```

### 6.2 저장소 키 구조 (`chrome.storage.local`)

```
snapprompt:prompts     → Prompt[]
snapprompt:folders     → Folder[]
snapprompt:settings    → Settings
snapprompt:snapshots   → Snapshot[] (최근 7개)
snapprompt:insertions  → InsertionRecord[] (삽입 로그, 최근 200개)
snapprompt:meta        → { schemaVersion: 2 }
```

- 마이그레이션은 `schemaVersion` 기준으로 분기 (`ensureSchema`). v2: `disabledHosts`→`allowedHosts`(LLM 시드), `backupFrequency` 제거
- `unlimitedStorage`는 v1.0.0에서 **제거**(최소 권한). 일반 텍스트 프롬프트 용량상 기본 `chrome.storage.local`로 충분

### 6.3 변수 추출 규칙

문법 (하위 호환):

| 문법 | 타입 |
| --- | --- |
| `{{name}}` | text |
| `{{name\|기본값}}` | text + 기본값 |
| `{{name:textarea}}` | 여러 줄 |
| `{{name:number}}` / `{{name:number\|0}}` | 숫자 |
| `{{name:date}}` | 날짜 (YYYY-MM-DD) |
| `{{name:color}}` | 컬러 피커 (기본값 `#7C3AED`) |
| `{{name:select(a,b,c)}}` | 드롭다운 (기본값은 첫 옵션, `\|b`로 지정 가능) |
| `{{name:code(python)}}` | 여러 줄, 삽입 시 ` ```python … ``` ` 펜스로 자동 감쌈 |
| `{{name:boolean}}` | 토글 (`{{#if name}}`이 자동 생성하기도 함) |
| `{{#if name}}…{{/if}}` | `name`이 참일 때만 블록 포함 (조건부 블록) |

정규식(토큰): `\{\{\s*([a-zA-Z0-9_\-가-힣]+)\s*(?::\s*([a-zA-Z]+)\s*(?:\(([^)]*)\))?)?\s*(?:\|([^}]*))?\s*\}\}`
조건부: `\{\{\s*#if\s+(name)\s*\}\}…\{\{\s*/if\s*\}\}`
(그룹: 1=이름, 2=타입, 3=타입인자(select 옵션/code 언어), 4=기본값)

- 같은 이름 변수가 여러 번 나오면 1개로 통합 (첫 번째 등장 기준)
- 콜론·파이프 주변 공백 허용
- 타입 미지정 시: 이름에 code/content/text/본문/코드/내용 포함이면 textarea, 아니면 text
- **변수 프리셋(채움 세트)**: 변수 값 묶음을 `Prompt.presets`에 저장, 모달에서 불러오기/저장
- 변수 추출은 본문 변경 시 실시간

---

## 7. UI/UX 사양

### 7.1 익스텐션 팝업 (400 × 600)

```
┌────────────────────────────────────┐
│ [🔍 검색]              [폴더▾] [필터] │
├──────┬─────────────────────────────┤
│ 📁 전체│ ┌─────────────────────────┐│
│ ▸ 코딩│ │ ⭐ 코드 리뷰 (KR)       ││
│ ▸ 영어│ │ "{{언어}}로 다음..."   ││
│ ▸ 학습│ │ #코딩 #리뷰  [복사][삽입]││
│      │ └─────────────────────────┘│
│      │ ┌─────────────────────────┐│
│      │ │ 영어 이메일 답장        ││
│      │ │ "Please reply..."       ││
│      │ │ #이메일      [복사][삽입]││
│      │ └─────────────────────────┘│
├──────┴─────────────────────────────┤
│ [+ 새 프롬프트]         [⚙ 설정]   │
└────────────────────────────────────┘
```

- 좌측: 폴더 트리 (토글 가능, 접으면 더 넓은 카드)
- 우측: 결과 리스트
- 카드 클릭 시 인플레이스 편집/상세 뷰로 전환

### 7.2 인라인 피커 (페이지 오버레이, Shadow DOM)

- 화면 중앙 상단에 검색 인풋 + 결과 리스트 (Cmd-K 스타일)
- 폭 600px, 최대 높이 400px
- 다크/라이트 자동 감지
- 결과 항목: 제목 + 짧은 미리보기 + 변수 개수 배지
- 배경 클릭 시 닫힘

### 7.3 변수 입력 모달 (Shadow DOM)

```
┌─────────────────────────────────┐
│ 변수 입력                   [×] │
├─────────────────────────────────┤
│ 언어                  (기본: 한국어)│
│ [한국어                        ]│
│                                 │
│ code                            │
│ ┌─────────────────────────────┐ │
│ │ (여러 줄)                   │ │
│ │                             │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ 미리보기:                       │
│ ┌─────────────────────────────┐ │
│ │ 한국어로 다음 코드를...     │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ ☐ 마지막 입력값 기억            │
│           [취소]   [삽입/복사]  │
└─────────────────────────────────┘
```

### 7.4 저장 모달 (페이지 오버레이, Shadow DOM)

- 선택한 텍스트가 본문에 채워진 상태로 등장
- 본문에 `{{...}}`이 있으면 변수 섹션이 자동 펼쳐짐
- 중복 본문 발견 시 상단에 경고 배너
- 키보드: Cmd+Enter 저장, Esc 취소

### 7.5 옵션 페이지

```
┌───────────────────────────────────────────┐
│ SnapPrompt 설정                            │
├──────────┬────────────────────────────────┤
│ 일반     │ (선택한 탭의 컨텐츠)            │
│ 폴더     │                                 │
│ 태그     │                                 │
│ 백업     │                                 │
│ 단축키   │                                 │
│ 데이터   │                                 │
│ 정보     │                                 │
└──────────┴────────────────────────────────┘
```

### 7.6 온보딩 화면

- 3개 카드 가로 배치 또는 스텝퍼 형식
- "건너뛰기" 버튼 우측 상단

---

## 8. 기술 아키텍처

### 8.1 Manifest V3 구조

```json
{
  "manifest_version": 3,
  "name": "SnapPrompt",
  "default_locale": "en",
  "permissions": [
    "storage",
    "contextMenus",
    "activeTab",
    "scripting",
    "sidePanel"
  ],
  "background": { "service_worker": "background.js" },
  "action": { "default_popup": "popup.html" },
  "options_page": "options.html",
  "content_scripts": [
    {
      "matches": [
        "https://chatgpt.com/*", "https://chat.openai.com/*", "https://claude.ai/*",
        "https://gemini.google.com/*", "https://aistudio.google.com/*",
        "https://*.perplexity.ai/*", "https://copilot.microsoft.com/*",
        "https://chat.deepseek.com/*", "https://grok.com/*", "https://poe.com/*",
        "https://chat.mistral.ai/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle",
      "all_frames": false
    }
  ],
  "commands": {
    "open-picker": { "description": "Open prompt picker" },
    "save-selection": { "description": "Save selected text" }
  }
}
```

> **v1.0.0 권한 최소화(웹스토어 심사 대응 — 2회 반려 후 승인 우선)**: 광범위 `host_permissions: ["<all_urls>"]`·`unlimitedStorage`·`downloads`·`alarms`에 더해 **광범위 `optional_host_permissions(*://*/*)`까지 모두 제거**. 호스트 접근은 콘텐츠 스크립트의 정적 `matches`(=`DEFAULT_ALLOWED_HOSTS`, named LLM 사이트)로만 한정. 그 외 사이트는 우클릭/단축키 사용자 제스처 시 `activeTab`+`scripting.executeScript`로 현재 탭에만 1회 on-demand 주입(백그라운드 자동/임의 주입·동적 등록 없음).
> `commands`에 `suggested_key`를 일부러 두지 않음 → 사용자가 `chrome://extensions/shortcuts`에서 지정. 온보딩에서 안내.

### 8.2 모듈 구조

```
src/
├─ background/
│  ├─ index.ts            # 진입점, 메시지 라우터, 단축키·컨텍스트 메뉴,
│  │                      #   + 우클릭/단축키 시 현재 탭 on-demand 주입(ensureContentScript, activeTab)
│  └─ (백업/스냅샷·storage 래퍼는 @shared/store.ts·@shared/backup.ts로 통합. alarms 자동백업 모듈 제거)
├─ content/
│  ├─ index.ts            # 콘텐츠 스크립트 진입점
│  ├─ shadowRoot.ts       # Shadow DOM 호스트 생성
│  ├─ picker.tsx
│  ├─ saveModal.tsx
│  ├─ variableModal.tsx
│  ├─ floatingButton.tsx
│  ├─ toast.tsx
│  └─ insertion.ts        # 입력창 삽입 호환 레이어
├─ popup/
│  └─ index.tsx
├─ options/
│  ├─ index.tsx
│  ├─ tabs/
│  │  ├─ General.tsx
│  │  ├─ Folders.tsx
│  │  ├─ Tags.tsx
│  │  ├─ Backup.tsx
│  │  ├─ Shortcuts.tsx
│  │  ├─ Data.tsx
│  │  └─ About.tsx
│  └─ onboarding/
│     └─ index.tsx
├─ shared/
│  ├─ types.ts            # Prompt, Folder, Settings 등
│  ├─ store.ts            # storage 추상화 + onChanged 구독
│  ├─ search.ts           # Fuse.js 래퍼
│  ├─ variables.ts        # 추출/치환 ({{name:type|default}}, {{#if}})
│  ├─ assemble.ts         # 최종 텍스트 조립 (레퍼런스+본문+파라미터+네거티브)
│  ├─ imageparams.ts      # 이미지/영상 파라미터 프리셋 (Midjourney·Pika)
│  ├─ folders.ts · markdown.ts · backup.ts · id.ts · text.ts · samples.ts · starterpacks.ts
│  ├─ messaging.ts        # 메시지 프로토콜
│  ├─ i18n.ts             # 커스텀 t() 런타임 (ko/en 카탈로그, 런타임 전환)
│  └─ theme.ts            # 테마 토큰
├─ components/            # 공유 컴포넌트 (PromptOptionsEditor · PromptHistory)
└─ assets/
   └─ icons/
manifest.json
vite.config.ts
package.json
tsconfig.json
```

### 8.3 기술 스택

| 영역 | 선택 | 비고 |
| --- | --- | --- |
| 언어 | TypeScript | 타입 안전 |
| 빌드 | Vite | 빠른 HMR |
| UI 라이브러리 | Preact | React 호환, 번들 작음 (~3KB) |
| 상태 관리 | Preact signals | 경량, storage 변경과 결합 용이 |
| 스타일 | 일반 CSS + CSS 변수(토큰) | Shadow DOM 안에 주입 |
| 패키저 | `@crxjs/vite-plugin` | MV3 빌드 |
| 퍼지 검색 | Fuse.js | ~10KB, 가벼움 |
| ID 생성 | `crypto.randomUUID()` | 브라우저 내장 |
| i18n | 커스텀 `t()` 런타임 | ko/en 카탈로그, 런타임 전환 (chrome.i18n은 로케일 고정이라 미사용) |

### 8.4 메시지 프로토콜

```typescript
type Message =
  | { type: 'OPEN_PICKER' }
  | { type: 'SAVE_SELECTION'; text: string; sourceUrl: string }
  | { type: 'CAPTURE_AND_SAVE' }
  | { type: 'INSERT_PROMPT'; promptId: string }
  | { type: 'PROMPT_USED'; promptId: string; text?: string; values?: Record<string, string>; host?: string }
  | { type: 'OPEN_OPTIONS'; section?: string }
  | { type: 'SET_POPUP_MODE'; mode: 'default' | 'window' | 'panel' }
  | { type: 'PING' };
```

### 8.5 보안 / 프라이버시

- 외부 서버 통신 없음. 모든 데이터 로컬(`chrome.storage.local`).
- 백업은 사용자가 수동으로 내보낼 때만, 권한 없이 anchor download로 다운로드 폴더에 저장.
- **최소 권한 모델(v1.0.0 — 스토어 심사 대응)**: 광범위 `<all_urls>` 제거.
  - 콘텐츠 스크립트 정적 동작은 잘 알려진 LLM 사이트(`DEFAULT_ALLOWED_HOSTS`)로 한정
  - 그 외 사이트는 컨텍스트 메뉴·단축키(사용자 제스처) 시 `activeTab` + `scripting.executeScript`로 현재 탭에만 on-demand 주입
  - 광범위 `optional_host_permissions(*://*/*)`도 두지 않음 → 임의 사이트 영구 추가 기능 없음(승인 우선)
- Shadow DOM으로 페이지와 격리 (CSS·이벤트·JS 모두)
- 활성 사이트(화이트리스트) 추가/제거 옵션 제공 — 제거 시 해당 호스트 권한도 회수
- 원격 코드 미사용(모든 코드 패키지 포함), 데이터 수집·전송·판매 없음

---

## 9. 단계별 로드맵 (Phase) — *기록용(historical)*

> ✅ **v1.0.0 기준 아래 Phase 1·2 항목은 모두 구현 완료.** 이후 라운드 A(변수 파워업)·B(빠른 접근)·C(이미지·영상 도메인)·D(히스토리/이터레이션) + 표시 모드 기억 + 종류 필터 + 샘플/스타터팩 강화까지 반영됨. 아래는 초기 계획 기록으로 남겨둠.

### Phase 1 — MVP (3~4주)

데일리 사용 가능한 완성형 v1.

- [P1] 저장 모달 (우클릭 메뉴 + 단축키) + 중복 감지
- [P2] 팝업 UI (검색·필터·목록·복사·삽입)
- [P3] 변수 시스템 (`{{name|default}}`, 추출, 모달, 치환, 미리보기)
- [P4] 자동 삽입 (단축키 → 인라인 피커, Shadow DOM, 호환 레이어)
- [P5] 폴더(무제한 깊이) + 태그 + 즐겨찾기
- [P6] 편집 (팝업 인플레이스 + 옵션 페이지 관리 리스트)
- [P7] 수동 export/import + 충돌 정책
- [P8] 내부 스냅샷 + 롤백 UI
- [P9] 다크 모드 + 시스템 테마 자동 감지
- [P10] i18n (한국어/영어)
- [P11] 옵션 페이지 (탭 10종: 일반·통계·기록·프롬프트·폴더·태그·백업·단축키·데이터·정보)
- [P12] 온보딩 (4단계)
- [P13] 컴포넌트 간 동기화 (storage.onChanged)
- [P14] Fuse.js 퍼지 검색

### Phase 2 — 완성도 (2~3주)

- [P15] ~~자동 백업 (chrome.alarms + downloads)~~ — v1.0.0에서 권한 최소화로 제거(수동 export + 앱 오픈 시 스냅샷으로 대체)
- [P16] 플로팅 버튼 (포커스 감지 + 사이트별 OFF)
- [P17] 마지막 입력값 기억 (lastValue 활용)
- [P18] 자주 쓴 순 가중 정렬 알고리즘 튜닝
- [P19] 활성 사이트 (v1.0.0: 블랙리스트→named 호스트 토글 전환, 광범위/optional 호스트 권한 없음)
- [P20] 백업 만료 알림 배너

### Phase 3 — 확장 (필요 시)

- [P21] 변수 타입 확장 (select, date, number 등)
- [P22] 통계 대시보드
- [P23] 마크다운 미리보기
- [P24] 키보드 단축키 커스터마이즈 UI 자체 제공
- [P25] 프롬프트 가져오기 — 공개 프롬프트 카탈로그 (선택적)

### v1+ 비스코프

- 클라우드 동기화
- 팀 공유 / 협업
- LLM API 직접 호출
- 다른 브라우저 포팅 (Firefox, Safari, Edge)

---

## 10. 열려있는 질문

| ID | 질문 | 상태 |
| --- | --- | --- |
| ~~Q1~~ | 변수 기본값 문법 | ✅ `{{name|default}}` |
| ~~Q2~~ | 단축키 기본값 | ✅ 기본값 없음, 사용자 지정 |
| ~~Q3~~ | 폴더 계층 깊이 | ✅ 무제한 |
| ~~Q4~~ | 자동 백업 기본 주기 | ✅→폐지: v1.0.0에서 자동 백업 제거(권한 최소화), 수동 export만 |
| ~~Q5~~ | 검색 방식 | ✅ Fuse.js 퍼지 검색 |
| ~~Q6+Q7~~ | 다크/폴더/태그 우선순위 | ✅ 모두 MVP 동등 포함 |
| ~~Q8~~ | 익스텐션 이름 | ✅ SnapPrompt |
| Q9 | 아이콘 / 로고 디자인 | 보류 (Phase 1 후반) |
| Q10 | Chrome Web Store 게시 시점 / 무료·유료 정책 | 보류 |
| Q11 | 브라우저 언어가 한·영 외일 때 폴백을 ko/en 중 어느 쪽으로 | 영어 기본, 필요 시 변경 |

---

## 11. 성공 지표 (참고용, 본인 사용 기준)

- 본인이 일주일에 5회 이상 자연스럽게 사용
- 저장 흐름 (선택 → 저장 완료): 평균 10초 이내
- 사용 흐름 (단축키 → 입력창 삽입 완료): 평균 5초 이내
- 변수가 있는 프롬프트의 재사용률(useCount ≥ 2) 50% 이상
- 데이터 손실 사고 0건 (내부 스냅샷 + 수동 export 검증)
- 자동 삽입 호환성: ChatGPT / Claude / Gemini에서 안정 동작

---

## 12. 부록

### A. 경쟁 도구 참고

- **AIPRM**: ChatGPT 종속, 커뮤니티 프롬프트 중심
- **PromptBox**: 비슷한 방향이지만 변수 시스템 약함
- **TextExpander**: 일반 텍스트 확장기, LLM 특화 아님
- **Notion / 메모장**: 저장은 쉬우나 LLM에서 꺼내 쓰기 마찰 큼

### B. 참고 기술 자료

- Chrome Extension Manifest V3
- chrome.contextMenus / chrome.commands / chrome.scripting(executeScript, on-demand) / chrome.sidePanel / chrome.windows (+ storage·activeTab) — *v1.0.0에서 downloads·alarms·unlimitedStorage 및 광범위/optional 호스트 권한 제거*
- `document.execCommand('insertText')` (React/Vue 상태 동기화 위해 필수)
- Shadow DOM (콘텐츠 스크립트 격리)
- Fuse.js (퍼지 검색)
- `@crxjs/vite-plugin` (Vite + MV3)
