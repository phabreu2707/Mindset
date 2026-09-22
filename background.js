// background.js — roda em segundo plano, fora de qualquer página.
// Cuida do atalho de teclado e do menu de contexto "Ler em voz alta".

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "fc-ler-em-voz-alta",
    title: "Ler em voz alta",
    contexts: ["selection"]
  });
});

// Atalho de teclado (Ctrl+Shift+C) alterna o modo calmo na aba ativa
chrome.commands.onCommand.addListener((comando) => {
  if (comando !== "toggle-modo-calmo") return;

  chrome.storage.sync.get(["modoCalmo"], (prefs) => {
    const novoValor = !prefs.modoCalmo;
    chrome.storage.sync.set({ modoCalmo: novoValor }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (abas) => {
        if (abas[0]?.id) {
          chrome.tabs.sendMessage(abas[0].id, {
            tipo: "ATUALIZAR_PREFERENCIAS",
            prefs: { ...prefs, modoCalmo: novoValor }
          });
        }
      });
    });
  });
});

// Clique em "Ler em voz alta" no menu de contexto (botão direito)
chrome.contextMenus.onClicked.addListener((info, aba) => {
  if (info.menuItemId === "fc-ler-em-voz-alta" && info.selectionText && aba?.id) {
    chrome.tabs.sendMessage(aba.id, {
      tipo: "LER_EM_VOZ_ALTA",
      texto: info.selectionText
    });
  }
});
