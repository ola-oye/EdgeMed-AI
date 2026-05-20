import os

_dir = os.path.dirname(__file__)

rf_model_path = os.path.join(_dir, "rf_model.pkl")
xgb_model_path = os.path.join(_dir, "xgb_model.pkl")
scaler_path = os.path.join(_dir, "scaler.pkl")
feature_cols_path = os.path.join(_dir, "feature_cols.pkl")
