import json,re, pathlib, shutil, zipfile
import numpy as np
import openpyxl

import argparse
parser=argparse.ArgumentParser(description="训练挂牌价口径残值岭回归模型")
parser.add_argument("--input",required=True,help="原始残值 Excel 路径")
parser.add_argument("--output",required=True,help="本地训练产物目录")
args=parser.parse_args()
OUT=pathlib.Path(args.output); OUT.mkdir(parents=True,exist_ok=True)
source=pathlib.Path(args.input)
rows=list(openpyxl.load_workbook(source,data_only=True).active.values)[1:]
brands=sorted({str(r[1]).strip() for r in rows})
sources=sorted({str(r[2]).strip() for r in rows})
def number(v):
    if v is None:return None
    if isinstance(v,(int,float)):return float(v)
    s=str(v).strip()
    if re.fullmatch(r'\d+(\.\d+)?\s*[-~～]\s*\d+(\.\d+)?',s):return sum(map(float,re.findall(r'\d+(?:\.\d+)?',s)))/2
    return None
data=[]
for r in rows:
    if r[3] not in ['三元锂','磷酸铁锂']:continue
    spec=re.fullmatch(r'(\d+(?:\.\d+)?)V(\d+(?:\.\d+)?)Ah',str(r[4]),re.I)
    if not spec:raise ValueError(r[4])
    nums=[float(spec[1]),float(spec[2]),number(r[5]),number(r[6]),number(r[7]),number(r[9])]
    data.append(dict(nums=nums,cats=[r[1].strip(),r[3],r[2].strip(),str(r[12]).strip() if r[12] else '未知'],price=float(r[13]),id=r[0]))
cats=[brands,['三元锂','磷酸铁锂'],sources,['是','否','未知']]
def fitprep(ds):
    n=np.array([[np.nan if x is None else x for x in d['nums']] for d in ds])
    med=np.nanmedian(n,axis=0); n=np.where(np.isnan(n),med,n)
    logs=np.log1p(n); return med,logs.mean(0),np.maximum(logs.std(0),.1)
def transform(ds,prep):
    med,mean,std=prep; result=[]
    for d in ds:
        missing=[x is None for x in d['nums']]
        vals=[med[i] if v is None else v for i,v in enumerate(d['nums'])]
        result.append([1]+list((np.log1p(vals)-mean)/std)+list(map(int,missing))+[int(d['cats'][i]==c) for i,cs in enumerate(cats) for c in cs])
    return np.array(result)
def fit(ds,alpha):
    prep=fitprep(ds); X=transform(ds,prep); y=np.log([d['price'] for d in ds]); penalty=np.eye(X.shape[1])*alpha; penalty[0,0]=0
    coef=np.linalg.solve(X.T@X+penalty,X.T@y);return prep,coef
# Exact duplicate input records remain in the same validation fold.
groups={}
for i,d in enumerate(data):groups.setdefault(json.dumps([d['nums'],d['cats']],ensure_ascii=False),[]).append(i)
rng=np.random.default_rng(42); keys=list(groups);rng.shuffle(keys)
folds=[[] for _ in range(5)]
for k in keys:folds[min(range(5),key=lambda j:len(folds[j]))].extend(groups[k])
scores=[]; predictions={}
for alpha in [.1,1,10,100]:
    pred=np.zeros(len(data));base=np.zeros(len(data))
    for test in folds:
        train=[d for i,d in enumerate(data) if i not in test]; val=[data[i] for i in test]
        prep,coef=fit(train,alpha);pred[test]=np.exp(transform(val,prep)@coef)
        base[test]=np.median([d['price'] for d in train])
    y=np.array([d['price'] for d in data]);mae=float(np.mean(abs(pred-y)))
    scores.append(dict(alpha=alpha,mae=mae,rmse=float(np.sqrt(np.mean((pred-y)**2)))))
    predictions[alpha]=pred
best=min(scores,key=lambda s:s['mae']);prep,coef=fit(data,best['alpha'])
errors=abs(predictions[best['alpha']]-y)
model=dict(brands=brands,sources=sources,categories=cats,medians=prep[0].tolist(),means=prep[1].tolist(),stds=prep[2].tolist(),coefficients=coef.tolist(),mae=best['mae'],error80=float(np.quantile(errors,.8)),samples=len(data),alpha=best['alpha'],ranges=[[min(d['nums'][i] for d in data if d['nums'][i] is not None),max(d['nums'][i] for d in data if d['nums'][i] is not None)] for i in range(6)])
(OUT/'model.json').write_text(json.dumps(model,ensure_ascii=False,indent=2),encoding='utf-8')
report={'source_records':len(rows),'training_records':len(data),'excluded_manganese':5,'brand_count':len(brands),'validation':'5-fold grouped exact-input duplicates, seed 42; hyperparameter selection uses these folds, not independent test set','candidates':scores,'selected':best,'baseline_median_mae':float(np.mean(abs(base-y))),'empirical_80pct_absolute_error':model['error80'],'missing_counts':{k:sum(d['nums'][i] is None for d in data) for i,k in enumerate(['电压','容量','新电参考价','续航','服役月数','循环次数'])}}
(OUT/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
