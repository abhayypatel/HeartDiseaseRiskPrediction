# Heart Disease Risk Prediction

A web app that predicts heart disease risk using machine learning. Enter your health data and get a risk assessment.

## What You Need

- Python 3.10+
- Node.js 18+

## Getting Started

### 1. Set Up the Backend

```bash
python -m venv venv
source venv/bin/activate 

pip install -r backend/requirements.txt
```

### 2. Set Up the Frontend

```bash
cd frontend
npm install
cd ..
```

### 3. Train the Model

```bash
jupyter notebook notebooks/etl_model.ipynb
```

### 4. Start Everything

Open two terminals:

**Terminal 1 - Backend:**
```bash
source venv/bin/activate
cd backend
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Use the App

Go to `http://localhost:5173` in your browser. Enter health data and get your heart disease risk prediction!

## Environment Setup

The MongoDB connection is already configured in the project.