import { useCallback, useEffect, useState } from "react";

// The caller memoizes load. Obsolete requests cannot replace a newer response.
export default function useQuery(load) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let current = true;
    Promise.resolve()
      .then(() => {
        if (current) setState((s) => ({ ...s, loading: true, error: null }));
        return load();
      })
      .then((data) => {
        if (current) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (current) setState((s) => ({ ...s, loading: false, error }));
      });
    return () => {
      current = false;
    };
  }, [load, version]);
  return { ...state, reload };
}
