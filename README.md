# BTC Market Analyzer

A real-time Bitcoin market analysis dashboard that combines live Binance data with ML-powered trading signals.

## Features

- **Real-time Market Data**: Live price, orderbook, and trades from Binance WebSocket
- **ML-Powered Analysis**: Integration with custom ML API for market signals
- **Smart Money Concepts**: SMC-based analysis including order blocks, FVGs, and liquidity zones
- **AI Predictions**: LLM-generated market predictions with accuracy tracking
- **Multi-Timeframe Analysis**: Trends, momentum, and pivots across timeframes
- **Push Notifications**: Browser notifications for signal changes and high volatility
- **Mobile-Friendly**: Fully responsive design optimized for mobile devices

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser       │────▶│   Backend       │────▶│   ML API        │
│   (Vue.js)      │     │   (FastAPI)     │     │   (External)    │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         │ WebSocket (Direct)
         ▼
┌─────────────────┐
│   Binance API   │
└─────────────────┘
```

- **Frontend**: Vue 3 + Pinia + Tailwind CSS + Lightweight Charts
- **Backend**: FastAPI (Python) - serves frontend and proxies ML API
- **Data Sources**:
  - Binance WebSocket (direct from browser) - real-time market data
  - ML Data API (via backend proxy) - analysis and signals

## Quick Start

### Prerequisites

- Docker & Docker Compose
- ML API access (API key required)

### Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure your environment:
   ```env
   # Required
   ML_API_KEY=your_api_key_here
   
   # Optional (with defaults)
   ML_API_URL=https://192.168.100.14:8448
   API_PORT=8753
   ```

### Run with Docker

```bash
docker-compose up -d
```

Access at: `http://localhost:8753`

### Development

1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Run backend:
   ```bash
   cd backend
   python main.py
   ```

4. Run frontend (separate terminal):
   ```bash
   cd frontend
   npm run dev
   ```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | 8753 | Server port |
| `ML_API_URL` | https://192.168.100.14:8448 | ML Data API base URL |
| `ML_API_KEY` | - | API key for ML API authentication |
| `ML_API_VERIFY_SSL` | false | SSL verification for ML API |
| `MARKET_ANALYSIS_POLL_INTERVAL` | 30000 | Market analysis poll interval (ms) |
| `LLM_ANALYSIS_POLL_INTERVAL` | 60000 | LLM analysis poll interval (ms) |
| `MARKET_SIGNALS_POLL_INTERVAL` | 15000 | Market signals poll interval (ms) |
| `VOLATILITY_ALERT_THRESHOLD` | 0.5 | Price change % to trigger volatility alert |
| `DEFAULT_CHART_INTERVAL` | 1m | Default candlestick interval |

## Notifications

The app supports browser notifications for:

1. **Signal Changes**: Alerts when trading signal changes (e.g., HOLD → WEAK_BUY)
2. **High Volatility**: Alerts when price moves rapidly (configurable threshold)

To enable notifications:
1. Click the notification bell icon
2. Allow browser notifications when prompted
3. Toggle individual notification types as needed

Note: Notifications work best when the browser tab is in the background.

## API Endpoints

### Backend Endpoints

- `GET /api/config` - Frontend configuration
- `GET /api/health` - Health check
- `GET /api/ml/market-analysis` - Proxy to ML API market analysis
- `GET /api/ml/market-signals` - Proxy to ML API market signals
- `GET /api/ml/llm-analysis` - Proxy to ML API LLM analysis

### Direct Binance Connection

The frontend connects directly to Binance WebSocket for real-time data:
- Price updates
- Order book
- Recent trades
- Candlestick data

## Mobile Support

The app is fully responsive with:
- Tab-based navigation on mobile
- Touch-friendly chart interactions
- Optimized order book display
- Compact signal cards

## Security Notes

- ML API key is kept server-side only (never exposed to browser)
- Binance public API is called directly from browser (no auth required)
- SSL verification can be disabled for self-signed certificates

## Deployment

### Behind Reverse Proxy (e.g., Nginx)

```nginx
server {
    listen 443 ssl;
    server_name quaint2.example.com;

    location / {
        proxy_pass http://localhost:8753;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## License

MIT
