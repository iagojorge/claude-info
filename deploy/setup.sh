#!/bin/bash
set -e

echo "============================================"
echo "  DEPLOY - Cursos Práticos"
echo "============================================"

# ─── 1. Atualizar sistema ──────────────────────
echo ""
echo ">>> [1/8] Atualizando sistema..."
apt update -y && apt upgrade -y

# ─── 2. Instalar Node.js 20 LTS ───────────────
echo ""
echo ">>> [2/8] Instalando Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "Node: $(node -v) | NPM: $(npm -v)"

# ─── 3. Instalar Nginx ────────────────────────
echo ""
echo ">>> [3/8] Instalando Nginx..."
apt install -y nginx
systemctl enable nginx

# ─── 4. Instalar PM2 ──────────────────────────
echo ""
echo ">>> [4/8] Instalando PM2..."
npm install -g pm2

# ─── 5. Preparar diretórios ───────────────────
echo ""
echo ">>> [5/8] Preparando diretórios..."
mkdir -p /var/www/cursos-praticos/backend

# Copiar frontend
cp /tmp/deploy-cursos/index.html /var/www/cursos-praticos/
cp /tmp/deploy-cursos/styles.css /var/www/cursos-praticos/
cp /tmp/deploy-cursos/script.js /var/www/cursos-praticos/
cp /tmp/deploy-cursos/deploy/config.production.js /var/www/cursos-praticos/config.js

# Copiar backend
cp /tmp/deploy-cursos/backend/server.js /var/www/cursos-praticos/backend/
cp /tmp/deploy-cursos/backend/package.json /var/www/cursos-praticos/backend/
cp /tmp/deploy-cursos/deploy/.env.production /var/www/cursos-praticos/backend/.env
cp /tmp/deploy-cursos/deploy/ecosystem.config.js /var/www/cursos-praticos/backend/

# ─── 6. Instalar dependências backend ─────────
echo ""
echo ">>> [6/8] Instalando dependências do backend..."
cd /var/www/cursos-praticos/backend
npm install --production

# ─── 7. Configurar Nginx ──────────────────────
echo ""
echo ">>> [7/8] Configurando Nginx..."
cp /tmp/deploy-cursos/deploy/nginx.conf /etc/nginx/sites-available/cursos-praticos
ln -sf /etc/nginx/sites-available/cursos-praticos /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar config
nginx -t
systemctl restart nginx

# ─── 8. Iniciar backend com PM2 ───────────────
echo ""
echo ">>> [8/8] Iniciando backend com PM2..."
cd /var/www/cursos-praticos/backend

# Parar instância anterior se existir
pm2 delete cursos-praticos-api 2>/dev/null || true

pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# ─── Firewall ─────────────────────────────────
echo ""
echo ">>> Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

# ─── Verificação ──────────────────────────────
echo ""
echo "============================================"
echo "  DEPLOY CONCLUÍDO!"
echo "============================================"
echo ""
echo "  Site: http://187.127.24.38"
echo "  API:  http://187.127.24.38/api/payment/pix"
echo "  Health: http://187.127.24.38/api/../health"
echo ""

# Testar health
sleep 2
curl -s http://127.0.0.1:3001/health || echo "⚠ Backend ainda iniciando..."

echo ""
echo "  PM2 status:"
pm2 status
