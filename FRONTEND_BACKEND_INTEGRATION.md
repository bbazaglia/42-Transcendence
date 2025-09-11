# 🔗 Guia de Integração Frontend-Backend

## 📋 Visão Geral

Este guia explica como integrar o frontend (TypeScript + Vite) com o backend (Fastify + Prisma) no projeto 42-Transcendence.

## 🏗️ Arquitetura

```
Frontend (Porta 5173) ←→ Backend (Porta 3000)
     ↓                        ↓
   Vite Proxy              Fastify API
     ↓                        ↓
  /api/* → http://backend:3000/api/*
```

## 🚀 Como Executar

### 1. Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Docker (Produção)
```bash
docker-compose up --build
```

## 🔌 Estrutura da API

### Base URL
- **Desenvolvimento**: `http://localhost:5173/api` (proxy do Vite)
- **Produção**: `http://localhost:3000/api`

### Endpoints Disponíveis

#### 🔐 Autenticação (`/api/auth`)

**POST /api/auth/register**
```typescript
// Request
{
  "displayName": "João Silva",
  "email": "joao@email.com",
  "password": "senha123"
}

// Response (201)
{
  "id": 1,
  "displayName": "João Silva",
  "email": "joao@email.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**POST /api/auth/login**
```typescript
// Request
{
  "email": "joao@email.com",
  "password": "senha123"
}

// Response (200) + Cookie JWT
{
  "id": 1,
  "displayName": "João Silva",
  "email": "joao@email.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 👤 Usuários (`/api/users`)

**GET /api/users/:id**
```typescript
// Response (200)
{
  "id": 1,
  "displayName": "João Silva",
  "email": "joao@email.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**GET /api/users/:id/history**
```typescript
// Response (200)
[
  {
    "id": 1,
    "playerOneId": 1,
    "playerTwoId": 2,
    "playerOneScore": 5,
    "playerTwoScore": 3,
    "playedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### 🏥 Health Check (`/api/health`)

**GET /api/health**
```typescript
// Response (200)
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 💻 Como Usar no Frontend

### 1. Importar os Serviços

```typescript
import { apiService } from './services/ApiService.js';
import { authService } from './services/AuthService.js';
import { notificationService } from './services/NotificationService.js';
```

### 2. Autenticação

```typescript
// Registrar usuário
const result = await authService.register({
  displayName: "João Silva",
  email: "joao@email.com",
  password: "senha123"
});

if (result.success) {
  console.log("Usuário registrado com sucesso!");
} else {
  console.error("Erro:", result.error);
}

// Login
const loginResult = await authService.login({
  email: "joao@email.com",
  password: "senha123"
});

// Verificar se está autenticado
if (authService.isAuthenticated()) {
  const user = authService.getCurrentUser();
  console.log("Usuário logado:", user?.displayName);
}

// Logout
await authService.logout();
```

### 3. Chamadas Diretas à API

```typescript
// Buscar perfil de usuário
const response = await apiService.getUserProfile(1);
if (response.data) {
  console.log("Perfil:", response.data);
}

// Buscar histórico de partidas
const history = await apiService.getUserMatchHistory(1);
if (history.data) {
  console.log("Histórico:", history.data);
}

// Health check
const health = await apiService.healthCheck();
console.log("Status do backend:", health.status);
```

### 4. Notificações

```typescript
// Notificações automáticas (já configuradas nos serviços)
// Ou manuais:

notificationService.success("Sucesso!", "Operação realizada com sucesso!");
notificationService.error("Erro!", "Algo deu errado!");
notificationService.warning("Atenção!", "Verifique os dados!");
notificationService.info("Info", "Informação importante!");
```

### 5. Escutar Mudanças de Estado

```typescript
// Escutar mudanças no estado de autenticação
const unsubscribe = authService.subscribe((state) => {
  if (state.isAuthenticated) {
    console.log("Usuário logado:", state.user);
  } else {
    console.log("Usuário não logado");
  }
});

// Parar de escutar
unsubscribe();
```

## 🔧 Configuração do Proxy (Vite)

O arquivo `vite.config.ts` já está configurado:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://backend:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

## 🍪 Autenticação com Cookies

O backend usa cookies HTTP-only para autenticação:

```javascript
// Backend (já configurado)
reply.setCookie('token', token, {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 7 // 7 dias
});
```

```typescript
// Frontend (já configurado)
const response = await fetch(url, {
  credentials: 'include', // Importante para cookies
  // ... outras opções
});
```

## 🚨 Tratamento de Erros

### Erros de API
- **Automático**: Notificações aparecem automaticamente
- **Manual**: Verificar `response.error` nas respostas

### Erros de Rede
- **Automático**: Notificação de "Erro de Conexão"
- **Manual**: Try/catch nas chamadas

### Validação
- **Frontend**: Validação básica nos formulários
- **Backend**: Validação completa com schemas Fastify

## 🔄 Fluxo de Dados

```
1. Usuário interage com a interface
2. Frontend chama authService/apiService
3. Serviço faz requisição HTTP para /api/*
4. Vite proxy redireciona para backend:3000
5. Backend processa com Fastify + Prisma
6. Resposta retorna para o frontend
7. Estado é atualizado e UI re-renderiza
8. Notificações são exibidas se necessário
```

## 🧪 Testando a Integração

### 1. Teste de Conectividade
```typescript
// No console do navegador
const health = await apiService.healthCheck();
console.log(health);
```

### 2. Teste de Registro
```typescript
const result = await authService.register({
  displayName: "Teste",
  email: "teste@teste.com",
  password: "123456"
});
console.log(result);
```

### 3. Teste de Login
```typescript
const result = await authService.login({
  email: "teste@teste.com",
  password: "123456"
});
console.log(result);
```

## 🐛 Debugging

### 1. Verificar Console do Navegador
- Erros de rede aparecem automaticamente
- Logs detalhados dos serviços

### 2. Verificar Network Tab
- Requisições para `/api/*`
- Status codes e responses

### 3. Verificar Backend Logs
```bash
cd backend
npm run dev
# Logs aparecem no terminal
```

## 📝 Próximos Passos

1. **Implementar mais endpoints** no backend
2. **Adicionar validação** mais robusta
3. **Implementar refresh token** para sessões longas
4. **Adicionar testes** automatizados
5. **Implementar cache** para melhor performance

## 🔗 Links Úteis

- [Fastify Documentation](https://www.fastify.io/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
