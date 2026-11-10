---
id: mock-from-spec
title: 从规范或文件夹生成 Mock
summary: Zorvik 能在几秒内从 OpenAPI 文档或一文件夹已保存的请求搭出整个 Mock。
minutes: 6
lab:
  title: 照契约做咖啡
  goal: 把一份 OpenAPI 文档和一个请求文件夹变成 Mock，一行路由都不用敲。
  minutes: 8
  files:
    comet-coffee.yaml: &comet |
      openapi: 3.0.3
      info:
        title: Comet Coffee
        version: "1.0.0"
        description: The API behind the Comet Coffee app.
      paths:
        /drinks:
          get:
            summary: List drinks
            responses:
              "200":
                description: The menu
                content:
                  application/json:
                    example:
                      - { id: 1, name: Nebula Latte, price: 4.5 }
                      - { id: 2, name: Stardust Mocha, price: 5 }
        /drinks/{drinkId}:
          get:
            summary: Get a drink
            parameters:
              - { name: drinkId, in: path, required: true, schema: { type: integer }, example: 1 }
            responses:
              "200":
                description: One drink
                content:
                  application/json:
                    example: { id: 1, name: Nebula Latte, price: 4.5 }
              "404":
                description: No drink with that id
        /orders:
          post:
            summary: Place an order
            requestBody:
              content:
                application/json:
                  example: { drinkId: 1, size: large }
            responses:
              "201":
                description: Order placed
                content:
                  application/json:
                    example: { orderId: 101, status: brewing }
    requests/Loyalty/_folder.yaml: "name: Loyalty\n"
    requests/Loyalty/Get points.yaml: "name: Get points\nseq: 0\nmethod: GET\nurl: '{{baseUrl}}/loyalty/points'\n"
    requests/Loyalty/Redeem a reward.yaml: "name: Redeem a reward\nseq: 1\nmethod: POST\nurl: '{{baseUrl}}/loyalty/rewards'\nbody:\n  type: json\n  text: '{\"reward\": \"free-cookie\"}'\n"
  servers:
    docs:
      name: Comet Coffee 文档
      kind: http
      http:
        routes:
          - method: GET
            path: /comet-coffee.yaml
            headers: [{ key: Content-Type, value: application/yaml }]
            body: *comet
  steps:
    - text: |
        Comet Coffee 团队把接口契约发布在 `{{=docs}}/comet-coffee.yaml`。在 **服务器** 里点 **＋** → **从 OpenAPI 生成 Mock…**，选 **URL**，粘上那个地址，把服务器命名为 **Comet Coffee mock**，按 **创建 Mock**。

        （同一份文档也在训练营工作区文件夹里，叫 `comet-coffee.yaml`，你更习惯用 **文件** 也可以。）
      hints:
        - "「从 OpenAPI 生成 Mock」在服务器分区 ＋ 菜单的最下面，排在各种服务器类型之后。"
        - "把上面那整段地址复制过去，包括 /comet-coffee.yaml。"
        - "服务器 → ＋ → 从 OpenAPI 生成 Mock… → URL → 粘地址 → 服务器名字 Comet Coffee mock → 创建 Mock。"
      check:
        call: { method: mock.fromOpenApi, ok: true, result: { routes: ">=3" } }
      solution:
        - call:
            method: mock.fromOpenApi
            params: { url: "{{docs}}/comet-coffee.yaml", name: Comet Coffee mock }
    - text: |
        看看 Zorvik 生成的路由：文档里每个操作一条，各自用文档里的示例作答。按 **启动**，之后实验会向 `GET /drinks` 要一份菜单。
      hints:
        - "新 Mock 已经在一个标签页里打开了。启动它和你手搭的 Mock 一样。"
        - "在 Comet Coffee mock 标签页右上角按启动。端口被占用就换一个再试。"
        - "在服务器里打开 Comet Coffee mock，按启动。GET /drinks 就会答 Nebula Latte 和 Stardust Mocha。"
      check:
        probe:
          kind: http
          path: /drinks
          expect:
            status: 200
            json: [{ name: Nebula Latte }]
      solution:
        - call:
            method: server.save
            params:
              id: Comet Coffee mock
              server: &cometMock
                name: Comet Coffee mock
                kind: http
                port: 0
                http:
                  routes:
                    - name: List drinks
                      method: GET
                      path: /drinks
                      status: 200
                      headers: [{ key: Content-Type, value: application/json }]
                      body: "[\n  {\n    \"id\": 1,\n    \"name\": \"Nebula Latte\",\n    \"price\": 4.5\n  },\n  {\n    \"id\": 2,\n    \"name\": \"Stardust Mocha\",\n    \"price\": 5\n  }\n]"
                    - name: Get a drink
                      method: GET
                      path: /drinks/:drinkId
                      status: 200
                      headers: [{ key: Content-Type, value: application/json }]
                      body: "{\n  \"id\": 1,\n  \"name\": \"Nebula Latte\",\n  \"price\": 4.5\n}"
                    - name: Place an order
                      method: POST
                      path: /orders
                      status: 201
                      headers: [{ key: Content-Type, value: application/json }]
                      body: "{\n  \"orderId\": 101,\n  \"status\": \"brewing\"\n}"
        - call:
            method: server.start
            params: { id: Comet Coffee mock, server: *cometMock }
    - text: |
        积分团队还没有文档，只有你集合里 **Loyalty** 文件夹那几个已保存的请求。右键那个文件夹，选 **用这个文件夹做 Mock…**，按 **创建 Mock**。
      hints:
        - "集合里的文件夹有右键菜单，里面有运行…、用这个文件夹做 Mock…、对这个文件夹做负载测试…。"
        - "打开集合分区，右键 Loyalty，选「用这个文件夹做 Mock…」。建议的名字 Loyalty mock 就挺好。"
        - "集合 → 右键 Loyalty → 用这个文件夹做 Mock… → 创建 Mock。每个请求生成一条路由，先都回 200 加 {}，等你填答案。"
      check:
        call: { method: mock.fromFolder, ok: true, params: { folder: Loyalty } }
      solution:
        - call:
            method: mock.fromFolder
            params: { folder: Loyalty, name: Loyalty mock }
quiz:
  - question: 「从 OpenAPI 生成 Mock…」会在每条路由的答案里放什么？
    options:
      - 该操作的第一个成功响应，用文档里的示例，或者根据 schema 造一个
      - 永远是空正文
      - 实时下载的真服务器答案副本
    answer: 0
    explain: Zorvik 读每个操作，用它的第一个成功响应作答。文档里有个好示例，就等于白得一个像样的 Mock。
  - question: 团队有某个新功能的已保存请求，但没有 OpenAPI 文档。最快的 Mock 办法是什么？
    options:
      - 先写一份 OpenAPI 文档
      - 手工把每个请求抄成一条路由
      - 右键那个文件夹，选「用这个文件夹做 Mock…」
    answer: 2
    explain: 每个请求生成一条路由，先回 200 加 {}，等你填上真实答案。
  - question: 新接口一半已经跑在测试服务器上，另一半还不存在。怎么用一个 Mock 覆盖两边？
    options:
      - 做不到，得用两套工具
      - Mock 缺的那些路由，并把「没有路由匹配的请求」设成「转发到后端」
      - 把测试服务器停掉
    answer: 1
    explain: 没有匹配路由的请求会转给真后端，于是你只需要 Mock 缺的部分。
---

手搭路由很适合学习，但真实 API 动辄几十个接口，全敲一遍要一天，还会出错。好在接口的形状通常已经写在某处了。Zorvik 几秒钟就能把它变成 Mock。

## 从 OpenAPI 文档

**OpenAPI 文档**（旧版本叫 *Swagger*）是一个 YAML 或 JSON 文件，描述一个 API：它的路径、每个路径上的方法、参数，以及每个答案长什么样。团队常常先就这份文档达成一致；它是前后端之间的**契约**。

```anatomy
/drinks: | API 的一个路径
get: | 一个操作：该路径上的一个方法
responses: "200": | 成功时的回答
example: [{"name": "Nebula Latte"}] | Mock 会回什么
```

在 **服务器** 里，**＋** → **从 OpenAPI 生成 Mock…** 能从 **文件**、**URL** 或你**粘贴**的文本里读文档。每个操作生成一条路由，用它第一个成功响应作答：文档里有 **example** 就用它，否则按 **schema**（每个字段及其类型）造一个。`/drinks/{drinkId}` 这样的路径会变成 `/drinks/:drinkId` 这样的路由。

> [!note] 可以这样想……
> 一个建筑师做的模型。模型师照蓝图一个下午就搭出纸板房子，买家在真墙还没砌起来之前就能规划沙发放哪。OpenAPI 文档是蓝图，Mock 是模型。

## 从已保存的请求

还没有文档？如果你已经有保存的请求，右键文件夹选 **用这个文件夹做 Mock…**（或者从集合的 **＋** 菜单选 **给整个集合做 Mock…**）。每个 HTTP 请求变成一条同方法、同路径的路由，先回 `200` 加 `{}`，等你填上真实答案。

而当你拿到一个想留着的响应时，响应上方的 **Mock** 按钮会加一条和它答得一模一样的路由。

```flow
OpenAPI 文档 -[从 OpenAPI 生成 Mock…]-> Mock API
请求文件夹 -[用这个文件夹做 Mock…]-> Mock API
你拿到的响应 -[Mock]-> 又多一条路由
```

## 只 Mock 缺的部分

经常是接口的一部分已经在测试服务器上跑着，另一部分还不存在。把缺的路由 Mock 出来，然后在 **没有路由匹配的请求** 下选 **转发到后端**，填上真服务器的地址。Mock 认识的请求拿 Mock 的答案，其余的都转给真服务器，它的回答原样回来。

> [!tip] 重新生成，别手改
> 文档变了，就重新生成一个 Mock，而不是手工打补丁。这样 Mock 才始终忠于契约。

**什么时候用得上：** 接口团队周一发来一份文档，你想周一下午就让 App 跟一个像样的东西对话，而不是等后端上线。
