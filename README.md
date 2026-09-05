# Methelia

以 **Protocol + 預先寫好的互動元件** 承接 AI 生成內容的學習平台。先聚焦 HTML、CSS 與瀏覽器 JavaScript，讓使用者從一個學習目標，循序完成自己的靜態網站。

長期目標是學科無關的課程生成架構；網站、Python 與 Linux 是驗證案例，不是科目限制。已確認的 [通用課程架構](docs/superpowers/specs/2026-09-05-general-learning-architecture-design.md) 區分課程規劃、預製元件、實作環境與語音；目前程式仍是網站 MVP，尚未實作通用 v2、Python 或 Linux 執行環境。

AI 負責規劃 Course Graph、編寫說明與教學腳本；Terminal、編輯器、預覽和引導游標由固定元件執行，不在上課途中臨時生成介面程式。

> 目前是可部署的受限 demo，不是公開營運的多人服務。固定示範流程已自動化驗證；新語音使用 ElevenLabs，既有 Fish 音檔保留。任意 AI 生成課程的品質仍需人工驗收。

## 快速開始

需要 Node.js **22.17 或更新版本**。目前驗證環境為 Windows、Node.js 22.17；SQLite 使用 Node 內建的 `node:sqlite`，此版本會顯示 experimental warning。

```powershell
git clone https://github.com/Jack-hehe/methelia.git
cd methelia
git switch feat/methelia-mvp-release
npm.cmd ci
if (-not (Test-Path -LiteralPath .env.local)) {
  Copy-Item -LiteralPath .env.example -Destination .env.local
}
npm.cmd run dev
```

開啟 [本機網站](http://127.0.0.1:3000)。`dev` 同時啟動 Next.js 與單一背景 worker；Ctrl+C 一起停止。macOS／Linux 可用 `npm` 取代 `npm.cmd`，自行複製環境範例且不要覆蓋既有設定。

不需要 API key 也能試用：點選「Try a Lesson／先體驗一堂課」直接進入預先製作的課程。首頁預設英文，可切換繁體中文並記住選擇；語言切換目前涵蓋首頁與 `/explore`，固定示範課程仍為中文。課程頁顯示目前瀏覽器保存的課程及可收合的課程構想卡片，**卡片是規劃示意，尚未開放**。登入入口目前只顯示功能預告，不會建立帳號。

左上角 Methelia 固定回到「I want to learn…」首頁，重新整理也不會自動跳回課程；按「Continue learning／我的課程」可恢復原本進度。「Courses／課程」固定開啟 `/explore`，也能從已保存的課程卡片繼續學習。

「My Courses／我的課程」列出此瀏覽器匿名 session 建立的所有課程，新課程在前。每張卡片以 `/?course=<id>` 開啟指定課程，各自保留進度與工作區；新增課程不會取代舊課程。`GET /api/courses` 只回傳清單摘要，課程內容按需讀取；無指定 ID 的 `/` 仍預設恢復最新建立的課程。

卡片右上角的垃圾桶可刪除課程；確認後永久移除該課程的內容、進度、工作區、音訊及待處理工作，其他課程不受影響。此動作無法復原。背景生成即使稍後才回傳，也不會把已刪除的資料寫回。

進入或重新整理課程時，先顯示簡潔的載入狀態，確認匿名 session 後直接呈現原本課程，不會閃過首頁。讀取失敗可原地重試，不會當成「沒有課程」或建立新課程。

## 目前可以做什麼

- **學習路徑**：先準備完整 Course Graph，再依節點準備小章節。右下角 Learning Map 可展開全螢幕、拖動、縮放與複習已完成節點。拖曳不選取文字；點節點後在右側顯示詳細資訊，使用側欄圖示收起或重新展開。桌面版地圖讓出側欄空間，手機版使用覆蓋式側欄；切換節點只更新內容，不改變課程進度。
- **分頁互動課程**：每個小章節含多個分頁，一頁一個教學重點。底部固定顯示「上一頁／頁碼／下一頁」，最後一頁在同一位置顯示「下一章」（滑鼠提示及無障礙名稱保留章節全名），不另加完成本章按鈕。未完成練習的提示放在課程內容內。也可使用鍵盤左右鍵；編輯文字時不觸發翻頁。右下角可進入全螢幕，按 Esc 或全螢幕按鈕離開。
- **簡潔教學與控制列**：用白話帶操作、觀察結果，再解釋原因；例如選 CSS 換按鈕顏色，同時看到樣式程式碼更新。底部語音進度條橫跨整個課程，實作模式下也涵蓋 Terminal；播放、時間與倒退在左，翻頁在中間，字幕、音量、倍速、地圖與全螢幕在右。底欄高度與各欄寬度固定，語音未完成時停用控制項但保留位置。手機版將翻頁獨立為固定的一列，字幕、音量與倍速仍可直接操作。
- **實作工作區**：左側即時網站預覽、右側 Terminal。輸入 `edit index.html` 開啟內建編輯器；打字時更新預覽，Ctrl+Enter 或「儲存並返回 Terminal」保存。
- **示範後練習**：「看老師示範」在獨立副本中修改程式、展示結果，再交給使用者自己操作。不改寫使用者作品，也不代替完成練習。
- **補強分支**：「小問題」對話可推薦補強節點，經預覽與確認後加入下一段路徑，學完再回到主線。
- **新增節點**：在 Learning Map 按「新增節點」，輸入主題並預覽，再按「確認新增」。預覽可取消，不會寫入聊天或提前修改 Course Graph；節點插在目前章節之後，完成後接回原路徑。主題直接作為節點目標，時間先估 5 分鐘；確認後沿用章節準備流程。體驗模式仍使用固定 HTML 範例，非即時生成內容。
- **逐頁語音**：整個小章節的內容與所有分頁音檔準備完成後再開放語音。每頁有獨立播放進度與字幕；播完停在當頁，翻頁先停音，不自動播放下一頁。
- **保存與匯出**：SQLite 保存課程、圖形版本、進度、聊天及工作區；網站檔案可以 ZIP 匯出。淺色為預設，支援深色模式。

五章固定示範依序是：網站三種語言、HTML 結構、CSS 樣式、JavaScript 互動，以及預覽與匯出。即時 AI 課程則依輸入的目標生成，不會把固定示範冒充模型生成結果。

## 設定 AI 與 ElevenLabs

只在本機 `.env.local` 填寫憑證；`.env.example` 必須保持空白範例。修改設定後要重新啟動 **Next.js 和 worker 兩者**。

| 變數                  | 用途                                                     |
| --------------------- | -------------------------------------------------------- |
| `AI_BASE_URL`         | 支援 `/chat/completions` 的服務根網址，通常以 `/v1` 結尾 |
| `AI_MODEL`            | 該服務實際可用的模型 ID                                  |
| `AI_API_KEY`          | 模型服務憑證                                             |
| `ELEVENLABS_API_KEY`  | ElevenLabs API key；只由伺服器使用                       |
| `ELEVENLABS_VOICE_ID` | 老師的 Voice ID；不是聲音名稱                            |
| `ELEVENLABS_MODEL`    | `eleven_multilingual_v2`（預設）或 `eleven_flash_v2_5`   |
| `METHELIA_DATA_DIR`   | 選填，資料目錄；預設 `.data`                             |

### 生成與播放規則

1. 模型輸出 JSON，經 Zod 與圖形／元件語意驗證，格式不合格時最多修復兩次。
2. 每個小章節包含全部說明、互動設定、練習條件及 narration script；不在章節播放中途生成內容。
3. 新章節按分頁把 script 交給 ElevenLabs：一頁一次完整請求，不拆成逐句請求。使用 with-timestamps 回傳 MP3 與原文字符 alignment，對應短句字幕；同時傳入相鄰頁文字改善上下文連貫。逐頁交易保存，全部分頁準備好才標示章節語音可用。
4. 字幕與 alignment 不一致時顯示錯誤，不捏造時間。連線中斷、逾時、HTTP 錯誤或本機對齊失敗均不自動重送；手動重試可能再次計費。已完整保存的音訊會重用，不因重複工作再次合成。
5. 播放結束停在當頁。使用者手動翻頁，練習驗證全部通過後才能繼續下一章；翻頁會先保存實作草稿。

舊章節不會因為開啟新版介面而重新合成或變更文案：既有整章音軌依當頁的 Section cues 限制播放範圍。新章節的音檔以 `/api/audio/{packageId}?sectionId={sectionId}` 讀取，進度使用頁內時間。ElevenLabs 部分失敗時，重試會重用已完成分頁，只補尚未完成的音檔；同章固定 Voice ID 與模型，不會因中途修改環境設定而換聲音。

要把舊 Fish 語音改成 ElevenLabs，或改用新老師：點課程上方的「章節語音」圖示，再確認「重建章節語音」。這會使用額度，建立新的整章語音版本並重設本章音訊時間，不修改課程文字、已完成練習與實作檔案。已有部分 Fish 音檔的章節不能直接補成 ElevenLabs，必須整章重建以避免混用。已開始準備的章節不可重複提交重建；舊版本保留到刪除課程為止，不會自動再合成。

章節內容完成就直接顯示，不受語音準備中或失敗影響；可閱讀、翻頁與操作示範。底部「準備章節語音」可手動開始或重試合成，不會因進入頁面而自動重送。所有分頁音檔完成後即可按播放；曾選擇文字模式的舊課程，需先按「啟用語音解說」。現有 Chapter Package 保持原樣；若要體驗更新後的示範內容，請從首頁建立新的示範課程。

### 第一次試播

1. 先更換任何曾曝光的金鑰，再於 `.env.local` 設定 ElevenLabs key、老師 Voice ID 與模型。Voice ID 可由 ElevenLabs 聲音庫複製，API key 需有文字轉語音權限；訂閱不代表每次 API 合成都不扣額度。
2. 重新啟動網頁與 worker，建立示範課程；按「準備章節語音」只準備所選小章節，不需先設定 AI 服務。
3. 等待所有分頁音檔及字幕準備完成，啟用語音後按播放。確認當頁字幕與示範同步、暫停／重播正常；按底部「下一頁」切換分頁，再自行按播放。
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

目前使用的 API adapter 位於 `src/server/speech.ts`；介面參考 [ElevenLabs with-timestamps](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)。舊 Fish adapter 保留作相容性測試，但 worker 不再呼叫它。自動化測試不能代替實際帳號的可用性、費用與聲音品質驗證。

## Protocol 與專案結構

```text
src/
├─ app/          Next.js 頁面、樣式與匿名 session API
├─ components/   固定課程元件、Learning Map、工作區、播放器
├─ core/         Zod protocol、圖形、工作區、預覽、引導與 narration 純邏輯
└─ server/       SQLite、課程服務、模型／ElevenLabs adapter、背景 worker
tests/           核心、服務、worker 與瀏覽器回歸測試
docs/superpowers/ 設計規格與開發紀錄
```

`Chapter Package` 對應一個 Learning Node，內含多個 Lesson Sections。Template registry 限制元件組合；可選 `guide` 宣告預先驗證的檔案修改，`previewClick` 僅接受元素 ID，且只在隔離的示範預覽中觸發。

詳細詞彙見 [CONTEXT.md](CONTEXT.md)；設計與開發紀錄見 [MVP 規格](docs/superpowers/specs/2026-09-05-methelia-mvp-design.md)、[MVP 計畫](docs/superpowers/plans/2026-09-05-methelia-mvp.md)、[引導式實作](docs/superpowers/plans/2026-09-05-guided-practice.md)、[分頁課程規格](docs/superpowers/specs/2026-09-05-paged-lessons-design.md)。

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

語音瀏覽器測試使用**測試專用靜音 WAV** 驗證播放、seek、重播、分頁音檔、播放結束停留、翻頁不自動播放，以及音檔載入失敗時仍保存正確頁碼，不驗證老師聲音品質。截圖與 trace 存在被 Git 忽略的 `test-results/`。

正式模式本機啟動：

```powershell
npm.cmd run build
npm.cmd start
```

## 資料、安全與已知限制

Render 設定與操作方式見下方「部署到 Render」。

- **教學 Terminal，不是主機 shell**：支援 `pwd`、`ls`、`cd`、`mkdir`、`touch`、`cat`、`clear`。`help`／`edit` 是前端教學指令；`python -m http.server 8000` 是預覽轉接器，不執行 Python。尚不支援 npm 安裝、後端伺服器、外部套件或任意 shell。
- **預覽範圍**：sandbox iframe 不授予同源權限，CSP 限制外部載入。但沒有惡意程式的 CPU／記憶體配額；不要把這版直接開放為公用任意程式執行服務。
- **本機保存**：課程與音訊位於 `.data/methelia.sqlite`。瀏覽器 cookie 是匿名 session 的索引；清除 cookie 後沒有帳號取回機制。要備份時先停止兩個服務，再備份整個 `.data` 目錄。
- **草稿**：即時預覽不代表已保存。離開編輯器／實作區、回首頁或切換複習前會儲存，衝突時阻止切換並保留草稿。直接關閉／重整有未存內容的分頁時會提示。
- **教學精度**：語音同步到 Section；區塊內引導游標採固定相對進度，尚非逐字語意對齊。尚未接入老師素材與口型同步。
- **生成驗證待補強**：目前可通過章節驗證的子目錄檔案仍可能在初始化時被略過，部分命令／路徑規則也與執行端不一致；沒有 checkpoint 的章節尚未被整章拒絕。固定示範的測試通過不代表任意生成內容都可用，這些問題已列入通用架構的第一階段修正範圍。
- **營運功能**：有 Render 部署設定、demo 帳密與全站每日 AI 請求／語音字數限制；仍未提供會員登入、完整社群、金額硬上限或多 worker 排程。Graph MVP 使用單一路徑串入補強節點，不是任意多分支排程器。
- **憑證保護**：不要提交 `.env.local`、資料庫或本機工具設定。若憑證曾寫入 Git 提交，即使後來刪除仍會留在歷史；應更換金鑰，並在推送前確認待發布歷史不含憑證。

## 部署到 Render

使用根目錄的 [render.yaml](render.yaml)：一個付費 Node Web Service（1 CPU / 2 GB，新加坡）＋ 1 GB 持久化磁碟。不建立第二個 worker 服務：網站與單一 worker 在同一個服務內執行，共用 SQLite。

1. 在 Render 的免費 Hobby workspace 選 **New → Blueprint**，連接 `Jack-hehe/methelia`。
2. Branch 選 **`feat/methelia-mvp-release`**，Blueprint Path 使用 `render.yaml`。
3. 依畫面提示填入本機 `.env.local` 的 `AI_MODEL`、`AI_API_KEY`、`ELEVENLABS_API_KEY`、`ELEVENLABS_VOICE_ID`。不要把金鑰貼到聊天室或 GitHub。
4. 確認資源只有一個 2 GB 服務和一個 1 GB 磁碟，再按 Deploy。這一步開始建立付費資源。`AI_BASE_URL` 預設為 OpenRouter，`ELEVENLABS_MODEL` 預設為 `eleven_multilingual_v2`；若本機使用不同設定，在 Render Environment 改成相同值。
5. 部署成功後，開啟 Render 提供的 `https://…onrender.com` 網址。登入帳號是 **`demo`**；密碼在該服務 Environment 的 **`METHELIA_DEMO_PASSWORD`**，由 Render 隨機產生。不設密碼或密碼少於 16 字元時，Render 環境不會開放網站。
6. 在最終展示網址生成一堂小課程，確認語音、翻頁、實作、重新整理後的進度。語音／AI 的實際呼叫另計費，部署健康檢查不會呼叫它們。

### 綁定 methelia.com

在 Render 服務的 **Settings → Custom Domains** 加入 `methelia.com`，依該畫面提供的紀錄在 Hostinger 設定 DNS，然後回 Render 按 Verify。保留郵件相關的 MX、TXT 等紀錄；只調整網站對應的 A／CNAME，並檢查同一主機名稱是否有衝突的 AAAA。Render 自動簽發 HTTPS 憑證。

`METHELIA_ALLOWED_ORIGINS` 已包含 `https://methelia.com` 與 `https://www.methelia.com`；Render 自動提供的 `RENDER_EXTERNAL_URL` 也被允許。新增其他網域時須同步更新這個清單。來源判斷使用設定的 HTTPS 網域，不信任客戶端自行傳入的 forwarded headers。

### 資料與計費

- `METHELIA_DATA_DIR=/var/data/methelia`；`/var/data` 掛載持久化磁碟。程式更新／重啟保留這裡的課程、進度與音檔。磁碟不可供多服務共用，也不支援多實例；重新部署會短暫中斷網站。
- 本機 `.data` 和 `.env.local` 不會隨程式上傳。這次部署預設建立空的雲端資料庫，不修改本機資料。舊資料若要搬移，需要一致性的 SQLite 備份及匯入；匿名 cookie 不會跨 `localhost`、`onrender.com`、`methelia.com` 共用，還要處理課程歸屬。正式展示課程請在最終網址建立。
- 預設全站每日最多 **100 次 AI HTTP 請求**與 **30,000 個送出合成的語音字元**，由 SQLite 原子計數，UTC 00:00 重置。失敗、不確定結果與模型格式修正請求仍計入；已快取音檔的播放不計入。`0` 表示禁止新呼叫，不是無上限。這不是美元支出硬上限，供應商仍依模型、token、語音等規則計費。
- 在 Render Environment 修改 `METHELIA_AI_DAILY_REQUESTS` 或 `METHELIA_SPEECH_DAILY_CHARACTERS` 可調整額度。超過限制仍能閱讀已準備的課程；失敗任務需手動重試，不自動重送付費請求。
- 網站使用 HTTP Basic demo 帳密，不是會員系統；只透過 HTTPS 分享給可信任的 demo 參與者。不要開放任意主機 shell。
- 已關閉程式 commit 自動部署，避免展示途中更新；需要更新時在 Render 執行 **Manual Deploy → Deploy latest commit**。不要在語音生成途中部署，尚未保存的供應商回應可能於任務恢復時再次計費。
- `/api/health` 公開但只回傳健康狀態，檢查資料庫可讀與 demo 密碼設定；不回傳課程、金鑰，也不保證外部 AI 供應商可用。網站或 worker 結束時 `concurrently -k` 會一起停止，交由 Render 重啟。
- 展示結束，先備份資料，再刪除不需要的服務與磁碟以停止相關計費；刪除磁碟會失去雲端資料。關閉瀏覽器不會停止主機計費。

官方參考：[Blueprint](https://render.com/docs/blueprint-spec)、[持久化磁碟](https://render.com/docs/disks)、[自訂網域](https://render.com/docs/custom-domains)。
