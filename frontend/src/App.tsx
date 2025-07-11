import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001';

interface PredictionResult {
  prob: number;
  top_features: { feature: string; importance: number }[];
}

interface HistoryItem {
  timestamp: string;
  input: any;
  prob: number;
  top_features: { feature: string; importance: number }[];
}

interface FormData {
  age: number | string;
  sex: number;
  cp: number;
  trestbps: number | string;
  chol: number | string;
  fbs: number;
  restecg: number;
  thalach: number | string;
  exang: number;
  oldpeak: number | string;
  slope: number;
  ca: number;
  thal: number;
}

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};

function App() {
  const [userId, setUserId] = useState<string>('');
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    age: 50,
    sex: 1,
    cp: 1,
    trestbps: 120,
    chol: 200,
    fbs: 0,
    restecg: 0,
    thalach: 150,
    exang: 0,
    oldpeak: 0,
    slope: 1,
    ca: 0,
    thal: 2
  });

  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/history?user_id=${userId}`);
      setHistory(response.data.predictions || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, [userId]);

  useEffect(() => {
    let storedUserId = localStorage.getItem('heartRiskUserId');
    if (!storedUserId) {
      storedUserId = generateUUID();
      localStorage.setItem('heartRiskUserId', storedUserId);
    }
    setUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (userId) {
      fetchHistory();
    }
  }, [userId, fetchHistory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (e.target.type === 'number') {
      if (value === '') {
        setFormData(prev => ({
          ...prev,
          [name]: '' as any
        }));
        return;
      }

      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setFormData(prev => ({
          ...prev,
          [name]: numValue
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    }
  };

  const randomizeData = () => {
    const randomData = {
      age: Math.floor(Math.random() * (80 - 25) + 25),
      sex: Math.floor(Math.random() * 2),
      cp: Math.floor(Math.random() * 4),
      trestbps: Math.floor(Math.random() * (180 - 90) + 90),
      chol: Math.floor(Math.random() * (400 - 150) + 150),
      fbs: Math.floor(Math.random() * 2),
      restecg: Math.floor(Math.random() * 3),
      thalach: Math.floor(Math.random() * (200 - 80) + 80),
      exang: Math.floor(Math.random() * 2),
      oldpeak: Math.round((Math.random() * 6) * 10) / 10,
      slope: Math.floor(Math.random() * 3),
      ca: Math.floor(Math.random() * 4),
      thal: Math.floor(Math.random() * 3) + 1
    };

    setFormData(randomData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const cleanedData = { ...formData };

      const defaults = {
        age: 50,
        trestbps: 120,
        chol: 200,
        thalach: 150,
        oldpeak: 0
      };

      Object.keys(defaults).forEach(key => {
        const value = cleanedData[key as keyof FormData];
        if (value === '' || (typeof value === 'string' && isNaN(parseFloat(value))) || (typeof value === 'number' && isNaN(value))) {
          (cleanedData as any)[key] = defaults[key as keyof typeof defaults];
        } else if (typeof value === 'string') {
          (cleanedData as any)[key] = parseFloat(value);
        }
      });

      const dataWithUserId = { ...cleanedData, user_id: userId };
      const response = await axios.post(`${API_BASE_URL}/predict`, dataWithUserId);

      setPredictionResult(response.data);

      await fetchHistory();
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred during prediction');
      console.error('Prediction error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskLevel = (prob: number) => {
    return prob > 0.7 ? 'High' : prob > 0.4 ? 'Medium' : 'Low';
  };

  const getRiskColor = (prob: number) => {
    return prob > 0.7 ? 'text-red-600' : prob > 0.4 ? 'text-yellow-600' : 'text-green-600';
  };

  const getBgColor = (prob: number) => {
    return prob > 0.7 ? 'bg-red-50 border-red-200' : prob > 0.4 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Heart Disease Risk Predictor
            </h1>
            <p className="text-lg text-gray-600">
              Get personalized heart disease risk assessment using machine learning
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Patient Information</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Age (years)</label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        min="20"
                        max="100"
                        placeholder="Enter age (20-100)"
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
                      <select name="sex" value={formData.sex} onChange={handleInputChange} className="input-field">
                        <option value={1}>Male</option>
                        <option value={0}>Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Chest Pain Type</label>
                      <select name="cp" value={formData.cp} onChange={handleInputChange} className="input-field">
                        <option value={0}>Typical Angina</option>
                        <option value={1}>Atypical Angina</option>
                        <option value={2}>Non-anginal Pain</option>
                        <option value={3}>Asymptomatic</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Resting Blood Pressure (mmHg)</label>
                      <input
                        type="number"
                        name="trestbps"
                        value={formData.trestbps}
                        onChange={handleInputChange}
                        min="90"
                        max="200"
                        placeholder="Enter BP (90-200)"
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cholesterol (mg/dl)</label>
                      <input
                        type="number"
                        name="chol"
                        value={formData.chol}
                        onChange={handleInputChange}
                        min="100"
                        max="600"
                        placeholder="Enter cholesterol (100-600)"
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fasting Blood Sugar &gt; 120 mg/dl</label>
                      <select name="fbs" value={formData.fbs} onChange={handleInputChange} className="input-field">
                        <option value={0}>No</option>
                        <option value={1}>Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Resting ECG Results</label>
                      <select name="restecg" value={formData.restecg} onChange={handleInputChange} className="input-field">
                        <option value={0}>Normal</option>
                        <option value={1}>ST-T Wave Abnormality</option>
                        <option value={2}>Left Ventricular Hypertrophy</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Heart Rate Achieved</label>
                      <input
                        type="number"
                        name="thalach"
                        value={formData.thalach}
                        onChange={handleInputChange}
                        min="60"
                        max="220"
                        placeholder="Enter max heart rate (60-220)"
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Exercise Induced Angina</label>
                      <select name="exang" value={formData.exang} onChange={handleInputChange} className="input-field">
                        <option value={0}>No</option>
                        <option value={1}>Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ST Depression (oldpeak)</label>
                      <input
                        type="number"
                        name="oldpeak"
                        value={formData.oldpeak}
                        onChange={handleInputChange}
                        min="0"
                        max="10"
                        step="0.1"
                        placeholder="Enter ST depression (0-10)"
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Slope of Peak Exercise ST Segment</label>
                      <select name="slope" value={formData.slope} onChange={handleInputChange} className="input-field">
                        <option value={0}>Upsloping</option>
                        <option value={1}>Flat</option>
                        <option value={2}>Downsloping</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Number of Major Vessels (0-3)</label>
                      <select name="ca" value={formData.ca} onChange={handleInputChange} className="input-field">
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Thalassemia</label>
                      <select name="thal" value={formData.thal} onChange={handleInputChange} className="input-field">
                        <option value={1}>Normal</option>
                        <option value={2}>Fixed Defect</option>
                        <option value={3}>Reversible Defect</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4">
                    <button
                      type="button"
                      onClick={randomizeData}
                      className="btn bg-gray-600 text-white hover:bg-gray-700 px-6 py-3 text-lg"
                    >
                      🎲 Randomize Data
                    </button>
                    <button type="submit" disabled={isLoading} className={`btn btn-primary px-8 py-3 text-lg ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isLoading ? 'Analyzing...' : 'Predict Heart Disease Risk'}
                    </button>
                  </div>
                </form>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                  {error}
                </div>
              )}

              {predictionResult && (
                <div className={`card mt-6 border-2 ${getBgColor(predictionResult.prob)}`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Prediction Results</h2>

                  <div className="text-center">
                    <div className="mb-2">
                      <span className="text-lg font-medium text-gray-700">Heart Disease Risk Probability</span>
                    </div>
                    <div className={`text-6xl font-bold ${getRiskColor(predictionResult.prob)} mb-2`}>
                      {(predictionResult.prob * 100).toFixed(1)}%
                    </div>
                    <div className={`text-xl font-semibold ${getRiskColor(predictionResult.prob)}`}>
                      {getRiskLevel(predictionResult.prob)} Risk
                    </div>
                  </div>

                  {predictionResult.top_features && predictionResult.top_features.length > 0 && (
                    <div className="mt-6 bg-white p-4 rounded-lg border">
                      <h3 className="font-semibold text-gray-900 mb-3">Top Contributing Factors</h3>
                      <div className="space-y-2">
                        {predictionResult.top_features.map((feature, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-gray-700">{feature.feature}</span>
                            <span className="text-sm text-gray-500">{feature.importance.toFixed(3)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="lg:col-span-1">
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Prediction History</h2>

                {history.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-lg mb-2">📊</div>
                    <p className="text-gray-500">No predictions yet</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {history.map((item, index) => (
                      <div key={index} className={`p-4 rounded-lg border-2 ${getBgColor(item.prob)}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm text-gray-600">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </div>
                          <div className={`text-sm font-medium ${getRiskColor(item.prob)}`}>
                            {getRiskLevel(item.prob)} Risk
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className={`text-2xl font-bold ${getRiskColor(item.prob)}`}>
                            {(item.prob * 100).toFixed(1)}%
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Age: {item.input.age}</div>
                            <div className="text-xs text-gray-500">Sex: {item.input.sex === 1 ? 'Male' : 'Female'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
