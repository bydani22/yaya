/* =========================================================
   MediDay — app.js
   Todo el estado vive en localStorage. Sin backend.
========================================================= */

const STORAGE_KEY = 'mediday_state_v1';
const RING_CIRCUMFERENCE = 2 * Math.PI * 92; // r=92

const EMOJI_OPTIONS = ['💊','💉','🩹','🧴','🫧','💧','🌡️','🩺','🧪','🍵','🥛','☀️','🌙','🍽️'];
const MOMENT_LABELS = {
  '': '', 'En ayunas':'En ayunas', 'Antes de comer':'Antes de comer',
  'Después de comer':'Después de comer', 'Antes de dormir':'Antes de dormir',
  'Con el desayuno':'Con el desayuno'
};

const FACES = { empty: '😴', low: '🙂', mid: '😊', done: '🥳' };

let state = loadState();
let currentScreen = 'inicio';
let calendarCursor = new Date(); // month being viewed in Historial
let editingMedId = null;
let selectedEmoji = EMOJI_OPTIONS[0];

/* ---------------- state ---------------- */
function defaultState(){
  return {
    settings: { name: '', darkMode: (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches), notifications: true },
    medications: [], // {id, name, time:"HH:MM", dose, moment, emoji}
    history: {} // { "YYYY-MM-DD": { takenIds: [...] } }
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed, settings: { ...defaultState().settings, ...(parsed.settings||{}) } };
  }catch(e){
    return defaultState();
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayKey(d = new Date()){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function getDayRecord(key){
  if(!state.history[key]) state.history[key] = { takenIds: [] };
  return state.history[key];
}

/* ---------------- init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  document.getElementById('nameInput').value = state.settings.name || '';
  document.getElementById('notifToggle').checked = state.settings.notifications;
  document.getElementById('darkToggleSettings').checked = state.settings.darkMode;
  buildEmojiGrid();
  bindNav();
  bindHeader();
  bindForm();
  bindSettings();
  bindCelebrate();
  renderAll();
});

function bindNav(){
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> navigateTo(btn.dataset.nav));
  });
  document.getElementById('emptyAddBtn').addEventListener('click', ()=> openForm());
}

function navigateTo(name){
  currentScreen = name;
  document.querySelectorAll('.screen').forEach(s => s.hidden = s.dataset.screen !== name);
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
  if(name === 'historial') renderHistorial();
  if(name === 'gestionar') renderGestionar();
  if(name === 'inicio') renderInicio();
}

/* ---------------- header / theme ---------------- */
function bindHeader(){
  document.getElementById('darkToggle').addEventListener('click', ()=>{
    state.settings.darkMode = !state.settings.darkMode;
    document.getElementById('darkToggleSettings').checked = state.settings.darkMode;
    applyTheme(); saveState();
  });
}
function applyTheme(){
  document.body.classList.toggle('dark', !!state.settings.darkMode);
}

/* ---------------- render dispatch ---------------- */
function renderAll(){
  renderInicio();
  renderGestionar();
  renderHistorial();
}

/* ---------------- INICIO ---------------- */
function renderInicio(){
  const name = state.settings.name?.trim();
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('greetingText').textContent = name ? `${timeGreet}, ${name} 👋` : `${timeGreet} 👋`;
  document.getElementById('dateText').textContent = new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });

  const meds = [...state.medications].sort((a,b)=> a.time.localeCompare(b.time));
  const key = todayKey();
  const rec = getDayRecord(key);

  const total = meds.length;
  const taken = meds.filter(m => rec.takenIds.includes(m.id)).length;

  updateRing(taken, total);

  // próxima toma
  const now = new Date();
  const nowMinutes = now.getHours()*60 + now.getMinutes();
  const pending = meds.filter(m => !rec.takenIds.includes(m.id));
  const next = pending
    .map(m => ({ m, mins: toMinutes(m.time) }))
    .sort((a,b)=> a.mins - b.mins)
    .find(x => x.mins >= nowMinutes) || pending.map(m=>({m,mins:toMinutes(m.time)})).sort((a,b)=>a.mins-b.mins)[0];

  const nextDoseEl = document.getElementById('nextDose');
  if(next){
    nextDoseEl.querySelector('.next-dose-text').textContent = `Próxima: ${next.m.name} a las ${next.m.time}`;
    nextDoseEl.hidden = false;
  } else if(total > 0){
    nextDoseEl.querySelector('.next-dose-text').textContent = '¡Todo tomado por hoy! 🎉';
    nextDoseEl.hidden = false;
  } else {
    nextDoseEl.hidden = true;
  }

  // lista
  const list = document.getElementById('dosesList');
  const emptyEl = document.getElementById('emptyDoses');
  list.innerHTML = '';
  if(meds.length === 0){
    emptyEl.hidden = false;
  } else {
    emptyEl.hidden = true;
    meds.forEach(m=>{
      const isTaken = rec.takenIds.includes(m.id);
      const card = document.createElement('div');
      card.className = 'dose-card' + (isTaken ? ' taken' : '');
      card.innerHTML = `
        <div class="dose-emoji">${m.emoji || '💊'}</div>
        <div class="dose-info">
          <div class="dose-name ${isTaken?'strike':''}">${escapeHtml(m.name)}</div>
          <div class="dose-meta">
            <span class="dose-time">${m.time}</span>
            ${m.dose ? `<span>· ${escapeHtml(m.dose)}</span>` : ''}
            ${m.moment ? `<span>· ${escapeHtml(m.moment)}</span>` : ''}
            ${m.tipo === 'inyeccion' ? `<span class="tag-inyeccion">💉 Inyección</span>` : ''}
          </div>
        </div>
        <button class="check-btn ${isTaken?'done':''}" aria-label="${m.tipo === 'inyeccion' ? 'Marcar como puesta' : 'Marcar como tomada'}" data-id="${m.id}">✓</button>
      `;
      list.appendChild(card);
    });
    list.querySelectorAll('.check-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> toggleTaken(btn.dataset.id));
    });
  }
}

function toMinutes(t){ const [h,m] = t.split(':').map(Number); return h*60+m; }

function updateRing(taken, total){
  const fg = document.getElementById('ringFg');
  const pct = total === 0 ? 0 : taken/total;
  fg.style.strokeDasharray = RING_CIRCUMFERENCE;
  fg.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - pct);

  document.getElementById('ringTaken').textContent = taken;
  document.getElementById('ringTotal').textContent = total;

  const face = document.getElementById('ringFace');
  let f = FACES.empty, color = getCss('--ring-track');
  if(total === 0){ f = FACES.empty; }
  else if(pct === 0){ f = FACES.empty; }
  else if(pct < 0.5){ f = FACES.low; }
  else if(pct < 1){ f = FACES.mid; }
  else { f = FACES.done; }
  face.textContent = f;

  if(pct >= 1 && total > 0){
    fg.style.stroke = 'url(#ringGradientFallback)';
    fg.style.stroke = getCss('--mint');
  } else {
    fg.style.stroke = getCss('--primary');
  }
}
function getCss(varName){ return getComputedStyle(document.body).getPropertyValue(varName).trim(); }

function toggleTaken(id){
  const key = todayKey();
  const rec = getDayRecord(key);
  const wasTaken = rec.takenIds.includes(id);
  if(wasTaken){
    rec.takenIds = rec.takenIds.filter(x=>x!==id);
  } else {
    rec.takenIds.push(id);
  }
  updateHistoryCompletion(key);
  saveState();
  renderInicio();

  if(!wasTaken){
    const total = state.medications.length;
    if(total > 0 && rec.takenIds.length === total){
      setTimeout(()=> celebrate(), 250);
    } else {
      showToast('¡Toma registrada! 💜');
    }
  }
}

function updateHistoryCompletion(key){
  const rec = getDayRecord(key);
  const total = state.medications.length;
  rec.total = total;
  rec.completed = total > 0 && rec.takenIds.length === total;
}

/* ---------------- celebrate + confetti ---------------- */
function bindCelebrate(){
  document.getElementById('celebrateClose').addEventListener('click', ()=>{
    document.getElementById('celebrateOverlay').hidden = true;
  });
}
function celebrate(){
  const overlay = document.getElementById('celebrateOverlay');
  overlay.hidden = false;
  runConfetti();
}
function runConfetti(){
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const colors = ['#8C6FE0','#FF9EB5','#FFC98B','#63C99B','#A98CF0'];
  const pieces = Array.from({length: 90}, () => ({
    x: Math.random()*w, y: -20 - Math.random()*h*0.5,
    r: 4 + Math.random()*5, c: colors[Math.floor(Math.random()*colors.length)],
    vy: 2 + Math.random()*3, vx: -1.5 + Math.random()*3,
    rot: Math.random()*360, vr: -6 + Math.random()*12,
    shape: Math.random() > 0.5 ? 'circle' : 'rect'
  }));
  let frame = 0;
  const maxFrames = 150;
  function tick(){
    frame++;
    ctx.clearRect(0,0,w,h);
    pieces.forEach(p=>{
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI/180);
      ctx.fillStyle = p.c;
      if(p.shape === 'circle'){
        ctx.beginPath(); ctx.arc(0,0,p.r,0,Math.PI*2); ctx.fill();
      } else {
        ctx.fillRect(-p.r, -p.r*0.6, p.r*2, p.r*1.2);
      }
      ctx.restore();
    });
    if(frame < maxFrames){
      requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0,0,w,h);
    }
  }
  tick();
}

/* ---------------- toast ---------------- */
let toastTimer = null;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove('show'), 1800);
}

/* ---------------- GESTIONAR ---------------- */
function renderGestionar(){
  const list = document.getElementById('manageList');
  const empty = document.getElementById('emptyManage');
  list.innerHTML = '';
  const meds = [...state.medications].sort((a,b)=> a.time.localeCompare(b.time));
  if(meds.length === 0){ empty.hidden = false; return; }
  empty.hidden = true;
  meds.forEach(m=>{
    const card = document.createElement('div');
    card.className = 'manage-card';
    card.innerHTML = `
      <div class="dose-emoji">${m.emoji||'💊'}</div>
      <div class="dose-info">
        <div class="dose-name">${escapeHtml(m.name)}</div>
        <div class="dose-meta">
          <span class="dose-time">${m.time}</span>
          ${m.dose ? `<span>· ${escapeHtml(m.dose)}</span>` : ''}
          ${m.moment ? `<span>· ${escapeHtml(m.moment)}</span>` : ''}
          ${m.tipo === 'inyeccion' ? `<span class="tag-inyeccion">💉 Inyección</span>` : ''}
        </div>
      </div>
      <span style="color:var(--text-faint);font-size:18px;">›</span>
    `;
    card.addEventListener('click', ()=> openForm(m));
    list.appendChild(card);
  });
}

document.getElementById('openAddForm')?.addEventListener('click', ()=> openForm());

/* ---------------- FORM (add/edit) ---------------- */
function buildEmojiGrid(){
  const grid = document.getElementById('emojiGrid');
  grid.innerHTML = '';
  EMOJI_OPTIONS.forEach(e=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-opt' + (e === selectedEmoji ? ' selected' : '');
    btn.textContent = e;
    btn.addEventListener('click', ()=>{
      selectedEmoji = e;
      grid.querySelectorAll('.emoji-opt').forEach(b=> b.classList.toggle('selected', b.textContent === e));
    });
    grid.appendChild(btn);
  });
}

function openForm(med=null){
  editingMedId = med ? med.id : null;
  document.getElementById('formTitle').textContent = med ? 'Editar medicamento' : 'Nuevo medicamento';
  document.getElementById('medName').value = med ? med.name : '';
  document.getElementById('medTime').value = med ? med.time : '';
  document.getElementById('medDose').value = med ? (med.dose||'') : '';
  document.getElementById('medMoment').value = med ? (med.moment||'') : '';
  document.getElementById('medTipo').value = med ? (med.tipo || 'pastilla') : 'pastilla';
  selectedEmoji = med ? (med.emoji || EMOJI_OPTIONS[0]) : EMOJI_OPTIONS[0];
  buildEmojiGrid();
  document.getElementById('deleteMedBtn').hidden = !med;
  document.getElementById('formOverlay').hidden = false;
  document.getElementById('medName').focus();
}
function closeForm(){
  document.getElementById('formOverlay').hidden = true;
  editingMedId = null;
}

function bindForm(){
  document.getElementById('closeForm').addEventListener('click', closeForm);
  document.getElementById('formOverlay').addEventListener('click', (e)=>{
    if(e.target.id === 'formOverlay') closeForm();
  });
  document.getElementById('medForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = document.getElementById('medName').value.trim();
    const time = document.getElementById('medTime').value;
    const dose = document.getElementById('medDose').value.trim();
    const moment = document.getElementById('medMoment').value;
    const tipo = document.getElementById('medTipo').value || 'pastilla';
    if(!name || !time) return;

    if(editingMedId){
      const m = state.medications.find(x=>x.id === editingMedId);
      if(m){ m.name=name; m.time=time; m.dose=dose; m.moment=moment; m.emoji=selectedEmoji; m.tipo=tipo; }
      showToast('Medicamento actualizado ✏️');
    } else {
      state.medications.push({ id: 'm_'+Date.now()+'_'+Math.random().toString(36).slice(2,7), name, time, dose, moment, emoji: selectedEmoji, tipo });
      showToast('Medicamento añadido 💜');
    }
    saveState();
    closeForm();
    renderInicio(); renderGestionar();
  });
  document.getElementById('deleteMedBtn').addEventListener('click', ()=>{
    if(!editingMedId) return;
    state.medications = state.medications.filter(x=>x.id !== editingMedId);
    Object.values(state.history).forEach(rec=>{
      rec.takenIds = rec.takenIds.filter(id=>id!==editingMedId);
    });
    saveState();
    closeForm();
    showToast('Medicamento eliminado');
    renderInicio(); renderGestionar(); renderHistorial();
  });
}

/* ---------------- HISTORIAL ---------------- */
function renderHistorial(){
  renderStreak();
  renderCalendar();
}

function computeStreak(){
  let streak = 0;
  let cursor = new Date();
  // si hoy no está completo aún, empezamos a contar desde ayer
  const todayRec = state.history[todayKey(cursor)];
  if(!(todayRec && todayRec.completed)){
    cursor.setDate(cursor.getDate()-1);
  }
  while(true){
    const key = todayKey(cursor);
    const rec = state.history[key];
    if(rec && rec.completed){
      streak++;
      cursor.setDate(cursor.getDate()-1);
    } else break;
  }
  return streak;
}

function renderStreak(){
  const streak = computeStreak();
  document.getElementById('streakNumber').textContent = streak;
  const sub = document.getElementById('streakSub');
  if(state.medications.length === 0){
    sub.textContent = 'Añade medicamentos para empezar tu racha';
  } else if(streak === 0){
    sub.textContent = 'Completa hoy para empezar tu racha';
  } else {
    sub.textContent = '¡Sigue así, lo estás haciendo genial!';
  }
}

function renderCalendar(){
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';
  const title = document.getElementById('calendarTitle');
  title.textContent = calendarCursor.toLocaleDateString('es-ES', { month:'long', year:'numeric' });

  ['L','M','X','J','V','S','D'].forEach(d=>{
    const el = document.createElement('div');
    el.className = 'cal-dow'; el.textContent = d;
    grid.appendChild(el);
  });

  const year = calendarCursor.getFullYear(), month = calendarCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  let startOffset = firstDay.getDay() - 1; // lunes=0
  if(startOffset < 0) startOffset = 6;
  const daysInMonth = new Date(year, month+1, 0).getDate();

  for(let i=0;i<startOffset;i++){
    const el = document.createElement('div');
    el.className = 'cal-day empty-cell';
    grid.appendChild(el);
  }
  const todayStr = todayKey();
  for(let d=1; d<=daysInMonth; d++){
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const rec = state.history[key];
    const el = document.createElement('div');
    let cls = 'cal-day';
    if(key === todayStr) cls += ' today';
    if(rec && rec.total > 0){
      if(rec.completed) cls += ' full';
      else if(rec.takenIds.length > 0) cls += ' partial';
    }
    el.className = cls;
    el.textContent = d;
    grid.appendChild(el);
  }

  document.getElementById('prevMonth').onclick = ()=>{
    calendarCursor = new Date(year, month-1, 1); renderCalendar();
  };
  document.getElementById('nextMonth').onclick = ()=>{
    calendarCursor = new Date(year, month+1, 1); renderCalendar();
  };
}

/* ---------------- AJUSTES ---------------- */
function bindSettings(){
  const nameInput = document.getElementById('nameInput');
  nameInput.addEventListener('input', ()=>{
    state.settings.name = nameInput.value;
    saveState();
    renderInicio();
  });

  document.getElementById('notifToggle').addEventListener('change', (e)=>{
    state.settings.notifications = e.target.checked;
    saveState();
    if(e.target.checked && 'Notification' in window && Notification.permission === 'default'){
      Notification.requestPermission();
    }
  });

  document.getElementById('darkToggleSettings').addEventListener('change', (e)=>{
    state.settings.darkMode = e.target.checked;
    applyTheme(); saveState();
  });

  document.getElementById('resetBtn').addEventListener('click', ()=>{
    if(confirm('¿Seguro que quieres borrar todos tus medicamentos e historial? Esta acción no se puede deshacer.')){
      state = defaultState();
      saveState();
      applyTheme();
      document.getElementById('nameInput').value = '';
      document.getElementById('notifToggle').checked = true;
      document.getElementById('darkToggleSettings').checked = state.settings.darkMode;
      renderAll();
      showToast('Datos restablecidos');
      navigateTo('inicio');
    }
  });
}

/* ---------------- utils ---------------- */
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
