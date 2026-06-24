import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  Timestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collections } from '@/lib/firestore';
import { useProcedures } from '@/hooks/useProcedures';

export interface ForecastArticle {
  id: string;
  reference: string;
  quantity: number;
  timePerPiece: number;
  ftDone: boolean | null;
  createdAt: Date;
}

export interface ForecastStats {
  total: number;
  done: number;
  remaining: number;
  totalCharge: number;
  coveredCharge: number;
  coveragePercent: number;
}

function normalizeRef(ref: string): string {
  return ref.trim().toLowerCase().split(/\s*\/\s*/)[0].trim();
}

export function useForecastArticles() {
  const [articles, setArticles] = useState<ForecastArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const procedures = useProcedures();

  const procedureRefSet = useMemo(() => {
    const exact = new Set<string>();
    const normalized = new Set<string>();
    for (const p of procedures || []) {
      const ref = p.reference?.trim().toLowerCase();
      if (!ref) continue;
      exact.add(ref);
      normalized.add(normalizeRef(ref));
    }
    return { exact, normalized };
  }, [procedures]);

  useEffect(() => {
    const q = query(
      collection(db, collections.forecastArticles),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          reference: data.reference || '',
          quantity: data.quantity || 0,
          timePerPiece: data.timePerPiece || 0,
          ftDone: data.ftDone ?? null,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as ForecastArticle;
      });
      setArticles(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  const matchesProcedure = useCallback(
    (ref: string): boolean => {
      const lower = ref.trim().toLowerCase();
      if (procedureRefSet.exact.has(lower)) return true;
      return procedureRefSet.normalized.has(normalizeRef(lower));
    },
    [procedureRefSet]
  );

  const isFtDone = useCallback(
    (article: ForecastArticle): boolean => {
      if (article.ftDone === true || article.ftDone === false) return article.ftDone;
      return matchesProcedure(article.reference);
    },
    [matchesProcedure]
  );

  const stats: ForecastStats = (() => {
    let done = 0;
    let coveredCharge = 0;
    let totalCharge = 0;
    for (const a of articles) {
      const charge = a.quantity * a.timePerPiece;
      totalCharge += charge;
      if (isFtDone(a)) {
        done++;
        coveredCharge += charge;
      }
    }
    return {
      total: articles.length,
      done,
      remaining: articles.length - done,
      totalCharge,
      coveredCharge,
      coveragePercent: totalCharge > 0 ? Math.round((coveredCharge / totalCharge) * 100) : 0,
    };
  })();

  const addArticle = async (reference: string, quantity: number, timePerPiece: number) => {
    await addDoc(collection(db, collections.forecastArticles), {
      reference,
      quantity,
      timePerPiece,
      ftDone: null,
      createdAt: Timestamp.now(),
    });
  };

  const removeArticle = async (id: string) => {
    await deleteDoc(doc(db, collections.forecastArticles, id));
  };

  const toggleFtDone = async (article: ForecastArticle) => {
    const autoDetected = matchesProcedure(article.reference);
    let newValue: boolean | null;
    if (article.ftDone === null) {
      newValue = !autoDetected;
    } else {
      const wouldMatchAuto = article.ftDone !== autoDetected;
      newValue = wouldMatchAuto ? null : !article.ftDone;
    }
    await updateDoc(doc(db, collections.forecastArticles, article.id), { ftDone: newValue });
  };

  return { articles, loading, stats, isFtDone, addArticle, removeArticle, toggleFtDone };
}
