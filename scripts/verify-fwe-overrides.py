"""Verify real merges and simulate a changed upstream without publishing fixtures."""
import copy, json
from pathlib import Path
from overlay_model import apply_corrections
ROOT=Path(__file__).resolve().parents[1];WIKI=ROOT/"docs/games/fire-emblem-fw";TARGET=WIKI/"data/generated"
def read(path): return json.loads(path.read_text())
database=read(TARGET/"baseline-database.json")
baselines={kind:database[kind] for kind in ["characters","classes"]}
baselines.update({kind:read(WIKI/"data"/(kind+".json")) for kind in ["resources","timeline"]})
files=sorted((WIKI/"data/overrides").rglob("*.json"))
payloads={p:p.read_bytes() for p in files};patches=[json.loads(v) for v in payloads.values()]
effective,report=apply_corrections(baselines,patches)
db=read(TARGET/"database.json")
assert all(effective[kind]==db[kind] for kind in ["characters","classes"])
assert all(effective[kind]==read(TARGET/(kind+".json")) for kind in ["resources","timeline"])
assert report==read(TARGET/"corrections.json")["report"]
assert effective["characters"]!=baselines["characters"],"Existing Chinese names must be maintained by durable corrections"
assert not any(r["status"]=="needs-review" for r in report),"Current migration must preserve known baseline"
changed=copy.deepcopy(baselines)
for patch in patches:
 for change in patch["changes"]:
  if change["field"]=="nameZh":
   next(r for r in changed[patch["dataset"]] if r["id"]==patch["recordId"])["nameZh"]="UPSTREAM TEST FIXTURE"
second,second_report=apply_corrections(changed,patches)
assert second==effective
assert any(r["status"]=="needs-review" for r in second_report)
assert all(path.read_bytes()==raw for path,raw in payloads.items())
assert apply_corrections(baselines,patches)==(effective,report),"Repeated imports must be deterministic"
for patch in patches:
 if patch["dataset"] in ["characters","classes"]:
  page=WIKI/"entries"/patch["dataset"]/(patch["recordId"]+".md")
  assert "人工勘误记录" in page.read_text()
assert len(read(TARGET/"resources.json"))==54 and len(read(TARGET/"timeline.json"))==13
print("Corrections survive simulated upstream updates; source files, relationships and generated pages verified:",len(report))
