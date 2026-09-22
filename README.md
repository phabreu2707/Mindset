# Foco Calmo — Acessibilidade para Autismo

Extensão de navegador (Chrome, Manifest V3) que torna qualquer site mais calmo,
previsível e fácil de usar para pessoas autistas. Roda inteiramente no
navegador, sem servidor e sem coletar dados — tudo fica salvo localmente
via `chrome.storage.sync`.

## Funcionalidades

| Recurso | O que faz |
|---|---|
| **Modo calmo** | Pausa animações, transições e vídeos/áudios com autoplay |
| **Fonte legível** | Aumenta espaçamento entre linhas/letras e tamanho do texto |
| **Cores suaves** | Reduz saturação e contraste agressivo da página |
| **Esconder distrações** | Remove pop-ups, banners e anúncios comuns, inclusive os que aparecem depois do carregamento |
| **Leitura em voz alta** | Seleciona texto → botão direito → "Ler em voz alta" (usa a API nativa `SpeechSynthesis`) |
| **Timer de pausa visual** | Aviso discreto e sem som em intervalos configuráveis, para evitar sobrecarga de tela |
| **Atalho de teclado** | `Ctrl+Shift+C` liga/desliga o modo calmo instantaneamente |
| **Preferências por site** | Cada configuração pode ser global ou específica de um domínio (o valor por site sempre tem prioridade) |

## Estrutura do projeto

```
extensao-autismo/
├── manifest.json      # Configuração da extensão (permissões, atalhos, etc.)
├── background.js       # Service worker: atalho de teclado e menu de contexto
├── content.js          # Injetado em cada página: aplica os ajustes
├── styles.css           # Classes CSS usadas pelo modo calmo, fonte e cores
├── popup.html / popup.js    # Interface ao clicar no ícone da extensão
├── options.html / options.js # Painel de configurações completo (timer, por site)
└── icons/                # Ícones da extensão (16, 48, 128px)
```

## Como instalar (modo desenvolvedor)

1. Baixe e extraia este projeto em uma pasta fixa no computador.
2. No Chrome, acesse `chrome://extensions`.
3. Ative o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e selecione a pasta `extensao-autismo`
   (a que contém o `manifest.json` direto dentro dela).
5. O ícone "Foco Calmo" vai aparecer na barra de extensões.

Sempre que editar `.js` ou `.css`, volte em `chrome://extensions` e clique
no ícone de recarregar (↻) da extensão para as mudanças valerem.

## Como usar

- Clique no ícone da extensão para ligar/desligar os ajustes básicos
  (modo calmo, fonte legível, cores suaves, esconder distrações).
- Clique em **"Mais configurações"** no popup para acessar o timer de
  pausa, e para configurar preferências específicas do site que você
  estiver visitando no momento.
- Use `Ctrl+Shift+C` para alternar o modo calmo rapidamente, sem abrir o popup.
- Selecione qualquer texto numa página e use o botão direito para ouvi-lo.

## Como funciona (resumo técnico)

- O `content.js` é injetado automaticamente em toda página visitada e lê
  as preferências salvas em `chrome.storage.sync`, aplicando classes CSS
  no `<html>` da página.
- O `popup.js` e o `options.js` salvam as preferências e avisam a aba
  ativa na hora, via `chrome.tabs.sendMessage`, para que a mudança
  apareça sem precisar recarregar a página.
- Preferências por site são salvas com a chave `dominio.com:nomeDaPreferencia`
  e têm prioridade sobre a versão global equivalente.
- "Esconder distrações" usa uma lista de seletores CSS comuns de
  pop-ups/anúncios e um `MutationObserver` para pegar elementos que
  aparecem depois do carregamento inicial da página.

## Limitações conhecidas

- A lista de seletores de "esconder distrações" é conservadora e pode,
  ocasionalmente, esconder elementos legítimos em sites específicos
  (falso positivo). Ajuste a lista em `content.js` (`SELETORES_DISTRACAO`)
  se isso ocorrer.
- Testado apenas no Chrome. Firefox não foi validado nesta versão.

## Próximos passos possíveis

- Publicar na Chrome Web Store.
- Suporte ao Firefox (extensão compatível com WebExtensions).
- Mais opções de personalização visual (paletas de cor, tamanho de fonte
  em passos finos).
