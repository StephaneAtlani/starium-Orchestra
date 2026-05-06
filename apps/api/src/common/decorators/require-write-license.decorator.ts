import { SetMetadata } from '@nestjs/common';

export const REQUIRE_WRITE_LICENSE_KEY = 'require_write_license';

export const RequireWriteLicense = () =>
  SetMetadata(REQUIRE_WRITE_LICENSE_KEY, true);
