import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';

import { ChatService } from './chat.service';

@Controller('chat/threads')
export class ChatController {
  constructor(
    @Inject(ChatService) private readonly chatService: ChatService,
  ) {}

  @Get()
  fetchInbox() {
    return this.chatService.fetchInbox();
  }

  @Get(':threadId')
  fetchThread(@Param('threadId') threadId: string) {
    return this.chatService.fetchThread(threadId);
  }

  @Post(':threadId/messages')
  sendMessage(
    @Param('threadId') threadId: string,
    @Body() body: { body?: string },
  ) {
    return this.chatService.sendMessage({
      body: body.body ?? '',
      threadId,
    });
  }
}
