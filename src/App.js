import { useState, useEffect, useRef } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, orderBy, query, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC8HM3Ya61AuiQjLY0oPYFOK4TSWbDvxbg",
  authDomain: "dnfl-6ea85.firebaseapp.com",
  projectId: "dnfl-6ea85",
  storageBucket: "dnfl-6ea85.firebasestorage.app",
  messagingSenderId: "335169952421",
  appId: "1:335169952421:web:3a58fccf7c16147ed64b4c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ── 비밀번호 (원하는 걸로 바꿔요) ──
const SECRET = "1107";

// ── 나무 SVG ──
function Tree({ growth }) {
  const g = Math.max(0, Math.min(1, growth));
  const stage = g < 0.05 ? 0 : g < 0.2 ? 1 : g < 0.4 ? 2 : g < 0.65 ? 3 : g < 0.9 ? 4 : 5;
  const trunkH = 20 + g * 80;
  const trunkW = 4 + g * 10;
  const canopyR = g < 0.05 ? 0 : 15 + g * 55;
  const leafCount = Math.floor(g * 18);
  const flowerCount = g > 0.7 ? Math.floor((g - 0.7) / 0.3 * 12) : 0;
  const groundY = 220, trunkX = 140, trunkTop = groundY - trunkH;

  const leaves = Array.from({ length: leafCount }, (_, i) => {
    const angle = (i / leafCount) * Math.PI * 2 + i * 0.7;
    const r = canopyR * (0.4 + (i % 3) * 0.2);
    return { x: trunkX + Math.cos(angle) * r, y: trunkTop + 10 + Math.sin(angle) * r * 0.6, size: 8 + (i % 4) * 3 };
  });
  const flowers = Array.from({ length: flowerCount }, (_, i) => {
    const angle = (i / flowerCount) * Math.PI * 2 + 0.3;
    const r = canopyR * (0.3 + (i % 3) * 0.22);
    return { x: trunkX + Math.cos(angle) * r, y: trunkTop + 5 + Math.sin(angle) * r * 0.55 };
  });

  return (
    <svg width="280" height="260" viewBox="0 0 280 260" style={{ overflow: "visible" }}>
      <ellipse cx={trunkX} cy={groundY + 5} rx={60} ry={8} fill="#8B6F47" opacity={0.18} />
      {stage === 0 && <g><ellipse cx={trunkX} cy={groundY - 5} rx={7} ry={5} fill="#8B6F47" /><text x={trunkX} y={groundY - 18} textAnchor="middle" fontSize="11" fill="#A08060" fontFamily="serif">씨앗 🌱</text></g>}
      {stage >= 1 && <path d={`M ${trunkX - trunkW / 2} ${groundY} Q ${trunkX - trunkW / 4} ${trunkTop + trunkH * 0.5} ${trunkX} ${trunkTop} Q ${trunkX + trunkW / 4} ${trunkTop + trunkH * 0.5} ${trunkX + trunkW / 2} ${groundY} Z`} fill="#7A5230" style={{ transition: "all 1s ease" }} />}
      {stage >= 2 && <><line x1={trunkX} y1={trunkTop + trunkH * 0.3} x2={trunkX - canopyR * 0.5} y2={trunkTop - canopyR * 0.15} stroke="#7A5230" strokeWidth={trunkW * 0.4} strokeLinecap="round" /><line x1={trunkX} y1={trunkTop + trunkH * 0.3} x2={trunkX + canopyR * 0.5} y2={trunkTop - canopyR * 0.1} stroke="#7A5230" strokeWidth={trunkW * 0.4} strokeLinecap="round" /></>}
      {stage >= 3 && <><line x1={trunkX} y1={trunkTop + trunkH * 0.15} x2={trunkX - canopyR * 0.7} y2={trunkTop - canopyR * 0.3} stroke="#7A5230" strokeWidth={trunkW * 0.3} strokeLinecap="round" /><line x1={trunkX} y1={trunkTop + trunkH * 0.15} x2={trunkX + canopyR * 0.65} y2={trunkTop - canopyR * 0.25} stroke="#7A5230" strokeWidth={trunkW * 0.3} strokeLinecap="round" /></>}
      {leaves.map((leaf, i) => <ellipse key={i} cx={leaf.x} cy={leaf.y} rx={leaf.size} ry={leaf.size * 0.7} fill={`hsl(${120 + i * 3},${55 + (i % 3) * 10}%,${35 + (i % 4) * 5}%)`} opacity={0.85} transform={`rotate(${i * 20},${leaf.x},${leaf.y})`} style={{ transition: "all 1s ease" }} />)}
      {flowers.map((f, i) => <g key={i}>{[0, 72, 144, 216, 288].map(deg => <ellipse key={deg} cx={f.x + Math.cos(deg * Math.PI / 180) * 5} cy={f.y + Math.sin(deg * Math.PI / 180) * 5} rx={4} ry={3} fill={i % 2 === 0 ? "#F9A8D4" : "#FDE68A"} opacity={0.9} />)}<circle cx={f.x} cy={f.y} r={3} fill="#FEF3C7" /></g>)}
      {stage === 5 && <circle cx={trunkX} cy={trunkTop - canopyR * 0.3} r={canopyR * 1.1} fill="none" stroke="#FDE68A" strokeWidth={2} opacity={0.3} />}
    </svg>
  );
}

// ── 메인 ──
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [config, setConfig] = useState(null);
  const [posts, setPosts] = useState([]);
  const [writeText, setWriteText] = useState("");
  const [writeImg, setWriteImg] = useState(null);
  const [writeImgFile, setWriteImgFile] = useState(null);
  const [writeAuthor, setWriteAuthor] = useState("운성");
  const [uploading, setUploading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [expandedPost, setExpandedPost] = useState(null);
  const fileRef = useRef();

  // 설정 불러오기
  useEffect(() => {
    // 이미 이번 세션에서 로그인했으면 스킵
    if (sessionStorage.getItem("unlocked") === "1") setUnlocked(true);
    async function loadConfig() {
      try {
        const snap = await getDoc(doc(db, "meta", "config"));
        if (snap.exists()) {
          setConfig(snap.data());
          setWriteAuthor(snap.data().names[0]);
          setScreen("main");
        } else {
          setScreen("setup");
        }
      } catch (e) {
        setScreen("setup");
      }
    }
    loadConfig();
  }, []);

  // 일기 실시간 구독
  useEffect(() => {
    if (screen !== "main" && screen !== "diary") return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [screen]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // 날짜 계산
  const depart = config?.departDate ? new Date(config.departDate) : null;
  const ret = config?.returnDate ? new Date(config.returnDate) : null;
  const totalDays = depart && ret ? Math.max(1, Math.ceil((ret - depart) / 86400000)) : 1;
  const elapsed = depart ? Math.max(0, Math.ceil((now - depart) / 86400000)) : 0;
  const daysLeft = ret ? Math.max(0, Math.ceil((ret - now) / 86400000)) : 0;
  const progress = Math.min(1, Math.max(0, elapsed / totalDays));

  const stageLabel =
    progress < 0.05 ? "씨앗이 잠들어 있어요 🌰"
      : progress < 0.2 ? "새싹이 올라오고 있어요 🌱"
        : progress < 0.4 ? "작은 나무가 됐어요 🌿"
          : progress < 0.65 ? "나무가 쑥쑥 크고 있어요 🌳"
            : progress < 0.9 ? "거의 다 컸어요! 🌲"
              : "활짝 피었어요 🌸";

  async function handleSetupDone(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newConfig = {
      departDate: fd.get("depart"),
      returnDate: fd.get("ret"),
      names: [fd.get("name1") || "운성", fd.get("name2") || "수민"],
    };
    await setDoc(doc(db, "meta", "config"), newConfig);
    setConfig(newConfig);
    setWriteAuthor(newConfig.names[0]);
    setScreen("main");
  }

  function handleImagePick(e) {
    const file = e.target.files[0];
    if (!file) return;
    setWriteImgFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        setWriteImg(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function handlePost() {
    if (!writeText.trim() && !writeImg) return;
    setUploading(true);
    try {
      let imgUrl = null;
      if (writeImgFile) {
        const storageRef = ref(storage, `photos/${Date.now()}_${writeImgFile.name}`);
        // canvas blob으로 업로드
        const res = await fetch(writeImg);
        const blob = await res.blob();
        await uploadBytes(storageRef, blob);
        imgUrl = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, "posts"), {
        author: writeAuthor,
        text: writeText.trim(),
        imgUrl,
        createdAt: new Date(),
        dateLabel: new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" }),
        timeLabel: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      });
      setWriteText(""); setWriteImg(null); setWriteImgFile(null);
      setScreen("diary");
    } catch (err) {
      alert("저장 실패: " + err.message);
    }
    setUploading(false);
  }

  const s = {
    app: { minHeight: "100vh", background: "linear-gradient(160deg,#fdf6ec 0%,#f5ede0 50%,#ede4d7 100%)", fontFamily: "'Georgia','Noto Serif KR',serif", color: "#3a2e1e" },
    card: { background: "rgba(255,255,255,0.65)", backdropFilter: "blur(12px)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 4px 24px rgba(120,80,30,0.08)", padding: "24px 20px", margin: "0 16px 16px" },
    btn: { background: "#5a3e1b", color: "#fff8ee", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 15, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 },
    btnSoft: { background: "rgba(90,62,27,0.1)", color: "#5a3e1b", border: "1px solid rgba(90,62,27,0.2)", borderRadius: 12, padding: "10px 20px", fontSize: 14, cursor: "pointer", fontFamily: "inherit" },
    input: { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(90,62,27,0.25)", background: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "inherit", color: "#3a2e1e", boxSizing: "border-box", outline: "none" },
    label: { fontSize: 12, color: "#8B6F47", marginBottom: 6, display: "block", fontWeight: "bold", letterSpacing: 0.5 },
    tab: (active) => ({ flex: 1, padding: "10px 0", background: active ? "#5a3e1b" : "transparent", color: active ? "#fff8ee" : "#8B6F47", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "inherit", transition: "all 0.2s" }),
  };

  function handleUnlock(e) {
    e.preventDefault();
    if (pwInput === SECRET) {
      sessionStorage.setItem("unlocked", "1");
      setUnlocked(true);
      setPwError(false);
    } else {
      setPwError(true);
      setPwInput("");
    }
  }

  if (!unlocked) return (
    <div style={{ ...s.app, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
      <h1 style={{ fontSize: 20, fontWeight: "normal", margin: "0 0 6px" }}>우리 나무</h1>
      <p style={{ fontSize: 13, color: "#8B6F47", margin: "0 0 28px" }}>둘만의 공간이에요</p>
      <form onSubmit={handleUnlock} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 280, padding: "0 24px", boxSizing: "border-box" }}>
        <input
          type="password"
          value={pwInput}
          onChange={e => { setPwInput(e.target.value); setPwError(false); }}
          placeholder="비밀번호를 입력하세요"
          style={{ ...s.input, textAlign: "center", letterSpacing: 4, fontSize: 16 }}
          autoFocus
        />
        {pwError && <p style={{ color: "#c0392b", fontSize: 13, margin: 0, textAlign: "center" }}>비밀번호가 틀렸어요 🍂</p>}
        <button type="submit" style={{ ...s.btn, width: "100%" }}>들어가기</button>
      </form>
    </div>
  );

  if (screen === "loading") return <div style={{ ...s.app, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🌱</div>;

  if (screen === "setup") return (
    <div style={s.app}>
      <div style={{ padding: "40px 16px 0", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🌱</div>
        <h1 style={{ fontSize: 22, fontWeight: "normal", margin: "0 0 4px" }}>우리 나무</h1>
        <p style={{ fontSize: 13, color: "#8B6F47", margin: "0 0 28px" }}>함께 키우는 나무, 돌아오면 활짝 피어있을 거야</p>
      </div>
      <div style={s.card}>
        <form onSubmit={handleSetupDone} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><label style={s.label}>내 이름</label><input name="name1" style={s.input} placeholder="운성" defaultValue="운성" /></div>
            <div style={{ flex: 1 }}><label style={s.label}>상대방 이름</label><input name="name2" style={s.input} placeholder="수민" defaultValue="수민" /></div>
          </div>
          <div><label style={s.label}>✈️ 떠나는 날</label><input name="depart" type="date" style={s.input} required /></div>
          <div><label style={s.label}>🏠 돌아오는 날</label><input name="ret" type="date" style={s.input} required /></div>
          <button type="submit" style={{ ...s.btn, width: "100%", marginTop: 4 }}>나무 심기 🌱</button>
        </form>
      </div>
    </div>
  );

  if (screen === "main") return (
    <div style={s.app}>
      <div style={{ padding: "32px 16px 0", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "#B08050", margin: "0 0 2px", letterSpacing: 2 }}>우리 나무</p>
        <h1 style={{ fontSize: 20, fontWeight: "normal", margin: "0 0 4px" }}>{stageLabel}</h1>
        <p style={{ fontSize: 12, color: "#A08060", margin: 0 }}>{config?.names[0]} & {config?.names[1]}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}><Tree growth={progress} /></div>
      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          {[{ val: `D-${daysLeft}`, sub: "돌아오는 날까지" }, { val: elapsed, sub: "지난 날들" }, { val: totalDays, sub: "전체 일수" }].map(({ val, sub }) => (
            <div key={sub} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: "bold", color: "#5a3e1b" }}>{val}</div>
              <div style={{ fontSize: 11, color: "#A08060" }}>{sub}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(90,62,27,0.1)", borderRadius: 99, height: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "linear-gradient(90deg,#8B6F47,#5a3e1b)", borderRadius: 99, transition: "width 1s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 10, color: "#B08050" }}>✈️ {config?.departDate}</span>
          <span style={{ fontSize: 10, color: "#A08060" }}>{Math.round(progress * 100)}%</span>
          <span style={{ fontSize: 10, color: "#B08050" }}>🏠 {config?.returnDate}</span>
        </div>
      </div>
      <div style={{ padding: "0 16px", display: "flex", gap: 10 }}>
        <button style={{ ...s.btn, flex: 1 }} onClick={() => setScreen("write")}>+ 기록하기</button>
        <button style={{ ...s.btnSoft, flex: 1 }} onClick={() => setScreen("diary")}>📖 일기장</button>
      </div>
      <div style={{ padding: "12px 16px 0" }}>
        <button style={{ ...s.btnSoft, width: "100%", fontSize: 12, padding: "8px" }} onClick={() => setScreen("setup")}>⚙️ 날짜 · 이름 설정</button>
      </div>
      {posts.length > 0 && (
        <div style={{ ...s.card, marginTop: 16 }}>
          <p style={{ fontSize: 11, color: "#A08060", margin: "0 0 10px", letterSpacing: 1 }}>최근 기록</p>
          {posts.slice(0, 2).map(post => (
            <div key={post.id} style={{ borderBottom: "1px solid rgba(90,62,27,0.08)", paddingBottom: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#5a3e1b", fontWeight: "bold" }}>{post.author}</span>
                <span style={{ fontSize: 10, color: "#B08050" }}>{post.dateLabel}</span>
              </div>
              {post.imgUrl && <img src={post.imgUrl} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 6, maxHeight: 160, objectFit: "cover" }} />}
              <p style={{ fontSize: 13, margin: 0, color: "#5a3e1b", lineHeight: 1.6 }}>{post.text}</p>
            </div>
          ))}
          {posts.length > 2 && <button style={{ ...s.btnSoft, width: "100%", fontSize: 12 }} onClick={() => setScreen("diary")}>전체 보기 ({posts.length}개)</button>}
        </div>
      )}
      <div style={{ height: 32 }} />
    </div>
  );

  if (screen === "write") return (
    <div style={s.app}>
      <div style={{ padding: "32px 16px 0", display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }} onClick={() => setScreen("main")}>←</button>
        <h2 style={{ fontSize: 18, fontWeight: "normal", margin: 0 }}>오늘 하루 기록하기</h2>
      </div>
      <div style={s.card}>
        <label style={s.label}>누가 쓰는 글이에요?</label>
        <div style={{ display: "flex", background: "rgba(90,62,27,0.08)", borderRadius: 12, padding: 3, marginBottom: 18 }}>
          {config?.names.map(name => (
            <button key={name} style={s.tab(writeAuthor === name)} onClick={() => setWriteAuthor(name)}>{name}</button>
          ))}
        </div>
        <label style={s.label}>사진 (선택)</label>
        <div onClick={() => fileRef.current.click()} style={{ border: "1.5px dashed rgba(90,62,27,0.3)", borderRadius: 12, minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 14, overflow: "hidden", background: "rgba(255,255,255,0.4)" }}>
          {writeImg ? <img src={writeImg} alt="" style={{ width: "100%", borderRadius: 12, maxHeight: 220, objectFit: "cover" }} /> : <span style={{ color: "#B08050", fontSize: 13 }}>📷 사진 추가하기</span>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImagePick} />
        {writeImg && <button style={{ ...s.btnSoft, fontSize: 12, marginBottom: 14 }} onClick={() => { setWriteImg(null); setWriteImgFile(null) }}>사진 제거</button>}
        <label style={s.label}>오늘 어땠어요?</label>
        <textarea value={writeText} onChange={e => setWriteText(e.target.value)} placeholder="오늘 있었던 일, 보고 싶은 마음, 뭐든 좋아요 ☁️" rows={5} style={{ ...s.input, resize: "none", lineHeight: 1.7 }} />
        <button style={{ ...s.btn, width: "100%", marginTop: 16, opacity: uploading ? 0.6 : 1 }} onClick={handlePost} disabled={uploading || (!writeText.trim() && !writeImg)}>
          {uploading ? "올리는 중... 🌿" : "기록 남기기 🌿"}
        </button>
      </div>
    </div>
  );

  if (screen === "diary") return (
    <div style={s.app}>
      <div style={{ padding: "32px 16px 0", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }} onClick={() => setScreen("main")}>←</button>
        <h2 style={{ fontSize: 18, fontWeight: "normal", margin: 0 }}>📖 우리 일기장</h2>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#A08060" }}>{posts.length}개</span>
      </div>
      {posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 32px", color: "#A08060" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <p>아직 기록이 없어요.<br />오늘 하루를 남겨보세요.</p>
          <button style={{ ...s.btn, marginTop: 12 }} onClick={() => setScreen("write")}>첫 기록 남기기</button>
        </div>
      ) : (
        <div style={{ paddingBottom: 32 }}>
          {posts.map(post => {
            const isExpanded = expandedPost === post.id;
            const isLong = post.text && post.text.length > 120;
            return (
              <div key={post.id} style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, background: post.author === config?.names[0] ? "#5a3e1b" : "#8B6F47", color: "#fff8ee", padding: "3px 10px", borderRadius: 99 }}>{post.author}</span>
                  <span style={{ fontSize: 11, color: "#B08050" }}>{post.dateLabel} {post.timeLabel}</span>
                </div>
                {post.imgUrl && <img src={post.imgUrl} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 10, maxHeight: 240, objectFit: "cover" }} />}
                {post.text && <>
                  <p style={{
                    fontSize: 14, lineHeight: 1.75, margin: 0, color: "#3a2e1e", whiteSpace: "pre-wrap",
                    overflow: (!isExpanded && isLong) ? "hidden" : "visible",
                    display: (!isExpanded && isLong) ? "-webkit-box" : "block",
                    WebkitLineClamp: (!isExpanded && isLong) ? 4 : undefined,
                    WebkitBoxOrient: (!isExpanded && isLong) ? "vertical" : undefined,
                  }}>{post.text}</p>
                  {isLong && <button style={{ background: "none", border: "none", color: "#8B6F47", fontSize: 12, cursor: "pointer", marginTop: 4, padding: 0, fontFamily: "inherit" }} onClick={() => setExpandedPost(isExpanded ? null : post.id)}>{isExpanded ? "접기 ▲" : "더 보기 ▼"}</button>}
                </>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return null;
}