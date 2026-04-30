const KEY = "soccer-dynasty-v1";
const $ = (id) => document.getElementById(id);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

const defaults = { accounts: {}, session: null, users: {} };
const state = load();

function newUser(username) {
  return {
    username,
    team: { name: `${username} FC`, color: "#2f7cff", logo: "", budget: 1000000, wins: 0, losses: 0 },
    players: [],
    aiTeams: [],
    achievements: [],
    leagueRound: 0,
  };
}

function load() { try { return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return { ...defaults }; } }
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function activeUser() { return state.session ? state.users[state.session] : null; }

function setTab(login=true){$("tabLogin").classList.toggle("btn-primary",login);$("tabRegister").classList.toggle("btn-primary",!login);$("loginPanel").classList.toggle("active",login);$("registerPanel").classList.toggle("active",!login)}
$("tabLogin").onclick=()=>setTab(true); $("tabRegister").onclick=()=>setTab(false);

$("registerBtn").onclick=()=>{const u=$("registerUsername").value.trim(),p=$("registerPassword").value; if(!u||!p) return msg("authMsg","Username/password required"); if(state.accounts[u]) return msg("authMsg","Username exists"); state.accounts[u]=p; state.users[u]=newUser(u); state.session=u; save(); boot();};
$("loginBtn").onclick=()=>{const u=$("loginUsername").value.trim(),p=$("loginPassword").value; if(state.accounts[u]!==p) return msg("authMsg","Invalid credentials"); state.session=u; save(); boot();};
$("logoutBtn").onclick=()=>{state.session=null; save(); location.reload();};

function msg(id,t){$(id).textContent=t;}

function teamPower(user){ if(!user.players.length) return 0; return Math.round(user.players.reduce((a,p)=>a+p.skill,0)/user.players.length); }
function rng(n){ return Math.floor(Math.random()*n); }

function genAITeam(i){ const base=45+rng(50); return { id:uid(), name:`Rival ${i+1}`, rating:base, wins:0, losses:0, goals:0 }; }
$("genRivalsBtn").onclick=()=>{const u=activeUser(); u.aiTeams=Array.from({length:8},(_,i)=>genAITeam(i)); save(); render();};

$("saveBrandBtn").onclick=()=>{const u=activeUser(); u.team.name=$("teamNameInput").value.trim()||u.team.name; u.team.color=$("teamColorInput").value; u.team.logo=$("teamLogoInput").value.trim(); save(); render();};
$("applyFinanceBtn").onclick=()=>{const u=activeUser(); u.team.budget += Number($("incomeInput").value||0)-Number($("expenseInput").value||0); if(u.team.budget<0) u.team.budget=0; save(); render();};

$("addPlayerForm").onsubmit=async(e)=>{e.preventDefault(); const u=activeUser(); const file=$("pPhoto").files[0]; const photo=file?await toDataURL(file):""; u.players.push({id:uid(),name:$("pName").value.trim(),gender:$("pGender").value,position:$("pPosition").value,number:Number($("pNumber").value),skill:Number($("pTier").value),goals:0,mvp:0,photo}); save(); e.target.reset(); render();};

function toDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}

$("simulateBtn").onclick=()=>{const u=activeUser(); if(!u.aiTeams.length) return alert("Generate AI teams first."); if(!u.players.length) return alert("Add players first."); const rival=u.aiTeams[u.leagueRound % u.aiTeams.length]; const my=teamPower(u)+(rng(24)-10); const their=rival.rating+(rng(24)-10); const goalsMe=Math.max(0,Math.round((my-40)/20)+rng(3)); const goalsThem=Math.max(0,Math.round((their-40)/20)+rng(3)); const win=goalsMe>=goalsThem;
  if(win){u.team.wins++; rival.losses++;} else {u.team.losses++; rival.wins++;}
  const star=u.players.sort((a,b)=>b.skill-a.skill)[rng(Math.min(3,u.players.length))]; star.goals+=goalsMe; star.mvp+=1; rival.goals+=goalsThem; u.team.budget += win?120000:40000; u.leagueRound++;
  const lines=[`Round ${u.leagueRound}: ${u.team.name} ${goalsMe}-${goalsThem} ${rival.name}`,`${star.name} (#${star.number}) bursts forward and slices a pass through midfield.`,`Crowd erupts as ${star.name} creates another dangerous chance!`,`Defensive line adjusts; tactical pressure rises in the final minutes.`, win?`${u.team.name} secure the win and collect league points!`:`${rival.name} edge it today, but your squad gains experience.`];
  $("commentary").textContent=lines.join("\n"); unlock(u,win,goalsMe); save(); renderHighlights(u); render();};

function unlock(u,win,goals){ const p=teamPower(u); if(win && !u.achievements.includes("First Win"))u.achievements.push("First Win"); if(p>=80 && !u.achievements.includes("OP Squad"))u.achievements.push("OP Squad"); if(goals>=4 && !u.achievements.includes("Goal Machine"))u.achievements.push("Goal Machine"); }

function render(){const u=activeUser(); if(!u)return; document.documentElement.style.setProperty("--accent",u.team.color); $("teamNameHeader").textContent=u.team.name; $("teamNameInput").value=u.team.name; $("teamColorInput").value=u.team.color; $("teamLogoInput").value=u.team.logo; $("budgetLabel").textContent=`Budget: $${u.team.budget.toLocaleString()}`; $("clubRecord").textContent=`Record: ${u.team.wins}W-${u.team.losses}L | Team Power ${teamPower(u)}`;
  $("roster").innerHTML=u.players.map(p=>`<div class='player'><div class='row'><img src='${p.photo||""}' alt='${p.name}'/><div><strong>${p.name}</strong><div>${p.gender} • ${p.position}</div><div>#${p.number}</div></div></div><div class='row'><span class='tag'>Skill ${p.skill}</span><span class='tag'>Goals ${p.goals}</span><span class='tag'>MVP ${p.mvp}</span></div></div>`).join("");
  const table=[{name:u.team.name,wins:u.team.wins,goals:u.players.reduce((a,p)=>a+p.goals,0),rating:teamPower(u)},...u.aiTeams.map(t=>({name:t.name,wins:t.wins,goals:t.goals,rating:t.rating}))].sort((a,b)=>b.wins-a.wins||b.goals-a.goals);
  $("standings").innerHTML=`<ol>${table.map(t=>`<li>${t.name} — ${t.wins}W, ${t.goals}G, Rating ${t.rating}</li>`).join("")}</ol>`;
  const tops=[...u.players].sort((a,b)=>b.goals-a.goals||b.skill-a.skill).slice(0,5);
  $("topPlayers").innerHTML=tops.map(p=>`<div>${p.name} • Goals ${p.goals} • Skill ${p.skill}</div>`).join("")||"<p class='muted'>No players yet.</p>";
  $("achievements").innerHTML=u.achievements.map(a=>`<li>${a}</li>`).join("")||"<li>None yet</li>";
}

function renderHighlights(u){ const stars=[...u.players].sort((a,b)=>b.mvp-a.mvp).slice(0,6); $("highlightStrip").innerHTML=stars.map(p=>`<img src='${p.photo||""}' title='${p.name} (${p.mvp} MVPs)'/>`).join(""); }

$("exportBtn").onclick=()=>{const u=activeUser(); const blob=new Blob([JSON.stringify(u,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${u.username}-soccer-save.json`; a.click();};
$("importBtn").onclick=()=>$("importInput").click();
$("importInput").onchange=async(e)=>{const f=e.target.files[0]; if(!f) return; const data=JSON.parse(await f.text()); state.users[state.session]=data; save(); render();};

function boot(){ if(!state.session){$("authView").classList.remove("hidden"); $("appView").classList.add("hidden"); return;} $("authView").classList.add("hidden"); $("appView").classList.remove("hidden"); render(); renderHighlights(activeUser()); }
boot();
