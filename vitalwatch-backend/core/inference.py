"""
core/inference.py
──────────────────
AI model loading and prediction engine.
Isolated from services — services call predict(), know nothing about sklearn.

Loaded once at startup. Stateless after load.
"""

import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from config   import MODEL_PATH, SCALER_PATH, FEATURE_COLS_PATH, VITAL_NORMAL_RANGES
from models   import RiskAssessmentResult, ExplanationBullet


class InferenceEngine:

    def __init__(self):
        self._model       = None
        self._scaler      = None
        self._feature_cols = None

    def load(self):
        self._model        = joblib.load(MODEL_PATH)
        self._scaler       = joblib.load(SCALER_PATH)
        self._feature_cols = joblib.load(FEATURE_COLS_PATH)
        print(f'[inference] Model loaded — {MODEL_PATH}')

    # ── PUBLIC API ────────────────────────────────────────

    def predict(self, current: dict, recent: list[dict]) -> RiskAssessmentResult:
        features, data_confidence = self._build_features(current, recent)

        # features is now a flat dict from df.iloc[-1].to_dict()
        # Select only the columns the model expects, in the correct order
        df = pd.DataFrame([features])[self._feature_cols]

        scaled     = self._scaler.transform(df)
        prediction = self._model.predict(scaled)[0]
        proba      = self._model.predict_proba(scaled)[0]

        # Model returns numeric class labels (0, 1, 2) or string labels
        # depending on how it was trained. Map both cases to expected strings.
        RISK_LABELS = {0: 'stable', 1: 'warning', 2: 'critical',
                       '0': 'stable', '1': 'warning', '2': 'critical'}
        raw        = str(prediction).lower().strip()
        risk_level = RISK_LABELS.get(prediction,
                     RISK_LABELS.get(raw, raw))

        # Final safety check — ensure value is valid
        if risk_level not in ('stable', 'warning', 'critical'):
            risk_level = 'stable'
        confidence_score = float(max(proba)) * 100
        factors          = self._contributing_factors(scaled, df)
        bullets          = self._explanation_bullets(current, recent, risk_level, factors)
        action           = self._suggested_action(risk_level)

        return RiskAssessmentResult(
            risk_level           = risk_level,
            confidence_score     = round(confidence_score, 1),
            explanation_bullets  = bullets,
            suggested_action     = action,
            contributing_factors = factors,
            data_confidence      = data_confidence,
            assessed_at          = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S')
        )

    # ── FEATURE ENGINEERING ───────────────────────────────

    def _build_features(self, current: dict, recent: list[dict]) -> tuple[dict, str]:
        """
        Replicates the exact feature engineering from the original
        train/inference script using pandas rolling operations.
        This guarantees column names match what the model was trained on.
        """
        VITALS = ['Heart_Rate', 'SpO2', 'Respiration_Rate', 'Body_Temperature']
        NORMAL_MID = {
            'Heart_Rate':       80,
            'SpO2':             97,
            'Respiration_Rate': 16,
            'Body_Temperature': 98.6
        }

        # Map incoming snake_case keys to the Title_Case the model expects
        key_map = {
            'heart_rate':       'Heart_Rate',
            'spo2':             'SpO2',
            'respiration_rate': 'Respiration_Rate',
            'body_temperature': 'Body_Temperature'
        }

        def to_model_keys(d: dict) -> dict:
            return {key_map.get(k, k): v for k, v in d.items()}

        # Combine recent + current, translate keys
        all_readings = [to_model_keys(r) for r in recent] + [to_model_keys(current)]
        all_readings = all_readings[-5:]  # keep last 5 max — matches original script

        df = pd.DataFrame(all_readings)

        # Ensure all vital columns exist
        for v in VITALS:
            if v not in df.columns:
                df[v] = NORMAL_MID[v]

        # Rolling mean (window 3) — exact match to original
        for v in VITALS:
            df[f'{v}_rolling_mean'] = df[v].rolling(3, min_periods=1).mean()

        # Delta — exact match to original
        for v in VITALS:
            df[f'{v}_delta'] = df[v].diff().fillna(0)

        # Rolling std (window 5) — exact match to original
        for v in VITALS:
            df[f'{v}_rolling_std'] = df[v].rolling(5, min_periods=1).std().fillna(0)

        # Deviation from normal midpoint — exact match to original
        for v in VITALS:
            df[f'{v}_deviation'] = abs(df[v] - NORMAL_MID[v])

        # Interaction features — exact match to original
        df['spo2_x_rr']     = df['SpO2'] * df['Respiration_Rate']
        df['hr_x_temp']     = df['Heart_Rate'] * df['Body_Temperature']
        df['spo2_rr_ratio'] = df['SpO2'] / df['Respiration_Rate'].replace(0, np.nan)

        df = df.fillna(0)

        # Data confidence based on how many historical readings we have
        history_len = len(recent)
        if   history_len >= 3: confidence = 'full'
        elif history_len >= 1: confidence = 'partial'
        else:                  confidence = 'limited'

        # Return the last row as a dict — feature selection happens in predict()
        return df.iloc[-1].to_dict(), confidence

    def _contributing_factors(self, scaled: np.ndarray, df: pd.DataFrame) -> dict[str, float]:
        try:
            importances = self._model.feature_importances_
            if importances.sum() == 0:
                return {}

            # Support both snake_case and Title_Case feature names
            vital_prefixes = {
                'heart_rate':       'Heart Rate',
                'Heart_Rate':       'Heart Rate',
                'spo2':             'SpO₂',
                'SpO2':             'SpO₂',
                'respiration_rate': 'Respiration Rate',
                'Respiration_Rate': 'Respiration Rate',
                'body_temperature': 'Body Temperature',
                'Body_Temperature': 'Body Temperature',
            }

            grouped: dict[str, float] = {}
            for feat, imp in zip(df.columns, importances):
                matched = False
                for prefix, label in vital_prefixes.items():
                    if feat.startswith(prefix):
                        grouped[label] = grouped.get(label, 0.0) + imp
                        matched = True
                        break

            g_total = sum(grouped.values())
            if g_total == 0:
                return {}
            return {k: round((v / g_total) * 100, 1)
                    for k, v in sorted(grouped.items(), key=lambda x: -x[1])}
        except Exception:
            return {}

    # ── EXPLANATION GENERATION ────────────────────────────

    def _explanation_bullets(self, current: dict, recent: list[dict],
                              risk_level: str, factors: dict) -> list[ExplanationBullet]:
        # Translate snake_case keys to Title_Case for range lookups
        key_map = {
            'heart_rate':       'Heart_Rate',
            'spo2':             'SpO2',
            'respiration_rate': 'Respiration_Rate',
            'body_temperature': 'Body_Temperature'
        }
        c = {key_map.get(k, k): v for k, v in current.items()}

        bullets = []
        checks  = [
            ('SpO2',             'SpO₂',             'low',  'Blood oxygen is'),
            ('Heart_Rate',       'Heart Rate',        'high', 'Heart rate is'),
            ('Respiration_Rate', 'Respiration Rate',  'high', 'Respiratory rate is'),
            ('Body_Temperature', 'Body Temperature',  'high', 'Temperature is'),
        ]
        ranges = {
            'Heart_Rate':       {'low': 60,   'high': 100,   'unit': 'bpm'},
            'SpO2':             {'low': 95,   'high': 100,   'unit': '%'},
            'Respiration_Rate': {'low': 12,   'high': 20,    'unit': 'brpm'},
            'Body_Temperature': {'low': 97.5, 'high': 100.4, 'unit': '°F'},
        }

        for key, label, direction, prefix in checks:
            val = c.get(key)
            r   = ranges[key]
            if val is None:
                continue

            if direction == 'low' and val < r['low']:
                pct = round(((r['low'] - val) / r['low']) * 100, 1)
                sev = 'high' if pct > 8 else 'moderate'
                bullets.append(ExplanationBullet(
                    text     = f"{prefix} low at {val}{r['unit']} — {pct}% below normal range.",
                    severity = sev
                ))
            elif direction == 'high' and val > r['high']:
                pct = round(((val - r['high']) / r['high']) * 100, 1)
                sev = 'high' if pct > 8 else 'moderate'
                bullets.append(ExplanationBullet(
                    text     = f"{prefix} elevated at {val}{r['unit']} — {pct}% above normal range.",
                    severity = sev
                ))

        if not bullets:
            bullets.append(ExplanationBullet(
                text     = "All vital signs are within normal range.",
                severity = 'low'
            ))

        return bullets[:3]

    def _suggested_action(self, risk_level: str) -> str | None:
        actions = {
            'stable':   None,
            'warning':  'Assess patient at bedside within 10 minutes. Review vital trends and check for signs of deterioration.',
            'critical': 'Immediate bedside assessment required. Notify attending physician and prepare for intervention.'
        }
        return actions.get(risk_level)


# Singleton — loaded once at application startup
inference_engine = InferenceEngine()
