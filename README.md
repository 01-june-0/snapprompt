<div align="center">

# SnapPrompt

**웹서핑 중 발견한 LLM 프롬프트를 빠르게 저장하고("Snap"), 어디서든 단축키 한 번으로 꺼내 쓰는 Chrome 익스텐션.**

<img src="docs/images/popup.png" width="380" alt="SnapPrompt 팝업" />

</div>

---

## 왜?

좋은 프롬프트를 발견해도 메모장·노션·북마크에 흩어져 저장되고, 막상 쓸 땐 다시 찾아 변수 부분을 일일이 고쳐 붙여넣어야 합니다. SnapPrompt는 **저장도 꺼내쓰기도 한 번의 동작**으로 끝냅니다.

- **저장** — 웹에서 텍스트 선택 → 우클릭 또는 단축키 → 제목·폴더·태그와 함께 저장
- **꺼내쓰기** — 어떤 입력창에서든 단축키 → 검색 피커 → 현재 입력창에 자동 삽입
- **변수** — `{{변수}}` 템플릿을 모달 폼으로 채워 완성된 프롬프트 삽입
- **로컬 우선** — 모든 데이터는 브라우저에 저장, 외부 서버 없음 · JSON 백업 지원

---

## 주요 기능

### 🔍 어디서든 단축키로 꺼내쓰기
ChatGPT·Claude·Gemini를 포함한 모든 입력창에서 Spotlight 스타일 피커를 띄워 검색하고, 선택하면 현재 입력창에 바로 삽입됩니다.

<img src="docs/images/picker.png" width="640" alt="인라인 피커" />

### 🧩 변수 템플릿 (6가지 타입)
`{{name}}` · `{{name|기본값}}` 부터 드롭다운·날짜·숫자·**컬러 피커**까지. 꺼내 쓸 때 폼으로 채우면 실시간 미리보기로 결과를 확인할 수 있어요.

<img src="docs/images/vars.png" width="520" alt="변수 입력 모달 (컬러 피커 포함)" />

| 문법 | 입력 |
| --- | --- |
| `{{name}}` | 텍스트 |
| `{{name\|기본값}}` | 텍스트 + 기본값 |
| `{{name:textarea}}` | 여러 줄 |
| `{{name:number}}` | 숫자 |
| `{{name:date}}` | 날짜 |
| `{{name:color}}` | 컬러 피커 |
| `{{name:select(a,b,c)}}` | 드롭다운 |

### 💾 빠른 저장 + 중복 감지
웹페이지에서 선택 → 우클릭으로 저장. 본문에서 변수를 자동 추출하고, 비슷한 프롬프트가 이미 있으면 경고합니다.

<img src="docs/images/save.png" width="640" alt="저장 모달" />

### 🗂️ 폴더 계층 · 태그 · 드래그앤드롭
무제한 깊이의 폴더 트리와 태그로 분류하고, 팝업에서 카드를 드래그해 폴더로 옮길 수 있어요 (다중 선택 지원).

### ⚙️ 설정 · 통계 · 백업
테마(라이트/다크)·언어(한/영)·플로팅 버튼·사이트별 비활성화. 사용 통계 대시보드와 JSON 백업/복원, 자동 스냅샷까지.

<img src="docs/images/options.png" width="720" alt="옵션 - 통계" />

### 🪟 3가지 사용 형태
- **툴바 팝업** — 기본
- **분리된 창** — 자유롭게 이동·리사이즈, 상주
- **사이드 패널** — 브라우저 옆에 도킹해 연속 삽입

### 🚀 첫 설치 온보딩
<img src="docs/images/onboarding.png" width="640" alt="온보딩" />

---

## 설치 (개발자용)

```bash
npm install
npm run build      # 타입체크 + 프로덕션 빌드 → dist/
```

1. `chrome://extensions` 접속 → 우측 상단 **개발자 모드** 켜기
2. **압축해제된 확장 프로그램을 로드** → `dist/` 폴더 선택
3. 설치되면 온보딩 탭이 자동으로 열립니다
4. `chrome://extensions/shortcuts`에서 **"프롬프트 피커 열기"** 단축키 지정 (예: ⌘⇧L)

### 개발 모드 (HMR)
```bash
npm run dev        # Vite 개발 서버 → dist/ 가 HMR 연결됨
```

---

## 기술 스택

- **TypeScript** + **Vite** + **Preact** + **@preact/signals**
- **@crxjs/vite-plugin** — Manifest V3 빌드
- **Fuse.js** — 퍼지 검색
- `chrome.storage.local` (+ `unlimitedStorage`)
- 커스텀 i18n 런타임 (ko/en, 런타임 언어 전환)

## 프로젝트 구조

```
src/
├─ background/   서비스 워커 — 컨텍스트 메뉴, 단축키, 메시지 허브, 스냅샷, 자동 백업
├─ content/      콘텐츠 스크립트 — Shadow DOM 피커·저장·변수 모달, 삽입 호환 레이어, 플로팅 버튼
├─ popup/        팝업 — 검색·폴더 사이드바·DnD·인플레이스 편집·마크다운 미리보기
├─ options/      설정 7+탭 — 일반·통계·프롬프트·폴더·태그·백업·단축키·데이터·정보 + 온보딩
├─ shared/       types · store · variables · folders · search · backup · markdown · theme · i18n · messaging
└─ assets/icons/ 생성된 아이콘 (scripts/generate-icons.mjs)
```

## 문서

- 제품 요구사항: [docs/PRD.md](docs/PRD.md)
- 디자인 목업: [design/index.html](design/index.html)

---

<div align="center">
<sub>로컬 우선 · 외부 서버 없음 · 데이터 소유권은 사용자에게</sub>
</div>
