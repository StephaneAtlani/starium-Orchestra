import { redirect } from 'next/navigation';

export default function CapacitySettingsRedirect() {
  redirect('/teams/capacity?tab=reglages');
}
