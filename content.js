// =====================================================
// FOCO CALMO - CONTENT SCRIPT 3.1
// =====================================================

(() => {
  // Evita inicializar o script duas vezes
  if (window.__FOCO_CALMO_INICIADO__) {
    return;
  }

  window.__FOCO_CALMO_INICIADO__ = true;

  // ===================================================
  // CLASSES
  // ===================================================

  const CLASSES = {
    modoCalmo: "fc-modo-calmo",
    fonteLegivel: "fc-fonte-legivel",
    coresSuaves: "fc-cores-suaves",
    escondido: "fc-escondido"
  };

  // ===================================================
  // SELETORES DE DISTRAÇÕES
  // ===================================================

  const SELETORES_DISTRACAO = [
    // Google / publicidade
    ".adsbygoogle",
    "ins.adsbygoogle",
    ".gpt-ad",
    ".dfp-ad",
    ".ad-container",
    ".ad-wrapper",
    ".ad-banner",
    ".advert-container",
    ".advertisement",
    ".advertising",

    // Classes comuns
    "[class*='advertisement']",
    "[class*='advertising']",
    "[class*='ad-container']",
    "[class*='ad-wrapper']",
    "[class*='ad-banner']",
    "[class*='ads-container']",
    "[class*='ads-wrapper']",
    "[class*='sponsored']",
    "[class*='sponsor']",
    "[class*='publicidade']",
    "[class*='anuncio']",
    "[class*='anúncio']",

    // IDs
    "[id*='advertisement']",
    "[id*='advertising']",
    "[id*='ad-container']",
    "[id*='ad-wrapper']",
    "[id*='ad-banner']",
    "[id*='ads-container']",
    "[id*='publicidade']",
    "[id*='anuncio']",
    "[id*='anúncio']",

    // Dados de publicidade
    "[data-ad]",
    "[data-ad-slot]",
    "[data-ad-client]",
    "[data-ad-unit]",
    "[data-ad-format]",
    "[data-advertisement]",
    "[data-advertiser]",
    "[data-google-query-id]",
    "[data-google-ad]",

    // Patrocinado
    "[aria-label*='advertisement' i]",
    "[aria-label*='publicidade' i]",
    "[aria-label*='anúncio' i]",
    "[aria-label*='anuncio' i]",
    "[aria-label*='sponsored' i]",
    "[aria-label*='patrocinado' i]",

    // Popups
    "[class*='popup']",
    "[id*='popup']",

    // Intersticiais
    "[class*='interstitial']",
    "[id*='interstitial']",

    // Overlays
    "[class*='overlay-ad']",
    "[id*='overlay-ad']",

    // Cookies
    "[class*='cookie-banner']",
    "[id*='cookie-banner']",
    "[class*='cookie-consent']",
    "[id*='cookie-consent']",
    "[class*='consent-banner']",
    "[id*='consent-banner']",

    // Newsletter
    "[class*='newsletter-popup']",
    "[id*='newsletter-popup']",
    "[class*='subscribe-popup']",
    "[id*='subscribe-popup']",

    // Banners flutuantes
    "[class*='sticky-banner']",
    "[id*='sticky-banner']",
    "[class*='floating-banner']",
    "[id*='floating-banner']",

    // Iframes publicitários
    "iframe[src*='doubleclick']",
    "iframe[src*='googlesyndication']",
    "iframe[src*='googleadservices']",
    "iframe[src*='adservice']",
    "iframe[src*='adsystem']",

    // Vídeos publicitários conhecidos
    ".video-ads",
    ".ytp-ad-module",
    ".ytp-ad-overlay-container",
    ".ytp-ad-text",
    ".ad-showing"
  ];

  let observadorDistracoes = null;
  let observadorMidia = null;
  let timerPausaId = null;
  let varreduraAgendada = false;

  let preferenciasAtuais = {};

  // ===================================================
  // DOMÍNIO
  // ===================================================

  function dominioAtual() {
    return location.hostname.replace(
      /^www\./,
      ""
    );
  }

  // ===================================================
  // IDENTIFICAR PUBLICIDADE
  // ===================================================

  function ehPublicidade(elemento) {
    if (!elemento || elemento.nodeType !== 1) {
      return false;
    }

    let atual = elemento;

    // Verifica o elemento e seus pais
    for (let i = 0; i < 5 && atual; i++) {
      const classe =
        typeof atual.className === "string"
          ? atual.className.toLowerCase()
          : "";

      const id =
        (
          atual.id || ""
        ).toLowerCase();

      const aria =
        (
          atual.getAttribute("aria-label") || ""
        ).toLowerCase();

      const dados =
        (
          atual.getAttribute("data-ad") ||
          atual.getAttribute("data-ad-slot") ||
          atual.getAttribute("data-ad-unit") ||
          atual.getAttribute("data-ad-format") ||
          atual.getAttribute("data-advertisement") ||
          ""
        ).toLowerCase();

      const texto =
        `${classe} ${id} ${aria} ${dados}`;

      const palavrasPublicidade = [
        "advertisement",
        "advertising",
        "publicidade",
        "anuncio",
        "anúncio",
        "sponsored",
        "patrocinado",
        "adsbygoogle",
        "ad-container",
        "ad-wrapper",
        "ad-banner",
        "video-ads",
        "ytp-ad",
        "doubleclick",
        "googlesyndication"
      ];

      if (
        palavrasPublicidade.some(
          palavra =>
            texto.includes(palavra)
        )
      ) {
        return true;
      }

      // Verifica origem de vídeos/iframes
      if (
        atual.tagName === "VIDEO" ||
        atual.tagName === "IFRAME"
      ) {
        const src =
          (
            atual.currentSrc ||
            atual.src ||
            atual.getAttribute("src") ||
            ""
          ).toLowerCase();

        if (
          src.includes("doubleclick") ||
          src.includes("googlesyndication") ||
          src.includes("googleadservices") ||
          src.includes("adservice") ||
          src.includes("/ads/") ||
          src.includes("advert")
        ) {
          return true;
        }
      }

      atual = atual.parentElement;
    }

    return false;
  }

  // ===================================================
  // APLICAR PREFERÊNCIAS
  // ===================================================

  function aplicarPreferencias(prefs = {}) {
    preferenciasAtuais = {
      ...preferenciasAtuais,
      ...prefs
    };

    const raiz =
      document.documentElement;

    raiz.classList.toggle(
      CLASSES.modoCalmo,
      Boolean(
        preferenciasAtuais.modoCalmo
      )
    );

    raiz.classList.toggle(
      CLASSES.fonteLegivel,
      Boolean(
        preferenciasAtuais.fonteLegivel
      )
    );

    raiz.classList.toggle(
      CLASSES.coresSuaves,
      Boolean(
        preferenciasAtuais.coresSuaves
      )
    );

    // Distrações
    if (
      preferenciasAtuais.esconderDistracoes
    ) {
      ativarRemocaoDistracoes();
    } else {
      desativarRemocaoDistracoes();
    }

    // Mídias
    if (
      preferenciasAtuais.modoCalmo
    ) {
      pausarMidiasNormais();
      ativarObservadorMidia();
    } else {
      desativarObservadorMidia();
    }

    // Timer
    configurarTimerPausa(
      Number(
        preferenciasAtuais.timerPausaMinutos
      ) || 0
    );
  }

  // ===================================================
  // PAUSAR VÍDEOS NORMAIS
  // ===================================================

  function pausarMidia(elemento) {
    if (!elemento) {
      return;
    }

    // IMPORTANTE:
    // anúncio nunca é pausado
    if (ehPublicidade(elemento)) {
      return;
    }

    try {
      if (!elemento.paused) {
        elemento.pause();
      }
    } catch (erro) {
      // Ignora mídia que não pode ser pausada
    }
  }

  function pausarMidiasNormais() {
    document
      .querySelectorAll(
        "video, audio"
      )
      .forEach(
        pausarMidia
      );
  }

  // ===================================================
  // OBSERVADOR DE VÍDEOS
  // ===================================================

  function ativarObservadorMidia() {
    if (
      observadorMidia ||
      !document.body
    ) {
      return;
    }

    observadorMidia =
      new MutationObserver(
        (mutacoes) => {
          if (
            !preferenciasAtuais.modoCalmo
          ) {
            return;
          }

          for (const mutacao of mutacoes) {
            for (
              const node of mutacao.addedNodes
            ) {
              if (
                node.nodeType !== 1
              ) {
                continue;
              }

              if (
                node.matches?.(
                  "video, audio"
                )
              ) {
                pausarMidia(node);
              }

              node
                .querySelectorAll?.(
                  "video, audio"
                )
                .forEach(
                  pausarMidia
                );
            }
          }
        }
      );

    observadorMidia.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }

  function desativarObservadorMidia() {
    if (
      observadorMidia
    ) {
      observadorMidia.disconnect();
      observadorMidia = null;
    }
  }

  // ===================================================
  // ESCONDER DISTRAÇÕES
  // ===================================================

  function esconderDistracoesAgora() {
    if (
      !preferenciasAtuais.esconderDistracoes
    ) {
      return;
    }

    SELETORES_DISTRACAO.forEach(
      (seletor) => {
        try {
          document
            .querySelectorAll(seletor)
            .forEach(
              (elemento) => {
                const rect =
                  elemento.getBoundingClientRect();

                if (
                  rect.width > 80 ||
                  rect.height > 40
                ) {
                  elemento.classList.add(
                    CLASSES.escondido
                  );
                }
              }
            );
        } catch (erro) {
          // Seletor incompatível é ignorado
        }
      }
    );

    // Elementos explicitamente marcados
    document
      .querySelectorAll(
        "[aria-label], [data-testid], [data-ad]"
      )
      .forEach(
        (elemento) => {
          const dados =
            `${elemento.getAttribute(
              "aria-label"
            ) || ""} ${
              elemento.getAttribute(
                "data-testid"
              ) || ""
            } ${
              elemento.getAttribute(
                "data-ad"
              ) || ""
            }`.toLowerCase();

          if (
            dados.includes("publicidade") ||
            dados.includes("advertisement") ||
            dados.includes("anúncio") ||
            dados.includes("anuncio") ||
            dados.includes("sponsored") ||
            dados.includes("patrocinado")
          ) {
            elemento.classList.add(
              CLASSES.escondido
            );
          }
        }
      );
  }

  // ===================================================
  // AGENDAR VARREDURA
  // ===================================================

  function agendarVarreduraDistracoes() {
    if (varreduraAgendada) {
      return;
    }

    varreduraAgendada = true;

    requestAnimationFrame(() => {
      varreduraAgendada = false;

      esconderDistracoesAgora();
    });
  }

  // ===================================================
  // ATIVAR REMOÇÃO
  // ===================================================

  function ativarRemocaoDistracoes() {
    esconderDistracoesAgora();

    if (
      observadorDistracoes ||
      !document.body
    ) {
      return;
    }

    observadorDistracoes =
      new MutationObserver(
        () => {
          agendarVarreduraDistracoes();
        }
      );

    observadorDistracoes.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }

  // ===================================================
  // DESATIVAR REMOÇÃO
  // ===================================================

  function desativarRemocaoDistracoes() {
    if (
      observadorDistracoes
    ) {
      observadorDistracoes.disconnect();
      observadorDistracoes = null;
    }

    document
      .querySelectorAll(
        "." + CLASSES.escondido
      )
      .forEach(
        (elemento) => {
          elemento.classList.remove(
            CLASSES.escondido
          );
        }
      );
  }

  // ===================================================
  // LEITURA EM VOZ ALTA
  // ===================================================

  function lerEmVozAlta(texto) {
    if (!texto) {
      return;
    }

    if (
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const fala =
      new SpeechSynthesisUtterance(
        texto
      );

    fala.lang = "pt-BR";
    fala.rate = 0.95;
    fala.pitch = 1;

    window.speechSynthesis.speak(
      fala
    );
  }

  // ===================================================
  // TIMER
  // ===================================================

  function configurarTimerPausa(
    minutos
  ) {
    if (timerPausaId) {
      clearInterval(
        timerPausaId
      );

      timerPausaId = null;
    }

    if (
      !minutos ||
      minutos <= 0
    ) {
      return;
    }

    timerPausaId =
      setInterval(
        mostrarAvisoPausa,
        minutos *
          60 *
          1000
      );
  }

  function mostrarAvisoPausa() {
    const antigo =
      document.getElementById(
        "fc-aviso-pausa"
      );

    if (antigo) {
      antigo.remove();
    }

    const aviso =
      document.createElement(
        "div"
      );

    aviso.id =
      "fc-aviso-pausa";

    aviso.textContent =
      "Hora de fazer uma pausa curta.";

    document.body.appendChild(
      aviso
    );

    requestAnimationFrame(() => {
      aviso.classList.add(
        "fc-aviso-visivel"
      );
    });

    setTimeout(() => {
      aviso.classList.remove(
        "fc-aviso-visivel"
      );

      setTimeout(() => {
        aviso.remove();
      }, 400);
    }, 6000);
  }

  // ===================================================
  // CARREGAR PREFERÊNCIAS
  // ===================================================

  function carregarPreferencias() {
    const global = [
      "modoCalmo",
      "fonteLegivel",
      "coresSuaves",
      "esconderDistracoes",
      "timerPausaMinutos"
    ];

    const dominio =
      dominioAtual();

    const chavesDominio =
      global.map(
        chave =>
          `${dominio}:${chave}`
      );

    chrome.storage.sync.get(
      [
        ...global,
        ...chavesDominio
      ],
      (dados) => {
        const prefsFinal = {};

        global.forEach(
          (chave) => {
            const valorDominio =
              dados[
                `${dominio}:${chave}`
              ];

            prefsFinal[chave] =
              valorDominio !==
              undefined
                ? valorDominio
                : dados[chave];
          }
        );

        aplicarPreferencias(
          prefsFinal
        );
      }
    );
  }

  // ===================================================
  // MENSAGENS
  // ===================================================

  chrome.runtime.onMessage.addListener(
    (mensagem) => {
      if (!mensagem) {
        return;
      }

      if (
        mensagem.tipo ===
        "ATUALIZAR_PREFERENCIAS"
      ) {
        aplicarPreferencias(
          mensagem.prefs || {}
        );
      }

      if (
        mensagem.tipo ===
        "LER_EM_VOZ_ALTA"
      ) {
        lerEmVozAlta(
          mensagem.texto
        );
      }
    }
  );

  // ===================================================
  // INICIALIZAÇÃO
  // ===================================================

  carregarPreferencias();
})();