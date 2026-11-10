---
id: graphql-subscriptions
title: "GraphQL 订阅：源源不断的结果"
summary: 订阅是一种保持打开的 GraphQL 操作。每当有事发生，服务器就通过 WebSocket 或 Server-Sent Events 推一个结果过来。
minutes: 5
added: 0.2.0
lab:
  title: tick、tick、tick
  goal: 通过 WebSocket 订阅、改变订阅要的东西，再改用 Server-Sent Events 订阅。
  minutes: 6
  playground: true
  steps:
    - text: |
        新建一个 GraphQL 请求（标签栏末端的 **+** → **GraphQL 请求**），URL 填 `{{playground}}/graphql-ws`，查询写 `subscription { tick }`。**发送** 按钮会变成 **订阅**：按它，然后看结果一条条到达，直到服务器完成这次订阅。
      hints:
        - "订阅的写法和查询一样，只是关键字用 subscription 而不是 query。"
        - "在查询编辑器里输入 subscription { tick }。Zorvik 一看到 subscription 这个词，主按钮就会变成订阅。"
        - "URL {{playground}}/graphql-ws，查询 subscription { tick }，按订阅。日志里会出现三个结果（{\"data\":{\"tick\":1}} 之类），然后显示服务器已完成订阅。"
      check:
        call: { method: socket.connect, ok: true, params: { request: { body: { graphql: { query: "*subscription*" } } } } }
      solution:
        - call:
            method: socket.connect
            params:
              connId: lab-subscription
              path: null
              request: { name: Ticks, method: POST, url: "{{playground}}/graphql-ws", body: { type: graphql, graphql: { query: "subscription { tick }" } } }
        - wait: 300
    - text: |
        订阅也可以像查询一样用变量。这个练习服务器会按变量 `count` 发的次数发送 tick。把 **变量** 设成 `{"count": 5, "intervalMs": 300}` 再订阅一次。最后一个 tick 的编号是多少？
      hints:
        - "变量编辑器在查询下面，有自己独立的标签页。"
        - "把变量换成 {\"count\": 5, \"intervalMs\": 300} 再按订阅。现在每 0.3 秒来一个 tick。"
        - "最后一个结果写的是 {\"data\":{\"tick\":5}}：填 5。"
      check:
        all:
          - call: { method: socket.connect, ok: true, params: { request: { body: { graphql: { variables: "*count*" } } } } }
          - answer: "5"
      solution:
        - call:
            method: socket.connect
            params:
              connId: lab-subscription
              path: null
              request:
                name: Ticks
                method: POST
                url: "{{playground}}/graphql-ws"
                body: { type: graphql, graphql: { query: "subscription { tick }", variables: '{"count": 5, "intervalMs": 10}' } }
        - wait: 300
        - answer: "5"
    - text: |
        有些服务器用 **Server-Sent Events** 而不是 WebSocket 来推订阅。打开 **变量** 旁边的 **订阅** 标签页，选 **SSE**，把 URL 改成 `{{playground}}/graphql-sse`，再订阅一次。
      hints:
        - "订阅标签页只在操作是订阅时才出现。里面有传输方式、一个单独的 URL 和连接参数。"
        - "点变量旁边的订阅，再选 SSE。在地址栏填 {{playground}}/graphql-sse，然后按订阅。"
        - "订阅标签页 → SSE，URL {{playground}}/graphql-sse，订阅。日志里的「已连接」那一行现在会写 GraphQL over SSE。"
      check:
        call: { method: socket.connect, ok: true, params: { request: { body: { graphql: { transport: sse } } } } }
      solution:
        - call:
            method: socket.connect
            params:
              connId: lab-subscription
              path: null
              request:
                name: Ticks
                method: POST
                url: "{{playground}}/graphql-sse"
                body: { type: graphql, graphql: { query: "subscription { tick }", transport: sse } }
        - wait: 300
quiz:
  - question: 订阅和查询的本质区别是什么？
    options:
      - 它保持打开，每当有事发生时服务器就发一个新结果
      - 它会像 mutation 一样改动服务器上的数据
      - 它返回 schema 而不是数据
    answer: 0
    explain: 查询只回答一次。订阅把线路一直开着，每个新事件都推一个结果。
  - question: 服务器用 4403 关闭了你订阅的 WebSocket。先查什么？
    options:
      - 查询有没有拼错
      - 凭证，通常在连接参数里
      - 服务器是否支持 HTTP/2
    answer: 1
    explain: "4403 意思是禁止访问。服务器通常从 connection_init 里发的连接参数读鉴权令牌，或者从请求头读。"
  - question: 你们团队的服务器跑的是 Apollo Server 3。用哪种传输？
    options:
      - WebSocket（旧版），subscriptions-transport-ws 协议
      - WebSocket，graphql-transport-ws 协议
      - "都不行：Apollo Server 3 没有订阅功能"
    answer: 0
    explain: Apollo Server 2 和 3 说的是较旧的 subscriptions-transport-ws 协议。更新的服务器（Apollo Server 4、graphql-ws、Hasura）说 graphql-transport-ws。
---

查询问一次、答一次。mutation 改动点东西、答一次。但有些界面需要知道**事情发生的那一刻**：一条新聊天消息、一次价格更新、一个构建完成。为此 GraphQL 有第三类操作：**订阅**。

```graphql
subscription OnMessage($room: ID!) {
  messageAdded(room: $room) {
    author
    text
  }
}
```

它看起来像查询，但你拿到的不是一个答案，而是一串答案，每个的形状都完全是订阅所要的样子。

## 它在网上怎么走

普通 HTTP 只答一次，所以订阅需要一条保持打开的连接。大多数服务器用 **WebSocket**，上面再跑一个小协议：

```sequence
客户端 -> 服务器: connection_init（参数里带鉴权令牌）
服务器 --> 客户端: connection_ack
客户端 -> 服务器: subscribe（操作及其变量）
服务器 --> 客户端: next（一个结果）
服务器 --> 客户端: next（又一个结果）
服务器 --> 客户端: complete
```

这样的协议有两种，服务器说其中一种：

| 传输 | 协议 | 常见服务器 |
|---|---|---|
| **WebSocket** | `graphql-transport-ws` | graphql-ws 库、Apollo Server 4+、Hasura |
| **WebSocket（旧版）** | `subscriptions-transport-ws` | Apollo Server 2 和 3 |
| **SSE** | graphql-sse | GraphQL Yoga 等 |

SSE 的方式更简单：客户端用一个普通 POST 发出操作，服务器用事件流作答，每个结果一个 `next` 事件。

> [!note] 可以这样想……
> 查询是一通电话：你问，对方答，你挂掉。订阅是一份订阅刊物：你订一次，之后每期自己送到，直到你退订。

## 订阅的鉴权

浏览器没法给 WebSocket 设置请求头，所以很多服务器改从**连接参数**里读令牌：一个在 `connection_init` 里发出的 JSON 对象，比如 `{"authToken": "…"}`。在 Zorvik 里它在 **订阅** 标签页，旁边是传输方式和一个可选的单独 URL（有些服务器把自己的订阅放在别的路径上，比如 `/subscriptions`）。

服务器拒绝时，关闭码会说明原因：`4401` 表示它要凭证，`4403` 表示你给的凭证不被允许。

## 测试订阅

在应用里，订阅是实时的：结果随发生而到达。在**集合运行**里（以及在 CI 里用 `zorvik run`），Zorvik 会一直读订阅，直到读到一定数量的结果或到了时间上限（请求的 **设置**，**在集合运行时**），然后它的测试一次性看到所有结果：

```js
pm.test("the first three ticks arrive in order", () => {
  const ticks = pm.response.json().map((r) => r.data.tick);
  pm.expect(ticks).to.eql([1, 2, 3]);
});
```
