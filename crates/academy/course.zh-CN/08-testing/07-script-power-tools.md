---
id: script-power-tools
title: 脚本的强力工具
summary: 脚本可以自己发请求、用内置库、按 JSON Schema 校验响应、把它画成表格，或者干脆跳过某个请求。
minutes: 7
added: 0.2.0
lab:
  title: 自给自足的报告
  goal: 让一个请求自己去取令牌、按 schema 校验答案、把它显示成表格，并拦下一个危险的请求。
  minutes: 10
  vars:
    stage: production
  servers:
    api:
      name: Reports API
      kind: http
      http:
        routes:
          - name: Token
            method: POST
            path: /token
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"token": "{{secret.token}}", "expiresIn": 300}'
          - name: Weekly report
            method: GET
            path: /reports
            matchHeaders:
              - { key: Authorization, value: "Bearer {{secret.token}}" }
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"title": "Weekly sales", "week": 39, "items": [{"name": "Tomato soup", "sales": 128, "price": 4.5}, {"name": "Grilled cheese", "sales": 96, "price": 6}, {"name": "Lemonade", "sales": 210, "price": 2.5}]}'
          - name: No token
            method: GET
            path: /reports
            status: 401
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"error": "unauthorized", "message": "Get a token from POST /token first."}'
          - name: Delete test data
            method: DELETE
            path: /test-data
            status: 204
  steps:
    - text: |
        `GET {{api}}/reports` 需要 `POST {{api}}/token` 给的新鲜令牌。让这个请求自己去取：给它加上这段 **前置** 脚本，然后发送。

        ```js
        const res = await pm.sendRequest({
          url: pm.variables.replaceIn("{{api}}/token"),
          method: "POST",
        });
        pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + res.json().token });
        ```
      hints:
        - "`pm.sendRequest` 自己不会填 `{{variables}}`，所以 URL 要先过一遍 `pm.variables.replaceIn`。`await` 会等答案回来。"
        - "新建请求，GET {{api}}/reports。脚本标签页 → 前置 → 粘贴脚本 → 发送。"
        - "你会拿到 200 和周报。响应的控制台标签页会列出那次额外的请求：pm.sendRequest POST …/token → 200 OK。"
      check:
        all:
          - request: { server: api, method: POST, path: /token }
          - request: { server: api, method: GET, path: /reports, status: 200, headers: { authorization: "Bearer {{secret.token}}" } }
          - send: { url: "*/reports", status: 200, request: { scripts: { preRequest: "*sendRequest*" } } }
      solution:
        - send:
            method: GET
            url: "{{api}}/reports"
            scripts:
              preRequest: &fetchToken |
                const res = await pm.sendRequest({
                  url: pm.variables.replaceIn("{{api}}/token"),
                  method: "POST",
                });
                pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + res.json().token });
    - text: |
        让报告守住一个形状。加一段带 JSON Schema 测试的 **响应后** 脚本，保留前置脚本，再发一次：

        ```js
        const schema = {
          type: "object",
          required: ["title", "items"],
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "sales"],
                properties: { sales: { type: "integer" } },
              },
            },
          },
        };
        pm.test("Report has the right shape", () => pm.response.to.have.jsonSchema(schema));
        ```
      hints:
        - JSON Schema 描述一个 JSON 值的形状。jsonSchema 会拿整个正文去对照，并列出每一个不符的字段。
        - "在同一个请求上：脚本标签页 → 响应后 → 粘贴脚本。前置脚本保持原样，否则请求拿不到令牌。"
        - "再发一次。响应的测试标签页会显示 Report has the right shape 通过。"
      check:
        send:
          url: "*/reports"
          status: 200
          testsPassed: ">=1"
          testsFailed: 0
          request: { scripts: { postResponse: "*jsonSchema*" } }
      solution:
        - send:
            method: GET
            url: "{{api}}/reports"
            scripts:
              preRequest: *fetchToken
              postResponse: &schemaTest |
                const schema = {
                  type: "object",
                  required: ["title", "items"],
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["name", "sales"],
                        properties: { sales: { type: "integer" } },
                      },
                    },
                  },
                };
                pm.test("Report has the right shape", () => pm.response.to.have.jsonSchema(schema));
    - text: |
        现在让它好读一点。在 **响应后** 脚本末尾加上这几行：内置的 **lodash** 库把菜品按销量从高到低排序，`pm.visualizer.set` 再把它们画成表格。再发一次，打开响应新出现的 **可视化** 标签页。

        ```js
        const _ = require("lodash");
        const items = _.orderBy(pm.response.json().items, "sales", "desc");
        pm.visualizer.set(`
          <table>
            <tr><th>Dish</th><th>Sales</th></tr>
            {{#each items}}<tr><td>{{name}}</td><td>{{sales}}</td></tr>{{/each}}
          </table>`, { items });
        ```
      hints:
        - "模板是 Handlebars：{{#each items}} 为每道菜重复一行，{{name}} 是那道菜的一个字段。"
        - "这些库是 Zorvik 自带的，所以 require(\"lodash\") 离线也能用。把代码粘在响应后里 jsonSchema 测试的下面。"
        - "再发一次。Body 旁边会多一个可视化标签页，显示表格：Lemonade 210、Tomato soup 128、Grilled cheese 96。"
      check:
        send:
          url: "*/reports"
          status: 200
          visualized: true
          request: { scripts: { postResponse: "re:lodash|_\\." } }
      solution:
        - send:
            method: GET
            url: "{{api}}/reports"
            scripts:
              preRequest: *fetchToken
              postResponse: |
                const schema = {
                  type: "object",
                  required: ["title", "items"],
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["name", "sales"],
                        properties: { sales: { type: "integer" } },
                      },
                    },
                  },
                };
                pm.test("Report has the right shape", () => pm.response.to.have.jsonSchema(schema));

                const _ = require("lodash");
                const items = _.orderBy(pm.response.json().items, "sales", "desc");
                pm.visualizer.set(`
                  <table>
                    <tr><th>Dish</th><th>Sales</th></tr>
                    {{#each items}}<tr><td>{{name}}</td><td>{{sales}}</td></tr>{{/each}}
                  </table>`, { items });
    - text: |
        最后是一个保险。`DELETE {{api}}/test-data` 会清空测试数据，这在生产环境绝不能发生。新建这个请求，加上这段 **前置** 脚本再发送。Lab 环境里 `stage` 是 `production`，所以它不会被发出去。

        ```js
        if (pm.environment.get("stage") === "production") {
          pm.execution.skipRequest();
        }
        ```
      hints:
        - "前置脚本里的 pm.execution.skipRequest() 会在任何东西离开你电脑之前中止发送。"
        - "新建请求，方法 DELETE，URL {{api}}/test-data。脚本标签页 → 前置 → 粘贴脚本 → 发送。"
        - "响应面板会显示「未发送」。在集合运行里，这个请求会被记成已跳过，运行继续往下走。"
      check:
        send: { method: DELETE, url: "*/test-data", errorCode: skipped }
      solution:
        - send:
            method: DELETE
            url: "{{api}}/test-data"
            scripts:
              preRequest: |
                if (pm.environment.get("stage") === "production") {
                  pm.execution.skipRequest();
                }
quiz:
  - question: "脚本里 `pm.sendRequest({ url: \"{{api}}/token\" })` 失败了。为什么？"
    options:
      - 令牌接口挂了
      - "pm.sendRequest 不会填变量：URL 要用 pm.variables.replaceIn 包一层"
      - 脚本只能发 GET 请求
    answer: 1
    explain: 和 Postman 一样，脚本发出的请求是照字面理解的。pm.variables.replaceIn 会先把 {{api}}（以及动态变量）填好。
  - question: "`pm.visualizer.set(template, data)` 把结果显示在哪？"
    options:
      - 在控制台标签页里
      - 在一个新的浏览器窗口里
      - 在响应的可视化标签页里
    answer: 2
    explain: 模板用你的数据填充后显示在响应的可视化标签页里，运行在沙箱中，里面自己的脚本不会执行。
  - question: 集合运行期间，一个前置脚本调用了 `pm.execution.skipRequest()`。会发生什么？
    options:
      - 请求不发，运行把它记成已跳过然后继续
      - 整次运行带着错误停下来
      - 请求照发，因为跳过只对单次发送有效
    answer: 0
    explain: 跳过的请求不算失败。单次发送显示「未发送」；运行里会把它连同原因列为已跳过，然后继续下一个请求。
---

你已经用脚本存令牌、写测试了。它们能做的还有很多。这一课是强力工具的一次巡览，每一个都只是一两行 JavaScript。

| 工具 | 它做什么 |
|---|---|
| `pm.sendRequest(…)` | 从脚本里再发一个请求：取令牌、造测试数据、清理 |
| `require("lodash")`、`CryptoJS`、`moment`、`ajv`… | Zorvik 内置的库，离线可用 |
| `pm.response.to.have.jsonSchema(schema)` | 用 JSON Schema 校验整个正文 |
| `pm.visualizer.set(template, data)` | 按你的方式画出响应，显示在 **可视化** 标签页 |
| `pm.execution.skipRequest()` | 让一个请求根本不发出去 |
| `pm.cookies` | 读取该请求所属站点的 cookie |
| `setTimeout`、`setInterval` | 定时器；脚本结束前会等它们 |

## 从脚本里发请求

`pm.sendRequest` 发出一个它自己的请求。在脚本顶部用 `await`，脚本就会等答案回来：

```sequence
participants: 前置脚本, Zorvik, Reports API
前置脚本 -> Reports API: pm.sendRequest POST /token
Reports API --> 前置脚本: {"token": "a1b2…"}
Note over 前置脚本: 设置 Authorization: Bearer a1b2…
Zorvik -> Reports API: GET /reports，带上令牌
Reports API --> Zorvik: 200 周报
```

要知道两件事：它不会自己填 `{{variables}}`（用 `pm.variables.replaceIn`），而且每次调用都会出现在响应的 **控制台** 标签页里。你也可以传回调 `pm.sendRequest(request, (err, res) => …)`，老一点的 Postman 脚本就是那么写的。

> [!note] 可以这样想……
> 酒店礼宾。你让他订个餐厅，你还没到，他已经打过电话、拿到预订号并写在你卡片上了。前置脚本就是那位礼宾，令牌就是预订号。

## 内置的库

脚本可以 `require` Postman 沙箱里的那些库：**lodash**（同时也是全局的 `_`）用于排序和分组，**CryptoJS** 用于哈希和签名，**moment** 处理日期，**Ajv** 做 JSON Schema，还有几个别的。它们是 Zorvik 的一部分，什么都不会下载。

```js
const _ = require("lodash");
const hash = CryptoJS.SHA256(pm.response.text()).toString();
```

## 一次校验整个形状

每个字段写一个测试会很长。**JSON Schema** 描述整个形状：哪些字段必填、每个字段什么类型。`pm.response.to.have.jsonSchema(schema)` 拿正文去对照，失败时会列出每一个不符的字段，比如 `body/items/0/sales must be integer`。

## 按你的方式显示

`pm.visualizer.set(template, data)` 用你的数据填充一个 **Handlebars** 模板，并把结果显示在响应的 **可视化** 标签页里：一张菜品表格，而不是一墙 JSON。页面运行在沙箱中：只有 HTML 和 CSS，没有脚本，也不从互联网加载任何东西。

## 不要发出去

前置脚本里的 `pm.execution.skipRequest()` 意思是「这次不发」。单次发送会显示 **未发送**；集合运行会把该请求记成已跳过并继续。适合用在「只在某些环境才有意义」的请求上，或者前一个请求发现没什么可做时。

**什么时候用得上：** 一个请求需要另一个服务给的令牌、一份报告画成表格比 JSON 好读，或者一个清理请求绝不能碰生产。几行脚本，集合就能自己照看自己。
