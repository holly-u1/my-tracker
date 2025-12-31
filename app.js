// app.js（全文）
// Supabase CDN（index.htmlの <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>）を前提

const { createClient } = window.supabase;

const supabaseClient = createClient(
  "https://bmfvtrrindadbybyighu.supabase.co",
  "sb_publishable_n5trjK_oSbJrwBKsReMdFA_8mBgihar"
);

const statusEl = document.getElementById("status");

function formatMinutes(min) {
  const m = Number(min) || 0;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}時間${r}分` : `${r}分`;
}

function renderSummary(targetEl, title, rowsData) {
  if (!targetEl) return;

  const byCategory = {};
  let total = 0;

  for (const row of rowsData || []) {
    const cat = row.category || "Uncategorized";
    const min = Number(row.minutes) || 0;
    byCategory[cat] = (byCategory[cat] || 0) + min;
    total += min;
  }

  const rows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, min]) => `<li>${cat}: <b>${formatMinutes(min)}</b></li>`)
    .join("");

  targetEl.innerHTML = `
    <div>${title} 合計: <b>${formatMinutes(total)}</b></div>
    <ul>${rows || "<li>データなし</li>"}</ul>
  `;
}

async function getLoggedInUser() {
  const { data: userData, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  return userData?.user || null;
}

async function loadTodaySummary() {
  const summaryEl = document.getElementById("summary");
  if (!summaryEl) return;

  let user;
  try {
    user = await getLoggedInUser();
  } catch (e) {
    console.error(e);
    summaryEl.textContent = "集計の取得に失敗しました";
    return;
  }

  if (!user) {
    summaryEl.textContent = "未ログイン";
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseClient
    .from("study_logs")
    .select("category, minutes")
    .eq("user_id", user.id)
    .eq("date", today);

  if (error) {
    console.error(error);
    summaryEl.textContent = "集計の取得に失敗しました";
    return;
  }

  renderSummary(summaryEl, "今日の", data);
}

async function loadAllTimeSummary() {
  const summaryAllEl = document.getElementById("summaryAll");
  if (!summaryAllEl) return;

  let user;
  try {
    user = await getLoggedInUser();
  } catch (e) {
    console.error(e);
    summaryAllEl.textContent = "集計の取得に失敗しました";
    return;
  }

  if (!user) {
    summaryAllEl.textContent = "未ログイン";
    return;
  }

  // 全期間（date条件なし）
  const { data, error } = await supabaseClient
    .from("study_logs")
    .select("category, minutes")
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    summaryAllEl.textContent = "集計の取得に失敗しました";
    return;
  }

  renderSummary(summaryAllEl, "全期間の", data);
}

async function refreshSummaries() {
  await loadTodaySummary();
  await loadAllTimeSummary();
}

// 初期表示：ログイン状態チェック + 集計表示
(async () => {
  const { data } = await supabaseClient.auth.getSession();
  const session = data.session;

  if (statusEl) {
    if (session?.user) {
      statusEl.textContent = `ログイン中: ${session.user.email}`;
    } else {
      statusEl.textContent = "未ログイン";
    }
  }

  await refreshSummaries();
})();

// Magic Link送信
const loginBtn = document.getElementById("login");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const emailEl = document.getElementById("email");
    const email = emailEl ? emailEl.value.trim() : "";
    if (!email) return alert("メールアドレスを入力してください");

    if (statusEl) statusEl.textContent = "ログインリンクを送信中…";

    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        // GitHub Pagesに戻す
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) {
      console.error(error);
      if (statusEl) statusEl.textContent = "送信失敗";
      alert("エラー: " + error.message);
      return;
    }

    if (statusEl) statusEl.textContent = "メールを確認してください（ログインリンクを送りました）";
  });
}

// ログアウト（任意）
window.logout = async () => {
  await supabaseClient.auth.signOut();
  location.reload();
};

// 学習ログ保存
const saveBtn = document.getElementById("saveStudy");
if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    const minutesEl = document.getElementById("minutes");
    const minutes = Number(minutesEl ? minutesEl.value : 0);
    if (!minutes || minutes <= 0) return alert("分を入力してください");

    // ログイン確認
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser();
    if (userErr) {
      console.error(userErr);
      return alert("ユーザー取得エラー: " + userErr.message);
    }
    const user = userData.user;
    if (!user) return alert("未ログインです");

    // カテゴリ取得
    const categoryEl = document.getElementById("category");
    const category = categoryEl ? categoryEl.value : "Review / Test";

    const payload = {
      user_id: user.id,
      date: new Date().toISOString().slice(0, 10),
      category,
      minutes,
      memo: null
    };

    const { data, error } = await supabaseClient
      .from("study_logs")
      .insert(payload)
      .select();

    if (error) {
      console.error(error);
      alert("保存エラー: " + error.message);
      return;
    }

    console.log("inserted:", data);
    alert("保存しました！");

    // 保存後に「今日」と「全期間」を両方更新
    await refreshSummaries();
  });
}
