// content.js — roda dentro de cada página visitada.

const CLASSES = {
  modoCalmo: "fc-modo-calmo",
  fonteLegivel: "fc-fonte-legivel",
  coresSuaves: "fc-cores-suaves"
};

// Seletores comuns de anúncios, banners e pop-ups em sites variados.
// Lista deliberadamente conservadora para não quebrar sites por engano.
const SELETORES_DISTRACAO = [
  "[class*='popup']", "[id*='popup']",
  "[class*='modal']:not([class*='modal-content'])",
  "[class*='cookie-banner']", "[id*='cookie-banner']",
  "[class*='newsletter-signup']",
  "iframe[src*='ads']", "[class*='advert']", "[id*='advert']",
  "[class*='sticky-banner']", "[class*='overlay-ad']"
];

let observadorDistracoes = null;

function dominioAtual() {
  return location.hostname.replace(/^www\./, "");
}

function chavesStorage() {
  return {
    global: ["modoCalmo", "fonteLegivel", "coresSuaves", "esconderDistracoes", "timerPausaMinutos"],
    dominio: dominioAtual()
  };
}

function aplicarPreferencias(prefs) {
  const raiz = document.documentElement;

  raiz.classList.toggle(CLASSES.modoCalmo, !!prefs.modoCalmo);
  raiz.classList.toggle(CLASSES.fonteLegivel, !!prefs.fonteLegivel);
  raiz.classList.toggle(CLASSES.coresSuaves, !!prefs.coresSuaves);

  if (prefs.modoCalmo) {
    document.querySelectorAll("video, audio").forEach((midia) => {
      if (!midia.paused) midia.pause();
    });
  }

  if (prefs.esconderDistracoes) {
    ativarRemocaoDistracoes();
  } else {
    desativarRemocaoDistracoes();
  }

  configurarTimerPausa(prefs.timerPausaMinutos > 0 ? prefs.timerPausaMinutos : 0);
}

// ===== Esconder anúncios/pop-ups (inclusive os que aparecem depois) =====
function esconderDistracoesAgora() {
  SELETORES_DISTRACAO.forEach((seletor) => {
    document.querySelectorAll(seletor).forEach((el) => {
      el.classList.add("fc-escondido");
    });
  });
}

function ativarRemocaoDistracoes() {
  esconderDistracoesAgora();
  if (observadorDistracoes) return;
  observadorDistracoes = new MutationObserver(() => esconderDistracoesAgora());
  observadorDistracoes.observe(document.body, { childList: true, subtree: true });
}

function desativarRemocaoDistracoes() {
  if (observadorDistracoes) {
    observadorDistracoes.disconnect();
    observadorDistracoes = null;
  }
  document.querySelectorAll(".fc-escondido").forEach((el) => el.classList.remove("fc-escondido"));
}

// ===== Leitura em voz alta (TTS) =====
function lerEmVozAlta(texto) {
  if (!texto) return;
  window.speechSynthesis.cancel();
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.rate = 0.95;
  window.speechSynthesis.speak(fala);
}

// ===== Timer visual de pausa (não sonoro) =====
let timerPausaId = null;

function configurarTimerPausa(minutos) {
  if (timerPausaId) {
    clearInterval(timerPausaId);
    timerPausaId = null;
  }
  if (!minutos) return;

  timerPausaId = setInterval(() => {
    mostrarAvisoPausa();
  }, minutos * 60 * 1000);
}

function mostrarAvisoPausa() {
  const aviso = document.createElement("div");
  aviso.textContent = "Hora de uma pausa curta";
  aviso.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
    background: #0f6e56; color: #fff; padding: 14px 20px; border-radius: 10px;
    font-family: Arial, sans-serif; font-size: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    opacity: 0; transition: opacity 0.6s ease;
  `;
  document.body.appendChild(aviso);
  requestAnimationFrame(() => { aviso.style.opacity = "1"; });
  setTimeout(() => {
    aviso.style.opacity = "0";
    setTimeout(() => aviso.remove(), 700);
  }, 6000);
}

// ===== Carregamento inicial: mescla preferências globais + do domínio =====
function carregarPreferencias() {
  const { global, dominio } = chavesStorage();
  const chavesDominio = global.map((c) => `${dominio}:${c}`);

  chrome.storage.sync.get([...global, ...chavesDominio], (dados) => {
    const prefsFinal = {};
    global.forEach((chave) => {
      const valorDominio = dados[`${dominio}:${chave}`];
      prefsFinal[chave] = valorDominio !== undefined ? valorDominio : dados[chave];
    });
    aplicarPreferencias(prefsFinal);
  });
}

carregarPreferencias();

chrome.runtime.onMessage.addListener((mensagem) => {
  if (mensagem.tipo === "ATUALIZAR_PREFERENCIAS") {
    aplicarPreferencias(mensagem.prefs);
  }
  if (mensagem.tipo === "LER_EM_VOZ_ALTA") {
    lerEmVozAlta(mensagem.texto);
  }
});
