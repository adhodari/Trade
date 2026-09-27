#!/usr/bin/env python3
"""
NEPSE Data API Server for NEPSE Invest
Provides REST endpoints for live market data from Nepal Stock Exchange.
Uses NepseUnofficialApi to fetch data from nepalstock.com
"""

import os
import json
from flask import Flask, jsonify, request
from nepse import Nepse

app = Flask(__name__)
app.config["PROPAGATE_EXCEPTIONS"] = True

# Initialize Nepse client
nepse = Nepse()
nepse.setTLSVerification(False)  # Required until NEPSE fixes SSL cert chain

# Sector mapping from NEPSE sector names to our internal sector names
SECTOR_MAPPER = {
    "Commercial Banks": "Commercial Bank",
    "Development Banks": "Development Bank",
    "Finance": "Finance",
    "Hotels And Tourism": "Hotels & Tourism",
    "Hydro Power": "Hydropower",
    "Investment": "Investment",
    "Life Insurance": "Life Insurance",
    "Manufacturing And Processing": "Manufacturing",
    "Microfinance": "Microfinance",
    "Mutual Fund": "Mutual Fund",
    "Non Life Insurance": "Non Life Insurance",
    "Others": "Others",
    "Tradings": "Others",
}


def map_sector(nepse_sector: str) -> str:
    """Map NEPSE sector name to our internal sector name."""
    return SECTOR_MAPPER.get(nepse_sector, "Others")


@app.route("/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "service": "nepse-api"})


@app.route("/api/live-market")
def get_live_market():
    """Get live market data for all traded scrips."""
    try:
        data = nepse.getLiveMarket()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/price-volume")
def get_price_volume():
    """Get price and volume data."""
    try:
        data = nepse.getPriceVolume()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/summary")
def get_summary():
    """Get market summary."""
    try:
        data = nepse.getSummary()
        response = {}
        for obj in data:
            response[obj["detail"]] = obj["value"]
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/company-list")
def get_company_list():
    """Get list of all companies with basic info."""
    try:
        data = nepse.getCompanyList()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/security-list")
def get_security_list():
    """Get list of all securities (includes more details)."""
    try:
        data = nepse.getSecurityList()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/nepse-index")
def get_nepse_index():
    """Get NEPSE index data."""
    try:
        data = nepse.getNepseIndex()
        response = {}
        for obj in data:
            response[obj["index"]] = obj
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/nepse-sub-indices")
def get_nepse_sub_indices():
    """Get NEPSE sub-indices."""
    try:
        data = nepse.getNepseSubIndices()
        response = {}
        for obj in data:
            response[obj["index"]] = obj
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/top-gainers")
def get_top_gainers():
    """Get top gaining stocks."""
    try:
        data = nepse.getTopGainers()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/top-losers")
def get_top_losers():
    """Get top losing stocks."""
    try:
        data = nepse.getTopLosers()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/market-depth/<symbol>")
def get_market_depth(symbol):
    """Get market depth for a specific symbol."""
    try:
        data = nepse.getSymbolMarketDepth(symbol.upper())
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/daily-price-graph/<symbol>")
def get_daily_price_graph(symbol):
    """Get daily price graph (historical data) for a symbol."""
    try:
        data = nepse.getDailyScripPriceGraph(symbol.upper())
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/floorsheet")
def get_floorsheet():
    """Get floorsheet data (all trades for the day)."""
    try:
        data = nepse.getFloorSheet()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/floorsheet/<symbol>")
def get_floorsheet_of(symbol):
    """Get floorsheet data for a specific symbol."""
    try:
        data = nepse.getFloorSheetOf(symbol.upper())
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/supply-demand")
def get_supply_demand():
    """Get market supply/demand data."""
    try:
        data = nepse.getSupplyDemand()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/trade-turnover-transaction-subindices")
def get_trade_turnover_transaction_subindices():
    """
    Combined endpoint with sector and scrip details.
    This is the most comprehensive endpoint for our use case.
    """
    try:
        companies = {company["symbol"]: company for company in nepse.getCompanyList()}
        turnover = {obj["symbol"]: obj for obj in nepse.getTopTenTurnoverScrips()}
        transaction = {obj["symbol"]: obj for obj in nepse.getTopTenTransactionScrips()}
        trade = {obj["symbol"]: obj for obj in nepse.getTopTenTradeScrips()}
        gainers = {obj["symbol"]: obj for obj in nepse.getTopGainers()}
        losers = {obj["symbol"]: obj for obj in nepse.getTopLosers()}
        price_vol_info = {obj["symbol"]: obj for obj in nepse.getPriceVolume()}

        sector_sub_indices = {}
        for obj in nepse.getNepseSubIndices():
            sector_sub_indices[obj["index"]] = obj

        scrips_details = {}
        for symbol, company in companies.items():
            company_details = {}
            company_details["symbol"] = symbol
            company_details["sectorName"] = map_sector(company["sectorName"])
            company_details["totalTurnover"] = (
                turnover[symbol]["turnover"] if symbol in turnover.keys() else 0
            )
            company_details["totalTrades"] = (
                transaction[symbol]["totalTrades"] if symbol in transaction.keys() else 0
            )
            company_details["totalTradeQuantity"] = (
                trade[symbol]["shareTraded"] if symbol in trade.keys() else 0
            )

            if symbol in gainers.keys():
                (
                    company_details["pointChange"],
                    company_details["percentageChange"],
                    company_details["ltp"],
                ) = (
                    gainers[symbol]["pointChange"],
                    gainers[symbol]["percentageChange"],
                    gainers[symbol]["ltp"],
                )
            elif symbol in losers.keys():
                (
                    company_details["pointChange"],
                    company_details["percentageChange"],
                    company_details["ltp"],
                ) = (
                    losers[symbol]["pointChange"],
                    losers[symbol]["percentageChange"],
                    losers[symbol]["ltp"],
                )
            else:
                # Get from price volume if not in gainers/losers
                if symbol in price_vol_info:
                    company_details["ltp"] = price_vol_info[symbol].get("ltp", 0)
                    company_details["pointChange"] = price_vol_info[symbol].get("pointChange", 0)
                    company_details["percentageChange"] = price_vol_info[symbol].get("percentageChange", 0)
                else:
                    company_details["pointChange"] = 0
                    company_details["percentageChange"] = 0
                    company_details["ltp"] = 0

            scrips_details[symbol] = company_details

        sector_details = {}
        sectors = {company["sectorName"] for company in companies.values()}
        for sector in sectors:
            total_trades, total_trade_quantity, total_turnover = 0, 0, 0
            for scrip_details in scrips_details.values():
                if scrip_details["sectorName"] == sector:
                    total_trades += scrip_details["totalTrades"]
                    total_trade_quantity += scrip_details["totalTradeQuantity"]
                    total_turnover += scrip_details["totalTurnover"]

            # Map sector to sub-index
            sector_mapped = map_sector(sector)
            sub_index_key = None
            for k, v in sector_sub_indices.items():
                if sector_mapped.lower() in k.lower() or k.lower() in sector_mapped.lower():
                    sub_index_key = k
                    break

            sector_details[sector] = {
                "totalTrades": total_trades,
                "totalTradeQuantity": total_trade_quantity,
                "totalTurnover": total_turnover,
                "index": sector_sub_indices.get(sub_index_key, {}),
                "sectorName": sector,
            }

        return jsonify({"scripsDetails": scrips_details, "sectorsDetails": sector_details})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/company-fundamentals/<symbol>")
def get_company_fundamentals(symbol):
    """
    Get company fundamentals - combines live data with static fundamentals.
    Note: Fundamental data (ROE, EPS, etc.) is not available from live trading API.
    This endpoint merges live price data with our static fundamental data.
    """
    try:
        # Get live market data
        live_market = {obj["symbol"]: obj for obj in nepse.getLiveMarket()}
        price_volume = {obj["symbol"]: obj for obj in nepse.getPriceVolume()}

        symbol_upper = symbol.upper()
        live_data = live_market.get(symbol_upper, {})
        pv_data = price_volume.get(symbol_upper, {})

        return jsonify({
            "symbol": symbol_upper,
            "ltp": live_data.get("ltp") or pv_data.get("ltp"),
            "pointChange": live_data.get("pointChange") or pv_data.get("pointChange"),
            "percentageChange": live_data.get("percentageChange") or pv_data.get("percentageChange"),
            "open": live_data.get("open"),
            "high": live_data.get("high"),
            "low": live_data.get("low"),
            "volume": live_data.get("qty"),
            "prevClose": live_data.get("pClose"),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(debug=False, host="0.0.0.0", port=port)