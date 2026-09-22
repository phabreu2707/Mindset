// =====================================================
// FOCO CALMO - OPTIONS
// =====================================================

const seletorTimer =
  document.getElementById(
    "timerPausaMinutos"
  );

const statusSalvo =
  document.getElementById(
    "statusSalvo"
  );

function mostrarSalvo() {
  if (!statusSalvo) {
    return;
  }

  statusSalvo.style.opacity =
    "1";

  setTimeout(() => {
    statusSalvo.style.opacity =
      "0";
  }, 1200);
}

// =====================================================
// AVISAR ABA ATIVA
// =====================================================

function avisarAbaAtivaSePossivel(
  prefsParciais
) {
  chrome.tabs.query(
    {
      active: true,
      lastFocusedWindow: true
    },
    (abas) => {
      const aba = abas[0];

      if (!aba?.id) {
        return;
      }

      chrome.tabs.sendMessage(
        aba.id,
        {
          tipo:
            "ATUALIZAR_PREFERENCIAS",
          prefs:
            prefsParciais
        },
        () => {
          void chrome.runtime.lastError;
        }
      );
    }
  );
}

// =====================================================
// TIMER
// =====================================================

chrome.storage.sync.get(
  ["timerPausaMinutos"],
  (prefs) => {
    if (seletorTimer) {
      seletorTimer.value =
        String(
          prefs.timerPausaMinutos || 0
        );
    }
  }
);

if (seletorTimer) {
  seletorTimer.addEventListener(
    "change",
    () => {
      const minutos =
        Number(
          seletorTimer.value
        );

      chrome.storage.sync.set(
        {
          timerPausaMinutos:
            minutos
        },
        () => {
          mostrarSalvo();

          avisarAbaAtivaSePossivel(
            {
              timerPausaMinutos:
                minutos
            }
          );
        }
      );
    }
  );
}

// =====================================================
// PREFERÊNCIAS POR SITE
// =====================================================

const params =
  new URLSearchParams(
    location.search
  );

const dominio =
  params.get("dominio");

const camposSite = {
  siteModoCalmo:
    "modoCalmo",

  siteFonteLegivel:
    "fonteLegivel",

  siteCoresSuaves:
    "coresSuaves",

  siteEsconderDistracoes:
    "esconderDistracoes"
};

// =====================================================
// CONFIGURAÇÃO DO SITE
// =====================================================

if (dominio) {

  const texto =
    document.getElementById(
      "dominioAtualTexto"
    );

  const camposPorSite =
    document.getElementById(
      "camposPorSite"
    );

  const dominioExibido =
    document.getElementById(
      "dominioExibido"
    );

  if (texto) {
    texto.textContent =
      "Estas preferências serão usadas somente neste site.";
  }

  if (dominioExibido) {
    dominioExibido.textContent =
      dominio;
  }

  if (camposPorSite) {
    camposPorSite.style.display =
      "block";
  }

  // ===============================================
  // CARREGAR
  // ===============================================

  const chavesDominio =
    Object.values(
      camposSite
    ).map(
      chave =>
        `${dominio}:${chave}`
    );

  chrome.storage.sync.get(
    chavesDominio,
    (dados) => {

      Object.entries(
        camposSite
      ).forEach(
        ([idCampo, chaveBase]) => {

          const campo =
            document.getElementById(
              idCampo
            );

          if (!campo) {
            return;
          }

          campo.checked =
            Boolean(
              dados[
                `${dominio}:${chaveBase}`
              ]
            );
        }
      );
    }
  );

  // ===============================================
  // SALVAR
  // ===============================================

  Object.entries(
    camposSite
  ).forEach(
    ([idCampo, chaveBase]) => {

      const campo =
        document.getElementById(
          idCampo
        );

      if (!campo) {
        return;
      }

      campo.addEventListener(
        "change",
        (evento) => {

          const chaveCompleta =
            `${dominio}:${chaveBase}`;

          const valor =
            evento.target.checked;

          chrome.storage.sync.set(
            {
              [chaveCompleta]:
                valor
            },
            () => {

              mostrarSalvo();

              avisarAbaAtivaSePossivel(
                {
                  [chaveBase]:
                    valor
                }
              );
            }
          );
        }
      );
    }
  );
}