---
id: repeat-until
title: 等待结果
summary: 有些答案还没准备好。在运行中反复发送请求直到条件成立，而不是靠猜要等多久。
minutes: 5
lab:
  title: 等报告出炉
  goal: 让集合运行反复追问，直到报告就绪，从而每次都通过测试。
  minutes: 7
  servers:
    api:
      name: Reports API
      kind: http
      http:
        routes:
          - method: GET
            path: /reports/:id
            headers:
              - key: Content-Type
                value: application/json
            body: '{"id": "{{request.params.id}}", "ready": {{$randomBoolean}}, "checkedAt": "{{$isoTimestamp}}"}'
  files:
    requests/Report jobs/_folder.yaml: |
      name: Report jobs
      seq: 90
    requests/Report jobs/Report status.yaml: |
      name: Report status
      seq: 1
      method: GET
      url: {{api}}/reports/42
      scripts:
        postResponse: |
          pm.test("Report is ready", () => {
            pm.expect(pm.response.json().ready).to.be.true;
          });
  steps:
    - text: 实验已经往你的集合里放了一个 **Report jobs** 文件夹。打开里面的 **Report status**，按 **发送** 三四次。观察答案里的 `ready` 和 **测试** 标签页。
      hints:
        - Report jobs 文件夹在侧边栏的「集合」里。点那个请求就能打开。
        - 这个练习服务器每次被问都抛一次硬币，用来代替一个「做完才算完」的真实任务。
        - "多发几次。有时候 ready 是 true，测试通过；有时候是 false，测试失败。"
      check:
        request: { server: api, method: GET, path: /reports/42, count: 2 }
      solution:
        - send: &status
            method: GET
            url: "{{api}}/reports/42"
            scripts:
              postResponse: |
                pm.test("Report is ready", () => {
                  pm.expect(pm.response.json().ready).to.be.true;
                });
        - send: *status
    - text: |
        在 **Report status** 里打开 **设置** 标签页。在 **重复直到** 下面把 **在集合运行时重复** 打开，**条件** 填 `pm.response.json().ready === true`，**间隔** 填 `250`。保存（**⌘/Ctrl + S**）。
      hints:
        - 设置是请求的标签页之一，挨着脚本。「重复直到」在靠下的位置。
        - "条件是一段 JavaScript，必须变成 true：pm.response.json().ready === true"
        - "在集合运行时重复：开，条件如上，间隔：250（毫秒），放弃于：留 30000。然后 ⌘S。"
      check:
        saved:
          request: { name: Report status, path: "Report jobs/*", settings: { repeat: { condition: "*ready*" } } }
      solution:
        - call:
            method: request.save
            params:
              path: Report jobs/Report status.yaml
              request:
                name: Report status
                seq: 1
                method: GET
                url: "{{api}}/reports/42"
                settings: { repeat: { condition: "pm.response.json().ready === true", intervalMs: 200, timeoutMs: 30000 } }
                scripts:
                  postResponse: |
                    pm.test("Report is ready", () => {
                      pm.expect(pm.response.json().ready).to.be.true;
                    });
    - text: 右键 **Report jobs** 文件夹 → **运行…**，然后按 **运行**。测试通过了。如果运行器问了不止一次，结果里会显示发了多少次，比如 **3×**。想的话再跑一次；现在每次都能通过。
      hints:
        - 重复直到只在集合运行里生效。单次发送就只发一次。
        - 在侧边栏右键 Report jobs，选 运行…，然后按运行或 ⌘Enter。
        - "结果那一行会显示 2× 或 4× 这样的数字：运行器在 ready 变 true 之前问了这么多次。"
      check:
        run: { name: Report jobs, passed: true, testsPassed: ">=1" }
      solution:
        - call: { method: runner.start, params: { folder: Report jobs } }
        - wait: 1000
quiz:
  - question: 为什么不在检查慢任务之前先固定等 10 秒？
    options:
      - Zorvik 每个请求只能发一次
      - 有些天任务要 11 秒，测试就失败；另一些天又白等 9 秒
      - 服务器不允许等待
    answer: 1
    explain: 固定等待要么太短要么太长。反复追问则是「任务多快就多快，需要多耐心就多耐心」。
  - question: 一个请求的 **条件** 留空时，什么时候停止重复？
    options:
      - 正好发三次之后
      - 永不停止
      - 当它的测试通过时（没有测试时，状态码小于 400），或者时间用完时
    answer: 2
    explain: 空条件的意思是「直到这个请求的测试通过」。放弃于 这个上限总会终止它，然后该请求判为失败。
  - question: "**重复直到** 在哪里生效？"
    options:
      - 集合运行时，在应用里和 `zorvik run` 里都生效
      - 每次按发送时
      - 只在负载测试里
    answer: 0
    explain: 单次发送只发一次，好让你看清每个答案。集合运行（包括命令行上的运行）才会重复。
---

不是每个答案都立刻就好。你让服务器生成一份报告、转码一段视频或处理一笔支付，它说*「收到，在处理」*，结果稍后才出现。这叫**异步任务**，到处都有：导出、支付、AI 请求，以及任何需要一点时间的事。

## 任务的套路

通常一个请求启动任务，另一个请求去问进度。你问一次、再问一次，直到它说*完成*。这样反复询问叫**轮询**。

```sequence
participants: Zorvik, 服务器
Zorvik -> 服务器: GET /reports/42
服务器 --> Zorvik: {"ready": false}
Note over Zorvik: 等 250 毫秒
Zorvik -> 服务器: GET /reports/42
服务器 --> Zorvik: {"ready": false}
Note over Zorvik: 等 250 毫秒
Zorvik -> 服务器: GET /reports/42
服务器 --> Zorvik: {"ready": true}
Note over Zorvik: 条件成立，运行测试
```

一个立刻检查报告的测试，运气好的天通过、运气差的天失败。这种测试叫**不稳定测试**，而不稳定的测试比没有测试更糟：人们会学会无视它。

## 重复直到

每个 HTTP 请求都有一个 **设置** 标签页，里面有 **重复直到** 一节。打开 **在集合运行时重复**，然后填：

- **条件：** 一段 JavaScript，当答案就是你等的那个时变成 true，比如 `pm.response.json().status === "done"`。留空就是重复到该请求自己的测试通过为止。
- **间隔：** 两次发送之间等多少毫秒。
- **放弃于：** 毫秒为单位的时间上限。条件始终不成立时，该请求失败并说明原因。

条件在响应后脚本之后运行，所以可以用它们做过的任何事。运行器会给每条结果显示发送次数，比如 **3×**，而且只算最后一个答案的测试。

> [!note] 可以这样想……
> 查快递。你不会整天站在门口，也不会看一眼就放弃。你隔一会儿刷一下物流页，直到显示*已送达*；如果一周后还没到，你就打电话问。

## 什么时候生效

重复发生在**集合运行**里，应用内和命令行的 `zorvik run` 都算。单次 **发送** 永远只发一次，好让你自己看每个答案。

> [!warning] 永远留一个上限
> 选一个和任务匹配的 **放弃于**：报告几秒，视频也许几分钟。一个永远完不成的任务应该让这次运行失败，而不是把它永远挂在那里。

实验里的练习服务器每次被问都抛一次硬币。真实的服务器会在做完后说 `ready`；你的请求分辨不出区别，而这正是重点：它不需要知道任务要多久。

**什么时候用得上：** 你在 CI 里测导出或支付流程。运行会问到任务做完，一做完就通过，卡住时明确失败，而不是每隔三晚随机失败一次。
