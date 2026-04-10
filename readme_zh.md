<div align="right">

[English](readme.md) · [中文](#-openscientist)

</div>

<div align="center">

# 🌍 OpenScientist

[![GitHub stars](https://img.shields.io/github/stars/OpenScientists/OpenScientist?style=social)](https://github.com/OpenScientists/OpenScientist/stargazers) [![GitHub forks](https://img.shields.io/github/forks/OpenScientists/OpenScientist?style=social)](https://github.com/OpenScientists/OpenScientist/fork) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

2015 年：5,154 位科学家联名发表了一篇希格斯玻色子论文。

今天：我们正在开启人类有史以来最大规模的学术合作

**— 🏛️ 为 AGI 建一座亚历山大图书馆，加速自动化科学发现。**

<p align="center">
  <a href="https://openscientists.github.io/OpenScientist/">
    <img src="https://raw.githubusercontent.com/OpenScientists/OpenScientist/main/utils/assets/knowledge-tree-v2.png" alt="Knowledge Tree" width="100%">
  </a>
</p>

<p align="center">
  <a href="https://openscientists.github.io/OpenScientist/">查看交互式知识树 →</a>
</p>

---

<h2 align="center">1. 关于 OpenScientist</h2>

</div>

**科学，是 AI 剩下的最后一个真正重要的问题。** 真正的科学突破需要一种模型不具备的东西：在前沿领域摸爬滚打多年的研究者直觉。

这种直觉活在你的脑子里 — know-how、启发式方法、推理模式、"我就是知道这行不通"的第六感。它从不被写进论文。它会随着你的退休而消亡。

**OpenScientist 在它消失之前把它留住。** 我们把全世界顶尖研究者的隐性知识 — 他们的技能、思维框架和原则 — 变成可复用的 AI agent 技能（兼容 **Claude Code** 和 **Codex CLI**）。每一份贡献，都让现在和未来的每一个 AI 科学家变得更聪明，永久地。

每个 Skill 编码了领域知识、工具、推理协议和常见陷阱。Skill 可以由领域专家手动撰写，也可以通过 `/extract-knowhow` **从你的科研对话中自动提取**。该命令会将你的科研过程重建为一棵**决策树** — 你的每一步行动、每一条放弃的路径、每一个判断 — 再从中提炼出可复用的 Skill。让 AI 调用一个 Skill，就能像领域专家一样思考。

---

<h2 align="center">2. 如何贡献</h2>

### 方式 A：用 `/extract-knowhow` 自动提取（推荐）

```bash
npm install -g @openscientist/extract-knowhow
```

**Claude Code:**
```
/extract-knowhow
```

**Codex CLI:**
```
$extract-knowhow
```

该命令会扫描你的对话历史，将你的科研过程重建为一棵**决策树** — 记录你的每一步行动、每一个成功或失败、每一条放弃的路径及其原因。每个节点被映射为 20 种原子科研动作之一（如 `formulate_hypothesis`、`diagnose_failure`、`pivot`、`validate`），同时记录每一步是谁发起的（你还是 AI）以及背后的推理。

浏览器交互页面让你审核决策树、检查脱敏处理、绑定论文（arXiv/DOI）或项目。提交你的决策树到 OpenScientist，它将成为真实科研轨迹数据集的一部分 — 构建更强 AI 科学家技能的原材料。

### 方式 B：网页版用户一键提取（ChatGPT / Claude / Gemini）

开启记忆功能，让 AI 能访问你的历史：

| 平台 | 如何开启 | 设置链接 |
|------|---------|---------|
| **ChatGPT** | Settings > Personalization > 开启 **Memory** 和 **Reference chat history** | [Settings](https://chatgpt.com/settings) |
| **Claude** | Settings > Capabilities > 开启 **Memory** | [Settings](https://claude.ai/settings/capabilities) |
| **Gemini** | Settings > Personal context > 开启 **Your past chats with Gemini** | [Settings](https://gemini.google.com/settings) |

然后在一个**新对话**中粘贴以下 prompt：

<details>
<summary><b>点击展开完整 prompt</b></summary>

```
回顾我们所有的历史对话，将我的科研过程重建为一棵决策树。只关注科研活动，忽略通用编程、环境配置或闲聊内容。

对每一个有意义的科研动作，创建一个节点，包含以下字段：

- action: 以下 20 种类型之一：
  探索类: search_literature, formulate_hypothesis, survey_methods
  设计类: design_experiment, select_tool, prepare_data
  执行类: implement, run_experiment, debug
  观察类: observe_result, analyze_result, validate
  决策类: compare_alternatives, pivot, abandon, diagnose_failure, plan_next_step
  输出类: write_paper, make_figure, respond_to_review
  （如果都不合适，使用: other: "自由描述"）
- summary: 一句话描述做了什么
- outcome: success | failure | uncertain + 简短说明
- reasoning: 为什么做这一步（动机、依据、直觉）
- tools_used: 涉及的工具、模型或库（没有则为空列表）
- confidence: high | medium | low
- initiator: ai | human | collaborative（谁发起了这个动作？）
- status: active | abandoned | paused

将完整的决策树输出为一个 JSON 代码块，使用以下格式：

{
  "anchor": {
    "type": "paper 或 project",
    "paper_url": "arXiv/DOI 链接（如有）",
    "project_name": "项目名（如无论文）",
    "project_description": "一句话描述"
  },
  "contributor": "我的姓名 (我的机构)",
  "extracted_at": "[今天日期]",
  "nodes": [
    {
      "id": "001",
      "action": "search_literature",
      "summary": "调研了 X 领域的最新方法",
      "outcome": "success: 找到 3 种可行方案",
      "reasoning": "在设计实验前需要了解 SOTA",
      "tools_used": ["Google Scholar"],
      "parent_id": null,
      "confidence": "high",
      "initiator": "human",
      "status": "active"
    }
  ]
}

规则：
- 重建完整的科研轨迹，包括死胡同和被放弃的方向
- 用 parent_id 构建树结构：子动作从触发它的父动作分支出来
- 被放弃的路径标记为 status: "abandoned" — 这些死胡同是最有价值的数据
- 脱敏处理：去除文件路径、用户名、项目名、私有 URL、合作者姓名。保留科学内容（材料、参数、方法）
- 重点捕捉每个动作背后的推理和判断 — 那些永远不会写进论文的直觉
- 不要跳过失败的尝试或放弃的方向 — 它们蕴含隐性知识
- 不要提取通用编程知识、AI 工具使用技巧或教科书基础内容
- JSON 代码块之后，询问是否有遗漏的科研对话
```

</details>

运行后提交：[**提交你的 Skill →**](https://github.com/OpenScientists/OpenScientist/issues/new?template=01-submit-skill.yml)

### 方式 C：手动撰写

参照[模板](skills/_template.md)撰写，然后 [**通过 GitHub Issue 提交 →**](https://github.com/OpenScientists/OpenScientist/issues/new?template=01-submit-skill.yml)

> 没有你的研究方向？[提议新领域 →](https://github.com/OpenScientists/OpenScientist/issues/new?template=04-propose-new-area.md) · 需要某个 Skill？[请求 Skill →](https://github.com/OpenScientists/OpenScientist/issues/new?template=02-skill-request.yml)

---

<h2 align="center">3. 成为审稿人</h2>

审稿人是守护其子领域 Skill 科学质量的领域专家。需要在相关领域有充分的同行评审经验。

**你的职责：** 审核提交的 Skill 的科学准确性和完整性。为贡献者提供建设性反馈。验证通过后将 Skill 状态从 `draft` 提升为 `reviewed`。

**你的权限：** 对所属子领域的提交进行审批或提出修改意见。

[**申请成为审稿人 →**](https://github.com/OpenScientists/OpenScientist/issues/new?template=03-maintainer-application.yml)

---

<h2 align="center">4. 领域列表</h2>

<div align="center">

对齐 [arXiv 分类体系](https://arxiv.org/category_taxonomy)。8 个顶层领域，155 个子领域。

| 领域                                                           | arXiv                                              | 子领域数 | 审稿人   |
| ---------------------------------------------------------------- | ---------------------------------------------------- | ---------- | ---------- |
| ⚛️ Physics 物理                                              | astro-ph, cond-mat, gr-qc, hep, nlin, physics, ... | 51       | *招募中* |
| ➗ Mathematics 数学                                            | math                                               | 32       | *招募中* |
| 💻 Computer Science 计算机科学                                 | cs                                                 | 40       | *招募中* |
| 🧬 Quantitative Biology 定量生物学                             | q-bio                                              | 10       | *招募中* |
| 📊 Statistics 统计学                                           | stat                                               | 6        | *招募中* |
| ⚡ Electrical Engineering & Systems Science 电气工程与系统科学 | eess                                               | 4        | *招募中* |
| 📈 Economics 经济学                                            | econ                                               | 3        | *招募中* |
| 💹 Quantitative Finance 定量金融                               | q-fin                                              | 9        | *招募中* |

[查看全部 155 个子领域（交互式知识树）→](https://openscientists.github.io/OpenScientist/)

</div>

---

## 许可证

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — 自由分享与改编，需注明出处。

---

<div align="center">

## 衷心感谢

感谢所有让这一切成为可能的人：

[**贡献者 →**](https://github.com/OpenScientists/OpenScientist/graphs/contributors) · [**审稿人 →**](https://openscientists.github.io/OpenScientist/reviewers.html) · [**赞助商 →**](https://openscientists.github.io/OpenScientist/organizers.html) · [**组织者 →**](https://openscientists.github.io/OpenScientist/organizers.html)

---

## Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=OpenScientists/OpenScientist&type=Date)](https://star-history.com/#OpenScientists/OpenScientist&Date)

</div>
