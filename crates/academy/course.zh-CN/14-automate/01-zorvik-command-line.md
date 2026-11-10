---
id: zorvik-command-line
title: zorvik 命令行
summary: zorvik 命令能在终端里运行你保存的集合、负载测试和 Mock 服务器，一下都不用点。
minutes: 6
lab:
  title: 像构建服务器那样运行它
  goal: 运行一个冒烟测试文件夹，像脚本读退出码那样读它的结果，再把它缺的那个密钥补上。
  minutes: 8
  servers:
    api:
      name: Catalog API
      kind: http
      http:
        routes:
          - method: GET
            path: /health
            headers:
              - key: Content-Type
                value: application/json
            body: '{"status": "ok"}'
          - method: GET
            path: /catalog
            matchHeaders:
              - key: X-Api-Key
                value: ci-demo-4242
            headers:
              - key: Content-Type
                value: application/json
            body: '[{"sku": "MUG-1", "name": "Coffee mug"}, {"sku": "POT-2", "name": "Teapot"}]'
          - method: GET
            path: /catalog
            status: 401
            headers:
              - key: Content-Type
                value: application/json
            body: '{"error": "Missing or wrong X-Api-Key header"}'
  files:
    requests/CI smoke tests/_folder.yaml: |
      name: CI smoke tests
      seq: 91
    requests/CI smoke tests/Health.yaml: |
      name: Health
      seq: 1
      method: GET
      url: {{api}}/health
      scripts:
        postResponse: |
          pm.test("Status code is 200", () => {
            pm.response.to.have.status(200);
          });
    requests/CI smoke tests/Catalog.yaml: |
      name: Catalog
      seq: 2
      method: GET
      url: {{api}}/catalog
      headers:
        - key: X-Api-Key
          value: "{{apiKey}}"
      scripts:
        postResponse: |
          pm.test("Status code is 200", () => {
            pm.response.to.have.status(200);
          });
  steps:
    - text: 实验加了一个文件夹 **CI smoke tests**，里面有两个请求和它们的测试。右键它 → **运行…**，按 **运行**。终端里的 `zorvik run` 干的正是这件事。
      hints:
        - 这个文件夹在侧栏的集合分区里。
        - 右键 CI smoke tests，选运行…，然后按运行或 ⌘Enter。
        - "Health 通过。Catalog 以 401 失败：它的 X-Api-Key 请求头写着 {{apiKey}}，而目前还没有环境定义 apiKey。"
      check:
        run: { name: CI smoke tests, passed: false, failed: 1 }
      solution:
        - call: { method: runner.start, params: { folder: CI smoke tests } }
        - wait: 500
    - text: 如果构建服务器用 `zorvik run` 跑了这个文件夹，命令最后会以哪个 **退出码** 结束？填这个数字。
      hints:
        - 退出码是程序结束时交回的一个数字。脚本和 CI 服务器读它来决定下一步做什么。
        - 0 表示全部通过。这里确实有东西失败了。
        - "zorvik run 在有请求或测试失败时以 1 结束（无法启动或中途停止时以 2 结束）。"
      check:
        answer: ["1", "one", "exit code 1"]
      solution:
        - answer: "1"
    - text: |
        在构建服务器上，你会用 `--var apiKey=…` 把密钥传进去。在 App 里，把它加到环境中：按 **⌘/Ctrl + E**，选 **Lab**，添加 `apiKey`，值为 `ci-demo-4242`，点那个 **锁** 图标把它设为密钥，然后 **保存修改**。再运行一次这个文件夹。
      hints:
        - Catalog 请求里已经写着 {{apiKey}}，只差一个值。
        - 在环境与变量里选 Lab，加一行 apiKey = ci-demo-4242，把锁图标点上，保存修改。然后回到运行器标签页再按运行。
        - "两个请求现在都通过了：这次运行的退出码会是 0。"
      check:
        all:
          - saved:
              environment: { name: Lab, variables: [{ key: apiKey, secret: true }] }
          - run: { name: CI smoke tests, passed: true, testsPassed: 2 }
      solution:
        - call:
            method: env.save
            params:
              id: Lab
              environment:
                name: Lab
                variables:
                  - { key: api, value: "{{api}}" }
                  - { key: api_port, value: "{{api_port}}" }
                  - { key: api_host, value: "{{api_host}}" }
                  - { key: apiKey, value: ci-demo-4242, secret: true }
        - call: { method: runner.start, params: { folder: CI smoke tests } }
        - wait: 500
quiz:
  - question: "`zorvik run ./shop-api --env Staging --folder Orders` 会做什么？"
    options:
      - 它会运行工作区 ./shop-api 里 Orders 文件夹的请求，并带上 Staging 环境的变量、脚本和测试
      - 它会在 Zorvik App 里打开 Orders 文件夹
      - 它把 Orders 文件夹上传到 Staging 服务器
    answer: 0
    explain: 这个命令用的是和 App 相同的运行器。`--env` 按名字选环境，`--folder` 选 `requests/` 里的文件夹。
  - question: 你的集合需要一个密钥 `apiKey`。构建服务器上的 `zorvik run` 从哪拿到它？
    options:
      - 从 Git 里的环境文件读取
      - 向你笔记本上的 Zorvik App 询问
      - 用 `--var apiKey=…` 传入，值取自 CI 系统的密钥库
    answer: 2
    explain: 密钥值永远不会写进工作区文件，所以构建服务器上也没有。`--var` 传一个进去，而且它的优先级高于其他所有值。
  - question: 一个负载测试的阈值写着「p95 低于 200 ms」，而运行的 p95 是 350 ms。`zorvik load` 会怎么做？
    options:
      - 打印一条警告并以 0 退出
      - 以 1 退出，让流水线停下
      - 一直放慢，直到阈值通过
    answer: 1
    explain: 阈值失败就是运行失败：退出码 1。流水线就是这样拒绝发布变慢的东西的。
---

到目前为止你搭的一切——请求、测试、数据文件和 Mock 服务器——都是工作区里的普通文件。`zorvik` **命令行工具** 不用 App 也能运行这些文件。**命令行** 也就是终端，是一个靠敲命令而不是点鼠标的窗口；构建服务器只有这个。

## 安装

`zorvik` 随 App 一起安装。在 Windows 上，安装器会把它加到 **PATH**（终端查找程序的位置列表）里；Linux 安装包会把它放进 `/usr/bin`。在 macOS 上，打开 **设置 → AI Agent**，按 **把 zorvik 加入 PATH…**。然后在终端里确认一下：

```bash
zorvik --version
zorvik run --help
```

## 四条命令

```bash
zorvik run ./my-api --env Staging                     # 运行请求及其脚本和测试
zorvik run ./my-api --folder Users -d users.csv --junit report.xml
zorvik load ./my-api "Checkout smoke" --html report.html
zorvik serve ./my-api "Payments mock" --port 3100     # 启动保存好的 Mock 或服务器
zorvik mcp                                            # AI Agent 的连接入口（见最后一课）
```

第一个参数永远是 **工作区文件夹**，也就是里面有 `zorvik.yaml` 的那个。

```anatomy
zorvik run ./my-api | 运行 ./my-api 这个工作区里的请求
--env Staging | 使用这个环境的变量（按名字）
--folder "Smoke tests" | 只跑这个文件夹，路径位于 requests/ 内
--var apiKey=$API_KEY | 从外部设置变量；它的优先级高于其他所有值
-d users.csv | 数据文件，相对于你执行命令的位置
--junit report.xml | 同时保存一份供 CI 使用的 JUnit XML 报告
```

其他有用的选项：`-n 5` 跑五轮，`--bail` 首次失败就停，`--json` 输出机器可读的报告。`zorvik <command> --help` 会列出全部。

> [!warning] 密钥不会跟着走
> 密钥值只留在你输入它的那台电脑上，所以构建服务器上没有。每个都用 `--var name=value` 传进去，值取自你 CI 系统的密钥库。

`zorvik load` 运行一个保存好的负载测试并检查它的阈值，还能存一份 HTML 报告。`zorvik serve` 启动你保存的某个服务器，比如支付服务商的 Mock，并持续打印它的流量，直到你按 **Ctrl + C**。把它和 App 自己的测试放在一起跑，测试就会和 Mock 对话，而不是真家伙。

## 退出码

程序结束时，会交回一个数字，就是它的 **退出码**。脚本和 CI 服务器读它来决定下一步做什么：

| 命令 | 0 | 1 | 2 |
|---|---|---|---|
| `zorvik run` | 所有请求和测试都通过 | 有请求或测试失败 | 被停止，或无法启动 |
| `zorvik load` | 所有阈值都通过 | 有阈值失败 | 运行失败 |

```flow
zorvik run -> 退出码 0 -> 流水线继续
zorvik run -> 退出码 1 -> 流水线停下，你得到一个红色的构建结果
```

> [!note] 可以这样想……
> 一个烟雾报警器。没人去读它的日志；它要么安静，要么就叫。退出码就是你的测试在冲着构建服务器叫。

输出读起来和运行器标签页一样：每个请求一个 ✓ 或 ✗，下面跟着它的测试，最后是汇总，列出通过和失败的请求数与测试数。

**什么时候用得上：** 你希望 API 测试每晚都跑、每次改动都跑，而且跑在一台没人守着的机器上。一行 `zorvik run`，红或绿的结果就落在你团队本来就会看的地方。