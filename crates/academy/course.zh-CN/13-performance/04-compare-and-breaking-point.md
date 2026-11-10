---
id: breaking-point
title: 对比多次运行，找出崩溃点
summary: 一步步加大负载，把每次运行和上一次对比；崩溃点就是吞吐量不再增长、延迟开始飙升的地方。
minutes: 6
lab:
  title: 结账能扛多少？
  goal: 跑一个基线，再用四倍用户跑一次，然后对比两次运行。
  minutes: 8
  servers:
    api:
      name: Checkout Service
      kind: http
      http:
        routes:
          - method: GET
            path: /checkout
            headers: [{ key: Content-Type, value: application/json }]
            body: '{"items": 3, "total": 42.9, "currency": "EUR"}'
            delayMs: 100
  files:
    requests/Checkout.yaml: "name: Checkout\nseq: 0\nmethod: GET\nurl: '{{api}}/checkout'\n"
    loadtests/Checkout load test.yaml: |
      name: Checkout load test
      seq: 0
      targets:
        - request: Checkout.yaml
      model: virtualUsers
      stages:
        - durationSecs: 0
          target: 2
        - durationSecs: 3
          target: 2
      thresholds:
        - metric: p95
          op: "<"
          value: 500
        - metric: errorRate
          op: "<"
          value: 1
  steps:
    - text: |
        实验已经准备好 **Checkout load test**：2 个虚拟用户跑 3 秒，目标是每次回答约 100 ms 的结账接口。从左侧栏的 **负载测试** 打开它，按 **启动**。这一次运行就是你的 **基线**。
      hints:
        - 基线就是你拿来对比其他所有运行的那一次。让它小一点、简单一点。
        - 把鼠标停在左侧栏的图标上找到负载测试，然后点 Checkout load test。
        - 负载测试 → Checkout load test → 启动。等运行结束。
      check:
        load: { name: Checkout load test, requests: ">0" }
      solution:
        - call:
            method: load.start
            params:
              id: Checkout load test
              test:
                name: Checkout load test
                targets: [{ request: Checkout.yaml }]
                model: virtualUsers
                stages:
                  - { durationSecs: 0, target: 2 }
                  - { durationSecs: 3, target: 2 }
                thresholds:
                  - { metric: p95, op: "<", value: 500 }
                  - { metric: errorRate, op: "<", value: 1 }
        - wait: 3500
    - text: |
        加一档：把 **峰值（用户数）** 设为 **8**，用 **⌘/Ctrl + S** 保存，再按一次 **启动**。
      hints:
        - 一次只改一样，这样出现差别时你知道是谁造成的。
        - 峰值（用户数）在阶段那一段里，紧挨着时长（秒）。
        - 峰值（用户数）填 8，⌘S，启动，等它跑完。
      check:
        load: { name: Checkout load test, rps: ">=45" }
      solution:
        - call:
            method: load.save
            params:
              id: Checkout load test
              test: &eightUsers
                name: Checkout load test
                targets: [{ request: Checkout.yaml }]
                model: virtualUsers
                stages:
                  - { durationSecs: 0, target: 8 }
                  - { durationSecs: 3, target: 8 }
                thresholds:
                  - { metric: p95, op: "<", value: 500 }
                  - { metric: errorRate, op: "<", value: 1 }
        - call:
            method: load.start
            params: { id: Checkout load test, test: *eightUsers }
        - wait: 3500
    - text: |
        按结果上方的 **对比**，选中基线。**请求/秒** 涨了大约四倍，而 **p95 延迟** 还停在 100 ms 附近：还没到崩溃点。

        每次结账要 100 ms。**一个** 虚拟用户每秒最多能发多少个请求？填这个数字。
      hints:
        - 一个用户发出请求，等回答，然后发下一个。
        - 一秒是 1000 ms。1000 ms 里能塞下几个 100 ms 的回答？
        - 1000 ms ÷ 100 ms = 每个用户每秒 10 个请求。
      check:
        answer: ["10", "ten", "10 req/s", "10 requests per second", "10/s"]
      solution:
        - answer: "10"
quiz:
  - question: 你把用户数翻倍，吞吐量也跟着翻倍，p95 保持不变。这说明什么？
    options:
      - 服务器还有余量；你还没到崩溃点
      - 服务器刚崩了
      - 测试错了，吞吐量不可能翻倍
    answer: 0
    explain: 健康的扩展看起来就是这样。继续加档，直到吞吐量不再增长，或者延迟和错误开始爬升。
  - question: 哪种现象标志着崩溃点？
    options:
      - 用户更多、吞吐量更高，延迟不变
      - 用户更多，但吞吐量持平，p95 和错误率却在爬升
      - 用户更少、延迟更低
    answer: 1
    explain: 到了拐点，服务器每秒干不了更多活，多出来的用户只能排队，而排队会先体现在延迟上，然后是超时和错误。
  - question: 每次回答要 200 ms。要跑出每秒 50 个请求，大约需要多少个虚拟用户？
    options:
      - "5"
      - "50"
      - "10"
    answer: 2
    explain: 一个用户每秒最多发 1000 ÷ 200 = 5 个请求，所以要 50 req/s 大约需要 10 个用户（吞吐量 = 用户数 ÷ 每个请求的耗时）。
---

「我们能扛多少用户？」是软件里最常见的问题之一，也是最常靠拍脑袋回答的问题之一。其实你可以量出来：一步步加大负载，把每次运行和上一次 **对比**。

## 加档、对比、再来

```flow
基线运行 -> 加大负载 -> 与上一次运行对比
与上一次运行对比 -[仍然健康]-> 加大负载
与上一次运行对比 -[找到拐点]-> 记下来
```

先跑一个小的、平静的 **基线**。然后把负载翻倍，再跑一次，做对比。两次运行之间只改一样东西，并且保持同一个测试、同一份数据、同一批机器，否则对比毫无意义。

在 Zorvik 里打开一次运行，按 **对比** 挑同一个测试更早的一次运行。两次运行会并排显示，每个数字还带着 **变化**：吞吐量、错误率和延迟百分位，变好标绿，变差标红。

## 崩溃点长什么样

这是一个忙碌服务器的、贴近真实场景的加档测试：

| 用户数 | 请求/秒 | p95 延迟 | 错误率 |
|---|---|---|---|
| 10 | 98 | 110 ms | 0% |
| 20 | 195 | 115 ms | 0% |
| 40 | 310 | 180 ms | 0% |
| 80 | 330 | 620 ms | 0.4% |
| 160 | 325 | 1.9 s | 6% |

到 40 个用户为止，用户越多干完的活越多。再往上，吞吐量不再增长，延迟却炸开，错误也开始出现。这个弯叫 **拐点**，也就是你的崩溃点：落在 40 到 80 个用户之间。多出来的用户并不能多干活，他们只是在排队。

> [!note] 可以这样想……
> 一家有四个收银台的超市。顾客越多卖得越多，直到四台收银机全忙起来。再往后，多进来的顾客并不会买得更快；队伍只会更长，最后有人放弃走掉（错误）。

## 一个好用的经验公式

对虚拟用户来说，有一个简单的关系（叫 *利特尔法则*）：

```text
throughput  =  users ÷ time per request
8 users ÷ 0.1 s  =  80 requests per second
```

它告诉你该 *期待* 什么。如果你测到的远低于它预测的，就说明有东西在等：队列、锁，或者慢数据库。

> [!warning] Mock 永远不会坏
> 这个实验里的结账接口是个 Mock：它只是等 100 ms，你并行多少次都行，所以吞吐量一直涨。真实服务器会耗尽工作线程、数据库连接或 CPU。请在一个像生产环境的测试系统上找它的拐点，绝不要直接在生产环境上找。

**什么时候用得上：** 产品经理问「去年流量的两倍，黑色星期五我们扛得住吗？」，而你希望用一张运行记录表回答，而不是耸耸肩。