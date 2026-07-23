import { redirect } from 'next/navigation';

/** Ancienne UI Collaborateurs — rattachement ADDS uniquement via Membres. */
export default function TeamsCollaboratorsRedirectPage() {
  redirect('/client/members');
}
