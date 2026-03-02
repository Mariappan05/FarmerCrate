"""
FarmerCrate - CatBoost Recommendation Flask Server
Wraps the WeatherIntegratedAgricultureSystem as a REST API
Runs on port 5001 by default
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import traceback

# Ensure this script's directory is in path so catboost_algorithm can be imported
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
os.chdir(BASE_DIR)  # Set working dir so relative file paths resolve correctly

from catboost_algorithm import WeatherIntegratedAgricultureSystem

app = Flask(__name__)
CORS(app)

# --------------------------------------------------------------------------- #
# Global model instance (loaded once at startup)
# --------------------------------------------------------------------------- #
system = None
is_ready = False
init_error = None


def initialize_model():
    """Load data and train the CatBoost model once at server start."""
    global system, is_ready, init_error
    try:
        print("[INIT] Creating WeatherIntegratedAgricultureSystem...")
        system = WeatherIntegratedAgricultureSystem(
            iterations=1000, learning_rate=0.1, depth=6
        )

        products_csv = os.path.join(BASE_DIR, "agriculture_products_dataset.csv")
        production_xls = os.path.join(BASE_DIR, "rice.xls")

        print("[INIT] Loading agriculture products data...")
        system.load_agriculture_products_data(products_csv)

        print("[INIT] Loading production data...")
        system.load_production_data(production_xls)

        print("[INIT] Fetching weather data and engineering features...")
        data = system.prepare_training_data_with_weather()

        print("[INIT] Training CatBoost model...")
        system.train_model(data)

        is_ready = True
        print("[INIT] Model ready!")
    except Exception as e:
        init_error = str(e)
        print(f"[INIT ERROR] {e}")
        traceback.print_exc()


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok" if is_ready else "initializing",
        "ready": is_ready,
        "error": init_error
    }), 200 if is_ready else 503


@app.route("/districts", methods=["GET"])
def get_districts():
    """Return all available Tamil Nadu districts."""
    if not is_ready:
        return jsonify({"success": False, "message": "Model not ready yet"}), 503

    districts = list(system.district_coordinates.keys())
    return jsonify({
        "success": True,
        "districts": sorted(districts),
        "count": len(districts)
    })


@app.route("/recommend", methods=["POST"])
def recommend():
    """
    POST /recommend
    Body: { "district": "Thanjavur", "category": "Crop" }  (category optional)
    Returns structured recommendations for the given district.
    """
    if not is_ready:
        return jsonify({"success": False, "message": "Model not ready yet"}), 503

    body = request.get_json(force=True, silent=True) or {}
    district = body.get("district", "").strip()
    category_filter = body.get("category", None)

    if not district:
        return jsonify({"success": False, "message": "district is required"}), 400

    if district not in system.district_coordinates:
        return jsonify({
            "success": False,
            "message": f"Unknown district '{district}'. Use GET /districts for valid options."
        }), 404

    try:
        soil_type = system._infer_soil_type(district)

        # Get district production stats
        district_prod = system.raw_data[system.raw_data["District"] == district]
        rice_production = (
            float(district_prod["Production_Tonnes"].values[0])
            if len(district_prod) > 0 else 0
        )
        avg_production = float(system.raw_data["Production_Tonnes"].mean())
        production_ratio = rice_production / avg_production if avg_production > 0 else 1.0

        # Fetch weather
        weather = system.fetch_weather_data(district, years=5)

        # Evaluate products
        MIN_SOIL_MATCH = 0.7
        MIN_TEMP_MATCH = 0.7
        MIN_WEATHER_MATCH = 0.6

        recommended = []
        rejected = []

        for product in system.available_products:
            if product not in system.product_conditions_matrix:
                continue
            info = system.product_conditions_matrix[product]
            if category_filter and info["category"] != category_filter:
                continue

            env_suit = system._calculate_env_suitability(product, soil_type)
            temp_suit = system._calculate_temp_suitability(product, weather["Avg_Temp"])
            soil_temp_suit = system._calculate_soil_temp_suitability(product, weather["Soil_Temperature"])
            weather_score = system._calculate_weather_suitability(product, weather)

            soil_pass = env_suit >= MIN_SOIL_MATCH
            temp_pass = temp_suit >= MIN_TEMP_MATCH
            weather_pass = weather_score >= MIN_WEATHER_MATCH

            if not (soil_pass and temp_pass and weather_pass):
                reasons = []
                if not soil_pass:
                    reasons.append(f"Soil mismatch (score: {env_suit:.2f})")
                if not temp_pass:
                    reasons.append(f"Temperature unsuitable (score: {temp_suit:.2f})")
                if not weather_pass:
                    reasons.append(f"Weather unsuitable (score: {weather_score:.2f})")
                rejected.append({
                    "product": product,
                    "category": info["category"],
                    "env_suitability": round(env_suit, 3),
                    "temp_suitability": round(temp_suit, 3),
                    "weather_score": round(weather_score, 3),
                    "rejection_reasons": reasons
                })
                continue

            # Market status
            if production_ratio > 1.3:
                market_status, market_opportunity = "Oversupplied", 0.7
            elif production_ratio > 1.0:
                market_status, market_opportunity = "High Supply", 0.85
            elif production_ratio < 0.7:
                market_status, market_opportunity = "High Demand", 1.3
            else:
                market_status, market_opportunity = "Balanced", 1.0

            overall = ((env_suit + temp_suit + soil_temp_suit + weather_score) / 4) * market_opportunity
            base_price = 2500
            estimated_price = (
                base_price * (avg_production / rice_production)
                if rice_production > 0 else base_price
            )

            grade = (
                "Excellent" if overall >= 0.9
                else "Good" if overall >= 0.7
                else "Fair"
            )

            recommended.append({
                "product": product,
                "category": info["category"],
                "overall_score": round(overall, 4),
                "grade": grade,
                "env_suitability": round(env_suit, 3),
                "temp_suitability": round(temp_suit, 3),
                "soil_temp_suitability": round(soil_temp_suit, 3),
                "weather_score": round(weather_score, 3),
                "market_status": market_status,
                "estimated_price_per_quintal": round(estimated_price, 2)
            })

        recommended.sort(key=lambda x: x["overall_score"], reverse=True)

        return jsonify({
            "success": True,
            "district": district,
            "soil_type": soil_type,
            "production": {
                "rice_tonnes": round(rice_production, 2),
                "avg_tonnes": round(avg_production, 2),
                "production_ratio": round(production_ratio, 3)
            },
            "weather": {
                "avg_temp_max": round(weather["Avg_Temp_Max"], 1),
                "avg_temp_min": round(weather["Avg_Temp_Min"], 1),
                "avg_temp": round(weather["Avg_Temp"], 1),
                "soil_temperature": round(weather["Soil_Temperature"], 1),
                "total_rainfall_mm": round(weather["Total_Rainfall"], 1),
                "avg_daily_rainfall_mm": round(weather["Avg_Rainfall"], 2),
                "rainy_days": weather["Rainfall_Days"]
            },
            "recommended_products": recommended,
            "rejected_products": rejected,
            "summary": {
                "total_recommended": len(recommended),
                "total_rejected": len(rejected)
            }
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/all-recommendations", methods=["GET"])
def all_recommendations():
    """
    GET /all-recommendations?category=Crop
    Returns top recommended product for every district (lightweight overview).
    """
    if not is_ready:
        return jsonify({"success": False, "message": "Model not ready yet"}), 503

    category_filter = request.args.get("category", None)
    results = []

    for district in system.raw_data["District"].unique():
        soil_type = system._infer_soil_type(district)
        weather = system.fetch_weather_data(district, years=5)

        best = None
        best_score = -1

        for product in system.available_products:
            if product not in system.product_conditions_matrix:
                continue
            info = system.product_conditions_matrix[product]
            if category_filter and info["category"] != category_filter:
                continue

            env_suit = system._calculate_env_suitability(product, soil_type)
            temp_suit = system._calculate_temp_suitability(product, weather["Avg_Temp"])
            soil_temp_suit = system._calculate_soil_temp_suitability(product, weather["Soil_Temperature"])
            weather_score = system._calculate_weather_suitability(product, weather)

            if env_suit >= 0.7 and temp_suit >= 0.7 and weather_score >= 0.6:
                score = (env_suit + temp_suit + soil_temp_suit + weather_score) / 4
                if score > best_score:
                    best_score = score
                    best = {
                        "product": product,
                        "category": info["category"],
                        "score": round(score, 4)
                    }

        results.append({
            "district": district,
            "soil_type": soil_type,
            "top_recommendation": best
        })

    return jsonify({
        "success": True,
        "count": len(results),
        "data": results
    })


# --------------------------------------------------------------------------- #
# Initialize model on startup (works for both direct run and gunicorn)
# --------------------------------------------------------------------------- #
initialize_model()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", os.environ.get("ML_PORT", 5001)))
    print(f"[SERVER] Starting FarmerCrate ML Server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
