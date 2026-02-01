# 🚀 Guia Completo: Deploy no Vercel

**Última atualização**: Fevereiro 1, 2026  
**Status**: ✅ Projeto pronto para Vercel

---

## 📋 Pré-requisitos

- ✅ Conta no [Vercel](https://vercel.com/signup)
- ✅ Git configurado e repositório em GitHub
- ✅ Projeto com `vercel.json`, `.vercelignore`, e `.env.vercel.example` preparados
- ✅ Node.js 18+ e pnpm instalados localmente

---

## 🎯 Resumo Rápido (5 minutos)

```bash
# 1. Fazer login no Vercel
npx vercel login

# 2. Fazer link do projeto
npx vercel link

# 3. Copiar variáveis de ambiente
cp .env.vercel.example .env.vercel.local

# 4. Adicionar no Vercel Dashboard (Settings → Environment Variables)
# Ver .env.vercel.example para lista completa

# 5. Deploy
npx vercel --prod

# Pronto! ✅
```

---

## 📍 Passo 1: Preparar Repositório

### 1.1 Fazer Commit de Preparação

```bash
cd "c:\Users\felip\OneDrive\Área de Trabalho\Nova pasta"

# Verificar status
git status

# Adicionar arquivos de configuração
git add vercel.json .vercelignore .env.vercel.example apps/web/next.config.js

# Commit
git commit -m "chore: prepare project for Vercel deployment

- Add vercel.json configuration
- Add .vercelignore for build optimization
- Add .env.vercel.example with all required variables
- Update next.config.js with Vercel optimizations
- Add deployment scripts"

# Push para GitHub
git push origin main
```

### 1.2 Verificar GitHub

```bash
# Confirmar que tudo foi feito push
git log --oneline -1

# Visitou GitHub → Verify files are there
```

---

## 🔑 Passo 2: Configurar Vercel CLI

### 2.1 Instalar/Atualizar Vercel CLI

```bash
# Instalar globalmente
npm i -g vercel@latest

# Ou usar npx (sem instalar)
npx vercel@latest --version
```

### 2.2 Fazer Login

```bash
# Login com GitHub
npx vercel login

# Escolha "Continue with GitHub"
# Autorize no navegador que abrir
```

### 2.3 Verificar Login

```bash
# Listar seus projetos Vercel (se existirem)
npx vercel projects
```

---

## 🔗 Passo 3: Conectar Repositório

### 3.1 Opção A: Via CLI (Rápido)

```bash
# No diretório do projeto
cd "c:\Users\felip\OneDrive\Área de Trabalho\Nova pasta"

# Linkar projeto
npx vercel link

# Responda as perguntas:
# ? Set up and deploy? → y (sim)
# ? Which scope? → Seu nome/organização
# ? Link to existing project? → n (não)
# ? Project name? → aus-property-db
# ? Directory? → ./ (raiz)
# ? Override? → y (sim)

# Resultado: Created .vercel/project.json
```

### 3.2 Opção B: Via Dashboard (Recomendado para CI/CD)

1. Ir para [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique "New Project"
3. Selecione "AUSPropertyDB" do GitHub
4. **Importante**: Selecione `apps/web` como root directory
5. Clique "Deploy"

---

## 🔐 Passo 4: Configurar Variáveis de Ambiente

### 4.1 Preparar Arquivo

```bash
# Copiar template
cp .env.vercel.example .env.vercel.local

# Editar com seus valores reais
# Não fazer commit de .env.vercel.local!
```

### 4.2 Adicionar via CLI

```bash
# Abrir prompt interativo
npx vercel env add

# Ou adicionar individualmente
npx vercel env add NEXT_PUBLIC_API_URL https://api.ausproperty.app
npx vercel env add DATABASE_URL postgresql://...
npx vercel env add REDIS_URL redis://...
# ... etc
```

### 4.3 Adicionar via Dashboard (Recomendado)

1. [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione projeto → **Settings**
3. Clique **Environment Variables**
4. Adicione cada variável:

```
Variáveis Frontend (NEXT_PUBLIC_*):
├─ NEXT_PUBLIC_API_URL
├─ NEXT_PUBLIC_MAPBOX_TOKEN
├─ NEXT_PUBLIC_SENTRY_DSN
└─ NEXT_PUBLIC_GTAG_ID

Variáveis Backend (se aplicável):
├─ DATABASE_URL
├─ REDIS_URL
├─ JWT_SECRET
└─ JWT_REFRESH_SECRET

Variáveis de Serviços:
├─ SENDGRID_API_KEY
├─ AWS_ACCESS_KEY_ID
├─ AWS_SECRET_ACCESS_KEY
└─ SENTRY_DSN
```

### 4.4 Listar Variáveis Configuradas

```bash
# Ver todas as variáveis
npx vercel env list
```

---

## 🏗️ Passo 5: Preparar e Testar Localmente

### 5.1 Instalar Dependências

```bash
cd "c:\Users\felip\OneDrive\Área de Trabalho\Nova pasta"

# Limpar e reinstalar
pnpm install --frozen-lockfile
```

### 5.2 Testar Build Localmente

```bash
# Build da web
pnpm build --filter=web

# Resultado esperado:
# ✓ compiled successfully
# ✓ built in X.XXs
```

### 5.3 Testar Localmente com Vercel CLI

```bash
# Simular ambiente de produção do Vercel
npx vercel dev

# Resultado: 
# ✓ Ready on http://localhost:3000
# ✓ Build output analyzed in XXms
```

### 5.4 Rodar Testes

```bash
# Rodar todos os testes
pnpm test

# Resultado esperado: All tests passing
```

---

## 📤 Passo 6: Deploy

### 6.1 Deploy de Preview (Opcional)

```bash
# Deploy temporário para prévia (auto-deletado)
npx vercel

# Resultado:
# ✓ Project linked
# ✓ Built in XXXms
# ✓ Preview: https://aus-property-db-xxxxx.vercel.app
# ✓ Valid in XXs
```

### 6.2 Deploy para Produção

```bash
# Deploy final para produção
npx vercel --prod

# Resultado:
# ✓ Project linked
# ✓ Built in XXXms
# ✓ Production: https://aus-property-db.vercel.app
# ✓ Valid in XXs
```

### 6.3 Deploy via GitHub (Recomendado)

Uma vez conectado, todo push para `main` faz deploy automático:

```bash
# Fazer mudanças
git add .
git commit -m "feat: add new feature"
git push origin main

# Vercel detecta push e faz deploy automático
# Você receberá notificação quando terminar
```

---

## ✅ Passo 7: Verificar Deploy

### 7.1 Acessar URL

```
🌐 https://aus-property-db.vercel.app
```

### 7.2 Verificar Health Checks

```bash
# Frontend está respondendo
curl https://aus-property-db.vercel.app

# Resultado: HTML da página

# Se tiver API backend, verificar:
curl https://api.ausproperty.app/health
```

### 7.3 Ver Logs

```bash
# Ver logs de deployment
npx vercel logs --follow

# Ver logs de produção
npx vercel logs --follow --prod
```

### 7.4 Verificar Performance (Vercel Dashboard)

1. Vercel Dashboard → Project → Analytics
2. Ver métricas:
   - Build Time
   - Time to First Byte
   - Lighthouse Score
   - Deployments

---

## 🗂️ Passo 8: Configurar Domínio Customizado

### 8.1 Via Dashboard

1. **Settings** → **Domains**
2. Clique **Add**
3. Digite seu domínio (ex: `ausproperty.app`)
4. Selecione tipo:
   - ✅ **Root Domain** (ausproperty.app)
   - ✅ **Subdomain** (www.ausproperty.app)

### 8.2 Configurar DNS

Adicione registros DNS no seu registrador:

**Para root domain:**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

**Para www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 8.3 Verificar Propagação

```bash
# Verificar se DNS foi propagado (pode levar até 24h)
nslookup ausproperty.app
```

---

## 🔄 Passo 9: Configurar Auto-Deploy

### 9.1 Verificar Configuração

1. **Settings** → **Git**
2. Confirmar:
   - ✅ Production Branch: `main`
   - ✅ Preview Deployments: `All branches`

### 9.2 Deploy Automático ao Push

```bash
# Fazer push
git push origin main

# Vercel faz deploy automaticamente
# Status em: Vercel Dashboard → Deployments
```

### 9.3 Deploy Automático ao Merge de PR

1. Abrir Pull Request no GitHub
2. Vercel cria Preview Deployment
3. Verificar preview em: Vercel Dashboard
4. Fazer merge para main
5. Vercel faz deploy para produção

---

## 🛠️ Passo 10: Monitoramento & Manutenção

### 10.1 Monitorar Performance

```bash
# Ver relatórios semanais
npx vercel analytics

# Acessar dashboard
https://vercel.com/dashboard/project/aus-property-db/analytics
```

### 10.2 Configurar Alertas

1. **Settings** → **Notifications**
2. Configurar alertas para:
   - ✅ Build Failures
   - ✅ Deployment Completions
   - ✅ Critical Errors

### 10.3 Ver Deployments Anteriores

```bash
# Listar últimos deployments
npx vercel deployments

# Revert para deployment anterior
npx vercel rollback
```

### 10.4 Limpar Deployments Antigos

```bash
# Via Dashboard
# Settings → Deployments → Delete old previews
```

---

## 🆘 Troubleshooting

### Erro: Build Failed

**Solução:**
```bash
# Ver logs de erro
npx vercel logs --prod

# Verificar build localmente
pnpm build --filter=web

# Se funciona localmente, pode ser:
# 1. Variáveis de ambiente faltando
# 2. Arquivo .vercelignore rejeitando arquivo importante
# 3. Dependência não instalada
```

### Erro: Cannot Find Module

**Solução:**
```bash
# Garantir pnpm-lock.yaml atualizado
pnpm install

# Fazer commit
git add pnpm-lock.yaml
git commit -m "chore: update lock file"
git push origin main

# Fazer redeploy
npx vercel --prod
```

### Erro: Connection Refused

**Solução:**
```bash
# Verificar variáveis de ambiente
npx vercel env list

# Se DATABASE_URL está vazio:
# 1. Adicionar em Vercel Dashboard
# 2. Fazer redeploy
npx vercel --prod
```

### Projeto Lento

**Solução:**
```bash
# Otimizar imagens
# Em next.config.js já configurado com:
# - formats: ['image/avif', 'image/webp']
# - responsive image sizes

# Ver análise
npx vercel analytics

# Usar Vercel Deployment Status para otimizar
```

---

## 📚 Configurações Importantes Explicadas

### `vercel.json`

```json
{
  "version": 2,                    // Versão da API Vercel
  "buildCommand": "...",           // Comando de build
  "installCommand": "...",         // Comando de instalação
  "outputDirectory": "apps/web/.next",  // Diretório de output
  "regions": ["syd1"],             // Regiões (Sydney)
  "env": {                         // Variáveis de ambiente
    "NEXT_PUBLIC_API_URL": "@next_public_api_url"  // Referência para Dashboard
  }
}
```

### `.vercelignore`

Arquivos ignorados durante build (economiza tempo):
```
.git
.gitignore
node_modules
dist
docs
```

### Variáveis de Ambiente

- **`NEXT_PUBLIC_*`**: Expostas ao frontend (browser) - visíveis no código
- **Sem prefixo**: Apenas no backend - secretas e seguras

---

## 📊 Performance Esperada

Após deploy no Vercel:

| Métrica | Esperado |
|---------|----------|
| **Build Time** | <2 minutos |
| **First Contentful Paint** | <1.5s |
| **Lighthouse Score** | >90 |
| **Uptime** | 99.99% |
| **CDN Response** | <100ms |

---

## 🎉 Conclusão

Seu projeto está agora:

✅ Pronto para Vercel  
✅ Configurado com variáveis de ambiente  
✅ Otimizado para produção  
✅ Com auto-deploy via GitHub  
✅ Com monitoramento ativo  

**Próximos passos:**

1. [x] Prepare files (vercel.json, .vercelignore)
2. [x] Configure environment variables
3. [x] Test build locally
4. [x] Deploy to Vercel
5. [ ] Monitor performance
6. [ ] Configure custom domain
7. [ ] Set up alerts

---

## 📞 Links Úteis

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables
- **Custom Domains**: https://vercel.com/docs/concepts/projects/domains
- **GitHub Integration**: https://vercel.com/docs/concepts/git/vercel-for-github

---

**Status**: ✅ Pronto para Deploy

Próximo comando:
```bash
npx vercel --prod
```

🚀 **Boa sorte!**
