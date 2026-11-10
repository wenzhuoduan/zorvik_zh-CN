---
id: status-codes
title: 状态码
summary: 三位数字说明请求的结果，第一位数字就告诉你是谁的问题。
minutes: 6
lab:
  title: 故意把东西弄坏
  goal: 让服务器回 404 和 500，看一个好的错误长什么样，再向实验场要任何你想要的状态码。
  minutes: 7
  playground: true
  servers:
    api:
      name: Shop API
      kind: http
      http:
        routes:
          - method: GET
            path: /products/1
            headers:
              - key: Content-Type
                value: application/json
            body: '{"id": 1, "name": "Coffee mug", "price": 9.5}'
          - method: GET
            path: /products/:id
            status: 404
            headers:
              - key: Content-Type
                value: application/json
            body: '{"error": "No product with id {{request.params.id}}"}'
          - method: GET
            path: /checkout
            status: 500
            headers:
              - key: Content-Type
                value: application/json
            body: '{"error": "The payment service did not answer", "incident": "{{secret.incident}}"}'
  steps:
    - text: 向商店要一个不存在的商品，例如 `GET {{api}}/products/999`。
      hints:
        - 1 号商品存在，其余大多数 id 不存在。
        - "发送 `GET {{api}}/products/999`。状态徽章变成琥珀色：404 Not Found。"
      check:
        request: { server: api, status: 404 }
      solution:
        - send: { method: GET, url: "{{api}}/products/999" }
    - text: 现在让服务器出错。发送 `GET {{api}}/checkout`。
      hints:
        - 这条路由是故意弄坏的，就像一个支付服务商挂了时的服务器。
        - "发送 `GET {{api}}/checkout`。状态徽章变红：500 Internal Server Error。"
      check:
        request: { server: api, path: /checkout, status: 500 }
      solution:
        - send: { method: GET, url: "{{api}}/checkout" }
    - text: 有用的错误正文会给你可以上报的东西。把那个 500 响应里的 **incident** 码填进来。
      hints:
        - 看 checkout 请求的响应正文。
        - 复制 "incident" 的值（一个词加一个数字）。
        - 屏幕上没有响应？从历史里打开那个 checkout 请求，或者在 Lab · Shop API 的流量日志里看响应正文。
      check:
        answer: "{{secret.incident}}"
      solution:
        - answer: "{{secret.incident}}"
    - text: 练习**实验场**会用你要求的任何状态码作答。发送 `GET {{playground}}/status/418`，读读状态码旁边那句说明。
      hints:
        - "`{{playground}}` 是另一个练习服务器。`/status/<码>` 就用那个码作答。"
        - "发送 `GET {{playground}}/status/418`。徽章显示 418 I'm a teapot：1998 年愚人节的一个玩笑，流行到如今这个编号专门留给它。"
      check:
        send: { url: "*/status/418", status: 418 }
      solution:
        - send: { method: GET, url: "{{playground}}/status/418" }
quiz:
  - question: 你的请求收到 401 Unauthorized。最可能的修法是什么？
    options:
      - 等一分钟再重试
      - 发送有效的凭证，例如先登录或补上令牌
      - 修服务器代码里的 bug
      - 把 GET 换成 POST
    answer: 1
    explain: 401 的意思是「你是谁？」。服务器需要能核验的凭证。403 才是「我知道你是谁，答案是拒绝」。
  - question: 哪一类状态码表示服务器自己出错了？
    options:
      - 2xx
      - 3xx
      - 4xx
      - 5xx
    answer: 3
    explain: 5xx 是服务器错误；4xx 表示请求本身有问题。
  - question: '某个 API 返回 200 OK，正文却是 {"error": "out of stock"}。你的测试应该检查什么？'
    options:
      - 只检查状态码
      - 只检查正文是不是合法 JSON
      - 状态码和正文都要检查
      - 什么都不用查，200 就代表成功
    answer: 2
    explain: 有些 API 把错误放在 200 响应里。连正文一起检查才能抓到。
---

每个响应都以一个**状态码**开头：三位数字，在你读到正文第一个字节之前，就告诉你事情怎么样了。状态码有几十个，但只看第一位就能知道大概。

| 类别 | 含义 | 该怎么办 |
|---|---|---|
| **1xx** | 信息类：「稍等」 | 很少直接见到 |
| **2xx** | 成功 | 用这个答案 |
| **3xx** | 重定向：「东西在那边」 | 跟随 `Location` 头（客户端会替你处理） |
| **4xx** | 客户端错误：「你问错了」 | 改请求 |
| **5xx** | 服务器错误：「我坏了」 | 不怪你；稍后重试，或者告诉服务器那边的人 |

```flow
响应 -[2xx]-> 用这个答案
响应 -[3xx]-> 跟着新地址走
响应 -[4xx]-> 改请求
响应 -[5xx]-> 稍后重试或上报
```

## 每天都会遇到的

- **200 OK**：给你。**201 Created**：新东西建好了（POST 之后）。**204 No Content**：做完了，没有内容要回。
- **301** 和 **308**：永久搬家。**302** 和 **307**：暂时在别处。**304 Not Modified**：你手上那份还是最新的。
- **400 Bad Request**：服务器看不懂这个请求，比如 JSON 坏了。**401 Unauthorized**：你是谁？请提供凭证。**403 Forbidden**：我知道你是谁，但不行。**404 Not Found**：那个地址上什么都没有。**409 Conflict**：和当前状态冲突，比如用户名已被占用。**422 Unprocessable Content**：看懂了，但数据不合法。**429 Too Many Requests**：慢一点。
- **500 Internal Server Error**：服务器撞上了 bug。**502 Bad Gateway** 和 **504 Gateway Timeout**：中间那台服务器（代理或负载均衡）从后面那台拿到了坏答案，或者什么都没拿到。**503 Service Unavailable**：过载了或者在维护。

> [!note] 可以这样想……
> 在咖啡柜台点单。2xx：「您的咖啡」。3xx：「我们搬家了，请去另一个柜台」。4xx：「我们不卖披萨」（你要错了东西）。5xx：「咖啡机刚坏了」（不怪你）。

> [!warning] 状态码和正文可能自相矛盾
> 有些 API 回 `200 OK`，正文里却是 `{"error": "…"}`。两边都要看。训练营后面你会写自动检查两者的测试。

## 故意弄坏东西

不顺利的那条路和顺利的一样重要。你的应用在 404 时会给出有用的提示吗？503 之后会重试、400 之后会停下吗？要弄清楚，你需要能按需失败的服务器。实验里你会用一个带坏路由的 Mock 服务器，还有**实验场**：一个练习服务器，`/status/<码>` 会用你给的任何状态码作答。

在 Zorvik 里，状态显示在响应顶部一个带颜色的徽章上：2xx 绿色、3xx 蓝色、4xx 琥珀色、5xx 红色。

**什么时候用得上：** 出问题的时候。状态码告诉你先看哪里：4xx 就再读一遍自己的请求；5xx 就去看服务器日志。
