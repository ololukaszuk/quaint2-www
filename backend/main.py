#!/usr/bin/env python3
"""
Binance Real-Time GUI - Static File Server
Simple server that serves the frontend. All WebSocket connections go directly to Binance.
"""

import os
import logging
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Binance Real-Time GUI",
    description="Static file server for Binance real-time data visualization",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supported intervals
VALID_INTERVALS = ['1s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d']

# Popular trading pairs
POPULAR_SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT",
    "DOGEUSDT", "SOLUSDT", "DOTUSDT", "MATICUSDT", "LTCUSDT",
    "AVAXUSDT", "LINKUSDT", "ATOMUSDT", "UNIUSDT", "APTUSDT"
]


@app.get("/api/config")
async def get_config():
    """Return configuration for the frontend."""
    return {
        "binance_ws_base": "wss://stream.binance.com:9443",
        "binance_rest_base": "https://api.binance.com/api/v3",
        "supported_intervals": VALID_INTERVALS,
        "popular_symbols": POPULAR_SYMBOLS,
        "default_symbol": os.environ.get("BINANCE_SYMBOL", "BTCUSDT"),
        "default_interval": "1m",
        "default_rate": 10,
        "max_candles": 500,
        "max_trades": 100,
        "max_orderbook_levels": 20
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "mode": "direct-connection"
    }


# Serve static files
@app.get("/")
async def serve_index():
    """Serve the frontend application."""
    return FileResponse("static/index.html")


# Mount static assets
try:
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")
except Exception as e:
    logger.warning(f"Could not mount assets directory: {e}")


@app.get("/{path:path}")
async def serve_static(path: str):
    """Serve static files or fallback to index.html for SPA routing."""
    static_file = f"static/{path}"
    if os.path.isfile(static_file):
        return FileResponse(static_file)
    return FileResponse("static/index.html")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("API_PORT", 8753))
    logger.info(f"🚀 Starting Binance Real-Time GUI server on port {port}")
    logger.info(f"📡 Frontend connects directly to Binance WebSocket")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
