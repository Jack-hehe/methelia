# Methelia 營運手冊

本文件收錄從 README 移出的操作細節：憑證設定、語音生成規則、開發驗證指令、Render 部署與計費。README 只保留作品說明；實際跑起來與部署請看這裡。

共同詞彙見 [CONTEXT.md](../CONTEXT.md)。

## 設定 AI 與 ElevenLabs

只在本機 `.env.local` 填寫憑證；`.env.example` 必須保持空白範例。修改設定後要重新啟動 **Next.js 和 worker 兩者**。

| 變數                  | 用途                                                         |
| --------------------- | ------------------------------------------------------------ |
| `AI_BASE_URL`         | 支援 `/chat/completions` 的服務根網址，通常以 `/v1` 結尾     |
| `AI_MODEL`            | 該服務實際可用的模型 ID                                      |
| `AI_API_KEY`          | 模型服務憑證                                                 |
| `ELEVENLABS_API_KEY`  | ElevenLabs API key；只由伺服器使用                           |
| `ELEVENLABS_VOICE_ID` | 老師的 Voice ID；不是聲音名稱                                |
| `ELEVENLABS_MODEL`    | `eleven_v3`、`eleven_multilingual_v2` 或 `eleven_flash_v2_5` |
| `METHELIA_DATA_DIR`   | 選填，資料目錄；預設 `.data`                                 |

不需要 API key 也能試用：點選「Try a Lesson／先體驗一堂課」直接進入預先製作的課程。

### 模型差異

| 模型                     | 單次字元上限 | `language_code` | `previous_text`／`next_text` |
| ------------------------ | ------------ | --------------- | ---------------------------- |
| `eleven_v3`              | 5,000        | 支援            | **不支援**（送了回 400）     |
| `eleven_multilingual_v2` | 10,000       | 不支援          | 支援                         |
| `eleven_flash_v2_5`      | 40,000       | 支援            | 支援                         |

以上為實測結果，寫在 [`src/server/speech.ts`](../src/server/speech.ts) 的 `models` 表裡。三者都支援 with-timestamps，且回傳的 alignment 欄位相同。

`eleven_v3` 把中文標為 Mandarin Chinese（共 74 種語言），舊模型只標 Chinese（29–32 種）。搭配 `language_code` 可避免中英夾雜的旁白被誤判成英文發音。

## 生成與播放規則

1. 模型輸出 JSON，經 Zod 與圖形／元件語意驗證，格式不合格時最多修復兩次。
2. 每個小章節包含全部說明、互動設定、練習條件及 narration script；不在章節播放中途生成內容。
3. 新章節把整份 script 一次交給 ElevenLabs，使用 with-timestamps 回傳一個 MP3 與原文字元 alignment，再對應各頁 cues 與短句字幕。完整保存音檔與時間資料後才標示章節語音可用。精選課程優先讀取預製快取。
4. 字幕與 alignment 不一致時顯示錯誤，不捏造時間。連線中斷、逾時、HTTP 錯誤或本機對齊失敗均不自動重送；手動重試可能再次計費。已完整保存的音訊會重用，不因重複工作再次合成。
5. 播放到分頁邊界自動暫停；手動按下一頁或下一章會自動播放。練習驗證全部通過後才能完成並繼續下一章；翻頁會先保存實作草稿。

舊章節不會因為開啟新版介面而重新合成或變更文案，舊分頁音軌仍相容。新章節以 `/api/audio/{packageId}` 讀取整章音檔，進度使用整章時間並由 Section cues 對應頁面。同章固定 Voice ID 與模型，不會因中途修改環境設定而換聲音。

要把舊 Fish 語音改成 ElevenLabs，或改用新老師：點課程上方的「章節語音」圖示，再確認「重建章節語音」。這會使用額度，建立新的整章語音版本並重設本章音訊時間，不修改課程文字、已完成練習與實作檔案。已有部分 Fish 音檔的章節不能直接補成 ElevenLabs，必須整章重建以避免混用。已開始準備的章節不可重複提交重建；舊版本保留到刪除課程為止，不會自動再合成。

章節內容完成就可以開始學習，不受語音準備中或失敗影響；可閱讀、翻頁與操作示範。底部「準備章節語音」可手動開始或重試合成，不會因進入頁面而自動重送失敗請求。整章音檔與字幕完成後即可播放；曾選擇文字模式的舊課程，需先按「啟用語音解說」。現有 Chapter Package 保持原樣。

## 第一次試播

1. 先更換任何曾曝光的金鑰，再於 `.env.local` 設定 ElevenLabs key、老師 Voice ID 與模型。Voice ID 可由 ElevenLabs 聲音庫複製，API key 需有文字轉語音權限；訂閱不代表每次 API 合成都不扣額度。
2. 重新啟動網頁與 worker，建立示範課程；按「準備章節語音」只準備所選小章節，不需先設定 AI 服務。
3. 等待整章音檔及字幕準備完成，啟用語音後按播放。確認字幕、暫停與重播正常；按底部「下一頁」後會自動播放，到下一個分頁邊界時自動暫停。
4. 401／403 時檢查憑證與權限；429 時檢查額度與流量限制；對齊錯誤時可先用文字模式。不要把金鑰或完整 provider 回應貼到 issue。

若已填設定卻仍出現「語音尚未設定」，確認沒有舊 worker 留在背景：修改 `.env.local` 不會更新已啟動 worker 的環境。停止原本的 `npm.cmd start`／`npm.cmd run dev`，再重新啟動兩個程序並重試失敗的章節。`AI_BASE_URL` 必須是完整網址，例如 `https://openrouter.ai/api/v1`，不能只填 `//openrouter.ai/api/v1`。

也可用獨立腳本測試，不建立課程、不修改課程資料：

```powershell
# 免費：只驗證本機設定格式，不呼叫 API
npx.cmd tsx --env-file-if-exists=.env.local scripts/check-elevenlabs.ts
# 一次短文合成（使用額度），MP3 與字幕保存到被 Git 忽略的 .data/speech-samples/
npx.cmd tsx --env-file-if-exists=.env.local scripts/check-elevenlabs.ts --synthesize
```

短句字幕依標點切分並使用實際 alignment 時間；如果服務只回傳粗粒度時間，就保留較長字幕，不估算逐字時間。舊音軌沒有短句資料時仍顯示原本的 Section 字幕。程序若在合成後、寫入資料庫前崩潰，重新執行仍可能重複計費；目前未提供跨服務 exactly-once 保證。刪除課程不會取消已送達供應商的請求或退還額度，但回傳結果會丟棄，且不再生成後續頁面。

目前使用的 API adapter 位於 [`src/server/speech.ts`](../src/server/speech.ts)；介面參考 [ElevenLabs with-timestamps](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)。舊 Fish adapter 保留作相容性測試，但 worker 不再呼叫它。自動化測試不能代替實際帳號的可用性、費用與聲音品質驗證。

## 開發與驗證

```powershell
npm.cmd run format:check
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

`npm.cmd run format` 統一程式與文件格式。Playwright 預設重用 3000 埠的服務，若沒有服務則啟動開發服務。確認正在測的是最新版；也可指定另一個已啟動的服務：

```powershell
$env:METHELIA_TEST_URL = 'http://127.0.0.1:3001'
npm.cmd run test:e2e
```

核心測試涵蓋 protocol、graph、檔案衝突、進度／分支交易、SQLite 重開、模型修復、ElevenLabs alignment、舊音軌相容性、刪除交易與真實 worker 子行程。以本機替身驗證語音部分失敗、固定聲音重試，以及刪除或換版後不寫回背景生成結果。瀏覽器測試涵蓋首頁／探索頁、多課程、刪除確認、語音重建確認、地圖、分支、即時預覽、示範隔離、保存、深淺色與手機版。

完整瀏覽器驗證可使用獨立的正式版建置、暫存資料庫與本機模型替身，避免碰到開發中的課程或付費 API：

```powershell
$env:METHELIA_TEST_BUILD = '1'
npm.cmd run build
Remove-Item Env:METHELIA_TEST_BUILD
npx.cmd playwright test --config playwright.general.config.ts
npx.cmd next typegen
```

此測試服務固定從 `.next-validation` 啟動，請先重新建置，避免測到舊版本。`next typegen` 會在測試後將產生的型別入口還原到一般開發目錄。

語音瀏覽器測試使用**測試專用靜音 WAV** 驗證播放、seek、重播、整章音檔與分頁時間點、頁末自動暫停、手動翻頁自動播放，以及音檔載入失敗時仍保存正確頁碼，不驗證老師聲音品質。截圖與 trace 存在被 Git 忽略的 `test-results/`。

正式模式本機啟動：

```powershell
npm.cmd run build
npm.cmd start
```

## 資料與安全

- **本機保存**：課程與音訊位於 `.data/methelia.sqlite`。瀏覽器 cookie 是匿名 session 的索引；清除 cookie 後沒有帳號取回機制。要備份時先停止兩個服務，再備份整個 `.data` 目錄。
- **草稿**：即時預覽不代表已保存。離開編輯器／實作區、回首頁或切換複習前會儲存，衝突時阻止切換並保留草稿。直接關閉／重整有未存內容的分頁時會提示。
- **憑證保護**：不要提交 `.env.local`、資料庫或本機工具設定。若憑證曾寫入 Git 提交，即使後來刪除仍會留在歷史；應更換金鑰，並在推送前確認待發布歷史不含憑證。

## 部署到 Render

使用根目錄的 [render.yaml](../render.yaml)：一個付費 Node Web Service（1 CPU / 2 GB，新加坡）＋ 1 GB 持久化磁碟。不建立第二個 worker 服務：網站與單一 worker 在同一個服務內執行，共用 SQLite。

1. 在 Render 的免費 Hobby workspace 選 **New → Blueprint**，連接 `Jack-hehe/methelia`。
2. Branch 選 **`main`**，Blueprint Path 使用 `render.yaml`。
3. 依畫面提示填入本機 `.env.local` 的 `AI_MODEL`、`AI_API_KEY`、`ELEVENLABS_API_KEY`、`ELEVENLABS_VOICE_ID`。不要把金鑰貼到聊天室或 GitHub。
4. 確認資源只有一個 2 GB 服務和一個 1 GB 磁碟，再按 Deploy。這一步開始建立付費資源。`AI_BASE_URL` 預設為 OpenRouter，`ELEVENLABS_MODEL` 預設為 `eleven_v3`；預製精選語音的 Voice ID 與模型必須和 Render 一致。準備方式見[精選課程操作說明](featured-courses-release.md)。
5. 部署成功後開啟網站。`METHELIA_PUBLIC_ACCESS=true` 讓所有人免帳號進站，既有匿名 session 仍隔離各人的課程與進度。若日後關閉公開模式，才會啟用原有的私有存取密碼設定。
6. 在最終展示網址生成一堂小課程，確認語音、翻頁、實作、重新整理後的進度。語音／AI 的實際呼叫另計費，部署健康檢查不會呼叫它們。

### 綁定 methelia.com

在 Render 服務的 **Settings → Custom Domains** 加入 `methelia.com`，依該畫面提供的紀錄在 Hostinger 設定 DNS，然後回 Render 按 Verify。保留郵件相關的 MX、TXT 等紀錄；只調整網站對應的 A／CNAME，並檢查同一主機名稱是否有衝突的 AAAA。Render 自動簽發 HTTPS 憑證。

`METHELIA_ALLOWED_ORIGINS` 已包含 `https://methelia.com` 與 `https://www.methelia.com`；Render 自動提供的 `RENDER_EXTERNAL_URL` 也被允許。新增其他網域時須同步更新這個清單。來源判斷使用設定的 HTTPS 網域，不信任客戶端自行傳入的 forwarded headers。

### 資料與計費

- `METHELIA_DATA_DIR=/var/data/methelia`；`/var/data` 掛載持久化磁碟。程式更新／重啟保留這裡的課程、進度與音檔。磁碟不可供多服務共用，也不支援多實例；重新部署會短暫中斷網站。
- 本機 `.data` 和 `.env.local` 不會隨程式上傳。這次部署預設建立空的雲端資料庫，不修改本機資料。舊資料若要搬移，需要一致性的 SQLite 備份及匯入；匿名 cookie 不會跨 `localhost`、`onrender.com`、`methelia.com` 共用，還要處理課程歸屬。正式展示課程請在最終網址建立。
- 預設全站每日最多 **100 次 AI HTTP 請求**與 **30,000 個送出合成的語音字元**，由 SQLite 原子計數，UTC 00:00 重置。失敗、不確定結果與模型格式修正請求仍計入；已快取音檔的播放不計入。`0` 表示禁止新呼叫，不是無上限。這不是美元支出硬上限，供應商仍依模型、token、語音等規則計費。
- 在 Render Environment 修改 `METHELIA_AI_DAILY_REQUESTS` 或 `METHELIA_SPEECH_DAILY_CHARACTERS` 可調整額度。超過限制仍能閱讀已準備的課程；失敗任務需手動重試，不自動重送付費請求。
- 正式網站以 `METHELIA_PUBLIC_ACCESS=true` 開放使用，不要求共用帳密，也不是會員系統；清除瀏覽器 cookie 後仍沒有跨裝置取回進度的機制。API 的 session 歸屬檢查、來源檢查與每日使用額度保持啟用。
- 已關閉程式 commit 自動部署，避免展示途中更新；需要更新時在 Render 執行 **Manual Deploy → Deploy latest commit**。不要在語音生成途中部署，尚未保存的供應商回應可能於任務恢復時再次計費。
- `/api/health` 只回傳健康狀態，檢查資料庫可讀；私有模式另外檢查密碼設定。它不回傳課程或金鑰，也不保證外部 AI 供應商可用。網站或 worker 結束時 `concurrently -k` 會一起停止，交由 Render 重啟。
- 展示結束，先備份資料，再刪除不需要的服務與磁碟以停止相關計費；刪除磁碟會失去雲端資料。關閉瀏覽器不會停止主機計費。

官方參考：[Blueprint](https://render.com/docs/blueprint-spec)、[持久化磁碟](https://render.com/docs/disks)、[自訂網域](https://render.com/docs/custom-domains)。
