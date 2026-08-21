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
import { RequireArea } from 'src/modules/auth/decorator/require-area.decorator'
import { AreaGuard } from 'src/modules/auth/guard/area.guard'
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard'
import { AreaEnum } from 'src/shared/enums/area.enum'

import { ChatRequestDto } from '../model/dto/chat-request.dto'
import { DescriptorsChatRequestDto } from '../model/dto/descriptors-chat-request.dto'
import { EvolutionaryLineChatRequestDto } from '../model/dto/evolutionary-line-chat-request.dto'
import { EvolutionaryLineReadingChatRequestDto } from '../model/dto/evolutionary-line-reading-chat-request.dto'
import { EvolutionaryLineStudentChatRequestDto } from '../model/dto/evolutionary-line-student-chat-request.dto'
import { GroupingChatRequestDto } from '../model/dto/grouping-chat-request.dto'
import { NotEvaluatedChatRequestDto } from '../model/dto/not-evaluated-chat-request.dto'
import { PerformanceHistoryChatRequestDto } from '../model/dto/performance-history-chat-request.dto'
import { PerformanceLevelChatRequestDto } from '../model/dto/performance-level-chat-request.dto'
import { RaceChatRequestDto } from '../model/dto/race-chat-request.dto'
import { ReleasesChatRequestDto } from '../model/dto/releases-chat-request.dto'
import { SchoolAbsencesChatRequestDto } from '../model/dto/school-absences-chat-request.dto'
import { SyntheticTestChatRequestDto } from '../model/dto/synthetic-test-chat-request.dto'
import { AiAnalysisService } from '../service/ai-analysis.service'

@Controller('ai')
@ApiTags('AI Analysis')
@UseGuards(JwtAuthGuard, AreaGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiAnalysisService: AiAnalysisService) {}

  @Post('/chat')
  @HttpCode(HttpStatus.OK)
  @RequireArea(AreaEnum.AI_ASSIST)
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

  @Post('/chat/descriptors')
  @HttpCode(HttpStatus.OK)
  @RequireArea(AreaEnum.AI_ASSIST)
  @ApiOperation({
    summary: 'Chat com IA para análise do relatório de descritores',
    description:
      'Envia mensagens e contexto do relatório de descritores para análise pela IA. Retorna resposta em streaming.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta em streaming de texto da IA',
  })
  @ApiResponse({
    status: 400,
    description: 'Corpo da requisição inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  async chatDescriptors(
    @Body() chatRequest: DescriptorsChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream =
        this.aiAnalysisService.streamDescriptorsAnalysis(chatRequest)

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process descriptors chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }

  @Post('/chat/synthetic-test')
  @HttpCode(HttpStatus.OK)
  @RequireArea(AreaEnum.AI_ASSIST)
  @ApiOperation({
    summary: 'Chat com IA para análise do relatório sintético de testes',
    description:
      'Envia mensagens e contexto do relatório sintético de testes para análise pela IA. Retorna resposta em streaming.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta em streaming de texto da IA',
  })
  @ApiResponse({
    status: 400,
    description: 'Corpo da requisição inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  async chatSyntheticTest(
    @Body() chatRequest: SyntheticTestChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream =
        this.aiAnalysisService.streamSyntheticTestAnalysis(chatRequest)

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process synthetic test chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }

  @Post('/chat/performance-level')
  @HttpCode(HttpStatus.OK)
  @RequireArea(AreaEnum.AI_ASSIST)
  @ApiOperation({
    summary: 'Chat com IA para análise do relatório de Nível de Desempenho',
    description:
      'Envia mensagens e contexto do relatório de Nível de Desempenho para análise pela IA. Retorna resposta em streaming.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta em streaming de texto da IA',
  })
  @ApiResponse({
    status: 400,
    description: 'Corpo da requisição inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  async chatPerformanceLevel(
    @Body() chatRequest: PerformanceLevelChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream =
        this.aiAnalysisService.streamPerformanceLevelAnalysis(chatRequest)

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process performance level chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }

  @Post('/chat/performance-history')
  @HttpCode(HttpStatus.OK)
  @RequireArea(AreaEnum.AI_ASSIST)
  @ApiOperation({
    summary: 'Chat com IA para análise do relatório de Histórico de Desempenho',
    description:
      'Envia mensagens e contexto do relatório de Histórico de Desempenho para análise pela IA. Retorna resposta em streaming.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta em streaming de texto da IA',
  })
  @ApiResponse({
    status: 400,
    description: 'Corpo da requisição inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  async chatPerformanceHistory(
    @Body() chatRequest: PerformanceHistoryChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream =
        this.aiAnalysisService.streamPerformanceHistoryAnalysis(chatRequest)

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process performance history chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }

  @Post('/chat/not-evaluated')
  @HttpCode(HttpStatus.OK)
  @RequireArea(AreaEnum.AI_ASSIST)
  @ApiOperation({
    summary: 'Chat com IA para análise do relatório de Não Avaliados',
    description:
      'Envia mensagens e contexto do relatório de Não Avaliados para análise pela IA. Retorna resposta em streaming.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta em streaming de texto da IA',
  })
  @ApiResponse({
    status: 400,
    description: 'Corpo da requisição inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  async chatNotEvaluated(
    @Body() chatRequest: NotEvaluatedChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream =
        this.aiAnalysisService.streamNotEvaluatedAnalysis(chatRequest)

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process not-evaluated chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }

  @Post('/chat/school-absences')
  @HttpCode(HttpStatus.OK)
  @RequireArea(AreaEnum.AI_ASSIST)
  @ApiOperation({
    summary: 'Chat com IA para análise do Relatório de Infrequência',
    description:
      'Envia mensagens e contexto do relatório de Infrequência (faltas) para análise pela IA. Retorna resposta em streaming.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta em streaming de texto da IA',
  })
  @ApiResponse({
    status: 400,
    description: 'Corpo da requisição inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  async chatSchoolAbsences(
    @Body() chatRequest: SchoolAbsencesChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream =
        this.aiAnalysisService.streamSchoolAbsencesAnalysis(chatRequest)

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process school absences chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }

  @Post('/chat/evolutionary-line')
  @HttpCode(HttpStatus.OK)
  @RequireArea(AreaEnum.AI_ASSIST)
  @ApiOperation({
    summary: 'Chat com IA para análise do Relatório Linha Evolutiva',
    description:
      'Envia mensagens e contexto do Relatório Linha Evolutiva (geral) para análise pela IA. Retorna resposta em streaming.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta em streaming de texto da IA',
  })
  @ApiResponse({ status: 400, description: 'Corpo da requisição inválido' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async chatEvolutionaryLine(
    @Body() chatRequest: EvolutionaryLineChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream =
        this.aiAnalysisService.streamEvolutionaryLineAnalysis(chatRequest)

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process evolutionary line chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }

  @Post('/chat/evolutionary-line-student')
  @HttpCode(HttpStatus.OK)
  @RequireArea(AreaEnum.AI_ASSIST)
  @ApiOperation({
    summary:
      'Chat com IA para análise do Relatório Linha Evolutiva (nível aluno)',
    description:
      'Envia mensagens e contexto do Relatório Linha Evolutiva individual do aluno para análise pela IA. Retorna resposta em streaming.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta em streaming de texto da IA',
  })
  @ApiResponse({ status: 400, description: 'Corpo da requisição inválido' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async chatEvolutionaryLineStudent(
    @Body() chatRequest: EvolutionaryLineStudentChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream =
        this.aiAnalysisService.streamEvolutionaryLineStudentAnalysis(
          chatRequest,
        )

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process evolutionary line student chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }

  @Post('/chat/evolutionary-line-reading')
  @HttpCode(HttpStatus.OK)
  @RequireArea(AreaEnum.AI_ASSIST)
  @ApiOperation({
    summary: 'Chat com IA para análise do Relatório Evolução de Leitura',
    description:
      'Envia mensagens e contexto do Relatório Evolução de Leitura para análise pela IA. Retorna resposta em streaming.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta em streaming de texto da IA',
  })
  @ApiResponse({
    status: 400,
    description: 'Corpo da requisição inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  async chatEvolutionaryLineReading(
    @Body() chatRequest: EvolutionaryLineReadingChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream =
        this.aiAnalysisService.streamEvolutionaryLineReadingAnalysis(
          chatRequest,
        )

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process evolutionary line reading chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }

  @Post('/chat/releases')
  @HttpCode(HttpStatus.OK)
  @RequireArea(AreaEnum.AI_ASSIST)
  @ApiOperation({
    summary: 'Chat com IA para análise do Relatório de Lançamentos',
    description:
      'Envia mensagens e contexto do Relatório de Lançamentos para análise pela IA. Retorna resposta em streaming.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta em streaming de texto da IA',
  })
  @ApiResponse({ status: 400, description: 'Corpo da requisição inválido' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async chatReleases(
    @Body() chatRequest: ReleasesChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream = this.aiAnalysisService.streamReleasesAnalysis(chatRequest)

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process releases chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }

  @Post('/chat/grouping')
  @HttpCode(HttpStatus.OK)
  @RequireArea(AreaEnum.AI_ASSIST)
  @ApiOperation({
    summary: 'Chat com IA para análise do Relatório de Enturmação',
    description:
      'Envia mensagens e contexto do Relatório de Enturmação para análise pela IA. Retorna resposta em streaming.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta em streaming de texto da IA',
  })
  @ApiResponse({ status: 400, description: 'Corpo da requisição inválido' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async chatGrouping(
    @Body() chatRequest: GroupingChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream = this.aiAnalysisService.streamGroupingAnalysis(chatRequest)

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process grouping chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }

  @Post('/chat/race')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chat com IA para análise do relatório de Cor e Raça',
    description:
      'Envia mensagens e contexto do relatório de Cor e Raça para análise pela IA. Retorna resposta em streaming.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta em streaming de texto da IA',
  })
  @ApiResponse({
    status: 400,
    description: 'Corpo da requisição inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  async chatRace(
    @Body() chatRequest: RaceChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
      const stream = this.aiAnalysisService.streamRaceAnalysis(chatRequest)

      for await (const chunk of stream) {
        res.write(chunk)
      }

      res.end()
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process race chat request',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      } else {
        res.end()
      }
    }
  }
}
