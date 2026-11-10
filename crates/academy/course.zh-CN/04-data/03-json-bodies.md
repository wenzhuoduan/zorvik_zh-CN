---
id: json-bodies
title: JSON 请求体
summary: 创建或修改东西的请求把数据放在正文里，大多数 API 希望它是以正确类型表达的 JSON。
minutes: 6
lab:
  title: 下两单
  goal: 发送带数字、true/false、嵌套对象的 JSON 正文，并读懂服务器回的东西。
  minutes: 7
  servers:
    api:
      name: Orders API
      kind: http
      http:
        routes:
          - name: Create order
            method: POST
            path: /orders
            status: 201
            headers:
              - { key: Content-Type, value: application/json }
              - { key: Location, value: "/orders/{{secret.order}}" }
            body: '{"orderId": "{{secret.order}}", "status": "received"}'
  steps:
    - text: |
        发送 `POST {{api}}/orders`，**JSON** 正文订两只键盘：

        ```json
        {"product": "keyboard", "quantity": 2}
        ```

        `quantity` 必须是数字，不能是文本。
      hints:
        - 把方法改成 POST，打开 **Body** 标签页选 **JSON**。
        - JSON 里的数字不加引号。`2` 是数字，`"2"` 是文本。
        - "方法 POST，URL {{api}}/orders，Body：JSON，内容 {\"product\": \"keyboard\", \"quantity\": 2}，然后发送。"
      check:
        request:
          server: api
          method: POST
          path: /orders
          headers: { content-type: "application/json*" }
          json: { product: keyboard, quantity: 2 }
          body: 're:"quantity"\s*:\s*2\s*[,}]'
      solution:
        - send:
            method: POST
            url: "{{api}}/orders"
            body: { type: json, text: "{\"product\": \"keyboard\", \"quantity\": 2}" }
    - text: |
        订一只鼠标当礼物，寄到里斯本。加一个 true/false 字段和一个嵌套对象：

        ```json
        {
          "product": "mouse",
          "quantity": 1,
          "giftWrap": true,
          "shipTo": {"name": "Ada", "city": "Lisbon"}
        }
        ```
      hints:
        - "`true` 和 `false` 跟数字一样不加引号。对象里的对象，不过是又一对花括号。"
        - 改同一个请求的正文。**Beautify**（在正文类型旁边）会把它排版整齐，并在 JSON 有问题时告诉你。
        - "Body：{\"product\": \"mouse\", \"quantity\": 1, \"giftWrap\": true, \"shipTo\": {\"name\": \"Ada\", \"city\": \"Lisbon\"}}，然后发送。"
      check:
        request:
          server: api
          method: POST
          path: /orders
          json: { product: mouse, giftWrap: true, shipTo: { city: Lisbon } }
          body: 're:"giftWrap"\s*:\s*true'
      solution:
        - send:
            method: POST
            url: "{{api}}/orders"
            body:
              type: json
              text: "{\"product\": \"mouse\", \"quantity\": 1, \"giftWrap\": true, \"shipTo\": {\"name\": \"Ada\", \"city\": \"Lisbon\"}}"
    - text: 服务器回了 `201 Created`，并给你的订单分配了 id。把 `orderId` 填进来。
      hints:
        - 在响应正文里。响应的 `Location` 头也指向这笔新订单。
        - 复制 `"orderId":` 后面的值，不要引号。
      check:
        answer: "{{secret.order}}"
      solution:
        - answer: "{{secret.order}}"
quiz:
  - question: 下面哪个是合法 JSON？
    options:
      - "{'name': 'Ada'}"
      - "{\"name\": \"Ada\",}"
      - "{\"name\": \"Ada\", \"admin\": false}"
    answer: 2
    explain: JSON 的字段名和文本都要用双引号，最后一项后面不能有逗号。`false` 不加引号。
  - question: "某个 API 期望收到 `\"quantity\": 2`，你却发了 `\"quantity\": \"2\"`。差别在哪？"
    options:
      - 你发的是文本而不是数字，严格的 API 会用 400 拒掉
      - "没有差别：JSON 把 `\"2\"` 和 `2` 当成同一个值"
      - 后者根本不是合法 JSON
    answer: 0
    explain: 两个都是合法 JSON，但一个是数字、一个是字符串。很多 API 会检查类型，然后回 400 Bad Request。
  - question: 你在 Zorvik 里选了 JSON 正文类型，它会替你加上哪个请求头？
    options:
      - "Accept: application/json"
      - "Content-Type: application/json"
      - "Authorization: JSON"
    answer: 1
    explain: Content-Type 描述你发送的正文。除非你自己设了这个头，Zorvik 会按正文类型加上它。
---

到目前你都在*读*数据。要**创建**或**修改**东西，请求得在**正文**（请求头之后的部分）里带上自己的数据。`GET` 请求通常没有正文；`POST`（创建）、`PUT`（替换）和 `PATCH`（改一部分）通常有。

```sequence
你 -> Orders API: POST /orders {"product": "keyboard", "quantity": 2}
Note over Orders API: 保存这笔订单
Orders API --> 你: 201 Created {"orderId": "…", "status": "received"}
```

## 五条规则看懂 JSON

**JSON**（JavaScript Object Notation）是大多数 API 说的格式。它是纯文本，只有几条严格规则：

1. **对象**是花括号里的一组 `"name": value` 对，用逗号分隔。
2. 字段名和文本（**字符串**）用*双*引号：`"Lisbon"`。
3. **数字**不加引号：`2`、`4.99`、`-1`。
4. `true`、`false` 和 `null`（空）也不加引号。
5. **列表**（数组）放在方括号里：`["api", "testing"]`。对象和列表可以互相嵌套。

```anatomy
{ | 对象开始
"product": "mouse", | 一个名字和一个字符串值
"quantity": 1, | 数字：不加引号
"giftWrap": true, | true/false：不加引号
"shipTo": {"city": "Lisbon"} | 对象里的对象
} | 最后一项后面没有逗号
```

> [!note] 可以这样想……
> 一张交给服务器的表格，但有严格的书写规则。服务器的代码会逐字段读它；如果某个格子放错了*种类*的东西（该填数字的地方写了「二」），它就把表格退回来。

## 类型很重要

`"quantity": 2` 和 `"quantity": "2"` 都是合法 JSON，但前者是数字，后者是文本。严格的 API 会用 `400 Bad Request` 拒掉错的写法，松散一点的 API 可能先存下来，然后别处出问题。`true` 和 `"true"` 也是同理。

## 最常见的错误

| 错误 | 错的 | 对的 |
|---|---|---|
| 单引号 | `{'city': 'Lisbon'}` | `{"city": "Lisbon"}` |
| 最后一项后面带逗号 | `{"a": 1,}` | `{"a": 1}` |
| 注释 | `{"a": 1 // one}` | JSON 没有注释 |
| 字段名不加引号 | `{city: "Lisbon"}` | `{"city": "Lisbon"}` |

## Zorvik 里的 JSON 正文

在 **Body** 标签页选 **JSON** 然后输入。编辑器会做语法着色，**Beautify** 会排版整齐，或者在 JSON 不合法时告诉你。正文里也可以用变量：`{"email": "{{email}}"}`。

正文类型是 JSON 时，除非你自己设了，Zorvik 会发送 `Content-Type: application/json`。这个头告诉服务器怎么读正文；两课之后会仔细看它。

> [!tip] 也读一读应答
> 成功的创建常常是 `201 Created`，正文里是新对象的 id，`Location` 头里是它的地址。你以后写的测试就会检查这些。

**什么时候用得上：** 通过 API 新建客户、下一笔测试订单或改一个设置。「就是不行」的时刻，大多是因为漏了字段，或者把数字当文本发了。
