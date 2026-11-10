// 由 node i18n/tools/docs-zh.mjs 生成，不要手改：
// 改译文请改 app/src/i18n/locales/zh-CN/ui.json，然后重新运行该脚本。
// 结构必须与 components/docs/content.ts 一致（id、group、image 都不动）。
// The in-app docs: what Zorvik can do, one topic per feature. Text in `[...]` is a
// keyboard shortcut ("mod" is ⌘ on macOS, Ctrl elsewhere); `code` spans are monospace.

export interface DocTopic {
  id: string;
  /** Short group label shown above the title. */
  group: string;
  title: string;
  /** One line: why it matters. */
  tagline: string;
  /** Illustration (assets/docs/<image>.webp). */
  image: string;
  intro: string;
  features: string[];
  tryIt: string[];
  tip?: string;
}

export const QUICK_START = [
  "新建工作区，或打开已有的文件夹。它是一个可提交到 Git 的 YAML 文件夹。",
  "按 [mod+N] 新建请求，粘贴 URL，按 [mod+Enter] 发送。",
  "按 [mod+S] 保存到集合，按 [mod+E] 添加 Local、Staging 等环境。",
];

export const SHORTCUTS: [string, string][] = [
  ["mod+N", "新建请求"],
  ["mod+Enter", "发送 / 连接 / 启动"],
  ["mod+S", "保存"],
  ["mod+W", "关闭标签页"],
  ["mod+K", "快速查找"],
  ["mod+E", "环境"],
  ["mod+L", "跳到 URL"],
  ["mod+,", "设置"],
  ["Ctrl+Tab", "下一个标签页"],
  ["mod++", "放大"],
  ["mod+-", "缩小"],
  ["mod+0", "重置缩放"],
];

export const TOPICS: DocTopic[] = [
  {
    id: "academy",
    group: "学习",
    title: "训练营",
    tagline: "动手学网络与 API，从零基础到负载测试。",
    image: "docs-academy",
    intro:
      "内置在 Zorvik 里的课程。每课是一段带图解的短文、一个在你本机练习服务器上、于真实工作台里完成的实验，以及一个小测。实验指南会在你做对时立刻勾掉对应步骤。",
    features: [
      "17 个单元：网络、DNS、HTTP、发送数据、鉴权与 JWT、TLS、环境、测试、GraphQL 与 gRPC、WebSocket 与 SSE、TCP 与 UDP、Mock、负载测试、自动化、面向 AI Agent 的 MCP，以及结业项目",
      "实验会自行启动服务器并填好实验环境；数据不离开你的电脑",
      "提示从一句点拨到具体点哪里，卡住时可以“帮我做”",
      "经验、等级、段位、连续打卡和徽章；完成结业项目可获得 Zorvik 训练营结业证书",
      "训练营工作区始终存在且无法删除；可在学院菜单里重置（进度保留）",
    ],
    tryIt: ["在工作区菜单顶部（或欢迎页）选择训练营，然后开始训练营。", "实验卡住了？在右侧的实验指南里打开提示。"],
    tip: "已经会了？直接做该单元的免修测试，立刻拿到徽章。",
  },
  {
    id: "requests",
    group: "构建与发送",
    title: "HTTP 请求",
    tagline: "构造任意调用，看清网络上实际发生了什么。",
    image: "docs-requests",
    intro:
      "每个请求都会显示状态、耗时和大小，还会显示时间花在哪里、哪张证书应答、重定向去了哪里，以及真正离开你机器的请求头。",
    features: [
      "任意方法（含自定义），与 URL 同步的参数表，以及 `:path` 变量",
      "请求体：JSON、文本、XML、表单、带文件的 multipart，或二进制文件",
      "HTTP/1.1、HTTP/2 和 HTTP/3，逐请求超时、重定向和 TLS 校验",
      "美化 JSON、原始文本、HTML 与图片预览，以及十六进制视图",
      "用 JSONPath、jq 或 XPath 过滤响应（响应体上方的漏斗图标）",
      "保存为示例：把响应留在请求里（JSON 缩进），状态、请求头和响应体都可编辑，用于文档和 Mock",
      "请求、文件夹、工作区、服务器和负载测试都支持 Markdown 文档，按格式渲染，```mermaid 代码块会画成 Mermaid 图",
      "时序瀑布图：DNS → 连接 → TLS → 首字节 → 下载",
      "把响应保存到文件，或把任意请求复制为 cURL 或 16 种语言的代码（JavaScript、Python、Go、Java、C# 等）",
      "查询参数会保留各自的说明；把鼠标停在名称旁的 ⓘ 上即可查看",
    ],
    tryIt: [
      "按 [mod+N]，粘贴 URL，再按 [mod+Enter]。",
      "打开响应上的“时序”和“信息”，查看时间花在哪里。",
      "点 JSON 响应体上方的漏斗图标，输入 `$..id` 查看所有 id。",
      "打开请求的“文档”标签页，写一个 `# 标题` 和一个 `- 列表`，然后点“预览”。",
    ],
    tip: "把鼠标停在任意 `{{variable}}` 上（URL、请求体、请求头或脚本里），即可看到它的值和来源。未定义的变量在发送前会变红。",
  },
  {
    id: "mcp",
    group: "构建与发送",
    title: "MCP：测试 AI 工具",
    tagline: "看到 AI Agent 看到的东西：调用、测试并 Mock MCP 服务器。",
    image: "docs-mcp",
    intro:
      "AI 应用与 Agent 通过 Model Context Protocol 使用工具。模型依据工具的描述和 schema 选择工具并据此行动，往往无人值守。MCP 调用会连接一个服务器（一个 URL，或由 Zorvik 启动的程序），列出它的工具、资源和提示词，再用你给的参数发起调用，这样你就能验证 Agent 所依赖的一切。",
    features: [
      "Streamable HTTP、较旧的 HTTP+SSE 传输，以及 `npx -y @modelcontextprotocol/server-everything` 这类 stdio 程序",
      "连接后，在“服务器”标签页选择工具、资源或提示词：其参数会依据输入 schema 起头",
      "以 AI 应用看到的形态展示结果：文本、图片、结构化内容、失败调用（isError）和 JSON-RPC 错误",
      "“消息”标签页里的每条 JSON-RPC 消息，含程序自身的日志",
      "对答案做测试（`pm.response.json()`）、集合运行，以及在 CI 里 `zorvik run`",
      "自建 MCP 服务器（服务器 → + → MCP 服务器），供 AI 应用和 MCP 客户端使用，支持 HTTP 或 `zorvik serve … --stdio`",
      "只有在你允许了完全相同的命令、文件夹和环境之后，工作区才会启动程序",
    ],
    tryIt: [
      "点标签栏的 +，选择“MCP 调用（AI 工具）”，粘贴 MCP 服务器 URL，然后在结果区点“连接”。",
      "服务器 → + → MCP 服务器 → 启动，然后从 MCP 调用连接到它的地址。",
    ],
    tip: "工具错误应以结果形式返回，带 isError 和模型能据此行动的文字。可以这样测试：`pm.expect(pm.response.json().isError).to.eql(true)`。",
  },
  {
    id: "graphql",
    group: "构建与发送",
    title: "GraphQL",
    tagline: "懂你 schema 的查询编辑器。",
    image: "docs-graphql",
    intro:
      "把 GraphQL 请求指向某个端点，Zorvik 会用请求本身的鉴权和请求头自动拉取 schema。之后编辑器会补全字段、检查查询并解释类型。",
    features: [
      "基于实时 schema 的自动补全和行内报错",
      "变量用 JSON 给出，文档包含多个操作时会有操作选择器",
      "schema 浏览器，可浏览类型、字段和已弃用项",
      "一键美化；鉴权、请求头和环境与 HTTP 请求一致",
      "订阅会实时推送结果，走 WebSocket（graphql-transport-ws 或旧协议）或 SSE",
    ],
    tryIt: [
      "在集合中选择“新建 → GraphQL 请求”。",
      "在查询里输入 `{`，让自动补全给出字段建议。",
      "写一个 `subscription`：“发送”会变成“订阅”，结果会出现在日志里。",
    ],
  },
  {
    id: "grpc",
    group: "构建与发送",
    title: "gRPC",
    tagline: "通过服务器反射或 `.proto` 文件调用服务：一元与流式。",
    image: "docs-grpc",
    intro:
      "使用 `grpc://` 或 `grpcs://` 并选择方法。服务来自服务器反射，或你的 `.proto` 文件及其导入。消息就是普通 JSON，并带一个起手模板。",
    features: [
      "一元、服务端、客户端和双向流式调用",
      "流可保存消息和“连接时”步骤：发送消息、等待回复（`$.status == READY`）、持续发送某条消息，然后结束流",
      "把文件（WAV 音频按实时节奏）或麦克风数据流进客户端或双向流，每块放在 `audioContent` 之类的字段里：配合 Google Speech API 等做实时语音转写",
      "集合运行、`zorvik run` 和 AI Agent 会把调用跑到结束：每次等待都是一个测试，脚本可以读到 `pm.response.json()`（流消息以数组形式给出）",
      "metadata、请求头与 trailer，以及带细节的状态",
      "TLS、自定义证书和 OAuth 2.0，与 HTTP 请求一致",
    ],
    tryIt: ["选择“新建 → gRPC 请求”，输入 `grpc://host:port`，从列表中选择方法。"],
  },
  {
    id: "realtime",
    group: "构建与发送",
    title: "WebSocket、Socket.IO、SSE、TCP、UDP 与 MQTT",
    tagline: "与实时连接对话，查看每一条消息。",
    image: "docs-realtime",
    intro:
      "连接类请求会实时记录收发的所有内容，方便你跟踪会话并筛选。DNS 查询也是一种请求类型。",
    features: [
      "WebSocket：文本、JSON 或二进制（十六进制）消息，可发一次、每隔几秒发送，或作为 ping；带关闭码关闭；子协议",
      "可保存消息，以及“连接时”步骤：登录、等待回复（`$.type == welcome`）、保持心跳",
      "按文本或 JSON 条件筛选日志，查看回复耗时和消息间隔，并可导出",
      "打开一条消息即可看美化后的 JSON（字符串里嵌套的 JSON，如 Socket.IO 参数，会被展开），也可看原始内容；打开错误可读完整信息",
      "脚本：“连接前”脚本（设置变量、修改 URL 或请求头），以及“收到消息时”脚本——对匹配的消息运行、测试、保存值，并用 `pm.connection.send` 或 `.emit` 回复",
      "把文件（按节奏：每 M 毫秒 N 字节、指定区间、循环）或麦克风（PCM、G.711、Opus 或 AAC）作为二进制消息发送",
      "Socket.IO 3 和 4：命名空间、带确认的事件、二进制、WebSocket 或长轮询",
      "Socket.IO 可保存的 emit 和“连接时”步骤（等待事件、持续发送）、对服务器确认的回应，以及可只看单个事件或隐藏嘈杂事件的标签",
      "Server-Sent Events：每个事件到达即显示",
      "原始 TCP（明文或 TLS）和 UDP，支持消息分帧，发送一次或每隔几秒发送",
      "MQTT：订阅、QoS 和保留消息，以及用于跟踪单个主题的主题标签",
      "DNS：任意记录类型，支持 UDP、TCP、TLS 或 HTTPS",
    ],
    tryIt: ["选择“新建 → WebSocket”，输入 `ws://` 或 `wss://` URL，按 [mod+Enter] 连接。"],
  },
  {
    id: "变量",
    group: "组织",
    title: "环境、变量与秘密",
    tagline: "一个请求，多套环境，秘密不会泄漏进 Git。",
    image: "docs-variables",
    intro:
      "只写一次 `{{baseUrl}}/users/{{id}}`，然后在标题栏切换 Local、Staging 和 Production。秘密值只留在本机，从不写入工作区文件。",
    features: [
      "环境（[mod+E]）与集合级变量",
      "170 个动态值，覆盖 Postman 的全部并更多：`{{$uuid}}`、`{{$randomFullName}}`、`{{$randomInt(1, 100)}}`、`{{$isoDate(+3d)}}`，以及合法的测试卡号和 IBAN",
      "秘密变量：只存在本机，显示为 ••••••",
      "脚本设置的值只留在本机，从不写入你的文件，并显示在“由脚本设置”下",
    ],
    tryIt: ["按 [mod+E]，添加一个带 `baseUrl` 的环境，并在标题栏选中它。", "在请求体里输入 `{{$` 可浏览所有动态值，并附示例。"],
    tip: "主机变量未定义时会以清晰的提示中止发送，而不是抛出令人困惑的网络错误。",
  },
  {
    id: "auth",
    group: "组织",
    title: "鉴权",
    tagline: "在文件夹上设一次，里面的每个请求都会继承。",
    image: "docs-auth",
    intro:
      "鉴权和请求头从集合向下传递到文件夹和请求，任一层都可以覆盖。OAuth 2.0 令牌会自动获取、缓存和刷新；签名类鉴权每次发送都重新签名。",
    features: [
      "Basic、Bearer 和 API Key（请求头或查询参数）",
      "OAuth 2.0：客户端凭证、密码、带 PKCE 的授权码，以及隐式",
      "每次发送都重新签名：AWS Signature v4、OAuth 1.0、JWT（HS、RS、PS、ES）、Hawk、Akamai EdgeGrid、Atlassian ASAP",
      "挑战式鉴权：Digest（MD5、SHA-256）和用于 Windows 服务器的 NTLM",
      "在设置里配置自定义 CA 证书、客户端证书（mTLS）和代理",
    ],
    tryIt: ["右键文件夹 →“文件夹设置…”→“鉴权”，并让其中的请求保持“继承”。"],
  },
  {
    id: "scripts",
    group: "测试",
    title: "脚本与测试",
    tagline: "每个请求前后都可运行与 Postman 兼容的 JavaScript。",
    image: "docs-scripts",
    intro:
      "前置脚本可以为请求做准备；响应后脚本检查返回内容。脚本会在集合、其文件夹和每个请求上运行，由外到内，在带时间和内存限制的沙箱中执行。",
    features: [
      "`pm` API：`pm.environment`、`pm.variables`、`pm.request`、`pm.response` 等等",
      "`pm.test` 搭配 `pm.expect` 断言，以及 `pm.response.to.have.jsonSchema`；结果显示在“测试”标签页",
      "`pm.sendRequest`（回调或 `await`）可先登录或准备数据；`pm.cookies` 与 Cookie 存储；定时器",
      "`pm.visualizer.set(template, data)` 可把响应变成“可视化”标签页里的表格",
      "内置 Postman 的库，无需下载：`require('lodash')`、crypto-js（`CryptoJS`）、moment、ajv、uuid、chai、tv4、csv-parse、xml2js、cheerio、handlebars、assert，以及 `responseBody.has(…)` 等 SugarJS 方法",
      "也支持旧的 `postman.*` 和 `tests[…]` API，多年前写的集合照样能跑",
      "响应旁边的控制台输出",
      "WebSocket 和 Socket.IO：“连接前”和“收到消息时”脚本，可用 `pm.message`（`text()`、`json()`、`args`、`event`）以及 `pm.connection.send(data)` / `.emit(event, …args)`",
      "Postman 集合（v1、v2.0 和 v2.1）导入时会保留脚本",
    ],
    tip: "`pm.expect` 链里写错（如 `to.be.ture`）会让测试以“Invalid Chai property”失败，与 Postman 一致。",
    tryIt: ["在请求的“脚本”标签页里加上：`pm.test('ok', () => pm.response.to.have.status(200));`"],
  },
  {
    id: "runner",
    group: "测试",
    title: "集合运行器",
    tagline: "端到端运行整个文件夹，支持数据文件和报告。",
    image: "docs-runner",
    intro:
      "按顺序运行一个文件夹或整个集合，包含所有脚本和测试。给它一个 CSV 或 JSON 文件，就会每行运行一次。",
    features: [
      "选择并排序请求，设置迭代次数和延迟",
      "数据文件：每一列就是一个 `{{variable}}`",
      "“重复直到”：反复发送请求直到条件成立，例如 `pm.response.json().status === \"done\"`，用于等待任务完成",
      "事件流（SSE）也能跑：可停在指定事件、事件数量或时间上限，测试可读到 `pm.response.events`",
      "WebSocket 和 Socket.IO 请求会执行其“连接时”步骤：每次等待都是一个测试，其“收到消息时”脚本的测试也计入",
      "gRPC 调用也能跑：流会执行其“连接时”步骤",
      "打开结果即可查看它的测试和控制台、实际发出的请求（请求头、请求体）以及收到的响应",
      "首次失败即停止，并实时看到结果到达；被跳过的请求会说明原因",
      "为 CI 导出 JSON 或 JUnit XML",
    ],
    tryIt: [
      "右键文件夹 →“运行…”，然后按 [mod+Enter]。",
      "要轮询，打开请求的“设置 → 重复直到”，给出条件和时间上限。",
    ],
  },
  {
    id: "load",
    group: "测试",
    title: "负载测试",
    tagline: "在用户之前找到系统的极限。",
    image: "docs-load",
    intro:
      "把已保存的请求变成负载测试，实时观察，拿到真实数字。到达率模型从计划启动时刻起计时，慢服务器无法掩盖排队。",
    features: [
      "虚拟用户或到达率，带爬坡、保持和尖峰阶段",
      "带权重的目标、固定或随机思考时间、不计入统计的预热，以及 keep-alive 选项",
      "实时吞吐量、延迟分位数、错误、状态码，以及压测机自身的 CPU",
      "像 p95 < 300 毫秒这样的阈值可以判定运行通过或失败，持续不达标时还能提前停止",
      "数据文件让每个虚拟用户各用一行，测试就不会每次都打同一个 id",
      "捕获会从响应中取值，例如新订单的 `$.id`，供该用户后续请求使用",
      "时序：首字节时间、传输与连接耗时，以及服务器发送 Server-Timing 头时的自身耗时",
      "运行历史，支持 HTML、JSON 和 CSV 报告、按请求的状态码，以及用“对比”查看与更早一次运行的差异",
    ],
    tryIt: [
      "右键请求 →“负载测试…”，选择曲线，按 [mod+Enter]。",
      "跑完第二次后，在结果里打开“对比”并选择更早的那次运行。",
      "在错误率阈值上点“提前停止”：对着坏掉的服务器跑时，10 秒后就停止，而不是跑到底。",
    ],
    tip: "对超出本机与本地网络的主机施压前需要你确认。只对获准的系统做负载测试。",
  },
  {
    id: "servers",
    group: "模拟",
    title: "Mock 与各类服务器",
    tagline: "替代尚不存在的后端。",
    image: "docs-servers",
    intro:
      "几秒钟就能用文件夹、OpenAPI 文件或一次响应启动 Mock API。也可以为 AI 应用运行 MCP 服务器，以及 WebSocket、Socket.IO、SSE、TCP、UDP 和 DNS 服务器，或用中继观察两端的流量。",
    features: [
      "Mock 路由支持模板、延迟、故障注入、CORS，以及兜底应答或转发到真实后端",
      "应答序列（503、503，然后 200）用于测试重试，JSON 请求体条件与 `{{request.json.id}}`，以及“保存为路由”来记录真实后端的应答",
      "带故障注入的 TCP 中继：延迟、限速和断连",
      "每个服务器的实时流量，以及回复单个或所有客户端",
      "WebSocket 服务器可按规则作答（JSON 条件、回复里用 `{{message.id}}`、带关闭码关闭），并可定时发送消息，例如行情推送",
      "供 socket.io-client 应用连接的 Socket.IO 服务器：回显、带确认和广播的规则，以及定时事件",
      "带工具、资源和提示词的 MCP 服务器，供 AI 应用和 MCP 客户端使用，支持 HTTP 或 stdio",
      "服务器会在后台持续运行；标题栏显示正在运行的内容",
      "保存在工作区里，团队拿到的 Mock 完全一致",
      "端口被占用时会指出是哪个程序占着",
    ],
    tryIt: ["右键文件夹 →“对此文件夹做 Mock…”，然后在服务器栏启动它。"],
    tip: "Mock 的响应体可以回显请求：`{{request.params.id}}`、`{{request.query.q}}`、`{{request.headers.name}}`、`{{request.body}}`，以及 JSON 请求体里的某个值 `{{request.json.user.id}}`。",
  },
  {
    id: "tools",
    group: "检查",
    title: "工具",
    tagline: "出问题时随手可用的工具箱。",
    image: "docs-tools",
    intro: "无需离开应用就能快速查清主机、证书或载荷的问题。每个工具都在自己的标签页里打开。",
    features: [
      "TLS 检查器：证书链、有效期、协议和加密套件",
      "用任意解析器做 DNS 查询；端口检查；ICMP 或 TCP ping",
      "本机网络接口，方便其他设备访问你的服务器",
      "编解码：Base64、URL、十六进制、JWT、哈希和时间戳",
      "HTTP/3 检查",
      "证书解码：PEM 证书链、CSR 和私钥，链顺序，以及私钥属于哪张证书",
      "JSON 对比：两个文档或最近响应之间新增、删除和修改的路径",
      "过滤演练场：边输入边试用 JSONPath、jq 和 XPath",
      "正则测试器：与回复规则、捕获一致的匹配和分组语法",
    ],
    tryIt: [
      "打开“工具”栏，选择 TLS 检查器，输入 `example.com` 之类的主机名。",
      "打开 JSON 对比，在两侧各点“从历史选择”即可比较两个响应。",
    ],
  },
  {
    id: "import",
    group: "组织",
    title: "导入与导出",
    tagline: "把你的集合带过来，也能把请求带到任何地方。",
    image: "docs-import",
    intro:
      "一分钟从其他工具迁移过来，或直接从 API 目录开始。脚本和变量会一并带过来，数据不离开你的电脑。",
    features: [
      "API 目录：一步接入 OpenAI、Anthropic、Gemini、Stripe、GitHub、Slack、Google、AWS 等，登录方式已配好，环境里已备好放密钥的位置",
      "Postman 集合与环境",
      "OpenAPI 3 与 Swagger 2，可从文件、拖放或 URL 导入，并带真实感示例请求体；也支持 Google Discovery 文档和 AWS 服务模型",
      "OpenAPI 的路径参数会变成变量：`{session_id}` 在新环境里会转成 `{{sessionId}}`",
      "导入请求的响应会按规范校验：字段或类型偏离时，“与 API 规范一致”这个测试就会失败",
      "从 API 规范更新：新版本会新增和更新操作，保留你的修改；被移除的操作仍保留并划线标记",
      "粘贴 cURL 命令（bash、cmd 和 PowerShell）",
      "把任意请求复制为 cURL、HTTPie、Wget 或代码：JavaScript、Python、Go、Java、Kotlin、Swift、C#、PHP、Ruby、Rust、Dart、C、PowerShell",
    ],
    tryIt: [
      "打开集合菜单 →“导入…”，然后拖入文件、粘贴 cURL 命令，或输入 URL。",
      "在导入窗口的 API 目录标签页搜索“anthropic”，然后选择导入。",
      "API 变更后，右键导入的文件夹 →“从 API 规范更新…”，并预览改动。",
    ],
    tip: "导入的文档保存在工作区的 `specs/` 里。可在“文件夹设置 → API 规范”中关闭检查。",
  },
  {
    id: "workspace",
    group: "组织",
    title: "工作区、Git 与历史",
    tagline: "你的集合就是一个 YAML 文件夹：可评审、可 diff、可共享。",
    image: "docs-workspace",
    intro:
      "请求、环境、负载测试和服务器都是可读的小 YAML 文件。提交它们、在 PR 里评审、拉取队友的改动；文件变化时应用会自动重新加载。",
    features: [
      "`requests/`、`environments/`、`loadtests/` 和 `servers/` 文件夹",
      "秘密值不会进入文件",
      "每次发送都有可搜索的历史，每个工作区各有一个 Cookie 存储",
      "标签页会按你离开时的样子恢复",
      "无需账号、不依赖云：Zorvik 自己只发起一次到 GitHub 的更新检查，且不发送关于你的任何信息",
    ],
    tryIt: ["按 [mod+K] 查找任意请求、服务器、负载测试或工具。", "在“设置 → 更新”中选择自动更新、仅提醒或关闭。"],
  },
  {
    id: "cli",
    group: "自动化",
    title: "命令行与 CI",
    tagline: "同一套引擎，在你的终端和流水线里。",
    image: "docs-cli",
    intro:
      "`zorvik` 随应用一起安装。可在 CI 里跑集合的测试、用负载测试阈值卡住发布，或为集成测试启动 Mock 服务器。",
    features: [
      "`zorvik run <workspace>`：环境、文件夹、数据文件、JUnit 与 JSON 报告（MCP 调用要启动程序时加 `--allow-programs`）",
      "`zorvik load <workspace> <test>`：阈值不达标时以 1 退出；`--csv-seconds` 与 `--csv-requests` 可导出 CSV",
      "`zorvik serve <workspace> <server>`：运行已保存的 Mock 或服务器；`--stdio` 以 stdio 形式向启动它的 AI 应用提供 MCP 服务器",
      "`zorvik mcp`：AI Agent 的连接入口",
    ],
    tryIt: [
      "在终端执行：`zorvik run ./my-api --env Staging --junit report.xml`",
      "在没有应用的 CI 机器上，从最新 Release 下载 `zorvik-cli-…`：只有命令行。",
    ],
    tip: "在 macOS 上，通过“设置 → AI agents → 把 zorvik 加入 PATH”让该命令全局可用。",
  },
  {
    id: "agents",
    group: "自动化",
    title: "AI Agent",
    tagline: "让 Claude Code、Codex 或 Gemini 驱动 Zorvik，你在旁边看着。",
    image: "docs-agents",
    intro:
      "连接一次编码 Agent，就能让它把代码里的 API 映射成集合、发送请求、运行测试或发起负载测试。每一步都会实时显示在应用里，有风险的操作会等你确认。",
    features: [
      "一条命令即可连接（设置 → AI agents 会显示适合你的 Agent 的命令）",
      "Agent 可以构建并运行 Mock 服务器（含 MCP 服务器）、调用 MCP 服务器、读取其流量，读取流、变量和历史，以及导出代码",
      "Agent 可以打开 WebSocket、Socket.IO、TCP、UDP 和 MQTT 连接、发送消息并等待回复；你在标签页里实时看到这段对话",
      "删除、负载测试、服务器、程序，以及对局域网外主机的请求，都会先询问你",
      "AI Agent 面板会列出每一步操作；跟随模式会自动打开 Agent 正在操作的内容",
      "Agent 看到的一切里，秘密值都被遮蔽",
    ],
    tryIt: ["对你的 Agent 说：“把这个仓库里的 API 映射到 Zorvik 并运行。”"],
    tip: "在 Claude Code 中，`/mcp__zorvik__map_apis` 会启动一次引导式的代码库映射。",
  },
];
