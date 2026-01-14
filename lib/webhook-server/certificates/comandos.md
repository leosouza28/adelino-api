# 1- Arquivo inicial -> Criar em /etc/nginx/sites-available/<nomedobanco.webhook>.trackpix.com.br

server {
  listen 80;
  server_name efi.webhook.trackpix.com.br;

  # necessário pro certbot
  location /.well-known/acme-challenge/ {
    root /var/www/html;
  }

  # healthcheck simples
  location = /healthz {
    return 200 "ok\n";
    add_header Content-Type text/plain;
  }

  # enquanto não tem SSL, pode deixar um retorno simples
  location / {
    return 200 "itau webhook - http ok";
  }
}

# 2- Copiar a configuração para habilitar
sudo ln -s /etc/nginx/sites-available/efi.webhook.trackpix.com.br \
           /etc/nginx/sites-enabled/efi.webhook.trackpix.com.br

# 3- Reiniciar o NGINX

sudo nginx -t
sudo systemctl reload nginx

# 4- Gerar o certificado

sudo certbot --nginx -d efi.webhook.trackpix.com.br

# 5- Alterar o arquivo
server {
  listen 80;
  server_name efi.webhook.trackpix.com.br;

  location /.well-known/acme-challenge/ {
    root /var/www/html;
  }

  location / {
    return 301 https://$host$request_uri;
  }
}


server {
  listen 443 ssl;
  server_name efi.webhook.trackpix.com.br;

  ssl_certificate /etc/letsencrypt/live/efi.webhook.trackpix.com.br/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/efi.webhook.trackpix.com.br/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  # ✅ pede cert do cliente, mas NÃO obriga globalmente
  ssl_verify_client optional;
  ssl_client_certificate /etc/nginx/mtls/efi.crt;

  location = /healthz {
    add_header Content-Type text/plain;
    return 200 "ok\n";
  }

  # (opcional) página simples sem mTLS
  location = / {
    add_header Content-Type text/plain;
    return 200 "efi webhook online\n";
  }

  # ✅ mTLS obrigatório somente no POST /pix
  location = /pix {
    # só aceita POST
    if ($request_method != POST) { return 405; }

    # exige certificado cliente válido (mTLS)
    if ($ssl_client_verify != SUCCESS) { return 403; }

    proxy_pass http://127.0.0.1:3010/pix;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_read_timeout 60s;
    proxy_connect_timeout 10s;
  }

  # resto, nega
  location / {
    return 404;
  }
}

# 6- Reiniciar o NGINX

sudo nginx -t
sudo systemctl reload nginx