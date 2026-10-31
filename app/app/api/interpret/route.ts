import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chart, question, customPrompt, dimension } = body;

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: '环境变量中未配置 DEEPSEEK_API_KEY' },
        { status: 500 }
      );
    }

    const userInstruction = question || customPrompt || dimension || '请综合命盘做基础分析';

    const fullMessage = `【命盘数据】：
${JSON.stringify(chart, null, 2)}

【用户要求与提问】：
${userInstruction}`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一位精通紫微斗数的命理解析助手，请依据用户命盘和具体提问要求进行详细解读。' },
          { role: 'user', content: fullMessage },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errDetail = await response.text();
      return NextResponse.json(
        { error: `模型调用失败: ${errDetail}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '未能生成解读内容';

    return NextResponse.json({
      success: true,
      data: content,
      content: content,
      result: content,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || '服务端异常' },
      { status: 500 }
    );
  }
}
