---
id: fake-data
title: 每次发送都用假数据
summary: 内置动态变量 {{$randomEmail}}、{{$isoDate(+7d)}} 之类，让你每次发送都能拿到新鲜、像真的测试数据。
minutes: 6
added: 0.2.0
lab:
  title: 一群测试用户
  goal: 每次发送都用新的假数据注册用户、下订单；用参数塑造取值；让同一个值出现在两处。
  minutes: 8
  servers:
    api:
      name: Sign-up API
      kind: http
      http:
        routes:
          - name: Sign up
            method: POST
            path: /users
            status: 201
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"id": "{{$uuid}}", "status": "created", "received": {{request.body}}}'
          - name: Place order
            method: POST
            path: /orders
            status: 201
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"status": "received", "order": {{request.body}}}'
          - name: Update order
            method: PUT
            path: /orders/:id
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"id": "{{request.params.id}}", "status": "updated", "received": {{request.body}}}'
  steps:
    - text: |
        注册一个编出来的人。发送 `POST {{api}}/users`，**JSON** 正文如下：

        ```json
        {"name": "{{$randomFullName}}", "email": "{{$randomEmail}}"}
        ```

        在引号里输入 `{{$`，从建议列表里挑一个，或者直接粘贴。发送两次：每次的答案都是另一个人。
      hints:
        - 以 `$` 开头的名字是动态变量。它们不需要你在任何地方定义；Zorvik 在请求发出时生成取值。
        - "方法 POST，**Body** 标签页，类型 **JSON**。在引号里输入 `{{$rand`，列表会给出 $randomFullName、$randomEmail 等，每个都带一个示例值。"
        - "POST {{api}}/users，JSON 正文 {\"name\": \"{{$randomFullName}}\", \"email\": \"{{$randomEmail}}\"}，然后发送。答案里的 received 部分会显示发出去的名字和邮箱。"
      check:
        all:
          - request:
              server: api
              method: POST
              path: /users
              json:
                name: "re:^[^{}]+ [^{}]+$"
                email: "re:^[^@{}\\s]+@example\\.(com|net|org)$"
          - send: { url: "*/users", request: { body: { text: "*{{$random*" } } }
      solution:
        - send:
            method: POST
            url: "{{api}}/users"
            body: { type: json, text: "{\"name\": \"{{$randomFullName}}\", \"email\": \"{{$randomEmail}}\"}" }
    - text: |
        参数可以塑造取值。订随机件数的 T 恤，1 到 5 件，尺码随机，一周后送达。发送 `POST {{api}}/orders`：

        ```json
        {
          "quantity": {{$randomInt(1, 5)}},
          "size": "{{$randomFrom(S, M, L)}}",
          "deliverBy": "{{$isoDate(+7d)}}"
        }
        ```
      hints:
        - 参数写在名字后面的括号里。`$randomInt(1, 5)` 是 1 到 5 的整数，两端都包含；`+7d` 把今天的日期往后推七天。
        - "`quantity` 不带引号，所以服务器拿到的是数字。`size` 和 `deliverBy` 是文本，所以保留引号。"
        - "POST {{api}}/orders，Body JSON 如上，然后发送。答案会回显 1 到 5 的件数、S/M/L 的尺码，以及 2026-10-05 这样的日期。"
      check:
        all:
          - request:
              server: api
              method: POST
              path: /orders
              json:
                quantity: "re:^[1-5]$"
                size: "re:^[SML]$"
                deliverBy: "re:^\\d{4}-\\d{2}-\\d{2}$"
          - send: { url: "*/orders", request: { body: { text: "*{{$isoDate(*" } } }
      solution:
        - send:
            method: POST
            url: "{{api}}/orders"
            body:
              type: json
              text: "{\n  \"quantity\": {{$randomInt(1, 5)}},\n  \"size\": \"{{$randomFrom(S, M, L)}}\",\n  \"deliverBy\": \"{{$isoDate(+7d)}}\"\n}"
    - text: |
        每一个 `{{$uuid}}` 都是新值，同一个请求里写两次也是。要让同一个 id 出现在两处，先在 **Pre-request** 脚本里生成一次：

        ```js
        pm.variables.set("orderId", pm.variables.replaceIn("{{$uuid}}"));
        ```

        然后发送 `PUT {{api}}/orders/{{orderId}}`，JSON 正文 `{"id": "{{orderId}}", "status": "paid"}`。地址里的 id 和正文里的 id 就是同一个。
      hints:
        - "`pm.variables.replaceIn` 会把一段文本里的变量填好，动态变量也算。`pm.variables.set` 把这个结果保留给本次发送。"
        - "方法 PUT，URL {{api}}/orders/{{orderId}}。Scripts 标签页 → Pre-request：把那一行粘进去。Body 标签页 → JSON。"
        - "PUT {{api}}/orders/{{orderId}}，上面那行前置脚本，正文 {\"id\": \"{{orderId}}\", \"status\": \"paid\"}，然后发送。答案里同一个 id 出现两次。"
      check:
        all:
          - request:
              server: api
              method: PUT
              path: "re:^/orders/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
              json: { id: "re:^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", status: paid }
          - send: { method: PUT, request: { url: "*orderId*", scripts: { preRequest: "*replaceIn*" } } }
      solution:
        - send:
            method: PUT
            url: "{{api}}/orders/{{orderId}}"
            body: { type: json, text: "{\"id\": \"{{orderId}}\", \"status\": \"paid\"}" }
            scripts:
              preRequest: pm.variables.set("orderId", pm.variables.replaceIn("{{$uuid}}"));
quiz:
  - question: 一个请求的 URL 里有 `{{$uuid}}`，某个请求头里也有一个。发送时它们会拿到什么？
    options:
      - 同一个 UUID，每次发送只生成一次
      - 两个不同的 UUID
      - 文本 `{{$uuid}}`，因为它没有在任何环境里定义
    answer: 1
    explain: 每处使用都会拿到新值。要共用同一个，就在前置脚本里用 pm.variables.replaceIn 生成一次，然后用普通变量。
  - question: 你需要 10 到 20 之间的整数。哪一个能给你？
    options:
      - "`{{$randomInt(10, 20)}}`"
      - "`{{$randomFrom(10, 20)}}`"
      - "`{{$randomInt}}`"
    answer: 0
    explain: "$randomInt 接受最小值和最大值，两端都包含。$randomFrom 是从你列出的值里挑一个，所以只会是 10 或 20；只写 $randomInt 则是 0 到 1000。"
  - question: 为什么 `{{$randomEmail}}` 生成的地址都以 example.com、example.net 或 example.org 结尾？
    options:
      - Zorvik 拥有这些域名，会读这些邮件
      - 这些是 API 唯一接受的域名
      - 这些域名是保留给示例用的，所以真人不会收到你的测试邮件
    answer: 2
    explain: example 系列域名不属于任何人的邮箱。一个会发欢迎邮件的注册测试，不会去骚扰陌生人。
---

拿同一个 `ada@example.com` 反复测注册接口，第二次就失败：*email already taken*。每次发送前手打新名字和新邮箱，很快就烦了；而 `test123` 这种编出来的值又不像真实数据，反而会掩盖真实数据能暴露的 bug。

**动态变量**解决了这个问题。它们看起来像普通变量，只是前面多一个 `$`，Zorvik 每次发送都会生成新值。

```sequence
participants: 你, Zorvik, API
你 -> Zorvik: 发送 {"email": "{{$randomEmail}}"}
Note over Zorvik: 生成一个新值
Zorvik -> API: {"email": "lottie.smith24@example.org"}
API --> Zorvik: 201 Created
```

## 内置 170 个

动态变量不需要你在任何地方定义。一共 170 个：id、日期、姓名、地址、价格、卡号等等。举几个：

| 变量 | 生成 |
|---|---|
| `{{$uuid}}` | 一个唯一 id，例如 `3f1c9b0e-7d2a-4c8e-9a51-2b6f0d4e8c17` |
| `{{$timestamp}}` | 1970 年以来的秒数，例如 `1790588467` |
| `{{$randomFullName}}` | 一个名字，例如 `Priya Fernández` |
| `{{$randomEmail}}` | 一个邮箱地址，例如 `pablo.garcia62@example.com` |
| `{{$randomCity}}` | 一个城市，例如 `Lisbon` |
| `{{$randomPrice(5, 50)}}` | 5 到 50 之间的价格，例如 `24.99` |

不用背：在任意字段里输入 `{{$`（URL、请求头、正文都行），会弹出建议列表，每项旁边都有一个示例值。在列表里把鼠标停上去能看到它生成什么。凡是用得着变量的地方它们都能用，连 Mock 服务器的应答里也行。

## 参数塑造取值

很多变量可以在括号里带**参数**：

```anatomy
{{$randomInt(1, 100)}} | 1 到 100 的整数，两端都包含
{{$randomFrom(S, M, L)}} | 你列出的值里的一个
{{$isoDate(+7d)}} | 从今天起一周后的日期（s、m、h、d、w）
{{$timestamp(-1h)}} | 一小时前的时间
```

不带参数时会用合理的默认值：`{{$randomInt}}` 是 0 到 1000。参数写错，比如最小值大于最大值，变量会原样保留，响应里会提示有*未定义的值*。

> [!note] 可以这样想……
> 电影公司的道具组。它发给你护照、钞票和信件，镜头里看起来都是真的，但没有一样能在真的商店里用。动态变量就是你 API 的道具：足够真实可以用来测试，干别的都没用。

## 设计上就是安全的

这些值只用于测试。邮箱使用保留域名 `example.com`、`example.net`、`example.org`，所以没有真人的邮箱会收到你的测试邮件。卡号来自卡组织的测试号段。IBAN 和 ISBN 校验位合法，但不属于任何人。

## 一个值，多处使用

每处使用都会拿到新值。同一个请求里两个 `{{$uuid}}` 是两个不同的 id。当 URL 和正文必须带*同一个* id 时，在**前置脚本**里生成一次，然后用普通变量：

```js
pm.variables.set("orderId", pm.variables.replaceIn("{{$uuid}}"));
```

之后到处写 `{{orderId}}` 就行。`pm.variables` 的值只活一次发送（或一次集合运行），下一次发送会拿到新 id。

> [!tip] 调试时把值钉住
> 你自己定义的变量会盖过同名动态变量。把 `$timestamp` 加到环境里，在你删掉它之前，每个请求都会用这个固定时间。

**什么时候用得上：** 测试会创建用户、订单或预约。每次运行都拿到全新的名字、邮箱和 id，不会出现「已存在」错误，而且数据长得像真人发来的。
