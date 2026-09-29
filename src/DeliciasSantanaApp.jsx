import { useState, useEffect } from "react";
import logo from "./assets/logo.jpg";
import "./DeliciasSantana.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

const STATUS_INFO = {
  AGUARDANDO_PAGAMENTO: { label: "Aguardando pagamento", cor: "#9a9a9a" },
  PAGAMENTO_CONFIRMADO: { label: "Pagamento confirmado", cor: "#3b6fa0" },
  EM_PREPARO: { label: "Em preparo", cor: "#d98324" },
  PRONTO_PARA_RETIRADA: { label: "Pronto para retirada", cor: "#3f8f5f" },
  RETIRADO: { label: "Retirado", cor: "#5a5a5a" },
  CANCELADO: { label: "Cancelado", cor: "#a33333" },
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

function IconeFoto() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 15l-5-4-4 4-3-2-5 4" />
    </svg>
  );
}

/* ---------------- Tela de login / cadastro ---------------- */
function TelaAcesso({ onEntrar }) {
  const [modo, setModo] = useState("login"); // login | cadastro
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const chamarSemToken = useApi(null);

  async function logar(emailLogin, senhaLogin) {
    const resp = await chamarSemToken("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: emailLogin, senha: senhaLogin }),
    });
    onEntrar(resp);
  }

  async function enviar() {
    setErro(null);
    setCarregando(true);
    try {
      if (modo === "login") {
        await logar(email, senha);
      } else {
        await chamarSemToken("/api/clientes", {
          method: "POST",
          body: JSON.stringify({ nome, telefone, email, senha }),
        });
        await logar(email, senha);
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="ds-app ds-gate">
      <div className="ds-gate-card">
        <img src={logo} alt="Delicias Santana" className="ds-gate-logo" />
        <h1 className="ds-gate-titulo ds-titulo">Delicias Santana</h1>
        <p className="ds-gate-sub">Doces &amp; Salgados</p>

        {erro && <div className="ds-erro">{erro}</div>}

        {modo === "cadastro" && (
          <>
            <div className="ds-campo">
              <label>Nome</label>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="ds-campo">
              <label>Telefone (com DDD)</label>
              <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="11988887777" />
            </div>
          </>
        )}

        <div className="ds-campo">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" />
        </div>
        <div className="ds-campo">
          <label>Senha</label>
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••" />
        </div>

        <button className="ds-botao" onClick={enviar} disabled={carregando}>
          {carregando ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar conta"}
        </button>

        <div className="ds-alternar">
          {modo === "login" ? (
            <>Ainda não tem conta? <button onClick={() => setModo("cadastro")}>Cadastre-se</button></>
          ) : (
            <>Já tem conta? <button onClick={() => setModo("login")}>Entrar</button></>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Vitrine ---------------- */
function Vitrine({ produtos, categorias, categoriaAtiva, onCategoriaAtiva, onAdicionar }) {
  const produtosFiltrados = categoriaAtiva === "todos"
    ? produtos
    : produtos.filter(p => p.categoriaNome === categoriaAtiva);

  return (
    <>
      <div className="ds-categorias">
        <button
          className={"ds-categoria-pill" + (categoriaAtiva === "todos" ? " ds-ativo" : "")}
          onClick={() => onCategoriaAtiva("todos")}
        >
          Todos
        </button>
        {categorias.map(c => (
          <button
            key={c.id}
            className={"ds-categoria-pill" + (categoriaAtiva === c.nome ? " ds-ativo" : "")}
            onClick={() => onCategoriaAtiva(c.nome)}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <div className="ds-grid">
        {produtosFiltrados.map(p => (
          <div className="ds-card" key={p.id}>
            <div className="ds-card-foto"><IconeFoto /></div>
            <div className="ds-card-corpo">
              <p className="ds-card-nome ds-titulo">{p.nome}</p>
              <p className="ds-card-desc">{p.descricao}</p>
              <div className="ds-card-rodape">
                <span className="ds-card-preco">R$ {Number(p.preco).toFixed(2)}</span>
                {p.disponivel ? (
                  <button className="ds-card-add" onClick={() => onAdicionar(p)}>+</button>
                ) : (
                  <span className="ds-esgotado">Esgotado</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- Carrinho (drawer) ---------------- */
function Carrinho({ itens, onFechar, onMudarQtd, onFinalizar, finalizando }) {
  const total = itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);

  return (
    <>
      <div className="ds-overlay" onClick={onFechar} />
      <div className="ds-drawer">
        <div className="ds-drawer-topo">
          <strong>Seu carrinho</strong>
          <button className="ds-drawer-fechar" onClick={onFechar}>×</button>
        </div>
        <div className="ds-drawer-itens">
          {itens.length === 0 && <p className="ds-vazio">Seu carrinho está vazio.</p>}
          {itens.map(i => (
            <div className="ds-item-carrinho" key={i.produtoId}>
              <div className="ds-item-info">
                <h4>{i.nome}</h4>
                <span>R$ {i.preco.toFixed(2)} cada</span>
              </div>
              <div className="ds-item-qtd">
                <button onClick={() => onMudarQtd(i.produtoId, i.quantidade - 1)}>-</button>
                <span>{i.quantidade}</span>
                <button onClick={() => onMudarQtd(i.produtoId, i.quantidade + 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
        {itens.length > 0 && (
          <div className="ds-drawer-rodape">
            <div className="ds-total-linha">
              <span>Total</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
            <button className="ds-botao" onClick={onFinalizar} disabled={finalizando}>
              {finalizando ? "Enviando pedido..." : "Finalizar pedido"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- Meus Pedidos ---------------- */
function MeusPedidos({ pedidos }) {
  if (pedidos.length === 0) {
    return <p className="ds-vazio" style={{ marginTop: 60 }}>Você ainda não fez nenhum pedido.</p>;
  }

  return (
    <div className="ds-pedidos-lista">
      {pedidos.map(p => {
        const info = STATUS_INFO[p.status] || { label: p.status, cor: "#999" };
        return (
          <div className="ds-pedido-card" key={p.id}>
            <div className="ds-pedido-topo">
              <span className="ds-pedido-id">Pedido #{p.id}</span>
              <span className="ds-status-pill" style={{ background: info.cor }}>{info.label}</span>
            </div>
            <p className="ds-pedido-itens">
              {p.itens.map(i => i.quantidade + "x " + i.nomeProduto).join(", ")}
            </p>
            <p className="ds-pedido-total">R$ {Number(p.valorTotal).toFixed(2)}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- App principal ---------------- */
export default function DeliciasSantanaApp() {
  const [auth, setAuth] = useState(null); // { token, role, email, clienteId }
  const [tela, setTela] = useState("cardapio"); // cardapio | pedidos
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos");
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [itensCarrinho, setItensCarrinho] = useState([]);
  const [meusPedidos, setMeusPedidos] = useState([]);
  const [finalizando, setFinalizando] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);

  const chamar = useApi(auth ? auth.token : null);

  useEffect(() => {
    if (!auth) return;
    chamar("/api/produtos").then(setProdutos).catch(() => {});
    chamar("/api/categorias").then(setCategorias).catch(() => {});
  }, [auth]);

  useEffect(() => {
    if (!auth || !auth.clienteId || tela !== "pedidos") return;
    chamar("/api/pedidos/cliente/" + auth.clienteId).then(setMeusPedidos).catch(() => {});
  }, [auth, tela]);

  if (!auth) {
    return <TelaAcesso onEntrar={setAuth} />;
  }

  function adicionarAoCarrinho(produto) {
    setItensCarrinho(atual => {
      const existente = atual.find(i => i.produtoId === produto.id);
      if (existente) {
        return atual.map(i => i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      }
      return [...atual, { produtoId: produto.id, nome: produto.nome, preco: Number(produto.preco), quantidade: 1 }];
    });
    setCarrinhoAberto(true);
  }

  function mudarQuantidade(produtoId, novaQtd) {
    if (novaQtd <= 0) {
      setItensCarrinho(atual => atual.filter(i => i.produtoId !== produtoId));
    } else {
      setItensCarrinho(atual => atual.map(i => i.produtoId === produtoId ? { ...i, quantidade: novaQtd } : i));
    }
  }

  async function finalizarPedido() {
    setFinalizando(true);
    try {
      const resp = await chamar("/api/pedidos", {
        method: "POST",
        body: JSON.stringify({
          itens: itensCarrinho.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
        }),
      });
      setItensCarrinho([]);
      setCarrinhoAberto(false);
      setConfirmacao(resp);
    } catch (e) {
      alert(e.message);
    } finally {
      setFinalizando(false);
    }
  }

  const totalItensCarrinho = itensCarrinho.reduce((s, i) => s + i.quantidade, 0);

  return (
    <div className="ds-app">
      <div className="ds-topo">
        <img src={logo} alt="Delicias Santana" className="ds-topo-logo" />
        <div className="ds-topo-marca">
          <h1 className="ds-titulo">Delicias Santana</h1>
          <span>Doces &amp; Salgados</span>
        </div>
        <div className="ds-topo-nav">
          <button className={tela === "cardapio" ? "ds-ativo" : ""} onClick={() => setTela("cardapio")}>Cardápio</button>
          <button className={tela === "pedidos" ? "ds-ativo" : ""} onClick={() => setTela("pedidos")}>Meus pedidos</button>
        </div>
        <button className="ds-carrinho-botao" onClick={() => setCarrinhoAberto(true)}>
          Carrinho
          {totalItensCarrinho > 0 && <span className="ds-carrinho-contador">{totalItensCarrinho}</span>}
        </button>
      </div>

      {tela === "cardapio" && (
        <Vitrine
          produtos={produtos}
          categorias={categorias}
          categoriaAtiva={categoriaAtiva}
          onCategoriaAtiva={setCategoriaAtiva}
          onAdicionar={adicionarAoCarrinho}
        />
      )}

      {tela === "pedidos" && <MeusPedidos pedidos={meusPedidos} />}

      {carrinhoAberto && (
        <Carrinho
          itens={itensCarrinho}
          onFechar={() => setCarrinhoAberto(false)}
          onMudarQtd={mudarQuantidade}
          onFinalizar={finalizarPedido}
          finalizando={finalizando}
        />
      )}

      {confirmacao && (
        <div className="ds-confirmacao">
          <div className="ds-confirmacao-card">
            <h3 className="ds-titulo">Pedido #{confirmacao.id} enviado!</h3>
            <p>Agora é só combinar o pagamento pelo WhatsApp com a Delicias Santana.</p>
            <a
              className="ds-whatsapp-botao"
              href={confirmacao.linkWhatsApp}
              target="_blank"
              rel="noreferrer"
              onClick={() => setConfirmacao(null)}
            >
              Abrir WhatsApp
            </a>
            <div style={{ marginTop: 12 }}>
              <button className="ds-botao-secundario ds-botao" onClick={() => setConfirmacao(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}