# 🚀 Deployment a Vercel - Guía Simplificada

## ✅ Configuración Actual

**Estructura**:
```
insbr-api/
├── api/
│   └── index.ts          # Vercel lo detecta automáticamente
├── src/
│   ├── app.ts            # Tu aplicación Express
│   └── ...
└── vercel.json           # Configuración mínima
```

**Archivos configurados**:
- ✅ `api/index.ts` - Entry point (Vercel lo detecta automáticamente)
- ✅ `vercel.json` - Configuración simple con rewrites

---

## 📝 Pasos para Deployment

### 1. Configurar Variables de Entorno en Vercel

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables**:

```
TURSO_DATABASE_URL=libsql://tu-base-de-datos.turso.io
TURSO_AUTH_TOKEN=tu-token-de-autenticacion
JWT_SECRET=tu-secreto-jwt-super-seguro
NODE_ENV=production
```

### 2. Deploy

**Opción A: GitHub (Recomendado)**
1. Push a GitHub
2. Vercel → New Project → Import Repository
3. Deploy automático

**Opción B: CLI**
```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## ✅ Verificación

```bash
# Health check
curl https://tu-proyecto.vercel.app/health

# Login
curl -X POST https://tu-proyecto.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_diriamba","password":"123"}'
```

**Swagger**: `https://tu-proyecto.vercel.app/api-docs`

---

## 🔧 Cómo Funciona

1. Vercel detecta `api/index.ts` automáticamente
2. Lo compila como función serverless
3. `vercel.json` redirige todas las rutas a `/api`
4. Express maneja las rutas normalmente

---

## 💡 Tips

- **Variables de entorno**: Configúralas en Vercel Dashboard
- **Logs**: Vercel → Deployments → View Function Logs
- **Rollback**: Desde el dashboard puedes volver a versiones anteriores
- **Dominios**: Settings → Domains para agregar dominio personalizado

---

## 🎯 Checklist

- [ ] Variables de entorno en Vercel
- [ ] `npm run build` exitoso
- [ ] Código en GitHub
- [ ] Deploy desde Vercel

**¡Listo! 🚀**
