# Methelia

[English](README.md) | **繁體中文** · **[開啟 Methelia](https://methelia.com)**

Methelia 把學習目標變成一套結合理解與實作的課程。精簡說明搭配視覺模型、動畫、實驗、程式實作與檢查點，讓學習者能把觀念用出來。可以直接選擇完整專題，也可以描述想學的內容，建立個人化學習路徑。

網站已公開，所有人都能免帳號、免共用密碼使用。課程與作品保存在伺服器，由瀏覽器 cookie 識別各個匿名學習者。目前尚未提供會員登入或跨裝置進度取回功能。

## 學習流程

1. **選擇專題或描述目標。** 個人化課程會依主題逐步詢問經驗、興趣與深度；支援的題目可多選或跳過，也能取消本次製作。
2. **查看 Learning Map。** 節點說明觀念、前置知識與學習成果。個人化章節逐步準備；精選專題則已備妥每堂五章的完整內容。
3. **透過操作理解。** 閱讀重點、調整模型、觀看示範，或在適合的編輯器中實作。
4. **驗證理解並調整路徑。** 題目與作品檢查提供回饋。個人化路徑在準備後續章節時會參考學習表現；延伸單元從所選節點分出支線，學完可回到主課程。

### 精選專題

目前有 **20 堂專題 × 每堂 5 章**，提供**英文與繁體中文版本**：共 100 個章節、200 份在地化章節內容。200 份章節語音皆已預製完成，總長約 154 分鐘。

| 領域                | 專題                                                          |
| ------------------- | ------------------------------------------------------------- |
| 網頁、Python 與運算 | 互動作品集、Python 資料網站、文字冒險、CSV 資料故事、迷宮尋路 |
| 數學                | 2D／3D 方程探索器、平滑雲霄飛車與導數、機率遊戲               |
| 物理與聲音          | 碰撞關卡、衛星任務、可調式燈具、迷你合成器                    |
| 視覺設計            | 色彩工具、資訊層級海報、彈跳角色                              |
| 科學與環境          | 小型生態系、粒子分離、防雨社區                                |
| 經濟與邏輯          | 咖啡店經營模擬、數位邏輯門                                    |

每堂專題將背景與用途連到可操作的模型或程式，再透過實驗與題目確認理解。**17 種可重用實驗元件**支援參數保存、操作示範、重設與實驗匯出；三堂程式課程則產出能運作的程式或可下載檔案。

詳見[課程發行指南](docs/featured-courses-release.md)、[元件介面與模型限制](docs/teaching-components.md)、[各課程參考來源](src/core/featured/references.ts)。

### 播放與實作

- **整章共用一個音檔。** ElevenLabs 的字元時間對齊用來建立字幕與分頁邊界。播到分頁邊界會暫停，手動選擇下一頁或下一章則自動播放；既有逐頁語音仍相容。
- **字幕獨立覆蓋。** 字幕浮在課程上方。滑鼠閒置時播放欄隱藏，字幕仍保持可見，並留有底部間距。
- **重用 Python 執行環境。** Pyodide 在瀏覽器 worker 中執行 Python，學習介面持續掛載時會重用執行環境。產生的文字檔案可預覽並下載為 ZIP。
- **配合活動的工作區。** 網站課程使用編輯器與沙箱預覽；Terminal 操作可保存的虛擬檔案系統；純概念課程不需要程式工作區。
- **有範圍的示範與驗收。** 老師使用隔離的作品視圖或暫時的實驗控制示範。伺服器依題目答案與已保存的檔案狀態檢查宣告條件；這不等於證明任意程式都正確。

## 系統架構

模型選擇已支援的元件，提供結構化課程內容、範例與檢查條件；React 元件實作教學介面。模型產生的網站範例可以包含 HTML、CSS 與 JavaScript，但會在預覽沙箱內執行，不會直接變成平台介面程式碼。

```mermaid
flowchart TB
    learner["瀏覽器：播放器、Learning Map、實驗元件"]
    runtime["沙箱預覽與 Pyodide worker"]
    api["Next.js API：匿名 session、歸屬與來源檢查"]
    service["LearningService：課程、進度、作品與分支"]
    catalog["預製課程與語音資產"]
    db[("SQLite：課程、作品、音檔與生成工作")]
    worker["背景 worker：內容、預取與語音"]
    model["設定的 AI 供應商"]
    validator["Zod 與語意驗證"]
    speech["ElevenLabs with-timestamps"]
    learner --> api --> service --> db
    learner --> runtime
    catalog --> service
    worker <--> db
    worker --> model --> validator --> db
    worker --> speech --> db
```

Next.js 與背景 worker 由 `concurrently -k` 一起執行，共用 WAL 模式的 SQLite 資料庫。課程圖、章節與語音工作保存在資料庫，內容、預取與語音分別排程。前置問題與部分教學協助仍透過 API handler 呼叫模型，因此這些互動仍受供應商回應速度影響。

生成內容必須通過 schema 與語意驗證，包括圖形、前置關係、元件參數及檢查條件；不合格輸出最多進行兩次修復。Worker 寫入前會確認課程與章節版本仍有效。供應商失敗會顯示並提供重試；外部請求中斷時，仍可能無法確定是否已計費。

## 使用技術

| 層級       | 實作                                                                     |
| ---------- | ------------------------------------------------------------------------ |
| 介面       | Next.js 16 App Router、React 19、TypeScript 7、Lucide 圖示               |
| 內容與 API | Zod 4、Node.js 22、可設定的 OpenAI 相容 AI 端點；正式部署使用 OpenRouter |
| 資料保存   | 內建 `node:sqlite`、WAL、資料庫工作佇列                                  |
| Python     | Pyodide 0.28.3，由 jsDelivr 載入瀏覽器 worker                            |
| 語音       | ElevenLabs with-timestamps；正式精選語音使用 `eleven_v3`                 |
| 匯出       | fflate ZIP 壓縮檔、實驗 JSON                                             |
| 部署       | Render Web Service 與持久化磁碟，網站和 worker 共用單一執行個體          |
| 驗證       | Vitest、Playwright                                                       |

## 本機執行

使用 **Node.js 22.17 或更新版本**。Node 22 的內建 SQLite 模組可能顯示 experimental warning。

```bash
git clone https://github.com/Jack-hehe/methelia.git
cd methelia
npm ci
cp .env.example .env.local
npm run dev
```

開啟 [http://127.0.0.1:3000](http://127.0.0.1:3000)。PowerShell 請使用 `Copy-Item .env.example .env.local`；若執行原則擋住 `npm.ps1`，可改用 `npm.cmd`。

**精選課程內容與入門課程不需要供應商 API key。** 要生成個人化課程，請在 `.env.local` 設定 `AI_BASE_URL`、`AI_MODEL` 與 `AI_API_KEY`。使用 OpenRouter 的 `https://openrouter.ai/api/v1` 等 OpenAI 相容端點，以及支援應用程式所需結構化輸出的模型。

要合成新語音，請設定 `ELEVENLABS_API_KEY`、`ELEVENLABS_VOICE_ID` 與 `ELEVENLABS_MODEL`。範例環境預設為 `eleven_flash_v2_5`，正式精選音檔使用 `eleven_v3`。預製語音快取需要相符的聲音、模型與語言設定，但命中快取不需要合成用金鑰。更換設定後需重新準備音檔；正式網站已設定好相符的配置。

```bash
# 建置並啟動本機 production 版本
npm run build
npm start
```

本機資料預設存於 `.data/`，可用 `METHELIA_DATA_DIR` 修改。Python 初始化與 Google Fonts 需要網路連線。憑證放在 Git 忽略的 `.env.local` 中。

## 驗證修改

```bash
npm test
npm run build
npx playwright install chromium
```

若要使用隔離的瀏覽器驗收環境，先建立專用的建置輸出：

```bash
# macOS / Linux
METHELIA_TEST_BUILD=1 npm run build
npx playwright test --config playwright.general.config.ts
```

```powershell
# PowerShell
$env:METHELIA_TEST_BUILD = '1'
npm run build
Remove-Item Env:METHELIA_TEST_BUILD
npx playwright test --config playwright.general.config.ts
```

這個設定使用暫存資料庫、固定回應的本機模型替身與 3100 port，實際執行 API、worker 及瀏覽器執行環境。預設的 `npm run test:e2e` 則啟動或重用 3000 port 的開發伺服器；部分隔離伺服器專用案例會在該模式下跳過。

精選課程版本於 2026-09-06 通過 294 項單元測試與 59 項選定的瀏覽器案例，200 個 MP3 全部通過解碼、字幕與分頁時間檢查。後續公開模式也驗證了匿名開課與不同訪客之間的資料隔離。這些是當時的驗證結果，不代表任意生成內容的品質保證。詳見[發行驗證紀錄與語音準備指令](docs/featured-courses-release.md)；生成語音可能消耗供應商額度。

## 部署與目前限制

[render.yaml](render.yaml) 將 `main` 部署到一個附持久化磁碟的 Render 服務。`METHELIA_PUBLIC_ACCESS=true` 讓網站免除選用的私有進站限制，session 歸屬與設定的來源檢查仍保持啟用。程式採手動部署，設定變更需經 Blueprint 同步流程確認。安裝、備份與用量設定見[操作說明](docs/operations.md)。

- **瀏覽器身分，尚無帳號救援。** 清除識別 cookie 後會失去該學習者課程的存取權，目前沒有跨裝置登入或救援流程。
- **教學用執行環境。** Terminal 支援有限指令，不是主機 shell。Python 在瀏覽器中執行；Python 網站課程產生靜態 HTML，不會架設 Flask 或 Django。預覽 JavaScript 沒有伺服器端資源配額，仍可能使瀏覽器執行環境卡住。
- **明確範圍的實驗模型。** 模擬只開放支援的參數，不是任意方程求解器或工程分析工具；模型假設記錄在元件說明中。
- **自適應路徑仍有範圍。** 已提供延伸支線與依表現調整的功能；任意課程排程與全自動教學品質評估仍待完成。
- **供應商與主機限制。** 新 AI 內容與未快取語音需要設定供應商。Render 設定為每個 UTC 日全站共 100 次 AI 請求與 30,000 個合成字元；播放快取音檔不消耗該合成額度。這些是用量計數，不是金額上限。

後續工作包括會員進度同步、更豐富的教學元件、更精準的示範時間，以及更完整的內容評估。

## 來源與致謝

- 精選課程與簡化模型位於 [src/core/featured](src/core/featured) 與 [src/core/labs](src/core/labs)；[參考清單](src/core/featured/references.ts) 收錄官方文件與開放教科書。個人化內容於執行時生成。
- 曾參考 [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) 的學習介面；本次精選課程版本未納入其程式碼或圖像。
- ElevenLabs 提供合成旁白，OpenRouter 提供設定的模型代理服務。服務與生成輸出適用各供應商條款。
- Pyodide 資產由 jsDelivr 載入。DM Sans 與 Noto Sans TC 透過 Google Fonts 載入並提供系統字型 fallback，並非隨專案打包的字型檔。
- 相依套件各自適用其授權；本專案的 MIT 授權不取代第三方授權或服務條款。

## 團隊與授權

由 **Jack** 與 **Casanova** 製作。專案程式碼採用 [MIT](LICENSE) 授權。
