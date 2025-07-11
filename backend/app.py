from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
from dotenv import load_dotenv
import os
import pymongo
from datetime import datetime
import traceback

load_dotenv()

app = Flask(__name__)
CORS(app)

model = None
mongo_client = None
db = None

def load_model():
    """Load the trained model"""
    global model
    try:
        model_path = os.path.join(os.path.dirname(__file__), '..', 'model.joblib')
        model = joblib.load(model_path)
        print("Model loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading model: {e}")
        return False

def connect_to_mongodb():
    """Connect to MongoDB"""
    global mongo_client, db
    try:
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            print("Warning: MONGO_URI not found in environment variables")
            return False
        
        mongo_client = pymongo.MongoClient(mongo_uri)
        db = mongo_client.heart_disease_db
        
        db.predictions.create_index([('user_id', 1), ('timestamp', -1)])
        
        print("Connected to MongoDB successfully!")
        return True
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return False

def get_feature_importance(model, feature_names=None):
    """Extract top features from model"""
    try:
        if hasattr(model.named_steps['model'], 'feature_importances_'):
            importances = model.named_steps['model'].feature_importances_
        elif hasattr(model.named_steps['model'], 'coef_'):
            importances = np.abs(model.named_steps['model'].coef_[0])
        else:
            return []
        
        feature_names_transformed = model.named_steps['prep'].get_feature_names_out()
        
        feature_importance = list(zip(feature_names_transformed, importances))
        feature_importance.sort(key=lambda x: x[1], reverse=True)
        
        feature_name_mapping = {
            'num__age': 'Age',
            'num__sex': 'Sex (Male/Female)',
            'num__cp': 'Chest Pain Type',
            'num__trestbps': 'Resting Blood Pressure',
            'num__chol': 'Cholesterol Level',
            'num__fbs': 'Fasting Blood Sugar > 120 mg/dl',
            'num__restecg': 'Resting ECG Results',
            'num__thalach': 'Maximum Heart Rate',
            'num__exang': 'Exercise Induced Angina',
            'num__oldpeak': 'ST Depression from Exercise',
            'num__slope': 'Exercise ST Segment Slope',
            'num__ca': 'Number of Major Blood Vessels',
            'num__thal': 'Thalassemia Blood Test',
            'num__chol_ratio': 'Cholesterol-to-Age Ratio',
            'num__hr_ratio': 'Heart Rate-to-Age Ratio',
            'num__oldpeak_ratio': 'ST Depression-to-Age Ratio',
            'num__cp_hr': 'Chest Pain and Heart Rate Interaction',
            'num__sex_age': 'Sex and Age Interaction',
            'cat__age_bin_middle': 'Age Group: Middle-aged (40-55)',
            'cat__age_bin_senior': 'Age Group: Senior (55-70)',
            'cat__age_bin_old': 'Age Group: Elderly (70+)',
            'cat__age_bin_young': 'Age Group: Young (under 40)',
        }
        
        human_readable_features = []
        for feat, imp in feature_importance[:3]:
            human_name = feature_name_mapping.get(feat, feat)
            human_readable_features.append({
                'feature': human_name, 
                'importance': float(imp)
            })
        
        return human_readable_features
    except Exception as e:
        print(f"Error getting feature importance: {e}")
        return []

@app.route('/ping', methods=['GET'])
def ping():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'db_connected': db is not None
    })

@app.route('/health', methods=['GET'])
def health():
    """Alternative health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'db_connected': db is not None
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Predict heart disease risk"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_features = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 
                           'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
        
        missing_features = [f for f in required_features if f not in data]
        if missing_features:
            return jsonify({'error': f'Missing features: {missing_features}'}), 400
        
        input_data = pd.DataFrame([data])
        
        input_data['chol_ratio'] = input_data['chol'] / input_data['age']
        input_data['hr_ratio'] = input_data['thalach'] / input_data['age']
        input_data['oldpeak_ratio'] = input_data['oldpeak'] / input_data['age']
        input_data['cp_hr'] = input_data['cp'] * input_data['thalach']
        input_data['sex_age'] = input_data['sex'] * input_data['age']
        input_data['age_bin'] = pd.cut(input_data['age'], bins=[0, 40, 55, 70, 100], 
                                     labels=['young', 'middle', 'senior', 'old'])
        
        probability = model.predict_proba(input_data)[0][1]
        
        top_features = get_feature_importance(model)
        
        user_id = data.get('user_id', 'anonymous')
        prediction_doc = {
            'user_id': user_id,
            'timestamp': datetime.utcnow(),
            'input': data,
            'prob': float(probability),
            'top_features': top_features
        }
        
        if db is not None:
            db.predictions.insert_one(prediction_doc)
        
        return jsonify({
            'prob': float(probability),
            'top_features': top_features
        })
        
    except Exception as e:
        print(f"Error in prediction: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/history', methods=['GET'])
def get_history():
    """Get prediction history for a user"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id parameter required'}), 400
        
        if db is None:
            return jsonify({'error': 'Database not connected'}), 500
        
        predictions = list(db.predictions.find(
            {'user_id': user_id},
            {'_id': 0}
        ).sort('timestamp', -1).limit(20))
        
        for pred in predictions:
            pred['timestamp'] = pred['timestamp'].isoformat()
        
        return jsonify({
            'predictions': predictions,
            'count': len(predictions)
        })
        
    except Exception as e:
        print(f"Error getting history: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask application...")
    
    if not load_model():
        print("Failed to load model. Exiting...")
        exit(1)
    
    if not connect_to_mongodb():
        print("Failed to connect to MongoDB. Continuing without database...")
    
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    app.run(host='0.0.0.0', port=port, debug=debug) 