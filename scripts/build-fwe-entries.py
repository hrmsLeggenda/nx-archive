#!/usr/bin/env python3
"""Build stable entity pages and links from already sourced factual records."""
import hashlib, json, re, shutil
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
WIKI=ROOT/"docs/games/fire-emblem-fw"
BASE="/games/fire-emblem-fw"
def entity_id(kind,name,source=None):
    page=re.search(r"/archives/(\d+)",source or "")
    return kind+"-"+(page.group(1) if page else hashlib.sha256(name.encode()).hexdigest()[:16])
def cell(value):
    return str(value if value not in (None,"") else "未记录").replace("|","\\|").replace("\n"," ")
def link(entity): return f"[{entity['title']}]({entity['url']})"
def run():
    db=json.loads((WIKI/"data/generated/database.json").read_text())
    resources=json.loads((WIKI/"data/resources.json").read_text())
    timeline=json.loads((WIKI/"data/timeline.json").read_text())
    output=WIKI/"entries"
    if output.exists(): shutil.rmtree(output)
    entities={}
    def add(kind,name,title,categories,source=None,identity=None,aliases=None):
        eid=identity or entity_id(kind,name,source)
        if eid in entities:
            assert entities[eid]["name"]==name, "Entity identity collision"
            return entities[eid]
        entity={"id":eid,"kind":kind,"name":name,"title":title,"categories":categories,
                "aliases":aliases or [],"url":f"{BASE}/entries/{kind}/{eid}","source":source}
        entities[eid]=entity
        return entity
    chars={r["name"]:add("characters",r["name"],r.get("nameZh") or r["name"],["characters"],r["source"],aliases=[r["name"]]) for r in db["characters"]}
    classes={r["name"]:add("classes",r["name"],r["name"],["classes"],r["source"]) for r in db["classes"]}
    places={}
    for r in resources:
        places[r["locationId"]]=add("places",r["locationOriginal"],r["location"],["places","exploration"],r["source"],"place-"+r["locationId"],[r["locationOriginal"]])
    items={}
    for r in resources:
        items[r["resource"]]=add("items",r["resource"],r["resource"],["items","exploration"],r["source"])
    quests={r["id"]:add("quests",r["title"],r["title"],["quests","story"],r["source"],"quest-"+r["id"],[r["id"]]) for r in timeline}
    edges=[]
    for r in resources:
        edges.append({"from":places[r["locationId"]]["id"],"to":items[r["resource"]]["id"],
                      "type":"resource","phase":r["phase"],"routes":r["routes"],"method":r["method"],"resourceId":r["id"]})
    # Reward identifiers are linked only when the exact source name is known.
    for r in timeline:
        for reward in r["rewards"]:
            name=re.sub(r"\s*[×x]\s*\d+$","",reward)
            if name in items: edges.append({"from":quests[r["id"]]["id"],"to":items[name]["id"],"type":"reward","phase":r["phase"],"routes":r["routes"]})
    def write(e,body):
        path=output/e["kind"]/(e["id"]+".md")
        path.parent.mkdir(parents=True,exist_ok=True)
        fm={"title":e["title"],"entityId":e["id"],"kind":"条目","categories":e["categories"],"aliases":e["aliases"],
            "generated":True,"editLink":False,"lastUpdated":False}
        text="---\n"+"\n".join(k+": "+json.dumps(v,ensure_ascii=False) for k,v in fm.items())+"\n---\n\n"
        text+=f"# {e['title']}\n\n"
        text+="平台：Switch 2；补丁版本未确认。社区资料整理，未完成游戏内复核。\n\n"
        text+="<div class=\"entity-infobox\">\n\n"
        text+=f"**条目类型**：{dict(characters='人物',classes='职业',places='地点',items='物品',quests='任务与节点')[e['kind']]}\n\n"
        text+=f"**名称记录**：{cell(e['name'])}\n\n"
        if e["source"]: text+=f"[查看原始来源]({e['source']})\n\n"
        text+="</div>\n\n"+body+"\n\n<EntryRelations />\n\n"
        text+=f"[来源与维护说明]({BASE}/sources) · [返回游戏 Wiki]({BASE}/)\n"
        path.write_text(text,encoding="utf-8")
    labels=["生命","力量","魔力","速度","技巧","防御","魔防","幸运","魅力"]
    for r in db["characters"]:
        e=chars[r["name"]]
        body=f"## 基本资料\n\n阵营：{cell(r['faction'])}。个人能力名称：{cell(r['ability'])}；效果请查阅来源。\n\n"
        body+="## 基础成长率\n\n| 属性 | 成长率% |\n| --- | --- |\n"
        body+="\n".join(f"| {label} | {cell(r['growths'][s])} |" for label,s in zip(labels,db["stats"]))
        body+=f"\n\n[选择职业计算有效成长]({BASE}/database)；职业加成另行叠加，个人能力不自动计入。\n\n"
        prefs=[p for p in db["skillPreferences"] if p["name"]==r["name"]]
        body+="## 技能擅长\n\n"
        body+="\n".join("- "+("擅长" if p["kind"]=="preferred" else "不擅长")+"："+cell(p["skill"]) for p in prefs) or "未记录。"
        spells=[p for p in db["spells"] if p["name"]==r["name"]]
        body+="\n\n## 法术习得\n\n"
        if spells:
            body+="| 技能等级 | 类型 | 法术原名 |\n| --- | --- | --- |\n"+"\n".join(f"| {cell(p['skill_level'])} | {cell(p['magic'])} | {cell(p['spell'])} |" for p in spells)
        else: body+="未记录，不代表不能学习法术。"
        body+="\n\n## 血印与主角战技\n\n"
        relevant=[p for p in db["bloodmarks"] if p["name"]==r["name"]]
        arts=[p for p in db["arts"] if p["name"]==r["name"]]
        body+="\n".join("- 血印："+cell(p["mark"]) for p in relevant)
        body+="\n"+"\n".join("- 战技："+cell(p["art"])+"；习得："+cell(p["learned"]) for p in arts)
        if not relevant and not arts: body+="未记录。"
        # Four protagonists have explicit route ownership, without inferring factions.
        if r["name"] in ["Cai","Dietrich","Theodora","Leda"]:
            related=[quests[q["id"]] for q in timeline if r["name"] in q["routes"]]
            body+="\n\n## 路线节点\n\n"+"\n".join("- "+link(q) for q in related)
            for q in related: edges.append({"from":e["id"],"to":q["id"],"type":"route"})
        write(e,body)
    for r in db["classes"]:
        body="## 转职条件与职业信息\n\n| 字段 | 来源记录 |\n| --- | --- |\n"
        fields={"tier":"层级","type":"类型","movement":"移动","weapons":"武器","license":"许可证","ideal_lv":"参考等级","renown_lv":"名望","primary_skill":"主要技能","secondary_skill":"次要技能"}
        body+="\n".join(f"| {label} | {cell(r[k])} |" for k,label in fields.items())
        body+="\n\n参考等级不是实测最低转职等级；未记录技能不表示没有要求。\n\n## 成长与属性加值\n\n| 属性 | 职业成长% | 当前属性加值 |\n| --- | --- | --- |\n"
        body+="\n".join(f"| {label} | {cell(r['growths'][s])} | {cell(r['statBonus'][s])} |" for label,s in zip(labels,db["stats"]))
        body+=f"\n\n职业能力：{cell(r['class_ability'])}。精通能力：{cell(r['master_ability'])}。效果请查阅来源。\n\n[打开成长模拟器]({BASE}/database)"
        write(classes[r["name"]],body)
    phase={"part1":"第一部","part3":"第三部·救世篇"}
    method={"chest":"固定宝箱","gather":"随机采集池"}
    route={"Cai":"凯伊","Dietrich":"迪托利希","Theodora":"塞奥朵拉","Leda":"蕾达","Salvation":"救世篇"}
    for loc,e in places.items():
        records=[r for r in resources if r["locationId"]==loc]
        body="真实坐标、通行关系与解锁条件尚未确认。\n\n"
        for p in ["part1","part3"]:
            body+="## "+phase[p]+"\n\n| 物品 | 获取方式 | 数量 | 刷新记录 |\n| --- | --- | --- | --- |\n"
            body+="\n".join(f"| {link(items[r['resource']])} | {method[r['method']]} | {cell(r['quantity'])} | {'每主角一次' if r['refresh']=='once-per-protagonist' else '未确认'} |" for r in records if r["phase"]==p)+"\n\n"
        body+=f"[在阶段地图中查看]({BASE}/maps/world?location={loc}) · [筛选这个地点的资源]({BASE}/resources?location={loc})"
        write(e,body)
    for name,e in items.items():
        records=[r for r in resources if r["resource"]==name]
        body="## 已录入获取途径\n\n| 地点 | 阶段 | 方式 | 数量 |\n| --- | --- | --- | --- |\n"
        body+="\n".join(f"| {link(places[r['locationId']])} | {phase[r['phase']]} | {method[r['method']]} | {cell(r['quantity'])} |" for r in records)
        body+="\n\n采集池表示可能获得，不保证每次出现。物品用途、价格和完整译名未录入；不同语言名称在核实前不自动合并。"
        write(e,body)
    for r in timeline:
        e=quests[r["id"]]
        body=f"## 条件与时间\n\n阶段：{phase[r['phase']]}，第{r['chapter']}章。\n\n"
        body+="适用路线："+ "、".join(route[v] for v in r["routes"])+"。\n\n"
        body+=f"条件：{r['condition']}。\n\n"
        body+="确定性："+("固定事件" if r["certainty"]=="fixed" else "有条件，不保证本轮出现")+"。\n\n"
        body+="截止日期："+cell(r["deadline"])+"。"+(r.get("deadlineNote") or "")+"\n\n## 奖励与解锁\n\n"
        body+="\n".join("- "+link(items[v]) if v in items else "- "+v for v in r["rewards"]) or "功能解锁，无物品记录。"
        body+=f"\n\n[返回章节时间轴]({BASE}/timeline)"
        write(e,body)
    graph={"schemaVersion":1,"gameId":"fire-emblem-fw","entities":list(entities.values()),"edges":edges,
           "counts":dict(Counter(e["kind"] for e in entities.values()))}
    assert len(entities)==len({e["url"] for e in entities.values()})
    assert all(x["from"] in entities and x["to"] in entities for x in edges)
    (WIKI/"data/generated/entities.json").write_text(json.dumps(graph,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"entityCounts":graph["counts"],"edges":len(edges)},ensure_ascii=False))
if __name__=="__main__": run()
