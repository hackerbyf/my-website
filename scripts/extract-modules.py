# -*- coding: utf-8 -*-
"""提取全部 99 项模块完整字段，生成权威数据源 JSON 供文档编写使用"""
import re, json

files = ['citizen', 'citizen2', 'tourist', 'enterprise', 'enterprise2', 'merchant', 'gov', 'gov2']
ROLES = {'citizen': '市民', 'tourist': '游客', 'enterprise': '企业', 'merchant': '商户', 'gov': '政府'}
MODES = {'A': '空间地理类', 'B': '办事流程类', 'C': '政策清单类', 'D': '分析评估类', 'E': '仿真推演类', 'F': '台账统计类'}

mods = []
for f in files:
    p = 'assets/js/data/%s.js' % f
    txt = open(p, encoding='utf-8').read()
    # 按模块起始分块（每个模块以 \n{ id:'Xxx' 开头）
    blocks = re.split(r'\n\{\n', txt)
    for b in blocks:
        m = re.search(r"id:'([A-Z][0-9]+)'", b)
        if not m:
            continue
        mid = m.group(1)
        def g(pat):
            mm = re.search(pat, b)
            return mm.group(1) if mm else ''
        name = g(r"name:'([^']+)'")
        mode = g(r"mode:'([A-F])'")
        role = g(r"role:'([a-z]+)'")
        alias_raw = g(r"alias:\[([^\]]*)\]")
        alias = [a.strip().strip("'") for a in alias_raw.split(',') if a.strip()] if alias_raw else []
        ask = g(r"ask:'([^']+)'")
        reply = g(r"reply:'([^']+)'")
        headline = g(r"headline:'([^']+)'")
        sub = g(r"sub:'([^']+)'")

        has_map = 'map:' in b
        has_map2 = 'map2:' in b
        has_steps = 'steps:' in b
        has_table = 'table:' in b
        has_charts = 'charts:' in b
        has_cards = 'cards:' in b

        # KPI
        kpis = re.findall(r"\{k:'([^']+)',v:'([^']*)'", b)
        # 流程步骤
        steps = re.findall(r"\{t:'([^']+)',dept:'([^']*)'", b)
        # 表格行数
        rows = re.findall(r"rows:\[", b)
        # POI 数
        pois = re.findall(r"\{n:'([^']+)',z:'", b)

        fu_raw = g(r"followUps:\[([^\]]*)\]")
        followUps = [x.strip().strip("'") for x in fu_raw.split(',') if x.strip()] if fu_raw else []

        center_parts = []
        if has_map: center_parts.append('地图')
        if has_map2: center_parts.append('副地图')
        if has_steps: center_parts.append('流程步骤')
        if has_table: center_parts.append('表格')
        if has_charts: center_parts.append('图表')
        if has_cards: center_parts.append('卡片')

        mods.append({
            'id': mid, 'role': role, 'roleName': ROLES.get(role, role),
            'name': name, 'mode': mode, 'modeName': MODES.get(mode, mode),
            'alias': alias, 'ask': ask, 'reply': reply,
            'headline': headline, 'sub': sub,
            'center': '/'.join(center_parts),
            'kpiCount': len(kpis), 'kpis': kpis,
            'stepCount': len(steps), 'steps': steps,
            'poiCount': len(pois),
            'followUps': followUps,
        })

out = {'roles': ROLES, 'modes': MODES, 'modules': mods}
with open('docs/build/modules-full.json', 'w', encoding='utf-8') as fp:
    json.dump(out, fp, ensure_ascii=False, indent=1)

print('总模块数:', len(mods))
for r in ['citizen', 'tourist', 'enterprise', 'merchant', 'gov']:
    n = sum(1 for x in mods if x['role'] == r)
    print('%s: %d' % (ROLES[r], n))
print('JSON 已保存到 docs/build/modules-full.json')
