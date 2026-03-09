import { Global, Module } from '@nestjs/common';
import { ActiveClientCacheService } from './cache/active-client-cache.service';

@Global()
@Module({
  providers: [ActiveClientCacheService],
  exports: [ActiveClientCacheService],
})
export class CommonModule {}

