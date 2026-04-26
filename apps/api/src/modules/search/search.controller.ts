import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard, ActiveClientGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @RequestUserId() userId: string | undefined,
    @ActiveClientId() clientId: string | undefined,
    @Query() query: SearchQueryDto,
  ) {
    return this.searchService.search(userId!, clientId!, query.q);
  }
}
