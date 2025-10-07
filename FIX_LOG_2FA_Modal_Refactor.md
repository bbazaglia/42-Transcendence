# Relatório de Correção: Refatoração do 2FA para Modal e Correção de API

**Data:** 07/10/2025

Este documento detalha a correção de dois problemas relacionados à funcionalidade de 2FA: um erro de API e a experiência do usuário, que foi refatorada de uma página inteira para um componente de modal (pop-up).

---

### Os Problemas (The Problems)

Após a restauração do botão "Manage 2FA", foram identificados dois novos problemas:

1.  **Erro de API:** Ao abrir a tela de setup do 2FA, o backend retornava o erro `Body cannot be empty when content-type is set to 'application/json'`, impedindo a geração do QR Code.
2.  **Experiência do Usuário (UX):** A funcionalidade estava sendo exibida como uma página de tela cheia, e não como um pop-up, que era a intenção original. Além disso, o botão "Back" na página não funcionava como esperado.

### O Diagnóstico (The Diagnosis)

1.  **Causa do Erro de API:** A requisição `POST` para `/api/users/:userId/totp/setup`, enviada pelo `TotpService.ts`, definia o cabeçalho `Content-Type: application/json`, mas não enviava nenhum dado no corpo (`body`). O backend (Fastify) está configurado para rejeitar essa inconsistência por segurança.

2.  **Causa do Problema de UX:** A implementação anterior, feita para corrigir o botão quebrado, registrou uma rota de página inteira (`/profile/2fa`) no roteador principal (`App.ts`). O componente `TotpSetupPage.ts` foi codificado para renderizar sobre todo o `document.body`, resultando na experiência de tela cheia e na quebra do fluxo de navegação.

### A Solução (The Solution)

A solução foi implementada em uma série de etapas de correção e refatoração:

#### 1. Correção do Erro da API

No arquivo `frontend/src/services/TotpService.ts`, um corpo de requisição JSON vazio foi adicionado à chamada da API, satisfazendo a exigência do backend.

```typescript
// Em frontend/src/services/TotpService.ts

async setupTotp(userId: number): Promise<{ data?: TotpSetupResponse; error?: string }> {
  const response = await apiService.request<TotpSetupResponse>(`/users/${userId}/totp/setup`, {
    method: 'POST',
    body: JSON.stringify({}), // Adicionado corpo vazio
  });
  // ...
}
```

#### 2. Refatoração para Componente de Modal

O fluxo de navegação para uma página inteira foi revertido e a funcionalidade foi encapsulada em um componente de modal.

- **Limpeza em `App.ts`:** A rota `/profile/2fa` e seu método `show2FAPage` foram removidos do roteador principal.
- **Renomeação e Refatoração:** O arquivo `TotpSetupPage.ts` foi renomeado para `TotpSetupModal.ts` e sua classe foi reescrita para não mais controlar a página inteira. Agora, ela apenas retorna o HTML do modal e expõe métodos para controle externo.
- **Integração na `ProfilePage.ts`:** A `ProfilePage` foi modificada para importar e gerenciar o novo `TotpSetupModal`. Um novo método, `showTotpSetupModal`, foi criado para injetar o modal dinamicamente na página quando o botão "Manage 2FA" é clicado.

```typescript
// Em frontend/src/pages/ProfilePage.ts

// Novo método para exibir o modal
private showTotpSetupModal(): void {
    const modalContainer = document.createElement('div');
    document.body.appendChild(modalContainer);

    const closeModal = () => {
        modalContainer.remove();
        window.location.reload(); // Recarrega a página para refletir o novo status do 2FA
    };

    const totpModal = new TotpSetupModal(closeModal);
    modalContainer.innerHTML = totpModal.render();
    totpModal.setupEventListeners(modalContainer.firstElementChild as HTMLElement);
}

// O event listener foi atualizado para chamar o novo método
document.getElementById('manage-2fa-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  this.showTotpSetupModal();
});
```

Essas mudanças corrigiram o erro da API, implementaram a experiência de usuário desejada (pop-up) e criaram um componente `TotpSetupModal` mais reutilizável.
