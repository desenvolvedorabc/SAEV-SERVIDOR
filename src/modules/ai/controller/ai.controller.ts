import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { Response } from 'express'
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard'

import { ChatRequestDto } from '../model/dto/chat-request.dto'
import { AiAnalysisService } from '../service/ai-analysis.service'

@Controller('ai')
@ApiTags('AI Analysis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiAnalysisService: AiAnalysisService) {}

  @Post('/chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chat with AI for report analysis',
    description:
      'Sends messages and report context to AI for educational data analysis. Returns streaming response.',
  })
  @ApiResponse({
    status: 200,
    description: 'Streaming text response from AI',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async chat(
    @Body() chatRequest: ChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream = this.aiAnalysisService.streamAnalysis(chatRequest)

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }
}
