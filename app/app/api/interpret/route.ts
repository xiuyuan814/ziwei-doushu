import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'DEEPSEEK_API_KEY 未配置，请在 Vercel 环境变量中添加',
        success: false 
      }, { status: 500 });
    }

    // 无论前端传过来的字段叫 prompt、question、content 还是 dimension，统统抓取
    const promptText = rawBody.prompt || rawBody.question || rawBody.dimension || rawBody.content || '请根据命盘进行详细解读分析';
    const chartData = rawBody.chart || rawBody.data || rawBody;

    const fullMessage = `【命盘排盘数据】：\n${typeof chartData === 'object' ? JSON.stringify(chartData, null, 2) : chartData}\n\n【用户提问/分析维度】：\n${promptText}`;

    // 调用 DeepSeek 官方 API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一位精通倪海厦《天纪》体系的紫微斗数命理大师，请根据命盘客观详尽地解答。' },
          { role: 'user', content: fullMessage },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errDetail = await response.text();
      return NextResponse.json({ error: `DeepSeek 返回错误: ${errDetail}`, success: false }, { status: response.status });
    }

    const resJson = await response.json();
    const reply = resJson.choices?.[0]?.message?.content || '未能生成解读';

    // 把前端可能读取的所有常见字段名全部塞满返回，彻底避免前端拿不到字段
    return NextResponse.json({
      success: true,
      text: reply,
      content: reply,
      result: reply,
      data: reply,
      interpretation: reply,
      message: reply
    });
  } catch (err: any) {
    return NextResponse.json({ 
      error: err?.message || '服务器解析异常',
      success: false 
    }, { status: 500 });
  }
}
