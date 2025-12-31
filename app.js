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

// ついでにログアウトも作っておく（任意）
window.logout = async () => {
  await supabaseClient.auth.signOut();
  location.reload();
};
