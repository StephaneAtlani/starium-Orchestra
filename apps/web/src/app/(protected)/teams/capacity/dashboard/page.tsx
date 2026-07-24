import { redirect } from 'next/navigation';

export default function CapacityDashboardRedirect() {
  redirect('/teams/capacity?tab=pilotage');
}
