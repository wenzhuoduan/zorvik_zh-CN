---
id: load-thresholds
title: 用户数、每秒请求数与阈值
summary: 选择用用户数还是固定速率来产生负载，再让阈值自动判定一次运行是否通过。
minutes: 6
lab:
  title: 必须保持敏捷的搜索
  goal: 用固定请求速率对搜索做负载测试，先让阈值通过，再把其中一条调紧到运行失败。
  minutes: 8
  servers:
    api:
      name: Search API
      kind: http
      http:
        routes:
          - method: GET
            path: /search
            headers: [{ key: Content-Type, value: application/json }]
            body: '{"query": "{{request.query.q}}", "results": [{"name": "Hiking boots"}, {"name": "Rain boots"}]}'
            delayMs: 50
  files:
    requests/Search.yaml: "name: Search\nseq: 0\nmethod: GET\nurl: '{{api}}/search?q=boots'\n"
  steps:
    - text: |
        实验已经在你的集合里准备好请求 **Search**。右键它 → **负载测试…**。把 **负载模型** 设为 **请求速率**，在 **阶段** 下选 **恒定**，**峰值（请求/秒）** 填 **20**，**时长（秒）** 填 **3**。保留那两条阈值（p95 延迟低于 500 ms、错误率低于 1%），然后用 **⌘/Ctrl + S** 保存。
      hints:
        - 请求速率按时间表发起请求，不管服务器答得多慢。
        - 负载模型是阶段上方的双向开关。选请求速率时，峰值的单位是每秒请求数。
        - 右键 Search → 负载测试… → 负载模型选请求速率 → 阶段选恒定，峰值 20，时长 3 → ⌘S。
      check:
        saved:
          loadTest:
            model: arrivalRate
            targets: [{ request: "*Search.yaml" }]
            thresholds: [{ metric: p95, op: "<" }]
      solution:
        - call:
            method: load.create
            params:
              test: &searchTest
                name: Search load test
                targets: [{ request: Search.yaml }]
                model: arrivalRate
                stages:
                  - { durationSecs: 0, target: 20 }
                  - { durationSecs: 3, target: 20 }
                thresholds:
                  - { metric: p95, op: "<", value: 500 }
                  - { metric: errorRate, op: "<", value: 1 }
    - text: |
        按 **启动**。运行结束后，**阈值** 面板会显示每条规则是否守住，这次运行也会被标为通过或失败。
      hints:
        - 阈值只在运行结束时检查一次。
        - 搜索大约耗时 50 ms，远低于 500 ms，所以两条阈值都该通过。
        - 在 Search load test 标签页里按启动，等三秒。
      check:
        load: { passed: true, requests: ">0" }
      solution:
        - call:
            method: load.start
            params: { id: Search load test, test: *searchTest }
        - wait: 3500
    - text: |
        现在把规则收紧到服务器做不到的程度。把 p95 阈值改成 **低于 20 ms**，保存，再跑一次。每次搜索大约要 50 ms，所以这次运行必定失败。
      hints:
        - 阈值失败不代表测试坏了。那正是测试在干活：它在告诉你目标没达到。
        - 在阈值里，把「p95 延迟 <」旁边的数值从 500 改成 20。
        - 把 p95 阈值设为 < 20 ms，按 ⌘S，再按启动。让它自己跑完，不要中途停止。
      check:
        load: { passed: false, stoppedEarly: false, requests: ">0" }
      solution:
        - call:
            method: load.save
            params:
              id: Search load test
              test: &strictTest
                name: Search load test
                targets: [{ request: Search.yaml }]
                model: arrivalRate
                stages:
                  - { durationSecs: 0, target: 20 }
                  - { durationSecs: 3, target: 20 }
                thresholds:
                  - { metric: p95, op: "<", value: 20 }
                  - { metric: errorRate, op: "<", value: 1 }
        - call:
            method: load.start
            params: { id: Search load test, test: *strictTest }
        - wait: 3500
quiz:
  - question: 用虚拟用户模式时，服务器突然慢了一倍。它收到的请求数量会怎样？
    options:
      - 保持不变
      - 会下降，因为每个用户要等更久才发下一个请求
      - 会翻倍
    answer: 1
    explain: 虚拟用户会等每个回答，所以服务器越慢，收到的请求越少。请求速率模型则按时间表继续发送，于是变慢表现为排队和更高的延迟。
  - question: 你的 API 每秒收到来自几千部手机的约 200 个请求。哪种模型最贴合？
    options:
      - 虚拟用户，1 个用户
      - 虚拟用户，20 万个用户、思考时间很长
      - 请求速率，200 req/s
    answer: 2
    explain: 许多互相独立的客户端按某个速率到达，不管你服务器在做什么。这正是请求速率模型。
  - question: 一次运行结束时「p95 延迟 < 300 ms」这一条失败了。这说明什么？
    options:
      - 超过 5% 的请求耗时超过 300 ms
      - 负载测试本身坏了
      - 每个请求都超过了 300 ms
    answer: 0
    explain: p95 超过 300 ms，意味着最慢的那 5% 比目标还慢。该去查原因，或者重新定一个现实的目标。
---

上一个实验里，每个虚拟用户发一个请求、等回答、再发下一个。这是产生负载的一种方式。还有第二种，两者的差别比你想的更重要。

## 产生负载的两种方式

**虚拟用户**（*闭环* 模型）：每个用户发送、等回答、可能停一下（**思考时间**），再发。用户数是固定的。服务器一慢，每个用户就等更久，到达的请求也就更少。适合描述「50 个人同时在用这个 App」。

**请求速率**（*开环* 模型）：请求按时间表发起，比如每秒 20 个，不管服务器变得多慢。服务器一慢，请求就堆积，延迟里会看得一清二楚。适合描述「我们的 API 每秒收到来自许多不同客户端的 200 个请求」。

```flow
虚拟用户 -[发送、等待、重复]-> 服务器
请求速率 -[按时间表发起]-> 服务器
```

> [!note] 可以这样想……
> 一家咖啡馆。虚拟用户是十个老顾客，只有拿到咖啡之后才会再点：咖啡师一慢，进来的订单就少，队伍看着还挺短。请求速率则是每隔几秒就推门进来一个人，不管队伍动不动：咖啡师一慢，排的队就明晃晃地长。

> [!warning] 虚拟用户会把慢藏起来
> 因为用户在等，吃力运转的服务器反而收到 *更少* 流量，看起来比实际更健康。如果你知道预期的每秒流量，优先用 **请求速率**。

## 阈值：自动判定通过或失败

每次运行完都盯着图表看，是没法规模化的。**阈值** 是一条运行必须满足的规则，在结束时检查：

```text
p95 latency   < 500 ms
Error rate    < 1 %
Throughput    >= 100 req/s
```

如果每条阈值都守住，这次运行就算 **通过**；有任何一条没过就算 **失败**，Zorvik 会指出是哪条、差了多少。阈值可以作用于整个测试，也可以只作用于某个请求。新负载测试默认带两条合理的阈值：p95 低于 500 ms、错误率低于 1%。

阈值把负载测试变成了每次发布前都能重跑的一件事：跑一遍，绿的，就说明性能目标还站得住。

> [!tip] 目标从哪来？
> 问用户需要什么，而不是服务器今天能做到什么。「搜索框必须在 300 ms 内给出结果，覆盖 95% 的搜索」就是一个目标。把它写成阈值，测试就会盯着你别自欺。

**什么时候用得上：** 团队就一个性能目标达成一致，而你希望以后每次运行都直接给出「还行」或「被我们弄坏了」，不用谁去读图表。