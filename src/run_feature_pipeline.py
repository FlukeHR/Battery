from __future__ import annotations

import argparse

from src.config import PROCESSED_DIR, RAW_DATA_DIR
from src.feature_engineering import run_feature_pipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Build CALB, HUST and MATR cycle-level features.")
    parser.add_argument("--raw-dir", default=str(RAW_DATA_DIR))
    parser.add_argument("--output-dir", default=str(PROCESSED_DIR))
    args = parser.parse_args()
    paths = run_feature_pipeline(args.raw_dir, args.output_dir)
    for name, path in paths.items():
        print(f"{name}: {path}")


if __name__ == "__main__":
    main()

