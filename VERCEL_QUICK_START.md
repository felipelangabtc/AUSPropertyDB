# 🚀 Quick Start: Deploy no Vercel em 10 Passos

**Tempo estimado**: 30 minutos
**Status**: ✅ Projeto 100% pronto para Vercel

---

## ⚡ Os 10 Passos

### 1️⃣ Fazer Login no Vercel

```bash
npx vercel login
```

Selecione "Continue with GitHub" e autorize.

---

### 2️⃣ Linkar Projeto

```bash
cd "c:\Users\felip\OneDrive\Área de Trabalho\Nova pasta"
npx vercel link
```

Responda:
- Set up and deploy? → **y**
- Which scope? → Seu usuário/organização
- Link to existing? → **n** (criar novo)
- Project name? → **aus-property-db**
- Directory? → **.//**

---

### 3️⃣ Preparar Variáveis de Ambiente

Copie `.env.vercel.example` e preencha com seus valores:

```bash
# Variáveis obrigatórias (mínimo)
NEXT_PUBLIC_API_URL=https://api.ausproperty.app
NEXT_PUBLIC_MAPBOX_TOKEN=seu_token
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=seu_secret_seguro
```

Mais informações em: [.env.vercel.example](.env.vercel.example)

---

### 4️⃣ Adicionar Variáveis no Vercel Dashboard

1. Ir para https://vercel.com/dashboard
2. Selecionar projeto "aus-property-db"
3. **Settings** → **Environment Variables**
4. Clicar **Add Environment Variable**
5. Preencher cada variável de `.env.vercel.example`

---

### 5️⃣ Testar Build Localmente

```bash
# Instalar dependências
pnpm install --frozen-lockfile

# Build local
pnpm build --filter=web

# Resultado esperado:
# ✓ compiled successfully
```

---

### 6️⃣ Testar com Vercel CLI

```bash
# Simular ambiente de produção
npx vercel dev

# Resultado: http://localhost:3000
```

---

### 7️⃣ Deploy de Prévia (Opcional)

```bash
# Deploy temporário
npx vercel

# URL: https://aus-property-db-xxxxx.vercel.app
```

---

### 8️⃣ Deploy para Produção

```bash
# Deploy final
npx vercel --prod

# Resultado:
# ✓ Production: https://aus-property-db.vercel.app
```

---

### 9️⃣ Verificar Saúde do Deploy

```bash
# Testar frontend
curl https://aus-property-db.vercel.app

# Testar API (se houver)
curl https://api.ausproperty.app/health

# Ver logs
npx vercel logs --prod --follow
```

---

### 🔟 Configurar Domínio Customizado (Opcional)

1. **Settings** → **Domains**
2. Adicionar: `ausproperty.app`
3. Configurar DNS no seu registrador
4. Aguardar propagação (até 24h)

---

## 📋 Checklist Pré-Deploy

Antes de fazer `npx vercel --prod`:

- [ ] `vercel.json` ✅ (criado)
- [ ] `.vercelignore` ✅ (criado)
- [ ] `next.config.js` atualizado ✅
- [ ] Todas as variáveis de env adicionadas
- [ ] Build local funcionando
- [ ] Testes passando (ou desabilitados)
- [ ] Todos os arquivos commitados em git
- [ ] Repositório em GitHub sincronizado

---

## 🎯 URLs Depois do Deploy

```
🌐 Frontend: https://aus-property-db.vercel.app
📊 Dashboard: https://vercel.com/dashboard
📈 Analytics: https://vercel.com/dashboard/aus-property-db/analytics
🔧 Settings: https://vercel.com/dashboard/aus-property-db/settings
```

---

## 🆘 Problemas Comuns & Soluções

### Build falhou?

```bash
# Ver logs detalhados
npx vercel logs --prod

# Testar localmente
pnpm build --filter=web

# Se funciona local, problema é env variables
npx vercel env list
```

### Página em branco?

```bash
# Verificar logs de erro
# Vercel Dashboard → Deployments → Logs
# Browser DevTools → Console

# Pode ser:
# 1. NEXT_PUBLIC_API_URL incorreta
# 2. Arquivo .vercelignore rejeitando algo importante
# 3. Dependência não instalada
```

### Deploy lento?

```bash
# Otimizações já aplicadas em:
# - next.config.js (image optimization)
# - .vercelignore (build time reduction)
# - vercel.json (regions = sydney)

# Se ainda lento:
# - Verificar size de node_modules (pnpm install --frozen-lockfile)
# - Desabilitar source maps (productionBrowserSourceMaps: false ✅)
```

---

## 📚 Documentação Completa

Leia para mais detalhes:

- **[VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)** - Guia completo e detalhado
- **[.env.vercel.example](.env.vercel.example)** - Todas as variáveis disponíveis
- **[vercel.json](vercel.json)** - Configuração do Vercel
- **[apps/web/next.config.js](apps/web/next.config.js)** - Configuração do Next.js

---

## ⏱️ Tempo Estimado

| Etapa | Tempo |
|-------|-------|
| Instalar CLI | 2 min |
| Login/Link | 3 min |
| Adicionar env vars | 5 min |
| Testar build | 5 min |
| Deploy | 5 min |
| **Total** | **~20 min** |

---

## ✅ Status Atual

```
✅ vercel.json criado e configurado
✅ .vercelignore pronto
✅ next.config.js otimizado para produção
✅ .env.vercel.example com todas as variáveis
✅ Documentação completa
✅ Scripts de automação
✅ Pronto para deploy!
```

---

## 🚀 Próximo Comando

```bash
npx vercel --prod
```

---

**Sucesso! 🎉**

O site estará online em minutos em: **https://aus-property-db.vercel.app**

Dúvidas? Leia [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)
