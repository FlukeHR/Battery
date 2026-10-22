# 特征工程报告

## 数据摘要

下列 JSON 保留程序字段名，记录样本数、电芯数、循环范围、SOH 范围、输出路径及各数据集温度缺失数量。

```json
{
  "rows": 288912,
  "cells": 273,
  "min_cycle": 1,
  "max_cycle": 2689,
  "soh_min": 0.2412621266365702,
  "soh_max": 1.0246904754541066,
  "files": {
    "cycle_features": "D:\\code\\大创\\data\\processed\\cycle_features.csv",
    "train": "D:\\code\\大创\\data\\processed\\train.csv",
    "test": "D:\\code\\大创\\data\\processed\\test.csv"
  },
  "datasets": {
    "CALB": {
      "rows": 2791,
      "cells": 27,
      "missing_temperature_rows": 0
    },
    "HUST": {
      "rows": 146120,
      "cells": 77,
      "missing_temperature_rows": 146120
    },
    "MATR": {
      "rows": 140001,
      "cells": 169,
      "missing_temperature_rows": 0
    }
  }
}
```

## 数据列

列名与处理后的 CSV 保持一致。

- `cell_id`
- `source_file`
- `dataset`
- `battery_chemistry`
- `cycle_index`
- `cycle_position`
- `nominal_capacity_in_Ah`
- `measured_capacity_in_Ah`
- `soh`
- `DOD`
- `DOC`
- `ambient_temperature_in_C`
- `charge_time`
- `discharge_time`
- `voltage_mean`
- `voltage_std`
- `voltage_min`
- `voltage_max`
- `current_mean`
- `current_std`
- `current_min`
- `current_max`
- `temperature_mean`
- `temperature_std`
- `temperature_min`
- `temperature_max`
- `current_abs_mean`
- `current_abs_max`
- `C_rate`
