---
id: runner-and-data-files
title: 集合运行器与数据文件
summary: 一键按顺序跑完整个文件夹，再用一个 CSV 文件把同一批请求喂成很多种输入。
minutes: 6
lab:
  title: 三次注册，一次运行
  goal: 做一个从 CSV 取值的注册请求，然后每行跑一次。
  minutes: 10
  servers:
    api:
      name: Signup API
      kind: http
      http:
        routes:
          - method: POST
            path: /signups
            matchBody: "@"
            status: 201
            headers:
              - key: Content-Type
                value: application/json
            body: '{"id": "{{$uuid}}", "welcome": true}'
          - method: POST
            path: /signups
            status: 400
            headers:
              - key: Content-Type
                value: application/json
            body: '{"error": "That email address does not look right"}'
  files:
    data/signups.csv: |
      email,plan,expectedStatus
      ada@example.com,pro,201
      grace@example.com,free,201
      not-an-email,free,400
  steps:
    - text: |
        新建一个文件夹 **Signups**（集合 **+** → **新建文件夹**）。右键它 → **新建 HTTP 请求**，命名为 **Sign up**，做成 `POST {{api}}/signups`，**JSON** 正文如下：

        ```json
        {"email": "{{email}}", "plan": "{{plan}}"}
        ```

        保存它（**⌘/Ctrl + S**）。`{{email}}` 和 `{{plan}}` 现在还不存在：数据文件会把它们填上。
      hints:
        - 正文写在 Body 标签页里。先把类型选成 JSON。
        - 方法 POST，URL {{api}}/signups，Body → JSON，粘上上面那行，然后按 ⌘S。
        - "文件夹 Signups，里面放请求 Sign up，POST，JSON 正文带 {{email}} 和 {{plan}}。保存后标签页上的小圆点会消失。"
      check:
        saved:
          request: { name: Sign up, path: "Signups/*", method: POST, url: "*/signups", body: { text: "*{{email}}*" } }
      solution:
        - call: { method: folder.create, params: { parent: "", name: Signups } }
        - call:
            method: request.create
            params:
              parent: Signups
              request:
                name: Sign up
                method: POST
                url: "{{api}}/signups"
                body: { type: json, text: '{"email": "{{email}}", "plan": "{{plan}}"}' }
    - text: |
        数据文件的最后一行是一个坏邮箱，而它的正确答案是 **400**。加一个 **响应后** 测试，按每行给出的状态来断言，然后保存：

        ```js
        pm.test("Status is as expected", () => {
          const expected = Number(pm.iterationData.get("expectedStatus"));
          pm.response.to.have.status(expected);
        });
        ```
      hints:
        - pm.iterationData 里是数据文件当前那一行。CSV 的值都是文本，所以 Number() 把 "201" 变成 201。
        - 打开 Sign up → 脚本 → 响应后，粘贴这个测试，按 ⌘S。
        - "标签页上没有小圆点就说明保存好了。没有这个测试的话，坏邮箱那个 400 会被算成失败。"
      check:
        saved:
          request: { name: Sign up, path: "Signups/*", scripts: { postResponse: "*expectedStatus*" } }
      solution:
        - call:
            method: request.save
            params:
              path: Signups/Sign up.yaml
              request:
                name: Sign up
                seq: 1
                method: POST
                url: "{{api}}/signups"
                body: { type: json, text: '{"email": "{{email}}", "plan": "{{plan}}"}' }
                scripts:
                  postResponse: |
                    pm.test("Status is as expected", () => {
                      const expected = Number(pm.iterationData.get("expectedStatus"));
                      pm.response.to.have.status(expected);
                    });
    - text: 右键 **Signups** → **运行…**。在 **数据文件** 下面点 **Choose file…**，选中训练营工作区文件夹里的 `data/signups.csv`。预览会显示 3 行。按 **运行**（**⌘/Ctrl + Enter**）。
      hints:
        - 迭代次数可以留空，运行器就会每行跑一次。
        - "文件在工作区文件夹的 data/ 里。要找到这个文件夹，打开工作区菜单（左上角 Training Bootcamp）→ 工作区设置…：「位置」显示它的路径。macOS 的文件对话框里按 ⌘⇧G 粘贴路径；Windows 上粘到地址栏。"
        - "数据文件：data/signups.csv（3 行），然后运行。三次迭代，三个测试通过，包括 not-an-email 那个 400。"
      check:
        all:
          - run: { name: Signups, iterations: 3, requests: 3, passed: true, testsPassed: 3 }
          - request: { server: api, method: POST, path: /signups, status: 400, json: { email: not-an-email } }
      solution:
        - call: { method: runner.start, params: { folder: Signups, dataFile: data/signups.csv } }
        - wait: 500
quiz:
  - question: 数据文件有 5 行，**迭代次数** 留空。文件夹里的每个请求会跑几次？
    options:
      - 一次
      - 直到你按停止
      - 5 次，每行一次
    answer: 2
    explain: 每行一次迭代。在第 3 次迭代里，`{{email}}` 是第 3 行的邮箱。
  - question: 运行器里某个请求没有测试，服务器回 404。它算通过吗？
    options:
      - 不算，没有测试时状态码 ≥ 400 就算失败
      - 算，服务器答了
      - 只有它是最后一个请求时才算
    answer: 0
    explain: 没有测试时由状态码决定。有测试时由测试决定，这正是「期望 400」的请求能通过的原因。
  - question: 为什么故意在数据文件里放一个坏邮箱？
    options:
      - 让运行慢一点
      - 检查 API 会拒绝坏输入，这和接受好输入一样重要
      - 数据文件必须包含一个错误
    answer: 1
    explain: 测试「本该失败」的输入叫负向测试。一个接受 "not-an-email" 的 API 就是一个等着发生的 bug。
---

一边探索一边一个一个发请求没问题。但当你有了十个彼此相关的请求，比如*登录、下单、支付、查发票*，你就想按顺序、带着测试、一次跑完。这就是**集合运行器**。

## 运行一个文件夹

右键文件夹 → **运行…**（或者集合的 **+** 菜单 → **运行…** 跑全部）。会打开一个以文件夹命名的运行器标签页，里面是：

- 文件夹里的请求，按顺序排列，每个都有复选框；拖动可以改顺序；
- **迭代次数**：整个列表跑几遍，以及请求之间的 **延迟（毫秒）**；
- **数据文件**：驱动这次运行的 CSV 或 JSON 文件（见下）；
- **首次失败即停止**。

按 **运行**（**⌘/Ctrl + Enter**），结果实时到达：每个请求的状态、耗时和测试。脚本的运行方式和按发送时完全一样，所以 `pm.environment.set` 串起来的链能从一个请求传到下一个。

一个请求**通过**的条件是：它被发了出去、脚本没有崩、测试都通过。没有测试的请求，状态码小于 400 就算通过。

## 数据文件

**数据文件**用不同的输入跑同一批请求。它是一份 CSV 文件（用文本存的一张表，就像表格软件导出的那样）或者一个 JSON 对象数组。每一**行**是一次**迭代**，每一**列**变成一个变量：

```anatomy
email,plan,expectedStatus | 表头行：列名会变成变量名
ada@example.com,pro,201 | 第 1 次迭代：{{email}} 是 ada@example.com
grace@example.com,free,201 | 第 2 次迭代
not-an-email,free,400 | 第 3 次迭代：坏输入，400 才是正确答案
```

在请求的任何位置把某一列当作 `{{email}}` 使用，或者用脚本读 `pm.iterationData.get("email")`。

```flow
第 1 行 -> Sign up -> 201，测试通过
第 2 行 -> Sign up -> 201，测试通过
第 3 行 -> Sign up -> 400，测试通过
```

> [!note] 可以这样想……
> 邮件合并。你写一封信，名字和地址处留空，再给它一份名单。出来的是一百封个性化的信。请求是那封信，数据文件是那份名单。

## 也要测「不顺」的路

好的数据文件会包含*本该失败*的输入：没有 @ 的邮箱、价格为 -1、长达 5000 字符的名字。把期望的状态放进单独一列，比如 `expectedStatus`，一个测试就能覆盖每一行。这叫**数据驱动测试**。

> [!tip] 数据文件放在工作区里
> 把数据文件保存在工作区文件夹内（一个 `data/` 文件夹就挺好），这样它们和用它们的请求一起进 Git。只有在设置里允许之后，Zorvik 才会读取工作区之外的数据文件。

运行结束后，**导出** 可以把它保存成 JSON 报告，或者 CI 服务器看得懂的 **JUnit XML**。自动化单元里会用到。

**什么时候用得上：** 一个表单接受五十种输入。与其手动发五十次，你留下一个请求和一份五十行的 CSV，每次运行都逐行告诉你 API 哪里弄错了。
