---
id: mqtt-pubsub
title: "MQTT：发布与订阅"
summary: 设备把消息发到 broker 上的具名主题，所有订阅了匹配主题的客户端都会收到。
minutes: 6
lab:
  title: 跟一个小 broker 说话
  goal: 连上 broker、订阅某个传感器的主题、读到读数，再打开一盏灯。
  minutes: 8
  servers:
    broker:
      name: Tiny MQTT broker
      kind: tcp
      socket:
        mode: rules
        encoding: hex
        rules:
          # SUBSCRIBE（包类型、长度、包 id、过滤器长度）到能匹配 lab/sensors/temp 的过滤器，
          # 然后是 QoS 字节：SUBACK，随后一条发往 lab/sensors/temp 的 PUBLISH，
          # 内容是 {"room":"lab","celsius":21.5}（QoS 0）。
          - match: regex
            pattern: '(?s-u)^\x82.{5}(#|(lab|\+)/(#|(sensors|\+)/(#|temp|\+)))[\x00-\x02]$'
            reply: 90 03 00 01 00 30 2f 00 10 6c 61 62 2f 73 65 6e 73 6f 72 73 2f 74 65 6d 70 7b 22 72 6f 6f 6d 22 3a 22 6c 61 62 22 2c 22 63 65 6c 73 69 75 73 22 3a 32 31 2e 35 7d
          # 其他 SUBSCRIBE：只回 SUBACK。
          - match: regex
            pattern: '(?-u)^\x82'
            reply: 90 03 00 01 00
          # CONNECT：CONNACK，接受连接（MQTT 3.1.1）。
          - match: regex
            pattern: '^\x10'
            reply: 20 02 00 00
          # PINGREQ：PINGRESP。
          - match: regex
            pattern: '(?-u)^\xc0'
            reply: d0 00
  steps:
    - text: |
        点标签栏末端的 **+**，选择 **MQTT 客户端**。地址填 `mqtt://{{broker_host}}`，按 **连接**。**连接** 标签页里的 **MQTT 版本** 保持 3.1.1。
      hints:
        - "MQTT 地址以 mqtt:// 开头（带 TLS 时是 mqtts://），后面是 broker 的主机和端口。"
        - "标签栏的 + 菜单里有「MQTT 客户端」。{{broker_host}} 里存着 127.0.0.1 和 broker 的端口。"
        - "新建 MQTT 客户端，地址 mqtt://{{broker_host}}，按连接。日志会显示已连接和你的客户端 ID。"
      check:
        call: { method: socket.connect, params: { request: { kind: mqtt } }, ok: true }
      solution:
        - call: { method: socket.connect, params: { connId: lab-mqtt, request: { name: Lab broker, kind: mqtt, url: "mqtt://{{broker_host}}" } } }
    - text: |
        打开 **订阅** 标签页，在空行里输入主题过滤器 `lab/sensors/#`（QoS 保持 0），然后把光标移出输入框。连接着的时候，你一离开这个框 Zorvik 就会去订阅。
      hints:
        - "# 通配符匹配 lab/sensors/ 下面的一切，所以你会收到每个传感器的消息。"
        - "在订阅标签页里，空行写着「添加主题过滤器…」，就在那里输入。"
        - "在主题过滤器列输入 lab/sensors/#，QoS 保持 0，按 Tab。日志会显示已订阅 lab/sensors/#（QoS 0）。"
      check:
        any:
          - call: { method: socket.connect, params: { request: { kind: mqtt, mqtt: { subscriptions: [{ topic: "lab/*" }] } } }, ok: true }
          - call: { method: socket.send, params: { message: { type: subscribe, topic: "lab/*" } }, ok: true }
      solution:
        - call: { method: socket.connect, params: { connId: lab-mqtt, request: { name: Lab broker, kind: mqtt, url: "mqtt://{{broker_host}}", mqtt: { subscriptions: [{ topic: "lab/sensors/#", qos: 0 }] } } } }
        - wait: 300
    - text: 主题 `lab/sensors/temp` 上来了一条读数。传感器报的温度是多少摄氏度？
      hints:
        - "收到的消息带蓝色箭头，并用徽标显示主题。"
        - "消息是 JSON，找 celsius 字段。"
        - "传感器发的是 {\"room\":\"lab\",\"celsius\":21.5}，所以答案是 21.5。"
      check:
        answer: ["21.5", "21.5*", "21,5"]
      solution:
        - answer: "21.5"
    - text: |
        该发布了。在底部的输入区把 **主题** 设成 `lab/lights/kitchen`，消息写 `on`，按 **发送**。
      hints:
        - "发布需要主题和消息。QoS 选择和 Retain 勾选框保持原样即可。"
        - "输入区里消息框旁边就是主题字段。QoS 留在 0。"
        - "主题 lab/lights/kitchen，消息 on，然后发送。broker 的流量里会出现你这条 PUBLISH。"
      check:
        message: { server: broker, direction: in, text: "*lab/lights/kitchen*on*" }
      solution:
        - call: { method: socket.connect, params: { connId: lab-mqtt, request: { name: Lab broker, kind: mqtt, url: "mqtt://{{broker_host}}" } } }
        - call: { method: socket.send, params: { connId: lab-mqtt, message: { type: publish, topic: lab/lights/kitchen, text: "on", qos: 0 } } }
        - wait: 300
        - call: { method: socket.close, params: { connId: lab-mqtt } }
quiz:
  - question: 一支温度计往 `home/kitchen/temp` 发布。哪个订阅收不到？
    options:
      - home/#
      - home/+/temp
      - home/kitchen
    answer: 2
    explain: 不带通配符的过滤器必须与主题完全一致。home/# 匹配 home 下面的一切，+ 匹配一层。
  - question: 谁把发布的消息送到订阅者手上？
    options:
      - broker，每个客户端都连着它
      - 发布者，它自己连到每个订阅者
      - 没有人；订阅者去轮询发布者
    answer: 0
    explain: 发布者和订阅者从不直接对话，它们只认识 broker 和主题名。
  - question: 消息必须送达，偶尔重复一次也没关系。用哪个 QoS？
    options:
      - QoS 0，最多一次
      - QoS 1，至少一次
      - QoS 2，恰好一次
    answer: 1
    explain: QoS 1 会一直重发直到 broker 确认，所以可能收到两次；QoS 2 不重复，但要多几个往返。
---

**MQTT** 是一个小巧轻量的消息协议，专为电量少、网络差的设备设计：传感器、智能插座、汽车、工厂机器。手机 App 也用它做聊天和通知。它跑在 TCP 上，通常用端口 `1883`（带 TLS 时是 `8883`，即 `mqtts://`）。

## 发布与订阅

MQTT 客户端之间从不直接对话。它们都连到一台叫 **broker** 的服务器上：

- 客户端把消息**发布**到一个**主题**，主题就是一个名字，比如 `home/kitchen/temp`。
- 客户端**订阅**自己关心的主题。
- broker 把每条消息转给所有订阅匹配的客户端。

```sequence
participants: 传感器, Broker, App
App -> Broker: SUBSCRIBE lab/sensors/#
Broker --> App: SUBACK（已订阅）
传感器 -> Broker: PUBLISH lab/sensors/temp 21.5
Broker --> App: PUBLISH lab/sensors/temp 21.5
```

传感器不知道谁在听，App 不知道读数来自哪台设备。再加一个 App，或者加一百个传感器，别的都不用改。

> [!note] 可以这样想……
> 一间热闹办公室里的公告板。大家把便条钉在标题下面（「厨房」「停车」），谁关注了那个标题谁就拿到一份。没人需要知道还有谁在读。

## 主题与通配符

主题是用 `/` 分层的名字。订阅可以用两种通配符：

| 过滤器 | 匹配 | 不匹配 |
|---|---|---|
| `home/kitchen/temp` | 只有这个主题 | `home/hall/temp` |
| `home/+/temp` | 一层：`home/kitchen/temp`、`home/hall/temp` | `home/kitchen/fridge/temp` |
| `home/#` | `home` 下面的一切 | `office/temp` |

## 服务质量（QoS）

每条消息都带一个 **QoS** 等级，也就是关于投递的承诺：

- **QoS 0，最多一次：** 发了就不管。快，但可能丢。
- **QoS 1，至少一次：** 一直重发到接收方确认，所以可能收到两次。
- **QoS 2，恰好一次：** 四步握手，最慢也最稳。

还有两个词你会遇到：**保留（retained）**消息由 broker 存着，之后谁来订阅就发给谁（适合「灯现在是开的」这种状态）；**保活（keep alive）**让客户端在安静的时候发个小 ping，双方都能发现死掉的连接。

## 在 Zorvik 里

**MQTT 客户端** 请求有 **连接**（客户端 ID、MQTT 版本、保活、清理会话）、**订阅**（主题过滤器及其 QoS）和 **Auth**（用户名密码）几个标签页。**连接** 之后，日志里每条消息都带主题徽标，底部输入区负责发布：一个 **主题**、QoS、**保留**、你的消息、**发送**。

> [!warning] 实验里的 broker 只是个临时替身
> 真正的 broker（Mosquitto、EMQX、HiveMQ）在很多客户端之间转发消息。实验里的 **Lab · Tiny MQTT broker** 是一个 Zorvik TCP 服务器，靠应答规则工作，只懂刚好够用的 MQTT：接受你的连接、确认订阅、发一条传感器读数。在 **服务器** 里打开它，能看到 MQTT 的二进制包出现在流量里。

**什么时候用得上：** 你在测智能家居 App 或一批设备：订阅它们的主题看它们上报什么，再自己发布命令看设备和 App 怎么反应。
