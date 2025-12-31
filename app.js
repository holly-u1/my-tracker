const supabase = supabasejs.createClient(
  "https://bmfvtrrindadbybyighu.supabase.co",
  "sb_publishable_n5trjK_oSbJrwBKsReMdFA_8mBgihar"
);

// ログイン
document.getElementById("login").onclick = async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google"
  });
};

// 保存
document.getElementById("saveStudy").onclick = async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return alert("先にログインしてください");

  const minutes = Number(document.getElementById("minutes").value);

  await supabase.from("study_logs").insert({
    user_id: user.id,
    date: new Date().toISOString().slice(0,10),
    category: "学習",
    minutes
  });

  alert("保存しました");
};
