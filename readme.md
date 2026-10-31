# Checkin

GitHub Actions 实现 [GLaDOS][glados] 自动签到

([GLaDOS][glados] 可用邀请码: `MW4DK-O0RSF-C7AOU-EN1MP`, 双方都有奖励天数)

## 使用说明

1. Fork 这个仓库

1. 登录 [GLaDOS][glados] 获取 Cookie

1. 添加 Cookie 到 Secret `GLADOS`，建议从浏览器开发者工具复制完整的 `gld:sess.sig`、`gld:sess`、`koa:sess.sig`、`koa:sess`

1. 添加同一浏览器的 User-Agent 到 Secret `GLADOS_UA`，可在该浏览器控制台执行 `navigator.userAgent` 获取

    - GLaDOS 自 2026-09-24 起会校验签到 UA 与登录浏览器是否一致，UA 不一致会返回「没有权限」
    - 浏览器大版本更新后，需要重新登录并同时更新 `GLADOS` 和 `GLADOS_UA`

1. 启用 Actions, 每天北京时间 00:10 自动签到

## 高级功能

1. 如有多个帐号, 可以写为多行 Secret `GLADOS`, 每行写一个 Cookie; `GLADOS_UA` 可按行对应，只写一行则所有账号共用

1. 如果使用自定义签到域名，配置 Secret `DOMAIN`，例如 `railgun.info`；不配置时默认使用 `glados.cloud`

1. 如需修改时间, 可以修改文件 [run.yml](.github/workflows/run.yml#L7) 中的 `cron` 参数, 格式可参考 [crontab]

1. 如需推送通知, 可配置 Secret `NOTIFY`, 已支持:
    1. [WxPusher][wxpusher]: 格式 `wxpusher:{token}:{uid}`
    1. [PushPlus][pushplus]: 格式 `pushplus:{token}`
    1. Console: 格式 `console:log`, 作为日志输出, 一般用于调试
    1. 如需配置多个, 可以写为多行, 每行写一个

1. 注意: Cookie 以及接口输出数据, 包含帐号敏感信息, 因此不要随意公开

1. 签到失败时 Actions 会显示失败，避免出现运行成功但实际未签到的假绿状态

---

[glados]: https://github.com/glados-network/GLaDOS
[crontab]: https://crontab.guru/
[pushplus]: https://www.pushplus.plus/
[wxpusher]: https://wxpusher.zjiecode.com/
