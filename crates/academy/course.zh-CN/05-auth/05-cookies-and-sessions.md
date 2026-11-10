---
id: cookies-and-sessions
title: Cookie 与会话
summary: 服务器可以塞给你一个 cookie；客户端存下来，之后每个请求都带回去——网站「记得你已登录」就是这么做到的。
minutes: 5
lab:
  title: 拿到 cookie、带回去、再丢掉
  goal: 看 cookie 罐存下一个 cookie、自动带上它，以及删掉后它就忘了。
  minutes: 6
  playground: true
  vars:
    visitor: "{{secret.visitor}}"
  steps:
    - text: |
        发送 `GET {{playground}}/cookies/set?visitor={{visitor}}`。服务器用 `Set-Cookie` 头作答。
      hints:
        - 这个练习接口会把每个查询参数变成一个 cookie。
        - 发送后，看响应的 **Cookies** 标签页，或者 **Headers** 标签页里的 `Set-Cookie`。
        - "GET {{playground}}/cookies/set?visitor={{visitor}}，然后发送。"
      check:
        send: { url: "*/cookies/set?*visitor={{secret.visitor}}*", status: 200, responseHeaders: { set-cookie: "visitor={{secret.visitor}}*" } }
      solution:
        - send: { method: GET, url: "{{playground}}/cookies/set?visitor={{visitor}}" }
    - text: |
        现在发送 `GET {{playground}}/cookies`。你什么都不用加：cookie 罐会替你带上，这个接口会显示它收到了哪些 cookie。
      hints:
        - 别自己加 Cookie 头，那是罐子的活儿。
        - "GET {{playground}}/cookies，然后发送。正文里会列出 visitor 和你那个值。"
      check:
        send: { url: "*/cookies", status: 200, json: { cookies: { visitor: "{{secret.visitor}}" } } }
      solution:
        - send: { method: GET, url: "{{playground}}/cookies" }
    - text: |
        「退出登录」：打开 cookie 罐（标题栏上的 **Cookies** 按钮），删掉 `visitor` 这个 cookie，然后再发送 `GET {{playground}}/cookies`。服务器就看不到它了。
      hints:
        - Cookies 按钮就是窗口右上角、环境选择器旁边的那个 cookie 图标。
        - 把鼠标停在 `127.0.0.1` 下的 `visitor` 行上，点垃圾桶图标。**全部清空** 也可以。
        - "然后重新发送 GET {{playground}}/cookies：\"cookies\" 应该是空的。"
      check:
        all:
          - call: { method: "re:^cookies\\.(delete|clear)$", ok: true }
          - send: { url: "*/cookies", status: 200, json: { cookies: { visitor: "!*" } } }
      solution:
        - call: { method: cookies.delete, params: { domain: 127.0.0.1, path: /, name: visitor } }
        - send: { method: GET, url: "{{playground}}/cookies" }
quiz:
  - question: 你的客户端存哪些 cookie，是谁决定的？
    options:
      - 你，通过添加 Cookie 头
      - 服务器，通过响应里的 Set-Cookie 头
      - 浏览器随机挑的
    answer: 1
    explain: 服务器发 Set-Cookie；客户端存下 cookie，并在匹配的请求里用 Cookie 头带回去。
  - question: 会话 cookie 被偷了。小偷能做什么？
    options:
      - 没有你的密码什么都做不了
      - 只能读到这个 cookie 的名字
      - 在会话结束或被吊销之前，以你的身份行事
    answer: 2
    explain: 会话 cookie 的工作方式和 bearer 令牌一样。所以会话 cookie 应该设成 HttpOnly（页面脚本读不到）和 Secure（只走 HTTPS）。
  - question: 一个测试在你机器上通过，在同事那里失败。他从没先跑过登录请求。可能缺了什么？
    options:
      - 你的 cookie 罐里还留着一个会话 cookie
      - 到服务器的网络更快
      - "一个 `Accept: application/json` 头"
    answer: 0
    explain: 存下来的 cookie 会悄悄让请求「能用」。在相信结果之前，看看 cookie 罐，或者直接清空。
---

HTTP 本身没有记忆：每个请求都独立，服务器不知道刚才跟你聊过。**Cookie** 给了它记忆。一个 **cookie** 是一小对 `name=value`，服务器请客户端存下来，并在之后的请求里带回去。

```sequence
participants: 你, 服务器
你 -> 服务器: POST /login（用户名 + 密码）
服务器 --> 你: 200 OK，Set-Cookie: session=8f2c…
Note over 你: cookie 罐存下 session=8f2c…
你 -> 服务器: GET /account（Cookie: session=8f2c…）
服务器 --> 你: 200 OK：Ada 的账号
```

服务器用响应头 **`Set-Cookie`** 设置 cookie。从那以后，客户端对那个站点的每个请求都会加上 **`Cookie`** 请求头。网站「记得你已登录」，靠的就是这个。

## 会话

**会话（session）** 是服务器对你的记忆：你是谁、购物车里有什么。它保存在服务器那边，只把一个随机的**会话 id** 放在 cookie 里给你。每个带回这个 cookie 的请求都会被接到那个会话上。退出登录会删掉服务器上的会话，通常也删掉 cookie。

> [!note] 可以这样想……
> 衣帽间。你交出外套（登录），拿到一张编号小票（会话 cookie）。外套留在柜台后面（服务器上的会话）；谁出示小票谁就能取。小票丢了，陌生人也能取走。

## 一个 Set-Cookie 头里有什么

```anatomy
Set-Cookie: session=8f2c | 名字和值
Path=/ | 这个站点的每个路径都带上它
Max-Age=3600 | 一小时后忘掉它（Expires= 用日期做同样的事）
HttpOnly | 网页里的脚本读不到它
Secure | 只通过 HTTPS 发送
SameSite=Lax | 其他网站发起的大多数请求不带它
```

没有 `Max-Age` 或 `Expires` 的 cookie 是**会话 cookie**：浏览器一关就忘。

## Zorvik 里的 cookie 罐

Zorvik 像浏览器一样，为每个工作区维护一个 **cookie 罐**。响应里的 cookie 会被存下来，并在匹配的请求上自动带上。你能看到：

- 某次响应设置了哪些 cookie：响应的 **Cookies** 标签页；
- 所有已存的 cookie：标题栏上的 **Cookies** 按钮，在那里可以删掉单个或 **全部清空**。

想让每个请求都彼此独立时，可以在 **设置 → 数据与隐私 → Cookie 罐** 里把罐子关掉。

> [!warning] Cookie 会掩盖问题
> Cookie 不区分端口：`127.0.0.1` 上的所有服务器共用它们。而且昨天留下的一个 cookie，可能让某个对别人会失败的请求在你这里通过。结果让你意外时，先看看罐子。

**什么时候用得上：** 测一个 Web 应用的登录流程、复现「五分钟后就被登出」的 bug，或者确认退出登录真的让会话失效了：删掉 cookie，或者留着它、确认退出后服务器会拒绝它。
