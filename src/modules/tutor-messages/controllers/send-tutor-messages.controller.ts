import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Parser } from 'json2csv'
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard'

import {
  PaginateInAppDetailsParamsDto,
  PaginateSendTutorMessageParamsDto,
} from '../dto/paginate-send-tutor-message-params.dto'
import { SendTutorMessagesService } from '../services/send-tutor-messages.service'

@Controller('send-tutor-messages')
@ApiTags('Envios de Mensagens aos tutores')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SendTutorMessagesController {
  constructor(
    private readonly sendTutorMessagesService: SendTutorMessagesService,
  ) {}

  @Get('/')
  findAll(@Query() params: PaginateSendTutorMessageParamsDto) {
    return this.sendTutorMessagesService.findAll(params)
  }

  @Get('/in-app-metrics')
  @ApiOperation({ summary: 'Métricas do canal in-app para uma mensagem' })
  getInAppMetrics(
    @Query('tutorMessageId', ParseIntPipe) tutorMessageId: number,
  ) {
    return this.sendTutorMessagesService.getInAppMetrics(tutorMessageId)
  }

  @Get('/in-app-details')
  @ApiOperation({ summary: 'Detalhamento do canal in-app para uma mensagem' })
  findAllInAppDetails(@Query() params: PaginateInAppDetailsParamsDto) {
    return this.sendTutorMessagesService.findAllInAppDetails(params)
  }

  @Get('/in-app-details/export')
  @ApiOperation({ summary: 'Exportar detalhamento in-app (CSV)' })
  async exportInAppDetails(
    @Query('tutorMessageId', ParseIntPipe) tutorMessageId: number,
    @Res() res,
  ) {
    const data = await this.sendTutorMessagesService.findAllInAppDetails({
      tutorMessageId,
      page: 1,
      limit: 0,
      isCsv: true,
    })

    const parser = new Parser({ withBOM: true, delimiter: ',' })
    const csvData = parser.parse(data as any[])

    const nameFile = `${Date.now()}-metricas-in-app.csv`
    res.setHeader('Content-Disposition', `attachment; filename=${nameFile}`)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.send(csvData)
  }
}
