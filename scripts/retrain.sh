echo "Starting model retraining..."

if [ -d "../venv" ]; then
    source ../venv/bin/activate
    echo "Virtual environment activated"
fi

if ! command -v papermill &> /dev/null; then
    echo "Error: papermill is not installed. Install it with: pip install papermill"
    exit 1
fi

cd "$(dirname "$0")/.."

papermill notebooks/etl_model.ipynb notebooks/etl_model_output.ipynb \
    --log-output \
    --log-level INFO

if [ $? -eq 0 ]; then
    echo "Model retraining completed successfully!"
    echo "Model saved to: model.joblib"
    echo "Output notebook saved to: notebooks/etl_model_output.ipynb"
else
    echo "Error: Model retraining failed"
    exit 1
fi 