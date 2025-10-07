# Log da Sessão de Depuração: Funcionalidade 2FA

**Data:** 07/10/2025

**Objetivo:** Diagnosticar e corrigir uma série de bugs que impediam a ativação e o uso da Autenticação de Dois Fatores (2FA).

---

### Estado Inicial

O usuário reportou que a funcionalidade de habilitar o 2FA estava quebrada. O primeiro erro observado foi ao tentar acessar a página de configuração.

---

### Resumo da Sessão de Depuração

A sessão consistiu em uma série de diagnósticos e correções incrementais. Cada correção revelou o bug seguinte no fluxo.

#### Bug 1: Botão "Manage 2FA" Ausente

-   **Problema:** O botão para acessar a configuração de 2FA havia sumido da página de perfil do usuário.
-   **Diagnóstico:** Uma análise do arquivo `frontend/src/pages/ProfilePage.ts` revelou que o código HTML do botão e seu respectivo `event listener` tinham sido acidentalmente removidos.
-   **Solução:** O HTML do botão e seu `event listener` foram restaurados no arquivo `ProfilePage.ts`.

#### Bug 2: Redirecionamento Incorreto para a Home

-   **Problema:** Após restaurar o botão, clicar nele redirecionava o usuário para a página inicial em vez da página de configuração do 2FA.
-   **Diagnóstico:** O roteador principal da aplicação, em `frontend/src/App.ts`, não possuía uma rota definida para o caminho `/profile/2fa`.
-   **Solução:** A rota e um método para renderizar a página de 2FA foram temporariamente adicionados ao `App.ts`.

#### Bug 3: Erro de API "Body cannot be empty"

-   **Problema:** A página de 2FA carregava, mas exibia imediatamente um erro vindo da API: `Body cannot be empty when content-type is set to 'application/json'`.
-   **Diagnóstico:** A requisição `POST` para gerar o QR Code (`/api/users/:userId/totp/setup`) estava sendo enviada com um cabeçalho de `Content-Type` JSON, mas sem um corpo, o que era rejeitado pelo backend.
-   **Solução:** A chamada no `frontend/src/services/TotpService.ts` foi modificada para incluir um corpo JSON vazio: `body: JSON.stringify({})`.

#### Bug 4: Refatoração de Página para Modal (UX)

-   **Problema:** A funcionalidade estava se comportando como uma página de tela cheia, o que era uma experiência de usuário ruim e quebrava o fluxo de navegação (botão "voltar"). A intenção era que fosse um pop-up (modal).
-   **Solução:** Uma grande refatoração foi executada:
    1.  A rota de página inteira foi removida do `App.ts`.
    2.  O arquivo `TotpSetupPage.ts` foi renomeado e sua classe reescrita para se tornar um componente de modal reutilizável: `TotpSetupModal.ts`.
    3.  O arquivo `ProfilePage.ts` foi modificado para importar e exibir o `TotpSetupModal` como um pop-up sobre a página de perfil.

#### Bug 5: Erro Inesperado na Geração do QR Code

-   **Problema:** Após a refatoração para modal, a geração do QR Code começou a falhar com a mensagem genérica: `An unexpected error occurred during TOTP setup.`
-   **Diagnóstico:** Os logs do backend (fornecidos pelo usuário) mostraram que o erro real era um `TypeError`. A causa era um conflito de tipos: o `userId` era passado como `string` (texto) da URL para o Prisma (banco de dados), que esperava um `number` (número).
-   **Solução:** O `userId` foi convertido para um inteiro usando `parseInt()` na rota `/:userId/totp/setup` dentro do arquivo `backend/src/routes/users.js`.

#### Bug 6: Erro Inesperado na Verificação do Código

-   **Problema:** Após a correção anterior, o QR Code passou a ser gerado, mas a verificação do código de 6 dígitos falhava com a mesma mensagem genérica: `An unexpected error occurred during TOTP verification.`
-   **Diagnóstico:** O erro persistir mesmo após um reset do banco de dados indicou um problema no código, não nos dados. A análise revelou um `ReferenceError` no arquivo `backend/src/plugins/totp.js`. Uma constante `TOTP_WINDOW`, usada para dar uma janela de tolerância ao código, estava sendo chamada na função de verificação, mas nunca havia sido definida.
-   **Solução:** A constante `const TOTP_WINDOW = opts.window || 1;` foi adicionada ao `totp.js`, corrigindo o erro de referência.

---

### Estado Atual e Próximos Passos

-   **Última Ação:** A correção para o **Bug 6** foi aplicada no arquivo `backend/src/plugins/totp.js`.
-   **Ação Pendente:** Para que esta última correção tenha efeito, o ambiente Docker precisa ser **completamente reiniciado**.

**Instruções para quando você voltar:**

1.  **Pare o ambiente** de desenvolvimento atual com o comando:
    ```sh
    make dev-down
    ```

2.  **Reconstrua e inicie** o ambiente para garantir que todas as alterações de código sejam aplicadas:
    ```sh
    make dev
    ```

3.  **Teste o Fluxo:**
    *   Use a **conta de usuário nova** que você criou após o reset do banco de dados.
    *   Navegue para a página de perfil.
    *   Clique em "Manage 2FA".
    *   Escaneie o QR Code e tente **verificar o código de 6 dígitos**.

O fluxo de verificação agora deve ser concluído com sucesso.
