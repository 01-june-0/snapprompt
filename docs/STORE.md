# Chrome 웹스토어 비공개(Unlisted) 게시 가이드

지인 테스트용으로 SnapPrompt를 웹스토어에 **비공개(Unlisted)** 로 올리는 전체 절차와, 그대로 복사해 쓸 등록 자료입니다.

---

## 0. 준비물 (미리 만들어 둠)

| 항목 | 위치 / 값 |
| --- | --- |
| 업로드 패키지 | `snapprompt-1.0.0.zip` (프로젝트 루트, `dist/`를 압축한 것) |
| 스토어 아이콘 128×128 | `docs/store/store-icon-128.png` (PNG, 둥근 모서리) |
| 스토어 스크린샷 1280×800 | `docs/store/screens/<lang-mode>/` — `ko-light · ko-dark · en-light · en-dark` 각 5장 (popup·picker·vars·image·history) |
| 작은 프로모 타일 440×280 | `docs/store/promo-small-440x280.jpg` (JPEG, 알파 없음) |
| 마키 프로모 타일 1400×560 | `docs/store/promo-marquee-1400x560.jpg` (JPEG, 알파 없음) |
| 개인정보 처리방침 | `docs/PRIVACY.md` → **공개 URL로 호스팅 필요** (아래 3-c) |

> 그래픽은 `design/promo.html`(아이콘·프로모 타일) + `design/shots.html`(스크린샷)을 헤드리스 Chrome으로 렌더해 생성. 다시 만들려면 각 파일의 캡처 명령 참고.

> 패키지를 다시 만들려면: `npm run build` 후
> `cd dist && zip -rq ../snapprompt-<버전>.zip . -x "*.map"`

---

## 1. 개발자 등록 (최초 1회)
1. <https://chrome.google.com/webstore/devconsole> 접속 (Google 계정 로그인).
2. **일회성 등록비 $5** 결제 + 2단계 인증 활성화.

## 2. 새 항목 만들기 + 업로드
1. 콘솔 → **새 항목(New item)** → `snapprompt-1.0.0.zip` 업로드.
2. 업로드되면 "스토어 등록정보 / 개인정보 보호 / 배포" 탭이 열립니다.

## 3. 스토어 등록정보 입력

**a. 기본 정보** — 아래 "등록 텍스트" 사용
- 카테고리: **생산성(Productivity)**
- 언어: **한국어**(기본), 필요시 영어 추가

**b. 그래픽** (모두 `docs/store/`에 준비됨)
- 스토어 아이콘 128×128: `store-icon-128.png`
- 스크린샷 1280×800 — 라이트/다크 × 한/영 4세트, 각 5장 (`docs/store/screens/<세트>/`)
  - `ko-light` · `ko-dark` · `en-light` · `en-dark`
  - **언어별 등록정보당 한 세트(5장)** 업로드: 한국어 리스팅엔 `ko-*`, 영어 리스팅엔 `en-*`. 라이트/다크는 취향대로 한 테마로 통일 권장(또는 섞어도 무방).
- 작은 프로모 타일 440×280: `promo-small-440x280.jpg`
- 마키 프로모 타일 1400×560: `promo-marquee-1400x560.jpg` (검색·카테고리 노출 시 사용, 선택)

> 스크린샷 재생성(테마·언어 자유 조합): `design/shots.html`에 `?theme=light|dark&lang=ko|en#<shot>` 파라미터 지원. shot = popup·picker·vars·image·history.
> ```bash
> CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
> for lang in ko en; do for mode in light dark; do d="docs/store/screens/$lang-$mode"; mkdir -p "$d"
>   for s in popup picker vars image history; do
>     "$CHROME" --headless=new --force-device-scale-factor=1 --window-size=1280x800 \
>       --screenshot="$d/$s.png" "file://$PWD/design/shots.html?theme=$mode&lang=$lang#$s" --virtual-time-budget=1500
>   done; done; done
> ```

**c. 개인정보 처리방침 URL (필수)** — ✅ 준비됨
- 공개 Gist로 게시 완료. 아래 URL을 그대로 등록:
  ```
  https://gist.github.com/01-june-0/fbb55ecf763df7ea02af4b364e952f79
  ```
- 내용을 고치면 Gist도 갱신: `gh gist edit fbb55ecf763df7ea02af4b364e952f79 docs/PRIVACY.md`

## 4. 개인정보 보호(Privacy practices) 탭 — 심사 핵심
- **단일 목적(Single purpose)**: 아래 "단일 목적 문구" 붙여넣기
- **권한 사유**: 각 권한마다 아래 "권한별 사유" 입력 (특히 `host_permissions <all_urls>` 설명 중요)
- **원격 코드 사용**: **아니오** (모든 코드가 패키지에 포함)
- **데이터 사용 공개**: "수집/전송 안 함" 체크, 판매·제3자 제공 없음

## 5. 배포(Distribution) 설정 → 비공개
- 공개 범위(Visibility)를 **공개 안 함(Unlisted)** 으로 선택
  - Unlisted = 검색엔 안 뜨고 **링크를 아는 사람만 설치** 가능 → 지인 테스트에 적합
  - 더 닫고 싶으면 **비공개(Private)** + "신뢰할 수 있는 테스터(trusted testers)"에 지인 Google 계정 이메일 추가
- 지역: 전체 또는 원하는 국가

## 6. 제출 & 심사
- **검토를 위해 제출(Submit for review)**.
- 심사: 보통 수 시간~수 일. `<all_urls>` 권한 때문에 조금 더 걸릴 수 있음(권한 사유를 명확히 적으면 통과 수월).
- 승인되면 항목 URL이 활성화 → 지인에게 그 **링크 공유** → 각자 "Chrome에 추가".

## 7. 업데이트 배포
1. 코드 수정 후 `package.json`의 `version` 올리기 (예: `1.0.0` → `1.0.1`).
2. `npm run build` → 새 zip 생성 → 콘솔에서 같은 항목에 **패키지 새 버전 업로드** → 제출.
3. 사용자는 Chrome이 백그라운드에서 **자동 업데이트**. 기존 프롬프트는 그대로 유지됨(같은 항목 ID).

---

# 📋 복사용 등록 텍스트

### 이름
```
SnapPrompt
```

### 간단한 설명 (Short description, ≤132자)

**한국어**
```
웹서핑 중 발견한 LLM 프롬프트를 저장하고, 어떤 입력창에서든 단축키로 꺼내 변수까지 채워 삽입하는 프롬프트 매니저. 모든 데이터는 로컬 저장.
```

**English**
```
Save LLM prompts and pull them into any text field with a shortcut — fill the variables, then insert. All data stays local.
```

### 자세한 설명 (Detailed description)

**한국어**
```
SnapPrompt는 흩어진 LLM 프롬프트를 한곳에 모으고, 필요할 때 어디서든 바로 꺼내 쓰게 해주는 프롬프트 매니저입니다. 모든 데이터는 외부 서버 없이 브라우저에만 저장됩니다.

■ 저장
· 웹페이지에서 텍스트 선택 → 우클릭 또는 단축키로 즉시 저장
· 본문에서 변수를 자동 추출, 비슷한 프롬프트는 중복 경고

■ 꺼내쓰기
· ChatGPT·Claude·Gemini 등 어떤 입력창에서든 단축키로 검색 피커 호출
· 선택하면 현재 입력창에 자동 삽입 (안 되는 페이지는 클립보드 복사로 대체)

■ 변수 템플릿 (8가지 타입 + 조건부 블록)
· {{변수}} · {{변수|기본값}} · 드롭다운 · 날짜 · 숫자 · 컬러 · 토글 · 코드 블록
· 꺼낼 때 폼으로 채우고 실시간 미리보기, 최근 사용값 재사용

■ 이미지·영상 생성 옵션
· Midjourney·Pika 파라미터 토글, 네거티브 프롬프트, 레퍼런스 이미지
· [레퍼런스]+[본문]+[파라미터]+[네거티브] 자동 조립

■ 정리 · 기록
· 무제한 폴더 트리, 태그, 즐겨찾기 핀, 드래그앤드롭
· 편집 버전 히스토리·되돌리기·A/B 비교, 삽입 기록과 최근값 재사용

■ 사용 형태 3가지
· 툴바 팝업 · 분리된 창 · 사이드 패널 (마지막 형태 기억)

■ 프라이버시
· 모든 데이터는 브라우저에 로컬 저장. 수집·전송·추적 없음. JSON 백업/복원과 자동 스냅샷 지원.
```

**English**
```
SnapPrompt brings your scattered LLM prompts into one place and lets you pull them up anywhere you need them. All data is stored only in your browser — no external servers.

■ Save
· Select text on any page → right-click or shortcut to save instantly
· Variables are auto-detected; near-duplicate prompts trigger a warning

■ Recall
· Open a search picker with a shortcut in any input — ChatGPT, Claude, Gemini, and more
· Pick one and it's inserted into the focused field (falls back to clipboard copy on restricted pages)

■ Variable templates (8 types + conditional blocks)
· {{name}} · {{name|default}} · dropdown · date · number · color · toggle · code block
· Fill them in a form with live preview, and reuse your recent values

■ Image & video generation options
· Midjourney/Pika parameter toggles, negative prompts, reference images
· Auto-assembled as [references] + [body] + [parameters] + [negative]

■ Organize & track
· Unlimited folder tree, tags, favorite pins, drag & drop
· Edit version history, restore, A/B compare, insertion log with recent-value reuse

■ Three open modes
· Toolbar popup · detached window · side panel (remembers your last one)

■ Privacy
· All data stays local in your browser. No collection, transmission, or tracking. JSON backup/restore and automatic snapshots included.
```

### 단일 목적 문구 (Single purpose)
```
LLM 프롬프트를 저장하고, 어떤 웹페이지의 입력창에서든 단축키로 검색해 꺼내 삽입하는 프롬프트 매니저입니다.
```

### 권한별 사유 (Permission justification)
```
storage / unlimitedStorage: 사용자가 만든 프롬프트·폴더·태그·설정·사용 기록을 브라우저에 로컬 저장합니다. 프롬프트가 많아져도 끊기지 않도록 용량 제한을 해제합니다. (외부 전송 없음)

activeTab: 사용자가 단축키나 버튼으로 직접 호출했을 때, 현재 탭의 입력창에 선택한 프롬프트를 삽입하기 위해 사용합니다.

contextMenus: 웹페이지에서 선택한 텍스트를 우클릭으로 프롬프트로 저장하거나, 우클릭 메뉴로 피커를 여는 데 사용합니다.

downloads: 사용자가 데이터를 JSON 파일로 백업(내보내기)할 때 로컬에 저장하기 위해 사용합니다.

alarms: 하루 한 번 데이터 스냅샷/자동 백업을 예약 실행하기 위해 사용합니다.

sidePanel: 프롬프트 목록을 브라우저 사이드 패널에 도킹해 띄우는 보기 모드를 제공합니다.

host_permissions (<all_urls>): 사용자는 어떤 웹사이트의 입력창에서도 프롬프트를 꺼내 삽입하거나 텍스트를 저장합니다. 특정 사이트로 제한할 수 없는 핵심 기능이라 모든 사이트 접근이 필요하며, 페이지 내용을 외부로 보내지 않고 오직 입력창 삽입/선택 텍스트 저장에만 사용합니다.

원격 코드: 사용하지 않습니다. 모든 코드는 패키지에 포함되어 있습니다.

데이터 사용: 어떤 사용자 데이터도 수집·전송·판매하지 않습니다. 전부 로컬에만 저장됩니다.
```
