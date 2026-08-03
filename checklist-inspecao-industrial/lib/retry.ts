/**
 * Requisições em sequência numa rede de celular têm chance real de uma
 * cair no meio ("TypeError: Load failed" no Safari, "Failed to fetch" no
 * Chrome) mesmo com internet normal - isso fica pior quanto mais
 * requisições seguidas (ex: excluir vários checklists de uma vez). Tenta
 * de novo (com uma pequena espera crescente) antes de desistir de verdade.
 */
export async function comTentativas<T>(fn: () => Promise<T>, tentativas = 3): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (error) {
      ultimoErro = error;
      if (i < tentativas - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }
  throw ultimoErro;
}
