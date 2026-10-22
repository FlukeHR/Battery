from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_DATA_DIR = PROJECT_ROOT / "dataset"
DATASET_CHEMISTRIES = {"CALB": "ncm", "HUST": "lfp", "MATR": "lfp"}
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
REPORTS_DIR = PROJECT_ROOT / "data" / "reports"
PLOTS_DIR = PROJECT_ROOT / "data" / "plots"
MODEL_DIR = PROJECT_ROOT / "models"

EOL_SOH = 0.80
RANDOM_STATE = 42
