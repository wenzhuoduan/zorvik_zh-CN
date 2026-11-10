---
id: ship-it
title: 发布上线
summary: 你的最终任务：把 Rocket Pizza API 从契约一路带到代码，会用到你学过的所有东西。
minutes: 5
lab:
  title: 发布 Rocket Pizza
  goal: 带着 Rocket Pizza API 走完整个发布清单，并把它交给移动团队。
  minutes: 20
  files:
    rocket-pizza.yaml: &contract |
      openapi: 3.0.3
      info:
        title: Rocket Pizza
        version: "1.0.0"
        description: Order pizza from the Rocket Pizza mobile app.
      paths:
        /pizzas:
          get:
            summary: List pizzas
            operationId: listPizzas
            responses:
              "200":
                description: Today's menu
                content:
                  application/json:
                    schema:
                      type: array
                      items:
                        $ref: "#/components/schemas/Pizza"
                    example:
                      - { id: 1, name: Margherita, price: 9.5, vegetarian: true }
                      - { id: 2, name: Pepperoni Blast-off, price: 11, vegetarian: false }
        /pizzas/{pizzaId}:
          get:
            summary: Get a pizza
            operationId: getPizza
            parameters:
              - name: pizzaId
                in: path
                required: true
                schema: { type: integer }
                example: 1
            responses:
              "200":
                description: One pizza
                content:
                  application/json:
                    schema:
                      $ref: "#/components/schemas/Pizza"
                    example: { id: 1, name: Margherita, price: 9.5, vegetarian: true }
              "404":
                description: No pizza with that id
        /orders:
          post:
            summary: Place an order
            operationId: placeOrder
            requestBody:
              required: true
              content:
                application/json:
                  schema:
                    $ref: "#/components/schemas/NewOrder"
                  example: { pizzaId: 1, quantity: 2 }
            responses:
              "201":
                description: Order placed
                content:
                  application/json:
                    schema:
                      $ref: "#/components/schemas/Order"
                    example: { orderId: 501, status: in the oven, etaMinutes: 20 }
      components:
        schemas:
          Pizza:
            type: object
            required: [id, name, price]
            properties:
              id: { type: integer }
              name: { type: string }
              price: { type: number }
              vegetarian: { type: boolean }
          NewOrder:
            type: object
            required: [pizzaId, quantity]
            properties:
              pizzaId: { type: integer }
              quantity: { type: integer, minimum: 1 }
          Order:
            type: object
            required: [orderId, status]
            properties:
              orderId: { type: integer }
              status: { type: string }
              etaMinutes: { type: integer }
  servers:
    staging:
      name: Rocket Pizza staging
      kind: http
      http:
        routes:
          - name: List pizzas
            method: GET
            path: /pizzas
            headers: [{ key: Content-Type, value: application/json }]
            body: '[{"id": 1, "name": "Margherita", "price": 9.5, "vegetarian": true}, {"id": 2, "name": "Pepperoni Blast-off", "price": 11, "vegetarian": false}, {"id": 3, "name": "Veggie Orbit", "price": 10.5, "vegetarian": true}]'
            delayMs: 15
          - name: Get a pizza
            method: GET
            path: /pizzas/:pizzaId
            headers: [{ key: Content-Type, value: application/json }]
            body: '{"id": 1, "name": "Margherita", "price": 9.5, "vegetarian": true}'
          - name: Place an order
            method: POST
            path: /orders
            status: 201
            headers: [{ key: Content-Type, value: application/json }]
            body: '{"orderId": 501, "status": "in the oven", "etaMinutes": 20}'
          - name: The contract
            method: GET
            path: /openapi.yaml
            headers: [{ key: Content-Type, value: application/yaml }]
            body: *contract
  steps:
    - text: |
        **导入契约。** 后端团队把 Rocket Pizza 部署到了预发服务器，并在 `{{=staging}}/openapi.yaml` 上发布它的契约。在 **集合** 里点 **＋** → **导入…**，打开 **OpenAPI URL**，粘贴这个地址，按 **导入**。

        （这份契约也在训练营工作区文件夹里，叫 `rocket-pizza.yaml`。导入文件时会要求填 **base URL**，填 `{{=staging}}`。）
      hints:
        - 导入会把契约里的每个操作变成一个已保存的请求，放进一个新文件夹。
        - 集合分区顶部的 ＋ 按钮里，导入…就在几个新建项下面。实验指南里有完整的预发地址。
        - 集合 → ＋ → 导入… → OpenAPI URL → 粘贴预发地址加上 /openapi.yaml → 导入。会出现一个 Rocket Pizza 文件夹。
      check:
        saved:
          folder: { name: Rocket Pizza, openapi: { spec: "*" } }
      solution:
        - call:
            method: import.url
            params: { url: "{{staging}}/openapi.yaml", parent: "" }
    - text: |
        **检查契约。** 导入还生成了一个 **Rocket Pizza** 环境，它的 `baseUrl` 指向预发。在窗口顶部的环境菜单里选 **Rocket Pizza**，打开 **List pizzas**，按 **发送**。在响应里打开 **测试**：**Matches the API spec** 必须通过。
      hints:
        - 导入的请求用的是 {{baseUrl}}，只有 Rocket Pizza 这个环境定义了它。
        - 环境菜单在窗口顶部，现在显示的是 Lab。把它切成 Rocket Pizza，然后在集合里打开 Rocket Pizza → List pizzas。
        - 环境菜单 → Rocket Pizza；集合 → Rocket Pizza → List pizzas → 发送；响应 → 测试里显示 "Matches the API spec" 通过。
      check:
        send:
          status: 200
          tests: [{ name: "Matches the API spec*", passed: true }]
      solution:
        - call:
            method: env.setActive
            params: { id: Rocket Pizza }
        - call:
            method: http.send
            params:
              requestId: ship-it-list-pizzas
              path: Rocket Pizza/List pizzas.yaml
              request: &listPizzas
                name: List pizzas
                seq: 1
                method: GET
                url: "{{baseUrl}}/pizzas"
                openapi: { operation: GET /pizzas }
    - text: |
        **冒烟运行。** 右键 **Rocket Pizza** 文件夹，选 **运行…**，按 **运行**。每个请求各发一次，每个回答都按契约检查。全绿吗？
      hints:
        - 冒烟运行就是快速过一遍所有请求，确认没有哪里着火。
        - 这次运行会在单独的标签页里打开；运行按钮在右上角。
        - 集合 → 右键 Rocket Pizza → 运行… → 运行。三个请求，三个通过的测试。
      check:
        run: { name: Rocket Pizza, passed: true, testsFailed: 0, testsPassed: ">=3" }
      solution:
        - call:
            method: runner.start
            params: { folder: Rocket Pizza }
        - wait: 1500
    - text: |
        **上线流量。** 右键 **List pizzas** → **负载测试…**。在 **阶段** 下选 **恒定**，**峰值（用户数）** 填 **3**，**时长（秒）** 填 **3**。保留阈值（p95 延迟低于 500 ms、错误率低于 1%），按 **启动**。这次运行必须通过。
      hints:
        - 保持短小；你是在核对目标，不是想把预发打垮。
        - 负载测试发送已保存的 List pizzas 请求，用的是 Rocket Pizza 环境的 baseUrl。
        - 右键 List pizzas → 负载测试… → 恒定，峰值 3，时长 3 → 启动。等它显示「passed」。
      check:
        all:
          - saved:
              loadTest:
                targets: [{ request: "*List pizzas.yaml" }]
                thresholds: [{ metric: p95 }]
          - load: { passed: true, requests: ">0" }
      solution:
        - call:
            method: load.create
            params:
              test: &launchTest
                name: List pizzas load test
                targets: [{ request: Rocket Pizza/List pizzas.yaml }]
                model: virtualUsers
                stages:
                  - { durationSecs: 0, target: 3 }
                  - { durationSecs: 3, target: 3 }
                thresholds:
                  - { metric: p95, op: "<", value: 500 }
                  - { metric: errorRate, op: "<", value: 1 }
        - call:
            method: load.start
            params: { id: List pizzas load test, test: *launchTest }
        - wait: 3500
    - text: |
        **给移动团队做一个 Mock，** 好让预发挂了他们也能开发。在 **服务器** 里点 **＋** → **从 OpenAPI 生成 Mock…** → **URL** 填 `{{=staging}}/openapi.yaml`，命名为 **Rocket Pizza mock**，按 **创建 Mock**，然后 **启动** 它。实验会从它的 `GET /pizzas` 下单。
      hints:
        - 从契约生成的 Mock 用契约里的示例作答，所以不会偏离契约。
        - 从 OpenAPI 生成 Mock… 在服务器的 ＋ 菜单最下面。创建 Mock 后，新服务器会在一个带启动按钮的标签页里打开。
        - 服务器 → ＋ → 从 OpenAPI 生成 Mock… → URL → 预发地址 + /openapi.yaml → 命名为 Rocket Pizza mock → 创建 Mock → 启动。
      check:
        probe:
          kind: http
          path: /pizzas
          expect:
            status: 200
            json: [{ name: Margherita }, { name: Pepperoni Blast-off }]
      solution:
        - call:
            method: mock.fromOpenApi
            params: { url: "{{staging}}/openapi.yaml", name: Rocket Pizza mock }
        - call:
            method: server.save
            params:
              id: Rocket Pizza mock
              server: &rocketMock
                name: Rocket Pizza mock
                kind: http
                port: 0
                http:
                  routes:
                    - name: List pizzas
                      method: GET
                      path: /pizzas
                      status: 200
                      headers: [{ key: Content-Type, value: application/json }]
                      body: "[\n  {\n    \"id\": 1,\n    \"name\": \"Margherita\",\n    \"price\": 9.5,\n    \"vegetarian\": true\n  },\n  {\n    \"id\": 2,\n    \"name\": \"Pepperoni Blast-off\",\n    \"price\": 11,\n    \"vegetarian\": false\n  }\n]"
                    - name: Get a pizza
                      method: GET
                      path: /pizzas/:pizzaId
                      status: 200
                      headers: [{ key: Content-Type, value: application/json }]
                      body: "{\n  \"id\": 1,\n  \"name\": \"Margherita\",\n  \"price\": 9.5,\n  \"vegetarian\": true\n}"
                    - name: Place an order
                      method: POST
                      path: /orders
                      status: 201
                      headers: [{ key: Content-Type, value: application/json }]
                      body: "{\n  \"orderId\": 501,\n  \"status\": \"in the oven\",\n  \"etaMinutes\": 20\n}"
        - call:
            method: server.start
            params: { id: Rocket Pizza mock, server: *rocketMock }
    - text: |
        **给 Android 的代码。** 打开 **List pizzas**，点 **⋯**（更多操作，在保存旁边）→ **复制为 cURL 或代码…**，选 **Kotlin**（它用 OkHttp，Android 的心头好），按 **复制**。这就是移动团队的第一行网络代码，可以直接粘。
      hints:
        - Zorvik 能把请求写成 cURL 或 16 种语言的代码，变量会填好。
        - ⋯ 按钮在请求标签页里保存按钮的右边。语言列在对话框左侧；在它的搜索框里输入 kotlin 或 android。
        - List pizzas → ⋯ → 复制为 cURL 或代码… → Kotlin → 复制。
      check:
        call:
          method: export.snippet
          ok: true
          params: { language: kotlin, request: { url: "*pizzas*" } }
      solution:
        - call:
            method: export.snippet
            params:
              request: *listPizzas
              path: Rocket Pizza/List pizzas.yaml
              language: kotlin
              resolveVariables: true
    - text: |
        契约导入了，预发检查过了，冒烟运行绿了，负载测试通过了，Mock 和代码也交接了。清单上的事全做完了。

        输入 **ship it**，发射 Rocket Pizza。
      hints:
        - 这一条是你挣来的。
        - 在这一步的答案框里输入那两个词。
        - 输入 ship it，按回车。
      check:
        answer: ["ship it", "ship it!", "shipit", "ship-it"]
      solution:
        - answer: ship it
quiz:
  - question: 后端更新之后，预发上的「Matches the API spec」测试失败了。这最可能说明什么？
    options:
      - 预发 API 的回答不再符合契约的承诺
      - Zorvik 坏了
      - 移动 App 有 bug
    answer: 0
    explain: 这个测试拿真实回答和契约比对。更新后它变红，说明 API 偏离了契约，而所有基于契约构建的应用都可能跟着坏掉。
  - question: 这个任务里的负载测试为什么只用 3 个用户跑 3 秒？
    options:
      - 因为 Zorvik 跑不了更多用户
      - 因为阈值只在小测试里有效
      - 为了在不猛捶共享预发服务器的前提下核对性能目标
    answer: 2
    explain: 发布检查问的是「我们达标了吗？」，不是「什么时候垮？」。崩溃点要另找，找在一个专门留给它的系统上。
  - question: 下一次发布，怎样最快地把这些检查全部重跑一遍？
    options:
      - 从空白工作区重新开始
      - 把工作区留在 Git 里，把同一套集合、负载测试和 Mock 再跑一遍
      - 问后端团队有没有改什么
    answer: 1
    explain: 你搭的一切都是工作区里的普通文件。下一次，整份清单几分钟就能走完。
---

就是现在：你的最终任务。训练营里的一切，都会在一次发布里汇合。

**情况。** Rocket Pizza 要发布它的移动 App。设计团队写了 API **契约**，一份 OpenAPI 文档。后端团队把第一版部署到了 **预发** 服务器。Android 团队周一开工，正指望你呢。在任何人说出「上线」之前，你要带着这个 API 走完整份发布清单。

```flow
契约 -[导入…]-> 集合
集合 -[发送 + 运行…]-> 预发
集合 -[负载测试…]-> 预发
契约 -[从 OpenAPI 生成 Mock…]-> 给移动端的 Mock
集合 -[复制为代码…]-> Kotlin 代码片段
```

## 你的任务，一步一步来

| 步骤 | 你要做什么 | 在哪学过…… |
|---|---|---|
| 1 | 把契约导入集合 | OpenAPI 与集合 |
| 2 | 切换环境并通过 **Matches the API spec** | 环境与测试 |
| 3 | 把整个文件夹跑一遍：冒烟运行 | 运行集合 |
| 4 | 一个短的负载测试，阈值必须通过 | 性能与负载测试 |
| 5 | 给移动团队做一个 API 的 Mock | Mock API |
| 6 | 给 Android 开发者的 Kotlin 代码 | 把请求分享成代码 |

慢慢来。需要的话，提示就在那里；而且你在这里做的任何事都弄不坏真实的东西：预发服务器、Mock 和负载全都留在这台电脑上。

> [!note] 可以这样想……
> 火箭发射倒计时。燃料：检查。制导：检查。天气：检查。没人凭「应该没事」就发射；每个系统都得先喊 **go**。你的清单就是倒计时，最后一步由你来喊。

## 为什么按这个顺序检查

先证明预发守住了契约的承诺，一个请求，然后全部请求。只有到这时，测速度才有意义；一个很快的错答案仍然是错答案。最后才是交接，这样移动团队拿到的 Mock 和代码，对应的是你刚验证过的那个 API。

> [!tip] 边做边看看四周
> 冒烟运行之后，打开每个结果的测试看看。负载测试之后，拿 p50 和 p95 比一比。你现在注意到的每一件事，将来工作时也会注意到。

## 毕业

最后一步完成、下面的问题也答完之后，你就毕业了：**Graduate** 徽章、250 点额外经验，还有你的 **Zorvik 训练营结业证书**。你从「什么是网络？」开始，以一次完整的 API 发布收尾。这是一套真本事，值得骄傲。

**什么时候用得上：** 你在工作中发布第一个 API 的时候。名字会变，清单不会：契约、集合、检查、冒烟运行、负载测试、交接。发布吧！