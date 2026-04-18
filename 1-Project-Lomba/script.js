/* ===================================================
   PORTAL LOMBA KEMERDEKAAN — JavaScript
   Vanilla JS · localStorage · SPA · No Framework
   =================================================== */

'use strict';

/* ——— GLOBAL STATE ——— */
let state = {
  sport: null,
  teams: [],
  bracket: [],
  scores: { left: 0, right: 0 },
  scoreTeams: { left: '', right: '' },
  scoreHistory: []
};

/* ——— INIT ——— */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderHub();
  renderTeams();
  updateHeaderBadge();
  populateScoreSelects();
  updateHubStats();
  restoreScores();

  // Restore current section from sessionStorage
  const lastSection = sessionStorage.getItem('portal-section') || 'hub';
  showSection(lastSection);
  setActiveNav(lastSection);
});

/* =========================================================
   NAVIGATION (SPA)
   ========================================================= */

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const target = document.getElementById(id);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }
  sessionStorage.setItem('portal-section', id);

  // Side effects per section
  if (id === 'teams') renderTeams();
  if (id === 'bracket') renderBracket(state.bracket);
  if (id === 'scoreboard') { populateScoreSelects(); restoreScores(); }
  if (id === 'hub') { updateHubStats(); }
}

function navTo(sectionId) {
  showSection(sectionId);
  setActiveNav(sectionId);
}

function setActiveNav(sectionId) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
  });
}

/* =========================================================
   LOCAL STORAGE — Save / Load
   ========================================================= */

const LS_KEY = 'portal-lomba-data';

function saveState() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      sport:        state.sport,
      teams:        state.teams,
      bracket:      state.bracket,
      scores:       state.scores,
      scoreTeams:   state.scoreTeams,
      scoreHistory: state.scoreHistory
    }));
  } catch (e) {
    console.warn('Gagal menyimpan ke localStorage:', e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.sport        = saved.sport        || null;
    state.teams        = saved.teams        || [];
    state.bracket      = saved.bracket      || [];
    state.scores       = saved.scores       || { left: 0, right: 0 };
    state.scoreTeams   = saved.scoreTeams   || { left: '', right: '' };
    state.scoreHistory = saved.scoreHistory || [];
  } catch (e) {
    console.warn('Gagal memuat localStorage:', e);
  }
}

/* =========================================================
   HUB
   ========================================================= */

function selectSport(sport) {
  state.sport = sport;
  saveState();
  updateHeaderBadge();
  updateHubStats();

  // Visual feedback
  document.querySelectorAll('.sport-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.sport === sport);
  });

  showToast(`Cabang ${sport === 'futsal' ? '⚽ Futsal' : '🏀 Basket'} dipilih!`);

  // Navigate to teams after short delay
  setTimeout(() => navTo('teams'), 400);
}

function updateHeaderBadge() {
  const badge = document.getElementById('header-sport-badge');
  if (!badge) return;
  if (state.sport) {
    badge.textContent = state.sport === 'futsal' ? '⚽ FUTSAL' : '🏀 BASKET';
    badge.classList.add('header-sport-badge');
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

function renderHub() {
  // Restore selected sport card
  if (state.sport) {
    document.querySelectorAll('.sport-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.sport === state.sport);
    });
  }
}

function updateHubStats() {
  const el = document.getElementById('hub-stats');
  if (!el) return;
  const sportLabel = state.sport
    ? (state.sport === 'futsal' ? '⚽ Futsal' : '🏀 Basket')
    : '–';
  el.innerHTML = `
    <div class="stat-pill">Tim terdaftar: <span>${state.teams.length}</span></div>
    <div class="stat-pill">Cabang: <span>${sportLabel}</span></div>
    ${state.bracket.length ? `<div class="stat-pill">Babak: <span>${getBracketRoundName(state.teams.length)}</span></div>` : ''}
  `;
}

/* =========================================================
   TEAM MANAGEMENT
   ========================================================= */

function addTeam() {
  const nameEl    = document.getElementById('input-team-name');
  const playersEl = document.getElementById('input-players');

  const name    = nameEl.value.trim();
  const players = playersEl.value.split(',').map(p => p.trim()).filter(Boolean);

  // Validasi
  if (!name) {
    showToast('⚠️ Nama tim tidak boleh kosong!');
    nameEl.focus();
    return;
  }

  // Cek duplikat
  const isDuplicate = state.teams.some(t => t.name.toLowerCase() === name.toLowerCase());
  if (isDuplicate) {
    showToast('⚠️ Nama tim sudah ada!');
    nameEl.focus();
    return;
  }

  state.teams.push({ name, players });
  saveState();

  nameEl.value    = '';
  playersEl.value = '';
  nameEl.focus();

  renderTeams();
  populateScoreSelects();
  updateHubStats();
  showToast(`✅ Tim "${name}" berhasil ditambahkan!`);
}

function deleteTeam(index) {
  const teamName = state.teams[index]?.name || '';
  showConfirm(
    `Hapus Tim "${teamName}"?`,
    'Tindakan ini tidak dapat dibatalkan.',
    () => {
      state.teams.splice(index, 1);
      // Reset bracket jika tim berubah
      state.bracket = [];
      saveState();
      renderTeams();
      populateScoreSelects();
      updateHubStats();
      showToast(`🗑 Tim "${teamName}" dihapus.`);
    }
  );
}

function clearAllTeams() {
  if (state.teams.length === 0) {
    showToast('Tidak ada tim untuk dihapus.');
    return;
  }
  showConfirm(
    'Hapus Semua Tim?',
    `Semua ${state.teams.length} tim akan dihapus. Bagan juga akan direset.`,
    () => {
      state.teams   = [];
      state.bracket = [];
      saveState();
      renderTeams();
      renderBracket([]);
      populateScoreSelects();
      updateHubStats();
      showToast('🗑 Semua tim dihapus.');
    }
  );
}

function renderTeams() {
  const listEl   = document.getElementById('teams-list');
  const countEl  = document.getElementById('team-count-badge');
  const actionsEl = document.getElementById('team-actions');
  if (!listEl) return;

  if (countEl) countEl.textContent = `${state.teams.length} Tim`;

  if (state.teams.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <p>Belum ada tim yang terdaftar.<br>Tambahkan tim di atas!</p>
      </div>`;
    if (actionsEl) actionsEl.style.display = 'none';
    return;
  }

  if (actionsEl) actionsEl.style.display = 'flex';

  listEl.innerHTML = state.teams.map((team, i) => `
    <div class="team-item" id="team-item-${i}">
      <div class="team-header">
        <span class="team-num">#${String(i + 1).padStart(2, '0')}</span>
        <span class="team-name">${escapeHtml(team.name)}</span>
        <div class="team-actions">
          <button class="btn-icon btn-icon-expand" onclick="togglePlayers(${i})" title="Lihat pemain" aria-label="Lihat pemain">
            👁
          </button>
          <button class="btn-icon btn-icon-danger" onclick="deleteTeam(${i})" title="Hapus tim" aria-label="Hapus tim">
            ✕
          </button>
        </div>
      </div>
      <div class="team-players" id="players-${i}" style="display:none;">
        ${team.players.length > 0
          ? team.players.map(p => `<span class="player-tag">${escapeHtml(p)}</span>`).join('')
          : '<span class="player-tag" style="color:#bbb;">Tidak ada pemain</span>'
        }
      </div>
    </div>
  `).join('');
}

function togglePlayers(index) {
  const el = document.getElementById(`players-${index}`);
  if (!el) return;
  const isVisible = el.style.display !== 'none';
  el.style.display = isVisible ? 'none' : 'flex';
}

function copyTeams() {
  if (state.teams.length === 0) {
    showToast('Tidak ada data tim untuk disalin.');
    return;
  }
  const sport = state.sport ? state.sport.toUpperCase() : 'TIDAK DIATUR';
  let text = `🇮🇩 Portal Lomba Kemerdekaan\n`;
  text += `Cabang: ${sport}\n`;
  text += `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;
  text += `DAFTAR TIM (${state.teams.length} Tim)\n`;
  text += '='.repeat(30) + '\n';
  state.teams.forEach((t, i) => {
    text += `\n${i + 1}. ${t.name}\n`;
    if (t.players.length > 0) {
      text += `   Pemain: ${t.players.join(', ')}\n`;
    }
  });

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 Data tim berhasil disalin!');
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-100px;opacity:0;';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('📋 Data tim berhasil disalin!');
  } catch (e) {
    showToast('⚠️ Salin gagal, coba manual.');
  }
  document.body.removeChild(ta);
}

/* =========================================================
   BRACKET GENERATOR
   ========================================================= */

function generateBracket() {
  if (state.teams.length < 2) {
    showToast('⚠️ Minimal 2 tim untuk membuat bagan!');
    return;
  }

  // Shuffle tim untuk fairness
  const shuffled = shuffleArray([...state.teams]);

  // Tambahkan BYE jika jumlah ganjil
  const padded = [...shuffled];
  if (padded.length % 2 !== 0) {
    padded.push({ name: 'BYE', players: [], isBye: true });
  }

  // Build bracket rounds
  state.bracket = buildBracket(padded);
  saveState();
  renderBracket(state.bracket);
  updateHubStats();
  showToast('🏆 Bagan turnamen berhasil dibuat!');
}

function buildBracket(teams) {
  const rounds = [];
  let current = teams;

  while (current.length > 1) {
    const matches = [];
    for (let i = 0; i < current.length; i += 2) {
      matches.push({
        teamA: current[i],
        teamB: current[i + 1] || { name: 'BYE', isBye: true },
        winner: null
      });
    }
    rounds.push(matches);

    // Siapkan slot untuk ronde berikutnya
    current = new Array(Math.ceil(current.length / 2)).fill(null).map((_, i) => ({
      name: `Pemenang Match ${i + 1}`,
      isPlaceholder: true
    }));
  }

  return rounds;
}

function renderBracket(bracket) {
  const container  = document.getElementById('bracket-container');
  const emptyEl    = document.getElementById('bracket-empty');
  const infoEl     = document.getElementById('bracket-info');
  if (!container) return;

  if (!bracket || bracket.length === 0) {
    container.innerHTML = '';
    if (emptyEl)  emptyEl.classList.remove('hidden');
    if (infoEl)   infoEl.classList.add('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');
  if (infoEl) {
    infoEl.classList.remove('hidden');
    const realTeams = state.teams.length;
    infoEl.innerHTML = `🏆 ${getBracketRoundName(realTeams)} · ${realTeams} Tim · ${bracket.length} Ronde`;
  }

  container.innerHTML = bracket.map((round, ri) => `
    <div class="bracket-round">
      <div class="bracket-round-title">${getRoundName(ri, bracket.length)}</div>
      ${round.map((match, mi) => renderMatch(match, ri, mi)).join('')}
    </div>
  `).join('');
}

function renderMatch(match, roundIdx, matchIdx) {
  const teamAClass = match.teamA.isBye ? 'bye' : (match.winner === 'A' ? 'winner' : '');
  const teamBClass = match.teamB.isBye ? 'bye' : (match.winner === 'B' ? 'winner' : '');

  const badgeA = match.winner === 'A' ? '<span class="result-badge w">W</span>'
               : match.winner === 'B' ? '<span class="result-badge l">L</span>'
               : match.teamA.isBye    ? '<span class="result-badge bye-badge">-</span>'
               : '';

  const badgeB = match.winner === 'B' ? '<span class="result-badge w">W</span>'
               : match.winner === 'A' ? '<span class="result-badge l">L</span>'
               : match.teamB.isBye    ? '<span class="result-badge bye-badge">BYE</span>'
               : '';

  // Auto-advance BYE
  const isByeMatch = match.teamA.isBye || match.teamB.isBye;
  const clickableA = !match.teamA.isBye && !match.teamA.isPlaceholder;
  const clickableB = !match.teamB.isBye && !match.teamB.isPlaceholder;

  return `
    <div class="bracket-match">
      <div class="bracket-match-num">Match ${matchIdx + 1}</div>
      <div class="bracket-team ${teamAClass}"
           ${clickableA && !match.winner ? `onclick="setWinner(${roundIdx}, ${matchIdx}, 'A')" style="cursor:pointer;" title="Klik untuk set pemenang"` : ''}>
        <span class="team-seed">${match.teamA.isBye ? '–' : (matchIdx * 2 + 1)}</span>
        ${escapeHtml(match.teamA.name)}
        ${badgeA}
      </div>
      <div class="bracket-team ${teamBClass}"
           ${clickableB && !match.winner ? `onclick="setWinner(${roundIdx}, ${matchIdx}, 'B')" style="cursor:pointer;" title="Klik untuk set pemenang"` : ''}>
        <span class="team-seed">${match.teamB.isBye ? '–' : (matchIdx * 2 + 2)}</span>
        ${escapeHtml(match.teamB.name)}
        ${badgeB}
      </div>
    </div>
  `;
}

function setWinner(roundIdx, matchIdx, side) {
  const round = state.bracket[roundIdx];
  if (!round) return;
  const match = round[matchIdx];
  if (!match || match.winner) return; // sudah ada pemenang

  match.winner = side;
  const winner = side === 'A' ? match.teamA : match.teamB;

  // Propagate pemenang ke ronde berikutnya
  const nextRound = state.bracket[roundIdx + 1];
  if (nextRound) {
    const nextMatchIdx = Math.floor(matchIdx / 2);
    const slot = matchIdx % 2 === 0 ? 'teamA' : 'teamB';
    if (nextRound[nextMatchIdx]) {
      nextRound[nextMatchIdx][slot] = { ...winner, isPlaceholder: false };
    }
  }

  saveState();
  renderBracket(state.bracket);

  if (!nextRound) {
    // Final selesai!
    showToast(`🥇 ${winner.name} menjadi JUARA!`);
  } else {
    showToast(`✅ ${winner.name} maju ke ronde berikutnya!`);
  }
}

function getBracketRoundName(teamCount) {
  if (teamCount <= 2)  return 'Final';
  if (teamCount <= 4)  return 'Semi Final';
  if (teamCount <= 8)  return 'Quarter Final';
  if (teamCount <= 16) return 'Round of 16';
  return 'Round of 32';
}

function getRoundName(roundIdx, totalRounds) {
  const fromEnd = totalRounds - 1 - roundIdx;
  if (fromEnd === 0) return '🏆 FINAL';
  if (fromEnd === 1) return '🥈 Semi Final';
  if (fromEnd === 2) return '⚔️ Quarter Final';
  return `🔵 Babak ${roundIdx + 1}`;
}

/* =========================================================
   SCOREBOARD
   ========================================================= */

function populateScoreSelects() {
  const leftSel  = document.getElementById('select-team-left');
  const rightSel = document.getElementById('select-team-right');
  if (!leftSel || !rightSel) return;

  const makeOptions = (excludeName) => {
    let opts = '<option value="">-- Pilih Tim --</option>';
    state.teams.forEach(t => {
      const sel = '';
      opts += `<option value="${escapeHtml(t.name)}"${sel}>${escapeHtml(t.name)}</option>`;
    });
    return opts;
  };

  leftSel.innerHTML  = makeOptions(state.scoreTeams.right);
  rightSel.innerHTML = makeOptions(state.scoreTeams.left);

  // Restore selected teams
  if (state.scoreTeams.left)  leftSel.value  = state.scoreTeams.left;
  if (state.scoreTeams.right) rightSel.value = state.scoreTeams.right;
}

function updateScoreboardTeams() {
  const left  = document.getElementById('select-team-left')?.value  || '';
  const right = document.getElementById('select-team-right')?.value || '';

  state.scoreTeams = { left, right };
  saveState();

  document.getElementById('score-name-left').textContent  = left  || 'TIM A';
  document.getElementById('score-name-right').textContent = right || 'TIM B';
}

function restoreScores() {
  document.getElementById('score-left').textContent  = state.scores.left  || 0;
  document.getElementById('score-right').textContent = state.scores.right || 0;
  document.getElementById('score-name-left').textContent  = state.scoreTeams.left  || 'TIM A';
  document.getElementById('score-name-right').textContent = state.scoreTeams.right || 'TIM B';
  renderScoreHistory();
  checkWinner();
}

function updateScore(side, delta) {
  const current = state.scores[side] || 0;
  const next    = current + delta;

  // Skor tidak boleh negatif
  if (next < 0) {
    showToast('⚠️ Skor tidak boleh kurang dari 0!');
    return;
  }

  state.scores[side] = next;
  saveState();

  // Update UI
  const el = document.getElementById(`score-${side}`);
  if (el) {
    el.textContent = next;
    el.classList.remove('bump');
    void el.offsetWidth; // reflow trigger
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 200);
  }

  // Catat history
  const teamName = state.scoreTeams[side] || (side === 'left' ? 'Tim A' : 'Tim B');
  const action   = delta > 0 ? `+${delta}` : `${delta}`;
  const time     = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  state.scoreHistory.unshift({ team: teamName, action, time, score: next });
  if (state.scoreHistory.length > 20) state.scoreHistory = state.scoreHistory.slice(0, 20);
  saveState();

  renderScoreHistory();
  checkWinner();
}

function resetScore() {
  showConfirm(
    'Reset Skor?',
    'Skor akan dikembalikan ke 0 – 0. Riwayat skor juga akan dihapus.',
    () => {
      state.scores = { left: 0, right: 0 };
      state.scoreHistory = [];
      saveState();
      document.getElementById('score-left').textContent  = 0;
      document.getElementById('score-right').textContent = 0;
      renderScoreHistory();
      hideWinnerBanner();
      showToast('🔄 Skor direset!');
    }
  );
}

function checkWinner() {
  const l = state.scores.left  || 0;
  const r = state.scores.right || 0;
  const bannerEl = document.getElementById('winner-banner');
  if (!bannerEl) return;

  // Tampilkan banner jika ada tim unggul signifikan (bukan 0–0)
  if ((l === 0 && r === 0) || !state.scoreTeams.left || !state.scoreTeams.right) {
    hideWinnerBanner();
    return;
  }

  if (l > r) {
    bannerEl.textContent = `🥇 ${state.scoreTeams.left} Unggul!`;
    bannerEl.classList.remove('hidden');
  } else if (r > l) {
    bannerEl.textContent = `🥇 ${state.scoreTeams.right} Unggul!`;
    bannerEl.classList.remove('hidden');
  } else {
    bannerEl.textContent = '🤝 Skor Imbang!';
    bannerEl.classList.remove('hidden');
  }
}

function hideWinnerBanner() {
  const el = document.getElementById('winner-banner');
  if (el) el.classList.add('hidden');
}

function renderScoreHistory() {
  const listEl = document.getElementById('score-history-list');
  const cardEl = document.getElementById('score-history-card');
  if (!listEl) return;

  if (state.scoreHistory.length === 0) {
    if (cardEl) cardEl.style.display = 'none';
    return;
  }

  if (cardEl) cardEl.style.display = '';

  listEl.innerHTML = state.scoreHistory.slice(0, 10).map(h => `
    <div class="history-item">
      <div class="history-dot"></div>
      <span><strong>${escapeHtml(h.team)}</strong> ${h.action} → ${h.score}</span>
      <span style="margin-left:auto;color:#bbb;font-size:11px;">${h.time}</span>
    </div>
  `).join('');
}

/* =========================================================
   AUDIO — BUZZER
   ========================================================= */

function playBuzzer() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Buzzer sound: short beep sequence
    [0, 0.15, 0.30].forEach(delay => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type      = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.13);
    });

    showToast('🔔 Buzzer!');
  } catch (e) {
    showToast('🔔 Buzzer! (Audio tidak tersedia)');
  }
}

/* =========================================================
   UTILITIES
   ========================================================= */

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ——— TOAST ——— */
let toastTimer = null;

function showToast(message) {
  const el = document.getElementById('toast');
  if (!el) return;

  el.textContent = message;
  el.classList.remove('hidden');

  void el.offsetWidth;
  el.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.classList.add('hidden'), 250);
  }, 2200);
}

/* ——— CONFIRM MODAL ——— */
function showConfirm(title, body, onConfirm) {
  const overlay  = document.getElementById('modal-overlay');
  const titleEl  = document.getElementById('modal-title');
  const bodyEl   = document.getElementById('modal-body');
  const actionsEl = document.getElementById('modal-actions');
  if (!overlay) return;

  titleEl.textContent  = title;
  bodyEl.textContent   = body;
  actionsEl.innerHTML  = `
    <button class="btn btn-outline btn-sm" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary btn-sm" id="modal-confirm-btn">Hapus</button>
  `;

  document.getElementById('modal-confirm-btn').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });

  overlay.classList.remove('hidden');
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}

/* ——— KEYBOARD ——— */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Enter on team name input
document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('input-team-name');
  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const playersEl = document.getElementById('input-players');
        if (playersEl) playersEl.focus();
      }
    });
  }
  const playersInput = document.getElementById('input-players');
  if (playersInput) {
    playersInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addTeam();
      }
    });
  }
});
