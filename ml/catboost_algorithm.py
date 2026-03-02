import pandas as pd
import numpy as np
from catboost import CatBoostRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import requests
from datetime import datetime, timedelta
import time
import json
import os

class WeatherIntegratedAgricultureSystem:
    """
    Weather-Integrated Agriculture Products & Price Recommendation System
    Uses CatBoost Regressor (Gradient Boosting on Decision Trees) with:
    - Environmental suitability (soil/climate/water)
    - Production data
    - Historical weather data (5 years from Open-Meteo API)
    """
    
    def __init__(self, iterations=1000, learning_rate=0.1, depth=6, random_state=42):
        self.price_model = CatBoostRegressor(
            iterations=iterations,
            learning_rate=learning_rate,
            depth=depth,
            loss_function='RMSE',
            random_seed=random_state,
            verbose=False  # Suppress training output
        )
        self.product_conditions_matrix = None
        self.district_coordinates = self._load_district_coordinates()
        self.product_temp_requirements = None
        self.weather_cache = {}
        self.cache_file = 'weather_cache.json'
        self.categorical_features = []
        self._load_weather_cache()
        
    def load_agriculture_products_data(self, products_csv='agriculture_products_dataset.csv'):
        """Load all agriculture products with environmental conditions"""
        df = pd.read_csv(products_csv)
        
        product_conditions_dict = {}
        product_temp_dict = {}
        
        for _, row in df.iterrows():
            product = row['Product']
            conditions = row['Suitable_Conditions'].split('|')
            product_conditions_dict[product] = {
                'conditions': conditions,
                'category': row['Category']
            }
            product_temp_dict[product] = {
                'min': row['Temperature_Min'],
                'max': row['Temperature_Max'],
                'optimal': row['Temperature_Optimal']
            }
        
        self.product_conditions_matrix = product_conditions_dict
        self.product_temp_requirements = product_temp_dict
        
        print(f"✓ Loaded {len(product_conditions_dict)} products across {len(df['Category'].unique())} categories")
        return product_conditions_dict
        
    def _load_district_coordinates(self):
        """Tamil Nadu district coordinates"""
        return {
            'Chennai': (13.0827, 80.2707), 'Madurai': (9.9252, 78.1198),
            'Coimbatore': (11.0168, 76.9558), 'Tiruchirappalli': (10.7905, 78.7047),
            'Salem': (11.6643, 78.1460), 'Thanjavur': (10.7870, 79.1378),
            'Erode': (11.3410, 77.7172), 'Tirunelveli': (8.7139, 77.7567),
            'Vellore': (12.9165, 79.1325), 'Tiruppur': (11.1085, 77.3411),
            'Dindigul': (10.3673, 77.9803), 'Cuddalore': (11.7480, 79.7714),
            'Kanchipuram': (12.8342, 79.7036), 'Nagapattinam': (10.7672, 79.8449),
            'Villupuram': (11.9401, 79.4861), 'Karur': (10.9601, 78.0766),
            'Namakkal': (11.2189, 78.1677), 'Dharmapuri': (12.1211, 78.1582),
            'Krishnagiri': (12.5186, 78.2137), 'Sivaganga': (9.8433, 78.4809),
            'Virudhunagar': (9.5810, 77.9624), 'Ramanathapuram': (9.3639, 78.8377),
            'Theni': (10.0104, 77.4977), 'Pudukkottai': (10.3833, 78.8000),
            'Ariyalur': (11.1401, 79.0782), 'Perambalur': (11.2324, 78.8798),
            'Nilgiris': (11.4102, 76.6950), 'Kanniyakumari': (8.0883, 77.5385),
            'Thoothukudi': (8.7642, 78.1348), 'Tiruvarur': (10.7729, 79.6345),
            'Mayiladuthurai': (11.1028, 79.6517), 'Ranipet': (12.9222, 79.3333),
            'Tirupathur': (12.4961, 78.5731), 'Kallakurichi': (11.7401, 78.9597),
            'Chengalpattu': (12.6819, 79.9764), 'Tenkasi': (8.9597, 77.3152),
            'Tiruvannamalai': (12.2253, 79.0747)
        }
    
    def _load_weather_cache(self):
        """Load cached weather data from file"""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r') as f:
                    self.weather_cache = json.load(f)
                print(f"✓ Loaded weather cache with {len(self.weather_cache)} districts")
            except:
                self.weather_cache = {}
    
    def _save_weather_cache(self):
        """Save weather cache to file"""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(self.weather_cache, f)
        except:
            pass
    
    def fetch_weather_data(self, district, years=5):
        """Fetch historical weather data with caching and rate limiting"""
        cache_key = f"{district}_{years}y"
        if cache_key in self.weather_cache:
            return self.weather_cache[cache_key]
        
        lat, lon = self.district_coordinates.get(district, (11.0, 78.0))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365*years)
        
        url = f"https://archive-api.open-meteo.com/v1/archive"
        params = {
            'latitude': lat, 'longitude': lon,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'daily': 'temperature_2m_max,temperature_2m_min,precipitation_sum',
            'timezone': 'Asia/Kolkata'
        }
        
        try:
            time.sleep(1.5)
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            temps_max = data['daily']['temperature_2m_max']
            temps_min = data['daily']['temperature_2m_min']
            rainfall = data['daily']['precipitation_sum']
            
            weather_features = {
                'Avg_Temp_Max': np.mean(temps_max),
                'Avg_Temp_Min': np.mean(temps_min),
                'Avg_Temp': (np.mean(temps_max) + np.mean(temps_min)) / 2,
                'Soil_Temperature': (np.mean(temps_min) + np.mean(temps_max)) / 2 - 2,
                'Total_Rainfall': np.sum(rainfall),
                'Avg_Rainfall': np.mean(rainfall),
                'Rainfall_Days': sum(1 for r in rainfall if r > 0)
            }
            
            self.weather_cache[cache_key] = weather_features
            self._save_weather_cache()
            return weather_features
        
        except Exception as e:
            print(f"⚠ Weather API error for {district}: {e}")
            default_weather = {
                'Avg_Temp_Max': 32.0, 'Avg_Temp_Min': 22.0, 'Avg_Temp': 27.0,
                'Soil_Temperature': 25.0, 'Total_Rainfall': 900.0,
                'Avg_Rainfall': 2.5, 'Rainfall_Days': 80
            }
            self.weather_cache[cache_key] = default_weather
            return default_weather
    
    def load_production_data(self, production_file='rice.xls'):
        """Load production data and extract available products"""
        tables = pd.read_html(production_file)
        data = tables[0]
        data.columns = ['SNo', 'State', 'District', 'Production_Tonnes']
        data = data[data['SNo'] != 'S.No.'].copy()
        data['Production_Tonnes'] = pd.to_numeric(
            data['Production_Tonnes'].astype(str).str.replace(',', '').str.strip(),
            errors='coerce'
        )
        data = data.dropna(subset=['Production_Tonnes'])
        data['Product_Type'] = 'Rice'
        data['Category'] = 'Crop'
        
        self.available_products = list(data['Product_Type'].unique())
        print(f"✓ Available products from production data: {', '.join(self.available_products)}")
        
        self.raw_data = data
        return data
    
    def prepare_training_data_with_weather(self):
        """Engineer features including weather data"""
        data = self.raw_data.copy()
        
        print("\nFetching weather data for all districts (with caching & rate limiting)...")
        weather_data = []
        unique_districts = data['District'].unique()
        
        for idx, district in enumerate(unique_districts, 1):
            print(f"  [{idx}/{len(unique_districts)}] {district}...", end=' ')
            weather = self.fetch_weather_data(district, years=5)
            weather['District'] = district
            weather_data.append(weather)
            print("✓")
        
        weather_df = pd.DataFrame(weather_data)
        data = data.merge(weather_df, on='District', how='left')
        
        data['Soil_Type'] = data['District'].apply(self._infer_soil_type)
        
        avg_production = data['Production_Tonnes'].mean()
        data['State_Avg_Production'] = avg_production
        data['Production_Ratio'] = data['Production_Tonnes'] / avg_production
        
        data['Env_Suitability'] = data.apply(
            lambda row: self._calculate_env_suitability(row['Product_Type'], row['Soil_Type']), axis=1
        )
        data['Temp_Suitability'] = data.apply(
            lambda row: self._calculate_temp_suitability(row['Product_Type'], row['Avg_Temp']), axis=1
        )
        data['Soil_Temp_Suitability'] = data.apply(
            lambda row: self._calculate_soil_temp_suitability(row['Product_Type'], row['Soil_Temperature']), axis=1
        )
        
        data['Supply_Category'] = data.apply(
            lambda row: 'Low' if row['Production_Ratio'] < 0.7 else ('High' if row['Production_Ratio'] > 1.3 else 'Medium'),
            axis=1
        )
        
        base_price = 2000
        weather_factor = 1 + (data['Total_Rainfall'] - 900) / 9000
        temp_factor = data['Temp_Suitability'] * data['Soil_Temp_Suitability']
        data['Target_Price'] = base_price * (avg_production / data['Production_Tonnes']) * data['Env_Suitability'] * weather_factor * temp_factor
        
        self.trained_data = data
        return data
    
    def _infer_soil_type(self, district):
        """Map district to soil type"""
        soil_map = {
            'Thanjavur': 'Alluvial', 'Thiruvarur': 'Alluvial', 'Nagapattinam': 'Alluvial',
            'Mayiladuthurai': 'Alluvial', 'Tiruvarur': 'Alluvial',
            'Cuddalore': 'Red Soil', 'Villupuram': 'Red Soil', 'Tiruvannamalai': 'Red Soil',
            'Dharmapuri': 'Red Soil', 'Salem': 'Red Soil', 'Krishnagiri': 'Red Soil',
            'Madurai': 'Black Soil', 'Sivaganga': 'Black Soil', 'Virudhunagar': 'Black Soil',
            'Coimbatore': 'Red Loamy Soil', 'Erode': 'Red Loamy Soil', 'Namakkal': 'Red Loamy Soil',
            'Kanniyakumari': 'Sandy Loam', 'Thoothukudi': 'Sandy Loam',
            'Nilgiris': 'Laterite Soil', 'Theni': 'Laterite Soil', 'Dindigul': 'Laterite Soil'
        }
        return soil_map.get(district, 'Loamy')
    
    def _calculate_env_suitability(self, product, soil_type):
        """Calculate environmental suitability for product"""
        if product not in self.product_conditions_matrix:
            return 0.7
        conditions = self.product_conditions_matrix[product]['conditions']
        for condition in conditions:
            if condition.lower() in soil_type.lower() or soil_type.lower() in condition.lower():
                return 0.9
        return 0.4
    
    def _calculate_temp_suitability(self, product, avg_temp):
        """Calculate temperature suitability score for product"""
        if product not in self.product_temp_requirements:
            return 0.7
        req = self.product_temp_requirements[product]
        if req['min'] <= avg_temp <= req['max']:
            deviation = abs(avg_temp - req['optimal'])
            max_deviation = max(req['optimal'] - req['min'], req['max'] - req['optimal'])
            return max(1.0 - (deviation / max_deviation) * 0.3, 0.7)
        return 0.3
    
    def _calculate_soil_temp_suitability(self, product, soil_temp):
        """Calculate soil temperature suitability for product"""
        if product not in self.product_temp_requirements:
            return 0.7
        req = self.product_temp_requirements[product]
        optimal_soil = req['optimal'] - 2
        min_soil = req['min'] - 3
        max_soil = req['max'] - 2
        if min_soil <= soil_temp <= max_soil:
            deviation = abs(soil_temp - optimal_soil)
            max_deviation = max(optimal_soil - min_soil, max_soil - optimal_soil)
            return max(1.0 - (deviation / max_deviation) * 0.2, 0.8)
        return 0.4
    
    def train_model(self, data):
        """Train CatBoost with weather features"""
        # CatBoost handles categorical features automatically
        categorical_cols = ['District', 'Product_Type', 'Category', 'Soil_Type', 'Supply_Category']
        
        feature_cols = [
            'Production_Tonnes', 'State_Avg_Production', 'Production_Ratio',
            'Env_Suitability', 'Temp_Suitability', 'Soil_Temp_Suitability',
            'Avg_Temp_Max', 'Avg_Temp_Min', 'Avg_Temp', 'Soil_Temperature',
            'Total_Rainfall', 'Avg_Rainfall', 'Rainfall_Days',
            'District', 'Product_Type', 'Category', 'Soil_Type', 'Supply_Category'
        ]
        
        X = data[feature_cols]
        y = data['Target_Price']
        
        # Get indices of categorical features
        cat_features_idx = [i for i, col in enumerate(feature_cols) if col in categorical_cols]
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        print("\nTraining CatBoost model...")
        total_iterations = self.price_model.get_params().get('iterations', 'unknown')
        print(f"CatBoost iterations configured: {total_iterations}")
        print("Iteration progress will be shown every 100 rounds...")
        self.price_model.fit(
            X_train, y_train,
            cat_features=cat_features_idx,
            eval_set=(X_test, y_test),
            verbose=100
        )
        
        train_pred = self.price_model.predict(X_train)
        test_pred = self.price_model.predict(X_test)
        
        print(f"\n{'='*80}")
        print("CATBOOST GRADIENT BOOSTING MODEL")
        print(f"{'='*80}")
        print(f"Algorithm: CatBoost Regressor ({self.price_model.get_params()['iterations']} iterations)")
        print(f"Features: Production + Environment + Weather (5 years)")
        print(f"Training MAE: ₹{mean_absolute_error(y_train, train_pred):,.2f}")
        print(f"Testing MAE:  ₹{mean_absolute_error(y_test, test_pred):,.2f}")
        print(f"Training R²:  {r2_score(y_train, train_pred):.4f}")
        print(f"Testing R²:   {r2_score(y_test, test_pred):.4f}")
        print(f"{'='*80}\n")
        
        # Feature importance
        feature_importance = self.price_model.get_feature_importance()
        self.feature_importance = pd.DataFrame({
            'Feature': feature_cols,
            'Importance': feature_importance
        }).sort_values('Importance', ascending=False)
        
        self.feature_cols = feature_cols
        self.cat_features_idx = cat_features_idx
        
        return data
    
    def get_recommendation_with_weather(self, district, category_filter=None):
        """Get agriculture product recommendations with strict validation"""
        soil_type = self._infer_soil_type(district)
        
        district_prod = self.raw_data[self.raw_data['District'] == district]
        rice_production = district_prod['Production_Tonnes'].values[0] if len(district_prod) > 0 else 0
        avg_production = self.raw_data['Production_Tonnes'].mean()
        production_ratio = rice_production / avg_production if avg_production > 0 else 1.0
        
        print(f"\n{'='*120}")
        print(f"CATBOOST-BASED AGRICULTURE PRODUCTS & PRICE RECOMMENDATIONS")
        print(f"{'='*120}")
        print(f"District: {district}")
        print(f"Soil Type: {soil_type}")
        print(f"Rice Production: {rice_production:,.0f} tonnes (Ratio: {production_ratio:.2f}x avg)")
        if category_filter:
            print(f"Category Filter: {category_filter}")
        
        print(f"\nFetching 5-year weather data for {district}...")
        weather = self.fetch_weather_data(district, years=5)
        
        print(f"\n📊 WEATHER & TEMPERATURE ANALYSIS (Last 5 Years):")
        print(f"  Average Max Temperature: {weather['Avg_Temp_Max']:.1f}°C")
        print(f"  Average Min Temperature: {weather['Avg_Temp_Min']:.1f}°C")
        print(f"  Average Temperature: {weather['Avg_Temp']:.1f}°C")
        print(f"  Soil Temperature (Estimated): {weather['Soil_Temperature']:.1f}°C")
        print(f"  Total Rainfall: {weather['Total_Rainfall']:.0f} mm")
        print(f"  Average Daily Rainfall: {weather['Avg_Rainfall']:.1f} mm")
        print(f"  Rainy Days: {weather['Rainfall_Days']} days")
        print(f"{'='*120}\n")
        
        MIN_SOIL_MATCH = 0.7
        MIN_TEMP_MATCH = 0.7
        MIN_WEATHER_MATCH = 0.6
        
        product_scores = []
        rejected_products = []
        
        for product in self.available_products:
            if product not in self.product_conditions_matrix:
                continue
            
            info = self.product_conditions_matrix[product]
            if category_filter and info['category'] != category_filter:
                continue
            
            env_suit = self._calculate_env_suitability(product, soil_type)
            temp_suit = self._calculate_temp_suitability(product, weather['Avg_Temp'])
            soil_temp_suit = self._calculate_soil_temp_suitability(product, weather['Soil_Temperature'])
            weather_score = self._calculate_weather_suitability(product, weather)
            
            soil_pass = env_suit >= MIN_SOIL_MATCH
            temp_pass = temp_suit >= MIN_TEMP_MATCH
            weather_pass = weather_score >= MIN_WEATHER_MATCH
            
            if not (soil_pass and temp_pass and weather_pass):
                reasons = []
                if not soil_pass:
                    reasons.append(f"Soil mismatch ({env_suit:.2f} < {MIN_SOIL_MATCH})")
                if not temp_pass:
                    reasons.append(f"Temperature unsuitable ({temp_suit:.2f} < {MIN_TEMP_MATCH})")
                if not weather_pass:
                    reasons.append(f"Weather unsuitable ({weather_score:.2f} < {MIN_WEATHER_MATCH})")
                
                rejected_products.append({
                    'product': product, 'reasons': reasons,
                    'env_suit': env_suit, 'temp_suit': temp_suit, 'weather_score': weather_score
                })
                continue
            
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
            estimated_price = base_price * (avg_production / rice_production) if rice_production > 0 else base_price
            
            product_scores.append({
                'product': product, 'category': info['category'], 'production': rice_production,
                'soil_match': '✓ Pass' if soil_pass else '✗ Fail',
                'temp_match': '✓ Pass' if temp_pass else '✗ Fail',
                'weather_match': '✓ Pass' if weather_pass else '✗ Fail',
                'env_suit': env_suit, 'temp_suit': temp_suit, 'weather_score': weather_score,
                'market_status': market_status, 'overall': overall, 'price': estimated_price
            })
        
        if product_scores:
            product_scores.sort(key=lambda x: x['overall'], reverse=True)
            
            print(f"✅ RECOMMENDED PRODUCTS (All conditions met):")
            print(f"{'Product':<12} {'Soil':<10} {'Temp':<10} {'Weather':<10} {'Soil Score':<12} {'Temp Score':<12} {'Weather Score':<15} {'Market':<15} {'Price/Qt':<12} {'Status':<15}")
            print(f"{'-'*140}")
            
            for item in product_scores:
                status = "✓ Excellent" if item['overall'] >= 0.9 else ("✓ Good" if item['overall'] >= 0.7 else "✓ Fair")
                print(f"{item['product']:<12} {item['soil_match']:<10} {item['temp_match']:<10} {item['weather_match']:<10} {item['env_suit']:<12.2f} {item['temp_suit']:<12.2f} {item['weather_score']:<15.2f} {item['market_status']:<15} ₹{item['price']:<11,.0f} {status:<15}")
        else:
            print(f"❌ NO PRODUCTS RECOMMENDED - Conditions not suitable\n")
        
        if rejected_products:
            print(f"\n⚠️ REJECTED PRODUCTS (Failed validation):")
            print(f"{'Product':<12} {'Soil Score':<12} {'Temp Score':<12} {'Weather Score':<15} {'Rejection Reasons'}")
            print(f"{'-'*100}")
            
            for item in rejected_products:
                reasons_str = ", ".join(item['reasons'])
                print(f"{item['product']:<12} {item['env_suit']:<12.2f} {item['temp_suit']:<12.2f} {item['weather_score']:<15.2f} {reasons_str}")
        
        print(f"\n{'='*120}\n")
    
    def _calculate_weather_suitability(self, product, weather):
        """Calculate weather suitability score for product"""
        rainfall = weather['Total_Rainfall']
        
        if product in ['Rice', 'Sugarcane', 'Buffalo', 'Buffalo Milk', 'Duck', 'Tilapia', 'Shrimp', 'Prawn']:
            score = 0.5 + (rainfall / 2000) * 0.5
        elif product in ['Wheat', 'Maize', 'Dairy Cattle', 'Cow Milk', 'Broiler Chicken', 'Layer Chicken', 'Eggs']:
            score = 0.6 + (rainfall / 1500) * 0.4
        elif product in ['Goat', 'Sheep', 'Goat Milk', 'Bajra', 'Jowar']:
            score = 0.8 + (rainfall / 3000) * 0.2
        else:
            score = 0.7 + (rainfall / 1000) * 0.3
        
        return min(score, 1.0)


def main():
    print("\n" + "="*100)
    print("CATBOOST-INTEGRATED AGRICULTURE PRODUCTS & PRICE RECOMMENDATION SYSTEM")
    print("Using: CatBoost Gradient Boosting + Open-Meteo Weather API (5 Years Historical Data)")
    print("="*100)
    
    system = WeatherIntegratedAgricultureSystem(iterations=1000, learning_rate=0.1, depth=6)
    
    print("\n[1/4] Loading agriculture products data...")
    system.load_agriculture_products_data('agriculture_products_dataset.csv')
    
    print("\n[2/4] Loading production data...")
    system.load_production_data('rice.xls')
    
    print("\n[3/4] Fetching weather data and engineering features...")
    data = system.prepare_training_data_with_weather()
    print(f"✓ Prepared {len(data)} records with weather features")
    
    print("\n[4/4] Training CatBoost model...")
    system.train_model(data)
    
    print("\n" + "="*80)
    print("FEATURE IMPORTANCE (CatBoost)")
    print("="*80)
    for _, row in system.feature_importance.head(12).iterrows():
        print(f"{row['Feature']:<35} {row['Importance']:<15.4f} {row['Importance']*100/row['Importance'].sum() if hasattr(row['Importance'], 'sum') else 0:<10.2f}%")
    print("="*80)
    
    all_districts = system.raw_data['District'].unique().tolist()
    
    print("\n" + "="*100)
    print(f"RICE PRODUCTION & PRICE RECOMMENDATIONS FOR ALL {len(all_districts)} DISTRICTS")
    print("="*100)
    
    for district in all_districts:
        system.get_recommendation_with_weather(district)


if __name__ == "__main__":
    main()
