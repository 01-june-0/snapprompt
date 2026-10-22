# Security Policy / 보안 정책

## 취약점 신고 / Reporting a vulnerability

보안 취약점은 공개 이슈로 올리지 말고, GitHub의 비공개 신고를 이용해 주세요.
Please do not report security vulnerabilities in public issues. Use GitHub's private reporting instead.

👉 [Security 탭 → Report a vulnerability](https://github.com/01-june-0/snapprompt/security/advisories/new)

재현 단계, 영향 범위, 확인한 SnapPrompt·Chrome 버전을 함께 알려 주세요. 가능한 한 빨리 확인하고 회신하겠습니다.
Include steps to reproduce, the impact, and the SnapPrompt and Chrome versions you tested. We'll respond as soon as we can.

## 지원 버전 / Supported versions

최신 릴리스만 보안 수정을 받습니다. / Only the latest release receives security fixes.

## 범위 / Scope

SnapPrompt는 사용자 데이터를 수집하거나 외부로 전송하지 않으며 데이터는 `chrome.storage.local`에만 저장됩니다. 특히 다음과 같은 문제를 알려 주세요.
SnapPrompt collects and transmits no user data; everything stays in `chrome.storage.local`. Reports of the following kinds are especially welcome:

- 콘텐츠 스크립트나 오버레이 UI를 통한 스크립트 삽입(XSS), 페이지와의 격리 우회 / script injection (XSS) or isolation bypass in content scripts or the overlay UI
- 의도치 않은 외부 전송이나 권한 상승 / unintended data exfiltration or privilege escalation
- 백업 가져오기(JSON) 처리 중의 악용 가능성 / exploitable handling of imported backup JSON
