import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();

    // 1. 读取 Vercel 中配置的环境变量
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'DEEPSEEK_API_KEY 未配置，请在 Vercel 环境变量中添加',
          success: false,
        },
        { status: 500 }
      );
    }

    // 2. 动态捕获用户输入的提问（无论前端字段叫 prompt、question、content 还是 dimension）
    const userInstruction =
      rawBody.question ||
      rawBody.prompt ||
      rawBody.customPrompt ||
      rawBody.dimension ||
      rawBody.content ||
      '请结合命盘进行综合解读分析';

    // 3. 提取排盘数据
    const chartData = rawBody.chart || rawBody.data || rawBody;

    // 4. 组装发送给大模型的内容
    const fullMessage = `【命盘排盘数据】：
${typeof chartData === 'object' ? JSON.stringify(chartData, null, 2) : chartData}

【用户提问与风格要求】：
${userInstruction}`;

    // 5. 调用 DeepSeek 官方接口
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位精通紫微斗数的命理解析助手，请严格按照用户当下的具体提问与风格偏好进行分析解读。',
          },
          { role: 'user', content: fullMessage },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errDetail = await response.text();
      return NextResponse.json(
        { error: `DeepSeek 返回错误: ${errDetail}`, success: false },
        { status: response.status }
      );
    }

    const resJson = await response.json();
    const reply = resJson.choices?.[0]?.message?.content || '未能生成解读内容';

    // 6. 返回数据（塞满所有可能读取的键名，避免前端取不到结果报错）
    return NextResponse.json({
      success: true,
      text: reply,
      content: reply,
      result: reply,
      data: reply,
      interpretation: reply,
      message: reply,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || '服务端异常，解析失败',
        success: false,
      },
      { status: 500 }
    );
  }
}
