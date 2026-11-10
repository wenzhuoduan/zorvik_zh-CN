---
id: first-load-test
title: 你的第一次负载测试
summary: 负载测试让许多模拟用户同时发送同一个已保存请求，量出服务器扛不扛得住。
minutes: 5
lab:
  title: 面包店的早高峰
  goal: 把一个已保存的请求变成小型负载测试，跑起来并读懂结果。
  minutes: 8
  servers:
    api:
      name: Bakery API
      kind: http
      http:
        routes:
          - method: GET
            path: /breads
            headers: [{ key: Content-Type, value: application/json }]
            body: '[{"name": "Sourdough", "price": 4.2}, {"name": "Rye", "price": 3.8}, {"name": "Baguette", "price": 2.5}]'
            delayMs: 20
  steps:
    - text: |
        负载测试发送的是 **已保存** 的请求。新建一个 `GET {{api}}/breads` 请求，先发送一次确认它能用，然后用 **⌘/Ctrl + S** 保存，命名为 **Breads**。
      hints:
        - Lab 环境已经激活，所以 {{api}} 里就是面包店的地址。
        - 按 ⌘N（Ctrl+N），输入 {{api}}/breads，按发送，然后 ⌘S。
        - 命名为 Breads，保存在集合的最上面。
      check:
        saved:
          request: { name: Breads, method: GET, url: "*/breads" }
      solution:
        - save: { name: Breads, method: GET, url: "{{api}}/breads" }
    - text: |
        在集合里右键 **Breads**，选择 **负载测试…**。在新负载测试里，到 **阶段** 下选 **恒定**，把 **峰值（用户数）** 设为 **2**，**时长（秒）** 设为 **3**。用 **⌘/Ctrl + S** 保存。
      hints:
        - 新的负载测试已经在请求里列出了 Breads。默认计划是 10 个用户跑整整一分钟；你只需要几秒钟。
        - 阶段有三个曲线按钮。恒定表示从第一秒到最后一秒都保持满负荷。
        - 右键 Breads → 负载测试…，然后阶段 → 恒定，峰值（用户数）2，时长（秒）3，最后 ⌘S。
      check:
        saved:
          loadTest:
            targets: [{ request: "*Breads.yaml" }]
      solution:
        - call:
            method: load.create
            params:
              test: &bakeryTest
                name: Breads load test
                targets: [{ request: Breads.yaml }]
                model: virtualUsers
                stages:
                  - { durationSecs: 0, target: 2 }
                  - { durationSecs: 3, target: 2 }
                thresholds:
                  - { metric: p95, op: "<", value: 500 }
                  - { metric: errorRate, op: "<", value: 1 }
    - text: |
        按 **启动**（**⌘/Ctrl + Enter**），看着图表慢慢填满。三秒后这次运行结束，结果会留在屏幕上。
      hints:
        - 负载测试只有在你按启动之后才会发流量。如果测试会把负载发到本机或本地网络之外，Zorvik 会先征求确认；这一次只打在 127.0.0.1 上。
        - 启动按钮在负载测试标签页的右上角。
        - 打开 Breads load test，按启动，等进度条走满。
      check:
        load: { requests: ">0" }
      solution:
        - call:
            method: load.start
            params: { id: Breads load test, test: *bakeryTest }
        - wait: 3500
    - text: |
        读一读结果：**请求/秒**、**p50**、**p95** 和 **p99 延迟**，以及 **错误率**。有多少请求失败了？填这个数字。
      hints:
        - 失败的请求包括网络错误，以及状态码 400 及以上的回答。
        - 看错误率，或者图表下方的状态码面板。
        - 面包店从不失败，所以答案是 0。
      check:
        answer: ["0", "zero", "none", "no", "0%", "0 %"]
      solution:
        - answer: "0"
quiz:
  - question: 什么是虚拟用户？
    options:
      - Zorvik 雇来点你 App 的人
      - 在你数据库里创建的用户账号
      - 一个模拟客户端：发请求、等回答，再发下一个
    answer: 2
    explain: 每个虚拟用户都是 Zorvik 里的一个小循环。十个虚拟用户就是十个这样的循环同时跑。
  - question: 在第一次对一个新服务器跑负载测试之前，该确认什么？
    options:
      - 这台服务器是你的，或者你有权对它做负载测试
      - 服务器在另一个国家
      - 之前没人对它做过负载测试
    answer: 0
    explain: 负载测试会拖慢服务器，影响所有使用它的人。只测你拥有的、或获准测试的系统；如果负载会发到本机或本地网络之外，Zorvik 会先问你。
  - question: 为什么负载测试用已保存的请求，而不是当前打开的标签页？
    options:
      - 没保存的请求更慢
      - 每次运行都必须发送同样、已知的请求，结果才能对比
      - 已保存的请求会跳过鉴权
    answer: 1
    explain: 负载测试是可重复的实验。已保存的请求是稳定的，所以隔一周跑两次，测的是同一件事。
---

发一个请求，只能告诉你 API 答得 *你* 有多快。可周一早上有一千个人同时打开 App 时会怎样？**负载测试** 会在他们之前把答案找出来。

## 负载测试做了什么

负载测试取出一个或多个 **已保存请求**，让许多模拟客户端同时一遍遍地发，持续一段时间。每个模拟客户端就是一个 **虚拟用户**：发一个请求，等回答，再发下一个，就像一个飞快戳 App 的人。

```flow
已保存请求 -> 负载测试 -> 虚拟用户 -> 服务器
服务器 -[作答]-> 结果
```

多少用户、持续多久，由 **阶段** 决定。**恒定** 曲线从开始到结束都保持满负荷。**爬坡、保持、回落** 轻轻起步、维持一阵再慢慢收，像早高峰。**尖峰** 加一段短促的爆发，像限时闪购。

> [!note] 可以这样想……
> 一家餐厅的试营业。正式开业前，老板请 30 个朋友同时点单，看看厨房跟不跟得上。发现油锅太小，总好过在付钱的客人面前发现。

## 读结果

测试运行期间，Zorvik 会画出吞吐量和延迟随时间的变化。结束后，上一课学过的那些数字就摆在那里：

| 结果 | 含义 |
|---|---|
| **请求/秒** | 吞吐量：干完了多少活 |
| **p50 / p95 / p99 延迟** | 典型请求和慢请求分别有多快 |
| **错误率** | 失败请求的占比 |
| **状态码** | 每种状态码各回来了多少个 |

Zorvik 会把每个测试最近 30 次运行留在历史里，之后还能打开更早的运行。

## 从小开始，手下留情

对任何系统的第一次运行都应该小：两三个用户跑几秒，然后一步步加。负载测试发的是真实流量；规模一大，就可能把共享测试服务器拖慢，影响其他所有人。

> [!warning] 只测你有权测的东西
> 向不属于你的服务器发送大量流量，看起来就像攻击。如果负载测试会把流量发到本机或本地网络之外，Zorvik 会先请求确认。本单元里所有测试都只打在 `127.0.0.1` 上。

**什么时候用得上：** 新功能即将上线，有人问：「推送发到五万人手里时，它扛得住吗？」