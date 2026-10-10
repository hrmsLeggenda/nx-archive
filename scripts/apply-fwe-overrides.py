#!/usr/bin/env python3
"""Build effective data without mutating any baseline or correction source."""
import hashlib, json, runpy
from pathlib import Path
from overlay_model import apply_corrections, fingerprint, get_value, SCHEMA
ROOT=Path(__file__).resolve().parents[1]
WIKI=ROOT/"docs/games/fire-emblem-fw"
def run():
    target=WIKI/"data/generated"
    database=json.loads((target/"baseline-database.json").read_text())
    baselines={"characters":database["characters"],"classes":database["classes"],
               "resources":json.loads((WIKI/"data/resources.json").read_text()),
               "timeline":json.loads((WIKI/"data/timeline.json").read_text())}
    patches=[];files={}
    for path in sorted((WIKI/"data/overrides").rglob("*.json")):
        payload=path.read_bytes();patch=json.loads(payload)
        if path.relative_to(WIKI/"data/overrides").as_posix()!=patch["dataset"]+"/"+patch["recordId"]+".json": raise ValueError("Correction filename must match target")
        patches.append(patch)
        files[(patch["dataset"],patch["recordId"])]={
            "file":path.relative_to(ROOT).as_posix(),
            "sha":hashlib.sha1(b"blob "+str(len(payload)).encode()+b"\0"+payload).hexdigest(),
            "patch":patch}
    effective,report=apply_corrections(baselines,patches)
    database.update({kind:effective[kind] for kind in ["characters","classes"]})
    database["corrections"]={"applied":len(report),"needsReview":sum(r["status"]=="needs-review" for r in report)}
    (target/"database.json").write_text(json.dumps(database,ensure_ascii=False,indent=2)+"\n")
    for kind in ["resources","timeline"]:
        (target/(kind+".json")).write_text(json.dumps(effective[kind],ensure_ascii=False,indent=2)+"\n")
    catalog=[]
    for kind,rows in baselines.items():
        for r in rows:
            rid=r["id"]
            base={key:get_value(r,key) for key in SCHEMA["datasets"][kind]["fields"]}
            value={key:get_value(next(x for x in effective[kind] if x["id"]==rid),key) for key in base}
            label=r.get("name") or r.get("title") or r.get("location","")+" · "+r.get("resource","")
            catalog.append({"dataset":kind,"id":rid,"label":label,"baseline":base,"effective":value,
                            "baselineHash":fingerprint(r),**files.get((kind,rid),{"file":f"docs/games/fire-emblem-fw/data/overrides/{kind}/{rid}.json","sha":None,"patch":None})})
    result={"schemaVersion":1,"gameId":"fire-emblem-fw","upstream":database["provenance"],"records":catalog,"report":report}
    (target/"corrections.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    runpy.run_path(str(ROOT/"scripts/import-fwe.py"))["write_tables"](database,target)
    print(json.dumps({"correctionFields":len(report),"needsReview":database["corrections"]["needsReview"]}))
if __name__=="__main__": run()
