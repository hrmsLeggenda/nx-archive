"""Validated, deterministic corrections over immutable imported records."""
import copy, datetime, hashlib, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCHEMA=json.loads((ROOT/"docs/data/structured-schema.json").read_text())
def stable_id(kind,name,source):
    page=re.search(r"/archives/(\d+)",source or "")
    return kind+"-"+(page.group(1) if page else hashlib.sha256(name.encode()).hexdigest()[:16])
def get_value(record,field):
    value=record
    for key in field.split("."):
        if not isinstance(value,dict): return None
        value=value.get(key)
    return copy.deepcopy(value)
def set_value(record,field,value):
    keys=field.split(".")
    for key in keys[:-1]: record=record[key]
    record[keys[-1]]=copy.deepcopy(value)
def valid_text(value):
    return isinstance(value,str) and bool(value.strip()) and len(value)<=2000 and not re.search(r"[<>]|\{\{|\}\}",value)
def validate_value(field,value,definition):
    if value is None:
        if not definition.get("nullable"): raise ValueError(field+": null is not allowed")
        return
    kind=definition["type"]
    if kind=="integer":
        ok=type(value) is int and definition["min"]<=value<=definition["max"]
    elif kind=="enum": ok=value in definition["values"]
    elif kind=="list":
        ok=isinstance(value,list) and len(value)<=50 and all(valid_text(v) for v in value) and len(set(value))==len(value)
        if ok and definition.get("values"): ok=bool(value) and all(v in definition["values"] for v in value)
    elif kind=="monthday":
        try:
            if not isinstance(value,str) or not re.fullmatch(r"\d{1,2}/\d{1,2}",value): raise ValueError()
            month,day=map(int,value.split("/"))
            datetime.date(2000,month,day);ok=True
        except (ValueError,TypeError,AttributeError): ok=False
    else: ok=valid_text(value)
    if not ok: raise ValueError(field+": invalid value")
def validate_patch(patch):
    required={"schemaVersion","gameId","dataset","recordId","changes","evidence"}
    if not isinstance(patch,dict) or set(patch)!=required: raise ValueError("Invalid correction keys")
    if type(patch["schemaVersion"]) is not int or patch["schemaVersion"]!=1 or patch["gameId"]!="fire-emblem-fw": raise ValueError("Wrong correction scope")
    dataset=patch["dataset"]
    if dataset not in SCHEMA["datasets"]: raise ValueError("Unknown dataset")
    if not isinstance(patch["recordId"],str) or not re.fullmatch(r"[a-zA-Z0-9-]+",patch["recordId"]): raise ValueError("Invalid record identity")
    if not isinstance(patch["changes"],list) or len(patch["changes"])>60: raise ValueError("Invalid changes")
    seen=set()
    for change in patch["changes"]:
        if not isinstance(change,dict) or set(change)!={"field","baseValue","value"}: raise ValueError("Invalid change keys")
        field=change["field"]
        definition=SCHEMA["datasets"][dataset]["fields"].get(field)
        if not definition or field in seen: raise ValueError("Unknown or duplicate field")
        seen.add(field)
        validate_value(field,change["value"],definition)
        # baseValue is historical source data, never interpreted as a writable path.
        if isinstance(change["baseValue"],dict): raise ValueError("Invalid baseline field value")
    evidence=patch["evidence"]
    if not isinstance(evidence,dict) or set(evidence)!={"sources","checked","gameVersion","reason"}: raise ValueError("Invalid evidence")
    if not isinstance(evidence["sources"],list) or not evidence["sources"] or len(evidence["sources"])>10 or not all(isinstance(s,str) and re.fullmatch(r"https?://[^\s<>{}]+",s) for s in evidence["sources"]): raise ValueError("A public source URL is required")
    try:
        if datetime.date.fromisoformat(evidence["checked"]).isoformat()!=evidence["checked"]: raise ValueError()
    except (ValueError,TypeError): raise ValueError("Invalid checked date")
    if not valid_text(evidence["reason"]) or not valid_text(evidence["gameVersion"]): raise ValueError("Reason and game version are required")
    return patch
def fingerprint(record):
    return hashlib.sha256(json.dumps(record,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
def apply_corrections(baselines,patches):
    effective=copy.deepcopy(baselines)
    lookup={dataset:{r["id"]:r for r in rows} for dataset,rows in effective.items()}
    original={dataset:{r["id"]:r for r in rows} for dataset,rows in baselines.items()}
    for dataset,rows in baselines.items():
        if len(original[dataset])!=len(rows): raise ValueError("Duplicate baseline identity")
    report=[];targets=set()
    for patch in patches:
        validate_patch(patch)
        dataset,rid=patch["dataset"],patch["recordId"]
        if (dataset,rid) in targets: raise ValueError("Duplicate correction target")
        targets.add((dataset,rid))
        if rid not in lookup[dataset]: raise ValueError("Correction target disappeared: "+dataset+"/"+rid+"; retain the file and reconcile its identity")
        record=lookup[dataset][rid];base=original[dataset][rid]
        for change in patch["changes"]:
            field=change["field"];current=get_value(base,field)
            status="matches-upstream" if current==change["value"] else "applied" if current==change["baseValue"] else "needs-review"
            set_value(record,field,change["value"])
            report.append({"dataset":dataset,"recordId":rid,"field":field,"baseline":current,"recordedBase":change["baseValue"],"value":change["value"],"status":status,"evidence":copy.deepcopy(patch["evidence"])})
        # Identity and association fields remain immutable.
        if dataset in ["resources","timeline"]:
            permitted=["Salvation"] if record["phase"]=="part3" else ["Cai","Dietrich","Theodora","Leda"]
            if not record["routes"] or any(r not in permitted for r in record["routes"]): raise ValueError("Stage and route mismatch")
        if dataset=="resources":
            if record["method"]=="gather" and (record["certainty"]!="random-pool" or record["quantity"] is not None): raise ValueError("Gathering pools cannot promise fixed amounts")
            if record["method"]=="chest" and record["certainty"]!="fixed": raise ValueError("Chest records must be fixed")
    return effective,report
