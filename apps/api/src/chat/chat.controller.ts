import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { CurrentSession } from '../auth/current-session.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat/threads')
@UseGuards(SessionAuthGuard)
export class ChatController {
  constructor(
    @Inject(ChatService) private readonly chatService: ChatService,
  ) {}

  @Get()
  fetchInbox(@CurrentSession() session: SessionRecord) {
    return this.chatService.fetchInbox(session);
  }

  @Get(':threadId')
  fetchThread(
    @CurrentSession() session: SessionRecord,
    @Param('threadId') threadId: string,
  ) {
    return this.chatService.fetchThread({
      session,
      threadId,
    });
  }

  @Post(':threadId/messages')
  sendMessage(
    @CurrentSession() session: SessionRecord,
    @Param('threadId') threadId: string,
    @Body() body: { body?: string },
  ) {
    return this.chatService.sendMessage({
      body: body.body ?? '',
      session,
      threadId,
    });
  }
}
