# Binance Real-Time GUI

A production-ready web application for real-time cryptocurrency data visualization from Binance. Features live candlestick charts, order book visualization, trade streaming, and comprehensive market metrics.

**⚡ Direct Connection Architecture** - The frontend connects directly to Binance WebSocket streams for minimal latency. The backend only serves static files.

## Features

### Real-Time Data Display
- **Live Ticker**: Current bid/ask prices, spread, and last price with color-coded changes
- **OHLCV Data**: Open, High, Low, Close prices with visual indicators
- **Buy/Sell Pressure**: Taker buy percentage with emoji indicators (👆, ⚖️, 👇)
- **Liquidity Metrics**: Spread percentage with quality badges (Excellent/Good/Poor)
- **Trade Statistics**: Total trades and volume (BTC and USDT)

### Interactive Charts
- **Candlestick Chart**: Professional TradingView Lightweight Charts
- **Multiple Timeframes**: 1m, 5m, 15m, 1h, 4h, 1d intervals
- **Volume Overlay**: Color-coded buy/sell volume bars
- **Zoom & Pan**: Full chart interaction support
- **Crosshair**: Hover to see exact values

### Order Book Visualization
- **Depth Display**: Configurable levels (5, 10, 15, 20)
- **Visual Bars**: Quantity represented as horizontal bars
- **Imbalance Indicator**: Buy/sell pressure with percentage
- **Spread Display**: Current market spread

### Live Trades Panel
- **Scrolling Feed**: Real-time trade updates
- **Buy/Sell Ratio**: Visual bar showing market direction
- **Trade Details**: Price, quantity, time for each trade

### Controls & Configuration
- **Symbol Selector**: Switch between trading pairs
- **Timeframe Buttons**: Quick interval switching
- **Display Toggles**: Show/hide order book and trades
- **Connection Status**: Visual WebSocket status indicator

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd binance-gui

# Start the application
docker-compose up -d

# Access at http://localhost:8753
```

### Manual Setup

**Backend (static file server):**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend Development:**
```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Frontend)                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Vue 3 Application                   │    │
│  │  - TradingView Charts                               │    │
│  │  - Pinia State Management                           │    │
│  │  - Direct Binance WebSocket Connection              │    │
│  └─────────────────────┬───────────────────────────────┘    │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
   ┌─────────────┐            ┌──────────────────┐
   │ Static File │            │ Binance WebSocket │
   │   Server    │            │   (Direct)        │
   │  (FastAPI)  │            │                   │
   │ Port: 8753  │            │ wss://stream.     │
   └─────────────┘            │ binance.com:9443  │
                              └──────────────────┘
                                      │
                              ┌───────┴───────┐
                              │ Binance REST  │
                              │ (Historical)  │
                              │ api.binance.  │
                              │ com/api/v3    │
                              └───────────────┘

Data Streams:
- @kline_{interval} - Candlestick updates
- @aggTrade - Individual trades
- @bookTicker - Best bid/ask
- @depth@100ms - Order book updates
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | 8753 | Server port |
| `BINANCE_SYMBOL` | BTCUSDT | Default trading pair |

### Docker Compose

```bash
# Custom port
API_PORT=9000 docker-compose up -d

# Custom default symbol
BINANCE_SYMBOL=ETHUSDT docker-compose up -d
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serve frontend application |
| `/api/config` | GET | Get Binance endpoints and supported options |
| `/api/health` | GET | Health check |

## Tech Stack

### Backend (Minimal)
- **FastAPI** - Static file server only
- **uvicorn** - ASGI server

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **Pinia** - State management
- **TradingView Lightweight Charts** - Professional charting
- **Tailwind CSS** - Utility-first CSS
- **Vite** - Build tool

### Direct Binance Connection
- REST API for historical data
- WebSocket for real-time streams
- No server-side proxy needed

## Performance Benefits

With direct Binance connection:
- **Zero server latency** - Data goes directly to browser
- **Reduced server load** - Backend only serves static files
- **Scalable** - No connection multiplexing needed
- **Simpler architecture** - Fewer failure points

## Browser Requirements

- Modern browser with WebSocket support
- Network access to Binance APIs:
  - `wss://stream.binance.com:9443`
  - `https://api.binance.com`

## Troubleshooting

### Connection Issues

1. Check browser console for WebSocket errors
2. Verify you can reach Binance (not blocked by firewall/VPN)
3. Try a different browser

### Chart Not Updating

1. Check connection status indicator (should be green)
2. Check browser console for errors
3. Try changing symbol or interval

### Docker Issues

```bash
# View logs
docker-compose logs -f

# Rebuild
docker-compose build --no-cache

# Clean restart
docker-compose down && docker-compose up -d
```

## License

MIT License

## Acknowledgments

- [Binance API](https://binance-docs.github.io/apidocs/) for market data
- [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/) for charting
- [Vue.js](https://vuejs.org/) for the frontend framework
