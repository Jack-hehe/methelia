import { bi as b, lesson as l, type CuratedCourse } from "./types";

export const scienceCourses: CuratedCourse[] = [
  {
    id: "equation-explorer",
    kind: "geometry",
    domain: b("Mathematics", "數學"),
    title: b(
      "Draw circles and spheres from the distance formula",
      "用座標與距離公式畫出圓與球面",
    ),
    description: b(
      "Go from the distance between two points to the circle equation, then extend it to a sphere and its cross-sections.",
      "從兩點距離推到圓的方程式，再延伸到三維球面與它的截面。",
    ),
    lessons: [
      l(
        b("A map made of numbers", "用數字畫出地圖"),
        b(
          "Coordinate geometry joins algebra to drawings: a point is a pair of distances from fixed axes. Our explorer starts with a centered circle. The axes describe position; the radius describes which positions belong to the boundary.",
          "座標幾何把代數和圖形接起來：點的位置用相對於固定座標軸的兩個數字表示。探索器先從以原點為中心的圓開始。座標描述位置，半徑則決定哪些位置屬於邊界。",
        ),
        b(
          "Set radius to 3. Predict the two horizontal intercepts from the circle equation. Increase radius to 4 and predict their positions before checking the picture.",
          "把半徑設為 3，用圓的方程式預測水平軸上的兩個交點。增加到 4，先預測新位置，再檢查圖形。",
        ),
        b(
          "Where is the right intercept when radius is 4?",
          "半徑為 4 時，右側交點在哪裡？",
        ),
        b("(4, 0)", "(4, 0)"),
        b("(0, 4)", "(0, 4)"),
        b(
          "The right intercept lies on the positive x-axis, so y is zero. (0, 4) is the top intercept and swaps the roles of the axes.",
          "右側交點在正 x 軸上，因此 y 是零。(0, 4) 是上方交點，混淆了兩個座標軸的角色。",
        ),
        { radius: 3, slice: 0 },
      ),
      l(
        b("Turn distance into a circle", "把距離變成圓"),
        b(
          "The Pythagorean relation gives squared distance x² + y². Holding that distance at r² traces a circle, rather than a filled disk. This distinction matters when the explorer reports a boundary instead of every interior point.",
          "畢氏關係給出距離的平方 x² + y²。把它固定為 r²，畫出的是圓周，而不是填滿的圓盤。探索器要描述邊界時，必須分清楚等號和小於等於。",
        ),
        b(
          "Compare radii 3 and 5. Check whether (3, 4) belongs to the radius-5 boundary by calculating 9 + 16 before viewing it.",
          "比較半徑 3 和 5。先算出 9 + 16，判斷 (3, 4) 是否在半徑 5 的圓周上。",
        ),
        b(
          "Which equation describes a radius-5 circle?",
          "哪個方程式描述半徑 5 的圓周？",
        ),
        b("x² + y² = 25", "x² + y² = 25"),
        b("x² + y² = 5", "x² + y² = 5"),
        b(
          "Squared coordinates sum to squared radius: 5² = 25. Using 5 on the right produces radius √5, so the displayed circle would be smaller.",
          "座標平方和等於半徑的平方，5² = 25。右側寫 5 得到的是半徑 √5，因此畫出的圓會比較小。",
        ),
        { radius: 5 },
      ),
      l(
        b("Lift the boundary into space", "把邊界帶入空間"),
        b(
          "Adding a third perpendicular coordinate extends the distance rule to x² + y² + z² = r². A sphere is a surface. Rotating its drawing changes our viewpoint, not its actual size or equation.",
          "加上第三個互相垂直的座標，距離關係就變成 x² + y² + z² = r²。球面是一個表面。旋轉它的圖像只會改變視角，不會改變大小或方程式。",
        ),
        b(
          "Keep radius at 3 and slice at zero. Rotate the sphere through 90 and 180 degrees. Check which measured quantities remain unchanged.",
          "固定半徑 3、切片高度 0，把球面旋轉到 90 和 180 度。檢查哪些測量值保持不變。",
        ),
        b("What does rotating the view change?", "旋轉視角改變了什麼？"),
        b("The projection, while radius stays fixed", "投影外觀改變，半徑不變"),
        b("The radius of the sphere", "球面的半徑"),
        b(
          "A view transformation moves the camera relationship, not the mathematical surface. Changing radius requires a separate parameter change.",
          "視角變換改變的是觀看關係，不是數學表面。必須另外調整半徑參數，球的大小才會改變。",
        ),
        { radius: 3, rotation: 90, slice: 0 },
      ),
      l(
        b("Reveal a hidden cross-section", "揭開隱藏的截面"),
        b(
          "At height y = h, the sphere equation becomes x² + z² = r² − h². The slice radius is √(r² − h²). A negative value under the square root means that plane misses the sphere entirely.",
          "在高度 y = h 的平面上，球面方程式變成 x² + z² = r² − h²，切片半徑為 √(r² − h²)。根號內若為負數，表示平面完全沒有碰到球面。",
        ),
        b(
          "With radius 5, compare slice heights 0, 3 and 5. Record a circle, a smaller circle and the limiting point. Then test height −3.",
          "固定半徑 5，比較高度 0、3、5，觀察圓、較小的圓和極限的一個點。再測試高度 −3。",
        ),
        b(
          "At radius 5 and height 3, what is the slice radius?",
          "半徑 5、高度 3 時，切片半徑是多少？",
        ),
        b("4", "4"),
        b("2", "2"),
        b(
          "√(25 − 9) = 4. Subtracting the lengths 5 − 3 ignores the squared-distance relation and gives the wrong cross-section.",
          "√(25 − 9) = 4。直接用長度 5 − 3 忽略了平方距離關係，會得到錯誤的截面。",
        ),
        { radius: 5, slice: 3 },
      ),
      l(
        b("Deliver a shape challenge", "完成形狀挑戰"),
        b(
          "A useful explorer makes predictions testable. Your final configuration should show a sphere whose off-center slice has radius 4. Compare positive and negative slice heights, and keep the boundary case as a regression check.",
          "有用的探索器能讓預測接受檢查。最後的設定要呈現一個球面，其偏離中心的切片半徑為 4。比較正負切片高度，並保留邊界案例，作為以後修改時的檢查。",
        ),
        b(
          "Construct radius 5 with slice 3, then −3. Save the experiment parameters. Test slice 5 and explain why a point is a valid limiting result.",
          "建立半徑 5、切片高度 3，再改成 −3，保存實驗參數。測試高度 5，說明為何一個點是合理的極限結果。",
        ),
        b(
          "Which pair produces equal slices?",
          "哪兩個高度產生相同大小的截面？",
        ),
        b("h = 3 and h = −3", "h = 3 和 h = −3"),
        b("h = 0 and h = 3", "h = 0 和 h = 3"),
        b(
          "The formula uses h², so opposite heights give equal radii. The central slice at zero is larger because no squared height is subtracted.",
          "公式使用 h²，因此正負相反的高度得到相同半徑。中心高度零的切片更大，因為沒有扣除高度的平方。",
        ),
        { radius: 5, slice: -3 },
      ),
    ],
  },
  {
    id: "smooth-coaster",
    kind: "calculus",
    domain: b("Mathematics", "數學"),
    title: b(
      "Design a smooth coaster track with slopes and derivatives",
      "用斜率與導數設計平順的軌道曲線",
    ),
    description: b(
      "Compute each segment's slope and match them at the joins so the track changes direction without a sudden kink.",
      "計算每段軌道的斜率，調整接點讓兩段銜接時方向一致，避免突然的轉折。",
    ),
    lessons: [
      l(
        b("From a drawing to a track", "從圖畫到軌道"),
        b(
          "Calculus developed tools for changing motion. A track drawing is not enough: we need height at every horizontal position and a way to describe its direction. This model studies a curve, not a certified ride or its forces.",
          "微積分提供描述運動變化的工具。軌道不能只有一張圖：我們需要每個水平位置的高度，也需要描述方向的方法。這個模型研究曲線，不是經過認證的遊樂設施，也沒有完整計算作用力。",
        ),
        b(
          "Move x from −2 to 2 while keeping bend fixed. Follow the point and compare its height with the direction of the tangent.",
          "固定彎曲參數，把 x 從 −2 移到 2。追蹤點的位置，比較高度與切線方向。",
        ),
        b("What does a function y = f(x) assign?", "函數 y = f(x) 指定什麼？"),
        b("A height for each allowed x", "每個允許的 x 對應一個高度"),
        b("The vehicle speed at every point", "每一點的車速"),
        b(
          "The graph specifies geometry. Speed needs a separate motion and energy model; it cannot be read directly from height alone.",
          "這張圖指定幾何形狀。車速需要另外的運動與能量模型，不能只從高度直接讀出。",
        ),
        { bend: 0.5, join: 0, x: -2 },
      ),
      l(
        b("Measure local steepness", "測量局部陡峭程度"),
        b(
          "Average slope compares two points: change in height divided by horizontal change. The tangent slope describes the limiting local direction. A high point can have zero slope, so height and steepness are different measurements.",
          "平均斜率是兩點的高度差除以水平距離差；切線斜率則描述局部的極限方向。高點可能有零斜率，因此高度和陡峭程度是不同的測量。",
        ),
        b(
          "Inspect x = −1, 0 and 1 on the curved track. Identify where the tangent is horizontal and where its sign changes.",
          "檢查曲線上 x = −1、0、1 的位置。找出切線水平的位置，以及斜率改變正負號的位置。",
        ),
        b("What does a negative slope mean?", "負斜率表示什麼？"),
        b("Height falls as x increases", "x 增加時，高度下降"),
        b("The height is below zero", "高度一定小於零"),
        b(
          "Slope describes change, not absolute height. A track above the axis can still descend and have a negative slope.",
          "斜率描述變化，不是絕對高度。位於座標軸上方的軌道仍然可以下降，具有負斜率。",
        ),
        { bend: 1, join: 0, x: -1 },
      ),
      l(
        b("Tune the tangent", "調整切線"),
        b(
          "This track uses y = ax²/3 before the join adjustment, so its tangent slope is 2ax/3. Increasing bend changes both the shape and its local direction. We can therefore tune a track by specifying a desired slope at a chosen position.",
          "軌道在加入連接調整前使用 y = ax²/3，因此切線斜率為 2ax/3。增加彎曲係數，同時改變形狀與局部方向。因此可以在指定位置設定目標斜率，反過來調整軌道。",
        ),
        b(
          "Compare bend 0.5 and 1 at x = 1. Predict how doubling bend affects the tangent, then inspect the live readout.",
          "在 x = 1 比較彎曲係數 0.5 和 1。先預測係數加倍如何影響切線，再看即時讀值。",
        ),
        b(
          "For this track with bend 0.5 and join 0, what is the slope at x = 1?",
          "這段軌道彎曲係數 0.5、連接值 0 時，在 x = 1 的斜率是多少？",
        ),
        b("1/3", "1/3"),
        b("1", "1"),
        b(
          "The derivative is 2 × 0.5 × x / 3, giving 1/3 at x = 1. A slope of 1 omits the scale factor of 1/3 used by this track model.",
          "導數為 2 × 0.5 × x / 3，在 x = 1 得到 1/3。斜率 1 漏掉了此軌道模型的 1/3 比例係數。",
        ),
        { bend: 0.5, x: 1, join: 0 },
      ),
      l(
        b("Join without a sudden turn", "連接時避免突然轉向"),
        b(
          "Two track segments can meet at the same height yet point in different directions. A smooth first-order join requires both position and tangent slope to match. The join control lets you inspect the effect of a mismatch.",
          "兩段軌道可以在相同高度相接，方向卻不同。一階平順的連接要求位置與切線斜率都相同。連接參數讓你檢查不匹配造成的效果。",
        ),
        b(
          "Compare join values −1, 0 and 1. Inspect the junction from both sides; distinguish a shared point from a shared tangent.",
          "比較連接值 −1、0、1。從接點左右兩側檢查，區分共同的位置和共同的切線。",
        ),
        b(
          "Is matching height enough for a smooth tangent?",
          "高度相同就足以讓切線平順嗎？",
        ),
        b(
          "No; left and right slopes must also match",
          "不夠；左右斜率也必須相同",
        ),
        b("Yes; every continuous curve is smooth", "是；每條連續曲線都平順"),
        b(
          "A corner is continuous but has different one-sided slopes. Matching position avoids a gap; matching slopes avoids that corner.",
          "折角可以連續，但左右斜率不同。位置相同消除缺口，斜率相同才能消除折角。",
        ),
        { bend: 0.5, join: 1, x: 0 },
      ),
      l(
        b("Inspect your finished track", "檢查完成的軌道"),
        b(
          "Engineering review separates what was checked from what remains unknown. A matched tangent is useful evidence, but passenger comfort also depends on curvature, speed and forces. Record your chosen settings and the model's limits.",
          "工程檢查要區分已驗證和仍未知的條件。切線相同是有用的證據，但乘坐舒適度還取決於曲率、速度與作用力。記下設定，以及模型沒有涵蓋的限制。",
        ),
        b(
          "Choose a gentle bend and matched join. Sweep x across the junction and save the design. Explain one further physical check a real ride would need.",
          "選擇較緩的彎曲與匹配的接點，讓 x 掃過接點並保存設計。說明真實設施還需要哪一項物理檢查。",
        ),
        b(
          "What can this geometry check establish?",
          "這項幾何檢查能確立什麼？",
        ),
        b(
          "Position and tangent agreement in the model",
          "模型中的位置與切線一致",
        ),
        b(
          "Safe acceleration at every operating speed",
          "所有運行速度下的加速度都安全",
        ),
        b(
          "We checked curve conditions only. Acceleration depends on speed and curvature, so a safety claim requires additional analysis.",
          "我們只檢查了曲線條件。加速度取決於速度和曲率，因此安全結論需要額外分析。",
        ),
        { bend: 0.4, join: 0, x: 0 },
      ),
    ],
  },
  {
    id: "fair-game",
    kind: "probability",
    domain: b("Probability", "機率"),
    title: b(
      "Design a fair prize game with probability and expected value",
      "用機率與期望值設計公平的抽獎遊戲",
    ),
    description: b(
      "Compute the win probability and expected return, tune the prize and entry fee, then check it against repeated trials.",
      "計算中獎機率與期望報酬、調整獎金與入場費，再用重複試驗檢驗結果。",
    ),
    lessons: [
      l(
        b("Make the rules measurable", "讓規則可以計算"),
        b(
          "Games of chance helped motivate probability theory. Our game has one win event with probability p, a payout r, and an entry cost c paid on every play. Defining payout before calculating fairness prevents confusing winnings with net profit.",
          "機會遊戲促進了機率理論的發展。我們的遊戲有機率 p 的中獎事件、獎金 r，以及每次都要支付的成本 c。計算公平性之前，要先定義獎金，避免把收入和淨利混在一起。",
        ),
        b(
          "Set probability to 0.5, reward to 2 and cost to 1. Compare the net result of a win with the net result of a loss.",
          "設定機率 0.5、獎金 2、成本 1。比較中獎與落敗時各自的淨結果。",
        ),
        b(
          "What is the net result of a winning play?",
          "中獎那一次的淨結果是多少？",
        ),
        b("+1", "+1"),
        b("+2", "+2"),
        b(
          "The player receives 2 but already paid 1, leaving +1. Counting the payout as profit omits the cost paid on that play.",
          "玩家收到 2，但已付出 1，所以淨利是 +1。把獎金當成利潤會漏算那一次的成本。",
        ),
        { probability: 0.5, reward: 2, cost: 1, trials: 20, seed: 7 },
      ),
      l(
        b("Frequency is evidence, not a promise", "頻率是證據，不是保證"),
        b(
          "An observed win fraction varies between samples. A seed makes a simulated sequence repeatable so you can compare changes fairly. Even a fair game can produce a losing streak; independent plays do not repay earlier losses.",
          "觀察到的中獎比例會隨樣本改變。固定種子能讓模擬序列重現，方便公平比較。公平遊戲也可能連續落敗；獨立的下一次遊戲不會補償前面的損失。",
        ),
        b(
          "Run 20 trials with seeds 7 and 8. Then use 500 trials. Compare the win fractions without expecting either sample to equal p exactly.",
          "用種子 7 和 8 各跑 20 次，再改成 500 次。比較中獎比例，不要要求任何樣本恰好等於 p。",
        ),
        b(
          "After five losses, does the next independent win become more likely?",
          "連輸五次後，下一次獨立中獎會更容易嗎？",
        ),
        b("No; its probability is still p", "不會；機率仍然是 p"),
        b("Yes; wins must catch up", "會；中獎必須補回來"),
        b(
          "Independence keeps the next probability unchanged. Long-run proportions can stabilize without any mechanism forcing an immediate compensating win.",
          "獨立性表示下一次的機率不變。長期比例可以逐漸穩定，但沒有機制強迫下一次中獎來補償。",
        ),
        { probability: 0.5, reward: 2, cost: 1, trials: 500, seed: 8 },
      ),
      l(
        b("Compute expected net value", "計算預期淨值"),
        b(
          "Weight each possible result by its probability. Expected net value is p(r − c) + (1 − p)(−c), which simplifies to pr − c. It describes a repeated-play average, not a result that must occur on one play.",
          "把每種結果乘以發生機率。預期淨值是 p(r − c) + (1 − p)(−c)，可化簡成 pr − c。它描述重複遊戲的平均，不是單次一定會出現的結果。",
        ),
        b(
          "Use p = 0.25, reward = 4 and cost = 1. Compare the zero expectation with a short sequence that may end above or below zero.",
          "用 p = 0.25、獎金 4、成本 1。比較零期望值與一段可能賺也可能賠的短期序列。",
        ),
        b(
          "What is the expected net value of these rules?",
          "這組規則的預期淨值是多少？",
        ),
        b("0", "0"),
        b("1", "1"),
        b(
          "0.25 × 4 − 1 = 0. The value 1 is expected gross payout and still includes the entry cost that must be deducted.",
          "0.25 × 4 − 1 = 0。1 是預期總收入，還沒有扣掉必須支付的入場成本。",
        ),
        { probability: 0.25, reward: 4, cost: 1, trials: 100, seed: 12 },
      ),
      l(
        b("Tune fairness without hiding risk", "調整公平性，同時看見風險"),
        b(
          "Zero expected net value requires r = c/p when p is positive. A rare large reward can be fair by this definition and still expose a player to long losing stretches. Fair expectation does not mean low variability.",
          "p 大於零時，零預期淨值要求 r = c/p。罕見的大獎可以符合這個公平定義，卻仍可能造成長時間連敗。期望公平不代表波動小。",
        ),
        b(
          "Compare p = 0.5, r = 2 with p = 0.1, r = 10 at cost 1. Keep trials and seed fixed; inspect how the outcomes spread.",
          "成本固定 1，比較 p = 0.5、r = 2 和 p = 0.1、r = 10。固定次數與種子，觀察結果的波動。",
        ),
        b(
          "Which reward balances p = 0.2 and cost 1?",
          "p = 0.2、成本 1 時，哪個獎金能達到平衡？",
        ),
        b("5", "5"),
        b("0.2", "0.2"),
        b(
          "The balancing payout is 1 / 0.2 = 5. A payout of 0.2 gives expected net 0.04 − 1, a strong loss for the player.",
          "平衡獎金為 1 / 0.2 = 5。若獎金只有 0.2，預期淨值是 0.04 − 1，玩家會有明顯的預期損失。",
        ),
        { probability: 0.1, reward: 10, cost: 1, trials: 100, seed: 12 },
      ),
      l(
        b("Publish an honest game card", "完成誠實的遊戲說明"),
        b(
          "Your finished rules should state probability, payout, cost and expected net value. Include a short-run example and a longer-run comparison. A simulation illustrates the model but cannot prove a real random device uses the stated probability.",
          "完成的規則應列出機率、獎金、成本和預期淨值，也要包含短期範例與長期比較。模擬能說明模型，卻不能證明真實隨機裝置真的符合宣稱的機率。",
        ),
        b(
          "Save a fair configuration and run 1000 trials. Then raise cost by 0.5. Explain why the changed game favors the operator even if one run wins.",
          "保存一組公平設定並跑 1000 次，再把成本提高 0.5。說明為何即使某次模擬獲利，新規則仍有利於經營者。",
        ),
        b("What establishes expected fairness?", "什麼能確立期望值上的公平？"),
        b("The calculation pr − c = 0", "計算得到 pr − c = 0"),
        b("One simulation ends with a profit", "一次模擬最後有賺錢"),
        b(
          "Fairness follows from the specified probabilities and payoffs. A profitable sample can occur even when the expected value is negative.",
          "公平性來自指定機率與報酬的計算。即使期望值是負的，某個樣本仍然可能獲利。",
        ),
        { probability: 0.2, reward: 5, cost: 1, trials: 1000, seed: 42 },
      ),
    ],
  },
  {
    id: "collision-level",
    kind: "collision",
    domain: b("Physics", "物理"),
    title: b(
      "Compute motion after a collision with momentum and kinetic energy",
      "用動量與動能守恆計算碰撞後的運動",
    ),
    description: b(
      "Compare elastic and inelastic collisions, track conserved momentum and lost energy, then tune a level that can be cleared.",
      "比較彈性與非彈性碰撞、追蹤守恆的動量與損失的能量，再調出能通關的關卡。",
    ),
    lessons: [
      l(
        b("Choose a motion budget", "選擇運動預算"),
        b(
          "Collision mechanics separates momentum mv from kinetic energy ½mv². Our one-dimensional level has two bodies and no external impulse during impact. Velocity has a sign, so opposite motion can cancel momentum without cancelling energy.",
          "碰撞力學區分動量 mv 與動能 ½mv²。這個一維關卡包含兩個物體，碰撞期間沒有外部衝量。速度有正負號，因此反向運動可以抵消動量，卻不會抵消動能。",
        ),
        b(
          "Set equal masses and velocities +2 and −2. Predict total momentum, then compare it with the nonzero energy readout.",
          "設定相同質量，速度為 +2 和 −2。先預測總動量，再比較不為零的動能讀值。",
        ),
        b(
          "What is total momentum for equal opposite velocities and masses?",
          "相同質量以等速反向運動時，總動量是多少？",
        ),
        b("Zero", "零"),
        b("Always positive", "一定是正值"),
        b(
          "The signed momenta cancel. Energy stays positive because velocity is squared; momentum and energy are different budgets.",
          "帶符號的動量互相抵消。動能因速度平方而保持正值；動量和動能是不同的預算。",
        ),
        { mass1: 1, mass2: 1, velocity1: 2, velocity2: -2, restitution: 1 },
      ),
      l(
        b("Pass motion through an elastic impact", "用彈性碰撞傳遞運動"),
        b(
          "An ideal elastic impact conserves both momentum and kinetic energy. Equal masses exchange velocities in one dimension. This gives a predictable way to launch a target without adding an invisible push to the simulation.",
          "理想彈性碰撞同時守恆動量與動能。在一維中，相同質量會交換速度。這讓我們能以可預測的方式推出目標，不需要偷偷加入看不見的推力。",
        ),
        b(
          "Stop body two and launch body one at speed 4 with equal masses and restitution 1. Inspect both outgoing velocities.",
          "讓物體二靜止，物體一以速度 4 前進，兩者質量相同且恢復係數為 1。檢查碰撞後的兩個速度。",
        ),
        b(
          "After this elastic collision, what happens to body one?",
          "這次彈性碰撞後，物體一會怎樣？",
        ),
        b(
          "It stops while body two takes its velocity",
          "它停下來，物體二取得它的速度",
        ),
        b("Both move at speed 4", "兩者都以速度 4 前進"),
        b(
          "Exchanging velocities satisfies both conservation laws. Giving both bodies speed 4 would double momentum and energy without a source.",
          "交換速度能同時滿足兩項守恆。讓兩者都以速度 4 運動，會在沒有來源的情況下增加動量和動能。",
        ),
        { mass1: 1, mass2: 1, velocity1: 4, velocity2: 0, restitution: 1 },
      ),
      l(
        b("Let the impact absorb energy", "讓碰撞吸收動能"),
        b(
          "Restitution compares separation speed with approach speed. At zero, bodies share one outgoing velocity. Momentum still balances, but some kinetic energy becomes deformation or heat that this simplified model does not display.",
          "恢復係數比較分離速度與接近速度。係數為零時，兩個物體有相同的碰後速度。動量仍然平衡，但部分動能轉成形變或熱，這個簡化模型沒有直接畫出。",
        ),
        b(
          "Repeat the equal-mass impact at restitution 0. Compare outgoing speed and energy with the elastic case; keep incoming conditions unchanged.",
          "保持入射條件不變，把相同質量的碰撞改為恢復係數 0。比較碰後速度與彈性案例的動能。",
        ),
        b(
          "What remains conserved in the isolated inelastic impact?",
          "隔離的非彈性碰撞仍守恆什麼？",
        ),
        b("Total momentum", "總動量"),
        b("Kinetic energy alone", "只有動能"),
        b(
          "Internal forces exchange momentum without changing its total. Kinetic energy decreases as other energy forms gain the difference.",
          "內力交換動量，不改變總動量。動能減少的部分轉成其他形式的能量。",
        ),
        { mass1: 1, mass2: 1, velocity1: 4, velocity2: 0, restitution: 0 },
      ),
      l(
        b("Use mass as a design choice", "把質量當成設計選項"),
        b(
          "A heavier target changes how momentum is shared. Increasing launch speed is expensive because kinetic energy grows with its square. A level designer should compare mass choices before increasing speed beyond the intended energy budget.",
          "較重的目標會改變動量分配。提高發射速度的代價很大，因為動能隨速度平方成長。設計關卡時，應先比較質量選項，再決定是否提高速度。",
        ),
        b(
          "Compare target masses 1 and 3 with launcher mass 1, speed 4 and restitution 1. Observe the launcher's rebound and target speed.",
          "固定發射物質量 1、速度 4、恢復係數 1，比較目標質量 1 和 3。觀察發射物反彈與目標速度。",
        ),
        b(
          "What happens to initial energy when speed doubles at fixed mass?",
          "質量不變、速度加倍時，初始動能如何改變？",
        ),
        b("It becomes four times as large", "變成四倍"),
        b("It only doubles", "只變成兩倍"),
        b(
          "Energy is proportional to v², so (2v)² = 4v². Momentum doubles, which is why the two budgets must not be confused.",
          "動能正比於 v²，因此 (2v)² = 4v²。動量才是兩倍，所以不能混淆兩種預算。",
        ),
        { mass1: 1, mass2: 3, velocity1: 4, velocity2: 0, restitution: 1 },
      ),
      l(
        b("Verify the level's physical rules", "驗證關卡的物理規則"),
        b(
          "A finished level should specify masses, incoming velocities and restitution, then report momentum before and after. Energy should not increase for restitution between zero and one. These checks detect errors that an attractive animation can hide.",
          "完成的關卡應指定質量、入射速度與恢復係數，並報告碰撞前後動量。恢復係數介於零和一時，動能不應增加。這些檢查能發現漂亮動畫可能掩蓋的錯誤。",
        ),
        b(
          "Save a two-mass level with restitution 0.6. Compare before-and-after totals, then test endpoints 0 and 1 as boundary cases.",
          "保存恢復係數 0.6 的雙物體關卡，比較碰撞前後總量，再測試 0 和 1 兩個邊界案例。",
        ),
        b(
          "Which result signals a broken passive collision model?",
          "哪個結果表示被動碰撞模型出錯了？",
        ),
        b(
          "Kinetic energy increases with restitution 0.6",
          "恢復係數 0.6 時，動能增加",
        ),
        b(
          "Kinetic energy decreases with restitution 0.6",
          "恢復係數 0.6 時，動能減少",
        ),
        b(
          "A passive collision cannot create kinetic energy. A decrease at restitution below one is expected and represents energy transferred to other forms.",
          "被動碰撞不能創造動能。恢復係數小於一時，動能減少是合理的，代表能量轉成其他形式。",
        ),
        { mass1: 2, mass2: 3, velocity1: 3, velocity2: 0, restitution: 0.6 },
      ),
    ],
  },
  {
    id: "satellite-mission",
    kind: "orbit",
    domain: b("Astronomy", "天文"),
    title: b(
      "Put a satellite into orbit with gravity and orbital speed",
      "用重力與軌道速度把衛星送上軌道",
    ),
    description: b(
      "Compare falling, orbiting and escaping, then find the speed that holds a stable orbit.",
      "比較墜落、繞行與逃逸三種結果，找出能讓衛星穩定繞行的速度。",
    ),
    lessons: [
      l(
        b("Fall around a planet", "繞著行星落下"),
        b(
          "Newton's falling-projectile thought experiment connects familiar falling motion with orbiting. A satellite keeps falling toward the planet while moving sideways. This laboratory uses normalized units and an ideal central mass, without atmosphere or other bodies.",
          "牛頓的拋射物思想實驗把日常落下和軌道運動連起來。衛星一邊朝行星落下，一邊向側面前進。實驗採標準化單位及理想中心質量，沒有大氣或其他天體。",
        ),
        b(
          "At radius 2, compare speed multipliers 0.2 and 1. Follow the path and identify whether the surface interrupts the trajectory.",
          "在半徑 2 比較速度倍率 0.2 和 1，追蹤路徑，觀察是否撞上表面。",
        ),
        b(
          "Why does an orbiting satellite change direction?",
          "衛星在軌道上為何改變方向？",
        ),
        b("Gravity accelerates it toward the center", "引力使它朝中心加速"),
        b("There is no force in space", "太空中沒有作用力"),
        b(
          "Gravity acts throughout the orbit. Weightlessness does not mean gravity is absent; satellite and contents are falling together.",
          "引力在整條軌道上持續作用。失重不代表沒有引力，而是衛星與內部物體一起自由落下。",
        ),
        { radius: 2, speed: 1 },
      ),
      l(
        b("Balance speed with radius", "讓速度配合半徑"),
        b(
          "For gravitational parameter μ = 1, circular speed is √(1/r). The speed control is a multiplier of that circular speed: setting 1 gives a circle at any radius. Radius is measured from the center, and actual speed decreases as radius increases.",
          "引力參數 μ = 1 時，圓軌道速度是 √(1/r)。速度控制是圓軌道速度的倍率，設為 1 在任何半徑都產生圓軌道。半徑從中心量起，實際速度隨半徑增加而降低。",
        ),
        b(
          "Use radius 2 and speed multiplier 1 (actual speed about 0.707). Then try radius 3 with the same multiplier (actual speed about 0.577). Compare the shapes.",
          "用半徑 2、速度倍率 1（實際速度約 0.707），再試半徑 3、相同倍率（實際速度約 0.577），比較路徑形狀。",
        ),
        b(
          "At r = 2 and μ = 1, which is the actual circular speed when the control multiplier is 1?",
          "r = 2、μ = 1、控制倍率 1 時，實際圓軌道速度是多少？",
        ),
        b("Approximately 0.707", "約 0.707"),
        b("2", "2"),
        b(
          "√(1/2) is about 0.707. The number 2 is the radius, not a speed; circular speed decreases as radius grows.",
          "√(1/2) 約為 0.707。2 是半徑，不是速度；圓軌道速度會隨半徑增大而減少。",
        ),
        { radius: 2, speed: 1 },
      ),
      l(
        b("Read a numerical trajectory", "閱讀數值軌跡"),
        b(
          "A simulator advances position and velocity in finite time steps. Its path approximates the continuous equations, so numerical drift is not new physics. Energy and the overall orbital shape are useful checks when inspecting a computed trajectory.",
          "模擬器用有限時間步長更新位置與速度。路徑只是連續方程式的近似，因此數值漂移不是新的物理現象。能量和整體軌道形狀能幫助我們檢查計算結果。",
        ),
        b(
          "Run a near-circular case, pause it, and inspect its path. Restart from the same parameters to see which features are reproducible.",
          "執行近圓軌道案例，暫停並檢查路徑。以相同參數重新開始，觀察哪些特徵可以重現。",
        ),
        b(
          "What can gradual artificial energy drift indicate?",
          "逐漸出現的人為能量漂移可能表示什麼？",
        ),
        b("Numerical approximation error", "數值近似誤差"),
        b("Gravity is producing free energy", "引力正在產生免費能量"),
        b(
          "Finite-step integration can introduce error. The ideal isolated gravitational model conserves energy, so drift calls for numerical scrutiny.",
          "有限步長積分可能引入誤差。理想隔離引力模型守恆能量，因此漂移需要從數值方法檢查。",
        ),
        { radius: 2, speed: 1 },
      ),
      l(
        b("Find the escape boundary", "找出逃逸邊界"),
        b(
          "Escape speed is √(2/r) in these units, √2 times circular speed. Below escape speed, a trajectory may still collide with the planet. Negative orbital energy alone does not guarantee a safe orbit above the surface.",
          "在這些單位中，逃逸速度為 √(2/r)，是圓軌道速度的 √2 倍。低於逃逸速度的路徑仍可能撞上行星。軌道能量為負，並不保證能安全留在表面上方。",
        ),
        b(
          "At radius 2, compare speed multipliers 1, 1.414 and 1.6. Use both trajectory and energy to separate a bound path from escape.",
          "在半徑 2 比較速度倍率 1、1.414、1.6，同時用軌跡與能量區分受束縛路徑和逃逸。",
        ),
        b(
          "What is the actual escape speed at r = 2 (control multiplier √2)?",
          "r = 2 時的實際逃逸速度是多少（控制倍率 √2）？",
        ),
        b("1", "1"),
        b("0.5", "0.5"),
        b(
          "√(2/2) = 1. A speed of 0.5 is below the circular speed here and can send the satellite toward a surface collision.",
          "√(2/2) = 1。0.5 低於此處圓軌道速度，可能讓衛星朝表面碰撞。",
        ),
        { radius: 2, speed: 1.6 },
      ),
      l(
        b("Write the mission decision", "完成任務決策"),
        b(
          "Your mission report needs a launch configuration, a comparison with a failed case, and explicit assumptions. Real missions include atmosphere, propulsion, changing mass and navigation uncertainty; this model isolates the relation between gravity and initial sideways speed.",
          "任務報告需要發射設定、與失敗案例的比較，以及明確假設。真實任務還有大氣、推進、質量變化與導航誤差；這個模型只分離研究引力和初始側向速度的關係。",
        ),
        b(
          "Save a near-circular orbit at radius 2. Test a slower launch and an escaping launch, and explain why each differs from the chosen mission.",
          "保存半徑 2 的近圓軌道，測試較慢發射與逃逸發射，說明它們和所選任務的差別。",
        ),
        b(
          "Which claim is supported by the laboratory?",
          "實驗室能支持哪個說法？",
        ),
        b(
          "This configuration is near-circular under the stated ideal assumptions",
          "這組設定在指定理想假設下接近圓軌道",
        ),
        b("This is a flight-ready launch plan", "這已經是可直接執行的發射計畫"),
        b(
          "The simulator tests a simplified central-force model. A flight plan requires many omitted effects and validated mission software.",
          "模擬器測試的是簡化中心力模型。實際飛行計畫還需要許多未納入的效應，以及經驗證的任務軟體。",
        ),
        { radius: 2, speed: 1 },
      ),
    ],
  },
  {
    id: "adjustable-lamp",
    kind: "circuit",
    domain: b("Electricity", "電學"),
    title: b(
      "Design a dimmable lamp circuit with Ohm's law",
      "用歐姆定律設計可調亮度的燈泡電路",
    ),
    description: b(
      "Vary the resistance to see how current and voltage respond, then get the lamp's brightness from the power.",
      "改變電阻，觀察電流與電壓如何變化，再從功率算出燈泡的實際亮度。",
    ),
    lessons: [
      l(
        b("A complete path for charge", "電荷需要完整路徑"),
        b(
          "Early battery experiments made continuous electric currents practical to study. A source supplies a voltage difference around a closed circuit. Our lamp is represented by an ideal resistive load; real LEDs need additional nonlinear modeling.",
          "早期電池實驗讓持續電流能被實際研究。電源在閉合電路提供電位差。我們把燈簡化成理想電阻負載；真實 LED 還需要非線性模型。",
        ),
        b(
          "Keep resistance at 100 and compare voltage 0, 3 and 6. Observe which setting produces no current and how the glow changes.",
          "固定電阻 100，比較電壓 0、3、6，觀察何時沒有電流，以及亮度如何變化。",
        ),
        b(
          "Which quantity drives current through the resistor?",
          "哪個量驅動電流通過電阻？",
        ),
        b("Voltage difference", "電位差"),
        b("The drawing's wire length alone", "圖上導線長度本身"),
        b(
          "The ideal circuit uses applied voltage and resistance. The schematic's visual wire length is not an electrical parameter in this model.",
          "理想電路使用外加電壓與電阻計算。示意圖上的導線長度不是這個模型的電氣參數。",
        ),
        { voltage: 3, resistance: 100, parallel: 0 },
      ),
      l(
        b("Control current with resistance", "用電阻控制電流"),
        b(
          "Ohm's law gives I = V/R for an ideal resistor. At fixed voltage, increasing resistance decreases current. Always keep units visible: a current of 0.03 amperes equals 30 milliamperes.",
          "理想電阻遵循歐姆定律 I = V/R。電壓固定時，增加電阻會減少電流。要隨時注意單位：0.03 安培等於 30 毫安培。",
        ),
        b(
          "Set 6 volts and compare resistance 100 and 200. Predict the factor by which current changes before inspecting the readout.",
          "設定 6 伏特，比較電阻 100 和 200。先預測電流變為幾倍，再檢查讀值。",
        ),
        b(
          "At 6 V and 200 Ω, what is the current?",
          "6 V、200 Ω 時，電流是多少？",
        ),
        b("0.03 A", "0.03 A"),
        b("30 A", "30 A"),
        b(
          "6 / 200 = 0.03 A, or 30 mA. Reporting 30 A confuses amperes with milliamperes by a factor of one thousand.",
          "6 / 200 = 0.03 A，也就是 30 mA。寫成 30 A 是把安培和毫安培混淆了，相差一千倍。",
        ),
        { voltage: 6, resistance: 200, parallel: 0 },
      ),
      l(
        b("Compare circuit arrangements", "比較電路配置"),
        b(
          "Series resistances add. Equal parallel branches reduce equivalent resistance because charge has another path. The same source voltage can therefore produce different total currents even when the branch resistors have the same value.",
          "串聯電阻直接相加。相同電阻並聯時，多一條通路會降低等效電阻。因此即使每個分支電阻相同，同一個電源電壓也可能產生不同總電流。",
        ),
        b(
          "Toggle the arrangement while keeping voltage and resistance fixed. Compare equivalent resistance and source current, not only the lamp glow.",
          "固定電壓與電阻，切換電路配置。比較等效電阻和電源總電流，不只看燈光。",
        ),
        b(
          "What happens when an equal resistive branch is added in parallel?",
          "多加一條相同電阻的並聯分支會怎樣？",
        ),
        b("Equivalent resistance decreases", "等效電阻降低"),
        b("Equivalent resistance must increase", "等效電阻一定增加"),
        b(
          "Parallel conductances add, creating another current path. Adding resistances directly is the series rule, not the parallel rule.",
          "並聯時電導相加，多出一條電流通路。把電阻直接相加是串聯規則，不是並聯規則。",
        ),
        { voltage: 6, resistance: 200, parallel: 1 },
      ),
      l(
        b("Read the power budget", "讀懂功率預算"),
        b(
          "Electrical power is P = VI, or V²/R for a resistor. Doubling voltage at fixed resistance quadruples power. The glow is a teaching indicator of dissipation, not a calibrated prediction of a real lamp's brightness.",
          "電功率為 P = VI，對電阻也可寫成 V²/R。電阻固定、電壓加倍時，功率變四倍。畫面亮度只是耗能的教學指標，不是真實燈具亮度的校準預測。",
        ),
        b(
          "Compare 3 and 6 volts at the same resistance and arrangement. Track power alongside current and identify their different scaling.",
          "保持電阻與配置相同，比較 3 和 6 伏特。同時追蹤功率與電流，辨認它們不同的倍率變化。",
        ),
        b(
          "Why does power increase fourfold when voltage doubles?",
          "電壓加倍時，功率為何變四倍？",
        ),
        b("P depends on V² at fixed resistance", "固定電阻時，P 正比於 V²"),
        b("Resistance automatically doubles", "電阻自動加倍"),
        b(
          "Both V and I double, so VI quadruples. Resistance remains fixed in this experiment and cannot explain the change.",
          "V 與 I 都加倍，因此 VI 變四倍。這個實驗的電阻固定，並沒有自動改變。",
        ),
        { voltage: 6, resistance: 300, parallel: 0 },
      ),
      l(
        b("Deliver a tunable model lamp", "完成可調整的模型燈"),
        b(
          "Choose a modest current and show how resistance adjusts it at fixed supply voltage. Your deliverable is a simulated circuit with stated idealizations. Component ratings and real LED behavior must be checked separately before physical construction.",
          "選擇適中的電流，展示固定供電電壓時如何用電阻調整它。成果是一個有明確理想化假設的模擬電路。實體製作前，必須另外檢查元件額定值與真實 LED 行為。",
        ),
        b(
          "Save a 6 V configuration. Compare resistance 300 and 600, recording equivalent resistance, current and power for the selected arrangement.",
          "保存一組 6 V 設定，比較電阻 300 和 600，記錄所選配置的等效電阻、電流與功率。",
        ),
        b(
          "Which adjustment lowers current at fixed supply and topology?",
          "供電和拓撲固定時，哪個調整能降低電流？",
        ),
        b("Increase resistance", "提高電阻"),
        b("Decrease resistance", "降低電阻"),
        b(
          "I = V/R falls as R increases. Decreasing resistance does the opposite and can raise power as well as current.",
          "I = V/R 隨 R 增加而降低。減少電阻會產生相反效果，同時可能提高電流和功率。",
        ),
        { voltage: 6, resistance: 600, parallel: 0 },
      ),
    ],
  },
  {
    id: "mini-synthesizer",
    kind: "sound",
    domain: b("Music", "音樂"),
    title: b(
      "Synthesize an instrument sound from frequency and waveform",
      "用頻率與波形合成樂器的聲音",
    ),
    description: b(
      "Set pitch from frequency, shape timbre with harmonics, control attack and decay with an envelope, then play a phrase.",
      "用頻率決定音高、用泛音調出音色、用包絡控制起音與衰減，再彈出一段旋律。",
    ),
    lessons: [
      l(
        b("From vibration to an instrument", "從振動到樂器"),
        b(
          "Acoustic instruments turn vibration into pressure waves; electronic synthesis constructs a changing signal. Our instrument separates frequency, amplitude and waveform so you can hear what each controls. Sound starts only after you press the listening control.",
          "傳統樂器把振動轉成壓力波，電子合成則建立隨時間變化的訊號。我們把頻率、振幅與波形分開，讓你聽出各自的作用。只有按下聆聽控制後才會發聲。",
        ),
        b(
          "Start with a sine wave at 220 Hz and low amplitude. Listen briefly, stop, and inspect one repeating cycle in the wave display.",
          "從 220 Hz、低振幅的正弦波開始，短暫聆聽後停止，在波形圖中找出一個重複週期。",
        ),
        b("What does 220 Hz describe?", "220 Hz 描述什麼？"),
        b("220 cycles each second", "每秒 220 個週期"),
        b("A sound lasting 220 seconds", "持續 220 秒的聲音"),
        b(
          "Hertz measures repetition rate. Duration is controlled separately and does not follow from the frequency value.",
          "赫茲測量重複的頻率。持續時間是另一個控制項，不能從頻率數值直接得到。",
        ),
        {
          frequency: 220,
          amplitude: 0.15,
          waveform: 0,
          attack: 0.05,
          release: 0.3,
        },
      ),
      l(
        b("Separate pitch from level", "分開音高與音量"),
        b(
          "Frequency mainly sets perceived pitch; amplitude changes signal level. Doubling a musical frequency produces an octave. Perceived loudness also depends on frequency and listening conditions, so amplitude is not a universal loudness scale.",
          "頻率主要決定音高，振幅改變訊號強度。音樂頻率加倍會提高一個八度。聽感音量也受頻率與聆聽條件影響，因此振幅不是通用的響度刻度。",
        ),
        b(
          "Compare 220 and 440 Hz at the same low amplitude. Then keep 440 Hz and vary amplitude gently; identify which change affects pitch.",
          "以相同低振幅比較 220 和 440 Hz，再固定 440 Hz 輕微調整振幅，分辨哪個改變影響音高。",
        ),
        b(
          "Which adjustment raises a 220 Hz note by one octave?",
          "哪個調整能把 220 Hz 提高一個八度？",
        ),
        b("Set frequency to 440 Hz", "把頻率設為 440 Hz"),
        b("Double amplitude", "把振幅加倍"),
        b(
          "An octave corresponds to a frequency ratio of two. Doubling amplitude changes level, not the rate of waveform repetition.",
          "八度對應頻率比二比一。振幅加倍只改變強度，不會改變波形重複的速率。",
        ),
        { frequency: 440, amplitude: 0.15, waveform: 0 },
      ),
      l(
        b("Design the tone color", "設計聲音的色彩"),
        b(
          "A sine wave contains one ideal frequency. Square and sawtooth waves contain additional harmonics, giving them different timbres at the same fundamental. The shape of a cycle therefore matters even when its repetition rate stays fixed.",
          "理想正弦波只包含一個頻率。方波與鋸齒波還包含額外諧波，因此基頻相同時仍有不同音色。即使重複速率不變，單個週期的形狀也會影響聲音。",
        ),
        b(
          "At 220 Hz and low amplitude, switch between sine, square and sawtooth. Listen to each briefly and compare the visible edges and slopes.",
          "在 220 Hz、低振幅下切換正弦波、方波與鋸齒波。各聽一小段，比較圖上邊緣和斜面。",
        ),
        b(
          "Why can two 220 Hz tones sound different?",
          "兩個 220 Hz 的音為何聽起來不同？",
        ),
        b("Their harmonic content can differ", "它們的諧波組成可以不同"),
        b("Equal pitch guarantees equal timbre", "音高相同就保證音色相同"),
        b(
          "The fundamental sets the repetition rate, while harmonics alter the waveform and timbre. Matching the fundamental alone does not match the entire signal.",
          "基頻決定重複速率，諧波改變波形與音色。只有基頻相同，不代表整個訊號相同。",
        ),
        { frequency: 220, amplitude: 0.1, waveform: 1 },
      ),
      l(
        b("Give each note a beginning and end", "讓每個音有起點和終點"),
        b(
          "An envelope changes amplitude over time. Attack controls the rise and release controls the fade after a note ends. A gradual transition can reduce abrupt clicks and makes the same oscillator resemble a different instrument.",
          "包絡讓振幅隨時間變化。起音控制上升，釋音控制音符結束後的淡出。漸進變化可以減少突然的喀聲，也讓同一個振盪器呈現不同樂器性格。",
        ),
        b(
          "Compare attack 0.01 and 0.5 seconds, then release 0.1 and 1 second. Keep pitch and waveform fixed to isolate the envelope.",
          "比較起音 0.01 和 0.5 秒，再比較釋音 0.1 和 1 秒。固定音高與波形，單獨研究包絡。",
        ),
        b(
          "Which control makes a note fade more slowly after release?",
          "哪個控制讓音符放開後更慢淡出？",
        ),
        b("A longer release time", "較長的釋音時間"),
        b("A higher frequency", "較高的頻率"),
        b(
          "Release directly shapes the amplitude decay. Frequency changes pitch and does not specify how long the amplitude takes to fade.",
          "釋音直接決定振幅衰減。頻率改變音高，並不指定振幅需要多久才消失。",
        ),
        {
          frequency: 330,
          amplitude: 0.15,
          waveform: 0,
          attack: 0.5,
          release: 1,
        },
      ),
      l(
        b("Perform a short phrase", "演奏一段短句"),
        b(
          "A phrase combines a reusable sound with an ordered set of notes. Keep your envelope and waveform consistent while testing pitches such as 220, 330 and 440 Hz. Save the sound settings and use playback to judge the transitions.",
          "短句把可重用的音色和有順序的音符結合。固定包絡與波形，測試例如 220、330、440 Hz 的音高。保存音色設定，透過播放判斷音符之間的銜接。",
        ),
        b(
          "Choose a waveform and gentle envelope, play the phrase controls, and save the instrument. Compare a short release with a long one for fade duration; the phrase schedules notes after each release ends.",
          "選擇波形與柔和包絡，使用旋律播放控制，並保存樂器。比較短釋音與長釋音的淡出長度；旋律會在前一音釋音結束後才安排下一音。",
        ),
        b(
          "What should remain fixed when comparing two envelopes?",
          "比較兩組包絡時，什麼應保持固定？",
        ),
        b("The note sequence and waveform", "音符順序與波形"),
        b(
          "Nothing; change all controls together",
          "不必固定；一起改動所有控制",
        ),
        b(
          "Holding notes and waveform fixed isolates the envelope's effect. Changing everything at once makes the cause of a perceived difference ambiguous.",
          "固定音符與波形能隔離包絡的影響。所有設定一起改變，就無法判斷聽感差異的原因。",
        ),
        {
          frequency: 220,
          amplitude: 0.15,
          waveform: 2,
          attack: 0.08,
          release: 0.4,
        },
      ),
    ],
  },
  {
    id: "color-tool",
    kind: "color",
    domain: b("Color", "色彩"),
    title: b(
      "Build a palette tool from RGB mixing and contrast ratio",
      "用 RGB 混色與對比度做出配色工具",
    ),
    description: b(
      "Mix red, green and blue light, compute the contrast between text and background, then export a usable color code.",
      "混合紅綠藍三色光、計算文字與背景的對比度，再輸出可以直接使用的色碼。",
    ),
    lessons: [
      l(
        b("Mix light rather than paint", "混合光，而不是顏料"),
        b(
          "Screens combine emitted red, green and blue light. Paint absorbs wavelengths, so mixing paint follows different rules. Our RGB tool uses the screen model: zero channels produce black, and maximum channels produce white.",
          "螢幕混合發出的紅、綠、藍光。顏料吸收部分波長，因此混色規則不同。RGB 工具使用螢幕模型：三色皆零是黑色，三色皆最大是白色。",
        ),
        b(
          "Compare (0,0,0), (255,0,0) and (255,255,255). Notice that adding screen light brightens the result.",
          "比較 (0,0,0)、(255,0,0)、(255,255,255)，觀察增加螢幕光線如何讓結果變亮。",
        ),
        b(
          "What does maximum red, green and blue produce?",
          "紅綠藍都開到最大會得到什麼？",
        ),
        b("White light", "白光"),
        b("Black paint", "黑色顏料"),
        b(
          "Additive RGB combines emitted light into white. Black paint belongs to a different physical model involving absorption.",
          "RGB 加色把發出的光合成白色。黑色顏料屬於吸收光線的另一種物理模型。",
        ),
        { red: 255, green: 0, blue: 0 },
      ),
      l(
        b("Discover additive secondaries", "探索加色的次色"),
        b(
          "Two full-strength channels create cyan, magenta or yellow. These are combinations of light, not additional independent channels. By holding one channel at zero, you can explore a whole face of the RGB color cube.",
          "兩個全亮通道可產生青、洋紅或黃。它們是光的組合，不是新增的獨立通道。把一個通道固定為零，就能探索 RGB 色立方的一個面。",
        ),
        b(
          "Set red and green to 255, blue to 0. Then lower green to 128. Observe the shift from yellow toward orange.",
          "把紅綠設為 255、藍設為 0，再把綠降到 128，觀察黃色如何偏向橘色。",
        ),
        b(
          "Which channels make yellow in additive RGB?",
          "RGB 加色中，哪兩個通道組成黃色？",
        ),
        b("Red and green", "紅與綠"),
        b("Red and blue", "紅與藍"),
        b(
          "Red plus green yields yellow light. Red plus blue gives magenta, so swapping a channel changes the hue family.",
          "紅光加綠光得到黃光。紅光加藍光得到洋紅，因此交換通道會改變色相。",
        ),
        { red: 255, green: 255, blue: 0 },
      ),
      l(
        b("Encode a reusable swatch", "編碼可重用色票"),
        b(
          "An RGB channel ranges from 0 to 255. This tool exports CSS rgb(r, g, b); hexadecimal CSS is another representation with two base-16 digits per channel. Equal channels create neutral grays; unequal channels add a color bias.",
          "RGB 通道範圍是 0 到 255。工具匯出 CSS rgb(r, g, b)；十六進位 CSS 則是每個通道用兩位十六進位數字表示的另一種寫法。三個通道相同會得到中性灰，不同則帶有色偏。",
        ),
        b(
          "Set all channels to 128 and inspect the exported code. Then raise only blue and compare the swatch and channel values.",
          "把所有通道设為 128，檢查匯出的色碼。接著只提高藍色，比較色票和通道值。",
        ),
        b("Which setting is neutral gray?", "哪個設定是中性灰？"),
        b("(128, 128, 128)", "(128, 128, 128)"),
        b("(128, 128, 255)", "(128, 128, 255)"),
        b(
          "Equal RGB channels are neutral in this model. The second setting adds extra blue light, giving a blue tint instead of gray.",
          "這個模型中，相同 RGB 通道是中性色。第二個設定多了藍光，會帶藍色而不是中性灰。",
        ),
        { red: 128, green: 128, blue: 128 },
      ),
      l(
        b("Make text readable", "讓文字易讀"),
        b(
          "Contrast compares relative luminance, not raw channel differences. A color that looks vivid can still be poor behind text. Check both light and dark text and evaluate the displayed ratio; ordinary text commonly uses a 4.5:1 target.",
          "對比比較的是相對亮度，不是直接把通道相減。鮮豔的色彩仍可能不適合當文字背景。比較淺色與深色文字，評估畫面上的比值；一般文字常以 4.5:1 為目標。",
        ),
        b(
          "Try a bright yellow background, then a dark blue one. Compare black and white text contrast and choose the stronger pairing for each.",
          "先試亮黃色背景，再試深藍色。比較黑字與白字的對比，為每種背景選擇較強的組合。",
        ),
        b(
          "Is a saturated color automatically readable behind white text?",
          "飽和色配上白字就一定易讀嗎？",
        ),
        b("No; luminance contrast must be checked", "不一定；必須檢查亮度對比"),
        b("Yes; saturation guarantees contrast", "是；飽和度保證對比"),
        b(
          "Saturation describes colorfulness, not luminance difference. Bright saturated yellow can have weak contrast with white text.",
          "飽和度描述鮮豔程度，不是亮度差。明亮而飽和的黃色，配白字仍可能對比不足。",
        ),
        { red: 25, green: 55, blue: 120 },
      ),
      l(
        b("Export a documented palette choice", "匯出有依據的配色"),
        b(
          "A reusable color needs a value, an intended role and a readable text pairing. Export the CSS and preserve the contrast result with the chosen settings. A single swatch does not verify every state in a complete interface.",
          "可重用色彩需要數值、用途和易讀的文字搭配。匯出 CSS，並保留所選設定的對比結果。一個色票不能代表整個介面所有狀態都已驗證。",
        ),
        b(
          "Choose a background, select readable text, and export its CSS. Test a lighter variation before deciding which version to keep.",
          "選擇背景和易讀的文字，匯出 CSS。再測試較淺的變體，決定保留哪個版本。",
        ),
        b(
          "What belongs in a useful color handoff?",
          "有用的配色交付應包含什麼？",
        ),
        b(
          "Color value, role and tested text pairing",
          "色值、用途與經過檢查的文字搭配",
        ),
        b("Only a color name such as ocean", "只有海洋這樣的色名"),
        b(
          "A numeric value and tested pairing are reproducible. A poetic name alone cannot specify an exact color or prove text readability.",
          "數值與經檢查的搭配能被重現。只有詩意的名稱，無法指定精確色彩，也不能證明文字易讀。",
        ),
        { red: 30, green: 64, blue: 140 },
      ),
    ],
  },
];
