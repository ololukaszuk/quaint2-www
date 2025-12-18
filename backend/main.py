#!/usr/bin/env python3
"""
BTC Market Analyzer - Backend Server
Serves frontend and proxies requests to ML Data API
"""

import os
import logging
import httpx
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration from environment
ML_API_URL = os.environ.get("ML_API_URL", "https://192.168.100.14:8448")
ML_API_KEY = os.environ.get("ML_API_KEY", "")
ML_API_VERIFY_SSL = os.environ.get("ML_API_VERIFY_SSL", "false").lower() == "true"

app = FastAPI(
    title="QuAInt²",
    description="Real-time market analysis with AI-powered signals",
    version="2.1.2"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supported intervals for Binance
VALID_INTERVALS = ['1s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d']

# HTTP client for ML API
def get_ml_client():
    """Create an HTTP client for ML API requests."""
    # Format the authorization header with "Bearer" prefix
    auth_header = {}
    if ML_API_KEY:
        auth_header["Authorization"] = f"Bearer {ML_API_KEY}"
    
    return httpx.AsyncClient(
        base_url=ML_API_URL,
        verify=ML_API_VERIFY_SSL,
        timeout=30.0,
        headers=auth_header
    )


@app.get("/api/config")
async def get_config():
    """Return configuration for the frontend."""
    return {
        "binance_ws_base": "wss://stream.binance.com:9443",
        "binance_rest_base": "https://api.binance.com/api/v3",
        "supported_intervals": VALID_INTERVALS,
        "symbol": "BTCUSDT",
        "default_interval": os.environ.get("DEFAULT_CHART_INTERVAL", "1m"),
        "max_candles": int(os.environ.get("MAX_CANDLES", "500")),
        "max_trades": int(os.environ.get("MAX_TRADES", "100")),
        "max_orderbook_levels": int(os.environ.get("MAX_ORDERBOOK_LEVELS", "20")),
        "ml_api_enabled": bool(ML_API_KEY),
        "poll_intervals": {
            "market_analysis": int(os.environ.get("MARKET_ANALYSIS_POLL_INTERVAL", "30000")),
            "llm_analysis": int(os.environ.get("LLM_ANALYSIS_POLL_INTERVAL", "60000")),
            "market_signals": int(os.environ.get("MARKET_SIGNALS_POLL_INTERVAL", "15000")),
        },
        "notifications": {
            "enabled": os.environ.get("ENABLE_BROWSER_NOTIFICATIONS", "true").lower() == "true",
            "sound_enabled": os.environ.get("ENABLE_SOUND_NOTIFICATIONS", "true").lower() == "true",
            "volatility_threshold": float(os.environ.get("VOLATILITY_ALERT_THRESHOLD", "0.5")),
        }
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    ml_api_status = "not_configured"
    
    if ML_API_KEY:
        try:
            async with get_ml_client() as client:
                response = await client.get("/health")
                if response.status_code == 200:
                    ml_api_status = "connected"
                else:
                    ml_api_status = "error"
        except Exception as e:
            logger.error(f"ML API health check failed: {e}")
            ml_api_status = "unreachable"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.1.2",
        "ml_api_status": ml_api_status
    }


# ============ ML API Proxy Endpoints ============

@app.get("/api/ml/market-analysis")
async def get_market_analysis(
    limit: int = Query(default=1, ge=1, le=100),
    signal_type: Optional[str] = Query(default=None)
):
    """Proxy endpoint for market analysis data."""
    if not ML_API_KEY:
        raise HTTPException(status_code=503, detail="ML API not configured")
    
    try:
        async with get_ml_client() as client:
            params = {"limit": limit}
            if signal_type:
                params["signal_type"] = signal_type
            
            response = await client.get("/market-analysis", params=params)
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid ML API key")
            
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"ML API error: {e}")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to fetch market analysis: {e}")
        raise HTTPException(status_code=503, detail="ML API unavailable")


@app.get("/api/ml/market-signals")
async def get_market_signals(limit: int = Query(default=20, ge=1, le=100)):
    """Proxy endpoint for market signals data (signal changes only)."""
    if not ML_API_KEY:
        raise HTTPException(status_code=503, detail="ML API not configured")
    
    try:
        async with get_ml_client() as client:
            response = await client.get("/market-signals", params={"limit": limit})
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid ML API key")
            
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"ML API error: {e}")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to fetch market signals: {e}")
        raise HTTPException(status_code=503, detail="ML API unavailable")


@app.get("/api/ml/llm-analysis")
async def get_llm_analysis(limit: int = Query(default=10, ge=1, le=100)):
    """Proxy endpoint for LLM analysis data."""
    if not ML_API_KEY:
        raise HTTPException(status_code=503, detail="ML API not configured")
    
    try:
        async with get_ml_client() as client:
            response = await client.get("/llm-analysis", params={"limit": limit})
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid ML API key")
            
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"ML API error: {e}")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to fetch LLM analysis: {e}")
        raise HTTPException(status_code=503, detail="ML API unavailable")


@app.get("/api/ml/candles")
async def get_ml_candles(
    limit: int = Query(default=100, ge=1, le=1000),
    start_time: Optional[str] = Query(default=None),
    end_time: Optional[str] = Query(default=None)
):
    """Proxy endpoint for historical candles from ML API."""
    if not ML_API_KEY:
        raise HTTPException(status_code=503, detail="ML API not configured")
    
    try:
        async with get_ml_client() as client:
            params = {"limit": limit}
            if start_time:
                params["start_time"] = start_time
            if end_time:
                params["end_time"] = end_time
            
            response = await client.get("/candles", params=params)
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid ML API key")
            
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"ML API error: {e}")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to fetch candles: {e}")
        raise HTTPException(status_code=503, detail="ML API unavailable")


@app.get("/api/ml/data-quality")
async def get_data_quality(
    limit: int = Query(default=50, ge=1, le=100),
    resolved: Optional[str] = Query(default=None)
):
    """Proxy endpoint for data quality logs."""
    if not ML_API_KEY:
        raise HTTPException(status_code=503, detail="ML API not configured")
    
    try:
        async with get_ml_client() as client:
            params = {"limit": limit}
            if resolved is not None:
                params["resolved"] = resolved
            
            response = await client.get("/data-quality-logs", params=params)
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid ML API key")
            
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"ML API error: {e}")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to fetch data quality logs: {e}")
        raise HTTPException(status_code=503, detail="ML API unavailable")


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
    logger.info(f"🚀 Starting BTC Market Analyzer on port {port}")
    logger.info(f"📡 ML API: {ML_API_URL}")
    logger.info(f"🔑 ML API Key configured: {bool(ML_API_KEY)}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
