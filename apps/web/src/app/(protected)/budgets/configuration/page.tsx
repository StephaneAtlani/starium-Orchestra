import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, FileSpreadsheet, GitBranch, LayoutDashboard } from 'lucide-react';

export default async function BudgetsConfigurationPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Configuration"
        description="Exercices budgétaires, cockpit et imports."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
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
        <Link href="/budgets/cockpit-settings">
          <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <LayoutDashboard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Cockpit budget</h3>
                <p className="text-sm text-muted-foreground">
                  Ordre et visibilité des blocs du tableau de bord
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/budgets/workflow-settings">
          <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Workflow budget</h3>
                <p className="text-sm text-muted-foreground">
                  Règle avant validation finale (enveloppes / baseline)
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </PageContainer>
  );
}
