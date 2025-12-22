#!/bin/bash

# SSL Certificate Setup Script for Legato
# Run this script to obtain SSL certificates from Let's Encrypt

set -e

DOMAIN="legato.lunive.app"
EMAIL="your-email@example.com"  # Change this to your email

echo "🔐 Setting up SSL for $DOMAIN"

# Create directories
mkdir -p certbot/www certbot/conf

# Step 1: Start with HTTP-only nginx config
echo "📝 Using HTTP-only nginx config for certificate request..."
cp nginx/nginx-init.conf nginx/nginx.conf.backup
cp nginx/nginx-init.conf nginx/nginx.conf

# Step 2: Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Step 3: Start services
echo "🚀 Starting services..."
docker compose up -d legato nginx

# Wait for nginx to be ready
echo "⏳ Waiting for nginx to start..."
sleep 5

# Step 4: Request certificate
echo "📜 Requesting SSL certificate..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Step 5: Restore HTTPS nginx config
echo "🔄 Switching to HTTPS nginx config..."
mv nginx/nginx.conf.backup nginx/nginx-init.conf
# The main nginx.conf already has HTTPS config

# Need to get the full SSL config back
cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    upstream nextjs {
        server legato:3000;
    }

    upstream websocket {
        server legato:3001;
    }

    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

    server {
        listen 80;
        listen [::]:80;
        server_name legato.lunive.app;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name legato.lunive.app;

        ssl_certificate /etc/letsencrypt/live/legato.lunive.app/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/legato.lunive.app/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location /ws {
            proxy_pass http://websocket;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400;
            proxy_send_timeout 86400;
        }

        location / {
            limit_req zone=general burst=20 nodelay;
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /_next/static {
            proxy_pass http://nextjs;
            proxy_cache_valid 60m;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }

        location /health {
            access_log off;
            return 200 "OK";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Step 6: Restart nginx with HTTPS
echo "🔄 Restarting nginx with HTTPS..."
docker compose restart nginx

echo ""
echo "✅ SSL setup complete!"
echo "🌐 Your site is now available at https://$DOMAIN"
echo ""
echo "📝 Don't forget to:"
echo "   1. Update your DNS to point $DOMAIN to this server's IP"
echo "   2. Update .env file: NEXT_PUBLIC_WS_URL=wss://$DOMAIN/ws"
echo "   3. Rebuild and restart: docker compose up -d --build"
