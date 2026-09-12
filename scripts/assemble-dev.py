# -*- coding: utf-8 -*-
"""在技术开发文档中插入 99 项功能数据字典章节"""
import io

def read(p):
    return io.open(p, encoding='utf-8').read()

src = read('docs/build/技术开发文档.html')

roles = [('citizen', '市民端'), ('tourist', '游客端'), ('enterprise', '企业端'), ('merchant', '商户端'), ('gov', '政府端')]

# 组装 99 项数据字典章节
blocks = ['<h2>六、99 项功能数据字典（模块编号映射）</h2>',
          '<p>下表列出全部 99 项功能的模块编号、功能名称、所属角色、展示模式与中间区展示构成，是 <strong>sys_module 表数据初始化</strong>与 <strong>intent-service 意图分类标签</strong>的权威映射依据。模块编号同时作为 <strong>geo_poi / flow_step / policy_item / decision_kpi / module_result_cache</strong> 等表的 module_id 外键关联键。</p>']
for role, label in roles:
    blocks.append(read('docs/build/_dev_%s.html' % role))

dict_section = '\n'.join(blocks)

# 在 "## 六、接口设计" 之前插入（原文档第六章是接口设计）
marker = '<h2>六、接口设计</h2>'
# 原文档接口设计是第六章，我们插入新章后它变成第七章，需重新编号
if marker in src:
    src = src.replace(marker, dict_section + '\n\n<h2>七、接口设计</h2>')
    # 后续章节顺延：七数据来源→八，八AI意图→九，九非功能→十，十里程碑→十一
    src = src.replace('<h2>七、数据来源与对接</h2>', '<h2>八、数据来源与对接</h2>')
    src = src.replace('<h2>八、AI 意图识别引擎</h2>', '<h2>九、AI 意图识别引擎</h2>')
    src = src.replace('<h3>8.1 方案选型</h3>', '<h3>9.1 方案选型</h3>')
    src = src.replace('<h3>8.2 训练数据</h3>', '<h3>9.2 训练数据</h3>')
    src = src.replace('<h2>九、非功能需求与部署</h2>', '<h2>十、非功能需求与部署</h2>')
    src = src.replace('<h3>9.1 非功能指标</h3>', '<h3>10.1 非功能指标</h3>')
    src = src.replace('<h3>9.2 容器化与 CI/CD</h3>', '<h3>10.2 容器化与 CI/CD</h3>')
    src = src.replace('<h2>十、里程碑与团队</h2>', '<h2>十一、里程碑与团队</h2>')
    io.open('docs/build/技术开发文档.html', 'w', encoding='utf-8').write(src)
    print('技术开发文档 已插入 99 项功能数据字典章节（第六章）')
else:
    print('警告：未找到插入标记，需检查')
