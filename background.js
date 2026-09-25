const MENU_ID = "fc-ler-em-voz-alta";

function criarMenu() {
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError;

    chrome.contextMenus.create(
      {
        id: MENU_ID,
        title: "Ler em voz alta",
        contexts: ["selection"]
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  });
}

chrome.runtime.onInstalled.addListener(criarMenu);
chrome.runtime.onStartup.addListener(criarMenu);

function podeEnviarParaAba(aba) {
  return Boolean(
    aba &&
    aba.id &&
    /^https?:\/\//i.test(aba.url || "")
  );
}

function enviarMensagem(tabId, mensagem) {
  if (!tabId) return;

  chrome.tabs.sendMessage(
    tabId,
    mensagem,
    () => {
      void chrome.runtime.lastError;
    }
  );
}

chrome.commands.onCommand.addListener((comando) => {
  if (comando !== "toggle-modo-calmo") {
    return;
  }

  chrome.tabs.query(
    {
      active: true,
      currentWindow: true
    },
    (abas) => {
      const aba = abas[0];

      if (!podeEnviarParaAba(aba)) {
        return;
      }

      chrome.storage.sync.get(
        {
          modoCalmo: false
        },
        (prefs) => {
          const novoValor = !Boolean(prefs.modoCalmo);

          chrome.storage.sync.set(
            {
              modoCalmo: novoValor
            },
            () => {
              enviarMensagem(aba.id, {
                tipo: "ATUALIZAR_PREFERENCIAS",
                prefs: {
                  modoCalmo: novoValor
                }
              });
            }
          );
        }
      );
    }
  );
});

chrome.contextMenus.onClicked.addListener((info, aba) => {
  if (
    info.menuItemId !== MENU_ID ||
    !info.selectionText ||
    !podeEnviarParaAba(aba)
  ) {
    return;
  }

  enviarMensagem(aba.id, {
    tipo: "LER_EM_VOZ_ALTA",
    texto: info.selectionText.trim()
  });
});