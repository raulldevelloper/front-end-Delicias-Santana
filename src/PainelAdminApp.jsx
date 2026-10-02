import { useState, useEffect } from "react";
import logo from "./assets/logo.jpg";
import "./PainelAdminApp.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

const STATUS_INFO = {
  AGUARDANDO_PAGAMENTO: { label: "Aguardando pagamento", cor: "#9a9a9a", proximo: "PAGAMENTO_CONFIRMADO" },
  PAGAMENTO_CONFIRMADO: { label: "Pagamento confirmado", cor: "#3b6fa0", proximo: "EM_PREPARO" },
  EM_PREPARO: { label: "Em preparo", cor: "#d98324", proximo: "PRONTO_PARA_RETIRADA" },
  PRONTO_PARA_RETIRADA: { label: "Pronto para retirada", cor: "#3f8f5f", proximo: "RETIRADO" },
  RETIRADO: { label: "Retirado", cor: "#5a5a5a", proximo: null },
  CANCELADO: { label: "Cancelado", cor: "#a33333", proximo: null },
};

function useApi(token) {
  return async function chamar(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers["Authorization"] = "Bearer " + token;

    const resp = await fetch(API_BASE + path, { ...options, headers });
    const texto = await resp.text();
    let corpo = null;
    try { corpo = texto ? JSON.parse(texto) : null; } catch (e) { corpo = texto; }

    if (!resp.ok) {
      const erro = new Error((corpo && corpo.mensagem) || "Algo deu errado. Tente de novo.");
      throw erro;
    }
    return corpo;
  };
}

/* ---------------- Login ---------------- */
function TelaLoginAdmin({ onEntrar }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const chamar = useApi(null);

  async function entrar() {
    setErro(null);
    setCarregando(true);
    try {
      const resp = await chamar("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      });
      if (resp.role !== "ADMIN") {
        setErro("Esta área é restrita à administração.");
        return;
      }
      onEntrar(resp);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="pa-app pa-gate">
      <div className="pa-gate-card">
        <img src={logo} alt="Delicias Santana" className="pa-gate-logo" />
        <h1 className="pa-gate-titulo pa-titulo">Delicias Santana</h1>
        <p className="pa-gate-sub">Painel administrativo</p>

        {erro && <div className="pa-erro">{erro}</div>}

        <div className="pa-campo">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="pa-campo">
          <label>Senha</label>
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} />
        </div>
        <button className="pa-botao pa-botao-bloco" onClick={entrar} disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Aba Pedidos ---------------- */
function AbaPedidos({ chamar }) {
  const [pedidos, setPedidos] = useState([]);
  const [erro, setErro] = useState(null);

  async function carregar() {
    setErro(null);
    try {
      setPedidos(await chamar("/api/pedidos/painel"));
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
  carregar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  async function avancar(id, novoStatus) {
    try {
      await chamar(`/api/pedidos/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ novoStatus }),
      });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div>
      <div className="pa-secao-topo">
        <h2 className="pa-titulo">Pedidos em andamento</h2>
        <button className="pa-botao pa-botao-outline" onClick={carregar}>Atualizar</button>
      </div>
      {erro && <div className="pa-erro">{erro}</div>}
      {pedidos.length === 0 && !erro && <p className="pa-vazio">Nenhum pedido ativo no momento.</p>}
      <div className="pa-pedidos-grid">
        {pedidos.map(p => {
          const info = STATUS_INFO[p.status] || { label: p.status, cor: "#999" };
          return (
            <div className="pa-pedido-card" key={p.id}>
              <span className="pa-pedido-id">#{p.id}</span>
              <span className="pa-status-pill" style={{ background: info.cor }}>{info.label}</span>
              <span className="pa-pedido-itens">
                {p.itens.map(i => `${i.quantidade}x ${i.nomeProduto}`).join(", ")}
              </span>
              <span className="pa-pedido-total">R$ {Number(p.valorTotal).toFixed(2)}</span>
              {info.proximo && (
                <button className="pa-botao" onClick={() => avancar(p.id, info.proximo)}>
                  Avançar → {STATUS_INFO[info.proximo].label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Aba Categorias ---------------- */
function AbaCategorias({ chamar, categorias, onRecarregar }) {
  const [nome, setNome] = useState("");
  const [ordem, setOrdem] = useState(1);
  const [erro, setErro] = useState(null);

  async function criar() {
    setErro(null);
    if (!nome.trim()) { setErro("Dê um nome para a categoria."); return; }
    try {
      await chamar("/api/categorias", {
        method: "POST",
        body: JSON.stringify({ nome, ordemExibicao: Number(ordem) }),
      });
      setNome("");
      setOrdem(1);
      onRecarregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div>
      <div className="pa-secao-topo">
        <h2 className="pa-titulo">Categorias</h2>
      </div>
      {erro && <div className="pa-erro">{erro}</div>}
      <div className="pa-linha-dupla" style={{ marginBottom: 20 }}>
        <div className="pa-campo">
          <label>Nome da categoria</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Bebidas" />
        </div>
        <div className="pa-campo" style={{ maxWidth: 100 }}>
          <label>Ordem</label>
          <input type="number" value={ordem} onChange={e => setOrdem(e.target.value)} />
        </div>
      </div>
      <button className="pa-botao" onClick={criar}>Adicionar categoria</button>

      <table className="pa-tabela" style={{ marginTop: 20 }}>
        <thead><tr><th>Nome</th><th>Ordem</th></tr></thead>
        <tbody>
          {categorias.map(c => (
            <tr key={c.id}><td>{c.nome}</td><td>{c.ordemExibicao}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Formulário de produto (lateral) ---------------- */
function FormularioProduto({ chamar, categorias, produtoEditando, onFechar, onSalvo }) {
  const [nome, setNome] = useState(produtoEditando?.nome || "");
  const [descricao, setDescricao] = useState(produtoEditando?.descricao || "");
  const [preco, setPreco] = useState(produtoEditando?.preco || "");
  const [categoriaId, setCategoriaId] = useState(produtoEditando?.categoriaId || "");
  const [controlaEstoque, setControlaEstoque] = useState(produtoEditando?.controlaEstoque ?? true);
  const [estoqueAtual, setEstoqueAtual] = useState(produtoEditando?.estoqueAtual ?? 0);
  const [tempoPreparo, setTempoPreparo] = useState(produtoEditando?.tempoPreparoMinutos || 15);
  const [ativo, setAtivo] = useState(produtoEditando?.ativo ?? true);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    if (!nome.trim() || !categoriaId || !preco) {
      setErro("Preencha nome, preço e categoria.");
      return;
    }
    setSalvando(true);
    const payload = {
      nome, descricao, preco: Number(preco),
      categoria: { id: Number(categoriaId) },
      controlaEstoque,
      estoqueAtual: Number(estoqueAtual),
      tempoPreparoMinutos: Number(tempoPreparo),
      ativo,
    };
    try {
      if (produtoEditando) {
        await chamar(`/api/produtos/${produtoEditando.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await chamar("/api/produtos", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSalvo();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="pa-overlay" onClick={onFechar} />
      <div className="pa-painel-lateral">
        <div className="pa-painel-lateral-topo">
          <strong>{produtoEditando ? "Editar produto" : "Novo produto"}</strong>
          <button className="pa-painel-lateral-fechar" onClick={onFechar}>×</button>
        </div>
        <div className="pa-painel-lateral-corpo">
          {erro && <div className="pa-erro">{erro}</div>}

          <div className="pa-campo">
            <label>Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div className="pa-campo">
            <label>Descrição</label>
            <textarea rows={2} value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>
          <div className="pa-linha-dupla">
            <div className="pa-campo">
              <label>Preço (R$)</label>
              <input type="number" step="0.01" value={preco} onChange={e => setPreco(e.target.value)} />
            </div>
            <div className="pa-campo">
              <label>Categoria</label>
              <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
                <option value="">-- escolha --</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="pa-checkbox">
            <input
              type="checkbox"
              id="controlaEstoque"
              checked={controlaEstoque}
              onChange={e => setControlaEstoque(e.target.checked)}
            />
            <label htmlFor="controlaEstoque">Controlar estoque deste produto</label>
          </div>

          {controlaEstoque && (
            <div className="pa-campo">
              <label>Estoque atual</label>
              <input type="number" value={estoqueAtual} onChange={e => setEstoqueAtual(e.target.value)} />
            </div>
          )}

          <div className="pa-campo">
            <label>Tempo de preparo (minutos)</label>
            <input type="number" value={tempoPreparo} onChange={e => setTempoPreparo(e.target.value)} />
          </div>

          <div className="pa-checkbox">
            <input type="checkbox" id="ativo" checked={ativo} onChange={e => setAtivo(e.target.checked)} />
            <label htmlFor="ativo">Visível no cardápio (ativo)</label>
          </div>

          <button className="pa-botao pa-botao-bloco" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar produto"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------------- Aba Produtos ---------------- */
function AbaProdutos({ chamar, categorias }) {
  const [produtos, setProdutos] = useState([]);
  const [erro, setErro] = useState(null);
  const [formAberto, setFormAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);

  async function carregar() {
    setErro(null);
    try {
      // usa o endpoint de admin para ver também os produtos inativos
      setProdutos(await chamar("/api/produtos/admin/todos"));
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
  carregar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  function abrirNovo() {
    setProdutoEditando(null);
    setFormAberto(true);
  }

  function abrirEdicao(p) {
    setProdutoEditando({
      ...p,
      categoriaId: categorias.find(c => c.nome === p.categoriaNome)?.id || "",
    });
    setFormAberto(true);
  }

  function aoSalvar() {
    setFormAberto(false);
    carregar();
  }

  return (
    <div>
      <div className="pa-secao-topo">
        <h2 className="pa-titulo">Produtos</h2>
        <button className="pa-botao" onClick={abrirNovo}>+ Novo produto</button>
      </div>
      {erro && <div className="pa-erro">{erro}</div>}

      <table className="pa-tabela">
        <thead>
          <tr><th>Nome</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {produtos.map(p => (
            <tr key={p.id}>
              <td>{p.nome}</td>
              <td>{p.categoriaNome}</td>
              <td>R$ {Number(p.preco).toFixed(2)}</td>
              <td>{p.disponivel ? "—" : "esgotado/inativo"}</td>
              <td>
                {p.disponivel
                  ? <span className="pa-badge-ativo">Visível</span>
                  : <span className="pa-badge-inativo">Oculto</span>}
              </td>
              <td><button className="pa-link-acao" onClick={() => abrirEdicao(p)}>Editar</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {formAberto && (
        <FormularioProduto
          chamar={chamar}
          categorias={categorias}
          produtoEditando={produtoEditando}
          onFechar={() => setFormAberto(false)}
          onSalvo={aoSalvar}
        />
      )}
    </div>
  );
}

/* ---------------- App principal ---------------- */
export default function PainelAdminApp() {
  const [auth, setAuth] = useState(null);
  const [aba, setAba] = useState("pedidos");
  const [categorias, setCategorias] = useState([]);
  const chamar = useApi(auth ? auth.token : null);

  async function carregarCategorias() {
    try {
      setCategorias(await chamar("/api/categorias"));
    } catch (e) { /* ignora aqui, cada aba mostra seu próprio erro */ }
  }

  useEffect(() => {
    if (auth) carregarCategorias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  if (!auth) {
    return <TelaLoginAdmin onEntrar={setAuth} />;
  }

  return (
    <div className="pa-app">
      <div className="pa-topo">
        <img src={logo} alt="Delicias Santana" className="pa-topo-logo" />
        <div>
          <h1 className="pa-titulo">Delicias Santana</h1>
          <span>Painel administrativo — {auth.email}</span>
        </div>
        <button className="pa-topo-sair" onClick={() => setAuth(null)}>Sair</button>
      </div>

      <div className="pa-abas">
        <button className={aba === "pedidos" ? "pa-aba-ativa" : ""} onClick={() => setAba("pedidos")}>Pedidos</button>
        <button className={aba === "produtos" ? "pa-aba-ativa" : ""} onClick={() => setAba("produtos")}>Produtos</button>
        <button className={aba === "categorias" ? "pa-aba-ativa" : ""} onClick={() => setAba("categorias")}>Categorias</button>
      </div>

      <div className="pa-conteudo">
        {aba === "pedidos" && <AbaPedidos chamar={chamar} />}
        {aba === "produtos" && <AbaProdutos chamar={chamar} categorias={categorias} />}
        {aba === "categorias" && (
          <AbaCategorias chamar={chamar} categorias={categorias} onRecarregar={carregarCategorias} />
        )}
      </div>
    </div>
  );
}
