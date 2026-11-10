---
id: folders-and-inheritance
title: 会共享设置的文件夹
summary: 在文件夹上设一次鉴权和请求头，里面的每个请求都会继承。
minutes: 5
lab:
  title: 为一个文件夹统一登录
  goal: 给文件夹配上令牌和请求头，让里面的请求继承它们，再在一个请求上覆盖鉴权。
  minutes: 8
  vars:
    adminToken: "{{secret.token}}"
  servers:
    api:
      name: Admin API
      kind: http
      http:
        routes:
          - method: GET
            path: /admin/users
            matchHeaders:
              - key: Authorization
                value: "Bearer {{secret.token}}"
            headers:
              - key: Content-Type
                value: application/json
            body: '[{"id": 1, "name": "Ada", "role": "owner"}, {"id": 2, "name": "Linus", "role": "member"}]'
          - method: GET
            path: /admin/stats
            matchHeaders:
              - key: Authorization
                value: "Bearer {{secret.token}}"
            headers:
              - key: Content-Type
                value: application/json
            body: '{"users": 2, "ordersToday": 17}'
          - method: "*"
            path: /admin/*
            status: 401
            headers:
              - key: Content-Type
                value: application/json
            body: '{"error": "Missing or wrong token"}'
  steps:
    - text: |
        新建一个叫 **Admin** 的文件夹（集合顶部的 **+** → **新建文件夹**）。右键它 → **文件夹设置…**。在 **鉴权** 里选 **Bearer token**，令牌填 `{{adminToken}}`。在 **请求头** 里加 `X-Tenant`，值填 `acme`。然后点 **保存**。
      hints:
        - Lab 环境里已经有这个令牌，变量名是 adminToken，所以你只需要输入 {{adminToken}}。
        - 文件夹设置里有鉴权、请求头、脚本和文档几个标签页。保存之前把鉴权和请求头都设好。
        - "鉴权 → 类型：Bearer token，Token：{{adminToken}}。请求头 → X-Tenant = acme。然后保存。"
      check:
        saved:
          folder: { name: Admin, auth: { type: bearer }, headers: [{ key: X-Tenant, value: acme }] }
      solution:
        - call: { method: folder.create, params: { parent: "", name: Admin } }
        - call:
            method: folder.save
            params:
              path: Admin
              meta:
                name: Admin
                auth: { type: bearer, token: "{{adminToken}}", prefix: Bearer }
                headers: [{ key: X-Tenant, value: acme }]
    - text: 右键 **Admin** → **新建 HTTP 请求**，命名为 **List users**，URL 设成 `{{api}}/admin/users`。**鉴权** 标签页保持 **继承上级**，保存后按 **发送**。
      hints:
        - 请求只从它被保存进去的文件夹继承。新请求建在 Admin 里，所以设置对了。
        - 不要给这个请求加任何鉴权或请求头。看看它的鉴权标签页，写的是继承上级。
        - "URL {{api}}/admin/users，鉴权：继承上级，然后发送。应该拿到 200 和两个用户。"
      check:
        all:
          - request: { server: api, path: /admin/users, status: 200, headers: { authorization: "Bearer {{secret.token}}", x-tenant: acme } }
          - send: { url: "*/admin/users", auth: inherit, status: 200 }
      solution:
        - call: { method: request.create, params: { parent: Admin, request: { name: List users, method: GET, url: "{{api}}/admin/users" } } }
        - call:
            method: http.send
            params:
              requestId: lab-admin-users
              request: { name: List users, method: GET, url: "{{api}}/admin/users" }
              path: Admin/List users.yaml
    - text: 在 **Admin** 里再加一个请求 **Stats**，URL 是 `{{api}}/admin/stats`。这次把它的 **鉴权** 设成 **无鉴权** 再发送。服务器怎么说？
      hints:
        - 请求自己的鉴权总是胜过文件夹的。无鉴权意味着完全不带 Authorization 头。
        - 右键 Admin → 新建 HTTP 请求，命名 Stats，然后打开它的鉴权标签页选无鉴权。
        - "URL {{api}}/admin/stats，鉴权：无鉴权，然后发送。你会拿到 401：X-Tenant 请求头仍然来自文件夹，但令牌没有。"
      check:
        all:
          - request: { server: api, path: /admin/stats, status: 401, headers: { x-tenant: acme, authorization: "!*" } }
          - send: { url: "*/admin/stats", auth: none, status: 401 }
      solution:
        - call: { method: request.create, params: { parent: Admin, request: { name: Stats, method: GET, url: "{{api}}/admin/stats", auth: { type: none } } } }
        - call:
            method: http.send
            params:
              requestId: lab-admin-stats
              request: { name: Stats, method: GET, url: "{{api}}/admin/stats", auth: { type: none } }
              path: Admin/Stats.yaml
quiz:
  - question: 一个请求的鉴权是 **继承上级**，它所在的文件夹有 Bearer 令牌，工作区是 Basic 鉴权。实际发出的是什么？
    options:
      - 两个都发，一前一后
      - 文件夹的 Bearer 令牌，因为它是最近的上级
      - 工作区的 Basic 鉴权，因为那是默认值
    answer: 1
    explain: Zorvik 向上查找，用第一个不是「继承上级」的鉴权：先看请求自己，再由内向外看文件夹，最后看工作区。
  - question: "文件夹发了 `X-Tenant: acme`，里面某个请求设了 `X-Tenant: globex`。这个请求发出去的是哪个值？"
    options:
      - globex，因为请求自己的请求头替换了继承来的
      - acme，因为文件夹说了算
      - 两个请求头都会发
    answer: 0
    explain: 请求头从工作区到文件夹再到请求层层叠加，同名的会替换掉上面继承来的那个。
  - question: 你在一个标签页里新建了请求，但没保存进 Admin 文件夹。它会拿到文件夹的令牌吗？
    options:
      - 会，工作区里每个请求都会
      - 会，只要 URL 和文件夹名对得上
      - 不会，请求只从它被保存进去的文件夹继承
    answer: 2
    explain: 继承跟着请求所在的位置走。把它保存进文件夹（或者直接在文件夹里新建），它才会拿到文件夹的鉴权、请求头和脚本。
---

集合一大，同样的设置就一遍遍重复：二十个管理接口用同一个令牌，全都带同一个 `X-Tenant` 头。复制二十次，总有一天你只改了十九个。**文件夹**解决这个问题。

## 文件夹也放设置

集合里的文件夹不只是装请求的盒子。右键任意一个，选择 **文件夹设置…**，你会看到四个标签页（从 OpenAPI 文档导入的文件夹还会多一个 **API 规范**）：

- **鉴权：** 里面每个请求如何登录，比如一个 Bearer 令牌。
- **请求头：** 里面每个请求都带的请求头。
- **脚本：** 在里面的每个请求前后运行的 JavaScript。测试单元里会写脚本。
- **文档：** 写给团队的备注。

一个请求的 **鉴权** 标签页写着 **继承上级**（新建请求的默认值）时，它就用所在文件夹的鉴权。**继承** 的意思就是「从上一层拿」。

## 这条链

设置从工作区往下流到文件夹、再流到请求。每一层都可以在继承的基础上追加，或者覆盖：

```layers
工作区 | 所有东西的默认鉴权和请求头（工作区菜单 → 工作区设置…）
文件夹 "Admin" | Bearer {{adminToken}}，X-Tenant: acme
文件夹 "Admin/Reports" | 追加 X-Report-Format: csv
请求 "Monthly sales" | 鉴权：继承上级，以上全部生效
```

- **鉴权：** 请求自己的鉴权优先。写着*继承*时，Zorvik 用最近的那个文件夹的，再不行用工作区的。
- **请求头：** 层层叠加。越靠下的同名请求头会替换掉继承来的。
- **脚本：** 全都运行，先是工作区的，再由外向内是各层文件夹的，最后是请求自己的。

> [!note] 可以这样想……
> 学校的规矩。学校说「上课不许用手机」，你们班加一条「要带计算器」，老师可以为一节课破例。你全都遵守，而没有人每天早上再念一遍校规。

## 覆盖

有时候某个请求必须不一样：登录请求本身还没有令牌，公开的健康检查也不需要。把那个请求的 **鉴权** 设成 **无鉴权** 或它自己的方式：请求自己的选择胜过继承来的一切，而继承来的请求头照样会带上。

```sequence
participants: Zorvik, 服务器
Note over Zorvik: Stats 设了无鉴权；文件夹仍会加上 X-Tenant
Zorvik -> 服务器: GET /admin/stats，带 X-Tenant，无令牌
服务器 --> Zorvik: 401 Missing or wrong token
```

> [!tip] 继承的前提是请求已保存
> 请求从它**被保存进去**的文件夹继承。还没保存的标签页不属于任何文件夹，所以只拿到工作区的设置。

令牌保存在变量 `{{adminToken}}` 里。它变了，你只改一个变量，整个文件夹的请求继续能用。

**什么时候用得上：** 团队的 API 有公开部分和管理部分。每部分一个文件夹，管理令牌在文件夹上设一次，新同事只要填一个变量就能全部用起来。
