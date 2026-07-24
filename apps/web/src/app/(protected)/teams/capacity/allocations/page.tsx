import { redirect } from 'next/navigation';

export default function CapacityAllocationsRedirect() {
  redirect('/teams/capacity?tab=affectations');
}
