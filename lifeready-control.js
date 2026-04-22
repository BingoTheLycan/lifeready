(function(){
  const STORAGE_KEY = 'lr_control_v1';
  const MODULES = [
    { key:'CashReady', file:'CashReady.html', label:'CashReady', accent:'#00c851', deck:'Neon Checkout Deck' },
    { key:'TimeReady', file:'TimeReady.html', label:'TimeReady', accent:'#33b5e5', deck:'Chrono Training Deck' },
    { key:'JobReady', file:'JobReady.html', label:'JobReady', accent:'#ffbb33', deck:'Career Command Deck' },
    { key:'HomeReady', file:'HomeReady.html', label:'HomeReady', accent:'#e8650a', deck:'Home Systems Deck' },
    { key:'TravelReady', file:'TravelReady.html', label:'TravelReady', accent:'#00bcd4', deck:'Transit Navigation Deck' },
    { key:'SocialReady', file:'SocialReady.html', label:'SocialReady', accent:'#9c27b0', deck:'Communication Deck' },
    { key:'TechReady', file:'TechReady.html', label:'TechReady', accent:'#cc2200', deck:'Digital Systems Deck' },
    { key:'HealthReady', file:'HealthReady.html', label:'HealthReady', accent:'#e91e8c', deck:'Med Bay Deck' }
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
  function moduleFromFile(file){ return MODULES.find(mod => mod.file === file) || null; }
  function currentFile(){
    const bits = (location.pathname || '').split('/');
    return bits[bits.length - 1] || 'index.html';
  }

  function injectSharedStyles(){
    if (document.getElementById('lr-suite-shared-style')) return;
    const style = document.createElement('style');
    style.id = 'lr-suite-shared-style';
    style.textContent = `
      body.lr-suite-light{background:#eef3fb !important;color:#10253c !important;}
      body.lr-suite-light .hero, body.lr-suite-light .cp-shell{background:radial-gradient(circle at top, rgba(65,130,255,.14), transparent 55%), linear-gradient(180deg,#f6f9ff,#e7eef9) !important;}
      body.lr-suite-contrast{background:#000 !important;color:#fff !important;}
      body.lr-suite-contrast *{text-shadow:none !important;box-shadow:none !important;}
      body.lr-suite-contrast .info-card, body.lr-suite-contrast .quick-card, body.lr-suite-contrast .app-card, body.lr-suite-contrast .cp-card{background:#000 !important;border-color:#fff !important;color:#fff !important;}
      body.lr-suite-large-text{font-size:18px;}
      body.lr-suite-large-text .hero-copy, body.lr-suite-large-text .hero-trust, body.lr-suite-large-text .info-card p, body.lr-suite-large-text .cp-copy, body.lr-suite-large-text .cp-field-copy{font-size:1rem !important;line-height:1.6 !important;}
      body.lr-suite-large-btns .btn, body.lr-suite-large-btns button, body.lr-suite-large-btns input, body.lr-suite-large-btns .cp-toggle, body.lr-suite-large-btns .cp-chip{min-height:52px !important;padding-top:13px !important;padding-bottom:13px !important;}
      body.lr-suite-no-motion *, body.lr-suite-no-motion *::before, body.lr-suite-no-motion *::after{animation:none !important;transition:none !important;scroll-behavior:auto !important;}
      .lr-control-shortcut{margin-bottom:16px;padding:14px;border:1px solid rgba(92,240,255,.28);border-radius:16px;background:linear-gradient(135deg,rgba(92,240,255,.10),rgba(125,94,255,.06));}
      .lr-control-shortcut .st{margin-top:0;}
      .lr-control-shortcut .lr-cta{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;}
      .lr-control-shortcut .lr-copy{font-size:.78rem;line-height:1.55;color:var(--text2, #b8c3d2);max-width:560px;}
      .lr-control-shortcut button{border:1px solid rgba(92,240,255,.4);background:rgba(92,240,255,.12);color:var(--green, #5cf0ff);padding:10px 14px;border-radius:12px;font-weight:700;cursor:pointer;}
      .lr-suite-hidden{display:none !important;}
      .lr-status-note{margin:16px auto 0;max-width:840px;display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;border-radius:999px;border:1px solid rgba(255,207,102,.28);background:linear-gradient(135deg,rgba(255,207,102,.10),rgba(92,240,255,.08));font-family:ui-monospace, SFMono-Regular, Menlo, monospace;letter-spacing:1.4px;font-size:.74rem;color:#eef6ff;box-shadow:0 0 0 1px rgba(255,255,255,.02) inset;}
      .lr-status-note strong{color:#ffcf66;}
      .lr-status-note::before{content:'◢';color:#5cf0ff;font-size:.86rem;line-height:1;}
      .lr-home-form{display:grid;gap:12px;}
      .lr-home-form label{font-family:ui-monospace, SFMono-Regular, Menlo, monospace;font-size:.72rem;letter-spacing:2px;text-transform:uppercase;color:#8fc4ff;}
      .lr-home-form input{width:100%;padding:14px 16px;border-radius:14px;border:1px solid rgba(143,196,255,.3);background:rgba(7,14,25,.82);color:#e9f6ff;font-size:1rem;}
      .lr-home-form input::placeholder{color:#7a90aa;}
      .lr-home-actions{display:flex;gap:10px;flex-wrap:wrap;}
      .lr-home-actions .btn{flex:1 1 160px;}
      .lr-home-chiprow{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;}
      .lr-home-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(143,196,255,.25);background:rgba(9,18,31,.74);border-radius:999px;padding:7px 12px;font-size:.74rem;letter-spacing:.4px;color:#d7e9ff;}
      .lr-home-chip.off{opacity:.7;}
    `;
    document.head.appendChild(style);
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
    try {
      if (typeof CFG !== 'undefined' && CFG && typeof CFG === 'object') return CFG;
    } catch(_e){}
    try {
      if (window.CFG && typeof window.CFG === 'object') return window.CFG;
    } catch(_e){}
    return null;
  }

  function controlUrl(){
    const file = currentFile();
    return `ControlPanel.html?return=${encodeURIComponent(file)}`;
  }

  function renderHubStatus(data){
    const title = document.getElementById('lr-hub-title');
    const copy = document.getElementById('lr-hub-copy');
    const note = document.getElementById('lr-hub-note');
    const nameInput = document.getElementById('lr-home-name');
    const clearBtn = document.getElementById('lr-home-clear');
    const heroNote = document.getElementById('lr-hero-status');
    const name = data.profile.displayName;
    if (title) title.textContent = name ? `BACK ON DECK, ${name.toUpperCase()}` : 'SYSTEMS ONLINE';
    if (copy) copy.textContent = name ? 'Training profile linked. Your suite-wide settings are ready across every module.' : 'Link your profile once here, then carry your name and learning setup across the whole suite.';
    if (note) note.textContent = data.profile.sharedDevice ? 'Shared Device Mode active. Use initials or a nickname if other people use this computer, phone, or tablet.' : 'Personal Device Mode active. Your name and suite settings stay linked on this device.';
    if (nameInput) nameInput.value = name || '';
    if (clearBtn) clearBtn.textContent = name ? 'Clear Profile From Device' : 'Use Shared Device Mode';
    if (heroNote) heroNote.innerHTML = name
      ? `<strong>COMMAND LINKED</strong> · ${name} · ${data.profile.sharedDevice ? 'SHARED DEVICE MODE' : 'PERSONAL DEVICE MODE'}`
      : '<strong>COMMAND LINK OFFLINE</strong> · Link a profile below once and every training deck will recognize it';
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
      });
    }
  }

  function findSectionTitle(section){
    if (!section) return '';
    const title = section.querySelector('.st');
    return title ? title.textContent.trim().toUpperCase() : '';
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
      ? `Back on deck, <strong style="color:var(--green)">${name}</strong>. Systems online. Choose your next training run.`
      : 'Systems online. Choose a training run and build real-world skills one mission at a time.';
  }

  function rethemeModuleNameSection(){
    const display = document.getElementById('name-setting-display');
    const btn = document.getElementById('name-setting-btn');
    const clearBtn = document.getElementById('clear-name-btn');
    const data = read();
    if (display) display.textContent = data.profile.displayName ? `Linked Profile: ${data.profile.displayName}` : 'No suite profile linked';
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
      };
    }

    document.querySelectorAll('#scr-settings .ss').forEach(section => {
      if (findSectionTitle(section) === 'PLAYER NAME (OPTIONAL)') {
        const hdr = section.querySelector('.st');
        if (hdr) hdr.textContent = 'SUITE PROFILE';
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
        <div class="lr-copy">Link your display name once, set suite-wide accessibility defaults, and set suite-wide support defaults without repeating the same setup in every module.</div>
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
  }

  function setControlToggle(el, isOn){
    el.classList.toggle('on', !!isOn);
    el.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    const state = el.querySelector('.cp-toggle-state');
    if (state) state.textContent = isOn ? 'ONLINE' : 'STANDBY';
  }

  function refreshControlPanel(){
    const data = read();
    applySuiteClasses(data);
    const name = data.profile.displayName;
    const header = document.getElementById('cp-status-title');
    const copy = document.getElementById('cp-status-copy');
    const note = document.getElementById('cp-device-note');
    const input = document.getElementById('cp-name');
    if (header) header.textContent = name ? `BACK ON DECK, ${name.toUpperCase()}` : 'SYSTEMS ONLINE';
    if (copy) copy.textContent = name ? 'Profile linked. Your command settings are active across every enabled training deck.' : 'Link a display name once, then let the whole suite carry it for you.';
    if (note) note.textContent = data.profile.sharedDevice ? 'Shared Device Mode active. This is best for schools, programs, families, and support teams.' : 'Personal Device Mode active. Your linked profile is saved on this device.';
    if (input && document.activeElement !== input) input.value = name;

    document.querySelectorAll('[data-access-key]').forEach(btn => {
      const key = btn.getAttribute('data-access-key');
      setControlToggle(btn, !!data.accessibility[key]);
    });
    document.querySelectorAll('[data-speed]').forEach(btn => btn.classList.toggle('on', btn.getAttribute('data-speed') === data.accessibility.speed));
    document.querySelectorAll('[data-cb-mode]').forEach(btn => btn.classList.toggle('on', btn.getAttribute('data-cb-mode') === data.accessibility.colorblindMode));
    document.querySelectorAll('[data-module-key]').forEach(btn => {
      const key = btn.getAttribute('data-module-key');
      const enabled = data.modules[key] ? data.modules[key].enabled !== false : true;
      btn.classList.toggle('on', enabled);
      btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      const state = btn.querySelector('.cp-chip-state');
      if (state) state.textContent = enabled ? 'ACTIVE' : 'HIDDEN';
    });
  }

  function initControlPanel(){
    const data = read();
    applySuiteClasses(data);
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
    });

    if (clearNameBtn) clearNameBtn.addEventListener('click', function(){
      update(cfg => {
        cfg.profile.displayName = '';
        cfg.profile.sharedDevice = true;
        return cfg;
      });
      refreshControlPanel();
    });

    if (sharedBtn) sharedBtn.addEventListener('click', function(){
      update(cfg => {
        cfg.profile.sharedDevice = !cfg.profile.sharedDevice;
        if (cfg.profile.sharedDevice) cfg.profile.displayName = '';
        return cfg;
      });
      refreshControlPanel();
    });

    document.querySelectorAll('[data-access-key]').forEach(btn => {
      btn.addEventListener('click', function(){
        const key = btn.getAttribute('data-access-key');
        update(cfg => {
          cfg.accessibility[key] = !cfg.accessibility[key];
          return cfg;
        });
        refreshControlPanel();
      });
    });
    document.querySelectorAll('[data-speed]').forEach(btn => {
      btn.addEventListener('click', function(){
        const speed = btn.getAttribute('data-speed');
        update(cfg => { cfg.accessibility.speed = speed; return cfg; });
        refreshControlPanel();
      });
    });
    document.querySelectorAll('[data-cb-mode]').forEach(btn => {
      btn.addEventListener('click', function(){
        const mode = btn.getAttribute('data-cb-mode');
        update(cfg => { cfg.accessibility.colorblindMode = mode; return cfg; });
        refreshControlPanel();
      });
    });
    document.querySelectorAll('[data-module-key]').forEach(btn => {
      btn.addEventListener('click', function(){
        const key = btn.getAttribute('data-module-key');
        update(cfg => {
          cfg.modules[key].enabled = !cfg.modules[key].enabled;
          return cfg;
        });
        refreshControlPanel();
      });
    });

    if (resetBtn) resetBtn.addEventListener('click', function(){
      if (!window.confirm('Reset the Control Panel to default suite settings?')) return;
      write(clone(DEFAULTS));
      refreshControlPanel();
    });

    if (wipeBtn) wipeBtn.addEventListener('click', function(){
      if (!window.confirm('Clear LifeReady data saved on this device? This removes suite settings, module progress, and Mission Control data stored locally.')) return;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (/(^lr_)|(_cfg$)|(^cr_cfg$)|(^tr_cfg$)|(^tr5_cfg$)|(^jr_cfg$)|(^hr_cfg$)|(^sr_cfg$)|(^tc_cfg$)|(^hlr_cfg$)/.test(key)) keysToRemove.push(key);
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      refreshControlPanel();
    });

    const returnLink = document.getElementById('cp-return-link');
    if (returnLink) {
      const params = new URLSearchParams(location.search);
      const target = params.get('return') || 'index.html';
      returnLink.setAttribute('href', target);
    }
  }

  function boot(){
    const file = currentFile();
    if (file === 'index.html' || file === '') initHub();
    else if (document.body && document.body.hasAttribute('data-lr-control-panel')) initControlPanel();
    else if (/Ready\.html$/i.test(file) && file !== 'MissionControl.html') initModule();
    else applySuiteClasses(read());
  }

  window.LifeReadyControl = {
    STORAGE_KEY,
    MODULES,
    defaults: clone(DEFAULTS),
    read,
    write,
    update,
    applySuiteClasses,
    controlUrl
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
