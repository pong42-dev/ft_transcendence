# Client-Side User-Facing Text for Translation

This document lists all identified hardcoded user-facing text strings within the `frontend/src/` directory, organized by file. This list will serve as the basis for creating `translation.json` files for multi-language support.

---

## `frontend/src/components/Terminal.ts`

*   **Line 12:** `PONG-CLI v1.0.0 (c) 2025 PongDevs\nType "help" for available commands.\nPlease login to continue.`
*   **Line 36:** `$ `
*   **Line 102:** `PONG-CLI v1.0.0 (c) 2025 PongDevs\nType "help" for available commands.\nWelcome ${username}!` (Note: This string includes a dynamic username, which will need to be handled during translation.)
*   **Line 104:** `PONG-CLI v1.0.0 (c) 2025 PongDevs\nType "help" for available commands.\nPlease login to continue.`

---

## `frontend/src/components/UserProfile.ts`

*   **Line 60:** `Player607` (Default username)
*   **Line 79:** `2FA ${this.user.twoFactorEnabled ? 'Enabled' : 'Disabled'}` (Dynamic string: "2FA Enabled" or "2FA Disabled")
*   **Line 84:** `Use "2fa enable/disable" in terminal`
*   **Line 104:** `Game Stats`
*   **Line 115:** `Games`
*   **Line 116:** `Wins`
*   **Line 117:** `Win Rate`
*   **Line 135:** `Match History`
*   **Line 142:** `1vs1`
*   **Line 147:** `Tournament`
*   **Line 227:** `No 1vs1 matches yet`
*   **Line 233:** `No tournament matches yet`
*   **Line 287:** `You`
*   **Line 289:** `vs`
*   **Line 292:** `Victory`
*   **Line 292:** `Defeat`
*   **Line 307:** `R${index + 1}:` (Dynamic string: "R1:", "R2:", etc.)
*   **Line 312:** `🏆 Champion`
*   **Line 312:** `🥈 Runner-up`
*   **Line 312:** `🥉 Semi-finalist`

---

## `frontend/src/components/modals/LoginModal.ts`

*   **Line 65:** `Welcome Back`
*   **Line 66:** `Sign in to your account`
*   **Line 68:** `✕`
*   **Line 73:** `Email`
*   **Line 78:** `Enter your email`
*   **Line 84:** `Password`
*   **Line 89:** `Enter your password`
*   **Line 95:** `Sign In`
*   **Line 104:** `OR`
*   **Line 115:** `Continue with Google`
*   **Line 123:** `Don't have an account? Sign up`

---

## `frontend/src/components/modals/RegisterModal.ts`

*   **Line 65:** `Create Account`
*   **Line 66:** `Join our community`
*   **Line 68:** `✕`
*   **Line 73:** `Email`
*   **Line 78:** `Enter your email`
*   **Line 84:** `Password`
*   **Line 89:** `Enter your password`
*   **Line 95:** `Confirm Password`
*   **Line 100:** `Confirm your password`
*   **Line 106:** `Username`
*   **Line 111:** `Enter your username`
*   **Line 118:** `Profile Picture (Optional)`
*   **Line 139:** `Choose Image`
*   **Line 145:** `Remove`
*   **Line 149:** `Max file size: 5MB. Supported formats: JPG, PNG, GIF`
*   **Line 158:** `Create Account`
*   **Line 167:** `OR`
*   **Line 178:** `Sign up with Google`
*   **Line 186:** `Already have an account? Sign in`
*   **Line 384:** `Passwords do not match`
*   **Line 424:** `Creating account...`
*   **Line 444:** `Registration failed. Please try again.`
*   **Line 461:** `Failed to initiate Google registration. Please try again.`
*   **Line 482:** `File size must be less than 5MB`
*   **Line 492:** `Please select a valid image file`

---

## `frontend/src/components/modals/TwoFAModal.ts`

*   **Line 115:** `Enable Two-Factor Authentication`
*   **Line 117:** `✕`
*   **Line 121:** `Setting up 2FA...`
*   **Line 131:** `Enable Two-Factor Authentication`
*   **Line 133:** `✕`
*   **Line 138:** `Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)`
*   **Line 146:** `Manual entry code:`
*   **Line 153:** `Enter verification code`
*   **Line 160:** `000000`
*   **Line 172:** `Cancel`
*   **Line 178:** `Enable 2FA`
*   **Line 189:** `Two-Factor Authentication`
*   **Line 204:** `Enter the 6-digit code from your authenticator app`
*   **Line 209:** `Verification code`
*   **Line 216:** `000000`
*   **Line 227:** `Verify`
*   **Line 238:** `Disable Two-Factor Authentication`
*   **Line 240:** `✕`
*   **Line 245:** `Enter your current 2FA code to disable two-factor authentication`
*   **Line 250:** `Current verification code`
*   **Line 257:** `000000`
*   **Line 269:** `Cancel`
*   **Line 275:** `Disable 2FA`
*   **Line 408:** `Please enter a 6-digit code`
*   **Line 412:** `Setup data not found. Please refresh and try again.`
*   **Line 420:** `Enabling...`
*   **Line 450:** `Session refreshed. Please scan the new QR code and try again.`
*   **Line 512:** `Setup session expired. Please close and reopen 2FA setup.`

---

## `frontend/src/components/modals/GameEndModal.ts`

*   **Line 51:** `Victory!`
*   **Line 51:** `Good Game!`
*   **Line 52:** `Congratulations!`
*   **Line 52:** `${winnerName} wins!` (Dynamic: `winnerName`)
*   **Line 56:** `Match Stats`
*   **Line 57:** `Final Score`
*   **Line 65:** `VS`
*   **Line 77:** `Total Rounds`
*   **Line 80:** `Game Mode`
*   **Line 100:** `Next Match`
*   **Line 109:** `View Tournament Results`
*   **Line 120:** `View Profile`
*   **Line 126:** `Close`

---

## `frontend/src/components/modals/GameSetupModal.ts`

*   **Line 55:** `Select Game Mode`
*   **Line 57:** `✕`
*   **Line 60:** `VS AI`
*   **Line 61:** `Challenge AI opponent`
*   **Line 63:** `Local`
*   **Line 64:** `Play with friends`
*   **Line 66:** `Remote`
*   **Line 67:** `Play online`
*   **Line 70:** `Cancel`
*   **Line 158:** `Select Opponent`
*   **Line 160:** `✕`
*   **Line 165:** `Search friends...`
*   **Line 180:** `Back`
*   **Line 183:** `Cancel`
*   **Line 186:** `Send Invite`
*   **Line 214:** `No friends found`
*   **Line 221:** `Online`
*   **Line 221:** `Offline`

---

## `frontend/src/components/modals/BaseModal.ts`

*   **Line 183:** `Invalid input`
*   **Line 196:** `An error occurred. Please try again.`

---

## `frontend/src/components/modals/FileModal.ts`

*   **Line 18:** `Select File`
*   **Line 73:** `Click to select or drag & drop`
*   **Line 75:** `Max size: ${this.formatFileSize(this.maxSize)} • ${this.accept}` (Dynamic)
*   **Line 99:** `Remove file`
*   **Line 113:** `Cancel`
*   **Line 119:** `Select`

---

## `frontend/src/components/modals/NewTournamentTestModal.ts`

*   **Line 40:** `Tournament 수직 플로우 테스트`
*   **Line 79:** `Logged-in User: `
*   **Line 80:** `Not Logged In`
*   **Line 84:** `로그인된 사용자 정보가 없습니다. 로그인 후 이용하세요.`
*   **Line 89:** `Tournament ID: `
*   **Line 89:** `-`
*   **Line 93:** `토너먼트 시작`
*   **Line 95:** `참가자 닉네임 입력:`
*   **Line 97:** `로그인된 유저: ${this.currentUserInfo.name}` (Dynamic)
*   **Line 101:** `게스트 ${i + 1}` (Dynamic: "게스트 1", "게스트 2", etc.)
*   **Line 103:** `확인`
*   **Line 105:** `최종 우승자: ${this.getFinalWinnerName()}` (Dynamic)
*   **Line 106:** `토너먼트 상세 정보:`
*   **Line 191:** `모든 게스트 닉네임을 입력하세요.`
*   **Line 294:** `토너먼트 생성 실패`
*   **Line 300:** `대진표`
*   **Line 302:** `Match 1: ${allParticipants[this.bracket.match1[0]]} vs ${allParticipants[this.bracket.match1[1]]}` (Dynamic)
*   **Line 303:** `Match 2: ${allParticipants[this.bracket.match2[0]]} vs ${allParticipants[this.bracket.match2[1]]}` (Dynamic)
*   **Line 306:** `Match 1 시작:`
*   **Line 307:** `Match 1 시작`
*   **Line 309:** `Match 1 승자 선택:`
*   **Line 310:** `${allParticipants[this.bracket.match1[0]]}` (Dynamic)
*   **Line 311:** `${allParticipants[this.bracket.match1[1]]}` (Dynamic)
*   **Line 314:** `Match 2 시작:`
*   **Line 315:** `Match 2 시작`
*   **Line 317:** `Match 2 승자 선택:`
*   **Line 318:** `${allParticipants[this.bracket.match2[0]]}` (Dynamic)
*   **Line 319:** `${allParticipants[this.bracket.match2[1]]}` (Dynamic)
*   **Line 322:** `결승: ${allParticipants[winner1!]} vs ${allParticipants[winner2!]}` (Dynamic)
*   **Line 323:** `결승 시작:`
*   **Line 324:** `결승 시작`
*   **Line 326:** `결승 승자 선택:`
*   **Line 327:** `${allParticipants[winner1!]}` (Dynamic)
*   **Line 328:** `${allParticipants[winner2!]}` (Dynamic)
*   **Line 332:** `토너먼트 상세 정보 확인`
*   **Line 399:** `토너먼트 상세 정보 조회 실패`