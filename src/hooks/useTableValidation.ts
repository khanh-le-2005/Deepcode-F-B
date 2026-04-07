import { useEffect, useState } from 'react';
import axios from '@/src/lib/axiosClient';
import { Table, Order } from '../types';

export type TableValidationStatus = 'loading' | 'valid' | 'invalid';

const normalizeKey = (value?: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

export const useTableValidation = (tableId?: string) => {
  const [status, setStatus] = useState<TableValidationStatus>('loading');
  const [table, setTable] = useState<Table | null>(null);
  const [session, setSession] = useState<Order | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!tableId) {
      setStatus('valid');
      setTable(null);
      setSession(null);
      return;
    }

    const validate = async () => {
      setStatus('loading');
      try {
        // Step 1: Check for active session (Section 6, Step 1)
        const sessionRes = await axios.get(`/api/orders/table/${tableId}/active-session`);
        if (!isMounted) return;

        setSession(sessionRes.data);
        // Note: The session response should contain enough info about the table
        setTable({
          id: sessionRes.data.tableId,
          _id: sessionRes.data.tableId,
          name: sessionRes.data.tableName || tableId,
          slug: tableId,
          status: 'occupied'
        } as Table);
        setStatus('valid');
      } catch (error: any) {
        if (!isMounted) return;

        if (error.response?.status === 404) {
          // Step 2: Session not found, check if table exists as empty (Section 6, Step 1)
          try {
            const tablesRes = await axios.get('/api/tables');
            const targetKey = normalizeKey(tableId);
            const match = (tablesRes.data || []).find((t: Table) => {
              const tableIdKey = normalizeKey(t._id);
              const slugKey = normalizeKey(t.slug);
              const nameKey = normalizeKey(t.name);

              return (
                tableIdKey === targetKey ||
                slugKey === targetKey ||
                nameKey === targetKey
              );
            });

            if (match) {
              setTable(match);
              setSession(null);
              setStatus('valid');
            } else {
              setStatus('invalid');
            }
          } catch (err) {
            setStatus('invalid');
          }
        } else {
          setStatus('invalid');
        }
      }
    };

    validate();

    return () => {
      isMounted = false;
    };
  }, [tableId]);

  return { status, table, session };
};
