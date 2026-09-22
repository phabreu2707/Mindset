// popup.js — roda quando o usuário abre o popup da extensão.
// Sempre mostra e salva as preferências GLOBAIS (válidas para todo site).
// Preferências específicas de um site só se ajustam na página de opções.

const campos = {
  modoCalmo: document.getElementById("modoCalmo"),
  fonteLegivel: document.getElementById("fonteLegivel"),
  coresSuaves: document.getElementById("coresSuaves"),
  esconderDistracoes: document.getElementById("esconderDistracoes")
};

const chaves = Object.keys(campos);

chrome.storage.sync.get(chaves, (prefs) => {
  chaves.forEach((chave) => {
    campos[chave].checked = !!prefs[chave];
  });
});

chrome.tabs.query({ active: true, currentWindow: true }, (abas) => {
  if (abas[0]?.url) {
    try {
      const dominio = new URL(abas[0].url).hostname.replace(/^www\./, "");
      document.getElementById("statusDominio").textContent = `Aplicando em: ${dominio}`;
    } catch (e) {
      // URL interna do navegador (ex: chrome://), sem domínio a mostrar
    }
  }
});

function salvarEAplicar() {
  const prefs = {};
  chaves.forEach((chave) => { prefs[chave] = campos[chave].checked; });

  chrome.storage.sync.set(prefs, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (abas) => {
      if (abas[0]?.id) {
        chrome.tabs.sendMessage(abas[0].id, { tipo: "ATUALIZAR_PREFERENCIAS", prefs });
      }
    });
  });
}

chaves.forEach((chave) => campos[chave].addEventListener("change", salvarEAplicar));

document.getElementById("abrirOpcoes").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (abas) => {
    let urlOpcoes = chrome.runtime.getURL("options.html");
    try {
      const dominio = new URL(abas[0]?.url).hostname.replace(/^www\./, "");
      urlOpcoes += `?dominio=${encodeURIComponent(dominio)}`;
    } catch (e) {
      // sem domínio (ex: chrome://), abre opções sem preferências por site
    }
    chrome.tabs.create({ url: urlOpcoes });
  });
});
