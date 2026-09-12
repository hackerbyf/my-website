# -*- coding: utf-8 -*-
"""组装系统使用手册：概述+截图+99项完整操作详解"""
import io

roles = [('citizen', '市民民生端'), ('tourist', '游客文旅端'), ('enterprise', '企业全生命周期端'), ('merchant', '小微商户端'), ('gov', '政府治理端')]

def read(p):
    return io.open(p, encoding='utf-8').read()

# 头部（章节一~五，保留截图）
head = u'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>长安智策 · 系统使用手册</title>
</head>
<body>

<h1 style="text-align:center">长安智策 · 西安城市决策空间智能平台</h1>
<h2 style="text-align:center">系统使用手册（操作指南）</h2>

<p style="text-align:center">文档编号：CZ-UM-001 ｜ 版本：V2.0 ｜ 编写日期：2026-09-12</p>
<p style="text-align:center">适用对象：市民 / 游客 / 企业 / 商户 / 政府治理 / 系统管理员</p>

<h2>一、系统概述</h2>
<p>「长安智策」是西安市城市决策空间智能平台，通过<strong>自然语言对话 + 空间地图可视化</strong>，为市民、游客、企业、商户、政府五类用户提供城市空间决策服务，覆盖 99 项功能。</p>
<p><strong>一句话理解</strong>：像聊天一样说出你的需求（比如"哪里有空车位""办证要几步""下暴雨哪里会淹"），系统立刻把答案变成地图、流程、图表展示给你看。</p>

<h3>1.1 首页界面</h3>
<img src="../output/images800/00-首页.jpg" width="800" height="600" />
<p>图 1-1　PC 端首页：顶部全局导航栏 + AI 输入框 + 示例需求，中间五大角色入口，底部 99 项功能搜索</p>

<h3>1.2 五大角色</h3>
<table>
<tr><th>角色</th><th>功能域</th><th>功能数</th></tr>
<tr><td>市民</td><td>市民民生</td><td>24 项（C01–C24）</td></tr>
<tr><td>游客</td><td>游客文旅</td><td>14 项（T01–T14）</td></tr>
<tr><td>企业</td><td>企业全生命周期</td><td>24 项（E01–E24）</td></tr>
<tr><td>商户</td><td>小微商户</td><td>10 项（M01–M10）</td></tr>
<tr><td>政府</td><td>政府治理</td><td>27 项（G01–G27）</td></tr>
</table>

<h2>二、账号注册与登录</h2>
<h3>2.1 登录方式</h3>
<table>
<tr><th>方式</th><th>适用用户</th><th>说明</th></tr>
<tr><td>手机号 + 短信验证码</td><td>全部用户</td><td>最常用，首次登录自动注册</td></tr>
<tr><td>微信扫码登录</td><td>市民/游客</td><td>便捷，绑定手机号后使用</td></tr>
<tr><td>账号密码</td><td>企业/政府/管理员</td><td>由管理员统一分配</td></tr>
<tr><td>政务内网单点登录（SSO）</td><td>政府治理端</td><td>对接政务统一身份认证</td></tr>
</table>

<h3>2.2 登录操作流程</h3>
<ol>
<li>点击顶部导航栏「登录」按钮，进入登录页</li>
<li>输入手机号，获取短信验证码（或选择微信扫码）</li>
<li>输入验证码，点击「登录」完成登录</li>
<li>登录后导航栏右上角显示「个人中心」与「退出」按钮</li>
</ol>
<img src="../output/images800/03-登录页.jpg" width="800" height="600" />
<p>图 2-1　登录页界面</p>

<h3>2.3 注册操作流程</h3>
<ol>
<li>点击顶部导航栏「注册」按钮，进入注册页</li>
<li>选择角色（市民 / 企业 / 政务）</li>
<li>填写手机号、验证码、设置密码</li>
<li>提交完成注册，自动跳转登录</li>
</ol>
<img src="../output/images800/04-注册页.jpg" width="800" height="600" />
<p>图 2-2　注册页界面</p>

<h3>2.4 会员体系</h3>
<p>系统提供四档会员方案，登录后可在「定价方案」页查看对比：</p>
<img src="../output/images800/01-定价方案.jpg" width="800" height="600" />
<p>图 2-3　定价方案页（三档会员 + 免费版对比）</p>
<table>
<tr><th>会员档</th><th>适用对象</th><th>核心权益</th></tr>
<tr><td>免费用户</td><td>所有用户</td><td>基础查询、点位查看</td></tr>
<tr><td>市民高级会员</td><td>市民</td><td>高级分析、方案保存、导出 PDF</td></tr>
<tr><td>企业专业会员</td><td>企业</td><td>选址评估、补贴匹配、产业链分析</td></tr>
<tr><td>政务定制版</td><td>政府</td><td>仿真推演、治理研判、数据驾驶舱</td></tr>
</table>

<h2>三、PC 端操作指南</h2>
<h3>3.1 输入需求进入结果页</h3>
<ol>
<li>在首页输入框用大白话描述需求，如「我想在曲江附近找空余车位」，点击「发送」</li>
<li>系统自动识别意图，显示匹配置信度（如 94%），跳转到 PC 端三栏结果页</li>
<li>三栏结构：左 AI 对话区（28%）、中核心展示区（44%）、右决策分析区（28%）</li>
</ol>
<img src="../output/images800/10-模式A-空间地理(停车).jpg" width="800" height="600" />
<p>图 3-1　PC 三栏工作台：左（AI 对话）中（地图展示）右（决策分析）</p>

<h3>3.2 三栏说明</h3>
<ul>
<li>左 28%：AI 对话区（意图识别过程 + 推荐追问）</li>
<li>中 44%：核心展示区（按 6 类模式自动适配）</li>
<li>右 28%：决策分析区（关键指标 + 洞察 + 可执行动作 + 三按钮）</li>
</ul>

<h2>四、App 端操作指南</h2>
<p>App 端为对话式 AI 界面，对齐移动端聊天应用体验。</p>
<ol>
<li>在 PC 工作台右上角点击「App 端视图」切换，或直接通过移动端打开</li>
<li>底部输入框输入需求，点击发送</li>
<li>点击麦克风按钮开始语音输入，实时转写，说完点「发送这句」或「取消」</li>
<li>AI 回复以气泡呈现，核心展示与决策分析直接内嵌在对话卡片内</li>
</ol>
<img src="../output/images800/20-App端对话流.jpg" width="800" height="600" />
<p>图 4-1　App 端对话界面（顶部标题栏 + AI 回复气泡 + 底部输入框）</p>

<h2>五、六大展示模式使用说明</h2>
<table>
<tr><th>模式</th><th>名称</th><th>怎么用</th><th>交互操作</th></tr>
<tr><td>A</td><td>空间地理类</td><td>查看点位分布、查询周边</td><td>滚轮缩放、拖拽平移、点点位看详情、图层开关</td></tr>
<tr><td>B</td><td>办事流程类</td><td>了解办事步骤与材料</td><td>点击步骤展开材料、点机构看地址</td></tr>
<tr><td>C</td><td>政策清单类</td><td>匹配政策与补贴</td><td>点卡片看申报要点、一键定位办理点</td></tr>
<tr><td>D</td><td>分析评估类</td><td>看评估与短板</td><td>图表动画、表头排序、搜索筛选</td></tr>
<tr><td>E</td><td>仿真推演类</td><td>推演内涝/客流情景</td><td>播放/暂停、拖动时间轴、指标随帧刷新</td></tr>
<tr><td>F</td><td>台账统计类</td><td>盘点与普查</td><td>搜索、筛选、排序、点行定位</td></tr>
</table>

<h3>5.1 模式 A — 空间地理（示例：智慧停车）</h3>
<img src="../output/images800/10-模式A-空间地理(停车).jpg" width="800" height="600" />
<p>图 5-1　模式 A：地图显示停车场余位与违停高发段，右侧给出推荐与风险提示</p>

<h3>5.2 模式 B — 办事流程（示例：车辆年检）</h3>
<img src="../output/images800/11-模式B-办事流程(年检).jpg" width="800" height="600" />
<p>图 5-2　模式 B：中间显示办事步骤流程（环节/机构/时限/材料），点击步骤展开材料清单</p>

<h3>5.3 模式 C — 政策清单（示例：企业补贴）</h3>
<img src="../output/images800/12-模式C-政策清单(企业补贴).jpg" width="800" height="600" />
<p>图 5-3　模式 C：政策卡片（金额/条件/窗口/依据），点卡片看申报要点</p>

<h3>5.4 模式 D — 分析评估（示例：环卫热力）</h3>
<img src="../output/images800/13-模式D-分析评估(环卫热力).jpg" width="800" height="600" />
<p>图 5-4　模式 D：KPI + 图表 + 地图热力，右侧洞察与动作建议</p>

<h3>5.5 模式 E — 仿真推演（示例：内涝仿真）</h3>
<img src="../output/images800/14-模式E-仿真推演(内涝).jpg" width="800" height="600" />
<p>图 5-5　模式 E：时间轴可播放/暂停/拖动，指标随帧刷新</p>

<h3>5.6 模式 F — 台账统计（示例：商铺台账）</h3>
<img src="../output/images800/15-模式F-台账统计(商铺).jpg" width="800" height="600" />
<p>图 5-6　模式 F：统计摘要 + 可筛选排序明细表 + 空间落图</p>

<h2>六、99 项功能完整操作讲解</h2>
<p>以下按五大角色逐项展开全部 99 项功能的操作讲解。每项包含：功能定位、<strong>你可以这样问</strong>（示例提问）、<strong>系统如何回应</strong>（AI 回复）、<strong>界面展示</strong>（中间区呈现内容）、<strong>决策参考指标</strong>（右侧分析）、<strong>可继续追问</strong>（推荐追问）。</p>
<p>统一操作方式：<strong>首页输入框输入对应需求（或点击模块入口）→ 系统识别意图 → 进入结果页 → 按对应模式交互查看</strong>。</p>
'''

# 尾部（章节七~九）
tail = u'''
<h2>七、双端切换与方案管理</h2>
<h3>7.1 双端切换</h3>
<ul>
<li>PC → App：PC 工作台右上角点击「App 端视图」，切换到同一模块的 App 对话界面</li>
<li>App → PC：App 顶部点击「切 PC 端」，回到同一模块的 PC 三栏工作台</li>
<li>切换时当前模块不变，只是展示形态切换</li>
</ul>
<h3>7.2 方案管理</h3>
<table>
<tr><th>操作</th><th>位置</th><th>说明</th></tr>
<tr><td>调整条件重新生成</td><td>右侧决策区底部</td><td>修改条件后重新生成结果</td></tr>
<tr><td>保存方案</td><td>右侧决策区底部</td><td>保存当前结果快照到「我的方案」</td></tr>
<tr><td>导出 PDF</td><td>顶部/右侧</td><td>导出当前结果页为 PDF</td></tr>
<tr><td>我的方案</td><td>首页顶部</td><td>查看所有已保存方案</td></tr>
</table>

<h2>八、后台管理操作</h2>
<table>
<tr><th>模块</th><th>功能</th></tr>
<tr><td>模块管理</td><td>99 项功能上下线、排序、配置、话术</td></tr>
<tr><td>数据管理</td><td>点位、政策、流程、指标维护</td></tr>
<tr><td>用户管理</td><td>账号、角色、权限分配、实名审核</td></tr>
<tr><td>意图训练</td><td>样本管理、模型重训</td></tr>
<tr><td>数据源管理</td><td>外部数据源接入配置、同步、告警</td></tr>
<tr><td>审计日志</td><td>操作留痕、安全审计</td></tr>
</table>

<h2>九、常见问题与故障排查</h2>
<table>
<tr><th>问题</th><th>可能原因</th><th>处理方式</th></tr>
<tr><td>无法登录</td><td>账号未激活/密码错误</td><td>找回密码或联系管理员</td></tr>
<tr><td>意图识别不准</td><td>表达过于模糊</td><td>补充关键词重新描述</td></tr>
<tr><td>地图不显示点位</td><td>地图服务异常/坐标错误</td><td>刷新页面；联系运维检查</td></tr>
<tr><td>停车场余位不更新</td><td>数据源断连</td><td>运维检查数据源同步任务</td></tr>
<tr><td>导出 PDF 失败</td><td>浏览器打印组件异常</td><td>更换浏览器或联系运维</td></tr>
<tr><td>语音转写无反应</td><td>未授权麦克风权限</td><td>开启浏览器麦克风权限</td></tr>
</table>

</body>
</html>
'''

parts = [head]
for role, label in roles:
    parts.append(read('docs/build/_manual_%s.html' % role))
parts.append(tail)

io.open('docs/build/系统使用手册.html', 'w', encoding='utf-8').write('\n'.join(parts))
print('系统使用手册 已重写，含 99 项完整操作讲解')
