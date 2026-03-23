import { collection, getDocs, updateDoc, doc, orderBy, query, deleteDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type VerifStatus = 'nouveau' | 'en_cours' | 'traité' | 'rejeté';

export interface VerificationRequest {
  id: string;
  procedureId: string;
  procedureRef: string;
  procedureName: string;
  phase: string;
  step: string;
  phaseIndex: number;
  stepIndex: number;
  element: string;
  comment: string;
  requester: string;
  status: VerifStatus;
  createdAt: Date;
}

function fromFirestore(id: string, data: any): VerificationRequest {
  const createdAt = data.createdAt?.toDate?.() ?? (data.createdAt ? new Date(data.createdAt) : new Date());
  return {
    id,
    procedureId:   data.procedureId   || '',
    procedureRef:  data.procedureRef  || '',
    procedureName: data.procedureName || '',
    phase:         data.phase         || '',
    step:          data.step          || '',
    phaseIndex:    typeof data.phaseIndex === 'number' ? data.phaseIndex : (data.phaseIndex?.integerValue !== undefined ? parseInt(data.phaseIndex.integerValue) : 0),
    stepIndex:     typeof data.stepIndex  === 'number' ? data.stepIndex  : (data.stepIndex?.integerValue  !== undefined ? parseInt(data.stepIndex.integerValue)  : -1),
    element:       data.element       || '',
    comment:       data.comment       || '',
    requester:     data.requester     || '',
    status:        data.status        || 'nouveau',
    createdAt,
  };
}

export async function getAllVerificationRequests(): Promise<VerificationRequest[]> {
  const q = query(collection(db, 'verification_requests'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => fromFirestore(d.id, d.data()));
}

export async function updateVerificationRequestStatus(id: string, status: VerifStatus): Promise<void> {
  await updateDoc(doc(db, 'verification_requests', id), { status });
}

export async function deleteVerificationRequest(id: string): Promise<void> {
  await deleteDoc(doc(db, 'verification_requests', id));
}

export async function getNewVerificationRequestsCount(): Promise<number> {
  const q = query(collection(db, 'verification_requests'), where('status', '==', 'nouveau'));
  const snap = await getDocs(q);
  return snap.size;
}
