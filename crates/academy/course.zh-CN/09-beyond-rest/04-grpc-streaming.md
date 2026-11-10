---
id: grpc-streaming
title: gRPC 流式调用
summary: 一次 gRPC 调用可以携带很多消息：来自服务器、来自客户端，或者两个方向同时。
minutes: 6
lab:
  title: 三种流
  goal: 接收一个服务器流、发一个客户端流，再在一个双向流里打乒乓。
  minutes: 10
  playground: { grpc: true }
  steps:
    - text: |
        在一个指向 `{{grpc}}` 的 gRPC 请求里选 **ServerStream**（它带 **server stream** 徽标）。消息设成 `{"message": "tick", "count": 4}`，按 **发送**。在 **消息** 里看一个个回复到达。
      hints:
        - "ServerStream 会回答 count 次（不写 count 就是 3 次）。你发一条消息，然后只是听。"
        - "打开 URL 左边的方法选择器，选 ServerStream，在消息标签页里输入那段 JSON。"
        - "方法 ServerStream，消息 {\"message\": \"tick\", \"count\": 4}，然后发送。四个回复依次到达，最后是状态 0 OK。"
      check:
        call: { method: grpc.start, params: { request: { method: "*Echo/ServerStream", body: { text: 're:"count"\s*:\s*4\b' } } }, ok: true }
      solution:
        - call: { method: grpc.start, params: { sessionId: lab-grpc-server, request: { name: Echo, kind: grpc, url: "{{grpc}}", method: zorvik.test.v1.Echo/ServerStream, body: { text: '{"message": "tick", "count": 4}' } }, path: null } }
        - wait: 300
    - text: "**最后** 一个回复的 `message` 字段写的是什么？照原样填。"
      hints:
        - "服务器会给回复编号。看你收到的第四条消息。"
        - "收到的消息在消息标签页里带蓝色箭头。打开最后一条。"
        - "服务器会在你的文本后面加 #1、#2……，所以最后一条是 tick #4。"
      check:
        answer: ["tick #4", "tick#4"]
      solution:
        - answer: "tick #4"
    - text: |
        现在试客户端流。选 **ClientStream**，按 **发送** 打开调用：这时什么都不会回来。然后用 **发送消息** 依次发三条消息：`{"message": "red"}`、`{"message": "green"}`、`{"message": "blue"}`。最后按 **结束流**，读那一条回复。
      hints:
        - "客户端流里，服务器会一直等到你说完。结束流就是你说完的方式。"
        - "发送会打开调用。之后消息标签页会出现发送消息和结束流两个按钮：改 JSON、点发送消息，重复。"
        - "选 ClientStream，按发送，然后用发送消息依次发出 {\"message\": \"red\"}、{\"message\": \"green\"} 和 {\"message\": \"blue\"}，再按结束流。回复是 red,green,blue。"
      check:
        all:
          - call: { method: grpc.start, params: { request: { method: "*Echo/ClientStream" } }, ok: true }
          - call: { method: grpc.send, params: { message: "*blue*" }, ok: true }
          - call: { method: grpc.end, ok: true }
      solution:
        - call: { method: grpc.start, params: { sessionId: lab-grpc-client, request: { name: Echo, kind: grpc, url: "{{grpc}}", method: zorvik.test.v1.Echo/ClientStream }, path: null } }
        - call: { method: grpc.send, params: { sessionId: lab-grpc-client, message: '{"message": "red"}' } }
        - call: { method: grpc.send, params: { sessionId: lab-grpc-client, message: '{"message": "green"}' } }
        - call: { method: grpc.send, params: { sessionId: lab-grpc-client, message: '{"message": "blue"}' } }
        - call: { method: grpc.end, params: { sessionId: lab-grpc-client } }
        - wait: 300
    - text: |
        最后，两个方向同时。选 **Bidi**，按 **发送**，然后用 **发送消息** 发 `{"message": "marco"}`。答案立刻回来，而调用还开着。想的话再发一条，然后按 **结束流**。
      hints:
        - "双向流里服务器不会等结束流：它一收到消息就回答。"
        - "按钮和客户端流一样：发送打开调用，发送消息发出，结束流收尾。"
        - "选 Bidi，按发送，输入 {\"message\": \"marco\"}，点发送消息，看回复，然后按结束流。"
      check:
        all:
          - call: { method: grpc.start, params: { request: { method: "*Echo/Bidi" } }, ok: true }
          - call: { method: grpc.send, params: { message: "*marco*" }, ok: true }
      solution:
        - call: { method: grpc.start, params: { sessionId: lab-grpc-bidi, request: { name: Echo, kind: grpc, url: "{{grpc}}", method: zorvik.test.v1.Echo/Bidi }, path: null } }
        - call: { method: grpc.send, params: { sessionId: lab-grpc-bidi, message: '{"message": "marco"}' } }
        - wait: 200
        - call: { method: grpc.end, params: { sessionId: lab-grpc-bidi } }
        - wait: 200
quiz:
  - question: 一个仪表盘打开一次调用，然后连续几分钟接收价格更新。这是哪种？
    options:
      - 一元（Unary）
      - 服务器流
      - 客户端流
    answer: 1
    explain: 客户端发一个请求，服务器在同一次调用上回很多条。
  - question: 在客户端流的调用里，结束流做了什么？
    options:
      - 取消调用并丢弃答案
      - 从头重新开始调用
      - 告诉服务器后面没有消息了，而你仍然能收到它的答案
    answer: 2
    explain: 结束自己这一侧叫「半关闭」。之后服务器发送它的回复和最终状态。
  - question: 双向流有什么特别之处？
    options:
      - 双方都可以在同一条打开的调用上随时发消息
      - 客户端必须把所有消息发完，服务器才能作答
      - 只有服务器能发消息
    answer: 0
    explain: 两个方向彼此独立，适合聊天、游戏和实时协作。
---

到目前为止每个 gRPC 调用都是**一元**的：一条消息进，一条消息出。但 gRPC 跑在 HTTP/2 上，一次调用就是一条**流**：一个可以在每个方向携带任意多条消息、直到某一方结束的通道。方法在 `.proto` 里的定义说明哪些方向是流：

```text
rpc Unary(EchoRequest) returns (EchoReply);
rpc ServerStream(EchoRequest) returns (stream EchoReply);
rpc ClientStream(stream EchoRequest) returns (EchoReply);
rpc Bidi(stream EchoRequest) returns (stream EchoReply);
```

消息类型前面那个 `stream` 就是「很多条」的意思。

| 风格 | 客户端发 | 服务器发 | 现实中的例子 |
|---|---|---|---|
| 一元 | 一条 | 一条 | 取一个用户 |
| 服务器流 | 一条 | 很多条 | 实时价格、分批下发的大报告 |
| 客户端流 | 很多条 | 一条 | 分块上传文件、发一批读数 |
| 双向流 | 很多条 | 很多条 | 聊天、多人游戏、实时翻译 |

## 服务器流

你发一个请求，然后听。回复一条条到达，调用最后以 trailer 里的状态结束。

## 客户端流与「结束流」

你发很多条消息，服务器通常会等到你说完。说完了叫**半关闭**：你关掉*自己*这个方向，但仍然在听。在 Zorvik 里就是 **结束流** 按钮。

```sequence
客户端 -> 服务器: {"message": "red"}
客户端 -> 服务器: {"message": "green"}
客户端 -> 服务器: {"message": "blue"}
客户端 -> 服务器: 结束流（半关闭）
服务器 --> 客户端: {"message": "red,green,blue"}
服务器 --> 客户端: 状态 0 OK
```

## 双向流

双方随时都能发。练习服务器的 **Bidi** 方法一收到消息就立刻作答：

```sequence
客户端 -> 服务器: {"message": "marco"}
服务器 --> 客户端: {"message": "marco"}
客户端 -> 服务器: {"message": "polo"}
服务器 --> 客户端: {"message": "polo"}
Note over 客户端, 服务器: 调用保持打开，直到双方都结束
```

> [!note] 可以这样想……
> 一元是寄一封信、收一封回信。服务器流是订一份报纸。客户端流是口述一封长信，然后听对方说「收到」。双向流是一场实时对话：两个人同时在说、同时在听。

## 在 Zorvik 里

流式方法在选择器里带徽标：**server stream**、**client stream** 或 **bidi**。**发送** 开始调用。服务器流你的消息立刻发出去。客户端流和双向流，**消息** 标签页会出现 **发送消息** 和 **结束流** 按钮，结果面板会随消息流动计数（「已发 N · 已收 M」）。发出的消息带绿色 ↗，收到的带蓝色 ↙。**取消** 可以提前结束调用，它的状态会显示为已取消。

> [!tip] 流也会以状态结束
> 一条发过十条好消息的流，最后仍可能以错误状态收尾。永远要看最终状态和 trailer，而不只看消息。

**什么时候用得上：** 你测的服务会推送订单更新、分批上传遥测数据，或者支撑一个聊天功能。你在 Zorvik 里打开这条流，发出你想发的消息，然后按顺序看完每个回复和最终状态。
