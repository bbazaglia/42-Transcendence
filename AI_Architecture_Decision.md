# Decisão de Arquitetura da IA - Módulo Oponente AI

## 1. Problema

Onde implementar a lógica do oponente de Inteligência Artificial (IA) no frontend?

## 2. Opções Consideradas

- **Opção A:** Adicionar a lógica diretamente na classe `GameManager` (`frontend/src/managers/GameManager.ts`).
- **Opção B:** Criar uma nova classe dedicada, `AIOpponent`, em um novo arquivo (`frontend/src/managers/AIOpponent.ts`).

## 3. Decisão

**Opção B foi a escolhida.** A lógica da IA será encapsulada em sua própria classe e arquivo: `frontend/src/managers/AIOpponent.ts`.

## 4. Justificativa

Esta abordagem foi decidida pelos seguintes motivos:

- **Modularidade:** Alinha-se com as boas práticas de engenharia de software e com os princípios da 42, separando responsabilidades. O `GameManager` gerencia o jogo, e o `AIOpponent` gerencia o comportamento da IA.
- **Sugestão da Equipe:** Reflete a sugestão de um membro da equipe durante a discussão do dia 22/09, promovendo a colaboração e o alinhamento do time.
- **Manutenibilidade:** Isolar a lógica da IA torna mais fácil modificar, depurar e testar o comportamento do oponente sem afetar o resto da gestão do jogo.
- **Clareza do Código:** Evita que a classe `GameManager` se torne excessivamente grande e complexa (uma "God Class").

## 5. Plano de Implementação (Alto Nível)

1.  A classe `AIOpponent` será criada para conter todos os estados (`aiTargetY`, `aiLastUpdateTime`) e métodos (`predictBallTrajectory`, `update`) relacionados à IA.
2.  A classe `GameManager` irá importar e criar uma instância de `AIOpponent`.
3.  Dentro do loop principal do jogo em `GameManager`, o método `AIOpponent.update()` será chamado, passando as informações necessárias do estado do jogo (ex: posição e velocidade da bola).
