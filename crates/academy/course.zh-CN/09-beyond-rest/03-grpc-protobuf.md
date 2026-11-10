---
id: grpc-protobuf
title: gRPC 与 Protocol Buffers
summary: gRPC 调用另一台电脑上的方法，消息由共享的 .proto 契约定义，以紧凑的二进制传输。
minutes: 6
lab:
  title: 调用一个远端方法
  goal: 通过服务器反射加载一个 gRPC 服务，发一次一元调用，再读一个 gRPC 错误状态。
  minutes: 8
  playground: { grpc: true }
  steps:
    - text: |
        新建一个 gRPC 请求：点标签栏末端的 **+**，选择 **gRPC 请求**。URL 填 `{{grpc}}`，然后点 URL 左边的方法选择器（写着 **Pick method**），让 Zorvik 加载服务器的服务。
      hints:
        - "gRPC 的 URL 以 grpc:// 开头（带 TLS 时是 grpcs://）。Lab 环境里已经存了练习服务器的地址。"
        - "方法选择器就是地址栏左边那个写着 gRPC 的按钮。打开它等于向服务器要它的服务清单（服务器反射）。"
        - "从 + 菜单选 gRPC 请求，在地址栏输入 {{grpc}}，然后点 Pick method。会出现一个包含 zorvik.test.v1.Echo 的列表。"
      check:
        call: { method: grpc.describe, ok: true }
      solution:
        - call: { method: grpc.describe, params: { request: { name: Echo, kind: grpc, url: "{{grpc}}" }, path: null } }
    - text: |
        在 `zorvik.test.v1.Echo` 里选 **Unary** 方法。在 **消息** 标签页里写 `{"message": "Hello, gRPC"}`（或者点 **示例消息** 再改），然后按 **发送**。
      hints:
        - "Unary 是那个没有徽标的方法：一条消息进，一条消息出。"
        - "消息标签页收 JSON。Zorvik 在发送前把它转成 Protocol Buffers 的字节。"
        - "在选择器里选 Unary，在消息标签页输入 {\"message\": \"Hello, gRPC\"}，按发送（⌘/Ctrl + Enter）。状态徽标会显示 0 OK。"
      check:
        call: { method: grpc.invoke, params: { request: { method: "*Echo/Unary" } }, ok: true, result: { status: { code: 0 } } }
      solution:
        - call: { method: grpc.invoke, params: { requestId: lab-grpc, request: { name: Echo, kind: grpc, url: "{{grpc}}", method: zorvik.test.v1.Echo/Unary, body: { text: '{"message": "Hello, gRPC"}' } }, path: null } }
    - text: |
        在 **消息** 标签页里看回复。除了你的 `message`，它把你的整个请求复制到了另一个字段里。那个字段叫什么？
      hints:
        - "回复以 JSON 显示。看它顶层的字段名。"
        - "除了 message、index 和一个空的 messages 列表，还有一个字段装着你还出去的全部内容。"
        - "装着请求副本的那个字段叫 request。"
      check:
        answer: request
      solution:
        - answer: request
    - text: |
        现在调用一个故意失败的方法：选 **Fail**，消息保持 `{}`，按 **发送**。看状态徽标和 **Trailer** 标签页。
      hints:
        - "Fail 永远回一个错误状态。它存在的意义就是让你看看 gRPC 的错误长什么样。"
        - "再打开方法选择器，选 Fail。空消息 {} 就行。"
        - "选 Fail，消息填 {}，按发送。状态是 5 NOT_FOUND。"
      check:
        call: { method: grpc.invoke, params: { request: { method: "*Echo/Fail" } }, result: { status: { name: NOT_FOUND } } }
      solution:
        - call: { method: grpc.invoke, params: { requestId: lab-grpc, request: { name: Echo, kind: grpc, url: "{{grpc}}", method: zorvik.test.v1.Echo/Fail, body: { text: "{}" } }, path: null } }
quiz:
  - question: 什么是 `.proto` 文件？
    options:
      - 一份你调用过的记录
      - 定义某个服务的方法和消息的契约
      - 服务器的 TLS 证书
    answer: 1
    explain: 双方都基于同一份 .proto 文件生成代码，所以对每个方法、字段和类型都一致。
  - question: 一个 gRPC 调用因为对象不存在而失败。你在哪里看到？
    options:
      - 在调用结束时发送的 gRPC 状态里（比如 5 NOT_FOUND）
      - 在 HTTP 状态行里，显示 404
      - 哪里都看不到，gRPC 调用不会失败
    answer: 0
    explain: gRPC 调用的 HTTP 状态几乎总是 200。真正的结论写在 trailer 里的 gRPC 状态中。
  - question: 服务器反射是做什么的？
    options:
      - 把每次调用同时发给第二台服务器做备份
      - 通过缓存应答让调用更快
      - 让客户端问服务器它有哪些服务和消息
    answer: 2
    explain: 有了反射，像 Zorvik 这样的工具不用 .proto 文件就能列出方法、拼出消息。
---

**RPC**（remote procedure call，远程过程调用）的意思是：调用一个跑在另一台电脑上的函数，就像它在你自己的程序里一样，用 `getUser(42)`，而不是「拼一个 URL、发 GET、解析 JSON」。**gRPC** 是一个流行的开源 RPC 框架，出自 Google。你最常在公司内部*服务之间*遇到它，以及那些要求快的应用里。

## 三个核心概念

1. **契约先行。** 方法和消息写在 `.proto` 文件里。双方都从它生成代码，所以对每个字段和类型都一致。
2. **Protocol Buffers**（protobuf）是消息格式：紧凑的*二进制*，不是文本。每个字段以「编号 + 值」发送，比 JSON 更小、读起来更快，但不能直接给人看。这正是 Zorvik 帮你的地方：你写 JSON，它来转换。
3. **HTTP/2** 承载这些调用。一条连接同时处理很多调用，数据可以双向同时流动（下一课讲流式时会用到）。

```anatomy
service Echo { | 一个服务：一组方法
rpc Unary(EchoRequest) returns (EchoReply); | 一个方法：一条消息进，一条消息出
message EchoRequest { | 一条消息：一条带类型的记录
string message = 1; | 一个字段：类型、名字和编号
int32 count = 2; | 编号在网络上标识字段，所以名字可以安全地改
```

这是练习服务器自己那份 `.proto` 的片段。每个字段有一个**类型**（`string`、`int32`、另一条消息……）和一个**字段编号**，编号一旦用过就绝不能重复。

```layers
gRPC | 服务和方法的集合，例如 zorvik.test.v1.Echo/Unary
Protocol Buffers | 以紧凑二进制编码的消息
HTTP/2 | 一条连接上很多调用，双向流
TLS（可选） | 加密，URL 以 grpcs:// 开头时启用
TCP | 可靠的字节流
```

> [!note] 可以这样想……
> 按编号从目录里订货。目录（`.proto`）事先印好，双方各有一份，所以你的订单可以短到「12 号商品，3 号尺码」。没人需要再解释 12 号是什么。

## 服务器反射

要把你的 JSON 变成 protobuf 字节，Zorvik 需要 `.proto` 定义。它有两个来源：

- **Proto 文件：** 在请求的 **Proto 文件** 标签页里加上团队的 `.proto` 文件。
- **服务器反射：** 很多服务器能描述自己。Zorvik 一问，服务器就把定义发过来。练习服务器支持这个。

```sequence
Zorvik -> 服务器: 反射：你有哪些服务？
服务器 --> Zorvik: zorvik.test.v1.Echo：Unary、ServerStream…
Zorvik -> 服务器: Echo/Unary {"message": "Hello, gRPC"}
服务器 --> Zorvik: {"message": "Hello, gRPC", …} + 状态 0 OK
```

## 状态码与 metadata

gRPC 有自己的**状态码**，在每次调用最后的 **trailer**（数据之后到达的头）里发送：`0 OK`、`3 INVALID_ARGUMENT`、`5 NOT_FOUND`、`7 PERMISSION_DENIED`、`14 UNAVAILABLE` 等等。底下的 HTTP 状态几乎是 200，所以要看的是 gRPC 状态。在 gRPC 里请求头叫 **metadata**，鉴权令牌就走这里。

在 Zorvik 里，gRPC 请求有 **消息**、**Metadata**、**Proto 文件**、**鉴权**、**设置** 和 **文档** 几个标签页。**发送** 发起调用，结果面板显示 **消息**、**Headers**、**Trailer**、**请求元数据** 和 **时序**。

**什么时候用得上：** 你的后端服务之间用 gRPC 通信，而你需要直接调其中一个：复现一个 bug、看某个服务对某个客户返回什么、或者看它怎么报错——都不用先写一个客户端程序。
