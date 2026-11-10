---
id: examples-to-mocks
title: 保存的示例会变成 Mock
summary: 把真实响应留存为请求的示例，用这个文件夹做出的 Mock 就会以它们作答，还能按查询参数挑中正确的那一条。
minutes: 6
added: 0.2.0
lab:
  title: 一家不打烊的宠物店
  goal: 把两次真实回答保存为示例，再把文件夹变成 Mock，看它如何为每个请求挑出正确的示例。
  minutes: 9
  files:
    requests/Pet shop/_folder.yaml: "name: Pet shop\n"
  servers:
    api:
      name: Pet shop API
      kind: http
      http:
        routes:
          - name: Sold pets
            method: GET
            path: /pets
            matchQuery:
              - { key: status, value: sold }
            headers:
              - { key: Content-Type, value: application/json }
            body: &soldPets '[{"id": 3, "name": "Biscuit", "status": "sold"}]'
          - name: All pets
            method: GET
            path: /pets
            headers:
              - { key: Content-Type, value: application/json }
            body: &allPets '[{"id": 1, "name": "Rex", "status": "available"}, {"id": 2, "name": "Luna", "status": "available"}, {"id": 3, "name": "Biscuit", "status": "sold"}]'
  steps:
    - text: |
        宠物店的测试服务器每晚都会下线，所以先把它的回答留存下来。在集合里右键 **Pet shop** 文件夹，选择 **新建请求**，命名为 **List pets**。把 URL 设为 `{{api}}/pets`，发送，然后在响应上方按 **保存为示例**，再用 **⌘/Ctrl + S** 保存请求。
      hints:
        - 示例是保存在请求文件里的一份响应。它必须依附于一个已保存的请求，所以要先把这个请求放进文件夹里。
        - "集合 → 右键 Pet shop → 新建请求 → 命名为 List pets → 创建。URL 填 {{api}}/pets，然后发送。"
        - "保存为示例就在响应上方的状态行上，紧挨着 Mock（面板窄时是一个书签图标）。此时 URL 的改动还没保存，所以随后要按 ⌘/Ctrl + S：示例标签里会出现 200 OK。"
      check:
        saved:
          request: { path: "Pet shop/*", examples: [{ status: 200, body: "*Rex*" }] }
      solution:
        - send: { method: GET, url: "{{api}}/pets" }
        - call:
            method: request.create
            params:
              parent: Pet shop
              request:
                name: List pets
                seq: 0
                method: GET
                url: "{{api}}/pets"
                examples:
                  - &allExample
                    name: 200 OK
                    status: 200
                    headers: [{ key: Content-Type, value: application/json }]
                    body: *allPets
                    url: "{{api}}/pets"
    - text: |
        商店的 App 还会只请求已售出的宠物。在 URL 后面加上 `?status=sold`，发送，再按一次 **保存为示例**，并用 **⌘/Ctrl + S** 保存。现在 **示例** 标签里会列出两条。
      hints:
        - 每个示例都会记住自己保存时的 URL，包括查询参数。Mock 就是靠这一点知道什么时候该用它作答。
        - "在 URL 末尾输入 ?status=sold（或者在参数标签里加 status = sold），然后发送。只会返回 Biscuit。"
        - "按保存为示例，再按 ⌘/Ctrl + S。示例标签里会显示 200 OK 和 200 OK (2)；选中其中一条就能看到它的正文。"
      check:
        saved:
          request: { path: "Pet shop/*", examples: [{ url: "*status=sold*", body: "*Biscuit*" }] }
      solution:
        - send: { method: GET, url: "{{api}}/pets?status=sold" }
        - call:
            method: request.save
            params:
              path: Pet shop/List pets.yaml
              request:
                name: List pets
                seq: 0
                method: GET
                url: "{{api}}/pets?status=sold"
                examples:
                  - *allExample
                  - name: 200 OK (2)
                    status: 200
                    headers: [{ key: Content-Type, value: application/json }]
                    body: *soldPets
                    url: "{{api}}/pets?status=sold"
    - text: |
        把这个文件夹变成 Mock。右键 **Pet shop**，选择 **对此文件夹做 Mock…**，按 **创建 Mock**。这个请求的两条示例会变成两条路由。
      hints:
        - 由文件夹生成的 Mock，会在请求有示例时用示例作答，没有示例时回 {}。
        - 「对此文件夹做 Mock…」在文件夹的右键菜单里，排在「运行…」下面。建议的名字 Pet shop mock 直接用就行。
        - "集合 → 右键 Pet shop → 对此文件夹做 Mock… → 创建 Mock。新的 Mock 会带着 List pets · 200 OK (2) 和 List pets · 200 OK 两条路由打开。"
      check:
        call: { method: mock.fromFolder, ok: true, params: { folder: Pet shop }, result: { routes: 2 } }
      solution:
        - call:
            method: mock.fromFolder
            params: { folder: Pet shop, name: Pet shop mock }
    - text: |
        在 **Pet shop mock** 上按 **启动**。随后实验会像商店的 App 一样向它请求 `GET /pets?status=sold`，并期望只返回 Biscuit。
      hints:
        - 带 ?status=sold 保存的那条路由只响应携带 status=sold 的请求。其他请求都会拿到另一条示例。
        - 在 Pet shop mock 标签页右上角按启动。端口被占用的话，换个端口再按一次启动。
        - "在服务器里打开 Pet shop mock，按启动。之后 GET /pets?status=sold 只返回 Biscuit，GET /pets 返回全部三只宠物。"
      check:
        probe:
          kind: http
          name: Pet shop mock
          path: /pets?status=sold
          expect:
            status: 200
            json: [{ name: Biscuit }]
            body: "!*Rex*"
      solution:
        - call:
            method: server.save
            params:
              id: Pet shop mock
              server: &petMock
                name: Pet shop mock
                kind: http
                port: 0
                http:
                  routes:
                    - name: List pets · 200 OK (2)
                      method: GET
                      path: /pets
                      status: 200
                      headers: [{ key: Content-Type, value: application/json }]
                      body: *soldPets
                      matchQuery: [{ key: status, value: sold }]
                    - name: List pets · 200 OK
                      method: GET
                      path: /pets
                      status: 200
                      headers: [{ key: Content-Type, value: application/json }]
                      body: *allPets
        - call:
            method: server.start
            params: { id: Pet shop mock, server: *petMock }
quiz:
  - question: 保存为示例会保留哪些东西？
    options:
      - 只有状态码
      - 该响应的状态、响应头和正文，都存在请求文件里
      - 历史里指向该响应的一条链接
    answer: 1
    explain: 示例以状态命名（200 OK、200 OK (2)……），并且存在请求文件里，所以会像请求本身一样通过 Git 共享。
  - question: 一个请求有两条示例，分别保存自 `/pets` 和 `/pets?status=sold`。用它所在文件夹生成的 Mock 收到 `GET /pets`，哪一条会作答？
    options:
      - 没带查询参数保存的那条示例
      - 带 status=sold 保存的那条示例
      - 什么也不回，Mock 返回 404
    answer: 0
    explain: 带查询参数保存的示例只响应携带该参数的请求。最早保存的、不带查询参数的那条示例会兜住其他所有请求。
  - question: 为什么保存为示例时会略去 `Set-Cookie` 响应头？
    options:
      - Mock 不能发送 Cookie
      - Cookie 太大，存不下
      - Cookie 可能带着登录会话，而示例保存在工作区里并最终进入 Git
    answer: 2
    explain: 示例是团队共享的文件。分帧类响应头和 Date 也会略去，因为 Mock 会自己设置。
---

你发了一个请求，返回的结果恰到好处：正是 App 需要的数据，形状也对。可到了明天，测试服务器挂了，或者数据变了。把这份回答留住：在响应上方按 **保存为示例**。

**示例** 就是保存在请求文件里的一份响应。它为你和团队记录了这个请求会返回什么，也是 Mock 用来作答的素材。

```flow
发送 -> 响应 -[保存为示例]-> 请求的「示例」标签
请求文件夹 -[对此文件夹做 Mock…]-> 用示例作答的 Mock
```

## 示例里保留了什么

- **状态**，它同时也是示例的名字：`200 OK`，再存一条就叫 `200 OK (2)`。
- 响应的 **响应头**，但不含分帧类的（`Content-Length` 之类）、`Date` 和 `Set-Cookie`：Cookie 可能带着登录会话，而示例最终会进 Git。
- **正文**，最多 1 MB 文本。二进制响应不能做示例，那种情况用 **保存到文件…**。
- 发送时的 **URL**，保持你键入的样子，包括变量和查询参数。

对于没有其他改动的已保存请求，示例会立即存下。要是你改过东西（比如 URL），示例就会和其余改动一起等待，直到你保存。

请求的 **示例** 标签会把它们列出来。选中一条可以看它的响应头和正文、改名，或者改它的状态和正文：把一份副本改成带错误正文的 `404`，你的 Mock 也就能回答失败场景了。

```yaml
examples:
  - name: 200 OK
    status: 200
    headers:
      - { key: Content-Type, value: application/json }
    body: '[{"id": 1, "name": "Rex"}]'
    url: "{{baseUrl}}/pets"
```

## 从示例到 Mock

右键一个文件夹，选 **对此文件夹做 Mock…**。没有示例的请求会变成一条用 `{}` 回 `200` 的路由；**有** 示例的请求则每条示例一条路由：

| 路由 | 匹配查询 | 回答 |
|---|---|---|
| List pets · 200 OK (2) | `status=sold` | 保存自 `/pets?status=sold` 的那条示例 |
| List pets · 200 OK | | 其余所有发往 `/pets` 的请求 |

带查询参数保存的示例排在前面，只响应携带该参数的请求；然后最早保存的、不带查询参数的那条示例兜住其他所有请求。

```sequence
participants: 商店 App, 宠物店 mock
商店 App -> 宠物店 mock: GET /pets?status=sold
Note over 宠物店 mock: status=sold 的路由匹配
宠物店 mock --> 商店 App: 200 [Biscuit]
商店 App -> 宠物店 mock: GET /pets
宠物店 mock --> 商店 App: 200 [Rex, Luna, Biscuit]
```

> [!note] 可以这样想……
> 餐厅橱窗里的塑料菜模。每一个都是照着真菜做的，所以你看到的就是能吃到的东西，而且永远不会凉。示例来自真实的回答，Mock 随时都能把它们端上来，哪怕厨房已经打烊。

> [!tip] 用示例还是 Mock 按钮？
> **保存为示例** 旁边的 **Mock** 会立刻给某个 Mock 服务器加一条路由。示例则留在请求里，所以以后用这个文件夹生成的每个 Mock 都会拿它作答，同事也能在文件里看到它。

**什么时候用得上：** 测试服务器时好时坏、后端在你脚下悄悄改动，或者新同事想看看某个接口返回什么。把好的回答存一次，一个像样的 Mock 只差一次右键。