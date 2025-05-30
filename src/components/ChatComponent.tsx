'use client';

import React from 'react';
import { Input } from './ui/input';
import { useChat } from 'ai/react';
import { Button } from './ui/button';
import { Send } from 'lucide-react';
import MessageList from './MessageList';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Message } from 'ai';

type Props = { chatId: number };

const ChatComponent = ({ chatId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      const res = await axios.post<Message[]>('/api/get-messages', { chatId });
      return res.data;
    },
  });

  const { input, handleInputChange, handleSubmit, messages } = useChat({
    api: '/api/chat',
    body: {
      chatId,
    },
    initialMessages: data || [],
  });

  React.useEffect(() => {
    const messageContainer = document.getElementById('message-container');
    if (messageContainer) {
      messageContainer.scrollTo({
        top: messageContainer.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  return (
    <div
      className='relative max-h-screen overflow-scroll'
      id='message-container'
    >
      <div className='sticky top-0 inset-x-0 p-2 bg-indigo-200 h-fit'>
        <h3 className='font-bold text-indigo-800'>Chat</h3>
      </div>

      <MessageList messages={messages} isLoading={isLoading} />

      <form
        onSubmit={handleSubmit}
        className='sticky bottom-0 px-2 py-4 bg-indigo-100'
      >
        <div className='flex'>
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder='Whisper your query...'
            className='w-full shadow shadow-indigo-300 text-indigo-800'
          />
          <Button className='bg-indigo-700 ml-2'>
            <Send className='h-4 w-4 text-indigo-100' />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;
