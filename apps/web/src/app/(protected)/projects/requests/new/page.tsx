import { Suspense } from 'react';
import { LoadingState } from '@/components/feedback/loading-state';
import { ProjectRequestFormPage } from '@/features/project-requests/components/project-request-form-page';

export default function Page() {
  return (
    <Suspense fallback={<LoadingState rows={8} />}>
      <ProjectRequestFormPage />
    </Suspense>
  );
}
