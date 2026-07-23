import { redirect } from 'next/navigation';

/** Ancienne fiche Collaborateur — rattachement ADDS uniquement via Membres. */
export default function TeamsCollaboratorDetailRedirectPage() {
  redirect('/client/members');
}
