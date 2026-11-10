import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

const SENHA = "Senha123";

async function main() {
  await prisma.emprestimo.deleteMany();
  await prisma.livro.deleteMany();
  await prisma.user.deleteMany();
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM sqlite_sequence WHERE name IN ('User','Livro','Emprestimo')`
    );
  } catch {
    /* sem problema */
  }

  const password = await bcrypt.hash(SENHA, 10);

  // ADMIN, Ana e Bruno
  await prisma.user.create({
    data: { nome: "Administrador", email: "admin@biblioteca.com", password, role: "ADMIN" },
  });
  const ana = await prisma.user.create({
    data: { nome: "Ana Souza", email: "ana@biblioteca.com", password, role: "USER" },
  });
  const bruno = await prisma.user.create({
    data: { nome: "Bruno Lima", email: "bruno@biblioteca.com", password, role: "USER" },
  });

  // Cadastro de livros com quantidades
  const livro1 = await prisma.livro.create({
    data: { titulo: "Dom Casmurro", autor: "Machado de Assis", isbn: "9788520916535", quantidade: 2 },
  });
  const livro2 = await prisma.livro.create({
    data: { titulo: "O Cortiço", autor: "Aluísio Azevedo", isbn: "9788508108152", quantidade: 1 },
  });
  const livro3 = await prisma.livro.create({
    data: { titulo: "Memórias Póstumas de Brás Cubas", autor: "Machado de Assis", isbn: "9788535910663", quantidade: 3 },
  });
  const livro4 = await prisma.livro.create({
    data: { titulo: "A Moreninha", autor: "Joaquim Manuel de Macedo", isbn: "9788579340673", quantidade: 2 },
  });
  const livro5 = await prisma.livro.create({
    data: { titulo: "Iracema", autor: "José de Alencar", isbn: "9788572328494", quantidade: 1 },
  });

  // Empréstimo inicial da Ana (livro 3) e Bruno (livro 2)
  await prisma.emprestimo.createMany({
    data: [
      {
        livroId: livro3.id,
        leitorId: ana.id,
        dataEmprestimo: new Date(),
        devolvido: false,
      },
      {
        livroId: livro2.id,
        leitorId: bruno.id,
        dataEmprestimo: new Date(),
        devolvido: false,
      },
    ],
  });

  console.log("Seed concluído: 1 ADMIN, 2 leitores, 5 livros com estoque e 2 empréstimos ativos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
