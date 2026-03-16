import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, FileSpreadsheet } from 'lucide-react';

export default function BudgetsConfigurationPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Configuration"
        description="Exercices budgétaires et imports."
      />
      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <Link href="/budgets/exercises">
          <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Exercices</h3>
                <p className="text-sm text-muted-foreground">
                  Gérer les exercices budgétaires
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/budgets/imports">
          <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Imports</h3>
                <p className="text-sm text-muted-foreground">
                  Importer des données depuis Excel
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </PageContainer>
  );
}
