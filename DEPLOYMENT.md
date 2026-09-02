# Deployment

This app is deployed as:

- a static Angular web app under `/test`
- a Nest API behind Nginx
- a SQLite database stored on disk

This document describes the intended production setup on an Ubuntu server such as Linode.

## Target URLs

- App: `https://example.com`
- API: `https://example.com/api`
 
## Server Layout

Recommended paths:

- Web files: `/var/www/html/yourDomain.com/test`
- API files: `/srv/your-api`
- SQLite data: `/srv/your-api/data/notes.sqlite`

## Prerequisites

Install required software on the server:

```bash
sudo apt update
sudo apt install -y nginx
sudo npm install -g pm2 
```

Update Node.js to a current version:

```bash
sudo apt update
sudo apt upgrade -y nodejs npm
```

If Node is still too old after that, update it directly:

```bash
sudo npm install -g n
sudo n latest
```

Verify:

```bash
node -v
npm -v
pm2 -v
```

Use a modern Node version. Node 20 or newer is recommended.

## Build Locally

Build both frontend and backend on your local machine:

```bash
npm install
npm run build:web:prod
npm run build:api:prod
```

Outputs:

- Web build: `dist/web/browser` or `dist/web`
- API build: `dist/api`

## Upload Files

Upload the frontend build contents into:

- `/var/www/html/example.com/test`

Upload the backend build contents of `dist/api` into:

- `/srv/example-test-api`

The backend folder should end up containing the generated runtime files, including its generated `package.json`.

If you already have data you want to preserve, keep or upload:

- `/srv/example-test-api/data`

## Install API Runtime Dependencies

On the server:

```bash
cd /srv/example-test-api
npm install --omit=dev
mkdir -p data
```

## Start the API

From `/srv/example-test-api`, run:

```bash
pm2 start main.js --name example-test-api
pm2 save
```

If the generated API entry file is not `main.js`, use the actual built entry file.

To configure PM2 startup on reboot:

```bash
pm2 startup
```

Run the command PM2 prints, then:

```bash
pm2 save
```

## Nginx Configuration

Configure Nginx to:

- serve the Angular app from `/test`
- proxy `/test/api` to the local Nest API
- use SPA fallback for Angular routes

Example server block:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location = /test {
        return 301 /test/;
    }

    location /test/api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /test/ {
        alias /var/www/html/example.com/test/;
        try_files $uri $uri/ /test/index.html;
    }
}
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS

If Certbot is not installed:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Issue the certificate:

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

## Verification

Verify the API locally on the server:

```bash
curl http://127.0.0.1:3000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}'
```

Verify the site:

- `https://example.com/test`
- `https://example.com/test/notes`

Verify deep links:

- folder route: `https://example.com/test/notes/folder/subfolder`
- document route: `https://example.com/test/notes/folder/subfolder/docname`

## Updating

For a new deployment:

1. Build locally:

```bash
npm run build:web:prod
npm run build:api:prod
```

2. Upload the new web build contents to:

- `/var/www/html/example.com/test`

3. Upload the new API build contents to:

- `/srv/example-test-api`

4. Reinstall API runtime dependencies if needed:

```bash
cd /srv/example-test-api
npm install --omit=dev
```

5. Restart the API:

```bash
pm2 restart example-test-api
```

6. Reload Nginx if the web files or config changed:

```bash
sudo systemctl reload nginx
```

## Notes

- The frontend production build uses `/test/` as its base path.
- The frontend production API base URL is `/test/api`.
- The API uses SQLite, so the `data` directory must be writable.
- The app uses path-based Angular routes under `/test/notes/...`.
