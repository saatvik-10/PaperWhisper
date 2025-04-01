import {Configuration, OpenAIApi} from 'openai-edge';
import {OpenAIStream, StreamingTextResponse} from 'ai'; //utility functions for streaming responses one by one instead of waiting for the whole response

export const runtime = 'edge'; //making this function faster after deployment

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
})

const openai = new OpenAIApi(config);

export async function POST(req: Request) {
    try {
        const {messages} = await req.json();
        const res = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages,
            stream: true,
        })
        const stream = OpenAIStream(res);
        return new StreamingTextResponse(stream);
    } catch (err) {
        
    }
}