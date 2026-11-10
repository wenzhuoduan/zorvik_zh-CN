---
id: ip-addresses-and-ports
title: IP 地址与端口
summary: IP 地址找到那台电脑，端口找到那台电脑上的程序。
minutes: 5
lab:
  title: 敲一扇端口之门
  goal: 找到本机自己的地址，确认某个端口是开放的，然后跟它背后的程序对话。
  minutes: 7
  servers:
    api:
      name: Port Lab
      kind: http
      http:
        routes:
          - method: GET
            path: /hello
            headers:
              - key: Content-Type
                value: application/json
            body: '{"message": "You found the program behind this port!", "secretWord": "{{secret.word}}"}'
  steps:
    - text: |
        打开左侧栏的 **工具**（扳手图标），选择 **网络接口**。找到标着 **loopback** 的那一项：它的地址就代表「本机」。
      hints:
        - 左侧栏是工作台最左边那一列图标。
        - 点扳手图标（工具），然后在列表里点「网络接口」。如果它已经开着，点「刷新」。
        - 工具 → 网络接口。标着 loopback 的那一行显示 127.0.0.1。
      check:
        call: { method: tools.interfaces, ok: true }
      solution:
        - call: { method: tools.interfaces }
    - text: |
        实验已经在你的电脑上启动了一个小服务器，监听端口 `{{=api_port}}`。打开 **端口检查**（也在工具里），主机填 `127.0.0.1`，端口选 **自定义**，输入 `{{=api_port}}`，然后点 **检查**。
      hints:
        - 端口检查会尝试连接你给出的每个端口。「开放」表示有程序在监听。
        - 在端口检查里，主机填 127.0.0.1，然后点端口旁边的「自定义」。
        - "主机：`127.0.0.1` · 端口：自定义 → `{{=api_port}}` · 检查。该端口会显示为开放。"
      check:
        call:
          method: tools.portCheck
          ok: true
          params:
            host: 're:(?i)^(127\.0\.0\.1|localhost)$'
            ports: "*{{api_port}}*"
      solution:
        - call: { method: tools.portCheck, params: { runId: lab-port-check, host: 127.0.0.1, ports: "{{api_port}}", timeoutMs: 1000 } }
    - text: |
        现在跟端口背后的程序对话。新建一个请求（**⌘/Ctrl + N**），发送 `GET http://localhost:{{api_port}}/hello`。自己动手输入，主机名用 **localhost** 而不是 IP 地址。
      hints:
        - localhost 就是你自己电脑的名字，和 127.0.0.1 一样。
        - URL 是 http://，然后是 localhost，一个冒号，端口号，最后 /hello。
        - "按 ⌘N（Windows 上是 Ctrl+N），输入 `http://localhost:{{api_port}}/hello`，然后按发送。"
      check:
        request: { server: api, method: GET, path: /hello, headers: { host: "localhost:*" } }
      solution:
        - send: { method: GET, url: "http://localhost:{{api_port}}/hello" }
    - text: 程序返回了一个 `secretWord`。把它填在这里。
      hints:
        - 看请求下方或旁边的响应体。
        - 在响应体里找到「secretWord」，把它后面的值复制下来（一个词加一个数字）。
        - 屏幕上没有响应，是因为用了「帮我做」发送？打开左侧栏的「历史」，点那个请求就能看到响应。
      check:
        answer: "{{secret.word}}"
      solution:
        - answer: "{{secret.word}}"
quiz:
  - question: 地址 127.0.0.1 代表什么？
    options:
      - 互联网上的某台服务器
      - 你自己的电脑（回环地址）
      - 你的 Wi-Fi 路由器
      - 第一台接入互联网的电脑
    answer: 1
    explain: 127.0.0.1 是回环地址。发给它的流量从不离开你的电脑；localhost 是它的名字。
  - question: URL `https://shop.example/cart` 里没写端口。它用哪个端口？
    options:
      - "80"
      - "8080"
      - "443"
      - 不写就没有端口，HTTPS 不用端口
    answer: 2
    explain: 没写端口时由协议决定。https 用 443，http 用 80。
  - question: 你在 3000 端口启动服务器，却报「address already in use」。这是什么意思？
    options:
      - 已经有另一个程序在监听 3000 端口
      - 你的 IP 地址写错了
      - 端口号最大只能到 1024
      - 你的电脑离线了
    answer: 0
    explain: 同一个端口同一时间只能有一个程序监听。停掉那个程序，或者换一个端口。
---

两个程序要通信，得先找到对方。这需要两个数字：**IP 地址**找到正确的那台电脑，**端口**找到那台电脑上的正确程序。

## IP 地址

网络上的每台设备都有 **IP 地址**（IP 是 Internet Protocol，即计算机之间传输数据的规则）。最常见的是 **IPv4**：四组 0 到 255 的数字，用点分隔，例如 `192.168.1.20`。更新的 **IPv6** 更长，用冒号分隔，例如 `2001:db8::1`。它出现的原因是 IPv4 地址已经用完了。

有几个地址比较特殊：

| 地址 | 含义 |
|---|---|
| `127.0.0.1` | **回环**地址：「本机」。发给它的流量从不离开你的电脑。 |
| `localhost` | 回环地址的名字（IPv6 里是 `::1`）。 |
| `192.168.x.x`、`10.x.x.x` | **私有**地址，在家里和办公室内部使用。 |
| `0.0.0.0` | 对服务器而言：「在本机连接的每个网络上监听」。 |

> [!note] 可以这样想……
> 一栋公寓楼。IP 地址是街道地址：把邮递员送到正确的那栋楼。端口是房间号：把信送到里面正确的那个人手上。

## 端口

一台电脑同时跑着很多用网络的程序：浏览器、聊天软件、数据库。**端口**是 1 到 65535 的一个数字，说明这条消息是给哪个程序的。等着别人来联系它的程序，就在某个端口上**监听**。有些端口是固定用途：

| 端口 | 通常用于 |
|---|---|
| 80 | HTTP（网页） |
| 443 | HTTPS（加密网页） |
| 53 | DNS |
| 22 | SSH（远程登录） |
| 5432 | PostgreSQL（数据库） |

同一个端口同一时间只能有一个程序监听，所以同一个服务器启动两次会报「address already in use」。

## 合在一起

地址加端口写在一起，例如 `127.0.0.1:8080`，就精确指向某台电脑上的某个程序。每个 URL 里都能看到这两样：

```anatomy
http:// | 协议：用哪种「语言」说话
127.0.0.1 | IP 地址：哪台电脑
:8080 | 端口：那台电脑上的哪个程序
/hello | 路径：向那个程序要什么
```

URL 里没写端口时，协议会给出默认值：`http` 用 80，`https` 用 443。

```flow
你的请求 -[IP 地址]-> 正确的那台电脑 -[端口]-> 正确的那个程序
```

> [!tip] 名字还是数字
> `localhost` 和 `127.0.0.1` 到同一个地方。用名字多一步：把名字变成数字。这一步叫 DNS，它有单独的一个单元。

## 在 Zorvik 里

**工具**（左侧栏的扳手）里有这一课的两个帮手：

- **网络接口** 列出本机的地址。标着 **loopback** 的是 `127.0.0.1`；其余是同一网络里其他设备能找到你的地址。
- **端口检查** 尝试连接某个主机上的端口，告诉你是哪个有程序在监听（**开放**），哪个没有（**拒绝**）。

实验里会有一个练习服务器监听在给你准备的一个端口上。你要先找到本机地址，确认端口开放，然后跟背后的程序对话。

**什么时候用得上：** 某个服务「连不上」的时候。头两个问题永远是一样的：地址对吗？那个端口上有程序在听吗？
