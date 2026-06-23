# Chrome 웹스토어 비공개(Unlisted) 게시 가이드

지인 테스트용으로 SnapPrompt를 웹스토어에 **비공개(Unlisted)** 로 올리는 전체 절차와, 그대로 복사해 쓸 등록 자료입니다.

---

## 0. 준비물 (미리 만들어 둠)

| 항목 | 위치 / 값 |
| --- | --- |
| 업로드 패키지 | `snapprompt-1.0.0.zip` (프로젝트 루트, `dist/`를 압축한 것) |
| 스토어 아이콘 128×128 | `docs/store/store-icon-128.png` (PNG, 둥근 모서리) |
| 스토어 스크린샷 1280×800 | `docs/store/screens/<lang-mode>/` — 4개국어 × 라이트/다크 = 8세트, 각 5장 (popup·picker·vars·image·history). 세트: `ko/en/ja/zh` × `light/dark` |
| 작은 프로모 타일 440×280 | `docs/store/promo-small-440x280.jpg` (JPEG, 알파 없음) |
| 마키 프로모 타일 1400×560 | `docs/store/promo-marquee-1400x560.jpg` (JPEG, 알파 없음) |
| 개인정보 처리방침 URL | <https://gist.github.com/01-june-0/fbb55ecf763df7ea02af4b364e952f79> (공개 Gist, 게시 완료) |

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
- 스크린샷 1280×800 — 4개국어 × 라이트/다크 = 8세트, 각 5장 (`docs/store/screens/<세트>/`)
  - `ko-light·ko-dark` · `en-light·en-dark` · `ja-light·ja-dark` · `zh-light·zh-dark`
  - **언어별 등록정보당 한 세트(5장)** 업로드: 한국어 리스팅엔 `ko-*`, 영어 `en-*`, 일본어 `ja-*`, 중국어 `zh-*`. 라이트/다크는 한 테마로 통일 권장(또는 섞어도 무방).
- 작은 프로모 타일 440×280: `promo-small-440x280.jpg`
- 마키 프로모 타일 1400×560: `promo-marquee-1400x560.jpg` (검색·카테고리 노출 시 사용, 선택)

> 스크린샷 재생성(테마·언어 자유 조합): `design/shots.html`에 `?theme=light|dark&lang=ko|en|ja|zh#<shot>` 파라미터 지원. shot = popup·picker·vars·image·history.
> ```bash
> CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
> for lang in ko en ja zh; do for mode in light dark; do d="docs/store/screens/$lang-$mode"; mkdir -p "$d"
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
- **권한 사유**: 각 권한마다 아래 "권한별 사유" 입력 (광범위 호스트 권한은 제거됨 — 최소 권한 구성)
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

### 개인정보처리방침 URL (필수 입력)
> 대시보드 → "개인정보 보호" 탭 → **개인정보처리방침 URL** 칸에 그대로 붙여넣기.
```
https://gist.github.com/01-june-0/fbb55ecf763df7ea02af4b364e952f79
```

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

■ 설치 안내
· 설치 시 Chrome이 "ChatGPT·Claude·Gemini 등 여러 사이트에서 데이터 읽기/변경" 권한 동의를 요청합니다 — 해당 LLM 사이트 입력창에 프롬프트를 넣기 위한 것이며, 페이지 내용을 외부로 보내지 않습니다(모든 데이터 로컬 저장).
· "확장 프로그램 추가"를 눌러 설치하세요. 만약 확장이 '꺼짐'으로 보이면 확장 관리 화면에서 "켜기"를 눌러 활성화하면 됩니다.
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

■ Install note
· On install, Chrome asks to allow "read and change data" on ChatGPT, Claude, Gemini and other LLM sites — this is only to insert prompts into those input fields; no page content is sent anywhere (all data stays local).
· Click "Add extension" to install. If the extension shows as off, open the extensions page and click "Enable" / turn the toggle on.
```

### 전용 목적 설명 (Single purpose)
```
LLM 프롬프트를 저장하고, 어떤 웹페이지의 입력창에서든 단축키로 검색해 꺼내 삽입하는 프롬프트 매니저입니다.
```

### 권한별 사유 (Permission justification)
> ⚠️ v1.0.0에서 **광범위 호스트 권한을 모두 제거**하고 권한을 최소화했습니다. `<all_urls>`도, 광범위 `optional_host_permissions(*://*/*)`도 없습니다. 콘텐츠 스크립트는 잘 알려진 LLM 사이트(아래 named matches)에만 정적으로 동작하며, 그 외 사이트에서는 사용자가 우클릭/단축키로 직접 호출한 순간에만 `activeTab`으로 현재 탭에 한 번 주입됩니다. 이전 거절 사유(불필요 권한·광범위 호스트)를 정면 대응한 구성입니다.
>
> 호스트 권한(콘텐츠 스크립트 matches)은 아래 LLM 사이트로 한정됩니다: chatgpt.com, chat.openai.com, claude.ai, gemini.google.com, aistudio.google.com, perplexity.ai, copilot.microsoft.com, chat.deepseek.com, grok.com, poe.com, chat.mistral.ai
```
storage: 사용자가 만든 프롬프트·폴더·태그·설정·사용 기록을 브라우저에 로컬 저장합니다. (외부 전송 없음)

activeTab: 사용자가 단축키나 우클릭으로 직접 호출했을 때, 현재 탭에 한해 프롬프트 피커를 열거나 선택 텍스트를 저장/삽입하기 위해 사용합니다. 위 LLM 사이트 외의 페이지에서도 이 사용자 제스처가 있을 때만 동작합니다.

scripting: 단축키/우클릭으로 호출한 현재 탭(activeTab)에 한해, 피커·저장 UI 콘텐츠 스크립트를 그 시점에 1회 주입하기 위해 사용합니다. (백그라운드에서 자동으로 임의 사이트에 주입하지 않습니다.)

contextMenus: 웹페이지에서 선택한 텍스트를 우클릭으로 프롬프트로 저장하거나, 우클릭 메뉴로 피커를 여는 데 사용합니다.

sidePanel: 프롬프트 목록을 브라우저 사이드 패널에 도킹해 띄우는 보기 모드를 제공합니다.

원격 코드: 사용하지 않습니다. 모든 코드는 패키지에 포함되어 있습니다.

데이터 사용: 어떤 사용자 데이터도 수집·전송·판매하지 않습니다. 전부 로컬에만 저장됩니다.
```

### 호스트 권한 사용 근거 (Host permission justification)
> 대시보드 → "개인정보 보호" → "권한 요청 이유" → **호스트 권한 사용 근거** 칸에 붙여넣기. (호스트 권한 = `content_scripts`의 일치 패턴)

**한국어**
```
이 확장 프로그램의 호스트 권한은 콘텐츠 스크립트의 일치 패턴(content_scripts matches)이며, 잘 알려진 LLM 채팅 사이트로만 한정됩니다: chatgpt.com, chat.openai.com, claude.ai, gemini.google.com, aistudio.google.com, perplexity.ai, copilot.microsoft.com, chat.deepseek.com, grok.com, poe.com, chat.mistral.ai

이 확장의 단일 목적(저장한 LLM 프롬프트를 입력창에 꺼내 삽입하고, 선택한 텍스트를 프롬프트로 저장)을 수행하려면 위 사이트의 입력 영역에 콘텐츠 스크립트로 접근해야 합니다. 페이지 내용을 외부로 전송하지 않으며, 모든 데이터는 브라우저 로컬(chrome.storage.local)에만 저장됩니다.

광범위 호스트 권한(<all_urls>)이나 optional 호스트 권한은 요청하지 않습니다. 위 목록 외의 사이트에서는 사용자가 우클릭 메뉴나 단축키로 직접 호출한 그 순간에만 activeTab 권한으로 현재 탭에 1회 주입되어 동작하며, 백그라운드에서 자동·상시로 접근하지 않습니다.
```

**English**
```
The host permissions are the content_scripts match patterns, limited to well-known LLM chat sites: chatgpt.com, chat.openai.com, claude.ai, gemini.google.com, aistudio.google.com, perplexity.ai, copilot.microsoft.com, chat.deepseek.com, grok.com, poe.com, chat.mistral.ai

The extension's single purpose — inserting your saved prompts into the chat input and saving selected text as a prompt — requires a content script on these sites' input areas. No page content is transmitted; all data stays local (chrome.storage.local).

No broad host permission (<all_urls>) or optional host permission is requested. On any other site, the script is injected once into the current tab only when you explicitly invoke it via the right-click menu or keyboard shortcut (activeTab), never automatically.
```

---

# 📣 지인 테스터 안내 문구 (링크 공유 시 함께 전달)

> 카톡/메일 등으로 설치 링크를 보낼 때 아래 문구를 같이 보내면, 권한 동의·활성화 단계에서 당황하지 않습니다.

**한국어**
```
[SnapPrompt 테스트 설치 안내]

1) 아래 링크를 Chrome에서 열고 "Chrome에 추가"를 눌러주세요.
2) 권한 창이 뜨면 "확장 프로그램 추가"를 누르면 됩니다.
   → "여러 웹 사이트에서 데이터를 읽고 수정" 권한은 ChatGPT·Claude·Gemini 같은
     LLM 입력창에 프롬프트를 넣기 위한 것이고, 데이터는 전부 내 브라우저에만 저장돼요.
3) 혹시 확장이 "꺼짐" 상태로 보이면(특히 예전에 한 번 설치했던 경우),
   확장 관리 화면(chrome://extensions)에서 토글을 켜거나 "켜기"를 눌러 활성화해주세요.

설치 링크: <스토어 링크 붙여넣기>
처음엔 단축키 설정(chrome://extensions/shortcuts)에서 단축키를 지정하면 더 편합니다.
```

**English**
```
[SnapPrompt — test install guide]

1) Open the link below in Chrome and click "Add to Chrome".
2) When the permission dialog appears, click "Add extension".
   → The "read and change data on a number of sites" permission is only for
     inserting prompts into LLM inputs (ChatGPT, Claude, Gemini, ...). All data
     stays in your own browser.
3) If the extension shows as "off" (especially if you installed it before),
   open chrome://extensions and turn the toggle on / click "Enable".

Install link: <paste store link>
Tip: set a keyboard shortcut at chrome://extensions/shortcuts for quick access.
```
