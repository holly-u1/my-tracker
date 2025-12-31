// app.js（全文）
// Supabase CDN（index.htmlの <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>）を前提

const { createClient } = window.supabase;

const supabaseClient = createClient(
  "https://bmfvtrrindadbybyighu.supabase.co",
  "sb_publishable_n5trjK_oSbJrwBKsReMdFA_8mBgihar"
);

const statusEl = document.getElementById("status");

// 初期表示：ログイン状態チェック
(async () => {
  const { data } = await supabaseClient.auth.getSession();
  const session = data.session;

  if (session?.user) {
    statusEl.textContent = `ログイン中: ${session.user.email}`;
  } else {
    statusEl.textContent = "未ログイン";
  }
})();

// Magic Link送信
document.getElementById("login").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  if (!email) return alert("メールアドレスを入力してください");

  statusEl.textContent = "ログインリンクを送信中…";

  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      // GitHub Pagesに戻す
      emailRedirectTo: window.location.origin + window.location.pathname
    }
  });

  if (error) {
    console.error(error);
    statusEl.textContent = "送信失敗";
    alert("エラー: " + error.message);
    return;
  }

  statusEl.textContent = "メールを確認してください（ログインリンクを送りました）";
});

// ログアウト（任意）: コンソールで logout() と打てば実行できます
window.logout = async () => {
  await supabaseClient.auth.signOut();
  location.reload();
};

// 学習ログ保存
document.getElementById("saveStudy").addEventListener("click", async () => {
  const minutes = Number(document.getElementById("minutes").value);
  if (!minutes || minutes <= 0) return alert("分を入力してください");

  // 1) ログイン確認
  const { data: userData, error: userErr } = await supabaseClient.auth.getUser();
  if (userErr) {
    console.error(userErr);
    return alert("ユーザー取得エラー: " + userErr.message);
  }
  const user = userData.user;
  if (!user) return alert("未ログインです");

  // 2) ★先にカテゴリ取得（ここが重要）
  const categoryEl = document.getElementById("category");
  const category = categoryEl ? categoryEl.value : "Review / Test";

  // 3) insert payload
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
    .select(); // 返り値を受け取ってデバッグしやすくする

  if (error) {
    console.error(error);
    alert("保存エラー: " + error.message);
    return;
  }

  console.log("inserted:", data);
  alert("保存しました！");
  await loadTodaySummary();
});

function formatMinutes(min) {
  const m = Number(min) || 0;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}時間${r}分` : `${r}分`;
}

async function loadTodaySummary() {
  const summaryEl = document.getElementById("summary");
  if (!summaryEl) return;

  // ログインユーザー取得
  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData?.user;
  if (!user) {
    summaryEl.textContent = "未ログイン";
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  // 今日のログを取得（自分の分だけ：RLSで守られてる）
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

  // 集計（カテゴリ別・合計）
  const byCategory = {};
  let total = 0;

  for (const row of data || []) {
    const cat = row.category || "Uncategorized";
    const min = Number(row.minutes) || 0;
    byCategory[cat] = (byCategory[cat] || 0) + min;
    total += min;
  }

  // 表示（HTML生成）
  const rows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, min]) => `<li>${cat}: <b>${formatMinutes(min)}</b></li>`)
    .join("");

  summaryEl.innerHTML = `
    <div>合計: <b>${formatMinutes(total)}</b></div>
    <ul>${rows || "<li>データなし</li>"}</ul>
  `;
}
