
// =====================================================
// FOCO CALMO - BACKGROUND
// =====================================================

const MENU_ID = "fc-ler-em-voz-alta";

// =====================================================
// INSTALAÇÃO
// =====================================================

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Ler em voz alta",
      contexts: ["selection"]
    });
  });
});

// =====================================================
// ENVIAR MENSAGEM
// =====================================================

function enviarMensagem(tabId, mensagem) {
  if (!tabId) {
    return;
  }

  chrome.tabs.sendMessage(tabId, mensagem, () => {
    if (chrome.runtime.lastError) {
      console.log(
        "Content script indisponível:",
        chrome.runtime.lastError.message
      );
    }
  });
}

// =====================================================
// ATALHO CTRL + SHIFT + C
// =====================================================

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

      if (!aba || !aba.id) {
        return;
      }

      chrome.storage.sync.get(
        ["modoCalmo"],
        (prefs) => {
          const novoValor =
            !Boolean(prefs.modoCalmo);

          chrome.storage.sync.set(
            {
              modoCalmo: novoValor
            },
            () => {
              enviarMensagem(
                aba.id,
                {
                  tipo:
                    "ATUALIZAR_PREFERENCIAS",
                  prefs: {
                    modoCalmo:
                      novoValor
                  }
                }
              );
            }
          );
        }
      );
    }
  );
});

// =====================================================
// MENU LER EM VOZ ALTA
// =====================================================

chrome.contextMenus.onClicked.addListener(
  (info, aba) => {
    if (
      info.menuItemId !== MENU_ID ||
      !info.selectionText ||
      !aba ||
      !aba.id
    ) {
      return;
    }

    enviarMensagem(
      aba.id,
      {
        tipo: "LER_EM_VOZ_ALTA",
        texto: info.selectionText
      }
    );
  }
);