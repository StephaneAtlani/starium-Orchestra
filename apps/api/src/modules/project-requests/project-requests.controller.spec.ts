import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { ProjectRequestsController } from './project-requests.controller';

function getHandlerMetadata(
  controller: ProjectRequestsController,
  methodName: keyof ProjectRequestsController,
): { path?: string; method?: number } {
  const handler = controller[methodName as keyof ProjectRequestsController];
  if (typeof handler !== 'function') {
    throw new Error(`Handler ${String(methodName)} not found`);
  }
  return {
    path: Reflect.getMetadata(PATH_METADATA, handler),
    method: Reflect.getMetadata(METHOD_METADATA, handler),
  };
}

describe('ProjectRequestsController — routes', () => {
  const controller = new ProjectRequestsController(
    {} as never,
    {} as never,
    {} as never,
  );

  it('expose submit, decision, route, cancel et endpoints CDC', () => {
    expect(getHandlerMetadata(controller, 'submit').path).toBe(':id/submit');
    expect(getHandlerMetadata(controller, 'decision').path).toBe(':id/decision');
    expect(getHandlerMetadata(controller, 'route').path).toBe(':id/route');
    expect(getHandlerMetadata(controller, 'cancel').path).toBe(':id/cancel');
    expect(getHandlerMetadata(controller, 'n1Decide').path).toBe(':id/n1-decide');
    expect(getHandlerMetadata(controller, 'instruct').path).toBe(':id/instruct');
    expect(getHandlerMetadata(controller, 'summary').path).toBe('summary');
  });

  it('validator-options avant :id', () => {
    expect(getHandlerMetadata(controller, 'validatorOptions').path).toBe(
      'validator-options',
    );
  });
});
