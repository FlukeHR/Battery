# 特征工程报告

## 数据摘要

下列 JSON 保留程序字段名，记录样本数、电芯数、循环范围、SOH 范围、输出路径及各数据集温度缺失数量。

```json
{
  "rows": 330034,
  "cells": 305,
  "min_cycle": 1,
  "max_cycle": 4569,
  "soh_min": 0.2412621266365702,
  "soh_max": 1.0697155605131066,
  "files": {
    "cycle_features.csv": "D:\\code\\大创\\data\\processed\\cycle_features.csv",
    "train.csv": "D:\\code\\大创\\data\\processed\\train.csv",
    "validation.csv": "D:\\code\\大创\\data\\processed\\validation.csv",
    "test.csv": "D:\\code\\大创\\data\\processed\\test.csv"
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
    },
    "SNL": {
      "rows": 34184,
      "cells": 9,
      "missing_temperature_rows": 0
    },
    "XJTU": {
      "rows": 6938,
      "cells": 23,
      "missing_temperature_rows": 6938
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
- `charge_c_rate`
- `discharge_c_rate`
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
- `context_temperature_c`
- `split`
- `cold_exposure`
- `heat_exposure`
- `charge_rate_known`
- `discharge_rate_known`
