(() => {
  if (window.__FOCO_CALMO_INICIADO__) {
    return;
  }

  window.__FOCO_CALMO_INICIADO__ = true;

  const CLASSES = {
    modoCalmo: "fc-modo-calmo",
    fonteLegivel: "fc-fonte-legivel",
    coresSuaves: "fc-cores-suaves",
    escondido: "fc-escondido"
  };

  const PREFERENCIAS_PADRAO = {
    modoCalmo: false,
    fonteLegivel: false,
    coresSuaves: false,
    esconderDistracoes: false
  };

  /*
   * Domínios normalmente usados para publicidade.
   */
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

  /*
   * Palavras que aparecem com frequência em elementos
   * de publicidade.
   */
  const REGEX_PUBLICIDADE =
    /(^|[-_\s])(?:ad|ads|advert|advertisement|advertising|adserver|adslot|adunit|adwrapper|adcontainer|adbanner|adsbygoogle|sponsored|sponsor|patrocinado|publicidade|anuncio|anúncio|interstitial|sticky-ad|overlay-ad|dfp|dart|taboola|outbrain|doubleclick|googlesyndication|googleadservices|adnxs|criteo|amazon-adsystem)(?=$|[-_\s])/i;

  /*
   * Elementos que são fortes candidatos a publicidade.
   */
  const SELETORES_PUBLICIDADE = [
    "ins.adsbygoogle",

    "[data-ad]",
    "[data-ad-slot]",
    "[data-ad-client]",
    "[data-ad-format]",
    "[data-advertisement]",
    "[data-google-query-id]",

    "[aria-label*='advertisement' i]",
    "[aria-label*='sponsored' i]",
    "[aria-label*='publicidade' i]",
    "[aria-label*='patrocinado' i]",

    "[id*='taboola' i]",
    "[class*='taboola' i]",

    "[id*='outbrain' i]",
    "[class*='outbrain' i]",

    "[id*='adsbygoogle' i]",
    "[class*='adsbygoogle' i]",

    "[id*='dfp' i]",
    "[class*='dfp' i]",

    "iframe[src*='doubleclick' i]",
    "iframe[src*='googlesyndication' i]",
    "iframe[src*='googleadservices' i]",
    "iframe[src*='adnxs' i]",
    "iframe[src*='criteo' i]",
    "iframe[src*='taboola' i]",
    "iframe[src*='outbrain' i]",
    "iframe[src*='amazon-adsystem' i]"
  ];

  const TEXTO_PUBLICIDADE =
    /^(advertisement|advertising|sponsored|sponsored content|publicidade|publicidade e anúncios|patrocinado|conteúdo patrocinado|anúncio|anuncios)$/i;

  let preferencias = {
    ...PREFERENCIAS_PADRAO
  };

  let observadorDistracoes = null;
  let observadorMidia = null;
  let timerVarredura = null;
  let timerLeitura = null;
  let filaLeitura = [];

  function corpoPronto(callback) {
    if (document.body) {
      callback();
      return;
    }

    document.addEventListener(
      "DOMContentLoaded",
      callback,
      {
        once: true
      }
    );
  }

  function normalizarTexto(valor) {
    return String(valor || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function elementoVisivel(elemento) {
    if (!(elemento instanceof Element)) {
      return false;
    }

    const estilo = getComputedStyle(elemento);

    if (
      estilo.display === "none" ||
      estilo.visibility === "hidden"
    ) {
      return false;
    }

    const rect =
      elemento.getBoundingClientRect();

    return (
      rect.width > 0 &&
      rect.height > 0
    );
  }

  /*
   * Evita esconder elementos gigantes que provavelmente
   * representam a página inteira.
   */
  function tamanhoSeguro(elemento) {
    const rect =
      elemento.getBoundingClientRect();

    const viewport =
      Math.max(window.innerHeight, 1);

    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return false;
    }

    if (
      rect.width >= window.innerWidth * 0.98 &&
      rect.height >= viewport * 0.75
    ) {
      return false;
    }

    return true;
  }

  /*
   * PROTEÇÃO IMPORTANTE
   *
   * Impede que o bloqueador esconda:
   * - body
   * - html
   * - main
   * - article
   * - nav
   * - formulários
   * - grandes blocos de texto
   * - grandes blocos que possuem títulos
   */
  function elementoProtegido(elemento) {
    if (!(elemento instanceof Element)) {
      return true;
    }

    if (
      elemento === document.documentElement ||
      elemento === document.body
    ) {
      return true;
    }

    const tag =
      elemento.tagName.toLowerCase();

    if (
      [
        "html",
        "body",
        "main",
        "article",
        "nav",
        "form"
      ].includes(tag)
    ) {
      return true;
    }

    /*
     * Elementos de texto individuais nunca são
     * escondidos apenas por causa da proteção.
     */
    if (
      elemento.matches(
        "h1, h2, h3, h4, h5, h6, p, ul, ol, li, table, input, textarea, select, button"
      )
    ) {
      return false;
    }

    /*
     * Se for um bloco enorme dentro de uma notícia
     * e tiver bastante texto, protege.
     */
    if (
      elemento.closest("main, article") &&
      !pareceContainerDeAnuncio(elemento)
    ) {
      const texto =
        normalizarTexto(
          elemento.textContent
        );

      if (texto.length > 500) {
        return true;
      }
    }

    /*
     * Se possui títulos importantes, não esconde.
     */
    if (
      elemento.querySelector(
        "h1, h2, h3"
      ) &&
      !pareceContainerDeAnuncio(elemento)
    ) {
      return true;
    }

    const rect =
      elemento.getBoundingClientRect();

    const viewport =
      Math.max(window.innerHeight, 1);

    if (
      rect.height > viewport * 0.85 &&
      normalizarTexto(
        elemento.textContent
      ).length > 700
    ) {
      return true;
    }

    return false;
  }

  function atributosDoElemento(elemento) {
    if (!(elemento instanceof Element)) {
      return "";
    }

    return [
      elemento.id,
      elemento.className,
      elemento.getAttribute("aria-label"),
      elemento.getAttribute("title"),
      elemento.getAttribute("role"),
      elemento.getAttribute("data-testid"),
      elemento.getAttribute("data-ad"),
      elemento.getAttribute("data-ad-slot"),
      elemento.getAttribute("data-ad-client"),
      elemento.getAttribute("data-ad-format")
    ]
      .filter(Boolean)
      .join(" ");
  }

  function pareceContainerDeAnuncio(elemento) {
    const atributos =
      atributosDoElemento(elemento);

    return REGEX_PUBLICIDADE.test(
      atributos
    );
  }

  function hostPublicitario(url) {
    try {
      const host =
        new URL(
          url,
          location.href
        ).hostname.toLowerCase();

      return HOSTS_PUBLICIDADE.some(
        (dominio) =>
          host === dominio ||
          host.endsWith(`.${dominio}`)
      );
    } catch {
      return false;
    }
  }

  function temOrigemPublicitaria(elemento) {
    if (!(elemento instanceof Element)) {
      return false;
    }

    for (
      const atributo of [
        "src",
        "href",
        "data-src",
        "data-url"
      ]
    ) {
      const valor =
        elemento.getAttribute(
          atributo
        );

      if (
        valor &&
        hostPublicitario(valor)
      ) {
        return true;
      }
    }

    return false;
  }

  function temDescendentePublicitario(elemento) {
    if (!(elemento instanceof Element)) {
      return false;
    }

    try {
      return Boolean(
        elemento.querySelector(
          SELETORES_PUBLICIDADE.join(",")
        )
      );
    } catch {
      return false;
    }
  }

  /*
   * Detecta publicidade olhando:
   * - elemento
   * - pais
   * - origem do iframe
   * - atributos
   * - rótulos
   */
  function ehPublicidade(elemento) {
    if (!(elemento instanceof Element)) {
      return false;
    }

    let atual = elemento;
    let nivel = 0;

    while (
      atual &&
      atual !== document.body &&
      nivel <= 6
    ) {
      if (
        pareceContainerDeAnuncio(atual)
      ) {
        return true;
      }

      if (
        temOrigemPublicitaria(atual)
      ) {
        return true;
      }

      const texto =
        normalizarTexto(
          atual.getAttribute(
            "aria-label"
          )
        );

      if (
        TEXTO_PUBLICIDADE.test(
          texto
        )
      ) {
        return true;
      }

      atual =
        atual.parentElement;

      nivel += 1;
    }

    if (
      elemento.matches(
        "iframe, script, ins"
      ) &&
      temOrigemPublicitaria(
        elemento
      )
    ) {
      return true;
    }

    return false;
  }

  /*
   * Escolhe o elemento certo para esconder.
   *
   * Se for um iframe de anúncio dentro de um
   * pequeno container de anúncio, esconde o container.
   *
   * Nunca sobe até body/main/article.
   */
  function alvoParaEsconder(elemento) {
    if (!(elemento instanceof Element)) {
      return null;
    }

    let alvo = elemento;
    let atual = elemento;

    for (
      let i = 0;
      i < 3 &&
      atual &&
      atual !== document.body;
      i += 1
    ) {
      if (
        pareceContainerDeAnuncio(
          atual
        ) &&
        !elementoProtegido(
          atual
        ) &&
        tamanhoSeguro(atual)
      ) {
        alvo = atual;
      }

      const pai =
        atual.parentElement;

      if (
        !pai ||
        pai === document.body
      ) {
        break;
      }

      const filhosVisiveis =
        Array.from(
          pai.children
        ).filter(
          elementoVisivel
        );

      /*
       * Se o pai contém praticamente
       * apenas o anúncio, podemos
       * esconder o pai.
       */
      if (
        filhosVisiveis.length <= 2 &&
        filhosVisiveis.includes(atual) &&
        pareceContainerDeAnuncio(pai) &&
        !elementoProtegido(pai) &&
        tamanhoSeguro(pai)
      ) {
        alvo = pai;
      }

      atual = pai;
    }

    if (
      elementoProtegido(alvo)
    ) {
      return null;
    }

    if (
      !tamanhoSeguro(alvo)
    ) {
      return null;
    }

    return alvo;
  }

  function esconderElemento(elemento) {
    const alvo =
      alvoParaEsconder(elemento);

    if (!alvo) {
      return;
    }

    alvo.classList.add(
      CLASSES.escondido
    );
  }

  /*
   * Procura publicidade de várias maneiras.
   */
  function selecionarPossiveisAnuncios() {
    const encontrados =
      new Set();

    try {
      document
        .querySelectorAll(
          SELETORES_PUBLICIDADE.join(",")
        )
        .forEach(
          (elemento) =>
            encontrados.add(elemento)
        );
    } catch {
      // Continua com as outras formas de detecção.
    }

    /*
     * Procura elementos que possuam
     * ID ou classe relacionados a publicidade.
     */
    document
      .querySelectorAll(
        "iframe, ins, [id], [class]"
      )
      .forEach(
        (elemento) => {
          if (
            pareceContainerDeAnuncio(
              elemento
            ) ||
            temOrigemPublicitaria(
              elemento
            )
          ) {
            encontrados.add(
              elemento
            );
          }
        }
      );

    /*
     * Procura rótulos como
     * "Advertisement" e "Sponsored".
     */
    document
      .querySelectorAll(
        "[aria-label]"
      )
      .forEach(
        (elemento) => {
          const label =
            normalizarTexto(
              elemento.getAttribute(
                "aria-label"
              )
            );

          if (
            TEXTO_PUBLICIDADE.test(
              label
            )
          ) {
            encontrados.add(
              elemento
            );
          }
        }
      );

    return encontrados;
  }

  function esconderDistracoesAgora() {
    if (
      !preferencias.esconderDistracoes ||
      !document.body
    ) {
      return;
    }

    selecionarPossiveisAnuncios()
      .forEach(
        esconderElemento
      );
  }

  function restaurarDistracoes() {
    document
      .querySelectorAll(
        `.${CLASSES.escondido}`
      )
      .forEach(
        (elemento) => {
          elemento.classList.remove(
            CLASSES.escondido
          );
        }
      );
  }

  /*
   * Evita executar centenas de varreduras
   * seguidas quando um site atualiza o DOM.
   */
  function programarVarredura() {
    clearTimeout(
      timerVarredura
    );

    timerVarredura =
      setTimeout(() => {
        esconderDistracoesAgora();

        if (
          preferencias.modoCalmo
        ) {
          pausarMidiasNormais();
        }
      }, 120);
  }

  function iniciarObservadorDistracoes() {
    if (
      observadorDistracoes ||
      !document.body
    ) {
      return;
    }

    observadorDistracoes =
      new MutationObserver(
        (mutacoes) => {
          if (
            !preferencias.esconderDistracoes &&
            !preferencias.modoCalmo
          ) {
            return;
          }

          const houveMudanca =
            mutacoes.some(
              (mutacao) =>
                Array.from(
                  mutacao.addedNodes
                ).some(
                  (node) =>
                    node.nodeType ===
                    Node.ELEMENT_NODE
                )
            );

          if (houveMudanca) {
            programarVarredura();
          }
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

  function pararObservadorDistracoes() {
    if (
      !observadorDistracoes
    ) {
      return;
    }

    observadorDistracoes.disconnect();
    observadorDistracoes = null;
  }

  /*
   * Pausa vídeos e áudios.
   *
   * Isso também pega publicidade em vídeo
   * quando o elemento está acessível ao content script.
   */
  function pausarMidia(midia) {
    if (
      !(midia instanceof HTMLMediaElement)
    ) {
      return;
    }

    try {
      midia.autoplay = false;
      midia.pause();
    } catch {
      // Alguns players controlados pelo site
      // podem rejeitar alterações.
    }
  }

  function pausarMidiasNormais() {
    if (
      !preferencias.modoCalmo
    ) {
      return;
    }

    document
      .querySelectorAll(
        "video, audio"
      )
      .forEach(
        pausarMidia
      );
  }

  function iniciarObservadorMidia() {
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
            !preferencias.modoCalmo
          ) {
            return;
          }

          mutacoes.forEach(
            (mutacao) => {
              mutacao.addedNodes.forEach(
                (node) => {
                  if (
                    !(node instanceof Element)
                  ) {
                    return;
                  }

                  if (
                    node.matches(
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
              );
            }
          );
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

  function aplicarClasses() {
    const html =
      document.documentElement;

    if (!html) {
      return;
    }

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
      CLASSES.coresSuaves,
      Boolean(
        preferencias.coresSuaves
      )
    );
  }

  function aplicarPreferencias(
    novasPreferencias
  ) {
    preferencias = {
      ...preferencias,
      ...novasPreferencias
    };

    aplicarClasses();

    if (
      preferencias.esconderDistracoes
    ) {
      iniciarObservadorDistracoes();
      programarVarredura();
    } else {
      restaurarDistracoes();
      pararObservadorDistracoes();
    }

    if (
      preferencias.modoCalmo
    ) {
      iniciarObservadorDistracoes();
      iniciarObservadorMidia();

      pausarMidiasNormais();
      programarVarredura();
    }
  }

  /*
   * Leitura em voz alta.
   */
  function falarTexto(texto) {
    const limpo =
      normalizarTexto(texto);

    if (
      !limpo ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    filaLeitura = [];

    const limite = 3500;

    for (
      let inicio = 0;
      inicio < limpo.length;
      inicio += limite
    ) {
      filaLeitura.push(
        limpo.slice(
          inicio,
          inicio + limite
        )
      );
    }

    filaLeitura.forEach(
      (parte) => {
        const fala =
          new SpeechSynthesisUtterance(
            parte
          );

        fala.lang =
          document.documentElement
            .lang ||
          "pt-BR";

        fala.rate = 0.95;
        fala.pitch = 1;

        window.speechSynthesis.speak(
          fala
        );
      }
    );
  }

  /*
   * Timer.
   */
  function iniciarTimer(
    segundos
  ) {
    clearTimeout(
      timerLeitura
    );

    document.documentElement
      .classList.remove(
        "fc-timer-finalizado"
      );

    const total =
      Number(segundos);

    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {
      return;
    }

    timerLeitura =
      setTimeout(() => {
        document.documentElement
          .classList.add(
            "fc-timer-finalizado"
          );
      }, total * 1000);
  }

  /*
   * Se qualquer vídeo/áudio começar a tocar
   * enquanto o Modo Calmo estiver ativo,
   * ele será pausado novamente.
   */
  document.addEventListener(
    "play",
    (evento) => {
      if (
        !preferencias.modoCalmo
      ) {
        return;
      }

      if (
        evento.target instanceof
        HTMLMediaElement
      ) {
        pausarMidia(
          evento.target
        );
      }
    },
    true
  );

  chrome.runtime.onMessage.addListener(
    (
      mensagem,
      _remetente,
      responder
    ) => {
      if (
        !mensagem ||
        !mensagem.tipo
      ) {
        return;
      }

      if (
        mensagem.tipo ===
        "ATUALIZAR_PREFERENCIAS"
      ) {
        aplicarPreferencias(
          mensagem.prefs || {}
        );

        responder?.({
          ok: true
        });

        return;
      }

      if (
        mensagem.tipo ===
        "LER_EM_VOZ_ALTA"
      ) {
        falarTexto(
          mensagem.texto || ""
        );

        responder?.({
          ok: true
        });

        return;
      }

      if (
        mensagem.tipo ===
        "INICIAR_TIMER"
      ) {
        iniciarTimer(
          mensagem.segundos
        );

        responder?.({
          ok: true
        });
      }
    }
  );

  corpoPronto(() => {
    iniciarObservadorDistracoes();
    iniciarObservadorMidia();

    chrome.storage.sync.get(
      PREFERENCIAS_PADRAO,
      (prefs) => {
        aplicarPreferencias(
          prefs ||
            PREFERENCIAS_PADRAO
        );
      }
    );
  });
})();