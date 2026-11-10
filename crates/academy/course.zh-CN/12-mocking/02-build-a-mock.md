---
id: build-a-mock
title: 搭一个 Mock API
summary: Mock 就是一串路由，每条匹配一个方法和路径，并用状态、请求头和正文作答。
minutes: 5
lab:
  title: 开张咖啡馆
  goal: 在自己电脑上搭一个 Mock API，让它回答咖啡馆 App 的菜单请求。
  minutes: 8
  steps:
    - text: |
        打开左侧栏的 **服务器**，点 **＋**，选择 **Mock API (HTTP)**。命名为 **Cafe API**，按 **创建**。
      hints:
        - "服务器和请求一样保存在工作区里。把鼠标停在左侧栏的图标上就能找到「服务器」。"
        - "在服务器分区里，筛选框旁边的 ＋ 按钮会列出你能创建的服务器种类。"
        - "服务器 → ＋ → Mock API (HTTP) → 输入 Cafe API → 创建。"
      check:
        saved:
          server: { name: Cafe API, kind: http }
      solution:
        - call:
            method: server.create
            params:
              server:
                name: Cafe API
                kind: http
                port: 0
                http:
                  routes:
                    - method: GET
                      path: /hello
                      status: 200
                      headers: [{ key: Content-Type, value: application/json }]
                      body: "{\n  \"message\": \"Hello from Zorvik\"\n}"
    - text: |
        按 **启动**。小圆点变绿，标签页会显示你的 Mock 监听的地址，比如 `http://127.0.0.1:3000`。
      hints:
        - "启动服务器就是让它在你的电脑上开始等请求，直到你停掉它。"
        - "启动按钮在 Cafe API 标签页的右上角。也可以把鼠标停在侧边栏的服务器上按 ▶。"
        - "如果 Zorvik 说端口被占用，说明别的程序占了它。把 **端口** 改成别的数字，比如 3100，再按启动。"
      check:
        saved:
          server: { name: Cafe API, running: true }
      solution:
        - call:
            method: server.save
            params:
              id: Cafe API
              server: &cafe
                name: Cafe API
                kind: http
                port: 0
                http:
                  routes:
                    - method: GET
                      path: /hello
                      status: 200
                      headers: [{ key: Content-Type, value: application/json }]
                      body: "{\n  \"message\": \"Hello from Zorvik\"\n}"
        - call:
            method: server.start
            params: { id: Cafe API, server: *cafe }
    - text: |
        教它做菜单。在 **路由** 里选中 `GET /hello`，把路径改成 `/menu`（或者按 **添加路由**）。把 **响应正文** 设成：

        ```json
        [
          {"dish": "Tomato soup", "price": 4.5},
          {"dish": "Grilled cheese", "price": 6}
        ]
        ```

        运行中的 Mock 会随着你输入就采用修改。用 **⌘/Ctrl + S** 保存下来。之后实验会像咖啡馆 App 那样调用 `GET /menu`。
      hints:
        - "一条路由就是一个方法加一个路径，再加上要回什么。App 只看得到回答。"
        - "在路由下面点 GET /hello 那一行。在「路由」一节里改路径，把 JSON 粘进响应正文。服务器保持运行。"
        - "方法 GET，路径 /menu，状态 200，请求头 Content-Type: application/json，正文里有一道叫 Tomato soup 的菜。然后按 ⌘S。"
      check:
        probe:
          kind: http
          name: Cafe API
          path: /menu
          expect:
            status: 200
            json: [{ dish: Tomato soup }]
      solution:
        - call:
            method: mock.addRoute
            params:
              serverId: Cafe API
              route:
                method: GET
                path: /menu
                status: 200
                headers: [{ key: Content-Type, value: application/json }]
                body: "[\n  {\"dish\": \"Tomato soup\", \"price\": 4.5},\n  {\"dish\": \"Grilled cheese\", \"price\": 6}\n]"
quiz:
  - question: 来了一条 `GET /menu` 的请求，而你的 Mock 只有 `GET /hello` 一条路由。Mock 会回什么？
    options:
      - 200，正文为空
      - 什么都不回，直接崩掉
      - 404，并列出它认识的路由
    answer: 2
    explain: 没有路由匹配时回 404 并附上路由清单，路径打错一眼就能看出来。你也可以选择把它们转发给真后端。
  - question: 一条路由要匹配上，哪些必须一致？
    options:
      - 方法和路径
      - 响应正文
      - 路由的名字
    answer: 0
    explain: 路由按方法和路径匹配（还可以加可选条件）。状态、请求头和正文是它用来回答的内容。
  - question: 你的 Mock 跑在 `http://127.0.0.1:3000`。谁可以调它？
    options:
      - 互联网上任何人
      - 只有你自己电脑上的程序
      - 只有 Zorvik 的实验环境
    answer: 1
    explain: 127.0.0.1 的意思是「这台电脑」。要让同一 Wi-Fi 上的手机也能调，就把「监听」设成「其他设备也可以（0.0.0.0）」。
---

Zorvik 里的 Mock API 就是跑在你电脑上的一个小型 Web 服务器。你描述它该怎么回答，按 **启动**，然后任何 App（浏览器、手机模拟器、测试脚本，或者 Zorvik 自己）都能调它。

## 路由

一个 Mock 就是一串**路由**。每条路由说：*当带有这个方法和路径的请求进来，就用这个回答它*。

```anatomy
GET /menu | 方法和路径：这条路由回应哪些请求
200 | 状态：回答怎么开头
Content-Type: application/json | 响应头：后面跟着什么类型的正文
[{"dish": "Tomato soup"}] | 响应正文：App 收到的数据
```

请求进来时，Mock 顺着列表往下走，**第一条匹配且启用的路由作答**。路径里可以有一段会变的部分，写成 `:name`，比如 `/users/:id`，它匹配 `/users/7` 和 `/users/42`。下一课会用到。

没有路由匹配时，Mock 回 `404 Not Found`，并附上它认识的路由清单，所以 `/meun` 这种手误很容易发现。

```sequence
participants: 咖啡馆 App, Mock
咖啡馆 App -> Mock: GET /menu
Note over Mock: 找到 GET /menu 这条路由
Mock --> 咖啡馆 App: 200 OK [{"dish": "Tomato soup"}]
咖啡馆 App -> Mock: GET /drinks
Mock --> 咖啡馆 App: 404 Not Found（已知路由：GET /menu）
```

> [!note] 可以这样想……
> 一个拿小抄的前台。小抄上每行是一条路由：「如果有人要菜单，就把这张卡片给他」。小抄上没有的，就礼貌地回一句「抱歉，我们这儿没有」，顺便告诉他可以要哪些。

## Mock 住在哪：地址和端口

你的 Mock 监听在一个**地址**上，比如 `http://127.0.0.1:3000`：

- `127.0.0.1` 意思是*这台电脑*。只有你机器上的程序够得着，这是安全的默认值。在 **监听** 下可以选 **其他设备也可以（0.0.0.0）**，让同一 Wi-Fi 上的手机也能调。
- `3000` 是**端口**，一个数字，告诉电脑这个请求该交给哪个程序。同一个端口同一时间只能有一个程序用。Zorvik 说端口被占用时，换一个。

## 修改运行中的 Mock

不必每次改完都重启。Mock 运行期间，对路由的修改随着你输入就生效。改地址、端口或 TLS 才会要求**重启**。用 **⌘/Ctrl + S** 保存，把 Mock 写进工作区，这样明天它还在，同事也能拿到。

服务器标签页右侧的 **流量** 列表显示 Mock 收到的每个请求以及它回了什么。App「拿到错数据」时，先看这里。

> [!tip] 从小处开始
> 大多数页面，一条写死答案的路由就够了。App 需要什么再加什么路由，别一次全堆上。

**什么时候用得上：** 前端问「后端还没做完，能不能给我个东西应答 `GET /menu`？」五分钟后他就能用上了。
