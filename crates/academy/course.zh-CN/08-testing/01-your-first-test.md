---
id: your-first-test
title: 你的第一个测试
summary: 测试就是几行 JavaScript，替你检查每个响应，不用每次都自己看。
minutes: 5
lab:
  title: 用测试抓一个 bug
  goal: 给一个商品 API 写两个测试，看其中一个抓出真正的 bug。
  minutes: 8
  servers:
    api:
      name: Shop API
      kind: http
      http:
        routes:
          - method: GET
            path: /products/1
            headers:
              - key: Content-Type
                value: application/json
            body: '{"id": 1, "name": "Coffee mug", "price": 12.5, "inStock": true}'
          - method: GET
            path: /products/2
            headers:
              - key: Content-Type
                value: application/json
            body: '{"id": 2, "name": "Teapot", "price": "24.00", "inStock": true}'
  steps:
    - text: |
        新建一个发往 `{{api}}/products/1` 的请求。在它的 **脚本** 标签页里选 **响应后**，加入这个测试（或者从 **代码片段 → 状态码为 200** 里挑）：

        ```js
        pm.test("Status code is 200", () => {
          pm.response.to.have.status(200);
        });
        ```

        按 **发送**，然后打开响应的 **测试** 标签页。
      hints:
        - 脚本标签页在地址栏下面，挨着设置和文档。响应后脚本在答案到达之后运行。
        - 按 ⌘N，输入 {{api}}/products/1，打开 脚本 → 响应后，粘贴这个测试，然后发送。
        - "响应会多出一个测试标签页，绿色写着 1/1。这就是你第一个通过的测试。"
      check:
        send: { url: "*/products/1", testsPassed: ">=1", testsFailed: 0 }
      solution:
        - send:
            method: GET
            url: "{{api}}/products/1"
            scripts:
              postResponse: |
                pm.test("Status code is 200", () => {
                  pm.response.to.have.status(200);
                });
    - text: |
        200 并不代表数据是对的。在第一个测试下面再加一个检查价格的，然后再发一次：

        ```js
        pm.test("Price is a number", () => {
          const product = pm.response.json();
          pm.expect(product.price).to.be.a("number");
        });
        ```
      hints:
        - pm.response.json() 把正文读成 JSON，所以 product.price 就是价格字段。
        - 保留第一个测试，把第二个粘在它下面，写在同一个响应后脚本里。
        - "两个测试都放在响应后里，然后发送。测试标签页应该显示 2/2。"
      check:
        send: { url: "*/products/1", testsPassed: ">=2", testsFailed: 0 }
      solution:
        - send:
            method: GET
            url: "{{api}}/products/1"
            scripts:
              postResponse: |
                pm.test("Status code is 200", () => {
                  pm.response.to.have.status(200);
                });
                pm.test("Price is a number", () => {
                  const product = pm.response.json();
                  pm.expect(product.price).to.be.a("number");
                });
    - text: 现在把 URL 改成 `{{api}}/products/2`，测试不动，发送。看 **测试** 标签页。你的测试抓到了什么？
      hints:
        - 状态码还是 200，一眼看去好像一切正常。
        - 只有 URL 末尾的数字变了。然后发送，打开测试标签页。
        - "「Price is a number」失败了：2 号商品的价格是文本 \"24.00\"，不是数字。用它做计算的程序会出错。"
      check:
        send: { url: "*/products/2", testsFailed: ">=1" }
      solution:
        - send:
            method: GET
            url: "{{api}}/products/2"
            scripts:
              postResponse: |
                pm.test("Status code is 200", () => {
                  pm.response.to.have.status(200);
                });
                pm.test("Price is a number", () => {
                  const product = pm.response.json();
                  pm.expect(product.price).to.be.a("number");
                });
quiz:
  - question: 像 `pm.test("Status code is 200", …)` 这样的测试写在哪里？
    options:
      - 写在请求的响应后脚本里，它在答案到达之后运行
      - 写在 URL 里
      - 写在前置脚本里，它在发送之前运行
    answer: 0
    explain: 测试检查的是响应，所以必须在响应到达之后运行。前置脚本是用来准备请求的。
  - question: 服务器回了 200，但一个测试说价格不是数字。你该信哪个？
    options:
      - 信 200，因为服务器说一切正常
      - 都不信，再发几次直到两者一致
      - 信测试，因为状态码只说明请求被处理了，不说明数据是对的
    answer: 2
    explain: 200 配坏数据仍然是 bug。所以好的测试会检查正文，而不只看状态码。
  - question: 哪一行能检查响应在半秒内返回？
    options:
      - "`pm.response.to.have.status(500)`"
      - "`pm.expect(pm.response.responseTime).to.be.below(500)`"
      - "`pm.expect(pm.response.json().time).to.equal(0.5)`"
    answer: 1
    explain: "`pm.response.responseTime` 的单位是毫秒。`status(500)` 检查的是服务器错误。"
---

到现在为止，每个响应都是你亲眼看的。一个请求可以，但五十个请求、每天、每次代码改动之后就不行了。**测试**替你去看。

## 测试是什么

测试是一小段 JavaScript，带一个名字和一个检查。响应一到 Zorvik 就运行它，标成 **通过** 或 **失败**。测试写在请求的**响应后脚本**里：打开请求的 **脚本** 标签页，选 **响应后**。

```anatomy
pm.test("Price is a number", () => { | 一个测试：一个名字和要检查什么
  const product = pm.response.json(); | 把响应正文读成 JSON
  pm.expect(product.price).to.be.a("number"); | 检查；不成立这个测试就失败
}); | 测试结束
```

- `pm` 是 Zorvik 的脚本工具箱。它和 Postman 的用法一样，所以网上找到的测试通常直接就能用。
- `pm.test(name, function)` 定义一个测试。名字会显示在结果里，所以写成一句话。
- `pm.expect(value)` 开始一次检查，读起来几乎就是英文：`.to.equal(3)`、`.to.be.a("string")`、`.to.include("Coffee")`、`.to.be.below(500)`。

```sequence
你 -> 服务器: GET /products/1
服务器 --> 你: 200 {"price": 12.5}
Note over 你: 响应后脚本运行测试
Note over 你: 测试 2/2 通过
```

> [!note] 可以这样想……
> 机场登机口的核对清单。没人再从头读你的护照，只勾三个框：名字对、航班对、没过期。测试勾的就是一个响应里要紧的那几个框。

## 你每天都会写的检查

| 你想知道… | 怎么写 |
|---|---|
| 成功了吗？ | `pm.response.to.have.status(200);` |
| 某个字段对吗？ | `pm.expect(pm.response.json().name).to.equal("Coffee mug");` |
| 字段类型对吗？ | `pm.expect(pm.response.json().price).to.be.a("number");` |
| 够快吗？ | `pm.expect(pm.response.responseTime).to.be.below(500);` |
| 某个请求头在吗？ | `pm.response.to.have.header("Content-Type");` |

每一行都放进 `pm.test(…)` 里。不用背：脚本编辑器里的 **代码片段** 菜单能插入常见的那几个，输入 `pm.` 也会有提示。

## 看结果

发送之后，响应会多出一个 **测试** 标签页，比如绿色写着 **2/2**。失败的测试会变红并说明原因，例如 *expected '24.00' to be a number*。你 `console.log()` 的任何东西都会出现在 **控制台** 标签页里。

> [!tip] 测数据，不只是测状态
> 200 只说明服务器处理了这个请求，不说明答案是对的。最好的测试会检查你的应用真正用到的那几个字段。

**什么时候用得上：** 后端发了新版本。你不用点二十个请求、眯着眼看 JSON，而是看一排绿色对勾，那一个红叉直接指出哪里坏了。
