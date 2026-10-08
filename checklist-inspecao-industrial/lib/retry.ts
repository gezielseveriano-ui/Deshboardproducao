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

/**
 * Sem isso, uma requisição que trava sem nunca resolver nem rejeitar (ex:
 * servidor "dormindo" no Render e demorando pra acordar, ou uma rede que
 * nem chega a avisar que caiu) deixa a tela sem nenhuma resposta - nem a
 * mensagem de sucesso, nem a de "ficou pendente", por tempo indeterminado.
 * Depois desse prazo, trata como falha (cai no mesmo caminho de "sem
 * internet, vai tentar de novo depois") mesmo que a requisição original
 * ainda esteja em andamento por trás - se ela tiver sucesso mais tarde,
 * a tentativa automática seguinte simplesmente reconhece isso (pelo
 * clientChecklistId) em vez de duplicar.
 */
export async function comTimeout<T>(promise: Promise<T>, ms: number, mensagem: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(mensagem)), ms)),
  ]);
}
