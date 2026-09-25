const IDS = [
  "modoCalmo",
  "fonteLegivel",
  "coresSuaves",
  "esconderDistracoes"
];

const PADRAO = {
  modoCalmo: false,
  fonteLegivel: false,
  coresSuaves: false,
  esconderDistracoes: false
};

function obterPreferencias(callback) {
  chrome.storage.sync.get(
    PADRAO,
    callback
  );
}

function salvarPreferencia(
  chave,
  valor
) {
  chrome.storage.sync.set({
    [chave]: Boolean(valor)
  });
}

function atualizarVisual(chave) {
  const input =
    document.getElementById(chave);

  if (!input) return;

  const opcao =
    document.querySelector(
      `[data-opcao="${chave}"]`
    );

  if (!opcao) return;

  opcao.classList.toggle(
    "ativa",
    input.checked
  );
}

function carregarInterface() {
  obterPreferencias(prefs => {
    IDS.forEach(chave => {
      const input =
        document.getElementById(chave);

      if (!input) return;

      input.checked =
        Boolean(prefs[chave]);

      atualizarVisual(chave);
    });
  });
}

function enviarParaAba(mensagem) {
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true
    },
    abas => {
      const aba = abas[0];

      if (
        !aba ||
        !aba.id ||
        !/^https?:\/\//i.test(
          aba.url || ""
        )
      ) {
        return;
      }

      chrome.tabs.sendMessage(
        aba.id,
        mensagem,
        () => {
          void chrome.runtime.lastError;
        }
      );
    }
  );
}

IDS.forEach(chave => {
  const input =
    document.getElementById(chave);

  if (!input) return;

  input.addEventListener(
    "change",
    () => {
      const valor =
        input.checked;

      salvarPreferencia(
        chave,
        valor
      );

      atualizarVisual(chave);

      enviarParaAba({
        tipo: "ATUALIZAR_PREFERENCIAS",
        prefs: {
          [chave]: valor
        }
      });
    }
  );
});

carregarInterface();
