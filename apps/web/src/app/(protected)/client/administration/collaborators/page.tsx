import { redirect } from 'next/navigation';

/** Point d’entrée Admin — gestion des comptes liés à l’annuaire. */
export default function AdministrationCollaboratorsPage() {
  redirect('/teams/collaborators?platformUserLinkStatus=LINK_REQUIRED');
}
