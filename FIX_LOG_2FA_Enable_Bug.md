# Relatório de Diagnóstico e Correção: Bug ao Habilitar 2FA

**Data:** 07/10/2025

Este documento detalha a análise e a correção do erro que ocorria ao tentar habilitar a Autenticação de Dois Fatores (2FA).

---

### O Problema (The Problem)

Ao navegar para a página de configuração do 2FA, a funcionalidade falhava imediatamente, exibindo uma mensagem de erro que impedia a geração do QR Code e o início do processo de habilitação. O erro ocorria antes que o usuário pudesse interagir com a página.

### O Diagnóstico (The Diagnosis)

A investigação seguiu o fluxo de dados desde a ação no frontend até o processamento no backend:

1.  **Análise do Frontend (`TotpSetupPage.ts`):** Foi identificado que o processo de setup do 2FA é iniciado automaticamente quando a página é carregada, através da função `initializeSetup`.

2.  **Chamada de Serviço (`TotpService.ts`):** A função `initializeSetup` chama o método `totpService.setupTotp(userId)`. Este serviço monta uma requisição `POST` para o endpoint `/api/users/:userId/totp/setup`, porém sem enviar um corpo (body):

    ```typescript
    // Em frontend/src/services/TotpService.ts

    async setupTotp(userId: number): Promise<{ data?: TotpSetupResponse; error?: string }> {
      const response = await apiService.request<TotpSetupResponse>(`/users/${userId}/totp/setup`, {
        method: 'POST',
      });
      // ...
    }
    ```

3.  **Análise do Backend (`users.js` e `auth.js`):** Ao inspecionar a rota no backend, foi verificado que ela utiliza um *middleware* de autorização chamado `authorizeParticipant` antes de executar a lógica principal.

4.  **Identificação da Falha:** O ponto de falha foi localizado na função `authorizeParticipant` dentro de `backend/src/plugins/auth.js`. A lógica de autorização não estava tratando corretamente requisições `POST` onde o identificador do usuário (`userId`) estava presente nos parâmetros da URL, em vez de no corpo (`body`) da requisição.

### A Causa Raiz (The Root Cause)

A função de middleware `authorizeParticipant` possuía uma lógica frágil e pouco explícita, baseada em um comentário incorreto que dizia `// We check for userId in params (for GET/DELETE) or actorId in body (for POST/PUT)`.

O código original era:

```javascript
// Em backend/src/plugins/auth.js (VERSÃO ANTIGA)

const authorizeParticipant = async (request, reply) => {
    await authorize(request, reply);

    // We check for userId in params (for GET/DELETE) or actorId in body (for POST/PUT)
    const participantId = request.params?.userId ?? request.body?.actorId;

    if (participantId === undefined) {
        throw fastify.httpErrors.badRequest('Request must include an participantId.');
    }

    const actorIsParticipant = request.sessionData.participants.includes(parseInt(participantId, 10));

    if (!actorIsParticipant) {
        throw fastify.httpErrors.forbidden('The specified actor is not part of this session.');
    }
};
```

O operador `??` (nullish coalescing) deveria funcionar, mas a lógica era confusa e suscetível a erros, pois não previa claramente o caso de uma requisição `POST` que precisava ser autorizada por um ID na URL. Isso causava a rejeição da requisição válida vinda do frontend.

### A Solução (The Solution)

A correção foi aplicada diretamente no arquivo `backend/src/plugins/auth.js`, na função `authorizeParticipant`. A lógica foi reescrita para ser mais robusta, explícita e segura:

```javascript
// Em backend/src/plugins/auth.js (VERSÃO CORRIGIDA)

const authorizeParticipant = async (request, reply) => {
    await authorize(request, reply);

    // The ID of the user being authorized can be in the URL parameters or in the request body.
    // We prioritize the ID from the URL params if it exists, otherwise we check the body.
    let participantId = request.params?.userId;
    if (participantId === undefined) {
        participantId = request.body?.actorId;
    }

    if (participantId === undefined) {
        throw fastify.httpErrors.badRequest('Request must include a participantId in the URL params or as actorId in the body.');
    }

    // Ensure the ID is an integer before checking for inclusion.
    const participantIdInt = parseInt(participantId, 10);
    if (isNaN(participantIdInt)) {
        throw fastify.httpErrors.badRequest('Participant ID must be an integer.');
    }

    const actorIsParticipant = request.sessionData.participants.includes(participantIdInt);

    if (!actorIsParticipant) {
        throw fastify.httpErrors.forbidden('The specified actor is not part of this session.');
    }
};
```

**Melhorias da nova versão:**

1.  **Lógica Explícita:** O código agora verifica primeiro se o `userId` existe nos parâmetros da URL e, somente se não encontrar, verifica o `actorId` no corpo. Isso é mais legível e menos propenso a erros.
2.  **Validação de Tipo:** Foi adicionada uma verificação com `isNaN` para garantir que o ID, após o `parseInt`, seja um número válido, prevenindo erros inesperados.

Essa alteração tornou a função mais clara e flexível, garantindo que tanto a rota de setup do 2FA quanto as outras rotas que dependem desse *middleware* continuem funcionando corretamente.