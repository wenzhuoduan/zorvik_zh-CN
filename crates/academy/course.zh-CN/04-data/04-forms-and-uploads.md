---
id: forms-and-uploads
title: 表单与文件上传
summary: 网页表单发送 `key=value` 对；文件走 multipart 正文，用 boundary 切成一段段。
minutes: 6
lab:
  title: 先联系我们，再上传小票
  goal: 发送一个 URL 编码表单和一个带文件的 multipart 上传，看它们分别怎么到达服务器。
  minutes: 7
  files:
    uploads/receipt.txt: |
      Coffee Corner, Lisbon
      Receipt {{secret.receipt}}
      2 x espresso beans 500 g ... 18.40 EUR
      Paid by card
  servers:
    api:
      name: Help Desk API
      kind: http
      http:
        routes:
          - name: Contact form
            method: POST
            path: /contact
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"ok": true, "message": "Thanks, we will be in touch."}'
          - name: Upload
            method: POST
            path: /upload
            status: 201
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"ok": true, "stored": true}'
  steps:
    - text: |
        发送 `POST {{api}}/contact`，正文用 **Form URL-encoded**，两个字段：`name` = `Ada`，`message` = `Hello there`。
      hints:
        - 在 **Body** 标签页里，正文类型列表中有 **Form URL-encoded**，它给你一张键值表。
        - 方法 POST，正文类型 **Form URL-encoded**，然后每个字段一行。`Hello there` 里的空格 Zorvik 会替你编码。
        - "两行：name = Ada，message = Hello there。URL {{api}}/contact，然后发送。"
      check:
        all:
          - request:
              server: api
              method: POST
              path: /contact
              headers: { content-type: "application/x-www-form-urlencoded*" }
              body: "re:(^|&)name=Ada(&|$)"
          - request: { server: api, method: POST, path: /contact, body: "re:(^|&)message=Hello(\\+|%20)there(&|$)" }
      solution:
        - send:
            method: POST
            url: "{{api}}/contact"
            body:
              type: formUrlencoded
              form: [{ key: name, value: Ada }, { key: message, value: Hello there }]
    - text: |
        上传实验放进你工作区的那张小票。发送 `POST {{api}}/upload`，正文用 **Multipart form**：

        - 一个文本字段 `title` = `Coffee receipt`
        - 一个 **File** 字段 `file`，指向 `uploads/receipt.txt`
      hints:
        - multipart 的每一行，值前面都有一个小小的 **Text / File** 开关。
        - 选 **Multipart form**，加一行 `title`（文本），再加 `file`，把开关切到 **File**，按 **Browse**。小票在训练营工作区的 `uploads` 文件夹里。
        - "也可以直接输入路径 uploads/receipt.txt：文件路径相对于工作区文件夹。然后发送。"
      check:
        all:
          - request:
              server: api
              method: POST
              path: /upload
              headers: { content-type: "multipart/form-data; boundary=*" }
              body: '*name="title"*Coffee receipt*'
          - request: { server: api, method: POST, path: /upload, body: '*filename="receipt.txt"*{{secret.receipt}}*' }
      solution:
        - send:
            method: POST
            url: "{{api}}/upload"
            body:
              type: multipart
              multipart:
                - { key: title, value: Coffee receipt }
                - { key: file, value: uploads/receipt.txt, file: true }
    - text: |
        打开 **服务器 → Lab · Help Desk API**，在它的流量里点你那次上传。文件那一部分带着小票：把它的收据码填进来。
      hints:
        - 实验服务器收到的每个请求都会出现在它的流量列表里。点一个就能看到它的请求头和正文。
        - 在请求正文里找到带 `filename="receipt.txt"` 的那一段。文件内容跟在它那几行小头之后。
        - "复制文件第二行 Receipt 后面的那个值。"
      check:
        answer: "{{secret.receipt}}"
      solution:
        - answer: "{{secret.receipt}}"
quiz:
  - question: Form URL-encoded 请求的正文长什么样？
    options:
      - "name=Ada&message=Hello+there"
      - "{\"name\": \"Ada\"}"
      - 若干由 boundary 行分隔的段
    answer: 0
    explain: 它和查询串是同一种 key=value 格式，只不过放在正文里而不是 URL 里。
  - question: 你要连同一段说明发一张照片。用哪种正文类型？
    options:
      - Form URL-encoded
      - Multipart form
      - JSON
    answer: 1
    explain: multipart 正文可以带多段，每段有自己的内容类型，所以文本字段和文件能一起走。
  - question: 在 multipart 正文里，boundary 是干什么的？
    options:
      - 把每段加密，让代理读不到
      - 告诉服务器最大上传体积
      - 标记一段在哪里结束、下一段从哪里开始
    answer: 2
    explain: boundary 是一条随机的分隔行，保证不会出现在数据里。它写在 Content-Type 头里，服务器据此切分正文。
---

在 JSON 一统天下之前，Web 早就有发送数据的办法：**HTML 表单**。每个登录页、搜索框和联系表单现在仍在用它，很多 API 也接受。它有两种形式，Zorvik 各有一个正文类型。

## Form URL-encoded：简单的字段

**URL 编码表单**就是查询参数那一课里的查询串格式，搬到了正文里：`key=value` 对用 `&` 连接，特殊字符做百分号编码。

```http
POST /contact HTTP/1.1
Content-Type: application/x-www-form-urlencoded

name=Ada&message=Hello+there
```

它紧凑、几乎所有服务器都懂，但只能承载文本。在 Zorvik 里，在 **Body** 标签页选 **Form URL-encoded** 然后填表，Zorvik 会编码值并设好 `Content-Type` 头。

## Multipart：字段和文件一起走

要发**文件**，正文得能装字节，还得给每一块一点说明。**multipart 表单**正文被切成若干**段（part）**。每段有自己的小头（字段名、文件名、它自己的 `Content-Type`），后面是它的数据。一条**boundary**（一条绝不会出现在数据里的随机行）把各段隔开。请求的 `Content-Type` 头会声明它：`multipart/form-data; boundary=----ZorvikBoundary…`。

```anatomy
------ZorvikBoundary7f3a | boundary：新的一段开始
Content-Disposition: form-data; name="title" | 一个叫 title 的文本字段
Coffee receipt | 它的值
------ZorvikBoundary7f3a | 下一段
Content-Disposition: form-data; name="file"; filename="receipt.txt" | 一个文件字段，带文件名
Content-Type: text/plain | 它是什么类型的文件
Coffee Corner, Lisbon… | 文件的字节
------ZorvikBoundary7f3a-- | 两个额外的短横线：结束
```

> [!note] 可以这样想……
> 寄一个分格的包裹。URL 编码表单是明信片：只有短文本。multipart 正文是带隔板的箱子：每格都有自己的标签说明里面是什么，信旁边还能放张照片。

在 Zorvik 里选 **Multipart form**。每一行有一个 **Text / File** 开关：文本行填值，文件行填路径。发送时 Zorvik 会读文件、按扩展名猜它的内容类型，并替你拼好各段和 boundary。

> [!warning] 文件只能在工区里
> 文件路径可以相对于工作区文件夹，而且默认情况下 Zorvik 只发送工作区内的文件。共享出去的工作区没法悄悄传走你的私密文件，比如 SSH 密钥。要允许其他位置的文件，在 **设置 → 数据与隐私** 里打开 **工作区之外的文件**。

## 该选哪个

| 你要发… | 用 |
|---|---|
| 给现代 API 的结构化数据 | JSON |
| 几个简单字段，比如登录表单 | Form URL-encoded |
| 一个或多个文件，可能还带字段 | Multipart form |
| 单个文件的原始字节 | 二进制文件 |

由 API 的文档决定，而不是你：如果文档说 `multipart/form-data`，那 JSON 正文再好看也不行。

**什么时候用得上：** 测头像上传、一个接收 CSV 文件的导入接口，或者一个老的登录表单——它只认 `username=…&password=…`。
