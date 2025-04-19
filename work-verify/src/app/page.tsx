import { Suspense } from 'react';
import VerifyContent from '@/components/VerifyContent';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyContent />
      </Suspense>
    </main>
  );
}
