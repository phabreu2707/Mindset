(() => {
  "use strict";

  if (window.__FOCO_CALMO_INICIADO__) {
    return;
  }

  window.__FOCO_CALMO_INICIADO__ = true;

  const CLASSES = {
    modoCalmo: "fc-modo-calmo",
    fonteLegivel: "fc-fonte-legivel",
    coresSuaves: "fc-cores-suaves",
    esconderDistracoes: "fc-esconder-distracoes",
    escondido: "fc-escondido",
    guiaLeitura: "fc-guia-leitura",
    guiaDestaque: "fc-guia-destaque",
    modoTexto: "fc-modo-texto",
    modoSelecao: "fc-modo-selecao",
    destaqueSelecao: "fc-destaque-selecao"
  };

  const PREFERENCIAS_PADRAO = {
    modoCalmo: false,
    fonteLegivel: false,
    intensidadeCores: 0,
    esconderDistracoes: false,
    guiaLeitura: false,
    modoTexto: false
  };

  const HOSTS_PUBLICIDADE = [
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "googletagservices.com",
    "securepubads.g.doubleclick.net",
    "adnxs.com",
    "adnxs.net",
    "criteo.com",
    "criteo.net",
    "taboola.com",
    "outbrain.com",
    "amazon-adsystem.com",
    "2mdn.net",
    "adsrvr.org",
    "rubiconproject.com",
    "pubmatic.com",
    "openx.net",
    "sharethrough.com"
  ];

  const SELETORES_PUBLICIDADE = [
    "ins.adsbygoogle",
    "[data-ad-client]",
    "[data-ad-slot]",
    "[data-ad-unit]",
    "[data-ad-format]",
    "[data-ad-region]",
    "[data-advertisement]",
    "[data-advertising]",
    "[data-google-query-id]",
    "[data-testid*='ad' i]",
    "[aria-label*='advertisement' i]",
    "[aria-label*='publicidade' i]",
    "[aria-label*='patrocinado' i]",
    "[aria-label*='sponsored' i]",
    "[class*='adsbygoogle' i]",
    "[id*='adsbygoogle' i]",
    "[class*='taboola' i]",
    "[id*='taboola' i]",
    "[class*='outbrain' i]",
    "[id*='outbrain' i]",
    "[class*='advertisement' i]",
    "[id*='advertisement' i]",
    "[class*='ad-container' i]",
    "[id*='ad-container' i]",
    "[class*='ad-wrapper' i]",
    "[id*='ad-wrapper' i]",
    "[class*='sponsor' i]",
    "[id*='sponsor' i]",
    "iframe[src*='doubleclick.net' i]",
    "iframe[src*='googlesyndication.com' i]",
    "iframe[src*='googleadservices.com' i]",
    "iframe[src*='taboola.com' i]",
    "iframe[src*='outbrain.com' i]"
  ];

  const PADROES_PUBLICIDADE = [
    /\badvertisement\b/i,
    /\badvertising\b/i,
    /\bpublicidade\b/i,
    /\bpatrocinado\b/i,
    /\bsponsored\b/i,
    /\bad[-_]?container\b/i,
    /\bad[-_]?wrapper\b/i,
    /\bad[-_]?slot\b/i,
    /\bad[-_]?banner\b/i,
    /\bgoogle[-_]?ads\b/i,
    /\badsbygoogle\b/i,
    /\btaboola\b/i,
    /\boutbrain\b/i,
    /\bdoubleclick\b/i,
    /\bdfp[-_]?ad\b/i,
    /\bdart[-_]?ad\b/i
  ];

  let preferencias = { ...PREFERENCIAS_PADRAO };

  let observadorDOM = null;
  let observadorMidia = null;
  let restauracaoAgendada = null;

  let falando = false;
  let filaFala = [];
  let indiceFala = 0;

  let modoSelecaoAtivo = false;
  let elementoDestacado = null;

  let elementoGuiaAtual = null;

  function estaNoDocumento(elemento) {
    return (
      elemento &&
      elemento.nodeType === Node.ELEMENT_NODE &&
      document.documentElement.contains(elemento)
    );
  }

  function obterTextoSeguro(elemento) {
    if (!elemento) return "";

    return [
      elemento.id || "",
      typeof elemento.className === "string"
        ? elemento.className
        : "",
      elemento.getAttribute?.("aria-label") || "",
      elemento.getAttribute?.("data-testid") || ""
    ].join(" ");
  }

  function hostParecePublicidade(url) {
    if (!url) return false;

    try {
      const host = new URL(
        url,
        location.href
      ).hostname.toLowerCase();

      return HOSTS_PUBLICIDADE.some(
        dominio =>
          host === dominio ||
          host.endsWith("." + dominio)
      );
    } catch {
      return false;
    }
  }

  function elementoProtegido(elemento) {
    if (!elemento || !estaNoDocumento(elemento)) {
      return true;
    }

    const tag =
      elemento.tagName?.toLowerCase();

    const tagsProtegidas = [
      "html",
      "body",
      "main",
      "article",
      "header",
      "nav",
      "footer",
      "form",
      "input",
      "textarea",
      "select",
      "button",
      "label",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6"
    ];

    if (tagsProtegidas.includes(tag)) {
      return true;
    }

    const texto =
      (elemento.innerText || "").trim();

    if (texto.length > 1200) {
      return true;
    }

    const rect =
      elemento.getBoundingClientRect();

    if (
      rect.width >
        window.innerWidth * 0.92 &&
      rect.height >
        window.innerHeight * 0.75
    ) {
      return true;
    }

    return false;
  }

  function elementoBloqueadoParaSelecaoManual(
    elemento
  ) {
    if (
      !elemento ||
      !estaNoDocumento(elemento)
    ) {
      return true;
    }

    if (
      elemento ===
        document.documentElement ||
      elemento === document.body
    ) {
      return true;
    }

    const rect =
      elemento.getBoundingClientRect();

    if (
      rect.width >
        window.innerWidth * 0.95 &&
      rect.height >
        window.innerHeight * 0.85
    ) {
      return true;
    }

    return false;
  }

  function ehPublicidade(elemento) {
    if (
      !elemento ||
      elemento.nodeType !==
        Node.ELEMENT_NODE
    ) {
      return false;
    }

    const elementosParaVerificar = [
      elemento,
      elemento.parentElement,
      elemento.parentElement?.parentElement
    ].filter(Boolean);

    for (
      const item of elementosParaVerificar
    ) {
      const texto =
        obterTextoSeguro(item);

      if (
        PADROES_PUBLICIDADE.some(
          regex => regex.test(texto)
        )
      ) {
        return true;
      }

      if (
        item.matches &&
        SELETORES_PUBLICIDADE.some(
          seletor => {
            try {
              return item.matches(
                seletor
              );
            } catch {
              return false;
            }
          }
        )
      ) {
        return true;
      }
    }

    if (
      elemento.tagName?.toLowerCase() ===
      "iframe"
    ) {
      const src =
        elemento.getAttribute(
          "src"
        ) || "";

      if (
        hostParecePublicidade(src)
      ) {
        return true;
      }
    }

    return false;
  }

  function alvoParaEsconder(
    elemento
  ) {
    if (
      !elemento ||
      elementoProtegido(elemento)
    ) {
      return null;
    }

    let alvo = elemento;

    const tag =
      alvo.tagName?.toLowerCase();

    if (
      tag === "span" ||
      tag === "label"
    ) {
      alvo =
        alvo.closest(
          "div, section, aside, figure, li"
        ) || alvo;
    }

    if (
      elementoProtegido(alvo)
    ) {
      return null;
    }

    return alvo;
  }

  function selecionarPossiveisAnuncios() {
    const encontrados =
      new Set();

    for (
      const seletor of
        SELETORES_PUBLICIDADE
    ) {
      try {
        document
          .querySelectorAll(seletor)
          .forEach(elemento =>
            encontrados.add(elemento)
          );
      } catch {
        // Ignora seletor incompatível.
      }
    }

    document
      .querySelectorAll(
        "iframe, ins, [id], [class], [aria-label]"
      )
      .forEach(elemento => {
        if (
          ehPublicidade(elemento)
        ) {
          encontrados.add(elemento);
        }
      });

    return [...encontrados];
  }

  function esconderDistracoesAgora() {
    if (
      !preferencias.esconderDistracoes
    ) {
      return;
    }

    const elementos =
      selecionarPossiveisAnuncios();

    for (
      const elemento of elementos
    ) {
      const alvo =
        alvoParaEsconder(elemento);

      if (!alvo) continue;

      const rect =
        alvo.getBoundingClientRect();

      if (
        rect.width >= 40 &&
        rect.height >= 25
      ) {
        alvo.classList.add(
          CLASSES.escondido
        );

        alvo.setAttribute(
          "data-fc-auto",
          "true"
        );
      }
    }
  }

  function restaurarDistracoes() {
    document
      .querySelectorAll(
        '[data-fc-auto="true"]'
      )
      .forEach(elemento => {
        elemento.classList.remove(
          CLASSES.escondido
        );

        elemento.removeAttribute(
          "data-fc-auto"
        );
      });
  }

  // ===================================================
  // GUIA DE LEITURA
  // ===================================================

  function obterElementoGuia(
    elemento
  ) {
    if (
      !elemento ||
      !(elemento instanceof Element)
    ) {
      return null;
    }

    const alvo =
      elemento.closest(
        "p, li, blockquote, figcaption, dd, dt, h1, h2, h3, h4, h5, h6"
      );

    if (!alvo) {
      return null;
    }

    if (
      alvo.closest(
        "header, nav, footer, button, input, textarea, select, option"
      )
    ) {
      return null;
    }

    const texto =
      (alvo.innerText || "").trim();

    if (!texto) {
      return null;
    }

    return alvo;
  }

  function removerDestaqueGuia() {
    if (
      elementoGuiaAtual &&
      estaNoDocumento(
        elementoGuiaAtual
      )
    ) {
      elementoGuiaAtual.classList.remove(
        CLASSES.guiaDestaque
      );
    }

    elementoGuiaAtual = null;
  }

  function atualizarDestaqueGuia(
    evento
  ) {
    if (
      !preferencias.guiaLeitura
    ) {
      removerDestaqueGuia();
      return;
    }

    const alvo =
      evento.target;

    if (
      !(alvo instanceof Element)
    ) {
      return;
    }

    const novoElemento =
      obterElementoGuia(alvo);

    if (
      novoElemento ===
      elementoGuiaAtual
    ) {
      return;
    }

    removerDestaqueGuia();

    if (!novoElemento) {
      return;
    }

    elementoGuiaAtual =
      novoElemento;

    elementoGuiaAtual.classList.add(
      CLASSES.guiaDestaque
    );
  }

  function tratarSaidaGuia(
    evento
  ) {
    if (
      !preferencias.guiaLeitura
    ) {
      return;
    }

    const relacionado =
      evento.relatedTarget;

    if (
      relacionado &&
      elementoGuiaAtual &&
      elementoGuiaAtual.contains(
        relacionado
      )
    ) {
      return;
    }

    if (
      !relacionado ||
      !elementoGuiaAtual?.contains(
        relacionado
      )
    ) {
      removerDestaqueGuia();
    }
  }

  function iniciarGuiaLeitura() {
    document.addEventListener(
      "mouseover",
      atualizarDestaqueGuia,
      true
    );

    document.addEventListener(
      "mouseout",
      tratarSaidaGuia,
      true
    );
  }

  // ===================================================
  // SELEÇÃO MANUAL
  // ===================================================

  function gerarSeletorUnico(
    elemento
  ) {
    if (elemento.id) {
      const porId =
        `#${CSS.escape(elemento.id)}`;

      try {
        if (
          document.querySelectorAll(
            porId
          ).length === 1
        ) {
          return porId;
        }
      } catch {
        // Ignora.
      }
    }

    const partes = [];

    let atual = elemento;
    let profundidade = 0;

    while (
      atual &&
      atual.nodeType ===
        Node.ELEMENT_NODE &&
      profundidade < 6
    ) {
      let parte =
        atual.tagName.toLowerCase();

      const pai =
        atual.parentElement;

      if (pai) {
        const irmaosMesmaTag =
          Array.from(
            pai.children
          ).filter(
            el =>
              el.tagName ===
              atual.tagName
          );

        if (
          irmaosMesmaTag.length > 1
        ) {
          const indice =
            irmaosMesmaTag.indexOf(
              atual
            ) + 1;

          parte +=
            `:nth-of-type(${indice})`;
        }
      }

      partes.unshift(parte);

      const candidato =
        partes.join(" > ");

      try {
        if (
          document.querySelectorAll(
            candidato
          ).length === 1
        ) {
          return candidato;
        }
      } catch {
        break;
      }

      atual = pai;
      profundidade++;
    }

    return partes.join(" > ");
  }

  function chaveSelecaoManual() {
    return `fc-manual:${location.hostname}`;
  }

  function salvarSelecaoManual(
    seletor
  ) {
    const chave =
      chaveSelecaoManual();

    chrome.storage.local.get(
      { [chave]: [] },
      resultado => {
        const lista =
          resultado[chave] || [];

        if (
          !lista.includes(seletor)
        ) {
          lista.push(seletor);

          chrome.storage.local.set({
            [chave]: lista
          });
        }
      }
    );
  }

  function aplicarSelecaoManualSalva() {
    const chave =
      chaveSelecaoManual();

    chrome.storage.local.get(
      { [chave]: [] },
      resultado => {
        const lista =
          resultado[chave] || [];

        lista.forEach(seletor => {
          try {
            document
              .querySelectorAll(
                seletor
              )
              .forEach(elemento => {
                elemento.classList.add(
                  CLASSES.escondido
                );

                elemento.setAttribute(
                  "data-fc-manual",
                  "true"
                );
              });
          } catch {
            // Estrutura da página mudou.
          }
        });
      }
    );
  }

  function limparSelecaoManual() {
    const chave =
      chaveSelecaoManual();

    chrome.storage.local.set({
      [chave]: []
    });

    document
      .querySelectorAll(
        '[data-fc-manual="true"]'
      )
      .forEach(elemento => {
        elemento.classList.remove(
          CLASSES.escondido
        );

        elemento.removeAttribute(
          "data-fc-manual"
        );
      });
  }

  function destacarElemento(
    evento
  ) {
    if (!modoSelecaoAtivo) {
      return;
    }

    const alvo =
      evento.target;

    if (
      !(alvo instanceof Element)
    ) {
      return;
    }

    if (
      alvo === elementoDestacado
    ) {
      return;
    }

    if (elementoDestacado) {
      elementoDestacado.classList.remove(
        CLASSES.destaqueSelecao
      );
    }

    elementoDestacado =
      alvo;

    elementoDestacado.classList.add(
      CLASSES.destaqueSelecao
    );
  }

  function tratarCliqueSelecao(
    evento
  ) {
    if (!modoSelecaoAtivo) {
      return;
    }

    evento.preventDefault();
    evento.stopPropagation();

    const alvo =
      evento.target;

    if (
      !(alvo instanceof Element)
    ) {
      return;
    }

    if (
      elementoBloqueadoParaSelecaoManual(
        alvo
      )
    ) {
      ativarSeletorManual(false);
      return;
    }

    const seletor =
      gerarSeletorUnico(alvo);

    alvo.classList.add(
      CLASSES.escondido
    );

    alvo.setAttribute(
      "data-fc-manual",
      "true"
    );

    salvarSelecaoManual(
      seletor
    );

    ativarSeletorManual(false);
  }

  function tratarEscapeSelecao(
    evento
  ) {
    if (
      evento.key === "Escape"
    ) {
      ativarSeletorManual(false);
    }
  }

  function ativarSeletorManual(
    ativar
  ) {
    modoSelecaoAtivo =
      Boolean(ativar);

    document.documentElement.classList.toggle(
      CLASSES.modoSelecao,
      modoSelecaoAtivo
    );

    if (modoSelecaoAtivo) {
      document.addEventListener(
        "mouseover",
        destacarElemento,
        true
      );

      document.addEventListener(
        "click",
        tratarCliqueSelecao,
        true
      );

      document.addEventListener(
        "keydown",
        tratarEscapeSelecao,
        true
      );
    } else {
      document.removeEventListener(
        "mouseover",
        destacarElemento,
        true
      );

      document.removeEventListener(
        "click",
        tratarCliqueSelecao,
        true
      );

      document.removeEventListener(
        "keydown",
        tratarEscapeSelecao,
        true
      );

      if (elementoDestacado) {
        elementoDestacado.classList.remove(
          CLASSES.destaqueSelecao
        );

        elementoDestacado = null;
      }
    }
  }

  // ===================================================
  // CORES SUAVES
  // ===================================================

  function atualizarCoresDaPagina() {
    if (
      !preferencias.intensidadeCores
    ) {
      document.documentElement.removeAttribute(
        "data-fc-tema"
      );

      return;
    }

    const body =
      document.body;

    if (!body) {
      return;
    }

    const estilo =
      getComputedStyle(body);

    const cor =
      estilo.backgroundColor;

    const rgb =
      cor.match(
        /\d+(?:\.\d+)?/g
      );

    if (
      !rgb ||
      rgb.length < 3
    ) {
      document.documentElement.setAttribute(
        "data-fc-tema",
        "claro"
      );

      return;
    }

    const r =
      Number(rgb[0]);

    const g =
      Number(rgb[1]);

    const b =
      Number(rgb[2]);

    const luminosidade =
      0.299 * r +
      0.587 * g +
      0.114 * b;

    document.documentElement.setAttribute(
      "data-fc-tema",
      luminosidade < 125
        ? "escuro"
        : "claro"
    );
  }

  function aplicarIntensidadeCor() {
    const valor =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            preferencias.intensidadeCores
          ) || 0
        )
      );

    const ativo =
      valor > 0;

    const html =
      document.documentElement;

    html.classList.toggle(
      CLASSES.coresSuaves,
      ativo
    );

    if (ativo) {
      /*
       * A redução foi limitada para evitar que
       * a página fique quase sem cor.
       *
       * 0%  = 100% da saturação
       * 100% = 50% da saturação original
       */
      const satPagina =
        Math.max(
          0.50,
          1 -
            (valor / 100) *
              0.50
        );

      html.style.setProperty(
        "--fc-sat-pagina",
        satPagina.toFixed(3)
      );
    } else {
      html.style.removeProperty(
        "--fc-sat-pagina"
      );
    }

    atualizarCoresDaPagina();
  }

  // ===================================================
  // APLICAÇÃO DAS PREFERÊNCIAS
  // ===================================================

  function aplicarClasses() {
    const html =
      document.documentElement;

    html.classList.toggle(
      CLASSES.modoCalmo,
      Boolean(
        preferencias.modoCalmo
      )
    );

    html.classList.toggle(
      CLASSES.fonteLegivel,
      Boolean(
        preferencias.fonteLegivel
      )
    );

    html.classList.toggle(
      CLASSES.esconderDistracoes,
      Boolean(
        preferencias.esconderDistracoes
      )
    );

    html.classList.toggle(
      CLASSES.guiaLeitura,
      Boolean(
        preferencias.guiaLeitura
      )
    );

    html.classList.toggle(
      CLASSES.modoTexto,
      Boolean(
        preferencias.modoTexto
      )
    );

    aplicarIntensidadeCor();

    if (
      !preferencias.guiaLeitura
    ) {
      removerDestaqueGuia();
    }

    if (
      preferencias.esconderDistracoes
    ) {
      esconderDistracoesAgora();
    } else {
      restaurarDistracoes();
    }

    if (
      preferencias.modoCalmo
    ) {
      pausarMidia();
    }
  }

  // ===================================================
  // MÍDIA
  // ===================================================

  function pausarMidia() {
    if (
      !preferencias.modoCalmo
    ) {
      return;
    }

    document
      .querySelectorAll(
        "video, audio"
      )
      .forEach(midia => {
        try {
          if (!midia.paused) {
            midia.pause();
          }

          midia.autoplay = false;

          midia.removeAttribute(
            "autoplay"
          );
        } catch {
          // Alguns players bloqueiam alterações.
        }
      });
  }

  function iniciarObservadorMidia() {
    if (observadorMidia) {
      return;
    }

    observadorMidia =
      new MutationObserver(
        () => {
          if (
            preferencias.modoCalmo
          ) {
            pausarMidia();
          }
        }
      );

    observadorMidia.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );

    document.addEventListener(
      "play",
      evento => {
        if (
          preferencias.modoCalmo &&
          evento.target instanceof
            HTMLMediaElement
        ) {
          try {
            evento.target.pause();
          } catch {
            // Ignora.
          }
        }
      },
      true
    );
  }

  // ===================================================
  // OBSERVADOR DE DISTRAÇÕES
  // ===================================================

  function iniciarObservadorDistracoes() {
    if (observadorDOM) {
      return;
    }

    observadorDOM =
      new MutationObserver(
        () => {
          if (
            !preferencias.esconderDistracoes
          ) {
            return;
          }

          clearTimeout(
            restauracaoAgendada
          );

          restauracaoAgendada =
            setTimeout(
              () => {
                esconderDistracoesAgora();
              },
              250
            );
        }
      );

    observadorDOM.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );
  }

  // ===================================================
  // LEITURA EM VOZ ALTA
  // ===================================================

  function falarTexto(texto) {
    if (
      !("speechSynthesis" in window)
    ) {
      return;
    }

    const textoLimpo =
      String(texto || "")
        .replace(/\s+/g, " ")
        .trim();

    if (!textoLimpo) {
      return;
    }

    window.speechSynthesis.cancel();

    const tamanho = 3000;

    filaFala = [];

    for (
      let inicio = 0;
      inicio < textoLimpo.length;
      inicio += tamanho
    ) {
      filaFala.push(
        textoLimpo.slice(
          inicio,
          inicio + tamanho
        )
      );
    }

    indiceFala = 0;
    falando = true;

    falarProximoTrecho();
  }

  function falarProximoTrecho() {
    if (
      !falando ||
      indiceFala >=
        filaFala.length
    ) {
      falando = false;
      filaFala = [];
      return;
    }

    const fala =
      new SpeechSynthesisUtterance(
        filaFala[indiceFala]
      );

    fala.lang =
      document.documentElement
        .lang || "pt-BR";

    fala.rate = 0.95;
    fala.pitch = 1;

    fala.onend = () => {
      indiceFala++;
      falarProximoTrecho();
    };

    fala.onerror = () => {
      falando = false;
      filaFala = [];
    };

    window.speechSynthesis.speak(
      fala
    );
  }

  // ===================================================
  // PREFERÊNCIAS
  // ===================================================

  function atualizarPreferencias(
    novas
  ) {
    preferencias = {
      ...preferencias,
      ...novas
    };

    aplicarClasses();
  }

  function carregarPreferencias() {
    chrome.storage.sync.get(
      PREFERENCIAS_PADRAO,
      resultado => {
        preferencias = {
          ...PREFERENCIAS_PADRAO,
          ...resultado
        };

        aplicarClasses();
      }
    );
  }

  function ouvirMudancasDeArmazenamento() {
    chrome.storage.onChanged.addListener(
      (mudancas, area) => {
        if (area !== "sync") {
          return;
        }

        const atualizacoes = {};
        let houveMudanca = false;

        for (
          const chave of Object.keys(
            PREFERENCIAS_PADRAO
          )
        ) {
          if (
            chave in mudancas
          ) {
            const novoValor =
              mudancas[chave]
                .newValue;

            atualizacoes[chave] =
              typeof PREFERENCIAS_PADRAO[
                chave
              ] === "boolean"
                ? Boolean(
                    novoValor
                  )
                : Number(
                    novoValor
                  ) || 0;

            houveMudanca = true;
          }
        }

        if (houveMudanca) {
          atualizarPreferencias(
            atualizacoes
          );
        }
      }
    );
  }

  // ===================================================
  // MENSAGENS
  // ===================================================

  chrome.runtime.onMessage.addListener(
    (
      mensagem,
      remetente,
      responder
    ) => {
      if (
        mensagem?.tipo ===
        "ATUALIZAR_PREFERENCIAS"
      ) {
        atualizarPreferencias(
          mensagem.prefs || {}
        );

        responder?.({
          ok: true
        });

        return true;
      }

      if (
        mensagem?.tipo ===
        "LER_EM_VOZ_ALTA"
      ) {
        falarTexto(
          mensagem.texto || ""
        );

        responder?.({
          ok: true
        });

        return true;
      }

      if (
        mensagem?.tipo ===
        "ATIVAR_SELETOR_MANUAL"
      ) {
        ativarSeletorManual(
          Boolean(
            mensagem.ativar
          )
        );

        responder?.({
          ok: true
        });

        return true;
      }

      if (
        mensagem?.tipo ===
        "LIMPAR_SELECAO_MANUAL"
      ) {
        limparSelecaoManual();

        responder?.({
          ok: true
        });

        return true;
      }

      return false;
    }
  );

  // ===================================================
  // INICIALIZAÇÃO
  // ===================================================

  function corpoPronto() {
    carregarPreferencias();

    aplicarSelecaoManualSalva();

    iniciarObservadorDistracoes();

    iniciarObservadorMidia();

    iniciarGuiaLeitura();

    ouvirMudancasDeArmazenamento();

    setTimeout(
      atualizarCoresDaPagina,
      1000
    );

    setTimeout(
      atualizarCoresDaPagina,
      3000
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      corpoPronto,
      { once: true }
    );
  } else {
    corpoPronto();
  }
})();s