import { redirect } from 'next/navigation';

// /admin/departures redirects to the arrivals page which has a Departures tab
export default function DeparturesPage() {
  redirect('/admin/arrivals?tab=departures');
}
