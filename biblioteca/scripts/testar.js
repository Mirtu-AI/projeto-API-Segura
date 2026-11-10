const BASE = process.env.BASE_URL || "http://localhost:3000";

async function req(metodo, caminho, { token, body, headers } = {}) {
  const h = { "Content-Type": "application/json", ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    /* 204 sem corpo */
  }
  return { status: r.status, json };
}

const resultados = [];
function checar(id, descricao, obtido, esperado, extra = true) {
  const ok = obtido === esperado && extra;
  resultados.push({ id, descricao, esperado, obtido, ok });
}

async function logar(email) {
  const r = await req("POST", "/auth/login", { body: { email, senha: "Senha123" } });
  if (r.status !== 200) throw new Error(`Login de ${email} falhou (${r.status}). Rodou o seed?`);
  return r.json.token;
}

async function main() {
  const tokenAdmin = await logar("admin@biblioteca.com");
  const tokenAna = await logar("ana@biblioteca.com");

  let r = await req("POST", "/auth/register", {
    body: { nome: "Teste Auto", email: `auto${Date.now()}@biblioteca.com`, senha: "segredo123" },
  });
  checar("T1", "Cadastro válido (resposta sem senha)", r.status, 201, r.json && !("password" in r.json));

  r = await req("POST", "/auth/register", {
    body: { nome: "Repetido", email: "ana@biblioteca.com", senha: "segredo123" },
  });
  checar("T2", "Cadastro com e-mail repetido", r.status, 409);

  r = await req("POST", "/auth/login", { body: { email: "ana@biblioteca.com", senha: "errada" } });
  checar("T3", "Login com senha errada", r.status, 401);

  r = await req("GET", "/auth/me");
  checar("T4", "Rota protegida sem token", r.status, 401);

  r = await req("GET", "/auth/me", { token: tokenAna });
  checar("T5", "Rota protegida com token válido", r.status, 200);

  r = await req("POST", "/emprestimos", {
    token: tokenAna,
    body: { livroId: 1, leitorId: 99 },
  });
  checar("T6", "Criar empréstimo mandando leitorId no body (ignorado / usa do token)", r.status, 201, r.json?.leitorId === 2);

  // Empréstimo 2 é do Bruno. Ana não pode alterar (deve retornar 403)
  r = await req("PUT", "/emprestimos/2", { token: tokenAna, body: { devolvido: true } });
  checar("T7", "USER alterando empréstimo de outro USER", r.status, 403);

  r = await req("GET", "/users", { token: tokenAna });
  checar("T8", "USER em rota de ADMIN", r.status, 403);

  r = await req("GET", "/users", { token: tokenAdmin });
  checar("T9", "ADMIN em rota de ADMIN", r.status, 200);

  r = await req("PUT", "/emprestimos/9999", { token: tokenAna, body: { devolvido: true } });
  checar("T10", "Recurso inexistente", r.status, 404);

  // extras de autenticação
  r = await req("GET", "/auth/me", { headers: { Authorization: tokenAna } });
  checar("E1", "Header sem 'Bearer' (formato errado)", r.status, 401);
  r = await req("GET", "/auth/me", { token: tokenAna.slice(0, -2) + "xx" });
  checar("E2", "Token com assinatura adulterada", r.status, 401);

  if (process.argv.includes("--limite")) {
    let ultimo = 0;
    for (let i = 0; i < 11; i++) {
      ultimo = (await req("POST", "/auth/login", { body: { email: "ana@biblioteca.com", senha: "x" } })).status;
    }
    checar("E3", "Limite de tentativas de login (11ª falha)", ultimo, 429);
  }

  console.table(
    resultados.map((x) => ({
      Teste: x.id,
      Cenário: x.descricao,
      Esperado: x.esperado,
      Obtido: x.obtido,
      Resultado: x.ok ? "OK" : "FALHOU",
    }))
  );
  const falhas = resultados.filter((x) => !x.ok).length;
  console.log(falhas === 0 ? "Todos os testes passaram." : `${falhas} teste(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erro ao rodar os testes:", e.message);
  process.exit(1);
});
