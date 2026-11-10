---
id: tests-in-ci
title: 在 CI 流水线里跑测试
summary: 用 CI 流水线在每次改动时运行 API 测试，让结果决定这次改动能不能上线。
minutes: 6
lab:
  title: 快速失败
  goal: 把一个发布闸门跑两遍：一遍跑到底，一遍首次失败就停，看看为什么早停更好。
  minutes: 6
  servers:
    api:
      name: Orders API
      kind: http
      http:
        routes:
          - method: GET
            path: /health
            headers:
              - key: Content-Type
                value: application/json
            body: '{"status": "ok"}'
          - method: POST
            path: /orders
            status: 500
            headers:
              - key: Content-Type
                value: application/json
            body: '{"error": "The orders database is read-only"}'
          - method: POST
            path: /orders/latest/pay
            status: 404
            headers:
              - key: Content-Type
                value: application/json
            body: '{"error": "No such order"}'
  files:
    requests/Release gate/_folder.yaml: |
      name: Release gate
      seq: 92
    requests/Release gate/Health.yaml: |
      name: Health
      seq: 1
      method: GET
      url: {{api}}/health
      scripts:
        postResponse: |
          pm.test("Service is up", () => {
            pm.response.to.have.status(200);
          });
    requests/Release gate/Create order.yaml: |
      name: Create order
      seq: 2
      method: POST
      url: {{api}}/orders
      body:
        type: json
        text: '{"item": "MUG-1", "qty": 2}'
      scripts:
        postResponse: |
          pm.test("Order created", () => {
            pm.response.to.have.status(201);
          });
    requests/Release gate/Pay order.yaml: |
      name: Pay order
      seq: 3
      method: POST
      url: {{api}}/orders/latest/pay
      scripts:
        postResponse: |
          pm.test("Order paid", () => {
            pm.response.to.have.status(200);
          });
  steps:
    - text: 实验加了一个文件夹 **Release gate**。右键它 → **运行…**，按 **运行**。有几个请求失败？两次失败都告诉了你新东西吗？
      hints:
        - Create order 先失败。看看这给 Pay order 带来了什么。
        - 在侧栏右键 Release gate，选运行…，然后按运行或 ⌘Enter。
        - "两处失败：Create order 拿到 500，随后 Pay order 拿到 404，因为没有订单可付。真正的毛病只有第一处。"
      check:
        run: { name: Release gate, requests: 3, failed: 2 }
      solution:
        - call: { method: runner.start, params: { folder: Release gate } }
        - wait: 500
    - text: 在运行器标签页里打开 **首次失败即停止**，再按 **运行**。
      hints:
        - 这个开关在运行设置里，数据文件下面。
        - 打开首次失败即停止，然后运行。
        - "运行在 Create order 之后立刻停下：只有一处失败，就是真正的那处，Pay order 根本不会跑。"
      check:
        run: { name: Release gate, bailed: true, requests: 2, failed: 1 }
      solution:
        - call: { method: runner.start, params: { folder: Release gate, stopOnFailure: true } }
        - wait: 500
    - text: 流水线里用 `zorvik run` 的哪个选项能做到同样的事？填出来。
      hints:
        - 它就在上一课的选项列表里，也在 zorvik run --help 里。
        - bail out 就是提前放弃。
        - "答案是 --bail。"
      check:
        answer: ["--bail", "bail", "zorvik run --bail"]
      solution:
        - answer: "--bail"
quiz:
  - question: 为什么要在流水线里保存 JUnit 报告？
    options:
      - JUnit 报告能让测试跑得更快
      - 没有它 Zorvik 就跑不起来
      - CI 系统会读它，在构建页面上按名字列出每个测试，失败的排前面
    answer: 2
    explain: JUnit XML 是大多数 CI 系统都认识的格式。退出码说明通过还是失败；报告说明是哪个测试、为什么。
  - question: 一个发布闸门先创建订单，再为它付款。为什么用 `--bail` 跑？
    options:
      - 这样运行会在首次失败时停下，真正的原因不会被它引发的后续失败埋掉
      - 这样失败的测试会被忽略
      - 这样运行会一直重复到通过
    answer: 0
    explain: 创建订单失败，付款必然也失败。早停更快，而且构建结果只显示那处真正要紧的失败。
  - question: 流水线需要你的 `apiKey`。它该从哪来？
    options:
      - 直接写在工作流文件里
      - CI 系统的密钥库，通过 `--var` 交给 `zorvik run`
      - 环境文件里的普通变量
    answer: 1
    explain: 工作流文件和环境文件都在 Git 里，任何有权限的人都能读到。CI 密钥库会把这个值藏起来，连日志里也不露。
---

**CI 流水线**（持续集成）是一串步骤，每次有人改代码，服务器就自动跑一遍：构建、测试，可能还会部署。某一步失败，流水线就停下，这次改动被标红。API 测试是再合适不过的一步：它能在别人合并之前抓住坏掉的接口。

## 配方

每条运行 Zorvik 测试的流水线都做四件事：

1. **取得工作区。** 它和你的代码一起放在 Git 里，所以流水线把仓库检出即可。
2. **安装 `zorvik`。** 在 Linux 构建机上，从发布页安装 `.deb`。
3. **运行测试**，用对环境，并从 CI 系统的 **密钥库** 取密钥。
4. **保存报告，** 让每个人都能看到哪个测试失败、为什么。

```flow
推送一次改动 -> CI 服务器 -> zorvik run -> 退出码 0 -> 允许合并
zorvik run -> 退出码 1 -> 构建变红
```

这是 **GitHub Actions** 上的完整写法，文件例如 `.github/workflows/api-tests.yml`：

```yaml
name: API tests
on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Zorvik
        run: |
          curl -fsSLO https://github.com/LibreGuild/zorvik/releases/latest/download/Zorvik-Linux-amd64.deb
          sudo apt-get update
          sudo apt-get install -y ./Zorvik-Linux-amd64.deb
      - name: Run the API tests
        env:
          API_KEY: ${{ secrets.STAGING_API_KEY }}
        run: zorvik run ./api-tests --env Staging --var apiKey="$API_KEY" --bail --junit report.xml
      - name: Keep the report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: api-test-report
          path: report.xml
```

GitLab CI、Jenkins、Azure Pipelines 等也是这四步，只是语法各自不同。

> [!note] 可以这样想……
> 汽车装配线末端的安全检查。每辆车都要过，没有例外；没过检查的车不许出厂，不管谁多着急。

## 报告与退出码

- **退出码** 做决定：`0` 让流水线继续，`1` 让它停下。
- **JUnit XML** 报告负责解释：大多数 CI 系统会读它，按名字列出每个测试。Zorvik 为每个请求写一个测试套件，为每个 `pm.test` 写一个测试用例。你也可以从 App 的运行器标签页导出任意一次运行（**导出 → JUnit XML…**）。

## 好习惯

- 后续请求依赖前面请求时，用 `--bail` **快速失败**，比如先创建订单再付款。
- **不要写死等待。** 慢任务用 **重复直到**，免得流水线时好时坏。
- **不归你管的就 Mock。** 在流水线里用 `zorvik serve` 启动一个保存好的 Mock，而不是每次推送都去调真正的支付服务商。
- **谨慎选目标。** 对着预发或测试服务器测；会创建和删除数据的测试不该放在生产环境。

**什么时候用得上：** 同事提了个改了字段名的 PR。流水线跑你的集合，契约检查变红，问题在合并之前就被修掉，而不是等客户发现。