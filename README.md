# 免费代理聚合

每天自动拉取公开免费代理，过滤后写成订阅文件 `URI.txt`（整份列表的 Base64）。
action 的定时不准时，github 每天定时任务很多，平台只是在定时时间加入队列，什么时候执行看队列情况，不建议定一些整点，错开一点

## 使用前

1. 打开 `config.json`，把源地址里的 `https://xxx.com/...` 换成真实接口。
2. 在 GitHub 新建空仓库，把本目录推上去：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

3. 打开仓库的 **Settings → Actions → General**，允许 GitHub Actions 读写仓库（Workflow permissions 选 Read and write）。
4. 打开 **Actions**，手动运行一次 **Update proxies**，确认生成了 `URI.txt`。

之后会每天自动更新。也可以随时在 Actions 里手动触发。

## 本地运行

需要安装 [Bun](https://bun.sh)。

```bash
bun test
bun run update
```

`bun run update` 会按中国时区当天日期请求接口，成功后覆盖 `URI.txt`。接口失败或过滤后没有可用代理时，不会改旧文件。

## 输出规则

- 丢掉 `https` 协议。
- 协议里包含 `socks` / `socks4` / `socks5` 时输出 `socks://ip:port`。
- 否则包含 `http` 时输出 `http://ip:port`。
- 同一条同时有 socks 和 http 时只保留 socks。
- 相同 URI 去重，保留先出现的。

订阅客户端直接使用仓库里的 `URI.txt` 即可。

## 添加更多源

`config.json` 的 `sources` 是数组。当前只实现了 `daily_list_api` 这一种分页 JSON 接口，后续可以按同样结构继续加源。
