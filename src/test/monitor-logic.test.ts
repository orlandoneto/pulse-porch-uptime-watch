import { describe, expect, it } from "vitest";
import { alertRecipients, normalizeUrl, transitionAlert, visibleServices } from "@/lib/monitor/logic";
import type { Profile, Service } from "@/lib/monitor/types";

const ana: Profile = { id: "ana", name: "", email: "ana@x.com", emailAlerts: true };
const bia: Profile = { id: "bia", name: "", email: "bia@x.com", emailAlerts: false };
const svc = (id: string, ownerId: string): Service => ({
  id,
  name: id,
  url: `https://${id}.com/`,
  intervalSec: 60,
  ownerId,
  paused: false,
  createdAt: 0,
});

describe("áreas por e-mail", () => {
  it("cada e-mail vê apenas os sites da sua própria área", () => {
    const all = [svc("loja", "ana"), svc("blog", "bia"), svc("api", "ana")];
    expect(visibleServices(ana, all).map((s) => s.id)).toEqual(["loja", "api"]);
    expect(visibleServices(bia, all).map((s) => s.id)).toEqual(["blog"]);
  });

  it("o e-mail de aviso vai só para o dono do site, se o aviso estiver ligado", () => {
    expect(alertRecipients(svc("loja", "ana"), [ana, bia]).map((p) => p.email)).toEqual(["ana@x.com"]);
    expect(alertRecipients(svc("blog", "bia"), [ana, bia])).toEqual([]);
  });
});

describe("quando avisar", () => {
  it("avisa quando um site no ar cai", () => {
    expect(transitionAlert("up", "down", true)).toBe("down");
  });
  it("não repete o aviso enquanto continua fora", () => {
    expect(transitionAlert("down", "down", true)).toBeNull();
  });
  it("avisa a volta só se a opção estiver ligada", () => {
    expect(transitionAlert("down", "up", true)).toBe("recovered");
    expect(transitionAlert("down", "up", false)).toBeNull();
  });
});

it("aceita endereço sem https", () => {
  expect(normalizeUrl("meusite.com.br")).toBe("https://meusite.com.br/");
  expect(normalizeUrl("abc")).toBeNull();
});
