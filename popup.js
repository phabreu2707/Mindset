// =====================================================
// FOCO CALMO - POPUP 3.1
// =====================================================

const campos = {
  modoCalmo:
    document.getElementById(
      "modoCalmo"
    ),

  fonteLegivel:
    document.getElementById(
      "fonteLegivel"
    ),

  coresSuaves:
    document.getElementById(
      "coresSuaves"
    ),

  esconderDistracoes:
    document.getElementById(
      "esconderDistracoes"
    )
};

const chaves =
  Object.keys(campos);

// =====================================================
// CARREGAR PREFERÊNCIAS
// =====================================================

chrome.storage.sync.get(
  chaves,
  (prefs) => {
    chaves.forEach(
      (chave) => {
        if (campos[chave]) {
          campos[chave].checked =
            Boolean(
              prefs[chave]
            );
        }
      }
    );
  }
);

// =====================================================
// MOSTRAR DOMÍNIO
// =====================================================

chrome.tabs.query(
  {
    active: true,
    currentWindow: true
  },
  (abas) => {
    const aba = abas[0];

    if (!aba || !aba.url) {
      return;
    }

    try {
      const url =
        new URL(aba.url);

      const dominio =
        url.hostname.replace(
          /^www\./,
          ""
        );

      const status =
        document.getElementById(
          "statusDominio"
        );

      if (status) {
        status.textContent =
          `Ativo em: ${dominio}`;
      }

    } catch (erro) {
      const status =
        document.getElementById(
          "statusDominio"
        );

      if (status) {
        status.textContent =
          "Página especial do navegador";
      }
    }
  }
);

// =====================================================
// SALVAR E APLICAR
// =====================================================

async function salvarEAplicar() {
  const prefs = {};

  chaves.forEach(
    (chave) => {
      if (campos[chave]) {
        prefs[chave] =
          campos[chave].checked;
      }
    }
  );

  chrome.storage.sync.set(
    prefs
  );

  const abas =
    await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

  const aba =
    abas[0];

  if (!aba || !aba.id) {
    return;
  }

  chrome.tabs.sendMessage(
    aba.id,
    {
      tipo:
        "ATUALIZAR_PREFERENCIAS",
      prefs
    },
    () => {
      // Ignora erro em páginas onde
      // extensões não podem executar.
      void chrome.runtime.lastError;
    }
  );
}

// =====================================================
// EVENTOS
// =====================================================

chaves.forEach(
  (chave) => {
    if (campos[chave]) {
      campos[chave].addEventListener(
        "change",
        salvarEAplicar
      );
    }
  }
);

// =====================================================
// ABRIR CONFIGURAÇÕES
// =====================================================

const botaoOpcoes =
  document.getElementById(
    "abrirOpcoes"
  );

if (botaoOpcoes) {
  botaoOpcoes.addEventListener(
    "click",
    async () => {
      const abas =
        await chrome.tabs.query({
          active: true,
          currentWindow: true
        });

      const aba =
        abas[0];

      let urlOpcoes =
        chrome.runtime.getURL(
          "options.html"
        );

      try {
        const dominio =
          new URL(
            aba.url
          ).hostname.replace(
            /^www\./,
            ""
          );

        urlOpcoes +=
          `?dominio=${encodeURIComponent(
            dominio
          )}`;

      } catch (erro) {
        // Página interna do Chrome.
      }

      chrome.tabs.create({
        url: urlOpcoes
      });
    }
  );
}