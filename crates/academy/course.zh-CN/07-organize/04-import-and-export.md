---
id: import-and-export
title: 导入与导出
summary: 从 cURL、Postman 和 OpenAPI 把请求带进来，再以 cURL 或可直接运行的代码交给别人。
minutes: 5
lab:
  title: 从一条 cURL 命令到 Python
  goal: 导入一条 cURL 命令、发送并保存它，再以代码形式复制给同事。
  minutes: 7
  servers:
    api:
      name: Weather API
      kind: http
      http:
        routes:
          - method: GET
            path: /forecast
            headers:
              - key: Content-Type
                value: application/json
            body: '{"city": "{{request.query.city}}", "tempC": 21, "sky": "sunny", "wind": "light breeze"}'
  steps:
    - text: |
        同事发给你这条命令：

        ```bash
        curl '{{api}}/forecast?city=Lisbon' -H 'Accept: application/json' -H 'X-Client: bootcamp'
        ```

        打开集合的 **+** 菜单 → **导入…**，选 **cURL** 标签页，粘贴进去，点 **作为新请求打开**，然后 **发送**。
      hints:
        - 导入会把命令变成一个普通请求标签页，URL、查询参数和请求头都填好了。
        - 点集合顶部的 +，选导入…，再选 cURL 标签页。粘贴整条命令，从 curl 开始。
        - "粘贴后点「作为新请求打开」，看看 Headers 标签页（X-Client: bootcamp 在里面），然后发送。"
      check:
        all:
          - call: { method: import.curl, ok: true }
          - request: { server: api, method: GET, path: /forecast, query: { city: Lisbon }, headers: { x-client: bootcamp } }
      solution:
        - call: { method: import.curl, params: { text: "curl '{{api}}/forecast?city=Lisbon' -H 'Accept: application/json' -H 'X-Client: bootcamp'" } }
        - send:
            method: GET
            url: "{{api}}/forecast?city=Lisbon"
            headers: [{ key: Accept, value: application/json }, { key: X-Client, value: bootcamp }]
    - text: 把导入的请求保存下来（**⌘/Ctrl + S**），名字用 **Lisbon forecast**。
      hints:
        - 导入的请求只是一个新标签页，保存之前它不在集合里。
        - 按 ⌘S（Windows 上是 Ctrl+S），输入名字，文件夹留在集合最上层。
        - "名字：Lisbon forecast，然后保存。它会出现在侧边栏里。"
      check:
        saved:
          request: { name: Lisbon forecast, url: "*forecast?city=Lisbon*", headers: [{ key: X-Client, value: bootcamp }] }
      solution:
        - save:
            name: Lisbon forecast
            method: GET
            url: "{{api}}/forecast?city=Lisbon"
            headers: [{ key: Accept, value: application/json }, { key: X-Client, value: bootcamp }]
    - text: 你的同事用 Python。打开 **更多操作**（保存按钮旁的 **⋯**）→ **复制为 cURL 或代码…**，在语言列表里选 **Python**。（其他语言也都可以。）
      hints:
        - 同一个弹窗能生成用于 bash、Windows 命令提示符和 PowerShell 的 cURL，以及 16 种语言的代码。
        - 语言列在弹窗左边「Code」下面。在搜索框里输入就能找到。
        - "选 Python（默认用 requests 库，旁边是 HTTPX）。代码立刻出现在右边，点复制就进剪贴板。"
      check:
        call: { method: export.snippet, ok: true }
      solution:
        - call:
            method: export.snippet
            params:
              request:
                name: Lisbon forecast
                method: GET
                url: "{{api}}/forecast?city=Lisbon"
                headers: [{ key: Accept, value: application/json }, { key: X-Client, value: bootcamp }]
              path: null
              language: python
              resolveVariables: true
quiz:
  - question: 你网页上的某个页面显示了错误的数据。怎么在 Zorvik 里精确重放它发出的请求？
    options:
      - 重新输一遍 URL，再猜请求头
      - 把 Network 面板截图然后导入
      - 在浏览器开发者工具里用「复制为 cURL」，然后在 Zorvik 里 导入 → cURL
    answer: 2
    explain: 浏览器能把一个请求连所有请求头和 Cookie 一起复制成 cURL 命令，Zorvik 再把它变成你可以修改、重发的请求。
  - question: 下面哪些是 Zorvik 能导入的？
    options:
      - Postman 集合与环境、OpenAPI 与 Swagger 文档，以及 cURL 命令
      - 只有 Zorvik 自己生成的文件
      - 任何记录了 API 的网页
    answer: 0
    explain: 导入弹窗会自己识别类型。Postman 的脚本和变量会一并带过来，OpenAPI 文档则每个操作生成一个请求。
  - question: 你把请求以 **Python (requests)** 复制，并且 **替换变量** 是开着的。你拿到的是什么？
    options:
      - 只有 Zorvik 能读的文件
      - 发送同一个请求的 Python 代码，变量已经换成实际值
      - 请求的截图
    answer: 1
    explain: 代码可以直接运行。开关开着时里面是真实值（含秘密），所以要分享时把它关掉，让代码里保留 `{{apiKey}}`。
---

你很少是从零开始的：API 文档把示例写成 `curl` 命令，同事发来一个 Postman 集合，后端团队发布 OpenAPI 文档。而当你发现一个 bug，负责修的开发者想看的却是*他那门语言*的写法。Zorvik 让请求双向流动。

## 导入

打开集合的 **+** 菜单（或右键一个文件夹）→ **导入…**。Zorvik 支持：

- **cURL 命令**，从文档、终端或浏览器复制来的（bash、Windows 命令提示符和 PowerShell 三种写法）。
- **Postman** 集合与环境。脚本、测试和变量会一并带过来。
- **OpenAPI 3 与 Swagger 2** 文档，JSON 或 YAML，来自文件或 URL。每个操作变成一个请求，带一个像样的示例正文。测试单元里会细讲。

**cURL** 是一个很小的命令行程序，用来发 HTTP 请求。它无处不在，所以它的命令成了分享请求的通用语言：

```anatomy
curl 'https://api.example.com/forecast?city=Lisbon' | URL，包含查询串
-X POST | 方法（不写就是 GET）
-H 'Accept: application/json' | 一个请求头；-H 可以重复出现
-d '{"city": "Lisbon"}' | 要发送的正文
```

> [!tip] 重放浏览器做过的事
> 在 Chrome、Edge 或 Firefox 里打开开发者工具，在 **Network** 里右键一个请求，选择 **Copy → Copy as cURL**。导入进来，你就得到了那个网页真正发出的请求，请求头和 Cookie 都在，可以改也可以重发。

## 导出

在请求标签页里打开 **更多操作**（保存按钮旁的 **⋯**）→ **复制为 cURL 或代码…**。可以选择：

- **cURL**，用于 bash 和 zsh（macOS、Linux）、Windows 命令提示符或 PowerShell。
- **HTTPie、Wget 和 PowerShell** 命令。
- **代码**：JavaScript（fetch 或 axios）、Python（requests 或 HTTPX）、Go、Java、Kotlin（OkHttp、Android）、Swift（URLSession）、C#、PHP、Ruby、Rust、Dart（Flutter）和 C（libcurl）。

代码顶部有一行注释，告诉你哪些事它做不到而那本是 Zorvik 替你做的，比如应答 Digest 登录、或者为每个请求签名。

**替换变量** 决定代码里写什么：开着是真实值，可以直接跑；关着保留 `{{baseUrl}}` 和 `{{apiKey}}`，可以安全地贴到聊天里。

```flow
API 文档、浏览器 -[cURL]-> 导入 -> Zorvik 里的请求
Zorvik 里的请求 -[复制为 cURL 或代码]-> 终端、Python、JavaScript、Go、Java、Swift、Kotlin…
```

> [!note] 可以这样想……
> 一个好翻译。有人递给你一张 cURL 写的便条，你用 Zorvik 读；你用 Zorvik 回，同事收到的是 Python。

## 整个集合呢？

整个集合不需要导出：工作区本来就是一个装着小而可读的文件的文件夹。放进 Git，同事在他们自己的 Zorvik 里打开同一个文件夹就行。

**什么时候用得上：** 一个 bug 报告以粘贴的 cURL 命令发过来。你导入它，一分钟内复现，保存到其他请求旁边，再把可以直接开工的请求以他那门语言的代码发回去。
