import { redirect } from 'next/navigation';

export default function CapacityMembersRedirect() {
  redirect('/teams/capacity?tab=reglages');
}
