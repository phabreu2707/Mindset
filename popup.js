const IDS = [
  "modoCalmo",
  "fonteLegivel",
  "coresSuaves",
  "esconderDistracoes"
];

const padrao = {
  modoCalmo: false,
  fonteLegivel: false,
  coresSuaves: false,
  esconderDistracoes: false
};

const $ = (id) =>
  document.getElementById(id);

function mostrarStatus(texto) {
  $("status").textContent =
    texto;
}

function enviarParaAba(mensagem) {
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true
    },
    (abas) => {
      const aba = abas[0];

      if (
        !aba ||
        !aba.id ||
        !/^https?:\/\//i.test(
          aba.url || ""
        )
      ) {
        mostrarStatus(
          "Esta página não permite a extensão."
        );

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

function lerPreferencias(callback) {
  chrome.storage.sync.get(
    padrao,
    (prefs) => {

      IDS.forEach(
        (id) => {
          $(id).checked =
            Boolean(
              prefs[id]
            );
        }
      );

      callback?.(prefs);
    }
  );
}

function salvarPreferencias() {
  const prefs = {};

  IDS.forEach(
    (id) => {
      prefs[id] =
        $(id).checked;
    }
  );

  chrome.storage.sync.set(
    prefs,
    () => {

      enviarParaAba({
        tipo:
          "ATUALIZAR_PREFERENCIAS",

        prefs
      });

      mostrarStatus(
        "Preferências aplicadas."
      );
    }
  );
}

IDS.forEach(
  (id) => {
    $(id).addEventListener(
      "change",
      salvarPreferencias
    );
  }
);

$("iniciarTimer")
  .addEventListener(
    "click",
    () => {

      const segundos =
        Number(
          $("tempoFoco").value
        );

      enviarParaAba({
        tipo:
          "INICIAR_TIMER",

        segundos
      });

      mostrarStatus(
        "Timer iniciado nesta página."
      );
    }
  );

lerPreferencias();