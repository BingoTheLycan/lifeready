(function(){
  const STORAGE_KEY = 'lr_control_v1';
  const ACTIVITY_KEY = 'lr_activity_v1';
  const PROGRESS_KEY = 'lr_progress_v1';
  const MODULES = [
    { key:'CashReady', file:'CashReady.html', label:'CashReady', accent:'#00c851', deck:'Checkout Deck' },
    { key:'TimeReady', file:'TimeReady.html', label:'TimeReady', accent:'#33b5e5', deck:'Clock Deck' },
    { key:'JobReady', file:'JobReady.html', label:'JobReady', accent:'#ffbb33', deck:'Career Deck' },
    { key:'HomeReady', file:'HomeReady.html', label:'HomeReady', accent:'#e8650a', deck:'Habitat Deck' },
    { key:'TravelReady', file:'TravelReady.html', label:'TravelReady', accent:'#00bcd4', deck:'Transit Deck' },
    { key:'SocialReady', file:'SocialReady.html', label:'SocialReady', accent:'#9c27b0', deck:'Communications Deck' },
    { key:'TechReady', file:'TechReady.html', label:'TechReady', accent:'#cc2200', deck:'Cyber Deck' },
    { key:'HealthReady', file:'HealthReady.html', label:'HealthReady', accent:'#e91e8c', deck:'Med Bay' }
  ];
  const GLOBAL_ACCESS_KEYS = ['audio','colorblindMode','largetext','largebtns','nomotion','breaks','errorless','hicontrast','lightmode','speed'];
  const DEFAULTS = {
    version: 1,
    profile: {
      displayName: '',
      sharedDevice: true
    },
    accessibility: {
      audio: true,
      colorblindMode: 'none',
      largetext: false,
      largebtns: false,
      nomotion: false,
      breaks: false,
      errorless: false,
      hicontrast: false,
      lightmode: false,
      speed: 'normal'
    },
    modules: MODULES.reduce((acc, mod) => {
      acc[mod.key] = { enabled: true };
      return acc;
    }, {})
  };
  const PRESETS = {
    standard: { label:'Standard Setup', accessibility:{ audio:true, largetext:false, largebtns:false, nomotion:false, breaks:false, errorless:false, hicontrast:false, lightmode:false, speed:'normal', colorblindMode:'none' } },
    support: { label:'Support Mode', accessibility:{ audio:true, largetext:true, largebtns:true, nomotion:false, breaks:true, errorless:true, hicontrast:false, lightmode:false, speed:'slow' } },
    focus: { label:'Focus Mode', accessibility:{ audio:true, largetext:false, largebtns:false, nomotion:true, breaks:false, errorless:false, hicontrast:false, lightmode:false, speed:'normal' } },
    quiet: { label:'Quiet Mode', accessibility:{ audio:false, largetext:false, largebtns:false, nomotion:true, breaks:false, errorless:false, hicontrast:false, lightmode:false, speed:'normal' } }
  };

  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
  function merge(base, extra){
    const out = Array.isArray(base) ? base.slice() : { ...(base || {}) };
    if (!extra || typeof extra !== 'object') return out;
    Object.keys(extra).forEach(key => {
      const val = extra[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) out[key] = merge(out[key], val);
      else out[key] = val;
    });
    return out;
  }
  function normalize(raw){
    const merged = merge(clone(DEFAULTS), raw || {});
    if (!merged.profile) merged.profile = clone(DEFAULTS.profile);
    if (typeof merged.profile.displayName !== 'string') merged.profile.displayName = '';
    merged.profile.displayName = merged.profile.displayName.trim().slice(0, 28);
    merged.profile.sharedDevice = !!merged.profile.sharedDevice;
    if (!merged.accessibility) merged.accessibility = clone(DEFAULTS.accessibility);
    if (!['none','protanopia','deuteranopia','tritanopia'].includes(merged.accessibility.colorblindMode)) merged.accessibility.colorblindMode = 'none';
    if (!['slow','normal','fast'].includes(merged.accessibility.speed)) merged.accessibility.speed = 'normal';
    MODULES.forEach(mod => {
      if (!merged.modules[mod.key]) merged.modules[mod.key] = { enabled: true };
      merged.modules[mod.key].enabled = merged.modules[mod.key].enabled !== false;
    });
    return merged;
  }
  function read(){
    try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
    catch(_e){ return clone(DEFAULTS); }
  }
  function write(data){
    const clean = normalize(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  }
  function update(mutator){
    const current = read();
    const next = typeof mutator === 'function' ? (mutator(clone(current)) || current) : merge(current, mutator);
    return write(next);
  }
  function readProgress(){
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      const data = raw ? JSON.parse(raw) : {};
      if (!data || typeof data !== 'object') return { totalXP:0, sessions:0, modules:{}, modeBest:{} };
      if (!data.modules || typeof data.modules !== 'object') data.modules = {};
      if (typeof data.totalXP !== 'number') data.totalXP = 0;
      if (typeof data.sessions !== 'number') data.sessions = 0;
      return data;
    } catch(_e){ return { totalXP:0, sessions:0, modules:{}, modeBest:{} }; }
  }
  function readActivity(){
    try {
      const raw = localStorage.getItem(ACTIVITY_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data.filter(Boolean) : [];
    } catch(_e){ return []; }
  }
  function saveActivity(list){
    try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list.slice(0, 40))); } catch(_e){}
  }
  function moduleFromFile(file){ return MODULES.find(mod => mod.file === file) || null; }
  function moduleFromKey(key){ return MODULES.find(mod => mod.key === key) || null; }
  function currentFile(){
    const bits = (location.pathname || '').split('/');
    return bits[bits.length - 1] || 'index.html';
  }
  function formatAgo(ts){
    const diff = Math.max(0, Date.now() - Number(ts || 0));
    const min = Math.round(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const day = Math.round(hr / 24);
    return `${day} day${day === 1 ? '' : 's'} ago`;
  }
  function escapeHTML(str){
    return String(str == null ? '' : str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function activeSupportCount(access){
    let count = 0;
    ['audio','largetext','largebtns','nomotion','breaks','errorless','hicontrast','lightmode'].forEach(key => { if (access[key]) count += 1; });
    if (access.colorblindMode !== 'none') count += 1;
    if (access.speed !== 'normal') count += 1;
    return count;
  }
  function detectPreset(data){
    const access = data.accessibility || {};
    return Object.keys(PRESETS).find(key => {
      const preset = PRESETS[key].accessibility;
      return Object.keys(preset).every(pKey => access[pKey] === preset[pKey]);
    }) || '';
  }
  function buildReadiness(){
    const control = read();
    const progress = readProgress();
    const activity = readActivity();
    const activeSupports = activeSupportCount(control.accessibility);
    const modules = MODULES.map(mod => {
      const entry = progress.modules[mod.key] || progress.modules[mod.label] || {};
      return {
        ...mod,
        sessions: Number(entry.sessions) || 0,
        mastery: Number(entry.mastery) || 0,
        bestPct: Number(entry.bestPct) || 0,
        lastMode: entry.lastMode || '',
        lastPlayed: Number(entry.lastPlayed) || 0
      };
    }).sort((a,b) => (b.lastPlayed || 0) - (a.lastPlayed || 0) || (b.sessions || 0) - (a.sessions || 0));
    const engagedModules = modules.filter(mod => mod.sessions > 0 || mod.lastPlayed > 0);
    const recent = activity.map(item => {
      const mod = moduleFromKey(item.moduleKey) || moduleFromFile(item.file || '') || { label:item.moduleKey || 'Module', deck:'Training Deck', file:item.file || '#' };
      return { ...item, label:mod.label, deck:mod.deck, file:mod.file };
    });
    return {
      control,
      progress,
      modules,
      engagedModules,
      recent,
      activeSupports,
      visibleDecks: MODULES.filter(mod => control.modules[mod.key] && control.modules[mod.key].enabled !== false).length,
      currentRank: progress.currentRank || 'Cadet',
      lastModule: engagedModules[0] || null,
      activePreset: detectPreset(control)
    };
  }
  function logActivity(mod){
    if (!mod) return;
    const sessionKey = `lr_seen_${mod.key}`;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, '1');
    } catch(_e){}
    const entries = readActivity();
    const prev = entries[0];
    if (prev && prev.moduleKey === mod.key && (Date.now() - Number(prev.at || 0) < 10 * 60 * 1000)) return;
    entries.unshift({ moduleKey:mod.key, file:mod.file, at:Date.now() });
    saveActivity(entries);
  }

  function injectSharedStyles(){
    if (document.getElementById('lr-suite-shared-style')) return;
    const style = document.createElement('style');
    style.id = 'lr-suite-shared-style';
    style.textContent = `
      body.lr-suite-light{background:#eef3fb !important;color:#10253c !important;}
      body.lr-suite-light .hero, body.lr-suite-light .cp-shell, body.lr-suite-light .rr-shell{background:radial-gradient(circle at top, rgba(65,130,255,.14), transparent 55%), linear-gradient(180deg,#f6f9ff,#e7eef9) !important;}
      body.lr-suite-contrast{background:#000 !important;color:#fff !important;}
      body.lr-suite-contrast *{text-shadow:none !important;box-shadow:none !important;}
      body.lr-suite-contrast .info-card, body.lr-suite-contrast .quick-card, body.lr-suite-contrast .app-card, body.lr-suite-contrast .cp-card, body.lr-suite-contrast .rr-card{background:#000 !important;border-color:#fff !important;color:#fff !important;}
      body.lr-suite-large-text{font-size:18px;}
      body.lr-suite-large-text .hero-copy, body.lr-suite-large-text .hero-trust, body.lr-suite-large-text .info-card p, body.lr-suite-large-text .cp-copy, body.lr-suite-large-text .cp-field-copy, body.lr-suite-large-text .rr-copy{font-size:1rem !important;line-height:1.6 !important;}
      body.lr-suite-large-btns .btn, body.lr-suite-large-btns button, body.lr-suite-large-btns input, body.lr-suite-large-btns .cp-toggle, body.lr-suite-large-btns .cp-chip, body.lr-suite-large-btns .rr-link{min-height:52px !important;padding-top:13px !important;padding-bottom:13px !important;}
      body.lr-suite-no-motion *, body.lr-suite-no-motion *::before, body.lr-suite-no-motion *::after{animation:none !important;transition:none !important;scroll-behavior:auto !important;}
      .lr-control-shortcut{margin-bottom:16px;padding:14px;border:1px solid rgba(92,240,255,.28);border-radius:16px;background:linear-gradient(135deg,rgba(92,240,255,.10),rgba(125,94,255,.06));}
      .lr-control-shortcut .st{margin-top:0;}
      .lr-control-shortcut .lr-cta{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;}
      .lr-control-shortcut .lr-copy{font-size:.78rem;line-height:1.55;color:var(--text2, #b8c3d2);max-width:560px;}
      .lr-control-shortcut button{border:1px solid rgba(92,240,255,.4);background:rgba(92,240,255,.12);color:var(--green, #5cf0ff);padding:10px 14px;border-radius:12px;font-weight:700;cursor:pointer;}
      .lr-suite-hidden{display:none !important;}
      .lr-toast-stack{position:fixed;right:16px;bottom:16px;z-index:99999;display:grid;gap:10px;max-width:min(360px,calc(100vw - 32px));}
      .lr-toast{border-radius:16px;padding:13px 14px 14px;background:linear-gradient(135deg,rgba(11,19,33,.96),rgba(17,28,46,.96));border:1px solid rgba(92,240,255,.22);box-shadow:0 18px 44px rgba(0,0,0,.38);color:#eaf6ff;font-family:var(--font-body, system-ui, sans-serif);transform:translateY(12px);opacity:0;animation:lrToastIn .18s ease forwards;}
      .lr-toast.warn{border-color:rgba(255,107,124,.3);}
      .lr-toast.success{border-color:rgba(125,255,178,.3);}
      .lr-toast-title{font-family:ui-monospace, SFMono-Regular, Menlo, monospace;font-size:.72rem;letter-spacing:1.8px;text-transform:uppercase;color:#5cf0ff;font-weight:800;display:block;margin-bottom:4px;}
      .lr-toast.warn .lr-toast-title{color:#ff9ea9;}
      .lr-toast.success .lr-toast-title{color:#7dffb2;}
      .lr-toast-copy{font-size:.92rem;line-height:1.45;color:#eef6ff;}
      @keyframes lrToastIn{to{opacity:1;transform:translateY(0);}}
      @keyframes lrToastOut{to{opacity:0;transform:translateY(8px);}}
    `;
    document.head.appendChild(style);
  }
  function toast(title, copy, tone){
    injectSharedStyles();
    const stack = document.querySelector('.lr-toast-stack') || (function(){
      const el = document.createElement('div');
      el.className = 'lr-toast-stack';
      document.body.appendChild(el);
      return el;
    })();
    const node = document.createElement('div');
    node.className = `lr-toast ${tone || ''}`.trim();
    node.innerHTML = `<span class="lr-toast-title">${escapeHTML(title)}</span><div class="lr-toast-copy">${escapeHTML(copy)}</div>`;
    stack.appendChild(node);
    setTimeout(() => {
      node.style.animation = 'lrToastOut .18s ease forwards';
      setTimeout(() => node.remove(), 220);
    }, 2600);
  }

  function applySuiteClasses(data){
    injectSharedStyles();
    if (!document.body) return;
    const a = (data && data.accessibility) || read().accessibility;
    document.body.classList.toggle('lr-suite-light', !!a.lightmode && !a.hicontrast);
    document.body.classList.toggle('lr-suite-contrast', !!a.hicontrast);
    document.body.classList.toggle('lr-suite-large-text', !!a.largetext);
    document.body.classList.toggle('lr-suite-large-btns', !!a.largebtns);
    document.body.classList.toggle('lr-suite-no-motion', !!a.nomotion);
  }
  function getModuleCFG(){
    try { if (typeof CFG !== 'undefined' && CFG && typeof CFG === 'object') return CFG; } catch(_e){}
    try { if (window.CFG && typeof window.CFG === 'object') return window.CFG; } catch(_e){}
    return null;
  }
  function controlUrl(){
    const file = currentFile();
    return `ControlPanel.html?return=${encodeURIComponent(file)}`;
  }

  function renderHubStatus(data){
    const readiness = buildReadiness();
    const title = document.getElementById('lr-hub-title');
    const copy = document.getElementById('lr-hub-copy');
    const note = document.getElementById('lr-hub-note');
    const nameInput = document.getElementById('lr-home-name');
    const clearBtn = document.getElementById('lr-home-clear');
    const heroNote = document.getElementById('lr-hero-status');
    const name = data.profile.displayName;
    if (title) title.textContent = name ? `BACK ON DECK, ${name.toUpperCase()}` : 'SYSTEMS ONLINE';
    if (copy) copy.textContent = name ? 'Profile linked. Support systems ready.' : 'Link a display name here, or use Shared Device Mode.';
    if (note) note.textContent = data.profile.sharedDevice ? 'Shared Device Mode active. Use initials or a nickname when more than one person uses this phone, tablet, or computer.' : 'Personal Device Mode active. Your linked profile stays on this device until you clear it.';
    if (nameInput && document.activeElement !== nameInput) nameInput.value = name || '';
    if (clearBtn) clearBtn.textContent = name ? 'Clear Profile From Device' : 'Use Shared Device Mode';
    if (heroNote) heroNote.innerHTML = name
      ? `<span class="lr-band-label">PROFILE LINKED</span><span class="lr-band-copy">${escapeHTML(name)} · ${data.profile.sharedDevice ? 'SHARED DEVICE MODE' : 'PERSONAL DEVICE MODE'} · ${readiness.activeSupports} SUPPORT SYSTEM${readiness.activeSupports === 1 ? '' : 'S'} ACTIVE</span>`
      : `<span class="lr-band-label">PROFILE OFFLINE</span><span class="lr-band-copy">Open Control Panel to link a profile or use Shared Device Mode.</span>`;
    const bridgeStatus = document.getElementById('lr-bridge-status');
    if (bridgeStatus) bridgeStatus.textContent = name ? `${name} linked · ${readiness.currentRank} status · ${readiness.visibleDecks} decks online` : `Profile offline · ${readiness.visibleDecks} decks online`;
    const readinessMode = document.getElementById('lr-bridge-recent');
    if (readinessMode) readinessMode.textContent = readiness.lastModule ? `${readiness.lastModule.label} active ${formatAgo(readiness.lastModule.lastPlayed)}` : 'No training logged yet';
    const supportChip = document.getElementById('lr-bridge-support');
    if (supportChip) supportChip.textContent = `${readiness.activeSupports} support system${readiness.activeSupports === 1 ? '' : 's'} active`;
    const deckChip = document.getElementById('lr-bridge-decks');
    if (deckChip) deckChip.textContent = `${readiness.visibleDecks} mission deck${readiness.visibleDecks === 1 ? '' : 's'} visible`;
  }
  function renderHomeReadiness(){
    const readiness = buildReadiness();
    const rank = document.getElementById('lr-report-rank');
    const sessions = document.getElementById('lr-report-sessions');
    const supports = document.getElementById('lr-report-supports');
    const active = document.getElementById('lr-report-active');
    if (rank) rank.textContent = readiness.currentRank;
    if (sessions) sessions.textContent = String(readiness.progress.sessions || 0);
    if (supports) supports.textContent = String(readiness.activeSupports);
    if (active) active.textContent = String(readiness.engagedModules.length);
    const recentList = document.getElementById('lr-recent-list');
    if (recentList) {
      if (readiness.recent.length) {
        recentList.innerHTML = readiness.recent.slice(0,3).map(item => `<div class="lr-log-row"><strong>${escapeHTML(item.label)}</strong><span>${escapeHTML(item.deck)} · ${escapeHTML(formatAgo(item.at))}</span></div>`).join('');
      } else {
        recentList.innerHTML = `<div class="lr-log-empty">No mission activity logged yet. Start anywhere. The report grows as you do.</div>`;
      }
    }
    const systemList = document.getElementById('lr-system-list');
    if (systemList) {
      const items = [];
      items.push(readiness.control.profile.displayName ? `Profile linked as ${readiness.control.profile.displayName}` : 'No linked profile saved');
      items.push(readiness.control.profile.sharedDevice ? 'Shared Device Mode active' : 'Personal Device Mode active');
      items.push(`${readiness.visibleDecks} mission deck${readiness.visibleDecks === 1 ? '' : 's'} visible on the homepage`);
      items.push(`${readiness.activeSupports} support system${readiness.activeSupports === 1 ? '' : 's'} online`);
      systemList.innerHTML = items.map(item => `<div class="lr-system-item">${escapeHTML(item)}</div>`).join('');
    }
  }
  function applyHubModuleVisibility(data){
    document.querySelectorAll('.app-card[href]').forEach(card => {
      const href = card.getAttribute('href') || '';
      const mod = moduleFromFile(href);
      if (!mod) return;
      const enabled = data.modules[mod.key] ? data.modules[mod.key].enabled !== false : true;
      card.style.display = enabled ? '' : 'none';
    });
  }
  function initHub(){
    const data = read();
    applySuiteClasses(data);
    renderHubStatus(data);
    renderHomeReadiness();
    applyHubModuleVisibility(data);
    const saveBtn = document.getElementById('lr-home-save');
    const clearBtn = document.getElementById('lr-home-clear');
    const nameInput = document.getElementById('lr-home-name');
    if (saveBtn && nameInput) {
      saveBtn.addEventListener('click', function(){
        const displayName = (nameInput.value || '').trim().slice(0,28);
        const next = update(cfg => {
          cfg.profile.displayName = displayName;
          cfg.profile.sharedDevice = !displayName;
          return cfg;
        });
        renderHubStatus(next);
        renderHomeReadiness();
        toast(displayName ? 'PROFILE LINKED' : 'SHARED DEVICE MODE', displayName ? `${displayName} is now linked on this device.` : 'No name saved. This device will stay in shared mode.', 'success');
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function(){
        const next = update(cfg => {
          cfg.profile.displayName = '';
          cfg.profile.sharedDevice = true;
          return cfg;
        });
        renderHubStatus(next);
        renderHomeReadiness();
        toast('PROFILE CLEARED', 'The linked name was removed from this device.', 'warn');
      });
    }
  }

  function findSectionTitle(section){
    const node = section && (section.querySelector('.st') || section.querySelector('h2') || section.querySelector('h3'));
    return (node && node.textContent || '').trim().toUpperCase();
  }
  function closeNameModalIfNeeded(){
    const modal = document.getElementById('m-name');
    if (modal) modal.classList.remove('on');
  }
  function syncGlobalToCFG(){
    const data = read();
    applySuiteClasses(data);
    const cfg = getModuleCFG();
    if (!cfg) return data;
    if (!data.profile.displayName && cfg.playerName) {
      data.profile.displayName = String(cfg.playerName || '').trim().slice(0,28);
      data.profile.sharedDevice = !data.profile.displayName;
      write(data);
    }
    GLOBAL_ACCESS_KEYS.forEach(key => {
      if (key in cfg) cfg[key] = data.accessibility[key];
    });
    if ('colorblind' in cfg) cfg.colorblind = data.accessibility.colorblindMode !== 'none';
    if ('playerName' in cfg) cfg.playerName = data.profile.displayName || null;
    if ('playerNamePrompted' in cfg) cfg.playerNamePrompted = true;
    return data;
  }
  function syncCFGToGlobal(){
    const cfg = getModuleCFG();
    if (!cfg) return read();
    return update(data => {
      GLOBAL_ACCESS_KEYS.forEach(key => {
        if (key in cfg) data.accessibility[key] = cfg[key];
      });
      const name = typeof cfg.playerName === 'string' ? cfg.playerName.trim().slice(0,28) : '';
      if (name || !data.profile.displayName) {
        data.profile.displayName = name;
        data.profile.sharedDevice = !name;
      }
      return data;
    });
  }
  function rethemeModuleHome(){
    const data = read();
    const sub = document.getElementById('home-sub');
    if (!sub) return;
    const name = data.profile.displayName;
    sub.innerHTML = name
      ? `Back on deck, <strong style="color:var(--green)">${escapeHTML(name)}</strong>. Systems online. Choose any training run at your own pace.`
      : 'Systems online. Choose any training run and build real-world skills one mission at a time.';
  }
  function rethemeModuleNameSection(){
    const display = document.getElementById('name-setting-display');
    const btn = document.getElementById('name-setting-btn');
    const clearBtn = document.getElementById('clear-name-btn');
    const data = read();
    if (display) display.textContent = data.profile.displayName ? `Linked Profile: ${data.profile.displayName}` : 'No profile linked';
    if (btn) {
      btn.textContent = 'Open Control Panel';
      btn.onclick = function(){ location.href = controlUrl(); };
    }
    if (clearBtn) {
      clearBtn.style.display = data.profile.displayName ? 'block' : 'none';
      clearBtn.textContent = 'Clear Profile From Device';
      clearBtn.onclick = function(){
        update(cfg => {
          cfg.profile.displayName = '';
          cfg.profile.sharedDevice = true;
          return cfg;
        });
        const cfg = getModuleCFG();
        if (cfg) {
          cfg.playerName = null;
          cfg.playerNamePrompted = true;
          try { if (typeof window.saveAll === 'function') window.saveAll(); } catch(_e){}
          try { if (typeof window.updateHomeUI === 'function') window.updateHomeUI(); } catch(_e){}
        }
        rethemeModuleNameSection();
        toast('PROFILE CLEARED', 'The linked profile was removed from this device.', 'warn');
      };
    }
    document.querySelectorAll('#scr-settings .ss').forEach(section => {
      if (findSectionTitle(section) === 'PLAYER NAME (OPTIONAL)') {
        const hdr = section.querySelector('.st');
        if (hdr) hdr.textContent = 'PROFILE LINK';
        const desc = section.querySelector('.sd2');
        if (desc) desc.textContent = 'Managed from the Control Panel so every module uses the same linked profile.';
      }
    });
  }
  function injectModuleShortcut(){
    const screen = document.getElementById('scr-settings');
    if (!screen || screen.querySelector('.lr-control-shortcut')) return;
    const firstSection = screen.querySelector('.ss');
    const box = document.createElement('div');
    box.className = 'lr-control-shortcut';
    box.innerHTML = `
      <div class="st">CONTROL PANEL</div>
      <div class="lr-cta">
        <div class="lr-copy">Open Control Panel to manage your profile link, support systems, and local settings.</div>
        <button type="button">Open Control Panel</button>
      </div>`;
    const btn = box.querySelector('button');
    btn.addEventListener('click', function(){ location.href = controlUrl(); });
    if (firstSection) screen.insertBefore(box, firstSection);
  }
  function patchModuleGlobals(){
    let saveGuard = false;
    if (typeof window.loadAll === 'function' && !window.loadAll.__lrPatched) {
      const originalLoad = window.loadAll;
      window.loadAll = function(){
        const result = originalLoad.apply(this, arguments);
        syncGlobalToCFG();
        closeNameModalIfNeeded();
        return result;
      };
      window.loadAll.__lrPatched = true;
    }
    if (typeof window.saveAll === 'function' && !window.saveAll.__lrPatched) {
      const originalSave = window.saveAll;
      window.saveAll = function(){
        if (!saveGuard) {
          saveGuard = true;
          try { syncCFGToGlobal(); } catch(_e){}
        }
        const result = originalSave.apply(this, arguments);
        saveGuard = false;
        return result;
      };
      window.saveAll.__lrPatched = true;
    }
    if (typeof window.updateHomeUI === 'function' && !window.updateHomeUI.__lrPatched) {
      const originalUpdateHomeUI = window.updateHomeUI;
      window.updateHomeUI = function(){
        const result = originalUpdateHomeUI.apply(this, arguments);
        rethemeModuleHome();
        rethemeModuleNameSection();
        return result;
      };
      window.updateHomeUI.__lrPatched = true;
    }
    window.openNamePrompt = function(){
      const cfg = getModuleCFG();
      if (cfg) {
        cfg.playerNamePrompted = true;
        try { if (typeof window.saveAll === 'function') window.saveAll(); } catch(_e){}
      }
      closeNameModalIfNeeded();
    };
    window.clearName = function(){
      update(cfg => {
        cfg.profile.displayName = '';
        cfg.profile.sharedDevice = true;
        return cfg;
      });
      const cfg = getModuleCFG();
      if (cfg) {
        cfg.playerName = null;
        cfg.playerNamePrompted = true;
        try { if (typeof window.saveAll === 'function') window.saveAll(); } catch(_e){}
        try { if (typeof window.updateHomeUI === 'function') window.updateHomeUI(); } catch(_e){}
      }
      closeNameModalIfNeeded();
      rethemeModuleNameSection();
    };
  }
  function initModule(){
    patchModuleGlobals();
    const data = syncGlobalToCFG();
    try { if (typeof window.applySettings === 'function') window.applySettings(); } catch(_e){}
    try { if (typeof window.renderSettings === 'function') window.renderSettings(); } catch(_e){}
    try { if (typeof window.updateHomeUI === 'function') window.updateHomeUI(); } catch(_e){ rethemeModuleHome(); }
    injectModuleShortcut();
    rethemeModuleNameSection();
    closeNameModalIfNeeded();
    applySuiteClasses(data);
    logActivity(moduleFromFile(currentFile()));
  }

  function setControlToggle(el, isOn){
    el.classList.toggle('on', !!isOn);
    el.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    const state = el.querySelector('.cp-toggle-state');
    if (state) state.textContent = isOn ? 'ONLINE' : 'STANDBY';
  }
  function fillRecentList(selector, items){
    const host = document.querySelector(selector);
    if (!host) return;
    const isReport = /^#rr-/.test(selector);
    const rowClass = isReport ? 'rr-log-row' : 'cp-log-row';
    const emptyClass = isReport ? 'rr-empty' : 'cp-empty';
    if (!items.length) {
      host.innerHTML = `<div class="${emptyClass}">No mission activity logged yet. Start anywhere. The report will fill itself in.</div>`;
      return;
    }
    host.innerHTML = items.map(item => `<div class="${rowClass}"><strong>${escapeHTML(item.label)}</strong><span>${escapeHTML(item.deck)} · ${escapeHTML(formatAgo(item.at))}</span></div>`).join('');
  }
  function refreshControlPanel(){
    const data = read();
    const readiness = buildReadiness();
    applySuiteClasses(data);
    const name = data.profile.displayName;
    const header = document.getElementById('cp-status-title');
    const copy = document.getElementById('cp-status-copy');
    const note = document.getElementById('cp-device-note');
    const input = document.getElementById('cp-name');
    if (header) header.textContent = name ? `BACK ON DECK, ${name.toUpperCase()}` : 'SYSTEMS ONLINE';
    if (copy) copy.textContent = name ? 'Profile linked. Support systems ready.' : 'Link a display name here, or use Shared Device Mode.';
    if (note) note.textContent = data.profile.sharedDevice ? 'Shared Device Mode active. Best for classrooms, programs, families, and support teams.' : 'Personal Device Mode active. Your linked profile is saved on this device.';
    if (input && document.activeElement !== input) input.value = name;
    const profileState = document.getElementById('cp-sum-profile');
    const supportState = document.getElementById('cp-sum-supports');
    const deckState = document.getElementById('cp-sum-decks');
    const rankState = document.getElementById('cp-sum-rank');
    if (profileState) profileState.textContent = name ? name : 'Shared Device';
    if (supportState) supportState.textContent = `${readiness.activeSupports} online`;
    if (deckState) deckState.textContent = `${readiness.visibleDecks} visible`;
    if (rankState) rankState.textContent = readiness.currentRank;
    const presetState = document.getElementById('cp-preset-state');
    if (presetState) presetState.textContent = readiness.activePreset ? PRESETS[readiness.activePreset].label : 'Custom Setup';

    document.querySelectorAll('[data-access-key]').forEach(btn => {
      const key = btn.getAttribute('data-access-key');
      setControlToggle(btn, !!data.accessibility[key]);
    });
    document.querySelectorAll('[data-speed]').forEach(btn => btn.classList.toggle('on', btn.getAttribute('data-speed') === data.accessibility.speed));
    document.querySelectorAll('[data-cb-mode]').forEach(btn => btn.classList.toggle('on', btn.getAttribute('data-cb-mode') === data.accessibility.colorblindMode));
    document.querySelectorAll('[data-preset]').forEach(btn => btn.classList.toggle('on', btn.getAttribute('data-preset') === readiness.activePreset));
    document.querySelectorAll('[data-module-key]').forEach(btn => {
      const key = btn.getAttribute('data-module-key');
      const enabled = data.modules[key] ? data.modules[key].enabled !== false : true;
      btn.classList.toggle('on', enabled);
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      const state = btn.querySelector('.cp-chip-state');
      if (state) state.textContent = enabled ? 'ACTIVE' : 'HIDDEN';
    });
    fillRecentList('#cp-recent-list', readiness.recent.slice(0,4));
  }
  function applyPreset(key){
    const preset = PRESETS[key];
    if (!preset) return read();
    return update(cfg => {
      cfg.accessibility = merge(cfg.accessibility, preset.accessibility);
      return cfg;
    });
  }
  function initControlPanel(){
    refreshControlPanel();
    const nameInput = document.getElementById('cp-name');
    const saveNameBtn = document.getElementById('cp-save-name');
    const clearNameBtn = document.getElementById('cp-clear-name');
    const sharedBtn = document.getElementById('cp-shared-device');
    const resetBtn = document.getElementById('cp-reset-suite');
    const wipeBtn = document.getElementById('cp-clear-local');

    if (saveNameBtn && nameInput) saveNameBtn.addEventListener('click', function(){
      const displayName = (nameInput.value || '').trim().slice(0,28);
      update(cfg => {
        cfg.profile.displayName = displayName;
        cfg.profile.sharedDevice = !displayName;
        return cfg;
      });
      refreshControlPanel();
      toast(displayName ? 'PROFILE LINKED' : 'SHARED DEVICE MODE', displayName ? `${displayName} is now linked on this device.` : 'This device is now set to shared mode.', 'success');
    });

    if (clearNameBtn) clearNameBtn.addEventListener('click', function(){
      update(cfg => {
        cfg.profile.displayName = '';
        cfg.profile.sharedDevice = true;
        return cfg;
      });
      refreshControlPanel();
      toast('PROFILE CLEARED', 'The linked profile was removed from this device.', 'warn');
    });

    if (sharedBtn) sharedBtn.addEventListener('click', function(){
      const next = update(cfg => {
        cfg.profile.sharedDevice = !cfg.profile.sharedDevice;
        if (cfg.profile.sharedDevice) cfg.profile.displayName = '';
        return cfg;
      });
      refreshControlPanel();
      toast('DEVICE MODE UPDATED', next.profile.sharedDevice ? 'Shared Device Mode is now active.' : 'Personal Device Mode is now active.', 'success');
    });

    document.querySelectorAll('[data-access-key]').forEach(btn => {
      btn.addEventListener('click', function(){
        const key = btn.getAttribute('data-access-key');
        const next = update(cfg => { cfg.accessibility[key] = !cfg.accessibility[key]; return cfg; });
        refreshControlPanel();
        toast('SUPPORT SYSTEMS UPDATED', `${btn.querySelector('.cp-toggle-title').textContent} is now ${next.accessibility[key] ? 'online' : 'on standby'}.`, next.accessibility[key] ? 'success' : '');
      });
    });
    document.querySelectorAll('[data-speed]').forEach(btn => {
      btn.addEventListener('click', function(){
        const speed = btn.getAttribute('data-speed');
        update(cfg => { cfg.accessibility.speed = speed; return cfg; });
        refreshControlPanel();
        toast('SPEECH SPEED UPDATED', `${btn.textContent} is now the default speed.`, 'success');
      });
    });
    document.querySelectorAll('[data-cb-mode]').forEach(btn => {
      btn.addEventListener('click', function(){
        const mode = btn.getAttribute('data-cb-mode');
        update(cfg => { cfg.accessibility.colorblindMode = mode; return cfg; });
        refreshControlPanel();
        toast('DISPLAY DEFAULT UPDATED', `${btn.textContent} mode saved as the default.`, 'success');
      });
    });
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', function(){
        const key = btn.getAttribute('data-preset');
        applyPreset(key);
        refreshControlPanel();
        toast('PRESET APPLIED', `${PRESETS[key].label} is now active.`, 'success');
      });
    });
    document.querySelectorAll('[data-module-key]').forEach(btn => {
      btn.addEventListener('click', function(){
        const key = btn.getAttribute('data-module-key');
        const mod = moduleFromKey(key);
        const next = update(cfg => {
          cfg.modules[key].enabled = !cfg.modules[key].enabled;
          return cfg;
        });
        refreshControlPanel();
        toast('MISSION DECK UPDATED', `${mod ? mod.label : key} is now ${next.modules[key].enabled ? 'visible on the homepage' : 'hidden from the homepage'}.`, next.modules[key].enabled ? 'success' : '');
      });
    });

    if (resetBtn) resetBtn.addEventListener('click', function(){
      if (!window.confirm('Reset the Control Panel to default settings?')) return;
      write(clone(DEFAULTS));
      refreshControlPanel();
      toast('CONTROL PANEL RESET', 'Suite-wide settings were restored to defaults.', 'warn');
    });

    if (wipeBtn) wipeBtn.addEventListener('click', function(){
      if (!window.confirm('Clear LifeReady data saved on this device? This removes Control Panel settings, module progress, readiness history, and Mission Control data stored locally.')) return;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (/(^lr_)|(_cfg$)|(^cr_cfg$)|(^tr_cfg$)|(^tr5_cfg$)|(^jr_cfg$)|(^hr_cfg$)|(^sr_cfg$)|(^tc_cfg$)|(^hlr_cfg$)/.test(key)) keysToRemove.push(key);
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      refreshControlPanel();
      toast('LOCAL CONSOLE CLEARED', 'LifeReady data was removed from this browser on this device.', 'warn');
    });

    const returnLink = document.getElementById('cp-return-link');
    if (returnLink) {
      const params = new URLSearchParams(location.search);
      const target = params.get('return') || 'index.html';
      returnLink.setAttribute('href', target);
    }
  }

  function renderReport(){
    const readiness = buildReadiness();
    applySuiteClasses(readiness.control);
    const title = document.getElementById('rr-title');
    const copy = document.getElementById('rr-copy');
    const badge = document.getElementById('rr-profile');
    if (title) title.textContent = readiness.control.profile.displayName ? `READINESS REPORT · ${readiness.control.profile.displayName.toUpperCase()}` : 'READINESS REPORT';
    if (copy) copy.textContent = 'Check recent practice, active support systems, and overall momentum at your own pace.';
    if (badge) badge.textContent = readiness.control.profile.displayName ? `${readiness.control.profile.displayName} linked on this device` : 'Shared Device Mode active';
    const map = {
      'rr-rank': readiness.currentRank,
      'rr-xp': String(readiness.progress.totalXP || 0),
      'rr-sessions': String(readiness.progress.sessions || 0),
      'rr-modules': String(readiness.engagedModules.length),
      'rr-supports': String(readiness.activeSupports),
      'rr-visible': String(readiness.visibleDecks)
    };
    Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el) el.textContent = map[id]; });
    fillRecentList('#rr-recent-list', readiness.recent.slice(0,6));
    const supportList = document.getElementById('rr-support-list');
    if (supportList) {
      const items = [];
      const access = readiness.control.accessibility;
      if (readiness.control.profile.sharedDevice) items.push('Shared Device Mode active');
      if (access.audio) items.push('Audio prompts online');
      if (access.largetext) items.push('Large Text active');
      if (access.largebtns) items.push('Extra-Large Buttons active');
      if (access.nomotion) items.push('Reduce Motion active');
      if (access.hicontrast) items.push('High Contrast active');
      if (access.lightmode) items.push('Light Mode active');
      if (access.breaks) items.push('Break Reminders active');
      if (access.errorless) items.push('Errorless Learning active');
      if (access.speed !== 'normal') items.push(`Speech Speed set to ${access.speed}`);
      if (access.colorblindMode !== 'none') items.push(`${access.colorblindMode} display mode default`);
      supportList.innerHTML = (items.length ? items : ['Standard support systems active']).map(item => `<div class="rr-chip">${escapeHTML(item)}</div>`).join('');
    }
    const moduleList = document.getElementById('rr-module-list');
    if (moduleList) {
      if (!readiness.engagedModules.length) {
        moduleList.innerHTML = `<div class="rr-empty">No training sessions have been logged yet. Start any mission and this board will update on its own.</div>`;
      } else {
        moduleList.innerHTML = readiness.engagedModules.map(mod => `
          <div class="rr-module-card">
            <div class="rr-module-head">
              <div>
                <div class="rr-module-title">${escapeHTML(mod.label)}</div>
                <div class="rr-module-sub">${escapeHTML(mod.deck)}</div>
              </div>
              <div class="rr-module-time">${mod.lastPlayed ? escapeHTML(formatAgo(mod.lastPlayed)) : 'recently'}</div>
            </div>
            <div class="rr-bar"><span style="width:${Math.max(6, Math.min(100, mod.mastery || 0))}%"></span></div>
            <div class="rr-module-metrics">
              <span>${mod.sessions} session${mod.sessions === 1 ? '' : 's'}</span>
              <span>${mod.mastery}% readiness</span>
              <span>${mod.bestPct}% best score</span>
            </div>
            <div class="rr-module-mode">${mod.lastMode ? `Last mode: ${escapeHTML(mod.lastMode)}` : 'Mission activity detected'}</div>
          </div>`).join('');
      }
    }
  }

  function boot(){
    const file = currentFile();
    if (file === 'index.html' || file === '') initHub();
    else if (document.body && document.body.hasAttribute('data-lr-control-panel')) initControlPanel();
    else if (document.body && document.body.hasAttribute('data-lr-readiness-report')) renderReport();
    else if (/Ready\.html$/i.test(file) && file !== 'MissionControl.html') initModule();
    else applySuiteClasses(read());
  }

  window.LifeReadyControl = {
    STORAGE_KEY,
    MODULES,
    defaults: clone(DEFAULTS),
    presets: clone(PRESETS),
    read,
    write,
    update,
    readProgress,
    buildReadiness,
    applySuiteClasses,
    controlUrl,
    toast
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
