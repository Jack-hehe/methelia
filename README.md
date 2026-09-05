# Methelia

以 **Protocol + 預先寫好的互動元件** 承接 AI 生成內容的學習平台。先聚焦 HTML、CSS 與瀏覽器 JavaScript，讓使用者從一個學習目標，循序完成自己的靜態網站。

AI 負責規劃 Course Graph、編寫說明與教學腳本；Terminal、編輯器、預覽和引導游標由固定元件執行，不在上課途中臨時生成介面程式。

> 目前是本機 MVP，不是可直接公開營運的多人服務。固定示範流程已自動化驗證；真實 AI 模型與 Fish Audio 的帳號整合及語音品質仍需實測。

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

不需要 API key 也能試用：點選「先體驗一堂課」→「使用完整文字模式」。首頁也可返回目前課程；`/explore` 提供作品與路徑構想展示，**不是已開放的課程目錄或真實學員作品庫**。

## 目前可以做什麼

- **學習路徑**：先準備完整 Course Graph，再依節點準備小章節。右下角 Learning Map 可展開全螢幕、拖動、縮放與複習已完成節點。
- **互動課程**：可下拉閱讀的 Lesson Document，搭配概念卡、DOM 探索、程式碼、Terminal、檔案列表、網站預覽及選擇題。
- **實作工作區**：左側即時網站預覽、右側 Terminal。輸入 `edit index.html` 開啟內建編輯器；打字時更新預覽，Ctrl+Enter 或「儲存並返回 Terminal」保存。
- **示範後練習**：「看老師示範」在獨立副本中修改程式、展示結果，再交給使用者自己操作。不改寫使用者作品，也不代替完成練習。
- **補強分支**：「小問題」對話可推薦補強節點，經預覽與確認後加入下一段路徑，學完再回到主線。
- **完整章節語音**：一次準備整個小章節的 script 與音軌，再開放播放；字幕、捲動與引導使用同一條 audio clock。
- **保存與匯出**：SQLite 保存課程、圖形版本、進度、聊天及工作區；網站檔案可以 ZIP 匯出。淺色為預設，支援深色模式。

五章固定示範依序是：網站三種語言、HTML 結構、CSS 樣式、JavaScript 互動，以及預覽與匯出。即時 AI 課程則依輸入的目標生成，不會把固定示範冒充模型生成結果。

## 設定 AI 與 Fish Audio

只在本機 `.env.local` 填寫憑證；`.env.example` 必須保持空白範例。修改設定後要重新啟動 **Next.js 和 worker 兩者**。

| 變數                      | 用途                                                     |
| ------------------------- | -------------------------------------------------------- |
| `AI_BASE_URL`             | 支援 `/chat/completions` 的服務根網址，通常以 `/v1` 結尾 |
| `AI_MODEL`                | 該服務實際可用的模型 ID                                  |
| `AI_API_KEY`              | 模型服務憑證                                             |
| `FISH_AUDIO_API_KEY`      | Fish Audio 憑證                                          |
| `FISH_AUDIO_REFERENCE_ID` | 單一老師的聲音 reference ID                              |
| `FISH_AUDIO_MODEL`        | Fish 模型；範例為 `s2-pro`，須依帳號可用模型調整         |
| `METHELIA_DATA_DIR`       | 選填，資料目錄；預設 `.data`                             |

### 生成與播放規則

1. 模型輸出 JSON，經 Zod 與圖形／元件語意驗證，格式不合格時最多修復兩次。
2. 每個小章節包含全部說明、互動設定、練習條件及 narration script；不在章節播放中途生成內容。
3. Fish 接收完整 script，回傳 SSE 音訊與 alignment。後端合併音訊，以 chunk offset 對應 Section cues。
4. 字幕與 alignment 不一致時顯示錯誤，不捏造時間；完整回應若在本機對齊失敗，不會自動重複付費合成。
5. 練習提示講完後暫停，完成驗證才可繼續越過檢查點。

無語音時可手動閱讀與逐步觀看文字示範。已進入文字模式後，可按「準備章節語音」，成功後「啟用語音解說」。現有 Chapter Package 保持原樣；若要體驗更新後的示範內容，請從首頁建立新的示範課程。

API adapter 位於 `src/server/fish.ts`；介面參考 [Fish timestamped TTS](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech-stream-with-timestamps)。自動化測試不能代替實際帳號的可用性、費用與聲音品質驗證。

## Protocol 與專案結構

```text
src/
├─ app/          Next.js 頁面、樣式與匿名 session API
├─ components/   固定課程元件、Learning Map、工作區、播放器
├─ core/         Zod protocol、圖形、工作區、預覽、引導與 narration 純邏輯
└─ server/       SQLite、課程服務、模型／Fish adapter、背景 worker
tests/           核心、服務、worker 與瀏覽器回歸測試
docs/superpowers/ 設計規格與開發紀錄
```

`Chapter Package` 對應一個 Learning Node，內含多個 Lesson Sections。Template registry 限制元件組合；可選 `guide` 宣告預先驗證的檔案修改，`previewClick` 僅接受元素 ID，且只在隔離的示範預覽中觸發。

詳細詞彙見 [CONTEXT.md](CONTEXT.md)；設計與開發紀錄見 [MVP 規格](docs/superpowers/specs/2026-09-05-methelia-mvp-design.md)、[MVP 計畫](docs/superpowers/plans/2026-09-05-methelia-mvp.md)、[引導式實作](docs/superpowers/plans/2026-09-05-guided-practice.md)。

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

核心測試涵蓋 protocol、graph、檔案衝突、進度／分支交易、SQLite 重開、模型修復、Fish alignment 與真實 worker 子行程。瀏覽器測試涵蓋首頁／探索頁、地圖、分支、即時預覽、示範隔離、保存、深淺色與手機版。

語音瀏覽器測試使用**測試專用靜音 WAV** 驗證播放、seek、重播與換章狀態，不驗證 Fish 聲音品質。截圖與 trace 存在被 Git 忽略的 `test-results/`。

正式模式本機啟動：

```powershell
npm.cmd run build
npm.cmd start
```

## 資料、安全與已知限制

- **教學 Terminal，不是主機 shell**：支援 `pwd`、`ls`、`cd`、`mkdir`、`touch`、`cat`、`clear`。`help`／`edit` 是前端教學指令；`python -m http.server 8000` 是預覽轉接器，不執行 Python。尚不支援 npm 安裝、後端伺服器、外部套件或任意 shell。
- **預覽範圍**：sandbox iframe 不授予同源權限，CSP 限制外部載入。但沒有惡意程式的 CPU／記憶體配額；不要把這版直接開放為公用任意程式執行服務。
- **本機保存**：課程與音訊位於 `.data/methelia.sqlite`。瀏覽器 cookie 是匿名 session 的索引；清除 cookie 後沒有帳號取回機制。要備份時先停止兩個服務，再備份整個 `.data` 目錄。
- **草稿**：即時預覽不代表已保存。離開編輯器／實作區、回首頁或切換複習前會儲存，衝突時阻止切換並保留草稿。直接關閉／重整有未存內容的分頁時會提示。
- **教學精度**：語音同步到 Section；區塊內引導游標採固定相對進度，尚非逐字語意對齊。老師仍是圓形 placeholder，沒有口型同步。
- **營運功能**：未提供登入、一鍵公開部署、完整社群、流量／費用配額或多 worker 排程。Graph MVP 使用單一路徑串入補強節點，不是任意多分支排程器。
- **憑證保護**：不要提交 `.env.local`、資料庫或本機工具設定。若憑證曾寫入 Git 提交，即使後來刪除仍會留在歷史；應更換金鑰，並在推送前確認待發布歷史不含憑證。
