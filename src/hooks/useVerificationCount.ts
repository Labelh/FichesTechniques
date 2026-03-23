import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useVerificationCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'verification_requests'),
      where('status', '==', 'nouveau')
    );
    const unsub = onSnapshot(q, (snap) => setCount(snap.size), () => setCount(0));
    return () => unsub();
  }, []);

  return count;
}
