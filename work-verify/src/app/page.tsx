import { Suspense } from 'react';
import VerifyContent from '@/components/VerifyContent';

export default function Page() {
  return (
    <main>
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyContent />
      </Suspense>
    </main>
  );
}
