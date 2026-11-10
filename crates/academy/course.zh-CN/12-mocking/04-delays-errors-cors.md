---
id: mock-failures
title: 延迟、错误与 CORS
summary: 好的 Mock 也会故意状态不好，让你看清 App 怎么应对慢应答、错误和浏览器规则。
minutes: 6
lab:
  title: 一个会闹脾气的结账流程
  goal: 搭一个浏览器页面能调的结账 Mock，让它答得慢，也让它故意失败。
  minutes: 10
  steps:
    - text: |
        网页团队的结账页跑在浏览器里，地址是 `http://localhost:5173`。新建一个 **Mock API (HTTP)**，命名为 **Checkout Mock**，在 **浏览器访问** 下打开 **允许跨源请求（CORS）**，按 **启动**。

        之后实验会像浏览器那样问你的 Mock：那个页面能不能给它发 `POST`。
      hints:
        - "只有当服务器允许时，浏览器才让页面读取另一个地址的答案。CORS 开关做的就是这件事。"
        - "在服务器标签页里往下滚，路由下面是浏览器访问。开关在启动前后都有效。"
        - "服务器 → ＋ → Mock API (HTTP) → Checkout Mock → 创建；打开「允许跨源请求（CORS）」；按启动。"
      check:
        probe:
          kind: http
          name: Checkout Mock
          method: OPTIONS
          path: /payments
          headers:
            Origin: http://localhost:5173
            Access-Control-Request-Method: POST
          expect:
            status: 204
            headers: { access-control-allow-origin: "http://localhost:5173" }
      solution:
        - call:
            method: server.create
            params:
              server: &checkout
                name: Checkout Mock
                kind: http
                port: 0
                http:
                  cors: true
                  routes:
                    - method: GET
                      path: /hello
                      status: 200
                      headers: [{ key: Content-Type, value: application/json }]
                      body: "{\n  \"message\": \"Hello from Zorvik\"\n}"
        - call:
            method: server.save
            params: { id: Checkout Mock, server: *checkout }
        - call:
            method: server.start
            params: { id: Checkout Mock, server: *checkout }
    - text: |
        一个慢吞吞的购物车。加一条 `GET /cart` 路由，答 `{"items": 2, "total": 18.5}`，把它的 **延迟（毫秒）** 设成 **1500**，然后保存（**⌘/Ctrl + S**）。

        自己也发一个请求试试，体会页面转圈的那一瞬间：一秒半什么都没有。
      hints:
        - "延迟在路由的「行为」一节里。Mock 会先等那么久再作答。"
        - "添加路由，路径 /cart，粘上正文，然后 行为 → 延迟（毫秒）→ 1500。保存下来延迟才会写进文件。"
        - "路由 GET /cart，状态 200，正文 {\"items\": 2, \"total\": 18.5}，延迟（毫秒）1500，然后 ⌘S。"
      check:
        all:
          - probe:
              kind: http
              name: Checkout Mock
              path: /cart
              expect:
                status: 200
                json: { total: 18.5 }
          - saved:
              server:
                name: Checkout Mock
                http:
                  routes: [{ path: /cart, delayMs: ">=1000" }]
      solution:
        - call:
            method: mock.addRoute
            params:
              serverId: Checkout Mock
              route:
                method: GET
                path: /cart
                status: 200
                headers: [{ key: Content-Type, value: application/json }]
                body: '{"items": 2, "total": 18.5}'
                delayMs: 1500
    - text: |
        支付系统在维护。加一条 `POST /payments` 路由，回 **503**，带 `Retry-After: 30` 头，正文是 `{"error": "Payments are down for maintenance"}`。
      hints:
        - "503 Service Unavailable 的意思是「现在不行，过会儿再试」。Retry-After 说明过多少秒。"
        - "添加路由，方法选 POST，填好路径并在状态框里输入 503。请求头在「响应头」里加。"
        - "POST /payments，状态 503，请求头 Retry-After: 30，正文 {\"error\": \"Payments are down for maintenance\"}。"
      check:
        probe:
          kind: http
          name: Checkout Mock
          method: POST
          path: /payments
          headers: { Content-Type: application/json }
          body: '{"amount": 18.5}'
          expect:
            status: 503
            headers: { retry-after: "30" }
      solution:
        - call:
            method: mock.addRoute
            params:
              serverId: Checkout Mock
              route:
                method: POST
                path: /payments
                status: 503
                headers:
                  - { key: Content-Type, value: application/json }
                  - { key: Retry-After, value: "30" }
                body: '{"error": "Payments are down for maintenance"}'
    - text: |
        混沌时间。加一条 `GET /stock` 路由，把它的 **故障** 设成 **错误（500）**，**触发频率（%）** 设 100。现在每次库存检查都会报错，不管正文写的是什么。

        之后可以试试 25%：四次里失败一次，像一个不稳定的服务器。
      hints:
        - "故障会替换路由的正常回答。错误（500）回的是 500 Internal Server Error。"
        - "添加路由，路径 /stock；在「行为」里选 故障 → 错误（500），触发频率保持 100。"
        - "GET /stock，正文随便，行为 → 故障：错误（500），触发频率（%）：100。"
      check:
        probe:
          kind: http
          name: Checkout Mock
          path: /stock
          expect:
            status: 500
      solution:
        - call:
            method: mock.addRoute
            params:
              serverId: Checkout Mock
              route:
                method: GET
                path: /stock
                status: 200
                headers: [{ key: Content-Type, value: application/json }]
                body: '{"inStock": true}'
                fault: error
quiz:
  - question: 你的请求在 Zorvik 里能通，但浏览器里的同一个调用被拦住了。最可能的原因是什么？
    options:
      - Mock 太慢
      - 路由的路径写错了
      - Mock 不允许跨源请求（CORS）
    answer: 2
    explain: 只有浏览器强制 CORS。Zorvik、手机和服务器都不管，所以「Zorvik 里行、浏览器里不行」直接指向 CORS。
  - question: 哪个回答在告诉客户端「现在不行，30 秒后再试」？
    options:
      - 404，正文是 "30"
      - 503，带 Retry-After 头，值为 30
      - 200，延迟 30 毫秒
    answer: 1
    explain: 503 Service Unavailable 说服务器现在答不了；Retry-After 说什么时候再试。规矩的 App 会等，而不是猛敲服务器。
  - question: 你想看十次里随机失败一次时 App 会怎样。在路由上设什么？
    options:
      - 故障：错误（500），触发频率（%）10
      - 延迟 10 毫秒
      - 状态 210
    answer: 0
    explain: 带百分比的故障会让一部分请求失败、其余正常回答，就像一个不稳定的真服务器。
---

真实的服务器也会闹脾气。它们会变慢、会报错、会断开连接。你的 App 必须全都扛得住，而唯一能确认的办法是**故意演练这些坏日子**。Mock 是最合适的地方：它完全按你指定的方式和时间出毛病，而且不影响别人。

> [!note] 可以这样想……
> 一次消防演习。你在一个平常的星期二故意拉响警报，好让真着火时所有人都知道该怎么做。Mock 里的延迟和错误，就是给 App 做的消防演习。

## 慢应答

每条路由在 **行为** 下都有一个 **延迟（毫秒）**。Mock 会等那么多毫秒再作答。把 `1500` 设上去，你能看出：

- App 是显示转圈，还是干脆卡死；
- 等待时用户能不能连点两次 **支付**；
- App 会不会太早放弃（超时）。

## 故意报错

对**计划内**的错误，直接设路由的状态：`404` 表示「没有这张订单」，`401` 表示「请登录」，`503` 表示「维护中」。像真接口那样加上 `Retry-After: 30` 之类的请求头。

要制造混沌，就用路由的**故障**：

| 故障 | App 看到什么 |
|---|---|
| **错误（500）** | 拿不到正常回答，而是 `500 Internal Server Error` |
| **断开连接** | 连接直接关掉，一点回答都没有 |
| **永不回答** | 什么都不来，直到 App 放弃等待 |

**触发频率（%）** 让它随机：设成 `25`，四次请求失败一次，其余正常。网络的时好时坏就是这种感觉。

## CORS：浏览器先问一声

网页只能读取**同源**的答案：它自己加载时的协议、主机和端口，比如 `http://localhost:5173`。你跑在 `http://127.0.0.1:3000` 的 Mock 是另一个源。在发出某些请求之前，浏览器会先发一个**预检**，也就是一个 `OPTIONS` 请求，只有服务器用 `Access-Control-Allow-*` 头回答，它才继续。这条安全规则叫 **CORS**（跨源资源共享）。

```sequence
participants: 浏览器页面, Mock
浏览器页面 -> Mock: OPTIONS /payments（Origin: http://localhost:5173）
Mock --> 浏览器页面: 204 Access-Control-Allow-Origin: http://localhost:5173
浏览器页面 -> Mock: POST /payments
Mock --> 浏览器页面: 503 Retry-After: 30
```

在 **浏览器访问** 下打开 **允许跨源请求（CORS）**，Mock 就会回答预检，并给每个回答加上那些头。

> [!warning] 只有浏览器检查 CORS
> Zorvik、手机 App 和服务器完全不理会 CORS。所以当调用在 Zorvik 里能通、在浏览器里不行，头号嫌疑就是 CORS。

**什么时候用得上：** 设计师问加载状态长什么样、QA 想测「支付失败」页面，或者前端说「Zorvik 里行，Chrome 里不行！」。
