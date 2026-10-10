#!/usr/bin/env python3
"""Export factual fields only from a pinned, verified SQLite snapshot."""
import hashlib, json, re, sqlite3, tempfile, urllib.request
from pathlib import Path
from overlay_model import stable_id
ROOT = Path(__file__).resolve().parents[1]
LOCK = json.loads((ROOT / "sources/fire-emblem-fw/upstream.json").read_text())
STATS = ["HP","Str","Mag","Spd","Dex","Def","Res","Lck","Cha"]
def run():
    url = f"https://raw.githubusercontent.com/{LOCK['repository']}/{LOCK['commit']}/data/fwe.db"
    with urllib.request.urlopen(url, timeout=60) as response:
        payload = response.read(16 * 1024 * 1024)
    blob = hashlib.sha1(b"blob " + str(len(payload)).encode() + b"\0" + payload).hexdigest()
    if blob != LOCK["blob"]: raise ValueError("Upstream database checksum mismatch")
    with tempfile.TemporaryDirectory() as temp:
        path = Path(temp) / "fwe.db"
        path.write_bytes(payload)
        con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        con.row_factory = sqlite3.Row
        def rows(table): return [dict(r) for r in con.execute(f'SELECT * FROM "{table}"')]
        pages = {r["id"]: r["url"] for r in rows("pages")}
        cg = rows("char_growths")
        clg = rows("class_growths")
        def growth(name, kind=None):
            if kind is None:
                return {s: next((r["value"] for r in cg if r["name"] == name and r["stat"] == s), None) for s in STATS}
            return {s: next((r["value"] for r in clg if r["class"] == name and r["stat"] == s and r["kind"] == kind), None) for s in STATS}
        names = {} # Display names are maintained in persistent corrections.
        chars = []
        for r in rows("characters"):
            chars.append({"name":r["name"],"nameZh":names.get(r["name"]), "aliases":[], "faction":r["faction"],"growths":growth(r["name"]),"source":pages.get(r["page_id"]), "ability":r["ability"] if r["ability"] != "TBD" else None})
        classes = []
        fields = ["name","tier","type","movement","weapons","license","ideal_lv","renown_lv","primary_skill","secondary_skill","master_ability","class_ability"]
        for r in rows("classes"):
            classes.append({**{k:r[k] or None for k in fields}, "nameZh":None, "aliases":[], "growths":growth(r["name"],"growth"),"statBonus":growth(r["name"],"bonus"),"source":pages.get(r["page_id"])})
        # Names and learning conditions only. No scraped descriptive prose.
        spells = [{k:r[k] for k in ["name","skill_level","magic","spell"]} for r in rows("char_spells")]
        marks = [{k:r[k] for k in ["name","mark","holders"]} for r in rows("char_bloodmarks")]
        arts = [{k:r[k] for k in ["name","art","range","blaze","learned"]} for r in rows("char_blaze")]
        prefs = rows("char_skill_prefs")
        con.close()
    for kind,records in [("characters",chars),("classes",classes)]:
        for record in records: record["id"]=stable_id(kind,record["name"],record["source"])
    assert len(chars) == 62 and len(classes) == 58
    for r in chars + classes:
        assert set(r["growths"]) == set(STATS)
        assert all(v is None or isinstance(v,int) for v in r["growths"].values())
    checks = json.loads((ROOT / "sources/fire-emblem-fw/crosscheck.json").read_text())
    discrepancies = []
    by_name = {r["name"]:r for r in chars}
    for name, expected in checks["characters"].items():
        for stat, value in expected.items():
            actual = by_name[name]["growths"][stat]
            if actual != value: discrepancies.append({"name":name,"stat":stat,"upstream":actual,"reference":value})
    data = {"schemaVersion":1,"gameId":"fire-emblem-fw","stats":STATS,"provenance":LOCK,
            "characters":chars,"classes":classes,"spells":spells,"bloodmarks":marks,"arts":arts,"skillPreferences":prefs,
            "crosscheck":{"source":checks["source"],"scope":list(checks["characters"]),"discrepancies":discrepancies}}
    target = ROOT / "docs/games/fire-emblem-fw/data/generated"
    target.mkdir(parents=True, exist_ok=True)
    (target / "baseline-database.json").write_text(json.dumps(data,ensure_ascii=False,indent=2) + "\n")
    print(json.dumps({"identityMap":{r["name"]:r["id"] for r in chars if r["name"] in ["Cai","Dietrich","Theodora","Leda"]}},ensure_ascii=False))
    print(json.dumps({"characters":len(chars),"classes":len(classes),"spells":len(spells),"bloodmarks":len(marks),"arts":len(arts),"crosscheck":data["crosscheck"]},ensure_ascii=False))
def write_tables(data,target):
    labels = ["生命","力量","魔力","速度","技巧","防御","魔防","幸运","魅力"]
    for kind in ["characters","classes"]:
        title = "人物成长率总表" if kind == "characters" else "职业成长加成总表"
        lines = ["---",f"title: {title}","category: 人物与职业","---",f"# {title}","",
                 "平台：Switch 2。补丁版本未确认；社区整理数值，非原始解包。百分数；— 表示缺失。", "",
                 "人物成长与职业成长相加。职业属性加值不计入升级成长。Mu 的个人能力须另行考虑，不自动叠加。", "",
                 "| 名称 | " + " | ".join(labels) + " | 来源 |",
                 "| --- | " + " | ".join(["---"]*9) + " | --- |"]
        for r in data[kind]:
            name = (r.get("nameZh") or r["name"])
            match = re.search(r"/archives/(\d+)",r["source"] or "")
            eid = kind+"-"+(match.group(1) if match else hashlib.sha256(r["name"].encode()).hexdigest()[:16])
            name = f"[{name}](/games/fire-emblem-fw/entries/{kind}/{eid})"
            values = ["—" if r["growths"][s] is None else str(r["growths"][s]) for s in STATS]
            lines.append("| " + name + " | " + " | ".join(values) + f" | [来源]({r['source']}) |")
        lines += ["",f"固定上游版本：`{LOCK['commit']}`。", "", "[返回数据库](../../database)"]
        (target / f"{kind}.md").write_text("\n".join(lines)+"\n")
if __name__ == "__main__": run()
