import copy, importlib.util, json, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from overlay_model import apply_corrections, get_value, validate_patch
class OverlayTests(unittest.TestCase):
 def setUp(self):
  self.base={"characters":[{"id":"characters-100","name":"Test fixture","nameZh":None,"aliases":[],"growths":{"HP":40,"Str":None}}],
             "classes":[],"resources":[{"id":"resource-1","quantity":1,"phase":"part1","routes":["Cai"],"method":"chest","certainty":"fixed"}],"timeline":[]}
  self.patch={"schemaVersion":1,"gameId":"fire-emblem-fw","dataset":"characters","recordId":"characters-100",
   "changes":[{"field":"growths.HP","baseValue":40,"value":55},{"field":"aliases","baseValue":[],"value":["测试别名"]}],
   "evidence":{"sources":["https://example.org/test-fixture"],"checked":"2026-10-10","gameVersion":"测试数据","reason":"仅用于验证，非游戏事实"}}
 def test_reimport_keeps_manual_edits_and_unrelated_upstream_updates(self):
  saved=copy.deepcopy(self.patch)
  first,report=apply_corrections(self.base,[self.patch])
  self.assertEqual(first["characters"][0]["growths"]["HP"],55)
  self.assertEqual(report[0]["status"],"applied")
  new=copy.deepcopy(self.base);new["characters"][0]["growths"]["HP"]=45;new["characters"][0]["growths"]["Str"]=30
  second,report=apply_corrections(new,[self.patch])
  self.assertEqual(second["characters"][0]["growths"],{"HP":55,"Str":30})
  self.assertEqual(second["characters"][0]["aliases"],["测试别名"])
  self.assertEqual(report[0]["status"],"needs-review")
  self.assertEqual(self.patch,saved)
  self.assertEqual(self.base["characters"][0]["growths"]["HP"],40)
  new["characters"][0]["growths"]["HP"]=55
  self.assertEqual(apply_corrections(new,[self.patch])[1][0]["status"],"matches-upstream")
 def test_empty_changes_restore_baseline(self):
  self.patch["changes"]=[]
  self.assertEqual(apply_corrections(self.base,[self.patch])[0],self.base)
 def test_null_and_zero_are_distinct(self):
  self.patch["changes"]=[{"field":"growths.Str","baseValue":None,"value":0}]
  data,report=apply_corrections(self.base,[self.patch])
  self.assertEqual(data["characters"][0]["growths"]["Str"],0)
  self.assertIsNone(report[0]["baseline"])
 def test_invalid_targets_fields_values_sources_and_duplicates_fail(self):
  for mutate in [
   lambda p:p.update(recordId="missing"),
   lambda p:p["changes"][0].update(field="name"),
   lambda p:p["changes"][0].update(value=True),
   lambda p:p["changes"][0].update(value=301),
   lambda p:p["evidence"].update(sources=["javascript:alert(1)"]),
   lambda p:p["evidence"].update(checked="2026-02-31"),
   lambda p:p["changes"].append(copy.deepcopy(p["changes"][0])),
  ]:
   p=copy.deepcopy(self.patch);mutate(p)
   with self.assertRaises(ValueError):apply_corrections(self.base,[p])
  with self.assertRaises(ValueError):apply_corrections(self.base,[self.patch,self.patch])
 def test_stage_route_and_pool_constraints(self):
  p=copy.deepcopy(self.patch);p.update(dataset="resources",recordId="resource-1")
  p["changes"]=[{"field":"phase","baseValue":"part1","value":"part3"}]
  with self.assertRaises(ValueError):apply_corrections(self.base,[p])
  p["changes"]=[{"field":"method","baseValue":"chest","value":"gather"},{"field":"certainty","baseValue":"fixed","value":"random-pool"}]
  with self.assertRaises(ValueError):apply_corrections(self.base,[p])
if __name__=="__main__":unittest.main()
