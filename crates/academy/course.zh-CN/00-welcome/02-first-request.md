---
id: first-request
title: 你的第一个请求
summary: 请求就是向服务器要东西，响应就是它的回答。
minutes: 4
lab:
  title: 跟服务器打个招呼
  goal: 向一个练习服务器发出请求，并读懂它的回答。
  minutes: 6
  servers:
    api:
      name: Hello API
      kind: http
      http:
        routes:
          - method: GET
            path: /hello
            headers:
              - key: Content-Type
                value: application/json
            body: '{"message": "Hello from your first server!", "secretWord": "{{secret.word}}"}'
  steps:
    - text: |
        新建一个 HTTP 请求（**⌘/Ctrl + N**），在地址栏输入 `{{api}}/hello`，然后按 **发送**。
      hints:
        - 「Lab」环境已经选好了。`{{api}}` 是一个变量，存着实验服务器的地址。
        - 按 ⌘N（Windows 上是 Ctrl+N），点进地址栏，输入 {{api}}/hello，然后按发送或 ⌘↩。
        - 「方法 GET，URL {{api}}/hello，然后发送。响应会出现在请求的下方或旁边。」
      check:
        request: { server: api, method: GET, path: /hello }
      solution:
        - send: { method: GET, url: "{{api}}/hello" }
    - text: 服务器的回答里有一个 `secretWord`。把它填在这里。
      hints:
        - 看响应体里花括号中的内容。
        - 找到写着「secretWord」的那一行，把它后面的词复制下来。
      check:
        answer: "{{secret.word}}"
      solution:
        - answer: "{{secret.word}}"
quiz:
  - question: 什么是请求？
    options:
      - 你的应用发给服务器、向它索要东西的一条消息
      - 存在你磁盘上的一个文件
      - 服务器的回答
    answer: 0
    explain: 请求负责问，响应负责答。
  - question: URL 里的 `{{api}}` 是什么意思？
    options:
      - 它就这样原样发给服务器
      - 它是一个变量，Zorvik 会在发送前把它替换成实际的值
      - 它是一条注释
    answer: 1
    explain: 双层花括号表示变量。在 Zorvik 里把鼠标停在上面就能看到它的值。
  - question: 响应显示 `200 OK`，说明了什么？
    options:
      - 服务器找不到这个页面
      - 请求成功了
      - 服务器崩溃了
    answer: 1
    explain: 200 是「一切正常」的状态。HTTP 单元里你会见到更多状态码。
---

每次应用从互联网上给你显示点什么（天气预报、一条聊天消息、一张图片），它都在**向服务器要东西**。这个提问就是**请求**。服务器的回答就是**响应**。

```sequence
You -> Server: GET /hello
Note over Server: finds /hello
Server --> You: 200 OK {"message": "Hello!"}
```

## 今天会用到的几个部分

- **方法：** 你想做什么。`GET` 表示「把这个给我」。它从不改变任何东西。
- **URL：** 向哪里要。例如 `http://127.0.0.1:5000/hello`。
- **状态：** 响应里的三位数字。`200` 表示「好，给你」。
- **响应体：** 响应的内容，常常是 **JSON**——一种由 `"name": value` 键值对组成的简单文本格式。

```anatomy
GET http://127.0.0.1:5000/hello | 方法和 URL：要什么、向哪里要
200 OK | 状态：成功了吗？
{"message": "Hello!"} | 响应体：回答本身
```

> [!note] 可以这样想……
> 像一家餐厅。你（客户端）把点单（请求）交给厨房（服务器），服务员把菜（响应）端回来，并告诉你哪里出了问题（「抱歉，汤卖完了」）。

## 变量

实验里，服务器的地址存在一个叫 `api` 的**变量**里。你写成 `{{api}}`，Zorvik 在发送时填入真实地址。把鼠标停在地址栏里的变量上就能看到它的值。

**什么时候用得上：** 当你要在笔记本、测试环境和生产环境上调同一个 API。请求保持不变，只有变量在变。
