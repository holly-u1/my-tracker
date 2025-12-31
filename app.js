// CDNで読み込まれた supabase から createClient を取得
const { createClient } = window.supabase;

// 自分用のクライアント名（重要）
const supabaseClient = createClient(
  "https://bmfvtrrindadbybyighu.supabase.co",
  "sb_publishable_n5trjK_oSbJrwBKsReMdFA_8mBgihar"
);

// ログインボタン
document.getElementById("login").addEventListener("click", async () => {
  console.log("login clicked");

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });

  if (error) {
    console.error(error);
    alert(error.message);
  }
});
