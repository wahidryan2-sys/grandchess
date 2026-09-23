const canvas = document.getElementById('chessBoard');
const ctx = canvas.getContext('2d');

let screenWidth = window.innerWidth;
let calculatedSize = screenWidth < 460 ? screenWidth - 32 : 430; 
const dpr = window.devicePixelRatio || 1;

canvas.width = calculatedSize * dpr;
canvas.height = calculatedSize * dpr;
canvas.style.width = calculatedSize + 'px';
canvas.style.height = calculatedSize + 'px';
ctx.scale(dpr, dpr);
const tileSize = calculatedSize / 8;
document.getElementById('evalBarContainer').style.height = calculatedSize + 'px';
// ------------------------------------------

const game = new Chess();
const themes = { 
    // Tema Standar & Kalem
    tournament: { light: '#eeeed2', dark: '#769656' }, // Hijau klasik
    wood: { light: '#c19b78', dark: '#654321' },       // Cokelat
    monochrome: { light: '#e0e0e0', dark: '#757575' }, // Abu-abu
    ocean: { light: '#b0c4de', dark: '#4682b4' },      // Biru
  
    // Tema Mejikuhibiniu & Cerah (Fun!)
    merah: { light: '#f8d7da', dark: '#dc3545' },      // Merah / Red
    jingga: { light: '#ffe8cc', dark: '#fd7e14' },     // Jingga / Orange
    kuning: { light: '#fff3cd', dark: '#ffc107' },     // Kuning / Yellow
    hijauTerang: { light: '#d4edda', dark: '#28a745' },// Hijau Terang / Light Green
    biruLangit: { light: '#cce5ff', dark: '#007bff' }, // Biru Terang / Sky Blue
    ungu: { light: '#e2d9f3', dark: '#6f42c1' },       // Ungu / Purple
    pink: { light: '#f8d7da', dark: '#e83e8c' },       // Merah Muda / Pink
  
    // Tema Gelap (Dark Mode Catur)
    midnight: { light: '#8b9dc3', dark: '#3b5998' },   // Midnight Blue
    neon: { light: '#2d3748', dark: '#00e676' }        // Gelap dengan aksen Neon Hijau
  };
  let currentTheme = themes.tournament;

  let pieceTheme = 'basic';
  const pieceImages = {};
  let isPiecesLoaded = false;
  
  // Fungsi untuk memuat gambar SVG sebelum game dimulai
  function preloadPieces(callback) {
    const colors = ['w', 'b'];
    const types = ['p', 'n', 'b', 'r', 'q', 'k'];
    let loaded = 0;
    isPiecesLoaded = false;
  
    colors.forEach(c => {
      types.forEach(t => {
        const img = new Image();
        // Mengambil gambar dari folder pieces/basic atau pieces/style
        img.src = `pieces/${pieceTheme}/${c}_${t}.svg`; 
        img.onload = () => {
          loaded++;
          if (loaded === 12) {
            isPiecesLoaded = true;
            if (callback) callback();
          }
        };
        pieceImages[`${c}${t}`] = img;
      });
    });
  }

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let soundEnabled = true;


function playSound(type = 'move') {
  if (!soundEnabled) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode); 
  gainNode.connect(audioCtx.destination);
  
  const now = audioCtx.currentTime;
  
  // Gelombang 'sine' adalah yang paling lembut di telinga
  osc.type = 'sine'; 
  
  if (type === 'move') {
      // Suara Langkah Biasa: Lembut, pendek, 'bop'
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      
      gainNode.gain.setValueAtTime(0, now); // Fade in instan mencegah klik statis
      gainNode.gain.linearRampToValueAtTime(0.8, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      osc.start(now); osc.stop(now + 0.1);
      
  } else if (type === 'capture') {
      // Suara Makan Bidak: Sedikit lebih tinggi (satisfying 'thock')
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.start(now); osc.stop(now + 0.15);
      
  } else if (type === 'check') {
      // Suara Skak: 'Ding' lembut tapi jelas
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.4);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.6, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.start(now); osc.stop(now + 0.4);
  }
}

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
function getSquareName(col, row) { return files[col] + ranks[row]; }

function showScreen(screenId) {
  // Tambahkan 'screenAbout' ke dalam array ini
  ['screenMainMenu', 'screenSettings', 'screenGame', 'screenGlobalSettings', 'screenHistory', 'screenAbout'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.classList.add('hidden');
  });
    document.getElementById(screenId).classList.remove('hidden');
    if (screenId === 'screenGame') setTimeout(() => { drawBoard(); requestLiveBestMove(); }, 50);
}

// --- SISTEM LOCAL STORAGE (PENGATURAN & STATISTIK) ---
function saveGlobalSettings() {
  soundEnabled = document.getElementById('settingSound').checked;
  const selectedTheme = document.getElementById('settingBoardTheme').value;
  currentTheme = themes[selectedTheme];
  
  // Simpan ke HP pemain
  localStorage.setItem('chess_sound', soundEnabled);
  localStorage.setItem('chess_theme', selectedTheme);

  const selectedPiece = document.getElementById('settingPieceTheme').value;
  localStorage.setItem('chess_piece', selectedPiece);
  if (selectedPiece !== pieceTheme) {
      pieceTheme = selectedPiece;
      preloadPieces(() => drawBoard()); // Muat ulang gambar jika tema diganti
  }
  
  showScreen('screenMainMenu');
  if (game && !game.game_over()) drawBoard(); 
}

function loadInitialData() {
  // Load Pengaturan Global
  const savedSound = localStorage.getItem('chess_sound');
  if (savedSound !== null) {
      soundEnabled = savedSound === 'true';
      document.getElementById('settingSound').checked = soundEnabled;
  }
  
  // --- INI LOAD TEMA WARNA BAWAAN ---
  const savedTheme = localStorage.getItem('chess_theme');
  if (savedTheme && themes[savedTheme]) {
      currentTheme = themes[savedTheme];
      document.getElementById('settingBoardTheme').value = savedTheme;
  }
  
  // ---> INI DIA KODE YANG BARU DITAMBAHKAN <---
  const savedPiece = localStorage.getItem('chess_piece');
  if (savedPiece) {
      pieceTheme = savedPiece;
      document.getElementById('settingPieceTheme').value = savedPiece;
  }
  // --------------------------------------------
  
  if (localStorage.getItem('chess_evalBar') !== null) document.getElementById('toggleEvalBar').checked = localStorage.getItem('chess_evalBar') === 'true';
  if (localStorage.getItem('chess_accuracy') !== null) document.getElementById('toggleAccuracy').checked = localStorage.getItem('chess_accuracy') === 'true';
  
  // --- LOAD PENGATURAN MATCH GAME ---
  if (localStorage.getItem('chess_gameMode')) document.getElementById('gameMode').value = localStorage.getItem('chess_gameMode');
  if (localStorage.getItem('chess_botLevel')) document.getElementById('botLevel').value = localStorage.getItem('chess_botLevel');
  if (localStorage.getItem('chess_playerColor')) document.getElementById('playerColor').value = localStorage.getItem('chess_playerColor');
  
  if (localStorage.getItem('chess_guide') !== null) document.getElementById('toggleGuide').checked = localStorage.getItem('chess_guide') === 'true';
  if (localStorage.getItem('chess_danger') !== null) document.getElementById('toggleDanger').checked = localStorage.getItem('chess_danger') === 'true';
  if (localStorage.getItem('chess_feedback') !== null) document.getElementById('toggleFeedback').checked = localStorage.getItem('chess_feedback') === 'true';

  if (localStorage.getItem('chess_timeControl')) document.getElementById('timeControl').value = localStorage.getItem('chess_timeControl');
  
  // Load Statistik Mode Murni
  document.getElementById('statWin').textContent = localStorage.getItem('chess_win') || 0;
  document.getElementById('statLoss').textContent = localStorage.getItem('chess_loss') || 0;
  document.getElementById('statDraw').textContent = localStorage.getItem('chess_draw') || 0;
}
// Panggil otomatis saat aplikasi dibuka
loadInitialData();
preloadPieces(() => {
    drawBoard();
});

// --- STATE GAME ---
let gameMode = 'bot';
let botStrength = 5;
let showGuideSetting = true;
let showDangerSetting = true;
let showFeedbackSetting = true;
let showEvalBarSetting = true;
let isBotThinking = false;
let playerColor = 'w'; 
let lastMove = null;   
let isPureGame = false;
let showAccuracySetting = false;
let accData = { w: { totalMoves: 0, loss: 0 }, b: { totalMoves: 0, loss: 0 } };
let timeControl = 'none';
let timerW = 0;
let timerB = 0;
let timerInterval = null;
// Database RAKSASA: 100 Puzzle Skakmat 1 Langkah (100% Terverifikasi Mesin)
const puzzles = [
  "5k2/4ppp1/8/8/8/8/8/1R5K w - - 0 1",
  "6k1/8/6K1/1Q6/8/8/8/8 w - - 0 1",
  "k1r5/8/8/8/8/8/5PPP/6K1 b - - 0 1",
  "5k2/8/5K2/4Q3/8/8/8/8 w - - 0 1",
  "k6r/8/8/8/8/8/PPP5/1K6 b - - 0 1",
  "7k/8/7K/8/8/8/8/1R6 w - - 0 1",
  "7k/8/7K/8/8/8/8/2R5 w - - 0 1",
  "5k2/8/5K2/8/8/8/8/2R5 w - - 0 1",
  "5k2/8/5K2/2Q5/8/8/8/8 w - - 0 1",
  "3k4/8/3K4/6Q1/8/8/8/8 w - - 0 1",
  "k7/8/K7/5Q2/8/8/8/8 w - - 0 1",
  "k3r3/8/8/8/8/8/5PPP/6K1 b - - 0 1",
  "k5r1/8/8/8/8/8/3PPP2/4K3 b - - 0 1",
  "4k3/8/4K3/8/8/8/8/7R w - - 0 1",
  "k1r5/8/8/8/8/8/3PPP2/4K3 b - - 0 1",
  "3k4/2ppp3/8/8/8/8/8/1R5K w - - 0 1",
  "3k4/2ppp3/8/8/8/8/8/5R1K w - - 0 1",
  "6k1/8/6K1/Q7/8/8/8/8 w - - 0 1",
  "2k5/8/2K5/8/8/8/8/7R w - - 0 1",
  "2k5/8/2K5/3Q4/8/8/8/8 w - - 0 1",
  "k5r1/8/8/8/8/8/PPP5/1K6 b - - 0 1",
  "6k1/5ppp/8/8/8/8/8/2R4K w - - 0 1",
  "5k2/8/5K2/8/8/8/8/7R w - - 0 1",
  "6k1/5ppp/8/8/8/8/8/4R2K w - - 0 1",
  "k2r4/8/8/8/8/8/4PPP1/5K2 b - - 0 1",
  "k3r3/8/8/8/8/8/PPP5/1K6 b - - 0 1",
  "2k5/1ppp4/8/8/8/8/8/R6K w - - 0 1",
  "k5r1/8/8/8/8/8/1PPP4/2K5 b - - 0 1",
  "7k/8/7K/8/8/8/8/R7 w - - 0 1",
  "6k1/8/6K1/8/8/8/8/1R6 w - - 0 1",
  "5k2/8/5K2/7Q/8/8/8/8 w - - 0 1",
  "6rk/6pp/8/4N3/8/8/8/7K w - - 0 1", // Smothered mate (Kuda f7#)
  "k2r4/8/8/8/8/8/PPP5/1K6 b - - 0 1",
  "3k4/2ppp3/8/8/8/8/8/6RK w - - 0 1",
  "2k5/8/2K5/Q7/8/8/8/8 w - - 0 1",
  "1k6/8/1K6/8/8/8/8/7R w - - 0 1",
  "k7/8/K7/7Q/8/8/8/8 w - - 0 1",
  "4k3/8/4K3/8/8/8/8/2R5 w - - 0 1",
  "kr6/8/8/8/8/8/3PPP2/4K3 b - - 0 1",
  "4k3/3ppp2/8/8/8/8/8/R6K w - - 0 1",
  "7k/8/7K/8/8/8/8/3R4 w - - 0 1",
  "3k4/2ppp3/8/8/8/8/8/R6K w - - 0 1",
  "4k3/3ppp2/8/8/8/8/8/2R4K w - - 0 1",
  "k5r1/8/8/8/8/8/2PPP3/3K4 b - - 0 1",
  "k7/8/K7/2Q5/8/8/8/8 w - - 0 1",
  "k7/8/K7/3Q4/8/8/8/8 w - - 0 1",
  "k3r3/8/8/8/8/8/1PPP4/2K5 b - - 0 1",
  "6k1/5ppp/8/8/8/8/8/3R3K w - - 0 1",
  "6k1/5ppp/8/8/8/8/8/R6K w - - 0 1",
  "3k4/8/3K4/Q7/8/8/8/8 w - - 0 1",
  "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2", // Fool's Mate (Hitam)
  "k7/8/K7/8/8/8/8/2R5 w - - 0 1",
  "1k6/8/1K6/8/8/8/8/5R2 w - - 0 1",
  "5k2/8/5K2/1Q6/8/8/8/8 w - - 0 1",
  "6k1/8/6K1/8/8/8/8/2R5 w - - 0 1",
  "4k3/3ppp2/8/8/8/8/8/1R5K w - - 0 1",
  "7k/R7/5N2/8/8/8/8/7K w - - 0 1", // Arabian Mate (Benteng h7#)
  "2k5/8/2K5/8/8/8/8/5R2 w - - 0 1",
  "5k2/4ppp1/8/8/8/8/8/R6K w - - 0 1",
  "3k4/8/3K4/8/8/8/8/5R2 w - - 0 1",
  "4k3/3ppp2/8/8/8/8/8/6RK w - - 0 1",
  "5k2/8/5K2/8/8/8/8/3R4 w - - 0 1",
  "2k5/8/2K5/8/8/8/8/4R3 w - - 0 1",
  "k7/7R/2N5/8/8/8/8/7K w - - 0 1",
  "6k1/8/6K1/8/8/8/8/4R3 w - - 0 1",
  "6k1/8/6K1/8/8/8/8/3R4 w - - 0 1",
  "k6r/8/8/8/8/8/1PPP4/2K5 b - - 0 1",
  "3k4/8/3K4/8/8/8/8/R7 w - - 0 1",
  "1k6/ppp5/8/8/8/8/8/6RK w - - 0 1",
  "k7/8/K7/8/8/8/8/3R4 w - - 0 1",
  "4k3/8/4K3/8/8/8/8/R7 w - - 0 1",
  "5k2/8/5K2/Q7/8/8/8/8 w - - 0 1",
  "6k1/8/6K1/5Q2/8/8/8/8 w - - 0 1",
  "7k/8/7K/3Q4/8/8/8/8 w - - 0 1",
  "k7/8/K7/6Q1/8/8/8/8 w - - 0 1",
  "6k1/5ppp/8/8/8/8/8/1R5K w - - 0 1",
  "k6r/8/8/8/8/8/2PPP3/3K4 b - - 0 1",
  "k6r/8/8/8/8/8/3PPP2/4K3 b - - 0 1",
  "1k6/8/1K6/7Q/8/8/8/8 w - - 0 1",
  "2k5/8/2K5/7Q/8/8/8/8 w - - 0 1",
  "6k1/8/6K1/4Q3/8/8/8/8 w - - 0 1",
  "1k6/8/1K6/3Q4/8/8/8/8 w - - 0 1",
  "6k1/5pp1/8/8/8/2Q5/1B6/K7 w - - 0 1", // Skakmat Baterai Menteri & Gajah (Menteri ke g7#)
  "k7/8/K7/8/8/8/8/4R3 w - - 0 1",
  "3k4/8/3K4/4Q3/8/8/8/8 w - - 0 1",
  "k7/8/K7/8/8/8/8/6R1 w - - 0 1",
  "1k6/ppp5/8/8/8/8/8/3R3K w - - 0 1",
  "2k5/1ppp4/8/8/8/8/8/4R2K w - - 0 1",
  "7k/8/7K/4Q3/8/8/8/8 w - - 0 1",
  "2k5/8/2K5/8/8/8/8/R7 w - - 0 1",
  "k7/8/K7/8/8/8/8/7R w - - 0 1",
  "3k4/8/3K4/8/8/8/8/1R6 w - - 0 1",
  "1k6/8/1K6/5Q2/8/8/8/8 w - - 0 1",
  "7k/8/7K/8/8/8/8/5R2 w - - 0 1",
  "7k/8/7K/1Q6/8/8/8/8 w - - 0 1",
  "kr6/8/8/8/8/8/2PPP3/3K4 b - - 0 1",
  "1k6/8/1K6/8/8/8/8/4R3 w - - 0 1",
  "k6r/8/8/8/8/8/4PPP1/5K2 b - - 0 1",
  "7k/8/7K/5Q2/8/8/8/8 w - - 0 1",
  "3k4/8/3K4/8/8/8/8/6R1 w - - 0 1",
  "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1" // Scholar's Mate
];

// --- DATABASE PEMBUKAAN CATUR (MINI) ---
const openingsDB = {
  "e4": "King's Pawn Game",
  "e4 e5": "Open Game",
  "e4 e5 Nf3": "King's Knight Opening",
  "e4 e5 Nf3 Nc6": "King's Knight",
  "e4 e5 Nf3 Nc6 Bb5": "Ruy Lopez (Spanish)",
  "e4 e5 Nf3 Nc6 Bc4": "Italian Game",
  "e4 e5 Nf3 Nc6 Bc4 Bc5": "Giuoco Piano",
  "e4 e5 Nf3 Nc6 Bc4 Nf6": "Two Knights Defense",
  "e4 e5 Nf3 Nc6 d4": "Scotch Game",
  "e4 c5": "Sicilian Defense",
  "e4 c5 Nf3 d6": "Sicilian Defense: Open",
  "e4 c5 Nf3 Nc6": "Sicilian Defense: Old Sicilian",
  "e4 e6": "French Defense",
  "e4 c6": "Caro-Kann Defense",
  "e4 d6": "Pirc Defense",
  "e4 d5": "Scandinavian Defense",
  "e4 g6": "Modern Defense",
  "d4": "Queen's Pawn Game",
  "d4 d5": "Closed Game",
  "d4 d5 c4": "Queen's Gambit",
  "d4 d5 c4 e6": "Queen's Gambit Declined",
  "d4 d5 c4 c6": "Slav Defense",
  "d4 d5 c4 dxc4": "Queen's Gambit Accepted",
  "d4 Nf6": "Indian Defense",
  "d4 Nf6 c4 e6": "Nimzo/Bogo/Queen's Indian",
  "d4 Nf6 c4 g6": "King's Indian / Grünfeld",
  "c4": "English Opening",
  "Nf3": "Réti Opening",
  "f4": "Bird's Opening",
  "b3": "Larsen's Opening",
  "g3": "King's Fianchetto"
};

function detectOpening() {
  const history = game.history();
  let openingFound = "";
  
  for (let i = history.length; i > 0; i--) {
      const moveSequence = history.slice(0, i).join(' ');
      if (openingsDB[moveSequence]) {
          openingFound = openingsDB[moveSequence];
          break; 
      }
  }
  
  const openingEl = document.getElementById('openingName');
  if (openingEl) {
      // LOGIKA BARU: Sembunyikan nama pembukaan jika sudah lewat 16 giliran (8 langkah penuh)
      // agar tidak mengotori layar saat sudah masuk fase Midgame/Endgame.
      if (history.length > 16) {
          openingEl.textContent = ""; 
      } else {
          openingEl.textContent = openingFound ? `📖 ${openingFound}` : "";
      }
  }
}

let engine, tutorEngine;
let lastWhiteEval = 0;
let currentWhiteEval = 0;
let liveBestMoveText = "Menghitung...";

function startGameEngine() {
  gameMode = document.getElementById('gameMode').value;
  botStrength = parseInt(document.getElementById('botLevel').value);
  playerColor = document.getElementById('playerColor').value;
  
  showGuideSetting = document.getElementById('toggleGuide').checked;
  showDangerSetting = document.getElementById('toggleDanger').checked;
  showFeedbackSetting = document.getElementById('toggleFeedback').checked;
  showEvalBarSetting = document.getElementById('toggleEvalBar').checked;
  
  // BACA OPSI AKURASI (Jika elemennya ada)
  const accCheckbox = document.getElementById('toggleAccuracy');
  showAccuracySetting = accCheckbox ? accCheckbox.checked : false;

  // SIMPAN PENGATURAN KE HP PEMAIN (LOCAL STORAGE)
  localStorage.setItem('chess_gameMode', gameMode);
  localStorage.setItem('chess_botLevel', botStrength);
  localStorage.setItem('chess_playerColor', playerColor);
  localStorage.setItem('chess_guide', showGuideSetting);
  localStorage.setItem('chess_danger', showDangerSetting);
  localStorage.setItem('chess_feedback', showFeedbackSetting);
  localStorage.setItem('chess_evalBar', showEvalBarSetting);
  localStorage.setItem('chess_accuracy', showAccuracySetting);

  // BACA & SIMPAN OPSI WAKTU
  const timeVal = document.getElementById('timeControl').value;
  timeControl = timeVal === 'none' ? 'none' : parseInt(timeVal) * 60;
  localStorage.setItem('chess_timeControl', timeVal);

  // RESET & SETUP JAM CATUR
  const tTop = document.getElementById('timerTop');
  const tBot = document.getElementById('timerBottom');
  clearInterval(timerInterval);
  
  if (timeControl !== 'none' && gameMode !== 'puzzle') {
      timerW = timeControl;
      timerB = timeControl;
      tTop.classList.remove('hidden');
      tBot.classList.remove('hidden');
      updateTimerDisplay();
      startTimer();
  } else {
      tTop.classList.add('hidden');
      tBot.classList.add('hidden');
  }

  // MODE MURNI (Aktif jika semua bantuan dimatikan)
  isPureGame = (!showGuideSetting && !showDangerSetting && !showFeedbackSetting && !showEvalBarSetting && !showAccuracySetting);

  document.getElementById('displayBotLevel').textContent = gameMode === 'bot' ? 'Lv. ' + botStrength : (gameMode === 'puzzle' ? '🧩 Puzzle' : "PvP");
  
  // TAMPILKAN/SEMBUNYIKAN BAR EVALUASI
  const evalContainer = document.getElementById('evalBarContainer');
  if (evalContainer) evalContainer.style.display = showEvalBarSetting ? 'flex' : 'none';

  // RESET DAN TAMPILKAN/SEMBUNYIKAN KOTAK AKURASI
  accData = { w: { totalMoves: 0, loss: 0 }, b: { totalMoves: 0, loss: 0 } };
  const accTop = document.getElementById('accuracyTop');
  const accBot = document.getElementById('accuracyBottom');
  
  if (accTop && accBot) {
      // Menggunakan style.display agar tidak bentrok dengan CSS Tailwind
      accTop.style.display = showAccuracySetting ? 'block' : 'none';
      accBot.style.display = showAccuracySetting ? 'block' : 'none';
      
      // Set persentase awal 100%
      document.getElementById('valAccTop').textContent = "100%";
      document.getElementById('valAccBottom').textContent = "100%";
  }

  // LOGIKA MUAT PAPAN (PUZZLE / GAME BIASA)
  if (gameMode === 'puzzle') {
     const randomFen = puzzles[Math.floor(Math.random() * puzzles.length)];
     game.load(randomFen);
     playerColor = game.turn();
  } else {
     game.reset();
  }
  
  lastWhiteEval = 0; currentWhiteEval = 0; lastMove = null; 
  document.getElementById('moveHistory').innerHTML = ''; 
  
  // SEMBUNYIKAN TOMBOL NEXT PUZZLE
  const btnNext = document.getElementById('btnNextPuzzle');
  if(btnNext) btnNext.classList.add('hidden');
  
  updateCapturedPieces(); updateEndangeredPieces(); resetFeedbackBox();
  showScreen('screenGame'); updateEvalBarUI(0);

  // TRIGGER BOT JIKA PEMAIN MEMILIH HITAM
  if (gameMode === 'bot' && engine) {
    // Level 1-5 menggunakan bot kustom, Level 6 ke atas baru murni Stockfish (Skill 0-20)
    const skillLevel = Math.max(0, Math.min(20, botStrength - 6));
    engine.postMessage('setoption name Skill Level value ' + skillLevel);
    if (playerColor === 'b') setTimeout(triggerBot, 500); 
  }
}

function updateTimerDisplay() {
  const formatTime = (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  
  const timeTop = playerColor === 'w' ? timerB : timerW;
  const timeBot = playerColor === 'w' ? timerW : timerB;
  
  const elTop = document.getElementById('timerTop');
  const elBot = document.getElementById('timerBottom');
  
  elTop.textContent = formatTime(Math.max(0, timeTop));
  elBot.textContent = formatTime(Math.max(0, timeBot));
  
  // Efek visual: Merah saat waktu sisa < 30 detik
  elTop.classList.toggle('text-red-400', timeTop < 30);
  elBot.classList.toggle('text-red-400', timeBot < 30);
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
      if (game.game_over()) {
          clearInterval(timerInterval);
          return;
      }
      
      if (game.turn() === 'w') {
          timerW--;
          if (timerW <= 0) handleTimeOut('w');
      } else {
          timerB--;
          if (timerB <= 0) handleTimeOut('b');
      }
      updateTimerDisplay();
  }, 1000);
}

function handleTimeOut(colorLost) {
  clearInterval(timerInterval);
  const statusEl = document.getElementById('tutorStatus');
  statusEl.textContent = "⏳ WAKTU HABIS!";
  statusEl.className = "text-xl font-extrabold text-red-500";
  
  // Beri delay sedikit agar pemain sadar, lalu panggil modal
  setTimeout(() => {
     showGameOverModal(true, colorLost === 'w' ? 'b' : 'w'); 
  }, 800);
}

// --- UNDO YANG DISEMPURNAKAN ---
function undoMove() {
    if (isBotThinking) return; 
    
    // TAMBAHKAN INI: Hentikan mesin agar tidak ngaco saat undo
    if (engine) engine.postMessage('stop');
    if (tutorEngine) tutorEngine.postMessage('stop');
  
    if (gameMode === 'bot') {
      game.undo();
      game.undo();
    } else {
      game.undo();
    }
    
    updateCapturedPieces();
    updateEndangeredPieces();
    resetFeedbackBox();
    drawBoard();
    requestLiveBestMove();
  }

  function nextPuzzle() {
    // Sembunyikan tombol lagi
    document.getElementById('btnNextPuzzle').classList.add('hidden');
    
    // Pilih FEN baru secara acak
    const randomFen = puzzles[Math.floor(Math.random() * puzzles.length)];
    game.load(randomFen);
    playerColor = game.turn(); // Warna menyesuaikan giliran
    
    // Reset UI
    lastMove = null;
    document.getElementById('moveHistory').innerHTML = '';
    updateCapturedPieces(); 
    updateEndangeredPieces(); 
    resetFeedbackBox();
    
    drawBoard();
    playSound('move'); // Efek suara 'pop' transisi
  }
  
  // PASTIKAN tombolnya ikut sembunyi kalau menekan Mundur
  function quitGame() {
    clearInterval(timerInterval); // Matikan jam
    if (engine) engine.postMessage('stop');
    if (tutorEngine) tutorEngine.postMessage('stop');
    isBotThinking = false;
    pendingEvaluation = false;
    
    const reviewCtrl = document.getElementById('reviewControls');
  if(reviewCtrl) { reviewCtrl.classList.add('hidden'); reviewCtrl.classList.remove('flex'); }
    // TAMBAHKAN BARIS INI
    document.getElementById('btnNextPuzzle').classList.add('hidden');
    
    showScreen('screenMainMenu');
  }

// --- CAPTURED PIECES FIX ---
function updateCapturedPieces() {
  const startCounts = { 'q':1, 'r':2, 'b':2, 'n':2, 'p':8 };
  const counts = { 'w': {q:0, r:0, b:0, n:0, p:0}, 'b': {q:0, r:0, b:0, n:0, p:0} };
  
  game.board().forEach(row => row.forEach(p => { if(p) counts[p.color][p.type]++; }));
  
  function render(survivingColor) {
    let html = '';
    let targetColor = survivingColor === 'w' ? 'b' : 'w';
    ['q','r','b','n','p'].forEach(piece => {
      let missing = startCounts[piece] - counts[targetColor][piece];
      for(let i=0; i<missing; i++) {
        // Menggunakan tag img SVG lokal
        html += `<img src="pieces/${pieceTheme}/${targetColor}_${piece}.svg" class="inline-block w-5 h-5 -ml-1 opacity-70">`;
      }
    });
    return html;
  }
  document.getElementById('capturedBlack').innerHTML = render('w'); 
  document.getElementById('capturedWhite').innerHTML = render('b'); 
}

// --- STOCKFISH SETUP ---
fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
  .then(res => res.text())
  .then(text => {
    const blob = new Blob([text], { type: 'application/javascript' });
    
    engine = new Worker(URL.createObjectURL(blob));
    engine.postMessage('uci');
    engine.onmessage = e => {
      if (e.data.includes('bestmove')) {
        const rawMove = e.data.split(' ')[1];

        // Panggil fungsi aslimu untuk menjalankan langkahnya
        executeBotMove(rawMove);
      }
    };

    tutorEngine = new Worker(URL.createObjectURL(blob));
    tutorEngine.postMessage('uci');
    tutorEngine.onmessage = e => {
      const line = e.data;
      if (line.includes('info') && line.includes('score')) {
        const cp = line.match(/score cp (-?\d+)/);
        const mate = line.match(/score mate (-?\d+)/);
        let score = cp ? parseInt(cp[1]) : (mate ? (parseInt(mate[1]) > 0 ? 10000 : -10000) : 0);
        currentWhiteEval = (game.turn() === 'w') ? score : -score;
        updateEvalBarUI(currentWhiteEval);
      }
      
      if (line.includes('bestmove')) {
         let rawMove = line.split(' ')[1];
         if (rawMove && rawMove !== "(none)") {
             let dummy = new Chess(game.fen());
             let moveObj = dummy.move({from: rawMove.substring(0,2), to: rawMove.substring(2,4), promotion: 'q'});
             liveBestMoveText = moveObj ? moveObj.san : rawMove;
         } else {
             liveBestMoveText = "Selesai";
         }
         
         const bestMoveEl = document.getElementById('tutorBestMove');
         if (bestMoveEl && !isBotThinking) {
             bestMoveEl.textContent = showFeedbackSetting ? `💡 Rekomendasi Langkah Terbaik: ${liveBestMoveText}` : "";
         }

         if (pendingEvaluation) {
             pendingEvaluation = false;
             evaluatePlayerMoveResult();
         }
      }
    };
  });

let pendingEvaluation = false;

function requestLiveBestMove() {
  if (game.game_over() || !tutorEngine) return;
  tutorEngine.postMessage('position fen ' + game.fen());
  tutorEngine.postMessage('go depth 10');
}

function evaluatePlayerMoveResult() {
  // Diff adalah seberapa besar evaluasi berubah setelah sebuah langkah
  let diff = game.turn() === 'w' ? -(currentWhiteEval - lastWhiteEval) : (currentWhiteEval - lastWhiteEval);
  
  // --- HITUNG AKURASI ---
  if (gameMode !== 'puzzle') {
      const movedColor = game.turn() === 'w' ? 'b' : 'w'; 
      accData[movedColor].totalMoves++;
      
      if (diff < 0) {
        accData[movedColor].loss += Math.min(Math.abs(diff), 400); 
    }
    
    // Ganti angka 15 menjadi 4 agar blunder langsung menghukum persentase secara drastis
    let accuracyW = 100;
    if (accData['w'].totalMoves > 0) {
        accuracyW = Math.max(0, 100 - (accData['w'].loss / (accData['w'].totalMoves * 4)));
    }
    
    let accuracyB = 100;
    if (accData['b'].totalMoves > 0) {
        accuracyB = Math.max(0, 100 - (accData['b'].loss / (accData['b'].totalMoves * 4)));
    }
      
      // Tampilkan ke UI sesuai siapa yang di bawah dan di atas (tergantung Flip Board)
      if (playerColor === 'w') {
          document.getElementById('valAccBottom').textContent = accuracyW.toFixed(1) + "%";
          document.getElementById('valAccTop').textContent = accuracyB.toFixed(1) + "%";
      } else {
          document.getElementById('valAccBottom').textContent = accuracyB.toFixed(1) + "%";
          document.getElementById('valAccTop').textContent = accuracyW.toFixed(1) + "%";
      }
  }
  // ----------------------

  const evalEl = document.getElementById('tutorEvaluation'); 
  const previousTurn = game.turn() === 'w' ? 'b' : 'w';
  const isPlayerMove = gameMode === 'pass' || previousTurn === playerColor;

  if (showFeedbackSetting && isPlayerMove) {
    if (diff <= -200) {
      evalEl.textContent = "❌ BLUNDER";
      evalEl.className = "text-lg font-extrabold text-red-500";
    } else if (diff >= 100) {
      evalEl.textContent = "✨ BRILLIANT";
      evalEl.className = "text-lg font-extrabold text-yellow-400";
    } else {
      evalEl.textContent = "✅ GOOD MOVE";
      evalEl.className = "text-lg font-extrabold text-green-400";
    }
  } else {
    evalEl.textContent = ""; 
  }
  
  lastWhiteEval = currentWhiteEval;

  // Cek apakah mode bot, belum game over, DAN pastikan gilirannya bukan warna pemain
  if (gameMode === 'bot' && !game.game_over() && game.turn() !== playerColor) {
    triggerBot(); 
  } else {
    isBotThinking = false;
   
  }
}

  function resetFeedbackBox() {
    document.getElementById('tutorEvaluation').textContent = ""; 
    document.getElementById('tutorStatus').textContent = "Giliranmu!";
    document.getElementById('tutorStatus').className = "text-xl font-extrabold text-white";
    document.getElementById('tutorBestMove').textContent = showFeedbackSetting ? "Saran AI: Menghitung..." : "";
  }

function updateEvalBarUI(evalScore) {
  let fill = document.getElementById('evalBarFill');
  if (fill) fill.style.height = Math.max(5, Math.min(95, 50 + (evalScore / 15))) + '%';
}

function triggerBot() {
  if (game.game_over()) return;
  isBotThinking = true;
  
  const statusEl = document.getElementById('tutorStatus');
  statusEl.innerHTML = "⏳ Bot Berpikir...";
  statusEl.className = "text-xl font-extrabold text-blue-400 animate-pulse";
  
  // --- LOGIKA ELO SUPER RENDAH (LEVEL 1-5 / 300-700 ELO) ---
  // Mensimulasikan pemain pemula dengan "Peluang Ngawur/Blunder"
  if (botStrength < 6) {
      // Peluang ngawur menurun seiring naiknya level (Lv 1: 50% ngawur, Lv 5: 10% ngawur)
      const blunderChance = (6 - botStrength) * 10; 
      const randomRoll = Math.random() * 100;

      if (randomRoll < blunderChance) {
          // Bot akan pura-pura mikir bentar, lalu jalan acak
          setTimeout(() => {
              const moves = game.moves({ verbose: true });
              const randomMove = moves[Math.floor(Math.random() * moves.length)];
              
              let moveStr = randomMove.from + randomMove.to;
              if (randomMove.promotion) moveStr += randomMove.promotion;
              
              executeBotMove(moveStr); // Eksekusi langsung tanpa nanya Stockfish
          }, 600 + Math.random() * 500);
          return; // Hentikan fungsi di sini, jangan kirim ke Stockfish
      }
  }
  // ---------------------------------------------------------

  // JIKA TIDAK NGAWUR, ATAU LEVEL >= 6 (800+ ELO), TANYA STOCKFISH
  engine.postMessage('position fen ' + game.fen());
  
  // Sesuaikan kedalaman analisa berdasarkan level (Makin tinggi makin dalam mikirnya)
  const depth = botStrength < 6 ? 1 : Math.min(20, Math.max(1, botStrength - 5));
  
  // Batasi waktu mikir maks 1.5 detik biar game tidak lag
  engine.postMessage(`go depth ${depth} movetime 1500`); 
}
  
  function executeBotMove(moveStr) {
    game.move({ from: moveStr.substring(0,2), to: moveStr.substring(2,4), promotion: moveStr.length > 4 ? moveStr[4] : 'q' });
    lastMove = { from: moveStr.substring(0,2), to: moveStr.substring(2,4) };
    finishMovePhase();
    isBotThinking = false;
    pendingEvaluation = true;
    
    // KEMBALIKAN TEKS KE GILIRANMU SETELAH BOT JALAN
    const statusEl = document.getElementById('tutorStatus');
    statusEl.innerHTML = "Giliranmu!";
    statusEl.className = "text-xl font-extrabold text-white";
    
    requestLiveBestMove();
  }

// TAMBAHKAN FUNGSI INI
function cancelPromotion() {
    document.getElementById('promoModal').classList.add('hidden');
    pendingPromoMove = null;
    drawBoard(); // Gambar ulang untuk membatalkan tarikan pion
  }

// --- DETEKTOR BAHAYA ---
let currentEndangeredPieces = [];

function updateEndangeredPieces() {
  currentEndangeredPieces = [];
  if (!showDangerSetting) return;
  
  let dummy = new Chess(game.fen());
  let tokens = dummy.fen().split(' ');
  tokens[1] = game.turn() === 'w' ? 'b' : 'w'; 
  tokens[3] = '-';
  
  let oppDummy = new Chess();
  if (oppDummy.load(tokens.join(' '))) {
    oppDummy.moves({verbose: true}).forEach(m => {
       const target = game.get(m.to);
       if (target && target.color === game.turn()) currentEndangeredPieces.push(m.to);
    });
  }
}

function isMoveUnsafe(moveObj) {
  let dummy = new Chess(game.fen());
  dummy.move(moveObj);
  return dummy.moves({verbose: true}).some(m => m.to === moveObj.to);
}

// --- RENDER PAPAN ---
let legalMovesForSelected = [];
let unsafeMovesForSelected = [];

function drawBoard() {
    const board = game.board(); 
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        // KONVERSI KOORDINAT JIKA PEMAIN ADALAH HITAM (FLIP BOARD)
        const vCol = playerColor === 'w' ? col : 7 - col;
        const vRow = playerColor === 'w' ? row : 7 - row;
        const sqName = getSquareName(col, row);
  
        const isLightSquare = (vRow + vCol) % 2 === 0;
        ctx.fillStyle = isLightSquare ? currentTheme.light : currentTheme.dark;
        ctx.fillRect(vCol * tileSize, vRow * tileSize, tileSize, tileSize);
  
        // HIGHLIGHT LANGKAH TERAKHIR (Kuning Transparan)
        if (lastMove && (sqName === lastMove.from || sqName === lastMove.to)) {
           ctx.fillStyle = 'rgba(255, 255, 0, 0.35)';
           ctx.fillRect(vCol * tileSize, vRow * tileSize, tileSize, tileSize);
        }
  
        const piece = board[row][col];
  
        // INDIKATOR SKAK (Petak Raja jadi Merah)
        if (game.in_check() && piece && piece.type === 'k' && piece.color === game.turn()) {
           ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
           ctx.fillRect(vCol * tileSize, vRow * tileSize, tileSize, tileSize);
        }
  
        // Bingkai Merah jika Bidak Terancam
        if (showDangerSetting && currentEndangeredPieces.includes(sqName)) {
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
          ctx.lineWidth = 3;
          ctx.strokeRect(vCol * tileSize + 2, vRow * tileSize + 2, tileSize - 4, tileSize - 4);
        }
  
        // Koordinat (Teks)
        ctx.fillStyle = isLightSquare ? currentTheme.dark : currentTheme.light;
        ctx.font = "bold 12px Arial";
        if (vCol === 0) { ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(ranks[row], vCol * tileSize + 4, vRow * tileSize + 4); }
        if (vRow === 7) { ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(files[col], vCol * tileSize + tileSize - 4, vRow * tileSize + tileSize - 4); }
  
        // Titik Panduan & Unsafe Move
        if ((isDragging || selectedSquare) && legalMovesForSelected.includes(sqName)) {
            let isUnsafe = unsafeMovesForSelected.includes(sqName);
          if ((isUnsafe && showDangerSetting) || (!isUnsafe && showGuideSetting)) {
            ctx.fillStyle = isUnsafe ? 'rgba(255, 69, 0, 0.8)' : 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(vCol * tileSize + tileSize/2, vRow * tileSize + tileSize/2, tileSize/4, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
  
        // Gambar Bidak
        let isDragged = isDragging && draggedPieceCode && row === startRow && col === startCol;
        let isAnimDest = isAnimating && lastMove && sqName === lastMove.to;
        
        // Jangan gambar bidak jika sedang didrag ATAU sedang dianimasikan di petak tujuannya
        if (piece && !isDragged && !isAnimDest) {
            drawPiece(piece, vCol * tileSize + tileSize / 2, vRow * tileSize + tileSize / 2 + 4);
        }
      }
    }
}

function drawPiece(pieceObj, x, y) {
  // PENGAMAN: Jika data bidak belum siap atau kosong, hentikan agar tidak crash
  if (!isPiecesLoaded || !pieceObj || !pieceObj.color || !pieceObj.type) return;
  
  const img = pieceImages[`${pieceObj.color}${pieceObj.type}`];
  if (img) {
    const size = tileSize * 0.85; // Ukuran bidak 85% dari kotak
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  }
}

function drawDraggedPiece() {
  if (draggedPieceCode) {
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;
    drawPiece(draggedPieceCode, mouseX, mouseY + 4);
    ctx.shadowColor = 'transparent';
  }
}

// --- INTERAKSI MOUSE & TOUCH ---
let isDragging = false;
let startCol = -1, startRow = -1;
let mouseX = 0, mouseY = 0;
let draggedPieceCode = null;
let pendingPromoMove = null;
let selectedSquare = null; 
let isAnimating = false;
let animPiece = null;
let animStartX = 0, animStartY = 0;
let animEndX = 0, animEndY = 0;
let animStartTime = 0;
const animDuration = 400; // Durasi meluncur 150 milidetik (0.15 detik)

function getEventPos(e) {
  const rect = canvas.getBoundingClientRect();
  let clientX = e.clientX, clientY = e.clientY;
  if (e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } 
  else if (e.changedTouches && e.changedTouches.length > 0) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; }
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function handleStart(e) {
    e.preventDefault(); 
    if (isBotThinking || isAnimating) return;
    if (isBotThinking) return; 
  
    const pos = getEventPos(e);
    const vCol = Math.floor(pos.x / tileSize), vRow = Math.floor(pos.y / tileSize);
    if (vCol < 0 || vCol > 7 || vRow < 0 || vRow > 7) return;
  
    const col = playerColor === 'w' ? vCol : 7 - vCol;
    const row = playerColor === 'w' ? vRow : 7 - vRow;
    const sqName = getSquareName(col, row);
  
    // --- LOGIKA JIKA SEDANG MODE TAP-TAP (Sudah ada bidak terpilih sebelumnya) ---
    if (selectedSquare) {
       if (legalMovesForSelected.includes(sqName)) {
           // Cek apakah Promosi Pion via Tap-Tap
           const piece = game.get(selectedSquare);
           if (piece && piece.type === 'p' && ((piece.color === 'w' && row === 0) || (piece.color === 'b' && row === 7))) {
               pendingPromoMove = { from: selectedSquare, to: sqName };
               showPromoModal(piece.color);
               isDragging = false; draggedPieceCode = null; selectedSquare = null; legalMovesForSelected = []; drawBoard();
               return;
           }
  
           // Eksekusi Langkah Tap-Tap
           const move = game.move({ from: selectedSquare, to: sqName, promotion: 'q' });
           if (move) {
               lastMove = { from: selectedSquare, to: sqName };
               selectedSquare = null; legalMovesForSelected = [];
               finishMovePhase();
               if (!game.game_over()) {
                pendingEvaluation = true;
                if (gameMode === 'bot') isBotThinking = true; // Kunci papan HANYA jika lawan bot
                document.getElementById('tutorStatus').textContent = "Menganalisis...";
                   tutorEngine.postMessage('position fen ' + game.fen());
                   tutorEngine.postMessage('go depth 10');
               }
               return; // Selesai
           }
       } else {
           // Jika pemain nge-tap petak kosong/bidak lawan (batal)
           const piece = game.board()[row][col];
           if (!piece || piece.color !== game.turn()) {
               selectedSquare = null; legalMovesForSelected = [];
               drawBoard();
               return;
           }
           // Jika pemain nge-tap bidak miliknya yang lain, lanjut ke logika di bawah (pindah pilihan)
       }
    }
  
    // --- LOGIKA KLIK AWAL / DRAG DROP ---
    const piece = game.board()[row][col];
    if (piece && piece.color === game.turn()) {
      isDragging = true; startCol = col; startRow = row; draggedPieceCode = piece;
      selectedSquare = sqName; // Simpan namanya untuk tap-tap
      mouseX = pos.x; mouseY = pos.y;
  
      const moves = game.moves({ square: sqName, verbose: true });
      legalMovesForSelected = moves.map(m => m.to);
      unsafeMovesForSelected = moves.filter(m => isMoveUnsafe(m)).map(m => m.to);
  
      drawBoard(); drawDraggedPiece();
    }
}

  function handleMove(e) {
    // Pindahkan ke paling atas agar layarnya kebal dari usapan
    e.preventDefault(); 
    
    if (isDragging) {
      const pos = getEventPos(e); 
      mouseX = pos.x; mouseY = pos.y;
      drawBoard(); 
      drawDraggedPiece(); 
    }
  }

  function handleEnd(e) {
    if (!isDragging) return;
    const pos = getEventPos(e);
    const vCol = Math.floor(pos.x / tileSize), vRow = Math.floor(pos.y / tileSize);
    const targetCol = playerColor === 'w' ? vCol : 7 - vCol;
    const targetRow = playerColor === 'w' ? vRow : 7 - vRow;
    
    const sourceSquare = getSquareName(startCol, startRow), targetSquare = getSquareName(targetCol, targetRow); 
  
    // JIKA JARIMU DIANGKAT DI PETAK YANG SAMA (Ini berarti kamu sedang nge-TAP, bukan drag)
    if (sourceSquare === targetSquare) {
        isDragging = false; 
        draggedPieceCode = null;
        drawBoard(); // Kembalikan posisi bidak, tapi titik panduan tetap menyala!
        return; 
    }
  
    // JIKA DIGESER KE PETAK LAIN (DRAG & DROP)
    const piece = game.get(sourceSquare);
    if (piece && piece.type === 'p' && ((piece.color === 'w' && targetRow === 0) || (piece.color === 'b' && targetRow === 7))) {
       const isLegalPromo = game.moves({square: sourceSquare, verbose: true}).some(m => m.to === targetSquare);
       if (isLegalPromo) {
          pendingPromoMove = { from: sourceSquare, to: targetSquare };
          showPromoModal(piece.color);
          isDragging = false; draggedPieceCode = null; selectedSquare = null; legalMovesForSelected = []; drawBoard();
          return;
       }
    }
  
    const move = game.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    isDragging = false; draggedPieceCode = null; selectedSquare = null; legalMovesForSelected = [];
    
    if (move !== null) {
        lastMove = { from: sourceSquare, to: targetSquare };
        finishMovePhase();
        if (!game.game_over()) {
          pendingEvaluation = true;
          if (gameMode === 'bot') isBotThinking = true; // Kunci papan HANYA jika lawan bot
          document.getElementById('tutorStatus').textContent = "Menganalisis...";
            tutorEngine.postMessage('position fen ' + game.fen());
            tutorEngine.postMessage('go depth 10');
        }
    } else {
        selectedSquare = null;
        drawBoard();
    }
    }

    function showPromoModal(color) {
      const modal = document.getElementById('promoModal');
      const container = document.getElementById('promoOptions');
      container.innerHTML = `
        <button onclick="executePromotion('q')" class="hover:scale-110 transition-transform"><img src="pieces/${pieceTheme}/${color}_q.svg" class="w-16 h-16"></button>
        <button onclick="executePromotion('r')" class="hover:scale-110 transition-transform"><img src="pieces/${pieceTheme}/${color}_r.svg" class="w-16 h-16"></button>
        <button onclick="executePromotion('b')" class="hover:scale-110 transition-transform"><img src="pieces/${pieceTheme}/${color}_b.svg" class="w-16 h-16"></button>
        <button onclick="executePromotion('n')" class="hover:scale-110 transition-transform"><img src="pieces/${pieceTheme}/${color}_n.svg" class="w-16 h-16"></button>
      `;
      modal.classList.remove('hidden');
    }

function executePromotion(pieceType) {
  document.getElementById('promoModal').classList.add('hidden');
  if (pendingPromoMove) {
    pendingPromoMove.promotion = pieceType;
    if (game.move(pendingPromoMove)) {
      finishMovePhase();
      pendingEvaluation = true;
      if (gameMode === 'bot') isBotThinking = true; // Kunci papan HANYA jika lawan bot
      tutorEngine.postMessage('position fen ' + game.fen());
        tutorEngine.postMessage('go depth 10');
    }
    pendingPromoMove = null;
  }
}

// --- FITUR SALIN PGN (ANTI-GAGAL UNTUK APK & PWA) ---
function copyPGN() {
  const pgnData = game.pgn();
  
  if (!pgnData) {
      alert("Belum ada langkah untuk disalin!");
      return;
  }

  const btn = document.getElementById('btnCopyPgn');
  const originalText = btn.innerHTML;
  
  // Fungsi untuk mengubah warna tombol saat sukses
  const showSuccess = () => {
      btn.innerHTML = "✅ Tersalin!";
      btn.classList.replace('bg-blue-600', 'bg-green-600');
      btn.classList.replace('hover:bg-blue-500', 'hover:bg-green-500');
      setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.replace('bg-green-600', 'bg-blue-600');
          btn.classList.replace('hover:bg-green-500', 'hover:bg-blue-500');
      }, 2000);
  };

  // 1. Coba metode Modern (Untuk PWA & Android Baru)
  if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(pgnData).then(showSuccess).catch(() => fallbackCopyTextToClipboard(pgnData, showSuccess));
  } else {
      // 2. Jika gagal/diblokir, pakai metode Jadul (Untuk APK WebView)
      fallbackCopyTextToClipboard(pgnData, showSuccess);
  }
}

// Rencana Cadangan (Fallback) untuk WebView Android
function fallbackCopyTextToClipboard(text, successCallback) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Sembunyikan textarea agar tidak merusak UI saat muncul
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.opacity = "0";
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
      const successful = document.execCommand('copy');
      if (successful) {
          successCallback();
      } else {
          alert("Sistem perangkatmu memblokir fitur copy.");
      }
  } catch (err) {
      alert("Gagal menyalin PGN.");
  }
  
  document.body.removeChild(textArea);
}

function updateMoveHistory() {
    const history = game.history();
    let html = '';
    for (let i = 0; i < history.length; i += 2) {
      html += `<span class="inline-block w-[70px]"><b>${(i/2)+1}.</b> ${history[i]}</span> `;
      if (history[i+1]) html += `<span class="inline-block w-[60px]">${history[i+1]}</span> `;
    }
    const historyEl = document.getElementById('moveHistory');
    if(historyEl) {
       historyEl.innerHTML = html;
       historyEl.scrollTop = historyEl.scrollHeight; // Auto scroll ke bawah
    }
    detectOpening();
  }

  function startSlidingAnimation() {
    if (!lastMove) {
        finishMovePhasePart2();
        return;
    }
    
    const piece = game.get(lastMove.to);
    if (!piece) {
        finishMovePhasePart2();
        return;
    }
    
    animPiece = piece;
    
    // Hitung piksel asal dan tujuan
    const getCoords = (sq) => {
        const col = files.indexOf(sq[0]);
        const row = ranks.indexOf(sq[1]);
        const vCol = playerColor === 'w' ? col : 7 - col;
        const vRow = playerColor === 'w' ? row : 7 - row;
        return { x: vCol * tileSize + tileSize / 2, y: vRow * tileSize + tileSize / 2 + 4 };
    };
    
    const startPos = getCoords(lastMove.from);
    const endPos = getCoords(lastMove.to);
    
    animStartX = startPos.x; animStartY = startPos.y;
    animEndX = endPos.x; animEndY = endPos.y;
    
    isAnimating = true;
    animStartTime = null;
    requestAnimationFrame(animateMove);
}

function animateMove(timestamp) {
  if (!animStartTime) animStartTime = timestamp;
  const progress = Math.min((timestamp - animStartTime) / animDuration, 1);
  
  // Efek perlambatan halus saat bidak hampir sampai
  const easeProgress = 1 - Math.pow(1 - progress, 3);
  
  drawBoard(); 
  
  // Gambar bidak yang sedang melayang
  const currentX = animStartX + (animEndX - animStartX) * easeProgress;
  const currentY = animStartY + (animEndY - animStartY) * easeProgress;
  
  // PENGAMAN: Hanya jalankan efek bayangan jika animPiece benar-benar ada
  if (animPiece) {
      ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
      drawPiece(animPiece, currentX, currentY);
      ctx.shadowColor = 'transparent';
  }
  
  if (progress < 1) {
      requestAnimationFrame(animateMove);
  } else {
      isAnimating = false;
      animPiece = null;
      finishMovePhasePart2(); // Animasi selesai, putar suara & update status
  }
}
  
function finishMovePhase() {
  // Alihkan eksekusi ke mesin animasi terlebih dahulu
  startSlidingAnimation();
}

function finishMovePhasePart2() {
  // Mainkan efek suara sesuai situasi
  if (game.in_check()) {
      playSound('check');
  } else if (lastMove) {
      const isCapture = game.history({verbose: true}).slice(-1)[0]?.captured;
      playSound(isCapture ? 'capture' : 'move');
  }

  updateCapturedPieces(); updateEndangeredPieces(); updateMoveHistory(); drawBoard();
  const statusEl = document.getElementById('tutorStatus');
  
  if (gameMode === 'puzzle') {
    if (game.in_checkmate()) {
        statusEl.textContent = "✅ PUZZLE SELESAI!";
        statusEl.className = "text-xl font-extrabold text-green-400";
        document.getElementById('btnNextPuzzle').classList.remove('hidden');
    } else {
        playSound('capture'); 
        statusEl.textContent = "❌ BUKAN SKAKMAT!";
        statusEl.className = "text-xl font-extrabold text-red-500";
        setTimeout(() => { 
            game.undo(); 
            drawBoard(); 
            statusEl.textContent = "Coba Lagi!";
            statusEl.className = "text-xl font-extrabold text-white";
        }, 1000);
    }
    return; 
  }

  if (game.game_over()) {
    clearInterval(timerInterval);
    showGameOverModal();
    statusEl.textContent = "GAME OVER";
  } else if (game.in_check()) {
    statusEl.innerHTML = "⚠️ SKAK!";
    statusEl.className = "text-xl font-extrabold text-red-500 animate-pulse";
  }
}
  
  // LOGIKA POP-UP KEMENANGAN & MAIN LAGI GANTI WARNA
  function showGameOverModal(isTimeout = false, winnerColor = null) {
    const modal = document.getElementById('gameOverModal');
    const title = document.getElementById('gameOverTitle');
    const reason = document.getElementById('gameOverReason');
    
    let isWin = false;
    
    if (isTimeout) {
        isWin = winnerColor === playerColor;
        title.textContent = isWin ? "🏆 Kamu Menang!" : "⏳ Waktu Habis!";
        reason.textContent = isWin ? "Lawan kehabisan waktu" : "Kamu kehabisan waktu";
    } else if (game.in_checkmate()) {
        isWin = game.turn() !== playerColor;
        title.textContent = isWin ? "🏆 Kamu Menang!" : "❌ Kamu Kalah!";
        reason.textContent = "Skakmat";
    } else {
        title.textContent = "🤝 Seri!";
        reason.textContent = "Stalemate / Repetisi";
    }
  
    // REKAM STATISTIK
    if (isPureGame && gameMode === 'bot') {
        if (isTimeout || game.in_checkmate()) {
            if (isWin) {
                localStorage.setItem('chess_win', parseInt(localStorage.getItem('chess_win') || 0) + 1);
            } else {
                localStorage.setItem('chess_loss', parseInt(localStorage.getItem('chess_loss') || 0) + 1);
            }
        } else {
            localStorage.setItem('chess_draw', parseInt(localStorage.getItem('chess_draw') || 0) + 1);
        }
        loadInitialData(); 
    }
    saveGameToHistory(title.textContent);
  
    modal.classList.remove('hidden');
  }
  
  function playAgainSwap() {
    document.getElementById('gameOverModal').classList.add('hidden');
    // Otomatis ganti warna
    playerColor = playerColor === 'w' ? 'b' : 'w'; 
    document.getElementById('playerColor').value = playerColor; 
    startGameEngine();
  }

  // --- SISTEM RIWAYAT & REVIEW PGN ---

function saveGameToHistory(resultText) {
  const pgn = game.pgn();
  if (!pgn || game.history().length < 2) return; // Jangan simpan jika game kosong/terlalu singkat
  
  let history = JSON.parse(localStorage.getItem('chess_match_history') || '[]');
  const dateObj = new Date();
  const dateStr = dateObj.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'});
  
  // Masukkan di urutan teratas
  history.unshift({ date: dateStr, result: resultText, pgn: pgn });
  if (history.length > 5) history.pop(); // Batasi hanya 5 riwayat terakhir
  
  localStorage.setItem('chess_match_history', JSON.stringify(history));
}

function openHistoryScreen() {
  showScreen('screenHistory');
  const historyList = document.getElementById('historyList');
  const history = JSON.parse(localStorage.getItem('chess_match_history') || '[]');
  
  if (history.length === 0) {
      historyList.innerHTML = '<p class="text-gray-500 text-xs italic text-center mt-4">Belum ada riwayat pertandingan.</p>';
      return;
  }

  historyList.innerHTML = history.map((m, i) => `
      <div class="bg-gray-700 p-3 rounded flex flex-col gap-2 border border-gray-600">
          <div class="flex justify-between items-center">
              <span class="font-bold text-sm ${m.result.includes('Menang') ? 'text-green-400' : (m.result.includes('Kalah') ? 'text-red-400' : 'text-yellow-400')}">${m.result}</span>
              <span class="text-[10px] text-gray-400">${m.date}</span>
          </div>
          <div class="flex gap-2">
              <button onclick="reviewHistoricalPGN(${i})" class="flex-1 bg-blue-600 hover:bg-blue-500 text-xs py-1.5 rounded text-white font-bold">🔍 Tinjau</button>
              <button onclick="copyHistoricalPGN(${i})" class="flex-1 bg-gray-600 hover:bg-gray-500 text-xs py-1.5 rounded text-white font-bold">📋 Salin</button>
          </div>
      </div>
  `).join('');
}

function reviewHistoricalPGN(index) {
  const history = JSON.parse(localStorage.getItem('chess_match_history') || '[]');
  if(history[index]) loadAndReviewPGN(history[index].pgn);
}

// --- SISTEM REVIEW PGN DENGAN NAVIGASI MAJU MUNDUR ---

let reviewMoveList = [];
let currentReviewIndex = 0;

function reviewPGN() {
  const pgnData = document.getElementById('pgnInput').value;
  if (!pgnData.trim()) { showCustomAlert("⚠️ Masukkan teks PGN terlebih dahulu!"); return; }
  loadAndReviewPGN(pgnData);
}

function copyHistoricalPGN(index) {
  const history = JSON.parse(localStorage.getItem('chess_match_history') || '[]');
  if(history[index]) {
      const pgn = history[index].pgn;
      if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(pgn).then(() => showCustomAlert("✅ PGN berhasil disalin!")).catch(() => fallbackCopyTextToClipboard(pgn, () => showCustomAlert("✅ PGN disalin!")));
      } else {
          fallbackCopyTextToClipboard(pgn, () => showCustomAlert("✅ PGN disalin!"));
      }
  }
}

function loadAndReviewPGN(pgnData) {
  const cleanPGN = sanitizePGN(pgnData);
  
  if (game.load_pgn(cleanPGN)) {
      gameMode = 'review';
      reviewMoveList = game.history(); 
      currentReviewIndex = 0;
      game.reset(); 
      
      document.getElementById('displayBotLevel').textContent = "🔍 Mode Review PGN";
      clearInterval(timerInterval);
      document.getElementById('timerTop').classList.add('hidden');
      document.getElementById('timerBottom').classList.add('hidden');
      
      // --- AKTIFKAN UI BAR EVALUASI & KOTAK AKURASI ---
      showEvalBarSetting = document.getElementById('toggleEvalBar').checked;
      showAccuracySetting = document.getElementById('toggleAccuracy').checked;
      showFeedbackSetting = document.getElementById('toggleFeedback').checked;

      const evalContainer = document.getElementById('evalBarContainer');
      if (evalContainer) evalContainer.style.display = showEvalBarSetting ? 'flex' : 'none';

      const accTop = document.getElementById('accuracyTop');
      const accBot = document.getElementById('accuracyBottom');
      if (accTop && accBot) {
          accTop.style.display = showAccuracySetting ? 'block' : 'none';
          accBot.style.display = showAccuracySetting ? 'block' : 'none';
          document.getElementById('valAccTop').textContent = "100%";
          document.getElementById('valAccBottom').textContent = "100%";
      }
      
      // Reset data akurasi dan evaluasi ke titik 0
      accData = { w: { totalMoves: 0, loss: 0 }, b: { totalMoves: 0, loss: 0 } };
      lastWhiteEval = 0; currentWhiteEval = 0;
      updateEvalBarUI(0);
      // ------------------------------------------------

      // Tampilkan tombol navigasi
      const reviewCtrl = document.getElementById('reviewControls');
      reviewCtrl.classList.remove('hidden');
      reviewCtrl.classList.add('flex');
      
      lastMove = null;
      currentEndangeredPieces = [];
      resetFeedbackBox();
      document.getElementById('tutorStatus').textContent = "Memulai Analisis...";
      document.getElementById('tutorStatus').className = "text-xl font-extrabold text-blue-400";
      
      updateReviewUI();
      showScreen('screenGame');
      
      // Minta Stockfish mengevaluasi posisi awal sebelum mulai
      requestLiveBestMove();
  } else {
      showCustomAlert("❌ Format PGN tidak valid!<br>Pastikan teks kode PGN sudah benar.");
  }
}

function reviewNextMove() {
  if (currentReviewIndex < reviewMoveList.length) {
      game.move(reviewMoveList[currentReviewIndex]); // Jalan 1 langkah maju
      currentReviewIndex++;
      playSound('move');
      updateReviewUI();
      
      // --- MINTA EVALUASI SAAT MAJU ---
      document.getElementById('tutorStatus').textContent = "Menganalisis...";
      pendingEvaluation = true; // True = Hitung Akurasi & munculkan tulisan Good/Blunder
      requestLiveBestMove();
  }
}

function reviewPrevMove() {
  if (currentReviewIndex > 0) {
      game.undo(); // Mundur 1 langkah
      currentReviewIndex--;
      playSound('move');
      updateReviewUI();
      
      // --- UPDATE BAR EVALUASI SAAT MUNDUR TANPA MERUSAK AKURASI ---
      document.getElementById('tutorStatus').textContent = "Mundur...";
      pendingEvaluation = false; // False = Agar persentase akurasi tidak dihitung dobel saat mundur
      requestLiveBestMove();
  }
}

function updateReviewUI() {
  document.getElementById('reviewStepText').textContent = `Langkah: ${currentReviewIndex} / ${reviewMoveList.length}`;
  
  // Highlight kotak terakhir jalan
  if (currentReviewIndex > 0) {
      const historyVerbose = game.history({verbose: true});
      const last = historyVerbose[historyVerbose.length - 1];
      lastMove = { from: last.from, to: last.to };
  } else {
      lastMove = null;
  }
  
  updateCapturedPieces();
  updateMoveHistory();
  drawBoard();
}
// --- CUSTOM ALERT ---
function showCustomAlert(msg) {
  document.getElementById('customAlertText').innerHTML = msg;
  document.getElementById('customAlertModal').classList.remove('hidden');
}

// --- PEMBERSIH PGN (Versi Disempurnakan) ---
function sanitizePGN(pgn) {
  return pgn
    .replace(/♔/g, 'K').replace(/♕/g, 'Q').replace(/♖/g, 'R').replace(/♗/g, 'B').replace(/♘/g, 'N')
    .replace(/♚/g, 'K').replace(/♛/g, 'Q').replace(/♜/g, 'R').replace(/♝/g, 'B').replace(/♞/g, 'N')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Hanya hapus karakter spasi web tersembunyi, biarkan Enter (newline) tetap ada
    .trim();
}

// --- SISTEM INSTALL PWA ---
let deferredPrompt;
const btnInstallPwa = document.getElementById('btnInstallPwa');

window.addEventListener('beforeinstallprompt', (e) => {
  // Cegah browser memunculkan pop-up install bawaan secara otomatis
  e.preventDefault();
  // Simpan event-nya untuk dipanggil nanti saat tombol diklik
  deferredPrompt = e;
  // Munculkan tombol Install kita
  if (btnInstallPwa) btnInstallPwa.classList.remove('hidden');
});

if (btnInstallPwa) {
  btnInstallPwa.addEventListener('click', async () => {
    if (deferredPrompt) {
      // Munculkan pop-up install bawaan browser/Android
      deferredPrompt.prompt();
      // Tunggu respon user (apakah menekan "Install" atau "Cancel")
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User setuju menginstal PWA');
        // Sembunyikan tombol setelah berhasil diinstal
        btnInstallPwa.classList.add('hidden');
      }
      deferredPrompt = null;
    }
  });
}

// Deteksi jika aplikasi sukses terinstal
window.addEventListener('appinstalled', () => {
  if (btnInstallPwa) btnInstallPwa.classList.add('hidden');
});

canvas.addEventListener('mousedown', handleStart); canvas.addEventListener('mousemove', handleMove); canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('touchstart', handleStart, { passive: false }); canvas.addEventListener('touchmove', handleMove, { passive: false }); canvas.addEventListener('touchend', handleEnd);

drawBoard();