(() => {
  const { useEffect, useMemo, useState } = React;

  function useItems() {
    const [state, setState] = useState({ loading: true, error: null, data: [] });

    useEffect(() => {
      (async () => {
        try {
          const url = window.__DEFAULT_ITEMS_URL__ || 'itens.json';
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) throw new Error(`Falha ao buscar ${url}: ${res.status}`);
          const json = await res.json();

          // Aceita "items" OU "Unid" (com ou sem acento nas chaves)
          const items = Array.isArray(json.items)
            ? json.items
            : Array.isArray(json.Unid)
            ? json.Unid
            : [];

          // Normaliza campos com/sem acentos
          const norm = items.map((r) => ({
            codigo: r.codigo ?? r['código'] ?? r.code ?? '',
            descricao: r.descricao ?? r['descrição'] ?? r.name ?? '',
            // estoque e custo são ignorados na visualização
          }));

          setState({ loading: false, error: null, data: norm });
        } catch (e) {
          setState({ loading: false, error: String(e), data: [] });
        }
      })();
    }, []);

    return state;
  }

  function App() {
    const { loading, error, data } = useItems();
    const [q, setQ] = useState('');

    const filtered = useMemo(() => {
      const term = q.trim().toLowerCase();
      if (!term) return data;
      return data.filter(
        (r) =>
          String(r.codigo).toLowerCase().includes(term) ||
          String(r.descricao).toLowerCase().includes(term)
      );
    }, [data, q]);

    return React.createElement(
      'div',
      { className: 'space-y-4' },

      // Busca
      React.createElement(
        'div',
        null,
        React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Buscar'),
        React.createElement('input', {
          className: 'w-full border rounded-lg px-3 py-2',
          placeholder: 'Código ou nome do produto…',
          value: q,
          onChange: (e) => setQ(e.target.value),
        })
      ),

      // Estados
      loading &&
        React.createElement(
          'div',
          { className: 'text-gray-500 text-sm' },
          'Carregando produtos…'
        ),
      error &&
        React.createElement(
          'div',
          { className: 'text-red-600 text-sm' },
          'Erro: ',
          error
        ),

      // Lista
      !loading &&
        !error &&
        React.createElement(
          'div',
          { className: 'overflow-x-auto' },
          React.createElement(
            'table',
            { className: 'min-w-full text-sm' },
            React.createElement(
              'thead',
              { className: 'bg-gray-100' },
              React.createElement(
                'tr',
                null,
                React.createElement('th', { className: 'text-left p-3' }, 'Código'),
                React.createElement('th', { className: 'text-left p-3' }, 'Produto')
              )
            ),
            React.createElement(
              'tbody',
              null,
              filtered.length === 0
                ? React.createElement(
                    'tr',
                    null,
                    React.createElement(
                      'td',
                      { colSpan: 2, className: 'p-6 text-center text-gray-500' },
                      'Nenhum item encontrado.'
                    )
                  )
                : filtered.map((r) =>
                    React.createElement(
                      'tr',
                      { key: r.codigo, className: 'border-t' },
                      React.createElement(
                        'td',
                        { className: 'p-3 font-mono text-xs md:text-sm whitespace-nowrap' },
                        r.codigo || '—'
                      ),
                      React.createElement('td', { className: 'p-3' }, r.descricao || '—')
                    )
                  )
            )
          )
        )
    );
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(App));
})();
