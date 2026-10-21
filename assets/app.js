/* RTU Program Needs Poll — client script
 * Program list, Likert items, form logic and submission to Google Sheets.
 * The Google Apps Script URL lives in config.js.
 */
const PROGRAMS=[
  {g:"Undergraduate programs",items:[
    ["dsa","BS Data Science and Analytics","Government, banking, health care and the growing IT-BPM sector now run on data, yet the Philippines still lacks enough graduates who can collect, model and interpret it. This program builds that capacity in statistics, machine learning and AI, the skills driving digital transformation worldwide."],
    ["bsba","BSBA Business Analytics","Philippine businesses, from MSMEs to large conglomerates, are shifting from intuition to evidence-based decisions in marketing, finance and supply chains. Business analytics graduates connect data tools to management problems, a role employers seek more and more as e-commerce and digital payments expand."],
    ["psci","BS Planetary Science","The creation of the Philippine Space Agency in 2019 and the country's growing satellite program signal a national commitment to space science and its applications. Planetary science trains specialists to study Earth and other worlds, supporting satellite missions, remote sensing and the global wave of lunar and planetary exploration."],
    ["met","BS Meteorology","The Philippines faces about 20 tropical cyclones a year, and climate change is making extreme rainfall and heat more frequent. Trained meteorologists are essential for accurate forecasts, early warnings and climate services in PAGASA, LGUs, aviation, agriculture and energy."],
    ["drrm","BS Disaster Risk Reduction Management","As one of the world's most disaster-prone countries, exposed to typhoons, earthquakes, floods and eruptions, the Philippines needs professionals who reduce risk before disasters strike, not only respond after. RA 10121 requires every LGU to run a DRRM office, creating steady demand for graduates skilled in hazard mapping, risk assessment and community resilience."],
    ["iss","BS Innovation and Sustainability Science","Industries and communities must now innovate within the climate, energy and resource limits set by the UN Sustainable Development Goals and national climate commitments. This program trains graduates to design, test and scale sustainable solutions, from circular-economy models to clean technologies."],
    ["daet","BS Data Analytics Engineering Technology","Factories, utilities and smart cities produce continuous streams of sensor and machine data that must be captured, engineered and analyzed in real time. This technology program prepares hands-on specialists in data pipelines, IoT and industrial analytics, supporting the country's move toward Industry 4.0."]]},
  {g:"Graduate diplomas",items:[
    ["gdba","Graduate Diploma in Business Analytics","Many managers and professionals already in the workforce need analytics skills but cannot leave work for a full degree. This short, practice-focused diploma upskills them in data-driven decision-making, answering industry's call for fast reskilling in the age of AI."],
    ["gdea","Graduate Diploma in Engineering Analytics","Engineers in manufacturing, construction, energy and infrastructure increasingly rely on predictive models, simulation and optimization to improve quality and safety. This diploma gives practicing engineers analytics and AI tools to modernize operations and compete in a data-driven global market."]]},
  {g:"Graduate degrees",items:[
    ["maese","Master of Arts in Earth and Space Education","Earth and space science is part of the K to 12 curriculum, yet few teachers have specialized training in geology, meteorology and astronomy. This master's program prepares educators to teach these subjects with depth and confidence, building scientific and climate literacy among Filipino learners."],
    ["phdese","PhD in Earth and Space Education","The Philippines needs researchers and academic leaders who can shape Earth and space science education, from curriculum and teacher training to public science communication. This doctorate develops scholars whose research supports national goals in space, climate and disaster education."]]}
];
const SCALES={
  need:{key:"ratings",prefix:"r",q:"This program responds to a real and growing need of industry, the community, and future careers.",labels:["Strongly disagree","Disagree","Neutral","Agree","Strongly agree"],ends:["Strongly disagree","Neutral","Strongly agree"],short:"Need"},
  enroll:{key:"enroll",prefix:"e",q:"Would you, or someone you know, take this program?",labels:["Definitely not","Probably not","Not sure","Probably yes","Definitely yes"],ends:["Definitely not","Not sure","Definitely"],short:"Would enroll"}
};

const ROLES=["Senior high school student","College student","Graduate or working professional","Industry / employer","Community / LGU / NGO","Faculty / educator","Parent or guardian","Other"];
const FLAT=PROGRAMS.flatMap(g=>g.items);
const $=id=>document.getElementById(id);
const STORE_KEY="rtu-program-poll-v1";

/* ---------- Respondent id (lets a person update instead of duplicating) ---------- */
function loadStore(){try{return JSON.parse(localStorage.getItem(STORE_KEY)||"{}")}catch(e){return {}}}
function saveStore(o){try{localStorage.setItem(STORE_KEY,JSON.stringify(o))}catch(e){}}
const store=loadStore();
if(!store.rid){store.rid=(crypto.randomUUID?crypto.randomUUID():"r-"+Date.now().toString(36)+Math.random().toString(36).slice(2,10));saveStore(store)}

/* ---------- Build form ---------- */
$("role").innerHTML='<option value="">Select one</option>'+ROLES.map(r=>`<option>${r}</option>`).join("");
function likert(id,sk){
  const S=SCALES[sk];
  return `<div class="scale"><div class="q" id="q-${S.prefix}-${id}">${S.q}</div>
    <div class="likert" role="radiogroup" aria-labelledby="q-${S.prefix}-${id} n-${id}">
    ${[1,2,3,4,5].map(v=>`<label title="${S.labels[v-1]}"><input type="radio" name="${S.prefix}-${id}" id="${S.prefix}-${id}-${v}" value="${v}"><span>${v}</span><small>${v===1?S.ends[0]:v===3?S.ends[1]:v===5?S.ends[2]:""}</small></label>`).join("")}
    </div></div>`;
}
const host=$("programs");
PROGRAMS.forEach(grp=>{
  const g=document.createElement("div");g.className="group";
  g.innerHTML=`<div class="group-title">${grp.g}</div>`;
  grp.items.forEach(([id,name,desc])=>{
    const it=document.createElement("div");it.className="item";it.dataset.id=id;
    it.innerHTML=`<div class="name"><span id="n-${id}">${name}</span><p class="desc">${desc}</p></div>
      <button type="button" class="clear" data-clear="${id}">Clear</button>
      ${likert(id,"need")}${likert(id,"enroll")}`;
    g.appendChild(it);
  });
  host.appendChild(g);
});
function markRated(item){const id=item.dataset.id;item.classList.toggle("rated",!!document.querySelector(`input[name="r-${id}"]:checked,input[name="e-${id}"]:checked`))}
host.addEventListener("change",e=>{if(e.target.type==="radio"){markRated(e.target.closest(".item"));validate()}});
host.addEventListener("click",e=>{const id=e.target.dataset&&e.target.dataset.clear;if(!id)return;
  document.querySelectorAll(`input[name="r-${id}"],input[name="e-${id}"]`).forEach(i=>i.checked=false);
  markRated(e.target.closest(".item"));validate()});
["role","suggest","comment"].forEach(id=>$(id).addEventListener("input",validate));

function collect(){
  const out={role:$("role").value,suggest:$("suggest").value.trim(),comment:$("comment").value.trim()};
  Object.values(SCALES).forEach(S=>{const o={};FLAT.forEach(([id])=>{const c=document.querySelector(`input[name="${S.prefix}-${id}"]:checked`);if(c)o[id]=+c.value});out[S.key]=o});
  return out;
}
const countRated=r=>FLAT.filter(([id])=>r.ratings[id]||r.enroll[id]).length;
const endpoint=(window.POLL_CONFIG&&window.POLL_CONFIG.sheetEndpoint)||"";
const configured=/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(endpoint);
let saving=false;

function validate(){
  const r=collect(),n=countRated(r),st=$("status");
  $("submit").disabled=!(configured&&r.role&&n>0&&!saving);
  if(!configured){st.className="status warn";st.textContent="This poll isn't connected to its response sheet yet.";return}
  st.className="status";
  if(!r.role) st.textContent="Choose who you are answering as.";
  else if(!n) st.textContent="Rate at least one program.";
  else st.textContent=`${n} of ${FLAT.length} programs rated.`+(store.last?" Submitting replaces your earlier response.":"");
}

/* ---------- Prefill a returning respondent on this device ---------- */
if(store.last){
  const d=store.last;
  $("role").value=d.role||"";$("suggest").value=d.suggest||"";$("comment").value=d.comment||"";
  Object.values(SCALES).forEach(S=>Object.entries(d[S.key]||{}).forEach(([id,v])=>{const i=$(`${S.prefix}-${id}-${v}`);if(i)i.checked=true}));
  document.querySelectorAll(".item").forEach(markRated);
  $("submit").textContent="Update ratings";
}
validate();

/* ---------- Submit to Google Sheets ---------- */
async function post(payload){
  const body=JSON.stringify(payload);
  // text/plain keeps this a "simple" request, so the browser sends no CORS preflight.
  try{
    const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body,redirect:"follow"});
    const j=await res.json();
    if(!j.ok) throw Object.assign(new Error(j.error||"Rejected"),{server:true});
    return j;
  }catch(e){
    if(e.server) throw e;
    // Some networks block reading the reply. Send again without reading it;
    // the sheet updates by respondent id, so a repeat never duplicates a row.
    await fetch(endpoint,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body});
    return {ok:true,unconfirmed:true};
  }
}
$("submit").addEventListener("click",async()=>{
  const r=collect();if(!r.role||!countRated(r)||!configured)return;
  if($("website").value) return; // honeypot filled: likely a bot
  saving=true;validate();const st=$("status");st.className="status";st.textContent="Sending…";
  const payload={respondentId:store.rid,submittedAt:new Date().toISOString(),...r};
  try{
    await post(payload);
    store.last=r;saveStore(store);
    $("form").hidden=true;$("thanks").hidden=false;$("thanks").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){
    st.className="status warn";
    st.textContent=navigator.onLine===false?"You appear to be offline. Reconnect and press Submit again.":"Your ratings couldn't be sent. Please try again in a moment.";
  }
  saving=false;validate();
});
$("edit").addEventListener("click",()=>{$("thanks").hidden=true;$("form").hidden=false;$("submit").textContent="Update ratings";validate()});
