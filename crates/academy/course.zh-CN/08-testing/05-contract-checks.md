---
id: contract-checks
title: 用 OpenAPI 做契约检查
summary: 导入一个 API 的 OpenAPI 文档，每次响应都会自动按它检查。
minutes: 6
lab:
  title: 让 API 兑现承诺
  goal: 导入一家咖啡店的 OpenAPI 文档，找出那个违反契约的接口。
  minutes: 8
  vars:
    baseUrl: "{{api}}"
  files:
    coffee-shop-openapi.yaml: &spec |
      openapi: 3.0.3
      info:
        title: Coffee Shop API
        version: 1.0.0
        description: Drinks and prices of the Bootcamp coffee shop.
      servers:
        - url: {{api}}
      paths:
        /menu:
          get:
            summary: List the menu
            responses:
              "200":
                description: Every drink on the menu
                content:
                  application/json:
                    schema:
                      type: array
                      items:
                        $ref: "#/components/schemas/Drink"
        /specials:
          get:
            summary: List the specials
            responses:
              "200":
                description: The specials of the day
                content:
                  application/json:
                    schema:
                      type: array
                      items:
                        $ref: "#/components/schemas/Drink"
      components:
        schemas:
          Drink:
            type: object
            required: [name, price]
            properties:
              name:
                type: string
              price:
                type: number
                description: Price in euros
              vegan:
                type: boolean
  servers:
    api:
      name: Coffee Shop API
      kind: http
      http:
        routes:
          - method: GET
            path: /openapi.yaml
            headers:
              - key: Content-Type
                value: application/yaml
            body: *spec
          - method: GET
            path: /menu
            headers:
              - key: Content-Type
                value: application/json
            body: '[{"name": "Flat white", "price": 3.2, "vegan": false}, {"name": "Oat latte", "price": 3.6, "vegan": true}]'
          - method: GET
            path: /specials
            headers:
              - key: Content-Type
                value: application/json
            body: '[{"name": "Pumpkin spice latte", "price": "4.50", "vegan": false}]'
  steps:
    - text: |
        这家咖啡店把 OpenAPI 文档发布在 `{{api}}/openapi.yaml`。打开集合的 **+** 菜单 → **导入…**，选 **OpenAPI URL** 标签页，填入这个地址，按 **导入**。
      hints:
        - '直接填地址（以 http://127.0.0.1: 开头）。实验也把同一份文档存成了工作区文件夹里的 coffee-shop-openapi.yaml，你更习惯用文件标签页也可以。'
        - 集合 + → 导入… → OpenAPI URL，粘贴地址，「导入到」保持集合最上层，然后导入。
        - "摘要会写：已导入「Coffee Shop API」，2 个请求。侧边栏出现一个同名文件夹。"
      check:
        call: { method: 're:^import\.(url|file)$', ok: true, result: { name: Coffee Shop API, requests: 2 } }
      solution:
        - call: { method: import.url, params: { url: "{{api}}/openapi.yaml", parent: "" } }
    - text: |
        打开 **Coffee Shop API → List the menu**，按 **发送**。它的 URL 用的是 `baseUrl` 变量，Lab 环境里已经有了，所以直接就能用。打开 **测试** 标签页：你一行测试都没写，却已经有一个了。
      hints:
        - 导入的文件夹在侧边栏里。请求名取自文档里的操作名。
        - 点 List the menu，按发送，然后打开响应的测试标签页。
        - "这个测试叫「与 API 规范一致（GET /menu → 200）」，它通过了：两款饮品都有名字和数字价格。"
      check:
        send: { url: "*/menu", tests: [{ name: "Matches the API spec*", passed: true }] }
      solution:
        - call:
            method: http.send
            params:
              requestId: lab-menu
              request: { name: List the menu, method: GET, url: "{{baseUrl}}/menu", openapi: { operation: GET /menu } }
              path: Coffee Shop API/List the menu.yaml
    - text: 现在打开同一个文件夹里的 **List the specials** 并发送。它守约了吗？
      hints:
        - 就是 List the menu 下面那个请求。
        - 发送后打开测试标签页。状态码是 200，但看那个测试。
        - "「与 API 规范一致」失败了。它的信息里会点名那个不符合文档的字段。"
      check:
        send: { url: "*/specials", tests: [{ name: "Matches the API spec*", passed: false }] }
      solution:
        - call:
            method: http.send
            params:
              requestId: lab-specials
              request: { name: List the specials, method: GET, url: "{{baseUrl}}/specials", openapi: { operation: GET /specials } }
              path: Coffee Shop API/List the specials.yaml
    - text: 特饮里哪个字段破坏了契约？填它的名字。
      hints:
        - 失败测试的信息会指向问题所在，比如 $[0].something。
        - "$[0] 是列表里的第一款饮品。把它的值和文档比一比：文档期望的是什么类型？"
        - "文档说 price 是数字；服务器发的是文本 \"4.50\"。填 price。"
      check:
        answer: ["price", "*price*"]
      solution:
        - answer: price
quiz:
  - question: "**与 API 规范一致** 这个测试检查什么？"
    options:
      - 服务器是否足够快
      - 状态码是否有文档记录，JSON 正文是否符合文档里的 schema
      - 请求的 URL 拼写对不对
    answer: 1
    explain: 文档描述了每个操作的响应。Zorvik 用状态码对照它们，并用 schema 检查正文的字段、类型和必填项。
  - question: 文档说 `price` 是数字，服务器发的却是 `"4.50"`。这个失败的测试告诉了你什么？
    options:
      - 服务器和文档不一致；修服务器，或者有意改文档
      - Zorvik 有 bug
      - 没事，价格看起来是对的
    answer: 0
    explain: 契约只有在双方都守住时才有用。照着文档写的应用会拿一段文本去做数学运算。
  - question: 导入之后，Zorvik 把 OpenAPI 文档放在哪？
    options:
      - 哪里都不放，只读一次
      - 在你的浏览器里
      - 工作区的 `specs/` 文件夹里，和请求放在一起，所以也会进 Git
    answer: 2
    explain: 导入的文件夹会链接到它，每次发送和每次运行都会按它校验响应。API 变更后，用「从 API 规范更新…」把新版本带进来。
---

当两个团队分别做同一个产品的两半，比如一个 App 和它的 API，他们得对 API 发什么达成一致：有哪些接口、每个应答有哪些字段、每个字段是什么类型。这份约定就是 API 的**契约**。当 API 悄悄破坏了它，App 也会坏，而且常常是在用户面前坏。

## OpenAPI

大多数团队把契约写成 **OpenAPI 文档**（旧版本叫 **Swagger**）。它是一个 YAML 或 JSON 文件，描述每个操作，以及每个应答的 **schema**：数据必须长成什么样。

```anatomy
GET /specials | 一个操作：方法和路径
responses: "200" | 它可能用哪些状态码应答
type: array, items: Drink | 应答是一份饮品列表
Drink: required [name, price] | 每款饮品必须有这两个字段
price: type number | 而且价格必须是数字，不是文本
```

> [!note] 可以这样想……
> 一份租房合同。它写着你得到什么：两间卧室、一个阳台、能用的暖气。搬进去发现没有阳台，你不用争论住着感觉如何，指一下合同就行。

## Zorvik 里的契约检查

导入一份 OpenAPI 文档（集合 **+** → **导入…**，从文件或 URL），Zorvik 会做三件事：

1. 建一个**文件夹，每个操作一个请求**，示例正文都填好了，并建一个以该 API 命名的**环境**，带 `baseUrl`。
2. 把**文档保存**在工作区的 `specs/` 文件夹里，这样它能跟着请求一起进 Git。
3. 从此，这些请求的**每次响应**都会得到一个测试：**与 API 规范一致**。

```flow
OpenAPI 文档 -[导入]-> 请求文件夹
响应 -[按 schema 校验]-> 与 API 规范一致
```

这个测试会检查状态码是文档列出的那一个，以及 JSON 正文符合 schema：类型、必填字段、允许的值等等。格式与模式（比如「必须看起来像邮箱」）不检查。它的计数方式和你自己写的测试一样：在测试标签页、集合运行、命令行和 CI 报告里都算。

> [!tip] 免费拿到的契约检查
> 这个测试你一行 JavaScript 都不用写。业务规则（比如「总价是各项之和」）自己再写测试，数据形状交给契约检查守着。

## API 变更的时候

API 会演进。文档出了新版本时，右键导入的文件夹 → **从 API 规范更新…**：新的操作会进来，而你对请求做过的修改会保留。你可以在 **文件夹设置… → API 规范** 里关掉某个文件夹的检查，但请三思：正是这个测试在告诉你 API 在你脚下变了。

**什么时候用得上：** 后端团队把某个字段从数字改成文本，「只改了一个接口」。下一次运行你的契约检查就红了，比移动端开始显示 *NaN €* 早好几天。
