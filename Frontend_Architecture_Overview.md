# Visão Geral da Arquitetura do Frontend

Este documento descreve a arquitetura e os principais padrões de projeto utilizados no frontend do projeto Transcendence.

## 1. Estrutura de Pastas Principal (`/src`)

A estrutura do código é bem organizada, separando as responsabilidades:

- `/components`: Contém classes para elementos de UI reutilizáveis (ex: `Navbar.ts`, `AuthModal.ts`). Cada classe é responsável por renderizar e gerenciar o comportamento de uma parte específica da interface.
- `/managers`: Classes que gerenciam o estado e a lógica de alto nível do lado do cliente (ex: `GameManager.ts`, `TournamentManager.ts`). Eles são o "cérebro" das operações do frontend.
- `/services`: Classes que servem como uma ponte para a API do backend. Eles encapsulam a lógica de chamadas `fetch` e manipulação de dados com o servidor (ex: `AuthService.ts`, `MatchService.ts`).
- `/utils`: Utilitários genéricos, como a classe `Router.ts`.

## 2. O Coração da Aplicação: `App.ts`

A classe `App` é o ponto de entrada principal. Suas responsabilidades são:

- **Inicialização:** Cria as instâncias de todos os `managers` e `services` quando a aplicação carrega.
- **Roteamento:** Configura as rotas da aplicação (ex: `/`, `/game`, `/tournament`) usando a classe `Router`.
- **Renderização Principal:** Controla qual "página" ou `component` é exibido com base na URL atual.

## 3. Padrão: Manager vs. Service

O projeto utiliza um padrão claro para separar as responsabilidades:

- **Managers (Gerenciadores):** Lidam com a **lógica do lado do cliente**. O `GameManager`, por exemplo, não sabe como salvar uma partida no banco de dados, mas sabe como rodar o loop do jogo, mover a bola e verificar a pontuação. Ele gerencia o **estado** da aplicação no navegador.

- **Services (Serviços):** Lidam com a **comunicação com o servidor**. O `MatchService` não sabe como o jogo funciona, mas sabe como enviar uma requisição HTTP para o backend para registrar o resultado de uma partida. Ele é uma abstração para a API.

## 4. Fluxo de um Jogo (Exemplo)

1.  O usuário clica em "Quick Game" na página inicial.
2.  O `Router` em `App.ts` aciona o método `showGamePage()`.
3.  `showGamePage()` renderiza o HTML do canvas e chama `this.gameManager.startGame()`.
4.  `GameManager.startGame()` inicializa o canvas e inicia o `gameLoop()`.
5.  O `gameLoop()` é chamado continuamente (`requestAnimationFrame`) e executa dois métodos principais:
    - `update()`: Atualiza a posição das raquetes e da bola.
    - `render()`: Desenha tudo no canvas.
6.  Quando o jogo termina, `endGame()` é chamado, que por sua vez utiliza o `matchService` para salvar o resultado no backend.

## 5. Como a IA se Encaixará

Nossa classe `AIOpponent` seguirá o padrão de `Manager`:

- Ela será instanciada dentro do `GameManager`.
- O `GameManager` terá uma propriedade `isAIGame` para diferenciar um jogo normal de um jogo contra a IA.
- No método `updatePaddles()` do `GameManager`, em vez de ler o teclado para o jogador 2, ele chamará `this.aiOpponent.update()`, delegando a decisão de movimento para a nossa nova classe.
