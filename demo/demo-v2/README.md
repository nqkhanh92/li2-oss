# SpeedNet Demo - Docker Deployment

This is the SpeedNet internet package demo application configured to run with Docker and Traefik reverse proxy.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Domain `demo.li2.ai` pointing to your server's IP address

### Deployment Steps

1. **Clone or navigate to the project directory:**
   ```bash
   cd e:\Workspace\Git\quik_proximity_marketing\demo\demo-v2
   ```

2. **Start the services:**
   ```bash
   docker-compose up -d
   ```

3. **Check the status:**
   ```bash
   docker-compose ps
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f speednet-demo
   ```

5. **Access the application:**
   - Production: https://demo.li2.ai
   - Traefik Dashboard: http://your-server-ip:8080

## 🔧 Configuration

### Traefik Configuration
- **HTTP Port:** 80 (redirects to HTTPS)
- **HTTPS Port:** 443 (with Let's Encrypt SSL)
- **Dashboard Port:** 8080

### Application Configuration
- **Internal Port:** 5000
- **Domain:** demo.li2.ai
- **SSL:** Automatic via Let's Encrypt

### Cache Control
JavaScript files are configured with no-cache headers to ensure users always get the latest version:
- `Cache-Control: no-cache, no-store, must-revalidate`
- `Pragma: no-cache`
- `Expires: 0`

## 📝 Management Commands

### Stop services:
```bash
docker-compose down
```

### Restart services:
```bash
docker-compose restart
```

### Rebuild and restart:
```bash
docker-compose up -d --build
```

### View logs:
```bash
docker-compose logs -f
```

### Remove everything (including volumes):
```bash
docker-compose down -v
```

## 🔒 Security Features

- Automatic HTTPS with Let's Encrypt
- HTTP to HTTPS redirect
- Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- No-cache headers for JavaScript files

## 📊 Li2 Analytics Integration

The demo includes Li2 Analytics SDK for tracking:
- **Page Views:** Automatic tracking on all pages
- **Click Events:** Automatic tracking of user interactions
- **Lead Tracking:** When users configure custom packages
- **Sale Tracking:** When users complete checkout

### Current Configuration:
- **Publishable Key:** `li2_pk_001fedec_2a645270ffc9e77bbed7d28cfe2d8a77`
- **API URL:** `https://example.com`
- **Debug Mode:** Enabled

## 🏗️ Architecture

```
Internet
    ↓
Traefik (Port 80/443)
    ↓
SpeedNet Demo Container (Port 5000)
    ↓
Serve (Static File Server)
```

## 📁 Project Structure

```
demo-v2/
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile              # Application container definition
├── serve.json              # Serve configuration (clean URLs, cache control)
├── package.json            # Node.js dependencies
├── index.html              # Landing page
├── custom-package.html     # Custom package configuration
├── checkout.html           # Checkout page
├── thankyou.html          # Order confirmation
└── js/
    ├── li2-analytics.js   # Li2 Analytics SDK
    ├── index.js           # Landing page logic
    ├── custom-package.js  # Custom package logic
    ├── checkout.js        # Checkout logic
    └── thankyou.js        # Thank you page logic
```

## 🐛 Troubleshooting

### SSL Certificate Issues
If Let's Encrypt fails to issue certificates:
1. Ensure port 80 and 443 are open
2. Verify DNS is pointing to your server
3. Check Traefik logs: `docker-compose logs traefik`

### Application Not Accessible
1. Check if containers are running: `docker-compose ps`
2. Check application logs: `docker-compose logs speednet-demo`
3. Verify DNS resolution: `nslookup demo.li2.ai`

### Cache Issues
If JavaScript changes aren't reflected:
1. Hard refresh browser (Ctrl+Shift+R)
2. Check serve.json configuration
3. Verify cache headers in browser DevTools

## 📞 Support

For issues or questions, contact the development team.
