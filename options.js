// options.js — roda na página de configurações completa.

const seletorTimer = document.getElementById("timerPausaMinutos");
const statusSalvo = document.getElementById("statusSalvo");

function mostrarSalvo() {
  statusSalvo.style.opacity = "1";
  setTimeout(() => { statusSalvo.style.opacity = "0"; }, 1200);
}

// ===== Timer (preferência global) =====
chrome.storage.sync.get(["timerPausaMinutos"], (prefs) => {
  seletorTimer.value = String(prefs.timerPausaMinutos || 0);
});

seletorTimer.addEventListener("change", () => {
  const minutos = Number(seletorTimer.value);
  chrome.storage.sync.set({ timerPausaMinutos: minutos }, () => {
    mostrarSalvo();
    avisarAbaAtivaSePossivel({ timerPausaMinutos: minutos });
  });
});

function avisarAbaAtivaSePossivel(prefsParciais) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (abas) => {
    if (abas[0]?.id) {
      chrome.tabs.sendMessage(abas[0].id, { tipo: "ATUALIZAR_PREFERENCIAS", prefs: prefsParciais }, () => {
        void chrome.runtime.lastError; // ignora se a aba não tiver o content script
      });
    }
  });
}

// ===== Preferências por site =====
// O domínio-alvo vem via ?dominio=exemplo.com na URL (setado pelo popup.js)
const params = new URLSearchParams(location.search);
const dominio = params.get("dominio");

const camposSite = {
  siteModoCalmo: "modoCalmo",
  siteFonteLegivel: "fonteLegivel",
  siteCoresSuaves: "coresSuaves",
  siteEsconderDistracoes: "esconderDistracoes"
};

if (dominio) {
  document.getElementById("dominioAtualTexto").textContent = `Configurando preferências específicas para: ${dominio}`;
  document.getElementById("camposPorSite").style.display = "block";

  const chavesDominio = Object.values(camposSite).map((c) => `${dominio}:${c}`);
  chrome.storage.sync.get(chavesDominio, (dados) => {
    Object.entries(camposSite).forEach(([idCampo, chaveBase]) => {
      document.getElementById(idCampo).checked = !!dados[`${dominio}:${chaveBase}`];
    });
  });

  Object.entries(camposSite).forEach(([idCampo, chaveBase]) => {
    document.getElementById(idCampo).addEventListener("change", (evento) => {
      const chaveCompleta = `${dominio}:${chaveBase}`;
      chrome.storage.sync.set({ [chaveCompleta]: evento.target.checked }, () => {
        mostrarSalvo();
        avisarAbaAtivaSePossivel({ [chaveBase]: evento.target.checked });
      });
    });
  });
}
