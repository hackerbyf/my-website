# -*- coding: utf-8 -*-
"""从 modules-full.json 生成 99 项功能的完整详解 HTML 片段（三种用途：需求/手册/开发）"""
import json

data = json.load(open('docs/build/modules-full.json', encoding='utf-8'))
mods = data['modules']
ROLES = data['roles']
MODES = data['modes']

ROLE_ORDER = ['citizen', 'tourist', 'enterprise', 'merchant', 'gov']

def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

# ============ 1. 需求文档用的：每项完整需求描述 ============
# 每项：编号+名称+角色+模式+关键词+示例提问+系统响应+展示内容+KPI
def req_block(m):
    b = []
    b.append('<h4>%s ｜ %s</h4>' % (m['id'], esc(m['name'])))
    b.append('<table>')
    b.append('<tr><th>所属角色</th><td>%s</td><th>展示模式</th><td>模式%s · %s</td></tr>' % (m['roleName'], m['mode'], m['modeName']))
    if m['alias']:
        b.append('<tr><th>触发关键词</th><td colspan="3">%s</td></tr>' % esc('、'.join(m['alias'])))
    b.append('<tr><th>示例提问</th><td colspan="3">%s</td></tr>' % esc(m['ask']))
    b.append('<tr><th>系统响应</th><td colspan="3">%s</td></tr>' % esc(m['reply']))
    b.append('<tr><th>展示内容</th><td colspan="3">%s（%s）</td></tr>' % (esc(m['headline'] or '—'), esc(m['center'] or '—')))
    if m['kpis']:
        kp = '；'.join('%s：%s' % (k, v) for k, v in m['kpis'])
        b.append('<tr><th>核心指标</th><td colspan="3">%s</td></tr>' % esc(kp))
    b.append('</table>')
    return '\n'.join(b)

# ============ 2. 使用手册用的：每项操作讲解 ============
def manual_block(m):
    b = []
    b.append('<h4>%s ｜ %s</h4>' % (m['id'], esc(m['name'])))
    b.append('<table>')
    b.append('<tr><th>功能定位</th><td colspan="3">%s端 · 模式%s（%s）</td></tr>' % (m['roleName'], m['mode'], m['modeName']))
    b.append('<tr><th>你可以这样问</th><td colspan="3">“%s”</td></tr>' % esc(m['ask']))
    b.append('<tr><th>系统如何回应</th><td colspan="3">%s</td></tr>' % esc(m['reply']))
    b.append('<tr><th>界面展示</th><td colspan="3">%s（%s）</td></tr>' % (esc(m['headline'] or '—'), esc(m['center'] or '—')))
    if m['kpis']:
        kp = '；'.join('%s：%s' % (k, v) for k, v in m['kpis'])
        b.append('<tr><th>决策参考指标</th><td colspan="3">%s</td></tr>' % esc(kp))
    if m['followUps']:
        b.append('<tr><th>可继续追问</th><td colspan="3">%s</td></tr>' % esc('、'.join(m['followUps'])))
    b.append('</table>')
    return '\n'.join(b)

# ============ 3. 开发文档用的：每项数据字典/接口映射 ============
def dev_block(m):
    b = []
    b.append('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
        m['id'], esc(m['name']), m['roleName'], m['mode'], esc(m['center'] or '—')))
    return '\n'.join(b)

# ============ 生成三种 HTML 片段文件 ============
for role in ROLE_ORDER:
    group = [m for m in mods if m['role'] == role]
    if not group:
        continue
    rn = ROLES[role]
    # 需求
    req = ['<h3>%s端（%d 项）</h3>' % (rn, len(group))]
    req += [req_block(m) for m in group]
    open('docs/build/_req_%s.html' % role, 'w', encoding='utf-8').write('\n'.join(req))
    # 手册
    man = ['<h3>%s端（%d 项）</h3>' % (rn, len(group))]
    man += [manual_block(m) for m in group]
    open('docs/build/_manual_%s.html' % role, 'w', encoding='utf-8').write('\n'.join(man))
    # 开发（表格行）
    dev = ['<h4>%s端（%d 项）</h4>' % (rn, len(group))]
    dev.append('<table><tr><th>编号</th><th>功能名称</th><th>角色</th><th>模式</th><th>中间区展示构成</th></tr>')
    dev += [dev_block(m) for m in group]
    dev.append('</table>')
    open('docs/build/_dev_%s.html' % role, 'w', encoding='utf-8').write('\n'.join(dev))

print('已生成 5 类角色 × 3 种片段文件')
print('角色:', [ROLES[r] for r in ROLE_ORDER if any(m['role']==r for m in mods)])
