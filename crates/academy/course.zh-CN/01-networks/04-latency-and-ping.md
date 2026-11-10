---
id: latency-and-ping
title: 延迟与 ping
summary: 延迟是一次往返花的时间；ping 负责测它，用 ICMP，或者用一次 TCP 连接的耗时。
minutes: 5
lab:
  title: 给往返计时
  goal: 用 TCP ping 测到实验服务器的往返时间，再和经典 ICMP ping 比一比。
  minutes: 5
  servers:
    target:
      name: Ping Target
      kind: tcp
  steps:
    - text: |
        打开 **工具 → Ping**。主机填 `127.0.0.1`，**方式** 选 **TCP**，**TCP 端口** 填 `{{=target_port}}`，按 **开始**。
      hints:
        - TCP ping 测的是打开一条到某个端口的连接要多久。实验服务器监听在 `{{=target_port}}`。
        - 在工具 → Ping 里，主机填 127.0.0.1，方式点 TCP，把实验端口填到 TCP 端口里。
        - "主机 `127.0.0.1` · 方式：TCP · TCP 端口 `{{=target_port}}` · 开始。每次回复都会显示毫秒数。"
      check:
        all:
          - call: { method: tools.ping, ok: true, result: { mode: tcp, port: "{{target_port}}" } }
          - message: { server: target, kind: open }
      solution:
        - call: { method: tools.ping, params: { runId: lab-ping, host: "{{target_host}}", mode: tcp, count: 4, intervalMs: 300 } }
    - text: |
        在 **服务器** 里打开 **Lab · Ping Target**：每次 TCP ping 都会以「打开又关闭的连接」出现在那里。现在再 ping 一次 `127.0.0.1`，这次 **方式：ICMP**。如果你的电脑不允许 ICMP，Zorvik 会说明原因，这也算完成。
      hints:
        - ICMP ping 不用端口，由操作系统本身作答。
        - 回到 Ping 标签页，方式点 ICMP，按开始。
        - "主机 `127.0.0.1` · 方式：ICMP · 开始。把平均耗时和 TCP ping 比一下：在本机上两者都远小于 1 毫秒。"
      check:
        any:
          - call: { method: tools.ping, params: { mode: icmp } }
          - call: { method: tools.ping, result: { mode: icmp } }
      solution:
        - call: { method: tools.ping, params: { runId: lab-ping, host: 127.0.0.1, mode: icmp, count: 4, intervalMs: 300 } }
quiz:
  - question: 延迟衡量的是什么？
    options:
      - 每秒能通过多少数据
      - 路上有多少个路由器
      - 一条消息过去（再回来）要多久
      - 一个数据包最大能有多大
    answer: 2
    explain: 延迟是时间，通常用一个往返的毫秒数表示。「每秒多少」是带宽。
  - question: 某服务器不回 ICMP ping。你能得出什么结论？
    options:
      - 它肯定挂了
      - 还看不出什么。很多服务器屏蔽 ICMP，改用 TCP ping 打你要用的端口
      - 它的磁盘满了
      - 它的名字解析不了
    answer: 1
    explain: 防火墙经常丢弃 ICMP。对服务端口做 TCP ping，才能知道你要的那个程序是否可达。
  - question: 一个应用对一个往返 80 毫秒的服务器依次发 10 个请求。它至少有多少时间在网络等待上？
    options:
      - 0.8 秒（10 × 80 毫秒）
      - 80 毫秒
      - 8 秒
      - 8 毫秒
    answer: 0
    explain: 每个请求至少付一个往返，十个串着就是十个。减少请求数或并行发起，能把这部分时间砍下来。
---

网络有两种「快」。**带宽**是每秒能通过多少数据，像高速公路的车道数；**延迟**是一次往返要多久，像开车时间。一个大文件下载主要看带宽；一个只发几百字节的 API 调用主要看延迟。

## 往返

你最常看到的数字是**往返时间**（RTT）：消息到达对面、回答再回来的总时间，单位毫秒（ms，千分之一秒）。

```sequence
participants: 你, 服务器
你 -> 服务器: 你在吗？
Note over 服务器: 立刻回答
服务器 --> 你: 在！
Note over 你: 往返花了 24 毫秒
```

时间花在哪里了？

- **距离。** 光纤里的信号大约每毫秒 200 公里。纽约到伦敦一来一回约 11,000 公里，所以还没干别的，先有至少 55 毫秒。
- **跳数。** 数据包一路上经过很多路由器，每一个都添一点。
- **排队。** 繁忙的路由器或拥挤的 Wi-Fi 会让数据包排队等待。
- **最后几米。** Wi-Fi 比网线延迟高，周围设备多的时候更明显。

一些典型往返：

| 之间 | 往返 |
|---|---|
| 本机上的两个程序 | 远小于 1 毫秒 |
| 你的笔记本和家里的路由器 | 1–5 毫秒 |
| 同区域的数据中心 | 5–30 毫秒 |
| 跨越大洋 | 70–200 毫秒 |

## Ping

**Ping** 是测往返的经典方法。它发一个很小的 **ICMP 回显请求**（ICMP 是 IP 的帮手协议，负责网络维护），对方电脑的操作系统直接把它发回来。Ping 会报告每次往返，另外还有：

- **丢包**：有多少次回复没回来。
- **抖动**：相邻两次往返差多少。抖动大的时候语音和视频会很难受。

很多服务器和防火墙屏蔽 ICMP，所以 ping 不通不等于服务器挂了。**TCP ping** 测的是另一件事：打开一条到某个端口的 TCP 连接要多久，也就是上一课的握手。它通了，你就同时知道这台电脑可达、*而且*那个端口上有程序在监听。

> [!note] 可以这样想……
> 冲着峡谷喊一声「喂——」，然后给回声计时。ICMP ping 是冲着那座山（电脑）喊；TCP ping 是敲某一扇具体的门，数里面过多久来开。

## 在 Zorvik 里

**工具 → Ping** 有一个**方式**开关：**自动**（先 ICMP，不允许时退回 TCP）、**ICMP**、**TCP**，还有 **TCP 端口**、**次数** 和发送间隔（**每隔**）。它会显示每次回复、一张小图，以及汇总：发送、接收、丢包、最小、平均、最大和抖动。

> [!tip] 延迟会累加
> 一个界面在 100 毫秒的链路上依次发 20 个 API 调用，至少要等 2 秒，服务器再快也没用。所以好的应用会减少调用次数，或者并行发起。

**什么时候用得上：** 有人说「这个 API 好慢」。先 ping 一下：如果光是往返就 200 毫秒，那要修的不是服务器代码。
