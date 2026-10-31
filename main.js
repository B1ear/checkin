const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

const requestJson = async (url, options, label) => {
  const response = await fetch(url, options)
  const body = await response.text()
  let data

  try {
    data = body ? JSON.parse(body) : {}
  } catch {
    throw new Error(`${label}返回了非 JSON 响应 (HTTP ${response.status})`)
  }

  if (!response.ok) {
    throw new Error(`${label} HTTP ${response.status}: ${data?.message || '请求失败'}`)
  }

  return data
}

const glados = async () => {
  const notice = []
  if (!process.env.GLADOS?.trim()) {
    throw new Error('未配置 GLADOS Secret')
  }

  // GLaDOS 自 2026-09-24 起校验 UA，多账号时 GLADOS_UA 按行对应。
  const cookies = String(process.env.GLADOS).split('\n').map((value) => value.trim()).filter(Boolean)
  const agents = String(process.env.GLADOS_UA || '').split('\n').map((value) => value.trim()).filter(Boolean)
  const domain = String(process.env.DOMAIN || 'glados.cloud')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')

  console.log(`目标域名: ${domain}`)
  console.log(`账号数量: ${cookies.length}`)

  for (const [index, cookie] of cookies.entries()) {
    const accountNo = index + 1
    try {
      const common = {
        'cookie': cookie,
        'referer': `https://${domain}/console/checkin`,
        'user-agent': agents[index] || agents[0] || DEFAULT_UA,
      }
      const action = await requestJson(`https://${domain}/api/user/checkin`, {
        method: 'POST',
        headers: { ...common, 'content-type': 'application/json' },
        body: JSON.stringify({ token: domain }),
      }, '签到接口')

      console.log(`[账号${accountNo}] 签到响应: code=${action?.code ?? '无'} message=${action?.message || '无'}`)
      const alreadyCheckedIn = action?.code === 1
      if (action?.code !== 0 && !alreadyCheckedIn) {
        throw new Error(
          `${action?.message || '签到失败'} (code=${action?.code}${action?.reason ? `, reason=${action.reason}` : ''})`
        )
      }

      const status = await requestJson(`https://${domain}/api/user/status`, {
        method: 'GET',
        headers: { ...common },
      }, '状态接口')

      if (status?.code !== 0) {
        throw new Error(`状态接口异常: ${status?.message || '未知错误'} (code=${status?.code})`)
      }

      const leftDays = Number(status?.data?.leftDays)
      console.log(`[账号${accountNo}] 签到成功，剩余 ${leftDays} 天`)
      notice.push(
        'Checkin OK',
        `${alreadyCheckedIn ? '今日已签到过' : action?.message}`,
        `Left Days ${leftDays}`
      )
    } catch (error) {
      console.error(`[账号${accountNo}] 签到失败: ${error.message}`)
      notice.push(
        'Checkin Error',
        `账号${accountNo}: ${error.message}`,
        `<${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}>`
      )
    }
  }
  return notice
}

const notify = async (notice) => {
  if (!process.env.NOTIFY || !notice) return
  for (const option of String(process.env.NOTIFY).split('\n')) {
    if (!option) continue
    try {
      if (option.startsWith('console:')) {
        for (const line of notice) {
          console.log(line)
        }
      } else if (option.startsWith('wxpusher:')) {
        await fetch(`https://wxpusher.zjiecode.com/api/send/message`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            appToken: option.split(':')[1],
            summary: notice[0],
            content: notice.join('<br>'),
            contentType: 3,
            uids: option.split(':').slice(2),
          }),
        })
      } else if (option.startsWith('pushplus:')) {
        await fetch(`https://www.pushplus.plus/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: option.split(':')[1],
            title: notice[0],
            content: notice.join('<br>'),
            template: 'markdown',
          }),
        })
      } else if (option.startsWith('qyweixin:')) {
        const qyweixinToken = option.split(':')[1]
        const qyweixinNotifyRebotUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=' + qyweixinToken;
        await fetch(qyweixinNotifyRebotUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            msgtype: 'markdown',
            markdown: {
                content: notice.join('<br>')
            }
          }),
        })
      } else {
        // fallback
        await fetch(`https://www.pushplus.plus/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: option,
            title: notice[0],
            content: notice.join('<br>'),
            template: 'markdown',
          }),
        })
      }
    } catch (error) {
      throw error
    }
  }
}

const main = async () => {
  const notice = await glados()
  await notify(notice)

  // 通知照常发送，但签到失败时让 GitHub Actions 显示失败而不是假绿。
  if (Array.isArray(notice) && notice.includes('Checkin Error')) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`运行失败: ${error.message}`)
  process.exitCode = 1
})
