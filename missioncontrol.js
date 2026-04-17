const MODULES = [
  {id:'CashReady', file:'CashReady.html', storage:'cr_clients', cfg:'cr_cfg', accent:'#00c851', icon:'💵', skillLabels:{coins:'Coins', bills:'Bills', change:'Making Change', cashier:'Cashier Skills'}},
  {id:'HealthReady', file:'HealthReady.html', storage:'hlr_clients', cfg:'hlr_cfg', accent:'#e91e8c', icon:'🩺', skillLabels:{prescriptions:'Prescriptions', doctor:'Doctor Visits', insurance:'Insurance', emergency:'Emergencies', mental:'Mental Health'}},
  {id:'HomeReady', file:'HomeReady.html', storage:'hr_clients', cfg:'hr_cfg', accent:'#e8650a', icon:'🏠', skillLabels:{laundry:'Laundry', budget:'Budget', safety:'Safety', food:'Food Safety', independence:'Independence'}},
  {id:'JobReady', file:'JobReady.html', storage:'jr_clients', cfg:'jr_cfg', accent:'#d4900a', icon:'💼', skillLabels:{interview:'Interview', workplace:'Workplace', paycheck:'Paycheck', schedule:'Schedule', communication:'Communication'}},
  {id:'SocialReady', file:'SocialReady.html', storage:'sr_clients', cfg:'sr_cfg', accent:'#9b30d9', icon:'🗨️', skillLabels:{situations:'Reading the Room', conversations:'Conversations', boundaries:'Boundaries', feelings:'Conflict & Feelings'}},
  {id:'TechReady', file:'TechReady.html', storage:'tc_clients', cfg:'tc_cfg', accent:'#cc2200', icon:'💻', skillLabels:{scams:'Scams', passwords:'Passwords', online:'Online Safety', devices:'Devices'}},
  {id:'TimeReady', file:'TimeReady.html', storage:'tr_clients', cfg:'tr_cfg', accent:'#2288ff', icon:'⏰', skillLabels:{analog:'Analog Time', digital:'Digital Time', ampm:'AM / PM', schedule:'Schedule'}},
  {id:'TravelReady', file:'TravelReady.html', storage:'tr5_clients', cfg:'tr5_cfg', accent:'#0a9396', icon:'🚌', skillLabels:{transit:'Bus & Train', navigate:'Getting Around', money:'Money & Travel', safety:'Travel Safety', plan:'Planning'}},
];
const HUB_KEY = 'lr_mc_hub_v1';
const TODAY = new Date().toISOString().slice(0,10);
const RANKS = [
  {min:0,title:'Cadet'},
  {min:20,title:'Ensign'},
  {min:35,title:'Lieutenant'},
  {min:50,title:'Lt. Commander'},
  {min:65,title:'Commander'},
  {min:80,title:'Captain'},
  {min:92,title:'Admiral'}
];
const PROMPT_META = {
  independent:{rank:5,label:'Independent',score:100,color:'#00c851'},
  verbal:{rank:4,label:'Verbal Prompt',score:80,color:'#29a1ff'},
  gestural:{rank:3,label:'Gesture Prompt',score:60,color:'#ffb347'},
  physical:{rank:2,label:'Physical Prompt',score:40,color:'#ff8f3d'},
  hoh:{rank:1,label:'Hand-over-Hand',score:20,color:'#ff5470'}
};

let HUB = loadHubState();
let APP = {
  importedPins: [],
  learners: [],
  selectedKey: '',
  selectedModule: 'All Modules',
  search: '',
  rangeStart: '',
  rangeEnd: '',
  returnFile: '',
  returnModule: '',
  initialView: '',
  saveTick: null,
  currentView: 'overview'
};
const qs = new URLSearchParams(location.search);
APP.selectedModule = qs.get('module') || HUB.selectedModule || 'All Modules';
APP.returnFile = qs.get('return') || '';
APP.returnModule = qs.get('module') || '';
APP.initialView = qs.get('view') || '';
APP.currentView = APP.initialView || HUB.selectedView || 'overview';
APP.rangeStart = HUB.rangeStart || '';
APP.rangeEnd = HUB.rangeEnd || '';

function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function safeJSONParse(raw, fallback){
  try{
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  }catch{
    return fallback;
  }
}
function loadHubState(){
  const state = safeJSONParse(localStorage.getItem(HUB_KEY), {});
  state.pin = state.pin || '';
  state.pinHint = state.pinHint || '';
  state.introSeen = !!state.introSeen;
  state.autoLockMinutes = String(state.autoLockMinutes ?? '5');
  state.lastLearnerKey = state.lastLearnerKey || '';
  state.selectedModule = state.selectedModule || 'All Modules';
  state.rangeStart = state.rangeStart || '';
  state.rangeEnd = state.rangeEnd || '';
  state.selectedView = state.selectedView || 'overview';
  state.ignoreLegacyPins = !!state.ignoreLegacyPins;
  state.profiles = state.profiles || {};
  state.archivedKeys = state.archivedKeys || [];
  state.dismissedKeys = state.dismissedKeys || [];
  state.showArchived = !!state.showArchived;
  return state;
}
function saveHubState(message='Saved locally'){
  localStorage.setItem(HUB_KEY, JSON.stringify(HUB));
  const el = $('#save-indicator');
  if(el){
    el.textContent = `SYSTEM STABLE · ${message}`;
    el.classList.add('live');
    clearTimeout(APP.saveTick);
    APP.saveTick = setTimeout(()=>{
      el.textContent = 'SYSTEM STABLE · Saved locally';
      el.classList.remove('live');
    }, 1800);
  }
}
function readStorage(key, fallback){
  return safeJSONParse(localStorage.getItem(key), fallback);
}
function slugify(str){
  return String(str||'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'') || 'learner';
}
function profileKey(data){
  const full = slugify(data.fullName || '');
  const name = slugify(data.name || data.displayName || '');
  const initials = slugify(data.initials || '');
  if(full) return 'full-' + full;
  if(name && initials) return 'mix-' + name + '-' + initials;
  if(name) return 'name-' + name;
  if(initials) return 'initials-' + initials;
  return 'manual-' + Math.random().toString(36).slice(2,9);
}
function initialsFor(name){
  const source = String(name||'').trim();
  if(!source) return 'LR';
  return source.split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase() || '').join('').slice(0,2) || 'LR';
}
function colorFor(text){
  const palette = ['#29a1ff','#ff8f3d','#00c851','#9f4dff','#ff4fa7','#0a9396','#d4900a','#cc2200'];
  let sum = 0;
  for(const ch of String(text||'')) sum += ch.charCodeAt(0);
  return palette[sum % palette.length];
}
function parsePercent(raw){
  const s = String(raw||'').trim();
  if(!s) return null;
  const frac = s.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if(frac){
    const a = parseFloat(frac[1]), b = parseFloat(frac[2]);
    if(b > 0) return Math.max(0, Math.min(100, Math.round((a / b) * 100)));
  }
  const pct = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if(pct) return Math.max(0, Math.min(100, Math.round(parseFloat(pct[1]))));
  const num = s.match(/^\d+(?:\.\d+)?$/);
  if(num){
    const val = parseFloat(num[0]);
    return val <= 10 ? Math.round(val * 10) : Math.round(Math.min(100, val));
  }
  return null;
}
function normalizePrompt(prompt){
  const key = String(prompt||'').toLowerCase().trim();
  if(PROMPT_META[key]) return key;
  if(key.includes('verbal')) return 'verbal';
  if(key.includes('gesture')) return 'gestural';
  if(key.includes('physical')) return 'physical';
  if(key.includes('hand')) return 'hoh';
  if(key.includes('independ')) return 'independent';
  return 'independent';
}
function promptScore(prompt){
  return (PROMPT_META[normalizePrompt(prompt)] || PROMPT_META.independent).score;
}
function promptLabel(prompt){
  return (PROMPT_META[normalizePrompt(prompt)] || PROMPT_META.independent).label;
}
function combineDateTime(date, time=''){
  const d = String(date || '').trim();
  if(!d) return 0;
  const t = String(time || '').trim();
  const iso = t ? `${d}T${normalizeTime(t)}` : `${d}T12:00:00`;
  const ts = new Date(iso).getTime();
  return Number.isNaN(ts) ? new Date(d).getTime() || 0 : ts;
}
function normalizeTime(t){
  const str = String(t||'').trim();
  if(!str) return '12:00:00';
  const twelve = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if(twelve){
    let h = parseInt(twelve[1],10);
    const m = twelve[2];
    const part = twelve[3].toUpperCase();
    if(part === 'PM' && h < 12) h += 12;
    if(part === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2,'0')}:${m}:00`;
  }
  const simple = str.match(/(\d{1,2}):(\d{2})/);
  if(simple) return `${String(simple[1]).padStart(2,'0')}:${simple[2]}:00`;
  return '12:00:00';
}
function unique(arr){
  return [...new Set(arr.filter(Boolean))];
}
function legacyPins(){
  const pins = [];
  for(const mod of MODULES){
    const cfg = readStorage(mod.cfg, {});
    if(cfg && cfg.coachPin) pins.push(String(cfg.coachPin));
  }
  return unique(pins);
}
function buildLearners(){
  const merged = new Map();
  APP.importedPins = legacyPins();
  const dismissed = new Set(HUB.dismissedKeys || []);
  const archivedKeys = new Set(HUB.archivedKeys || []);

  for(const mod of MODULES){
    const clients = readStorage(mod.storage, []);
    for(const client of clients){
      const key = profileKey({
        fullName: client.fullName,
        name: client.name,
        displayName: client.name,
        initials: client.initials
      });
      if(dismissed.has(key)) continue;
      if(!merged.has(key)){
        merged.set(key,{
          key,
          displayName: client.name || client.fullName || client.initials || 'Learner',
          fullName: client.fullName || '',
          initials: client.initials || initialsFor(client.name || client.fullName || ''),
          programList: [],
          level: client.level || 'developing',
          notesList: [],
          color: client.color || colorFor(key),
          modules: {},
          importedGoals: [],
          importedSessions: [],
          objectives: [],
          manualSessions: [],
          archived: false,
          coachNotes: '',
          createdAt: TODAY,
          sourceCount: 0
        });
      }
      const item = merged.get(key);
      item.displayName = item.displayName || client.name || client.fullName || client.initials || 'Learner';
      item.fullName = item.fullName || client.fullName || '';
      item.initials = item.initials || client.initials || initialsFor(item.displayName);
      item.programList.push(client.program || '');
      item.level = item.level || client.level || 'developing';
      item.notesList.push(client.notes || '');
      item.color = item.color || client.color || colorFor(key);
      item.archived = item.archived || !!client.archived || archivedKeys.has(key);
      item.sourceCount += 1;

      const moduleData = {
        id: mod.id,
        accent: mod.accent,
        icon: mod.icon,
        skills: client.skills || {},
        goals: (client.goals || []).map((goal, idx)=>({
          ...goal,
          id: `${mod.id}-import-${idx}-${(goal.skill || 'goal').replace(/[^a-z0-9]/gi,'')}`,
          imported: true,
          module: mod.id
        })),
        sessions: (client.sessions || []).map((session, idx)=>normalizeSession(session, mod.id, `import-${mod.id}-${idx}`))
      };
      item.modules[mod.id] = moduleData;
      item.importedGoals.push(...moduleData.goals);
      item.importedSessions.push(...moduleData.sessions);
    }
  }

  for(const [key, profile] of Object.entries(HUB.profiles)){
    if(dismissed.has(key)) continue;
    if(!merged.has(key)){
      merged.set(key,{
        key,
        displayName: profile.displayName || profile.fullName || profile.initials || 'Learner',
        fullName: profile.fullName || '',
        initials: profile.initials || initialsFor(profile.displayName || profile.fullName || ''),
        programList: [profile.program || ''],
        level: profile.level || 'developing',
        notesList: [profile.notes || ''],
        color: profile.color || colorFor(key),
        modules: {},
        importedGoals: [],
        importedSessions: [],
        objectives: [],
        manualSessions: [],
        archived: !!profile.archived,
        coachNotes: profile.notes || '',
        createdAt: profile.createdAt || TODAY,
        sourceCount: 0
      });
    }
    const item = merged.get(key);
    item.displayName = profile.displayName || item.displayName;
    item.fullName = profile.fullName || item.fullName;
    item.initials = profile.initials || item.initials;
    if(profile.program) item.programList.push(profile.program);
    item.level = profile.level || item.level;
    item.notesList.push(profile.notes || '');
    item.color = profile.color || item.color;
    item.archived = !!profile.archived || archivedKeys.has(key);
    item.createdAt = profile.createdAt || item.createdAt;
    item.objectives = profile.objectives || [];
    item.manualSessions = (profile.manualSessions || []).map((session, idx)=>normalizeSession(session, session.module || 'Manual', `manual-${key}-${idx}`, true));
    item.coachNotes = profile.notes || item.coachNotes || '';
  }

  const learners = Array.from(merged.values()).map(item=>{
    item.programList = unique(item.programList);
    item.program = item.programList.join(' • ');
    item.notes = unique(item.notesList).join(' • ');
    item.sessions = [...item.importedSessions, ...item.manualSessions].sort((a,b)=>combineDateTime(a.date,a.time) - combineDateTime(b.date,b.time));
    item.objectives = item.objectives || [];
    item.importedGoals = item.importedGoals || [];
    item.metrics = deriveMetrics(item);
    return item;
  }).sort((a,b)=>{
    const aTs = a.metrics.lastSessionTs || 0;
    const bTs = b.metrics.lastSessionTs || 0;
    if(bTs !== aTs) return bTs - aTs;
    return a.displayName.localeCompare(b.displayName);
  });

  return learners;
}
function normalizeSession(session, fallbackModule, id, manual=false){
  const loggedLabel = session.activity || session.mode || session.module || fallbackModule || 'Session';
  const moduleName = manual ? (session.module || fallbackModule || 'Module') : (fallbackModule || session.module || 'Module');
  return {
    id: session.id || id || Math.random().toString(36).slice(2),
    imported: !manual,
    manual: !!manual,
    module: moduleName,
    activity: loggedLabel,
    score: session.score || '',
    accuracy: parsePercent(session.score),
    prompt: normalizePrompt(session.prompt),
    notes: session.notes || session.note || '',
    date: session.date || TODAY,
    time: session.time || '',
    staff: session.staff || '',
    setting: session.setting || 'In App',
    skill: session.skill || '',
    source: manual ? 'manual' : 'imported'
  };
}
function filteredSessions(learner){
  let sessions = learner?.sessions || [];
  if(APP.selectedModule && APP.selectedModule !== 'All Modules'){
    sessions = sessions.filter(s=>s.module === APP.selectedModule);
  }
  if(APP.rangeStart) sessions = sessions.filter(s=>(s.date || '') >= APP.rangeStart);
  if(APP.rangeEnd) sessions = sessions.filter(s=>(s.date || '') <= APP.rangeEnd);
  return sessions;
}
function deriveMetrics(learner){
  const sessions = learner.sessions || [];
  const accValues = sessions.map(s=>s.accuracy).filter(v=>typeof v === 'number');
  const acc = accValues.length ? Math.round(accValues.reduce((a,b)=>a+b,0)/accValues.length) : 0;
  const ind = sessions.length ? Math.round(sessions.reduce((a,s)=>a+promptScore(s.prompt),0)/sessions.length) : 0;
  const modulesTouched = unique(sessions.map(s=>s.module)).length;
  const engagement = Math.min(100, Math.round((modulesTouched / MODULES.length) * 100 + Math.min(40, sessions.length * 3)));
  const objectiveStats = evaluateObjectives(learner, false);
  const goalScore = objectiveStats.total ? Math.round((objectiveStats.met / objectiveStats.total) * 100) : (sessions.length ? 55 : 0);
  const readiness = sessions.length ? Math.round(acc * .45 + ind * .25 + engagement * .15 + goalScore * .15) : 0;
  const rank = calcRank(readiness);
  const last = sessions[sessions.length - 1] || null;
  const lastSessionTs = last ? combineDateTime(last.date, last.time) : 0;
  return {acc, ind, modulesTouched, engagement, goalScore, readiness, rank, last, lastSessionTs};
}
function calcRank(score){
  let current = RANKS[0];
  for(const rank of RANKS){
    if(score >= rank.min) current = rank;
  }
  return current;
}
function moduleStats(learner){
  const stats = MODULES.map(mod=>{
    const sessions = filteredSessions(learner).filter(s=>s.module === mod.id);
    const accValues = sessions.map(s=>s.accuracy).filter(v=>typeof v === 'number');
    const avg = accValues.length ? Math.round(accValues.reduce((a,b)=>a+b,0)/accValues.length) : 0;
    const ind = sessions.length ? Math.round(sessions.reduce((a,s)=>a+promptScore(s.prompt),0)/sessions.length) : 0;
    const last = sessions[sessions.length - 1] || null;
    const goals = [
      ...learner.importedGoals.filter(g=>g.module === mod.id),
      ...learner.objectives.filter(g=>(g.module || 'All Modules') === mod.id)
    ];
    const goalEval = goals.length ? goals.filter(g=>goalMet(learner,g)).length : 0;
    const skillMap = learner.modules[mod.id]?.skills || {};
    const topSkillEntry = Object.entries(skillMap).sort((a,b)=>(b[1]||0)-(a[1]||0))[0] || null;
    const status = deriveModuleStatus(sessions, avg, ind);
    const score = sessions.length ? Math.round(avg * .6 + ind * .4) : 0;
    return {
      ...mod,
      sessions,
      avg,
      ind,
      last,
      goals,
      goalEval,
      topSkillEntry,
      status,
      score
    };
  });
  return stats;
}
function deriveModuleStatus(sessions, avg, ind){
  if(!sessions.length) return 'Not Started';
  if(sessions.length >= 4){
    const latest = sessions.slice(-3).map(s=>s.accuracy).filter(v=>typeof v==='number');
    const earlier = sessions.slice(-6,-3).map(s=>s.accuracy).filter(v=>typeof v==='number');
    if(latest.length && earlier.length){
      const latestAvg = latest.reduce((a,b)=>a+b,0)/latest.length;
      const earlierAvg = earlier.reduce((a,b)=>a+b,0)/earlier.length;
      if(latestAvg < earlierAvg - 10) return 'Needs Review';
    }
  }
  if(avg >= 85 && ind >= 80 && sessions.length >= 5) return 'Mastered';
  if(avg >= 78 && ind >= 70) return 'Near Mastery';
  if(avg >= 70) return 'Building Independence';
  if(avg >= 55) return 'In Progress';
  return 'Training';
}
function strongestAndWeakest(modStats){
  const active = modStats.filter(m=>m.sessions.length);
  if(!active.length) return {strongest:'No tracked module yet', weakest:'No tracked module yet'};
  const byScore = [...active].sort((a,b)=>b.score-a.score);
  return {strongest: byScore[0].id, weakest: byScore[byScore.length-1].id};
}
function nextBestAction(learner){
  const modStats = moduleStats(learner);
  const activeObjective = learner.objectives.find(obj=>!goalMet(learner,obj));
  if(activeObjective){
    return `Focus on ${activeObjective.module === 'All Modules' ? 'the current objective' : activeObjective.module} next. The active target is "${activeObjective.title || objectiveTemplateLabel(activeObjective)}".`;
  }
  const untouched = modStats.find(m=>!m.sessions.length);
  if(untouched) return `No ${untouched.id} sessions are logged yet. Run one clean round there next so the dashboard stops guessing.`;
  const needsReview = modStats.find(m=>m.status === 'Needs Review');
  if(needsReview) return `${needsReview.id} is trending down. Slow it down, reduce pressure, and log one follow-up session with support notes.`;
  const weakest = strongestAndWeakest(modStats).weakest;
  return `Practice ${weakest} next. That module has the most room to grow and will sharpen the overall readiness picture.`;
}
function missionBrief(learner){
  const ms = moduleStats(learner);
  const sw = strongestAndWeakest(ms);
  const sessions = filteredSessions(learner);
  if(!sessions.length){
    return `${learner.displayName} does not have tracked sessions yet. Start with one module, log the support level, and Mission Control will build the report around real evidence instead of vibes.`;
  }
  const last = sessions[sessions.length - 1];
  const prompt = promptLabel(last.prompt);
  return `${learner.displayName} is currently ranked ${learner.metrics.rank.title} with a readiness score of ${learner.metrics.readiness}. Strongest area: ${sw.strongest}. Biggest support need: ${sw.weakest}. Most recent session: ${last.module} on ${formatDate(last.date)} with ${prompt}.`;
}
function improvementSummary(learner){
  const sessions = filteredSessions(learner);
  if(sessions.length < 2) return 'Not enough session history yet to calculate a trend.';
  const recent = sessions.slice(-4).map(s=>s.accuracy).filter(v=>typeof v==='number');
  const earlier = sessions.slice(-8,-4).map(s=>s.accuracy).filter(v=>typeof v==='number');
  if(!recent.length) return 'Scores are being logged, but not in a format Mission Control can turn into percentages yet.';
  const recentAvg = recent.reduce((a,b)=>a+b,0)/recent.length;
  if(!earlier.length) return `Recent average accuracy is ${Math.round(recentAvg)}%. Keep logging and the trend line will get sharper.`;
  const earlierAvg = earlier.reduce((a,b)=>a+b,0)/earlier.length;
  const diff = Math.round(recentAvg - earlierAvg);
  if(diff >= 8) return `Recent accuracy is up ${diff} points compared with earlier sessions. Good momentum.`;
  if(diff <= -8) return `Recent accuracy is down ${Math.abs(diff)} points compared with earlier sessions. Time for a calmer check-in and maybe easier supports.`;
  return `Recent accuracy is holding steady around ${Math.round(recentAvg)}%.`;
}
function objectiveTemplateLabel(obj){
  switch(obj.template){
    case 'accuracy': return `Reach ${obj.threshold || 80}% across ${obj.window || 3} sessions`;
    case 'independence': return `${promptLabel(obj.maxPrompt || 'verbal')} or less in ${obj.threshold || 4} of ${obj.window || 5} sessions`;
    case 'frequency': return `${obj.threshold || 5} sessions in ${obj.window || 30} days`;
    default: return obj.title || 'Custom objective';
  }
}
function objectiveSessions(learner, obj){
  let sessions = learner.sessions || [];
  if(obj.module && obj.module !== 'All Modules') sessions = sessions.filter(s=>s.module === obj.module);
  if(APP.rangeStart) sessions = sessions.filter(s=>(s.date||'') >= APP.rangeStart);
  if(APP.rangeEnd) sessions = sessions.filter(s=>(s.date||'') <= APP.rangeEnd);
  return sessions;
}
function goalMet(learner, obj){
  if(obj.imported){
    const sessions = (learner.sessions || []).filter(s=>s.module === obj.module);
    if(!sessions.length) return false;
    const needed = Number(obj.consec || 3);
    const threshold = Math.round(((Number(obj.num) || 4) / Math.max(1, Number(obj.den) || 5)) * 100);
    const qualifying = [...sessions].reverse();
    let streak = 0;
    for(const session of qualifying){
      const pct = typeof session.accuracy === 'number' ? session.accuracy : parsePercent(session.score);
      if(typeof pct === 'number' && pct >= threshold) streak += 1;
      else break;
    }
    return streak >= needed;
  }
  const sessions = objectiveSessions(learner, obj);
  if(!sessions.length) return false;
  switch(obj.template){
    case 'accuracy': {
      const seq = [...sessions].reverse();
      let streak = 0;
      for(const s of seq){
        if(typeof s.accuracy === 'number' && s.accuracy >= Number(obj.threshold || 80)) streak += 1;
        else break;
      }
      return streak >= Number(obj.window || 3);
    }
    case 'independence': {
      const max = Number(obj.window || 5);
      const need = Number(obj.threshold || 4);
      const targetRank = (PROMPT_META[normalizePrompt(obj.maxPrompt || 'verbal')] || PROMPT_META.verbal).rank;
      const recent = sessions.slice(-max);
      const good = recent.filter(s=>(PROMPT_META[normalizePrompt(s.prompt)] || PROMPT_META.independent).rank >= targetRank).length;
      return good >= need;
    }
    case 'frequency': {
      const days = Number(obj.window || 30);
      const need = Number(obj.threshold || 5);
      const edge = Date.now() - days * 24 * 60 * 60 * 1000;
      const count = sessions.filter(s=>combineDateTime(s.date,s.time) >= edge).length;
      return count >= need;
    }
    default:
      return !!obj.met;
  }
}
function goalProgress(learner, obj){
  if(obj.imported){
    const sessions = (learner.sessions || []).filter(s=>s.module === obj.module);
    const needed = Number(obj.consec || 3);
    const threshold = Math.round(((Number(obj.num) || 4) / Math.max(1, Number(obj.den) || 5)) * 100);
    const seq = [...sessions].reverse();
    let streak = 0;
    for(const s of seq){
      const pct = typeof s.accuracy === 'number' ? s.accuracy : parsePercent(s.score);
      if(typeof pct === 'number' && pct >= threshold) streak += 1;
      else break;
    }
    return Math.min(1, streak / Math.max(1, needed));
  }
  const sessions = objectiveSessions(learner, obj);
  if(!sessions.length) return 0;
  switch(obj.template){
    case 'accuracy': {
      const seq = [...sessions].reverse();
      let streak = 0;
      for(const s of seq){
        if(typeof s.accuracy === 'number' && s.accuracy >= Number(obj.threshold || 80)) streak += 1;
        else break;
      }
      return Math.min(1, streak / Math.max(1, Number(obj.window || 3)));
    }
    case 'independence': {
      const max = Number(obj.window || 5);
      const need = Number(obj.threshold || 4);
      const targetRank = (PROMPT_META[normalizePrompt(obj.maxPrompt || 'verbal')] || PROMPT_META.verbal).rank;
      const recent = sessions.slice(-max);
      const good = recent.filter(s=>(PROMPT_META[normalizePrompt(s.prompt)] || PROMPT_META.independent).rank >= targetRank).length;
      return Math.min(1, good / Math.max(1, need));
    }
    case 'frequency': {
      const days = Number(obj.window || 30);
      const need = Number(obj.threshold || 5);
      const edge = Date.now() - days * 24 * 60 * 60 * 1000;
      const count = sessions.filter(s=>combineDateTime(s.date,s.time) >= edge).length;
      return Math.min(1, count / Math.max(1, need));
    }
    default:
      return obj.met ? 1 : 0;
  }
}
function evaluateObjectives(learner, filtered=true){
  const pool = [
    ...learner.objectives,
    ...learner.importedGoals
  ];
  const items = filtered ? pool.filter(obj=>!APP.selectedModule || APP.selectedModule === 'All Modules' || (obj.module || 'All Modules') === APP.selectedModule) : pool;
  const met = items.filter(obj=>goalMet(learner,obj)).length;
  return {items, met, total: items.length};
}
function milestones(learner){
  const list = [];
  const sessions = filteredSessions(learner);
  const total = sessions.length;
  if(total) list.push({title:'First Logged Session', copy:`${learner.displayName} has started generating trackable data in Mission Control.`});
  if(total >= 5) list.push({title:'Five Sessions Logged', copy:`Enough data is in place to show a more stable progress story.`});
  if(total >= 10) list.push({title:'Ten Sessions Logged', copy:`The learning record now has enough volume to support cleaner reporting.`});
  if(sessions.some(s=>normalizePrompt(s.prompt)==='independent')) list.push({title:'First Independent Session', copy:`One or more tasks were completed independently.`});
  for(const mod of moduleStats(learner)){
    if(mod.status === 'Mastered') list.push({title:`${mod.id} Mastered`, copy:`Average performance and support trend both point to strong readiness.`});
  }
  for(const obj of learner.objectives){
    if(goalMet(learner,obj)) list.push({title:'Objective Reached', copy:obj.title || objectiveTemplateLabel(obj)});
  }
  return list.slice(0,8);
}
function formatDate(date){
  if(!date) return 'No date';
  const d = new Date(date + 'T12:00:00');
  if(Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString([], {month:'short', day:'numeric', year:'numeric'});
}
function reportText(learner){
  const sessions = filteredSessions(learner);
  const ms = moduleStats(learner);
  const sw = strongestAndWeakest(ms);
  const objectiveData = evaluateObjectives(learner);
  const last = sessions[sessions.length - 1];
  const locationCounts = Object.entries(sessions.reduce((acc,s)=>{acc[s.setting||'In App']=(acc[s.setting||'In App']||0)+1; return acc;}, {}))
    .sort((a,b)=>b[1]-a[1]).slice(0,3).map(([setting,count])=>`${setting} (${count})`).join(', ') || 'No session settings logged yet';
  const metCount = objectiveData.items.filter(obj=>goalMet(learner,obj)).length;
  const activeCount = objectiveData.items.length - metCount;
  const rank = learner.metrics.rank.title;
  const trend = improvementSummary(learner);

  return [
    `${learner.displayName}${learner.fullName ? ` (${learner.fullName})` : ''}`,
    `Rank: ${rank}`,
    `Readiness Score: ${learner.metrics.readiness}`,
    `Program: ${learner.program || 'Not listed'}`,
    '',
    `Mission Brief`,
    `${learner.displayName} is currently ranked ${rank}. ${trend}`,
    `Strongest module: ${sw.strongest}. Module needing the most support: ${sw.weakest}.`,
    last ? `Most recent session: ${last.module} on ${formatDate(last.date)} with ${promptLabel(last.prompt)}.` : 'No sessions have been logged yet.',
    '',
    `Progress Summary`,
    `Total sessions in view: ${sessions.length}`,
    `Average accuracy: ${learner.metrics.acc || 0}%`,
    `Average independence score: ${learner.metrics.ind || 0}%`,
    `Modules touched: ${learner.metrics.modulesTouched} of ${MODULES.length}`,
    `Most common settings: ${locationCounts}`,
    '',
    `Objectives`,
    `Objectives met: ${metCount}`,
    `Objectives still active: ${activeCount}`,
    objectiveData.items.length ? objectiveData.items.map(obj=>`- ${obj.title || objectiveTemplateLabel(obj)}${goalMet(learner,obj) ? ' [met]' : ''}`).join('\n') : '- No objectives tracked yet',
    '',
    `Recommended Next Step`,
    nextBestAction(learner)
  ].join('\n');
}
function csvText(learner){
  const rows = [['Learner','Module','Activity','Score','Accuracy','Prompt','Setting','Date','Time','Staff','Notes','Source']];
  for(const s of filteredSessions(learner)){
    rows.push([
      learner.displayName,
      s.module,
      s.activity,
      s.score,
      s.accuracy ?? '',
      promptLabel(s.prompt),
      s.setting || '',
      s.date || '',
      s.time || '',
      s.staff || '',
      (s.notes || '').replace(/\n/g,' '),
      s.source
    ]);
  }
  return rows.map(row=>row.map(cell=>`"${String(cell ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
}
function downloadFile(name, text, type='text/plain'){
  const blob = new Blob([text], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}

function showView(id, persist=true){
  const allowed = new Set(['overview','objectives','sessions','reports','security']);
  const next = allowed.has(id) ? id : 'overview';
  APP.currentView = next;
  $all('.mission-main .mc-page').forEach(section=>section.classList.toggle('active', section.id === next));
  $all('.tabbtn').forEach(btn=>btn.classList.toggle('active', btn.dataset.jump === next));
  if(persist){
    HUB.selectedView = next;
    saveHubState(`View changed to ${next}`);
  }
  requestAnimationFrame(()=>{
    document.getElementById(next)?.scrollIntoView({behavior:'smooth', block:'start'});
  });
}
function scrollToSection(id){
  showView(id);
}
function activateJumpTab(id){
  $all('.tabbtn').forEach(btn=>btn.classList.toggle('active', btn.dataset.jump === id));
}
function applyInitialView(){
  const allowed = new Set(['overview','objectives','sessions','reports','security']);
  const next = allowed.has(APP.initialView) ? APP.initialView : (APP.currentView || 'overview');
  APP.initialView = '';
  showView(next, false);
}
function showOverlay(id){
  $(id).classList.add('show');
}
function hideOverlay(id){
  $(id).classList.remove('show');
}

function selectedLearner(){
  return APP.learners.find(l=>l.key === APP.selectedKey) || null;
}
function ensureSelection(){
  const visible = visibleLearners();
  if(visible.some(l=>l.key === APP.selectedKey)) return;
  if(visible.length){
    APP.selectedKey = visible[0].key;
    HUB.lastLearnerKey = APP.selectedKey;
  }else{
    APP.selectedKey = '';
    HUB.lastLearnerKey = '';
  }
}
function visibleLearners(){
  const q = String(APP.search || '').trim().toLowerCase();
  const showArchived = !!HUB.showArchived;
  return APP.learners.filter(learner=>{
    if(showArchived ? !learner.archived : learner.archived) return false;
    if(!q) return true;
    const hay = [
      learner.displayName, learner.fullName, learner.initials, learner.program, learner.notes, learner.metrics.rank.title,
      ...filteredSessions(learner).map(s=>`${s.module} ${s.notes} ${s.setting} ${s.staff}`)
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
}
let lockTimer = null;
function scheduleLock(){
  clearTimeout(lockTimer);
  const mins = Number(HUB.autoLockMinutes || 0);
  if(!HUB.pin || !mins) return;
  lockTimer = setTimeout(()=>lockMissionControl(), mins * 60 * 1000);
}
function lockMissionControl(){
  $('#app-view').classList.add('hidden');
  $('#lock-view').classList.remove('hidden');
  $('#pin-input').value = '';
  $('#pin-error').textContent = '';
}
function unlockMissionControl(){
  $('#lock-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  scheduleLock();
  renderAll();
  applyInitialView();
  if(!HUB.introSeen) showOverlay('#intro-overlay');
}

function maybeMigrateLegacyPin(){
  const note = $('#legacy-pin-note');
  if(note) note.classList.add('hidden');
  $('#pin-remove-legacy-btn')?.classList.add('hidden');
}

function handleLockSubmit(){
  const input = $('#pin-input').value;
  if(HUB.pin){
    if(input === HUB.pin){
      unlockMissionControl();
      return;
    }
    $('#pin-error').textContent = HUB.pinHint ? `Incorrect code. Hint: ${HUB.pinHint}` : 'Incorrect code. Try again.';
    return;
  }
  if(input.length < 4){
    $('#pin-error').textContent = 'Create an access code with at least 4 characters.';
    return;
  }
  HUB.pin = input;
  saveHubState('Access code created');
  unlockMissionControl();
}
function syncSelectOptions(){
  const opts = APP.learners.map(l=>`<option value="${escapeHtml(l.key)}">${escapeHtml(l.displayName)}</option>`).join('');
  $('#session-learner').innerHTML = opts;
  $('#objective-learner').innerHTML = opts;
}
function syncModuleOptions(){
  const moduleOptions = ['All Modules', ...MODULES.map(m=>m.id)].map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  $('#module-filter').innerHTML = moduleOptions;
  $('#objective-module').innerHTML = moduleOptions;
  $('#session-module').innerHTML = MODULES.map(m=>`<option value="${escapeHtml(m.id)}">${escapeHtml(m.id)}</option>`).join('');
  $('#module-filter').value = APP.selectedModule || 'All Modules';
}
function escapeHtml(text){
  return String(text ?? '').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function renderHero(){
  const learner = selectedLearner();
  const grid = $('#hero-grid');
  if(!learner){
    grid.innerHTML = `
      <div class="hero-stat"><div class="label">Learner</div><div class="value">No selection</div><div class="sub">Pick a learner from the roster.</div></div>
      <div class="hero-stat"><div class="label">Readiness</div><div class="value">--</div><div class="sub">Progress score appears here.</div></div>
      <div class="hero-stat"><div class="label">Current rank</div><div class="value rank">Cadet</div><div class="sub">Ranks unlock as evidence builds.</div></div>
      <div class="hero-stat"><div class="label">System status</div><div class="value">Idle</div><div class="sub">Waiting for learner data.</div></div>
    `;
    return;
  }
  const sessions = filteredSessions(learner);
  const objectiveData = evaluateObjectives(learner);
  const last = sessions[sessions.length-1];
  grid.innerHTML = `
    <div class="hero-stat">
      <div class="label">Current learner</div>
      <div class="value">${escapeHtml(learner.displayName)}</div>
      <div class="sub">${escapeHtml(learner.program || learner.level || 'Profile ready')}</div>
    </div>
    <div class="hero-stat">
      <div class="label">Readiness score</div>
      <div class="value">${learner.metrics.readiness}</div>
      <div class="sub">${learner.metrics.acc}% accuracy · ${learner.metrics.ind}% independence</div>
    </div>
    <div class="hero-stat">
      <div class="label">Current rank</div>
      <div class="value rank">${learner.metrics.rank.title}</div>
      <div class="sub">${promotionText(learner)}</div>
    </div>
    <div class="hero-stat">
      <div class="label">System status</div>
      <div class="value ${sessions.length ? '' : 'alert'}">${sessions.length ? 'Tracking Live' : 'Needs First Log'}</div>
      <div class="sub">${last ? `${last.module} · ${formatDate(last.date)}` : 'Log one session to start'}</div>
    </div>
  `;
}
function promotionText(learner){
  const score = learner.metrics.readiness;
  if(score >= 92) return 'Flagship-level progress across the suite';
  if(score >= 80) return 'Promotion unlocked through strong consistency';
  if(score >= 65) return 'Reliable growth with room to sharpen';
  if(score >= 35) return 'Progress is building real momentum';
  return 'Every logged session helps earn the next rank';
}
function renderRoster(){
  const learners = visibleLearners();
  const showingArchived = !!HUB.showArchived;
  $('#roster-count').textContent = `${learners.length} ${showingArchived ? 'Archived' : 'Learner'}${learners.length===1?'':'s'}`;
  const toggleBtn = $('#show-archived-btn');
  if(toggleBtn) toggleBtn.textContent = showingArchived ? 'Main Roster' : 'Archive Bay';
  const html = learners.length ? learners.map(learner=>{
    const active = learner.key === APP.selectedKey;
    const last = filteredSessions(learner).slice(-1)[0];
    const objectiveStats = evaluateObjectives(learner);
    const archiveLabel = learner.archived ? 'Restore to Roster' : 'Archive Learner';
    return `
      <article class="learner-card ${active?'active':''}" data-key="${escapeHtml(learner.key)}">
        <div class="learner-card-head">
          <button class="learner-select" data-key="${escapeHtml(learner.key)}">
            <div class="avatar" style="background:${escapeHtml(learner.color || colorFor(learner.key))}">${escapeHtml(learner.initials || initialsFor(learner.displayName))}</div>
            <div class="learner-main">
              <div class="learner-name">${escapeHtml(learner.displayName)}</div>
              <div class="learner-meta">${escapeHtml(learner.program || learner.level || 'No program listed')}</div>
              <div class="learner-rank">
                <span class="token"><strong>${escapeHtml(learner.metrics.rank.title)}</strong></span>
                <span class="token">${learner.metrics.readiness} readiness</span>
                <span class="token">${last ? escapeHtml(last.module) : 'No sessions'}</span>
              </div>
            </div>
          </button>
          <div class="learner-quick">
            <button class="mini-btn" data-roster-view="overview" data-key="${escapeHtml(learner.key)}">Deck</button>
            <button class="mini-btn" data-roster-view="sessions" data-key="${escapeHtml(learner.key)}">Log</button>
            <button class="mini-btn" data-roster-view="reports" data-key="${escapeHtml(learner.key)}">Report</button>
          </div>
        </div>
        <details class="learner-drop">
          <summary>Open Profile Panel</summary>
          <div class="learner-detail-grid">
            <div class="tiny-stat"><span>Full name</span><strong>${escapeHtml(learner.fullName || 'Not stored')}</strong></div>
            <div class="tiny-stat"><span>Support</span><strong>${escapeHtml(learner.level || 'Developing')}</strong></div>
            <div class="tiny-stat"><span>Sessions</span><strong>${filteredSessions(learner).length}</strong></div>
            <div class="tiny-stat"><span>Objectives</span><strong>${objectiveStats.met}/${objectiveStats.total || 0}</strong></div>
            ${learner.coachNotes || learner.notes ? `<div class="tiny-stat notes"><span>Coach notes</span><strong>${escapeHtml((learner.coachNotes || learner.notes)).slice(0,180)}</strong></div>` : ''}
          </div>
          <div class="learner-card-actions">
            <button class="mini-btn" data-action="archive" data-key="${escapeHtml(learner.key)}">${archiveLabel}</button>
            <button class="mini-btn danger" data-action="court" data-key="${escapeHtml(learner.key)}">Court-Martial</button>
          </div>
        </details>
      </article>`;
  }).join('') : `<div class="empty">${showingArchived ? 'No archived learners right now.' : 'No learners match this view yet. Add one manually or refresh if module data was added in another screen.'}</div>`;
  $('#learner-list').innerHTML = html;
  $all('.learner-select').forEach(btn=>btn.addEventListener('click', ()=>{
    APP.selectedKey = btn.dataset.key;
    HUB.lastLearnerKey = APP.selectedKey;
    saveHubState('Learner selected');
    renderAll();
  }));
  $all('[data-roster-view]').forEach(btn=>btn.addEventListener('click', ()=>{
    APP.selectedKey = btn.dataset.key;
    HUB.lastLearnerKey = APP.selectedKey;
    showView(btn.dataset.rosterView);
    renderAll();
  }));
  $all('[data-action="archive"]').forEach(btn=>btn.addEventListener('click', ()=>toggleArchive(btn.dataset.key)));
  $all('[data-action="court"]').forEach(btn=>btn.addEventListener('click', ()=>courtMartialLearner(btn.dataset.key)));
}
function renderOverview(){
  const learner = selectedLearner();
  const body = $('#overview-body');
  if(!learner){
    body.className = 'empty';
    body.innerHTML = 'No learner selected yet. Pick someone from the roster or add a learner manually if you are starting fresh.';
    $('#overview-sub').textContent = 'Choose a learner to load the command deck.';
    return;
  }
  const modules = moduleStats(learner);
  const brief = missionBrief(learner);
  const sessions = filteredSessions(learner);
  const recent = sessions.slice(-5).reverse();
  const last = sessions[sessions.length-1];
  const sw = strongestAndWeakest(modules);
  const radar = renderRadar(modules);
  $('#overview-sub').textContent = `${learner.displayName} · ${learner.metrics.rank.title} · ${learner.metrics.readiness} readiness`;
  body.className = '';
  body.innerHTML = `
    <div class="quick-grid">
      <div class="info-card">
        <h3>Mission Brief</h3>
        <p>${escapeHtml(brief)}</p>
      </div>
      <div class="info-card">
        <h3>Next Best Action</h3>
        <p>${escapeHtml(nextBestAction(learner))}</p>
      </div>
      <div class="info-card">
        <h3>System Status</h3>
        <p>${escapeHtml(last ? `Last save-ready session was ${last.module} on ${formatDate(last.date)}. PIN is ${HUB.pin ? 'active' : 'not set'}.` : `No sessions logged yet. PIN is ${HUB.pin ? 'active' : 'not set'}.`)}</p>
      </div>
    </div>

    <div class="metric-grid" style="margin-top:16px">
      <div class="metric-card"><div class="label">Strongest module</div><div class="num">${escapeHtml(sw.strongest)}</div></div>
      <div class="metric-card"><div class="label">Needs support</div><div class="num">${escapeHtml(sw.weakest)}</div></div>
      <div class="metric-card"><div class="label">Sessions in view</div><div class="num">${sessions.length}</div></div>
      <div class="metric-card"><div class="label">Objectives met</div><div class="num">${evaluateObjectives(learner).met}</div></div>
    </div>

    <div class="panel" style="margin-top:16px;background:transparent;box-shadow:none;border:none">
      <div class="panel-inner" style="padding:0">
        <div class="panel-title">
          <div>
            <h3>Constellation Scan</h3>
            <p>Suite-wide module status in one read. Because charts should help, not just decorate their cubicle walls.</p>
          </div>
        </div>
        ${radar}
      </div>
    </div>

    <div class="panel" style="margin-top:16px;background:transparent;box-shadow:none;border:none">
      <div class="panel-inner" style="padding:0">
        <div class="panel-title">
          <div>
            <h3>Module Grid</h3>
            <p>Every module in one dashboard, with status, support trend, recent activity, and clear next steps.</p>
          </div>
        </div>
        <div class="module-grid">${modules.map(renderModuleCard).join('')}</div>
      </div>
    </div>

    <div class="panel" style="margin-top:16px;background:transparent;box-shadow:none;border:none">
      <div class="panel-inner" style="padding:0">
        <div class="panel-title">
          <div>
            <h3>Recent Activity</h3>
            <p>Latest sessions across the current view.</p>
          </div>
        </div>
        <div class="timeline">${recent.length ? recent.map(session=>`
          <div class="timeline-card">
            <div class="timeline-top">
              <div>
                <div class="timeline-title">${escapeHtml(session.module)} · ${escapeHtml(session.activity || 'Session')}</div>
                <div class="timeline-meta">${formatDate(session.date)}${session.time ? ` · ${escapeHtml(session.time)}` : ''} · ${escapeHtml(promptLabel(session.prompt))} · ${escapeHtml(session.setting || 'In App')}</div>
              </div>
              <span class="token">${session.accuracy != null ? `${session.accuracy}%` : escapeHtml(session.score || 'Logged')}</span>
            </div>
            ${session.notes ? `<div class="timeline-meta" style="margin-top:10px">${escapeHtml(session.notes)}</div>` : ''}
          </div>`).join('') : `<div class="empty">No sessions match the current filter. Clear the date range or log something new.</div>`}
        </div>
      </div>
    </div>
  `;
}
function renderRadar(modules){
  const size = 320;
  const cx = size/2, cy = size/2, maxR = 112;
  const active = modules.map((mod, idx)=>{
    const angle = (-90 + (360 / modules.length) * idx) * (Math.PI / 180);
    const value = mod.score || 0;
    const r = maxR * (value / 100);
    return {
      ...mod,
      angle,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      tx: cx + Math.cos(angle) * (maxR + 26),
      ty: cy + Math.sin(angle) * (maxR + 16)
    };
  });
  const points = active.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const rings = [25,50,75,100].map(p=>{
    const r = maxR * (p / 100);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-dasharray="4 6"/>`;
  }).join('');
  const axes = active.map(p=>`<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(p.angle)*maxR}" y2="${cy + Math.sin(p.angle)*maxR}" stroke="rgba(255,255,255,.08)"/>`).join('');
  const labels = active.map(p=>`<text x="${p.tx}" y="${p.ty}" fill="rgba(236,242,255,.82)" font-family="Space Mono, monospace" font-size="11" text-anchor="middle">${p.id.replace('Ready','')}</text>`).join('');
  const dots = active.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="${p.accent}"/>`).join('');
  return `
    <div class="radar-wrap">
      <div class="radar-card">
        <svg class="radar-svg" viewBox="0 0 ${size} ${size}" aria-label="Module radar chart">
          ${rings}
          ${axes}
          <polygon points="${points}" fill="rgba(255,187,51,.12)" stroke="rgba(255,187,51,.72)" stroke-width="2"/>
          ${dots}
          ${labels}
          <circle cx="${cx}" cy="${cy}" r="4" fill="#fff"/>
        </svg>
      </div>
      <div class="readout-grid">
        ${active.map(mod=>`
          <div class="readout">
            <div class="label">${escapeHtml(mod.id)}</div>
            <div class="value">${mod.score} system score</div>
            <div class="small-note">${mod.sessions.length ? `${mod.avg}% accuracy · ${mod.ind}% independence · ${mod.status}` : 'No tracked sessions yet'}</div>
          </div>
        `).join('')}
      </div>
    </div>`;
}
function renderModuleCard(mod){
  const accent = mod.accent;
  const topSkill = mod.topSkillEntry ? `${(MODULES.find(m=>m.id===mod.id)?.skillLabels || {})[mod.topSkillEntry[0]] || mod.topSkillEntry[0]} · ${mod.topSkillEntry[1]}%` : 'No tracked skill data yet';
  return `
    <div class="module-card" style="--accent:${accent}">
      <div class="module-head">
        <div>
          <div class="module-name">${mod.icon} ${escapeHtml(mod.id)}</div>
          <div class="small-note" style="margin-top:5px">${mod.sessions.length ? `${mod.sessions.length} session${mod.sessions.length!==1?'s':''} in view` : 'No sessions in view'}</div>
        </div>
        <div class="module-status">${escapeHtml(mod.status)}</div>
      </div>
      <div class="module-facts">
        <div class="module-fact"><div class="label">Average accuracy</div><div class="value">${mod.sessions.length ? `${mod.avg}%` : '--'}</div></div>
        <div class="module-fact"><div class="label">Independence</div><div class="value">${mod.sessions.length ? `${mod.ind}%` : '--'}</div></div>
        <div class="module-fact"><div class="label">Strongest subskill</div><div class="value">${escapeHtml(topSkill)}</div></div>
        <div class="module-fact"><div class="label">Last session</div><div class="value">${mod.last ? formatDate(mod.last.date) : 'Not started'}</div></div>
      </div>
      <div class="progress">
        <div class="bar"><div class="fill" style="width:${mod.score}%"></div></div>
        <div class="progress-label"><span>Module score</span><strong>${mod.score}%</strong></div>
      </div>
      <div class="small-note" style="margin-top:10px">${mod.sessions.length ? `${mod.status}. ${mod.goals.length ? `${mod.goalEval}/${mod.goals.length} tracked goals met.` : 'No module goals tracked.'}` : `Run a session in ${mod.id} to start drawing a real trend.`}</div>
    </div>`;
}
function renderObjectives(){
  const learner = selectedLearner();
  const list = $('#objective-list');
  const milestonesEl = $('#milestone-list');
  if(!learner){
    list.innerHTML = '<div class="empty">Select a learner to see objectives.</div>';
    milestonesEl.innerHTML = '';
    return;
  }
  const items = evaluateObjectives(learner).items;
  if(!items.length){
    list.innerHTML = '<div class="empty">No objectives yet. Add one from the button above so Mission Control has a concrete target to watch.</div>';
  }else{
    list.innerHTML = items.map(obj=>{
      const met = goalMet(learner,obj);
      const progress = Math.round(goalProgress(learner,obj) * 100);
      const meta = obj.imported
        ? `${obj.module} imported goal · ${obj.num || 4}/${obj.den || 5} across ${obj.consec || 3} sessions`
        : `${obj.module || 'All Modules'} · ${objectiveTemplateLabel(obj)}`;
      return `
        <div class="objective-card ${met?'met':''}">
          <div class="objective-top">
            <div>
              <div class="objective-title">${escapeHtml(obj.title || objectiveTemplateLabel(obj))}</div>
              <div class="objective-meta">${escapeHtml(meta)}${obj.notes ? ` · ${escapeHtml(obj.notes)}` : ''}</div>
            </div>
            <span class="token">${met ? 'Met' : `${progress}%`}</span>
          </div>
          <div class="objective-bar">
            <div class="bar"><div class="fill" style="width:${progress}%;--accent:${met ? '#00c851' : '#ffbb33'}"></div></div>
            <div class="progress-label"><span>${met ? 'Objective reached' : 'Progress to target'}</span><strong>${progress}%</strong></div>
          </div>
        </div>`;
    }).join('');
  }
  const m = milestones(learner);
  milestonesEl.innerHTML = m.length ? `
    <div class="panel-title" style="margin-top:4px">
      <div><h3>Milestones</h3><p>Clean markers that make progress feel real without turning the dashboard into a slot machine.</p></div>
    </div>
    ${m.map(item=>`<div class="milestone-card"><div class="objective-title">${escapeHtml(item.title)}</div><div class="objective-meta">${escapeHtml(item.copy)}</div></div>`).join('')}
  ` : '';
}
function renderSessions(){
  const learner = selectedLearner();
  const list = $('#session-list');
  if(!learner){
    list.innerHTML = '<div class="empty">Select a learner to view the progress log.</div>';
    return;
  }
  const sessions = filteredSessions(learner).slice().reverse();
  list.innerHTML = sessions.length ? sessions.map(s=>`
    <div class="session-card">
      <div class="session-top">
        <div>
          <div class="session-title">${escapeHtml(s.module)} · ${escapeHtml(s.activity || 'Session')}</div>
          <div class="session-meta">${formatDate(s.date)}${s.time ? ` · ${escapeHtml(s.time)}` : ''} · ${escapeHtml(promptLabel(s.prompt))} · ${escapeHtml(s.setting || 'In App')}${s.staff ? ` · Staff ${escapeHtml(s.staff)}` : ''}</div>
        </div>
        <span class="token">${s.accuracy != null ? `${s.accuracy}%` : escapeHtml(s.score || 'Logged')}</span>
      </div>
      <div class="ribbon">
        <span class="token">${escapeHtml(s.source === 'manual' ? 'Manual log' : 'Imported from module')}</span>
        ${s.skill ? `<span class="token">${escapeHtml(s.skill)}</span>` : ''}
      </div>
      ${s.notes ? `<div class="session-meta" style="margin-top:10px">${escapeHtml(s.notes)}</div>` : ''}
    </div>`).join('') : '<div class="empty">No sessions match the current view. Clear the filters or log a new session.</div>';
}
function renderReports(){
  const learner = selectedLearner();
  const list = $('#report-list');
  const output = $('#report-output');
  if(!learner){
    list.innerHTML = '<div class="empty">Select a learner to prepare a report.</div>';
    output.textContent = 'Select a learner to generate a report.';
    return;
  }
  const text = reportText(learner);
  const modStats = moduleStats(learner);
  const last = filteredSessions(learner).slice(-1)[0];
  list.innerHTML = `
    <div class="report-card">
      <div class="objective-title">Quick Snapshot</div>
      <div class="objective-meta">${escapeHtml(learner.displayName)} · ${learner.metrics.rank.title} · ${learner.metrics.readiness} readiness</div>
      <div class="small-note" style="margin-top:10px">${escapeHtml(last ? `Last session: ${last.module} on ${formatDate(last.date)}` : 'No sessions logged yet.')}</div>
    </div>
    <div class="report-card">
      <div class="objective-title">Formal Summary</div>
      <div class="objective-meta">${escapeHtml(improvementSummary(learner))}</div>
    </div>
    <div class="report-card">
      <div class="objective-title">Module Breakdown</div>
      <div class="objective-meta">${modStats.map(m=>`${m.id}: ${m.status}${m.sessions.length ? ` (${m.avg}% accuracy)` : ''}`).join(' · ')}</div>
    </div>
  `;
  output.textContent = text;
}
function renderSecurity(){
  const list = $('#security-list');
  const pinState = HUB.pin ? 'Active' : 'Not set';
  const autoLock = Number(HUB.autoLockMinutes || 0) ? `${HUB.autoLockMinutes} minutes` : 'Never';
  const legacy = APP.importedPins.length ? `${APP.importedPins.length} legacy code${APP.importedPins.length===1?'':'s'} detected in module storage.` : 'No legacy module codes detected.';
  list.innerHTML = `
    <div class="security-card">
      <div class="objective-title">Access Code</div>
      <div class="objective-meta">Status: ${pinState}${HUB.pinHint ? ` · Hint saved for staff` : ''}</div>
    </div>
    <div class="security-card">
      <div class="objective-title">Auto-Lock</div>
      <div class="objective-meta">${autoLock}. Mission Control can lock itself after inactivity on shared devices.</div>
    </div>
    <div class="security-card">
      <div class="objective-title">Data Storage</div>
      <div class="objective-meta">Learner data is stored locally on this device. Export reports only when you actually want them outside the app.</div>
    </div>
    <div class="security-card">
      <div class="objective-title">Import Status</div>
      <div class="objective-meta">${legacy} Refresh pulls the latest learner data from every LifeReady module saved in this browser.</div>
    </div>
  `;
}

function renderCommandDeck(){
  const el = $('#selected-learner-card');
  if(!el) return;
  const learner = selectedLearner();
  if(!learner){
    el.innerHTML = `
      <div class="eyebrow">Active Learner</div>
      <div class="selected-learner-name">No Learner Selected</div>
      <div class="selected-learner-meta">Pick someone from the roster to load their command deck, reports, session log, and objectives.</div>
    `;
    return;
  }
  const sessions = filteredSessions(learner);
  const objectives = evaluateObjectives(learner);
  const last = sessions[sessions.length - 1];
  el.innerHTML = `
    <div class="eyebrow">Active Learner</div>
    <div class="selected-learner-name">${escapeHtml(learner.displayName)}</div>
    <div class="selected-learner-meta">${escapeHtml(learner.program || learner.level || 'Profile ready')} · ${escapeHtml(learner.metrics.rank.title)} · ${learner.metrics.readiness} readiness${last ? ` · last log ${formatDate(last.date)}` : ''}</div>
    <div class="selected-learner-tokens">
      <span class="token">${sessions.length} session${sessions.length===1?'':'s'}</span>
      <span class="token">${objectives.met} objective${objectives.met===1?'':'s'} met</span>
      <span class="token">${learner.metrics.acc}% accuracy</span>
      <span class="token">${learner.metrics.ind}% independence</span>
    </div>
  `;
}
function printBrief(){
  const learner = selectedLearner();
  if(!learner) return alert('Select a learner first.');
  showView('reports');
  setTimeout(()=>window.print(), 120);
}
function toggleArchive(key = APP.selectedKey){
  const learner = APP.learners.find(l=>l.key === key);
  if(!learner) return;
  const profile = HUB.profiles[key] || (HUB.profiles[key] = {});
  const archived = new Set(HUB.archivedKeys || []);
  if(archived.has(key)){
    archived.delete(key);
    profile.archived = false;
    saveHubState('Learner restored to roster');
  }else{
    archived.add(key);
    profile.archived = true;
    saveHubState('Learner archived');
  }
  HUB.archivedKeys = Array.from(archived);
  if(APP.selectedKey === key && !HUB.showArchived && archived.has(key)){
    APP.selectedKey = '';
    HUB.lastLearnerKey = '';
  }
  renderAll();
}
function courtMartialLearner(key = APP.selectedKey){
  const learner = APP.learners.find(l=>l.key === key);
  if(!learner) return alert('Select a learner first.');
  const ok = window.confirm(`Court-martial ${learner.displayName} from Mission Control on this device? This deletes their Mission Control card, notes, objectives, manual logs, and archived state.`);
  if(!ok) return;
  const dismissed = new Set(HUB.dismissedKeys || []);
  dismissed.add(key);
  HUB.dismissedKeys = Array.from(dismissed);
  const archived = new Set(HUB.archivedKeys || []);
  archived.delete(key);
  HUB.archivedKeys = Array.from(archived);
  delete HUB.profiles[key];
  if(APP.selectedKey === key){
    APP.selectedKey = '';
    HUB.lastLearnerKey = '';
  }
  saveHubState('Learner court-martialed');
  const indicator = $('#save-indicator');
  if(indicator){
    indicator.textContent = 'COURT-MARTIAL COMPLETE · Learner deleted from Mission Control';
    setTimeout(()=>{ if(indicator) indicator.textContent = 'SYSTEM STABLE · Saved locally'; }, 1800);
  }
  renderAll();
}

function maybeShowPromotionToast(learner){
  if(!learner) return;
  const profile = HUB.profiles[learner.key] || (HUB.profiles[learner.key] = {});
  const prev = profile.lastRank || '';
  const next = learner.metrics.rank.title;
  if(!prev){
    profile.lastRank = next;
    saveHubState('Rank baseline saved');
    return;
  }
  if(prev !== next){
    profile.lastRank = next;
    saveHubState('Promotion tracked');
    const toast = $('#toast');
    $('#toast-title').textContent = `${learner.displayName} advanced to ${next}`;
    $('#toast-copy').textContent = `PROMOTION UNLOCKED. The dashboard noticed stronger evidence across scores, support, and consistency. A shocking outbreak of progress.`;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>toast.classList.remove('show'), 4200);
  }
}
function renderAll(){
  APP.learners = buildLearners();
  APP.selectedModule = APP.selectedModule || 'All Modules';
  syncSelectOptions();
  syncModuleOptions();
  if(APP.returnFile){
    const link = $('#return-link');
    link.classList.remove('hidden');
    link.href = APP.returnFile;
    link.textContent = `↩ Return to ${APP.returnModule || 'Module'}`;
  }
  $('#learner-search').value = APP.search || '';
  $('#module-filter').value = APP.selectedModule || 'All Modules';
  $('#range-start').value = APP.rangeStart || '';
  $('#range-end').value = APP.rangeEnd || '';
  ensureSelection();
  const learner = selectedLearner();
  renderHero();
  renderCommandDeck();
  renderRoster();
  renderOverview();
  renderObjectives();
  renderSessions();
  renderReports();
  renderSecurity();
  if(learner) maybeShowPromotionToast(learner);
  applyInitialView();
  $('#current-view-pill').textContent = APP.selectedModule || 'All Modules';
  $('#filter-note').textContent = `${APP.selectedModule || 'All Modules'}${APP.rangeStart || APP.rangeEnd ? ` · ${APP.rangeStart || 'Any'} to ${APP.rangeEnd || 'Any'}` : ' · All dates'}`;
  const archiveBtn = $('#show-archived-btn');
  if(archiveBtn) archiveBtn.classList.toggle('primary', !!HUB.showArchived);
}
function populateForms(){
  syncSelectOptions();
  syncModuleOptions();
  $('#session-date').value = TODAY;
  if(APP.selectedKey){
    $('#session-learner').value = APP.selectedKey;
    $('#objective-learner').value = APP.selectedKey;
  }
  if(APP.selectedModule && APP.selectedModule !== 'All Modules'){
    $('#session-module').value = APP.selectedModule;
    $('#objective-module').value = APP.selectedModule;
  }
}
function resetLearnerForm(){
  $('#learner-initials').value = '';
  $('#learner-display').value = '';
  $('#learner-full').value = '';
  $('#learner-program').value = '';
  $('#learner-level').value = 'emerging';
  $('#learner-color').value = '#29a1ff';
  $('#learner-notes').value = '';
}
function addLearner(){
  const displayName = $('#learner-display').value.trim() || $('#learner-full').value.trim() || $('#learner-initials').value.trim();
  if(!displayName){
    alert('Give the learner at least a display name or initials.');
    return;
  }
  const obj = {
    displayName,
    fullName: $('#learner-full').value.trim(),
    initials: ($('#learner-initials').value.trim() || initialsFor(displayName)).toUpperCase(),
    program: $('#learner-program').value.trim(),
    level: $('#learner-level').value,
    color: $('#learner-color').value,
    notes: $('#learner-notes').value.trim(),
    createdAt: TODAY,
    objectives: [],
    manualSessions: [],
    archived: false
  };
  const key = profileKey(obj);
  HUB.profiles[key] = { ...(HUB.profiles[key] || {}), ...obj };
  HUB.lastLearnerKey = key;
  APP.selectedKey = key;
  saveHubState('Learner added');
  hideOverlay('#learner-overlay');
  resetLearnerForm();
  renderAll();
}
function addSession(){
  const key = $('#session-learner').value;
  if(!key) return alert('Choose a learner first.');
  const profile = HUB.profiles[key] || (HUB.profiles[key] = {displayName:'Learner', objectives:[], manualSessions:[]});
  profile.manualSessions = profile.manualSessions || [];
  profile.manualSessions.push({
    id: `manual-${Date.now()}`,
    module: $('#session-module').value,
    activity: $('#session-activity').value.trim() || $('#session-module').value,
    score: $('#session-score').value.trim(),
    prompt: $('#session-prompt').value,
    setting: $('#session-setting').value,
    date: $('#session-date').value || TODAY,
    staff: $('#session-staff').value.trim().toUpperCase(),
    notes: $('#session-note').value.trim(),
    source: 'manual'
  });
  APP.selectedKey = key;
  HUB.lastLearnerKey = key;
  saveHubState('Session logged');
  hideOverlay('#session-overlay');
  renderAll();
}
function addObjective(){
  const key = $('#objective-learner').value;
  if(!key) return alert('Choose a learner first.');
  const profile = HUB.profiles[key] || (HUB.profiles[key] = {displayName:'Learner', objectives:[], manualSessions:[]});
  profile.objectives = profile.objectives || [];
  const template = $('#objective-template').value;
  const title = $('#objective-title').value.trim();
  const obj = {
    id:`obj-${Date.now()}`,
    template,
    title,
    module: $('#objective-module').value,
    threshold: Number($('#objective-threshold').value || 0),
    window: Number($('#objective-window').value || 0),
    maxPrompt: 'verbal',
    notes: $('#objective-note').value.trim(),
    created: TODAY
  };
  if(template === 'independence'){
    obj.threshold = Number($('#objective-threshold').value || 4);
    obj.window = Number($('#objective-window').value || 5);
    obj.maxPrompt = 'verbal';
  }
  if(template === 'frequency'){
    obj.threshold = Number($('#objective-threshold').value || 5);
    obj.window = Number($('#objective-window').value || 30);
  }
  profile.objectives.push(obj);
  APP.selectedKey = key;
  HUB.lastLearnerKey = key;
  saveHubState('Objective saved');
  hideOverlay('#objective-overlay');
  renderAll();
}
function copySummary(){
  const learner = selectedLearner();
  if(!learner) return alert('Select a learner first.');
  const text = reportText(learner);
  const done = ()=>{
    const el = $('#save-indicator');
    if(el) el.textContent = 'SYSTEM STABLE · Summary copied';
    setTimeout(()=>{ if(el) el.textContent = 'SYSTEM STABLE · Saved locally'; }, 1400);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(()=>{
      window.prompt('Copy the report text below:', text);
    });
  }else{
    window.prompt('Copy the report text below:', text);
  }
}
function downloadReport(){
  const learner = selectedLearner();
  if(!learner) return alert('Select a learner first.');
  const text = reportText(learner);
  downloadFile(`${slugify(learner.displayName)}-mission-control-report.txt`, text, 'text/plain');
}
function downloadCSV(){
  const learner = selectedLearner();
  if(!learner) return alert('Select a learner first.');
  downloadFile(`${slugify(learner.displayName)}-mission-control-sessions.csv`, csvText(learner), 'text/csv');
}

document.addEventListener('click', e=>{
  const close = e.target.closest('[data-close]');
  if(close){
    hideOverlay(close.dataset.close);
  }
  const jump = e.target.closest('[data-jump]');
  if(jump){
    showView(jump.dataset.jump);
  }
});
document.addEventListener('keydown', e=>{
  scheduleLock();
  if(e.key === 'Escape'){
    $all('.overlay.show').forEach(el=>el.classList.remove('show'));
  }
  if(e.key === 'Enter' && !$('#lock-view').classList.contains('hidden') && document.activeElement === $('#pin-input')){
    handleLockSubmit();
  }
});
['click','input','pointerdown','touchstart'].forEach(evt=>{
  document.addEventListener(evt, ()=>{ if(!$('#app-view').classList.contains('hidden')) scheduleLock(); }, {passive:true});
});

$('#pin-submit-btn').addEventListener('click', handleLockSubmit);
$('#pin-remove-legacy-btn').addEventListener('click', ()=>{
  APP.importedPins = [];
  HUB.pin = '';
  HUB.pinHint = '';
  HUB.ignoreLegacyPins = true;
  saveHubState('Legacy module codes ignored');
  $('#legacy-pin-note').classList.add('hidden');
  $('#pin-remove-legacy-btn').classList.add('hidden');
  $('#pin-error').textContent = '';
  $('#pin-input').value = '';
  $('#pin-submit-btn').textContent = 'Create Access Code';
  $('#lock-copy').textContent = 'Create one educator access code for Mission Control.';
});
$('#learner-search').addEventListener('input', e=>{ APP.search = e.target.value; renderRoster(); ensureSelection(); renderAll(); });
$('#module-filter').addEventListener('change', e=>{
  APP.selectedModule = e.target.value;
  HUB.selectedModule = APP.selectedModule;
  saveHubState('Filter updated');
  renderAll();
});
$('#range-start').addEventListener('change', e=>{ APP.rangeStart = e.target.value; HUB.rangeStart = APP.rangeStart; saveHubState('Date range updated'); renderAll(); });
$('#range-end').addEventListener('change', e=>{ APP.rangeEnd = e.target.value; HUB.rangeEnd = APP.rangeEnd; saveHubState('Date range updated'); renderAll(); });
$('#clear-filters-btn').addEventListener('click', ()=>{
  APP.selectedModule = 'All Modules';
  APP.rangeStart = '';
  APP.rangeEnd = '';
  HUB.selectedModule = APP.selectedModule;
  HUB.rangeStart = '';
  HUB.rangeEnd = '';
  saveHubState('Filters cleared');
  renderAll();
});
$('#refresh-btn').addEventListener('click', ()=>{ renderAll(); });
$('#add-learner-btn').addEventListener('click', ()=>{ resetLearnerForm(); showOverlay('#learner-overlay'); });
$('#add-learner-btn-sidebar')?.addEventListener('click', ()=>{ resetLearnerForm(); showOverlay('#learner-overlay'); });
$('#show-archived-btn')?.addEventListener('click', ()=>{
  HUB.showArchived = !HUB.showArchived;
  saveHubState(HUB.showArchived ? 'Archive bay opened' : 'Main roster opened');
  renderAll();
});
$('#save-learner-btn').addEventListener('click', addLearner);
$('#log-session-btn').addEventListener('click', ()=>{ populateForms(); showOverlay('#session-overlay'); });
$('#log-session-btn-2').addEventListener('click', ()=>{ populateForms(); showOverlay('#session-overlay'); });
$('#save-session-btn').addEventListener('click', addSession);
$('#add-objective-btn').addEventListener('click', ()=>{ populateForms(); showOverlay('#objective-overlay'); });
$('#add-objective-btn-2').addEventListener('click', ()=>{ populateForms(); showOverlay('#objective-overlay'); });
$('#save-objective-btn').addEventListener('click', addObjective);
$('#help-btn').addEventListener('click', ()=>showOverlay('#help-overlay'));
$('#intro-finish-btn').addEventListener('click', ()=>{
  HUB.introSeen = true;
  saveHubState('Intro completed');
  hideOverlay('#intro-overlay');
});
$('#lock-btn').addEventListener('click', lockMissionControl);
$('#manage-pin-btn').addEventListener('click', ()=>{
  $('#new-pin').value = '';
  $('#new-pin-confirm').value = '';
  $('#pin-hint').value = HUB.pinHint || '';
  $('#auto-lock').value = String(HUB.autoLockMinutes || '5');
  $('#pin-manage-error').textContent = '';
  showOverlay('#pin-overlay');
});
$('#save-pin-btn').addEventListener('click', ()=>{
  const pin = $('#new-pin').value;
  const confirm = $('#new-pin-confirm').value;
  const hint = $('#pin-hint').value.trim();
  const auto = $('#auto-lock').value;
  if(pin || confirm){
    if(pin.length < 4) return $('#pin-manage-error').textContent = 'Use at least 4 characters.';
    if(pin !== confirm) return $('#pin-manage-error').textContent = 'Those codes do not match.';
    HUB.pin = pin;
    HUB.ignoreLegacyPins = false;
  }
  HUB.pinHint = hint;
  HUB.autoLockMinutes = auto;
  saveHubState('Access settings saved');
  hideOverlay('#pin-overlay');
  renderAll();
  scheduleLock();
});
$('#remove-pin-btn').addEventListener('click', ()=>{
  HUB.pin = '';
  HUB.pinHint = '';
  HUB.ignoreLegacyPins = true;
  saveHubState('Access code removed');
  hideOverlay('#pin-overlay');
  renderAll();
});
$('#copy-summary-btn').addEventListener('click', copySummary);
$('#copy-summary-btn-2').addEventListener('click', copySummary);
$('#download-report-btn').addEventListener('click', downloadReport);
$('#download-report-btn-2').addEventListener('click', downloadReport);
$('#download-csv-btn').addEventListener('click', downloadCSV);
$('#print-report-btn')?.addEventListener('click', printBrief);
$('#print-report-btn-2')?.addEventListener('click', printBrief);
$('#court-martial-btn')?.addEventListener('click', courtMartialLearner);

APP.learners = buildLearners();
maybeMigrateLegacyPin();
APP.selectedKey = HUB.lastLearnerKey || (APP.learners[0]?.key || '');
$('#lock-view').classList.remove('hidden');
$('#app-view').classList.add('hidden');
$('#pin-submit-btn').textContent = HUB.pin ? 'Unlock Mission Control' : 'Create Access Code';
$('#lock-copy').textContent = HUB.pin ? 'Enter your educator access code to open Mission Control.' : 'Create one educator access code for Mission Control.';
if(HUB.pin && APP.importedPins.length){
  $('#pin-error').textContent = '';
}
renderAll();
showView(APP.currentView || 'overview', false);