import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ budgetId: string }>;
};

/** RFC-BUD-040 D2 — fusion reporting dans l'onglet Comparaisons de la fiche budget. */
export default async function BudgetReportingPage({ params }: PageProps) {
  const { budgetId } = await params;
  redirect(`/budgets/${budgetId}?onglet=comparaisons`);
}
