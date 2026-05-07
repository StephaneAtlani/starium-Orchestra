import { AccessDiagnosticsPage } from '@/features/access-diagnostics/components/access-diagnostics-page';

type Props = {
  params: Promise<{ clientId: string }>;
};

export default async function PlatformClientAccessDiagnosticsRoute({ params }: Props) {
  const { clientId } = await params;
  return <AccessDiagnosticsPage mode="platform" clientId={clientId} />;
}
