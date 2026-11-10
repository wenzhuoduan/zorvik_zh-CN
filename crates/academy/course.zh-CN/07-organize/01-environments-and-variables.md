---
id: environments-and-variables
title: 环境与变量
summary: 请求只写一次，切换环境就能把它指向 Dev 或 Staging。
minutes: 5
lab:
  title: 一个请求，两台服务器
  goal: 建好 Dev 和 Staging 两个环境，用同一个请求分别发给它们。
  minutes: 8
  servers:
    dev:
      name: Dev API
      kind: http
      http:
        routes:
          - method: GET
            path: /status
            headers:
              - key: Content-Type
                value: application/json
            body: '{"environment": "dev", "version": "2.1.0-beta", "healthy": true}'
    staging:
      name: Staging API
      kind: http
      http:
        routes:
          - method: GET
            path: /status
            headers:
              - key: Content-Type
                value: application/json
            body: '{"environment": "staging", "version": "2.0.3", "healthy": true}'
  steps:
    - text: |
        按 **⌘/Ctrl + E** 打开 **环境与变量**。点 *环境* 旁边的 **+**，把新环境改名为 **Dev**，加一个变量：`baseUrl`，值是这个 Dev 服务器的地址 `{{=dev}}`。然后点 **保存修改**。
      hints:
        - 环境就是一份有名字的变量清单。Dev 只需要一个，叫 baseUrl。
        - "在弹窗里点「环境」旁边的 +，在顶部的名字框里输入 Dev，然后在「变量」列输 baseUrl、在「值」列输地址。"
        - "值就是地址本身，以 http://127.0.0.1: 开头，结尾不要斜杠。它不是变量：Dev 一旦启用，Lab 环境就关掉了。然后点保存修改。"
      check:
        saved:
          environment: { name: Dev, variables: [{ key: baseUrl, value: "{{dev}}*" }] }
      solution:
        - call: { method: env.create, params: { environment: { name: Dev, variables: [{ key: baseUrl, value: "{{dev}}" }] } } }
        - call: { method: env.save, params: { id: Dev, environment: { name: Dev, variables: [{ key: baseUrl, value: "{{dev}}" }] } } }
    - text: 弹窗里选中 **Dev** 时，点 **Duplicate**（复制）。把副本改名为 **Staging**，把它的 `baseUrl` 改成 Staging 服务器的地址 `{{=staging}}`，然后保存。
      hints:
        - 复制会把所有变量一起带过来，你只改不一样的地方。
        - 复制按钮在弹窗右上角，删除按钮旁边。副本叫「Dev copy」。
        - "把「Dev copy」改名为 Staging，把 baseUrl 设成上一步给出的 Staging 地址（同一个主机，不同端口），然后保存修改。"
      check:
        saved:
          environment: { name: Staging, variables: [{ key: baseUrl, value: "{{staging}}*" }] }
      solution:
        - call: { method: env.create, params: { environment: { name: Staging, variables: [{ key: baseUrl, value: "{{staging}}" }] } } }
        - call: { method: env.save, params: { id: Staging, environment: { name: Staging, variables: [{ key: baseUrl, value: "{{staging}}" }] } } }
    - text: 关掉弹窗。在窗口右上角的环境菜单里选 **Dev**，然后新建一个请求（**⌘/Ctrl + N**），发送 `GET {{baseUrl}}/status`。
      hints:
        - 环境菜单显示当前启用的环境名（现在写的是 Lab）。
        - 点它，选 Dev，然后按 ⌘N，在地址栏输入 {{baseUrl}}/status。把鼠标停在 {{baseUrl}} 上就能看到它的值。
        - "环境：Dev。方法 GET，URL {{baseUrl}}/status，然后发送。答案里会写 \"environment\": \"dev\"。"
      check:
        send: { request: { url: "{{baseUrl}}/status*" }, json: { environment: dev } }
      solution:
        - call: { method: env.setActive, params: { id: Dev } }
        - send: { method: GET, url: "{{baseUrl}}/status" }
    - text: 现在把环境菜单切到 **Staging**，完全不改请求，再发一次。
      hints:
        - 只有环境变了，URL 还是 {{baseUrl}}/status。
        - 点右上角的环境菜单，选 Staging，然后按发送。
        - "答案现在应该写 \"environment\": \"staging\"。同一个请求，不同的服务器。"
      check:
        send: { request: { url: "{{baseUrl}}/status*" }, json: { environment: staging } }
      solution:
        - call: { method: env.setActive, params: { id: Staging } }
        - send: { method: GET, url: "{{baseUrl}}/status" }
quiz:
  - question: "`baseUrl` 在工作区变量和当前环境里都有，值不一样。Zorvik 用哪个？"
    options:
      - 用工作区变量，因为它先存在
      - 用当前环境里的值
      - "都不用：Zorvik 会报冲突"
    answer: 1
    explain: 越具体的地方越优先。当前环境胜过工作区变量，工作区变量胜过全局。
  - question: 为什么把服务器地址放进 `baseUrl` 变量，而不是写进每个请求？
    options:
      - 变量能让请求更快
      - 服务器不接受手打的地址
      - 只改一个值或换个环境，就能把所有请求指向另一台服务器
    answer: 2
    explain: 请求始终不变，由环境决定发往哪里。换服务器是一次点击，而不是改五十处。
  - question: 你发送 `{{baseUrl}}/users`，但当前环境里没有 `baseUrl`。会发生什么？
    options:
      - Zorvik 停下来，告诉你这个变量没有定义
      - 请求会发到一台随机服务器
      - Zorvik 把它发到你自己的电脑
    answer: 0
    explain: URL 里的变量未定义时，发送会被中止并给出明确提示，而不是一个莫名其妙的网络错误。把鼠标停在这个变量上，就能看到它的值会来自哪里。
---

大部分 API 都不止存在于一个地方：你笔记本上有一份，团队共用的 **Dev** 服务器一份，和真环境一模一样的 **Staging** 一份，还有真实客户在用的 **Production**。请求在哪儿都一样，变的只有地址。

## 变量

**变量**是一个值的名字。你把它写在双层花括号里，比如 `{{baseUrl}}`，Zorvik 在请求发出前把值换进去。URL、请求头、正文和鉴权里都能用变量。

```anatomy
GET {{baseUrl}}/status | 你写的：一个变量，然后路径
GET http://127.0.0.1:5001/status | 启用 Dev 时实际发出的
GET http://127.0.0.1:5002/status | 启用 Staging 时实际发出的
```

## 环境

**环境**是一组有名字的变量。*Dev* 里 `baseUrl` 是一个地址，*Staging* 里是另一个。同一时间只有一个环境是**启用**的：在窗口右上角的环境菜单里选。一切换，所有请求都跟着走。

```flow
GET baseUrl/status -[启用 Dev]-> Dev 服务器
GET baseUrl/status -[启用 Staging]-> Staging 服务器
```

> [!note] 可以这样想……
> 手机里的联系人。你点「披萨店」，而不是点号码。如果家里存一份联系人、出门时用另一份，同一个按钮就能打通不同的披萨店，而你永远不用再输号码。

## 变量放在哪里

用 **⌘/Ctrl + E** 打开 **环境与变量**：

- **环境** 存放每台服务器不同的值，比如 `baseUrl` 或测试账号的 id。
- **工作区变量** 由所有环境共享，比如一个 API 版本号。
- **全局** 是脚本设置的值，在所有工作区里都能用。

环境就是工作区 `environments/` 文件夹里的小文件，所以团队也能通过 Git 拿到它们。另外还有每次发送都会变的**动态值**：`{{$uuid}}`、`{{$timestamp}}`、`{{$randomEmail}}` 等等。

## 哪个值优先？

同一个名字可以出现在好几个地方。越具体的地方越优先，从高到低：

```layers
pm.variables | 脚本设置的，只对一次发送或一次运行有效
数据文件行 | 集合运行时数据文件的一行
当前环境 | Dev、Staging、Production…
工作区变量 | 所有环境共享
全局 | 脚本设置的，对所有工作区有效
```

在命令行上，`--var name=value` 胜过以上全部。脚本、数据文件和命令行会在课程后面讲到。

> [!tip] 停上去确认
> 把鼠标停在地址栏里的变量上，就能看到它的值和来源。红色表示哪里都没有定义它，而有未定义变量的 URL，Zorvik 不会发出去。

实验给了你两台会给出不同答案的练习服务器，所以你能看清请求到底发到了哪一台。

**什么时候用得上：** 上午在 Staging 上验证新功能，下午去 Production 上查一个 bug——同一批保存的请求，中间只点一下。
