---
id: why-realtime
title: "为什么需要实时？轮询与推送"
summary: 一遍遍问「有新消息吗」又慢又浪费；用推送，事情一发生服务器就告诉你。
minutes: 5
lab:
  title: 我的披萨到哪了？
  goal: 先用轮询跟踪一单，再让服务器主动推送更新，体会两者的差别。
  minutes: 6
  servers:
    shop:
      name: 披萨店
      kind: http
      http:
        routes:
          - method: GET
            path: /orders/:id
            headers:
              - key: Content-Type
                value: application/json
            body: '{"order": "{{request.params.id}}", "status": "in the oven"}'
    live:
      name: 披萨追踪器
      kind: sse
      sse:
        intervalMs: 600
        events:
          - { event: status, data: in the oven }
          - { event: status, data: boxed }
          - { event: status, data: on the way }
          - { event: status, data: "delivered, door code {{secret.code}}" }
  steps:
    - text: |
        **轮询。** 像一个等不及的 App 那样，连发三次 `GET {{shop}}/orders/42`。每次看看 `status`。
      hints:
        - "轮询就是一遍又一遍问同一个问题。连按三次发送就行。"
        - "新建一个 HTTP 请求（⌘/Ctrl + N），输入 {{shop}}/orders/42 按发送，然后再按两次。"
        - "GET {{shop}}/orders/42，发三次。每次答案都是 in the oven：连着三次都没有新消息。"
      check:
        request: { server: shop, method: GET, path: /orders/42, count: 3 }
      solution:
        - send: { method: GET, url: "{{shop}}/orders/42" }
        - send: { method: GET, url: "{{shop}}/orders/42" }
        - send: { method: GET, url: "{{shop}}/orders/42" }
    - text: |
        **推送。** 点标签栏末端的 **+**，选择 **事件流（SSE）**。地址填 `{{live}}/orders/42`，按 **连接**。接下来只管看着：更新自己会来，一直到披萨送到。
      hints:
        - "这次你只问一次，然后把线路一直开着。服务器有变化就发一条。"
        - "+ 菜单里有「事件流（SSE）」。连接按钮就在平时发送按钮的位置。"
        - "建一个事件流（SSE）请求，地址 {{live}}/orders/42，按连接，等几秒就会收到 delivered 那条更新。"
      check:
        message: { server: live, direction: out, text: "delivered*" }
      solution:
        - call: { method: sse.connect, params: { connId: lab-sse, request: { name: Pizza tracker, kind: sse, url: "{{live}}/orders/42" } } }
        - wait: 2000
    - text: 最后一条更新带了一个门禁码。把它填在这里。
      hints:
        - "它在流日志里最后一条事件的 data 里。"
        - "点日志最后一行（delivered 那条）就能看到完整数据。追踪器自己的流量里也有：在服务器里打开 Lab · 披萨追踪器。"
        - "最后一条事件的数据是：delivered, door code …，把 door code 后面那个码复制下来。"
      check:
        answer: "{{secret.code}}"
      solution:
        - answer: "{{secret.code}}"
        - call: { method: sse.close, params: { connId: lab-sse } }
quiz:
  - question: 轮询最主要的缺点是什么？
    options:
      - 大多数请求都空手而归，而且消息会迟到（最多迟一个轮询间隔）
      - 它需要浏览器不支持的特殊协议
      - 服务器不允许对同一个 GET 作答两次
    answer: 0
    explain: 轮询把请求花在「没有变化」上，而且只有下一次轮询时你才看到变化。
  - question: 一个网页只需要在服务器发更新时接收。哪种最合适？
    options:
      - 每 100 毫秒轮询一次
      - Server-Sent Events（SSE）
      - 每条更新发一个 UDP 数据报
    answer: 1
    explain: "SSE 就是为这个场景造的：一个 HTTP 请求，之后服务器顺着它往下推事件。"
  - question: 几千个传感器在发读数，很多 App 各要其中一部分。哪种最合适？
    options:
      - 每个传感器一个 REST 接口，所有 App 都去轮询
      - 每个 App 到每个传感器建一条 WebSocket
      - 用 MQTT，中间放一个 broker
    answer: 2
    explain: "MQTT 的 broker 把发送方和接收方解耦：传感器往主题上报，App 订阅自己关心的主题。"
---

有些信息一直在变：聊天、外卖进度、股价、传感器的温度。你的 App 想在**变化发生的那一刻**就知道。有两种办法。

## 轮询：「到了没？」

App 每隔几秒就问服务器一次「有新消息吗」。通常答案是「没有」。

```sequence
App -> 服务器: GET /orders/42
服务器 --> App: in the oven
App -> 服务器: GET /orders/42
服务器 --> App: in the oven
App -> 服务器: GET /orders/42
服务器 --> App: boxed
```

轮询简单，而且任何 HTTP API 都能用，但代价是：

- **白费力气。** 大多数请求什么都没拿到，可每一次都要花手机电量、网络和服务器的资源。
- **延迟。** 变化只有在下一次轮询时才被发现。每 30 秒轮询一次，你就最多迟 30 秒；轮询得更勤，浪费又更多。

*长轮询*是介于两者之间的技巧：服务器把请求挂着，等到有消息才作答，App 拿到后立刻再问一次。

## 推送：「我会告诉你」

用**推送**，App 打开一条连接并保持它。事情一发生，服务器就顺着这条连接发消息过来。

```sequence
App -> 服务器: 为 42 号订单打开一条流
服务器 --> App: in the oven
Note over 服务器: ……过了几分钟，什么都没发
服务器 --> App: boxed
服务器 --> App: on the way
服务器 --> App: delivered
```

没有白问，也没有延迟。代价是：服务器必须同时维持很多条连接，而 App 必须发现连接断了并重新打开。有些办公网络和代理还会掐掉长时间没有数据的连接，所以真实的 App 常常两者并用：连着的时候靠推送，再留一个慢轮询当兜底。

> [!note] 可以这样想……
> 轮询是路上每隔一分钟问一句「快到了吗？」的小孩。推送是司机说「到了我告诉你」，而且真的会告诉你。

## 这一单元涉及的推送技术

| 技术 | 方向 | 典型用途 |
|---|---|---|
| **WebSocket** | 双向，随时 | 聊天、游戏、实时协作 |
| **Server-Sent Events**（SSE） | 只从服务器到客户端，跑在普通 HTTP 上 | 通知、比分直播、AI 回答逐字输出 |
| **MQTT** | 通过 broker 发布/订阅 | 传感器、智能家居、设备集群 |
| **Socket.IO** | 双向，以命名事件的形式，跑在 WebSocket 或长轮询上 | 聊天室、多人游戏、实时看板 |

（服务器之间的推送也有：**webhook** 就是事情发生时服务器来调*你的* URL。）

实验里你会用两种办法跟踪一份披萨。先轮询披萨店的订单接口，再打开一条事件流，什么都不做，等追踪器把每个变化推给你。

**什么时候用得上：** 产品经理问「为什么看板上的新订单要晚一分钟？」你能认出这是轮询，能量出它问得多勤，也知道推送才是解法。
