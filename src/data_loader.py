from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any, Iterator


def find_pickle_files(raw_dir: str | Path) -> list[Path]:
    """Return sorted CALB pickle files from a directory."""
    path = Path(raw_dir)
    if not path.exists():
        raise FileNotFoundError(f"Raw data directory not found: {path}")
    files = sorted(path.glob("*.pkl"))
    if not files:
        raise FileNotFoundError(f"No .pkl files found in {path}")
    return files


def load_pickle(path: str | Path) -> Any:
    """Load one pickle file."""
    pkl_path = Path(path)
    if not pkl_path.exists():
        raise FileNotFoundError(f"File not found: {pkl_path}")
    with pkl_path.open("rb") as handle:
        return pickle.load(handle)


def iter_cell_pickles(raw_dir: str | Path) -> Iterator[tuple[Path, dict[str, Any]]]:
    """Yield `(path, cell_data)` pairs for every pickle in `raw_dir`."""
    for path in find_pickle_files(raw_dir):
        data = load_pickle(path)
        if not isinstance(data, dict):
            raise TypeError(f"{path} must contain a dict, got {type(data)!r}")
        yield path, data

