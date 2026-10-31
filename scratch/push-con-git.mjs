import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import fs from "node:fs";

async function main() {
  const token = process.argv[2];
  if (!token) throw new Error("Falta token");
  const dir = process.cwd();

  await git.add({ fs, dir, filepath: "servidor/rutas/auth.js" });
  await git.add({ fs, dir, filepath: "publico/js/modulos/ingreso.js" });

  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: "karinaiza27-create",
      email: "karinaiza27@users.noreply.github.com"
    },
    message: "Permitir login tanto con usuario simple como con correo y admitir claves demo"
  });
  console.log("Commit:", sha);

  const pushRes = await git.push({
    fs,
    http,
    dir,
    remote: "origin",
    ref: "main",
    onAuth: () => ({ username: token, password: "" })
  });
  console.log("Push OK:", pushRes);
}

main().catch(console.error);
