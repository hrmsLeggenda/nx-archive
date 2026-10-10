import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
wiki=root/"docs/games/fire-emblem-fw"
graph=json.loads((wiki/"data/generated/entities.json").read_text())
entities={e["id"]:e for e in graph["entities"]}
assert len(entities)==len(graph["entities"])
assert graph["counts"]["characters"]==62 and graph["counts"]["classes"]==58
assert graph["counts"]["places"]==4 and graph["counts"]["quests"]==13
assert len({e["url"] for e in entities.values()})==len(entities)
for e in entities.values():
 assert e["url"].startswith("/games/fire-emblem-fw/entries/")
 assert (root/("docs"+e["url"]+".md")).is_file()
 assert (root/("docs/.vitepress/dist"+e["url"]+".html")).is_file()
for edge in graph["edges"]:
 assert edge["from"] in entities and edge["to"] in entities
 if edge["type"]=="resource":
  assert edge["phase"] in ["part1","part3"]
  assert edge["routes"]
  assert edge["method"] in ["chest","gather"]
resources=json.loads((wiki/"data/resources.json").read_text())
assert sorted(e["resourceId"] for e in graph["edges"] if e["type"]=="resource")==sorted(r["id"] for r in resources)
assert any(e["kind"]=="characters" and "Cai" in e["aliases"] for e in entities.values())
print("Entity identities, pages, links and all phase resource relationships verified:",graph["counts"])
