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

  // Tons suaves (pastel): com multiply, cores muito saturadas
  // "gritam" na tela; estes dão um tingimento discreto.
  const CORES_SOBREPOSICAO = {
    azul: "120, 165, 205",
    ambar: "255, 205, 110",
    verde: "130, 190, 140",
    rosa: "240, 130, 165"
  };

  const PREFERENCIAS_PADRAO = {
    modoCalmo: false,
    fonteLegivel: false,
    intensidadeCores: 0,
    esconderDistracoes: false,
    guiaLeitura: false,
    modoTexto: false,
    tomSobreposicao: "nenhum",
    intensidadeSobreposicao: 30
  };

  const HOSTS_PUBLICIDADE = [
    "doubleclick.net", "googlesyndication.com", "googleadservices.com",
    "googletagservices.com", "securepubads.g.doubleclick.net", "adnxs.com",
    "adnxs.net", "criteo.com", "criteo.net", "taboola.com", "outbrain.com",
    "amazon-adsystem.com", "2mdn.net", "adsrvr.org", "rubiconproject.com",
    "pubmatic.com", "openx.net", "sharethrough.com"
  ];

  const SELETORES_PUBLICIDADE = [
    "ins.adsbygoogle", "[data-ad-client]", "[data-ad-slot]", "[data-ad-unit]",
    "[data-ad-format]", "[data-ad-region]", "[data-advertisement]",
    "[data-advertising]", "[data-google-query-id]", "[data-testid*='ad' i]",
    "[aria-label*='advertisement' i]", "[aria-label*='publicidade' i]",
    "[aria-label*='patrocinado' i]", "[aria-label*='sponsored' i]",
    "[class*='adsbygoogle' i]", "[id*='adsbygoogle' i]", "[class*='taboola' i]",
    "[id*='taboola' i]", "[class*='outbrain' i]", "[id*='outbrain' i]",
    "[class*='advertisement' i]", "[id*='advertisement' i]",
    "[class*='ad-container' i]", "[id*='ad-container' i]",
    "[class*='ad-wrapper' i]", "[id*='ad-wrapper' i]", "[class*='sponsor' i]",
    "[id*='sponsor' i]", "iframe[src*='doubleclick.net' i]",
    "iframe[src*='googlesyndication.com' i]",
    "iframe[src*='googleadservices.com' i]", "iframe[src*='taboola.com' i]",
    "iframe[src*='outbrain.com' i]"
  ];

  const PADROES_PUBLICIDADE = [
    /\badvertisement\b/i, /\badvertising\b/i, /\bpublicidade\b/i,
    /\bpatrocinado\b/i, /\bsponsored\b/i, /\bad[-_]?container\b/i,
    /\bad[-_]?wrapper\b/i, /\bad[-_]?slot\b/i, /\bad[-_]?banner\b/i,
    /\bgoogle[-_]?ads\b/i, /\badsbygoogle\b/i, /\btaboola\b/i,
    /\boutbrain\b/i, /\bdoubleclick\b/i, /\bdfp[-_]?ad\b/i, /\bdart[-_]?ad\b/i
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
  let guiaListenersAtivos = false;

  function estaNoDocumento(elemento) {
    return elemento &&
      elemento.nodeType === Node.ELEMENT_NODE &&
      document.documentElement.contains(elemento);
  }

  function obterTextoSeguro(elemento) {
    if (!elemento) return "";
    return [
      elemento.id || "",
      typeof elemento.className === "string" ? elemento.className : "",
      elemento.getAttribute?.("aria-label") || "",
      elemento.getAttribute?.("data-testid") || ""
    ].join(" ");
  }

  function hostParecePublicidade(url) {
    if (!url) return false;
    try {
      const host = new URL(url, location.href).hostname.toLowerCase();
      return HOSTS_PUBLICIDADE.some(
        dominio => host === dominio || host.endsWith("." + dominio)
      );
    } catch {
      return false;
    }
  }

  function elementoProtegido(elemento) {
    if (!elemento || !estaNoDocumento(elemento)) {
      return true;
    }

    const tag = elemento.tagName?.toLowerCase();

    const tagsProtegidas = [
      "html", "body", "main", "article", "header", "nav", "footer", "form",
      "input", "textarea", "select", "button", "label", "table", "thead",
      "tbody", "tr", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6"
    ];

    if (tagsProtegidas.includes(tag)) {
      return true;
    }

    const texto = (elemento.innerText || "").trim();

    if (texto.length > 1200) {
      return true;
    }

    const rect = elemento.getBoundingClientRect();

    if (
      rect.width > window.innerWidth * 0.92 &&
      rect.height > window.innerHeight * 0.75
    ) {
      return true;
    }

    return false;
  }

  function elementoBloqueadoParaSelecaoManual(elemento) {
    if (!elemento || !estaNoDocumento(elemento)) {
      return true;
    }

    if (elemento === document.documentElement || elemento === document.body) {
      return true;
    }

    const rect = elemento.getBoundingClientRect();

    if (
      rect.width > window.innerWidth * 0.95 &&
      rect.height > window.innerHeight * 0.85
    ) {
      return true;
    }

    return false;
  }

  function ehPublicidade(elemento) {
    if (!elemento || elemento.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const elementosParaVerificar = [
      elemento,
      elemento.parentElement,
      elemento.parentElement?.parentElement
    ].filter(Boolean);

    for (const item of elementosParaVerificar) {
      const texto = obterTextoSeguro(item);

      if (PADROES_PUBLICIDADE.some(regex => regex.test(texto))) {
        return true;
      }

      if (
        item.matches &&
        SELETORES_PUBLICIDADE.some(seletor => {
          try {
            return item.matches(seletor);
          } catch {
            return false;
          }
        })
      ) {
        return true;
      }
    }

    if (elemento.tagName?.toLowerCase() === "iframe") {
      const src = elemento.getAttribute("src") || "";
      if (hostParecePublicidade(src)) {
        return true;
      }
    }

    return false;
  }

  function alvoParaEsconder(elemento) {
    if (!elemento || elementoProtegido(elemento)) {
      return null;
    }

    let alvo = elemento;
    const tag = alvo.tagName?.toLowerCase();

    if (tag === "span" || tag === "label") {
      alvo = alvo.closest("div, section, aside, figure, li") || alvo;
    }

    if (elementoProtegido(alvo)) {
      return null;
    }

    return alvo;
  }

  function selecionarPossiveisAnuncios() {
    const encontrados = new Set();

    for (const seletor of SELETORES_PUBLICIDADE) {
      try {
        document.querySelectorAll(seletor).forEach(elemento => encontrados.add(elemento));
      } catch {
        // Ignora seletor incompatível.
      }
    }

    document
      .querySelectorAll("iframe, ins, [id], [class], [aria-label]")
      .forEach(elemento => {
        if (ehPublicidade(elemento)) {
          encontrados.add(elemento);
        }
      });

    return [...encontrados];
  }

  function esconderDistracoesAgora() {
    if (!preferencias.esconderDistracoes) {
      return;
    }

    const elementos = selecionarPossiveisAnuncios();

    for (const elemento of elementos) {
      const alvo = alvoParaEsconder(elemento);
      if (!alvo) continue;

      const rect = alvo.getBoundingClientRect();

      if (rect.width >= 40 && rect.height >= 25) {
        alvo.classList.add(CLASSES.escondido);
        alvo.setAttribute("data-fc-auto", "true");
      }
    }
  }

  function restaurarDistracoes() {
    document.querySelectorAll('[data-fc-auto="true"]').forEach(elemento => {
      elemento.classList.remove(CLASSES.escondido);
      elemento.removeAttribute("data-fc-auto");
    });
  }

  // ===================================================
  // Guia de Leitura — destaca o parágrafo/bloco sob o
  // mouse (leve: não mexe no texto da página).
  // ===================================================

  function obterElementoGuia(elemento) {
    if (!elemento || !(elemento instanceof Element)) {
      return null;
    }

    const alvo = elemento.closest(
      "p, li, blockquote, figcaption, dd, dt, h1, h2, h3, h4, h5, h6"
    );

    if (!alvo) return null;

    if (
      alvo.closest("header, nav, footer, button, input, textarea, select, option")
    ) {
      return null;
    }

    const texto = (alvo.innerText || "").trim();
    if (!texto) return null;

    return alvo;
  }

  function removerDestaqueGuia() {
    if (elementoGuiaAtual && estaNoDocumento(elementoGuiaAtual)) {
      elementoGuiaAtual.classList.remove(CLASSES.guiaDestaque);
    }
    elementoGuiaAtual = null;
  }

  function atualizarDestaqueGuia(evento) {
    const alvo = evento.target;
    if (!(alvo instanceof Element)) return;

    const novoElemento = obterElementoGuia(alvo);
    if (novoElemento === elementoGuiaAtual) return;

    removerDestaqueGuia();
    if (!novoElemento) return;

    elementoGuiaAtual = novoElemento;
    elementoGuiaAtual.classList.add(CLASSES.guiaDestaque);
  }

  function tratarSaidaGuia(evento) {
    const relacionado = evento.relatedTarget;

    if (relacionado && elementoGuiaAtual && elementoGuiaAtual.contains(relacionado)) {
      return;
    }

    removerDestaqueGuia();
  }

  function sincronizarGuiaLeitura() {
    const deveEstarAtivo = Boolean(preferencias.guiaLeitura);
    if (deveEstarAtivo === guiaListenersAtivos) return;

    guiaListenersAtivos = deveEstarAtivo;

    if (guiaListenersAtivos) {
      document.addEventListener("mouseover", atualizarDestaqueGuia, true);
      document.addEventListener("mouseout", tratarSaidaGuia, true);
    } else {
      document.removeEventListener("mouseover", atualizarDestaqueGuia, true);
      document.removeEventListener("mouseout", tratarSaidaGuia, true);
      removerDestaqueGuia();
    }
  }

  // ===================================================
  // Sobreposição de cor (estilo lentes coloridas) — camada
  // fixa sobre a página inteira, independente do CSS do
  // site (não depende de especificidade nem de markup).
  // ===================================================

  function aplicarSobreposicaoDeCor() {
    const tom = preferencias.tomSobreposicao || "nenhum";
    const intensidade = Number(preferencias.intensidadeSobreposicao) || 0;

    let overlay = document.getElementById("fc-sobreposicao");

    if (tom === "nenhum" || intensidade <= 0 || !CORES_SOBREPOSICAO[tom]) {
      if (overlay) overlay.remove();
      return;
    }

    const alfa = Math.min(0.3, (intensidade / 100) * 0.3);

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "fc-sobreposicao";
      (document.body || document.documentElement).appendChild(overlay);
    }

    overlay.style.cssText =
      "position: fixed !important;" +
      "inset: 0 !important;" +
      "pointer-events: none !important;" +
      "z-index: 2147483647 !important;" +
      "mix-blend-mode: multiply !important;" +
      `background-color: rgba(${CORES_SOBREPOSICAO[tom]}, ${alfa}) !important;`;
  }

  // ===================================================
  // Seleção manual: usuário aponta e esconde qualquer
  // elemento, ficando salvo por domínio.
  // ===================================================

  function gerarSeletorUnico(elemento) {
    if (elemento.id) {
      const porId = `#${CSS.escape(elemento.id)}`;
      try {
        if (document.querySelectorAll(porId).length === 1) {
          return porId;
        }
      } catch {
        // ID com caracteres inválidos para seletor, ignora.
      }
    }

    const partes = [];
    let atual = elemento;
    let profundidade = 0;

    while (atual && atual.nodeType === Node.ELEMENT_NODE && profundidade < 6) {
      let parte = atual.tagName.toLowerCase();
      const pai = atual.parentElement;

      if (pai) {
        const irmaosMesmaTag = Array.from(pai.children).filter(
          el => el.tagName === atual.tagName
        );

        if (irmaosMesmaTag.length > 1) {
          const indice = irmaosMesmaTag.indexOf(atual) + 1;
          parte += `:nth-of-type(${indice})`;
        }
      }

      partes.unshift(parte);

      const candidato = partes.join(" > ");

      try {
        if (document.querySelectorAll(candidato).length === 1) {
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

  function salvarSelecaoManual(seletor) {
    const chave = chaveSelecaoManual();

    chrome.storage.local.get({ [chave]: [] }, resultado => {
      const lista = resultado[chave] || [];

      if (!lista.includes(seletor)) {
        lista.push(seletor);
        chrome.storage.local.set({ [chave]: lista });
      }
    });
  }

  function aplicarSelecaoManualSalva() {
    const chave = chaveSelecaoManual();

    chrome.storage.local.get({ [chave]: [] }, resultado => {
      const lista = resultado[chave] || [];

      lista.forEach(seletor => {
        try {
          document.querySelectorAll(seletor).forEach(elemento => {
            elemento.classList.add(CLASSES.escondido);
            elemento.setAttribute("data-fc-manual", "true");
          });
        } catch {
          // Seletor salvo ficou inválido (página mudou de estrutura).
        }
      });
    });
  }

  function limparSelecaoManual() {
    const chave = chaveSelecaoManual();

    chrome.storage.local.set({ [chave]: [] });

    document.querySelectorAll('[data-fc-manual="true"]').forEach(elemento => {
      elemento.classList.remove(CLASSES.escondido);
      elemento.removeAttribute("data-fc-manual");
    });
  }

  function destacarElemento(evento) {
    if (!modoSelecaoAtivo) return;

    const alvo = evento.target;
    if (!(alvo instanceof Element) || alvo === elementoDestacado) return;

    if (elementoDestacado) {
      elementoDestacado.classList.remove(CLASSES.destaqueSelecao);
    }

    elementoDestacado = alvo;
    elementoDestacado.classList.add(CLASSES.destaqueSelecao);
  }

  function tratarCliqueSelecao(evento) {
    if (!modoSelecaoAtivo) return;

    evento.preventDefault();
    evento.stopPropagation();

    const alvo = evento.target;
    if (!(alvo instanceof Element)) return;

    if (elementoBloqueadoParaSelecaoManual(alvo)) {
      // Ignora o clique (elemento bloqueado), mas mantém o modo
      // ativo pra o usuário tentar de novo num alvo menor.
      return;
    }

    const seletor = gerarSeletorUnico(alvo);

    alvo.classList.add(CLASSES.escondido);
    alvo.setAttribute("data-fc-manual", "true");

    salvarSelecaoManual(seletor);

    ativarSeletorManual(false);
  }

  function tratarEscapeSelecao(evento) {
    if (evento.key === "Escape") {
      ativarSeletorManual(false);
    }
  }

  function ativarSeletorManual(ativar) {
    modoSelecaoAtivo = Boolean(ativar);

    document.documentElement.classList.toggle(
      CLASSES.modoSelecao,
      modoSelecaoAtivo
    );

    if (modoSelecaoAtivo) {
      document.addEventListener("mouseover", destacarElemento, true);
      document.addEventListener("click", tratarCliqueSelecao, true);
      document.addEventListener("keydown", tratarEscapeSelecao, true);
    } else {
      document.removeEventListener("mouseover", destacarElemento, true);
      document.removeEventListener("click", tratarCliqueSelecao, true);
      document.removeEventListener("keydown", tratarEscapeSelecao, true);

      if (elementoDestacado) {
        elementoDestacado.classList.remove(CLASSES.destaqueSelecao);
        elementoDestacado = null;
      }
    }
  }

  // ===================================================

  function aplicarIntensidadeCor() {
    const valor = Math.max(0, Math.min(100, Number(preferencias.intensidadeCores) || 0));
    const ativo = valor > 0;
    const html = document.documentElement;

    html.classList.toggle(CLASSES.coresSuaves, ativo);

    let camada = document.getElementById("fc-suavizar");

    if (!ativo) {
      html.style.removeProperty("--fc-sat-pagina");
      html.style.removeProperty("--fc-sat-midia");
      html.style.removeProperty("--fc-brilho");
      html.style.removeProperty("--fc-contraste");
      if (camada) camada.remove();
      return;
    }

    // t vai de 0 a 1 conforme o slider. No máximo: saturação a 25%,
    // brilho -7%, contraste -10% e uma camada creme sobre o fundo.
    // Nada disso troca a cor do texto nem do fundo do site à força:
    // o contraste relativo é mantido, então continua legível.
    const t = valor / 100;
    const satPagina = 1 - 0.75 * t;

    // Mídia é compensada só pela raiz quadrada: fotos ficam mais vivas
    // que o resto da página, mas também suavizadas (e sem estourar
    // cores por excesso de compensação).
    const satMidia = 1 / Math.sqrt(satPagina);

    html.style.setProperty("--fc-sat-pagina", satPagina.toFixed(3));
    html.style.setProperty("--fc-sat-midia", satMidia.toFixed(3));
    html.style.setProperty("--fc-brilho", (1 - 0.07 * t).toFixed(3));
    html.style.setProperty("--fc-contraste", (1 - 0.10 * t).toFixed(3));

    if (!camada) {
      camada = document.createElement("div");
      camada.id = "fc-suavizar";
      (document.body || document.documentElement).appendChild(camada);
    }

    // Camada creme com multiply: clareia o branco puro para um tom
    // quente (o "fundo" muda de verdade) sem alterar o texto escuro.
    camada.style.cssText =
      "position: fixed !important;" +
      "inset: 0 !important;" +
      "pointer-events: none !important;" +
      "z-index: 2147483646 !important;" +
      "mix-blend-mode: multiply !important;" +
      `background-color: rgba(255, 232, 196, ${(0.5 * t).toFixed(3)}) !important;`;
  }

  function aplicarClasses() {
    const html = document.documentElement;

    html.classList.toggle(CLASSES.modoCalmo, Boolean(preferencias.modoCalmo));
    html.classList.toggle(CLASSES.fonteLegivel, Boolean(preferencias.fonteLegivel));
    html.classList.toggle(CLASSES.esconderDistracoes, Boolean(preferencias.esconderDistracoes));
    html.classList.toggle(CLASSES.guiaLeitura, Boolean(preferencias.guiaLeitura));
    html.classList.toggle(CLASSES.modoTexto, Boolean(preferencias.modoTexto));

    aplicarIntensidadeCor();
    aplicarSobreposicaoDeCor();
    sincronizarGuiaLeitura();

    if (preferencias.esconderDistracoes) {
      esconderDistracoesAgora();
    } else {
      restaurarDistracoes();
    }

    if (preferencias.modoCalmo) {
      pausarMidia();
    }
  }

  function pausarMidia() {
    if (!preferencias.modoCalmo) {
      return;
    }

    document.querySelectorAll("video, audio").forEach(midia => {
      try {
        if (!midia.paused) {
          midia.pause();
        }
        midia.autoplay = false;
        midia.removeAttribute("autoplay");
      } catch {
        // Alguns players bloqueiam alterações.
      }
    });
  }

  function iniciarObservadorMidia() {
    if (observadorMidia) return;

    observadorMidia = new MutationObserver(() => {
      if (preferencias.modoCalmo) {
        pausarMidia();
      }
    });

    observadorMidia.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    document.addEventListener(
      "play",
      evento => {
        if (preferencias.modoCalmo && evento.target instanceof HTMLMediaElement) {
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

  function iniciarObservadorDistracoes() {
    if (observadorDOM) return;

    observadorDOM = new MutationObserver(() => {
      if (!preferencias.esconderDistracoes) return;

      clearTimeout(restauracaoAgendada);
      restauracaoAgendada = setTimeout(() => {
        esconderDistracoesAgora();
      }, 250);
    });

    observadorDOM.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function falarTexto(texto) {
    if (!("speechSynthesis" in window)) return;

    const textoLimpo = String(texto || "").replace(/\s+/g, " ").trim();
    if (!textoLimpo) return;

    window.speechSynthesis.cancel();

    const tamanho = 3000;
    filaFala = [];

    for (let inicio = 0; inicio < textoLimpo.length; inicio += tamanho) {
      filaFala.push(textoLimpo.slice(inicio, inicio + tamanho));
    }

    indiceFala = 0;
    falando = true;

    falarProximoTrecho();
  }

  function falarProximoTrecho() {
    if (!falando || indiceFala >= filaFala.length) {
      falando = false;
      filaFala = [];
      return;
    }

    const fala = new SpeechSynthesisUtterance(filaFala[indiceFala]);

    fala.lang = document.documentElement.lang || "pt-BR";
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

    window.speechSynthesis.speak(fala);
  }

  function atualizarPreferencias(novas) {
    preferencias = { ...preferencias, ...novas };
    aplicarClasses();
  }

  function carregarPreferencias() {
    chrome.storage.sync.get(PREFERENCIAS_PADRAO, resultado => {
      preferencias = { ...PREFERENCIAS_PADRAO, ...resultado };
      aplicarClasses();
    });
  }

  function ouvirMudancasDeArmazenamento() {
    chrome.storage.onChanged.addListener((mudancas, area) => {
      if (area !== "sync") return;

      const atualizacoes = {};
      let houveMudanca = false;

      for (const chave of Object.keys(PREFERENCIAS_PADRAO)) {
        if (chave in mudancas) {
          const novoValor = mudancas[chave].newValue;
          const tipoPadrao = typeof PREFERENCIAS_PADRAO[chave];

          if (tipoPadrao === "boolean") {
            atualizacoes[chave] = Boolean(novoValor);
          } else if (tipoPadrao === "number") {
            atualizacoes[chave] = Number(novoValor) || 0;
          } else {
            atualizacoes[chave] = String(novoValor || "");
          }

          houveMudanca = true;
        }
      }

      if (houveMudanca) {
        atualizarPreferencias(atualizacoes);
      }
    });
  }

  chrome.runtime.onMessage.addListener((mensagem, remetente, responder) => {
    if (mensagem?.tipo === "ATUALIZAR_PREFERENCIAS") {
      atualizarPreferencias(mensagem.prefs || {});
      responder?.({ ok: true });
      return true;
    }

    if (mensagem?.tipo === "LER_EM_VOZ_ALTA") {
      falarTexto(mensagem.texto || "");
      responder?.({ ok: true });
      return true;
    }

    if (mensagem?.tipo === "ATIVAR_SELETOR_MANUAL") {
      ativarSeletorManual(Boolean(mensagem.ativar));
      responder?.({ ok: true });
      return true;
    }

    if (mensagem?.tipo === "LIMPAR_SELECAO_MANUAL") {
      limparSelecaoManual();
      responder?.({ ok: true });
      return true;
    }

    return false;
  });

  function corpoPronto() {
    carregarPreferencias();
    aplicarSelecaoManualSalva();
    iniciarObservadorDistracoes();
    iniciarObservadorMidia();
    ouvirMudancasDeArmazenamento();

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", corpoPronto, { once: true });
  } else {
    corpoPronto();
  }
})();