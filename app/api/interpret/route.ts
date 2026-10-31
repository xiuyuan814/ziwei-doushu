export async function POST(req: Request) {
  try {
    const rawBody = await req.json();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'DEEPSEEK_API_KEY 未配置，请在 Vercel 环境变量中添加' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 提取提问或分析维度
    const promptText =
      rawBody.question ||
      rawBody.prompt ||
      rawBody.customPrompt ||
      rawBody.dimension ||
      rawBody.content ||
      '请结合命盘进行详尽的解读分析';

    const chartData = rawBody.chart || rawBody.data || rawBody;

    const fullMessage = `【命盘排盘数据】：\n${
      typeof chartData === 'object' ? JSON.stringify(chartData, null, 2) : chartData
    }\n\n【用户提问与分析要求】：\n${promptText}`;

    // 向 DeepSeek 开启 stream: true 流式请求
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
            content: '你是一位精通紫微斗数的命理解析助手，请依据用户命盘和具体提问要求进行详细、透彻的分点解读。',
          },
          { role: 'user', content: fullMessage },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errDetail = await response.text();
      return new Response(
        JSON.stringify({ error: `DeepSeek 错误: ${errDetail}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 核心：直接将 DeepSeek 的流式数据管道透传给前端组件
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || '服务端异常' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
