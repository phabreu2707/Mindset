const IDS_TOGGLE = [
  "modoCalmo",
  "fonteLegivel",
  "esconderDistracoes",
  "guiaLeitura",
  "modoTexto"
];

const PADRAO = {
  modoCalmo: false,
  fonteLegivel: false,
  intensidadeCores: 0,
  esconderDistracoes: false,
  guiaLeitura: false,
  modoTexto: false
};

function obterPreferencias(callback) {
  chrome.storage.sync.get(
    PADRAO,
    callback
  );
}

function salvarPreferencia(chave, valor) {
  chrome.storage.sync.set({
    [chave]: valor
  });
}

function atualizarVisual(chave, ativo) {
  const opcao = document.querySelector(
    `[data-opcao="${chave}"]`
  );

  if (!opcao) return;

  opcao.classList.toggle(
    "ativa",
    ativo
  );
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

function carregarInterface() {

  obterPreferencias(prefs => {

    IDS_TOGGLE.forEach(chave => {

      const input =
        document.getElementById(chave);

      if (!input) return;

      input.checked =
        Boolean(prefs[chave]);

      atualizarVisual(
        chave,
        input.checked
      );
    });

    const sliderCores =
      document.getElementById(
        "intensidadeCores"
      );

    const valorCoresEl =
      document.getElementById(
        "valorIntensidadeCores"
      );

    const valorInicial =
      Number(
        prefs.intensidadeCores
      ) || 0;

    if (sliderCores) {
      sliderCores.value =
        valorInicial;
    }

    if (valorCoresEl) {
      valorCoresEl.textContent =
        `${valorInicial}%`;
    }

    atualizarVisual(
      "intensidadeCores",
      valorInicial > 0
    );

  });
}

IDS_TOGGLE.forEach(chave => {

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

      atualizarVisual(
        chave,
        valor
      );

      enviarParaAba({
        tipo:
          "ATUALIZAR_PREFERENCIAS",

        prefs: {
          [chave]: valor
        }
      });

    }
  );

});

const sliderCores =
  document.getElementById(
    "intensidadeCores"
  );

const valorCoresEl =
  document.getElementById(
    "valorIntensidadeCores"
  );

if (sliderCores) {

  sliderCores.addEventListener(
    "input",
    () => {

      const valor =
        Number(
          sliderCores.value
        );

      if (valorCoresEl) {

        valorCoresEl.textContent =
          `${valor}%`;

      }

      atualizarVisual(
        "intensidadeCores",
        valor > 0
      );

      enviarParaAba({

        tipo:
          "ATUALIZAR_PREFERENCIAS",

        prefs: {
          intensidadeCores:
            valor
        }

      });

    }
  );

  sliderCores.addEventListener(
    "change",
    () => {

      salvarPreferencia(
        "intensidadeCores",
        Number(sliderCores.value)
      );

    }
  );
}

const botaoSelecionar =
  document.getElementById(
    "botaoSelecionar"
  );

if (botaoSelecionar) {

  botaoSelecionar.addEventListener(
    "click",
    () => {

      enviarParaAba({
        tipo:
          "ATIVAR_SELETOR_MANUAL",

        ativar: true
      });

      window.close();

    }
  );
}

const botaoLimparSelecao =
  document.getElementById(
    "botaoLimparSelecao"
  );

if (botaoLimparSelecao) {

  botaoLimparSelecao.addEventListener(
    "click",
    () => {

      enviarParaAba({
        tipo:
          "LIMPAR_SELECAO_MANUAL"
      });

      botaoLimparSelecao.textContent =
        "Restaurado ✓";

      setTimeout(() => {

        botaoLimparSelecao.textContent =
          "Restaurar elementos desta página";

      }, 1200);

    }
  );
}

carregarInterface();