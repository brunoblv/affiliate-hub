import { test } from "node:test";
import assert from "node:assert/strict";
import { blogSubdomainFromHost, blogUrl, isValidSubdomain } from "./hosts";

process.env.BLOG_BASE_DOMAIN = "capibusca.com.br";
process.env.NEXT_PUBLIC_SITE_URL = "https://capibusca.com.br";

test("blogSubdomainFromHost reconhece o subdomínio do blog, com porta e maiúsculas", () => {
  assert.equal(blogSubdomainFromHost("meunovolar.capibusca.com.br"), "meunovolar");
  assert.equal(blogSubdomainFromHost("MeuNovoLar.Capibusca.com.br:443"), "meunovolar");
});

test("host principal, www, domínio parecido e subdomínio aninhado não são blog", () => {
  assert.equal(blogSubdomainFromHost("capibusca.com.br"), null);
  assert.equal(blogSubdomainFromHost("www.capibusca.com.br"), null);
  assert.equal(blogSubdomainFromHost("meunovolar.capibusca.com.br.evil.io"), null);
  assert.equal(blogSubdomainFromHost("a.b.capibusca.com.br"), null);
  assert.equal(blogSubdomainFromHost("meunovolarcapibusca.com.br"), null);
  assert.equal(blogSubdomainFromHost(null), null);
});

test("blogUrl monta a URL absoluta do blog", () => {
  assert.equal(blogUrl("meunovolar"), "https://meunovolar.capibusca.com.br");
  assert.equal(blogUrl("meunovolar", "/blog/x"), "https://meunovolar.capibusca.com.br/blog/x");
});

test("isValidSubdomain recusa reservados e caracteres inválidos", () => {
  assert.equal(isValidSubdomain("meunovolar"), true);
  assert.equal(isValidSubdomain("www"), false);
  assert.equal(isValidSubdomain("Meu_Lar"), false);
  assert.equal(isValidSubdomain("-lar"), false);
});
