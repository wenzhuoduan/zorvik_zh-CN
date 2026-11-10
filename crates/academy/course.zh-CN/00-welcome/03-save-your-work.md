---
id: save-your-work
title: 保存你的成果
summary: 保存的请求住进集合里；历史记住你发出的每一个请求。
minutes: 3
lab:
  title: 建你的第一个集合
  goal: 保存一个请求，然后在集合和历史里再把它找出来。
  minutes: 6
  servers:
    api:
      name: Greetings API
      kind: http
      http:
        routes:
          - method: GET
            path: /greetings
            headers:
              - key: Content-Type
                value: application/json
            body: '[{"lang": "en", "text": "Hello"}, {"lang": "es", "text": "Hola"}, {"lang": "hi", "text": "Namaste"}]'
  steps:
    - text: 新建一个发往 `{{api}}/greetings` 的请求，并把它**保存**（⌘/Ctrl + S），名字用 **Greetings**。
      hints:
        - 保存时会问名字和文件夹。放在集合最上层就可以。
        - 按 ⌘N，输入 {{api}}/greetings，再按 ⌘S，名字写 Greetings。
      check:
        saved:
          request: { name: Greetings, method: GET, url: "*/greetings" }
      solution:
        - save: { name: Greetings, method: GET, url: "{{api}}/greetings" }
    - text: 从侧边栏的集合里打开 **Greetings** 并发送它。
      hints:
        - 「集合」是左侧栏里的第一个图标。
        - 在侧边栏点 Greetings，然后按发送。
      check:
        request: { server: api, method: GET, path: /greetings }
      solution:
        - send: { name: Greetings, method: GET, url: "{{api}}/greetings" }
    - text: 服务器一共返回了几条问候？填数字。
      hints:
        - 数一数方括号里有几项。
      check:
        answer: ["3", "three"]
      solution:
        - answer: "3"
quiz:
  - question: 保存的请求去了哪里？
    options:
      - 进了集合，成为工作区文件夹里的一个文件
      - 只进历史
      - 直到你导出之前哪里都不去
    answer: 0
    explain: 工作区就是一个纯文本文件的文件夹，可以放进 Git，和团队共享。
  - question: 一小时前你发过一个请求但没保存。在哪能找到它？
    options:
      - 已经没了
      - 在「历史」里
      - 在「服务器」栏里
    answer: 1
    explain: 历史会保留你发出的每个请求，无论有没有保存。
  - question: 哪个快捷键会把当前标签页里的请求保存下来？
    options:
      - ⌘/Ctrl + S
      - ⌘/Ctrl + N
      - ⌘/Ctrl + Enter
    answer: 0
    explain: ⌘/Ctrl + N 新建请求，⌘/Ctrl + Enter 发送。
---

一次又一次敲同样的请求，很快就烦了。Zorvik 给你两份记忆：

- **集合：** 你**保存**下来的请求，按文件夹组织。每个保存的请求都是工作区文件夹里的一个小文件，可以放进 Git、和别人共享。
- **历史：** 你**发出**的每个请求，不管存没存，连同状态和耗时。

```flow
新标签页 -> 发送 -> 保存 (⌘S) -> 集合
发送 -> 历史
```

## 标签页

每个请求都在一个**标签页**里打开，就像浏览器。标签上出现小圆点，表示有还没保存的修改。用 **⌘/Ctrl + W** 关闭标签页。

## 文件夹

右键点击集合就能建文件夹，比如每个 API 一个、或每个功能一个。文件夹也可以放里面的请求共享的设置，比如登录信息。鉴权单元里会用到。

> [!tip] 什么都能找到
> 按 **⌘/Ctrl + K**，开始输入请求名，就能直接跳过去。

**什么时候用得上：** 同事问「你复现这个 bug 用的是哪个请求？」你把保存好的请求发给他，而不是一张截图。
