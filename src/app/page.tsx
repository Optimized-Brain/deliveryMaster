import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard');
  return null; // redirect will interrupt render, this is for type safety
}
