# Como atualizar o site

## Publicações (automático)

Todo dia o workflow **Sincronizar publicações** (aba *Actions*) consulta:

1. **ORCID** (`author.orcid` no `_config.yml`): fonte principal.
2. **arXiv**: o feed `arxiv.org/a/<seu ORCID>`, que só funciona se o ORCID estiver ligado à sua conta do arXiv.
3. **Google Scholar** (opcional): via [SerpApi](https://serpapi.com), porque o Scholar não tem API e bloqueia robôs. Para ligar, crie uma conta gratuita, copie a API key e salve em *Settings > Secrets and variables > Actions > New repository secret* com o nome `SERPAPI_KEY`.

Os dados são completados pelo Crossref (autores, revista, volume, resumo) e pela API do arXiv. Quando há algo novo, o workflow cria o arquivo em `_publications/` e o site se reconstrói sozinho. Para rodar na hora: *Actions > Sincronizar publicações > Run workflow*.

### Para o ORCID receber seus trabalhos sozinho (configurar uma vez)

- **Artigos publicados**: no ORCID, *Works > Add > Search & link > Crossref Metadata Search* e autorize o Crossref. Quando uma revista registrar um DOI com o seu ORCID (informe o ORCID ao submeter), o Crossref manda o trabalho para a caixa de entrada do ORCID; aprove uma vez e as próximas entram sozinhas.
- **Preprints do arXiv**: em [DataCite Commons](https://commons.datacite.org), faça login com o ORCID e ative *ORCID Auto-Update*. Ligue também o ORCID na sua conta do arXiv (*user page > Link ORCID iD*), o que ativa a fonte 2 acima.

### Regras

- Arquivos criados pelo sincronizador têm `auto_sync: true` e são atualizados sozinhos.
- Arquivos escritos à mão **não são sobrescritos**. Exceção: se um trabalho `inpreparation` ou `preprints` sair publicado, ele é promovido (mudam só `category`, `venue`, `date`, `paperurl`, `doi` e `citation`; título, resumo e texto ficam). Para travar um arquivo, ponha `auto_sync: false` nele.
- Nada é apagado. Para esconder algo, adicione o título, DOI ou ID do arXiv em `_data/publications_ignore.yml`.
- Trabalhos "em preparação" continuam manuais: crie o arquivo em `_publications/` com `category: inpreparation`. A extensão precisa ser **`.md`** (com `.txt` a página não abre). Equações no resumo vão entre `$$ ... $$`, e não use `\%` (escreva só `%`).

## Slides e notas de aula (arrastar e soltar)

Cada disciplina tem uma pasta própria em `lecture-notes/`:

| Disciplina | Pasta |
|---|---|
| Física Geral 1 | `lecture-notes/fisica-geral-1/` |
| Física Geral 2 | `lecture-notes/fisica-geral-2/` |
| Elementos de Física | `lecture-notes/elementos-de-fisica/` |
| Física Experimental L2 | `lecture-notes/fisica-experimental-l2/` |
| Física L1 | `lecture-notes/fisica-l1/` |
| Física Experimental 1 | `lecture-notes/fisica-experimental-1/` |
| Física Experimental 2 | `lecture-notes/fisica-experimental-2/` |
| Física Experimental L1 | `lecture-notes/fisica-experimental-l1/` |
| Laboratório de Física Moderna L2 | `lecture-notes/laboratorio-fisica-moderna-l2/` |
| Cálculo 1 | `lecture-notes/calculo-1/` |
| Geometria Analítica 1 | `lecture-notes/geometria-analitica-1/` |
| Cálculo 3 | `lecture-notes/calculo-3/` |
| Cálculo 4 | `lecture-notes/calculus-4/` |
| Álgebra Linear 1 | `lecture-notes/linear-algebra/` |

Para adicionar slides ou notas:

1. No GitHub (site), abra a pasta da disciplina.
2. *Add file > Upload files*, arraste os PDFs, *Commit changes*.

Ou, no computador: copie os PDFs para a pasta dentro do repositório e faça commit e push no GitHub Desktop.

Em um ou dois minutos eles aparecem na página da disciplina, e a página Teaching mostra quantos arquivos cada uma tem. O título de cada item é o nome do arquivo e a ordem é por nome, com números comparados como números:

| Nome do arquivo | Aparece como |
|---|---|
| `Aula 03 - Leis de Newton.pdf` | Aula 03 - Leis de Newton |
| `Slides 02 - Cinematica.pdf` | Slides 02 - Cinematica |
| `lista_de_exercicios_1.pdf` | Lista de exercicios 1 |

Dica: comece os nomes com o tipo e um número (`Aula 01`, `Lista 01`, `Slides 01`) para que fiquem agrupados e em ordem.

### Disciplina nova

1. Copie qualquer arquivo de `_teaching/` com um nome novo, por exemplo `_teaching/mecanica-quantica-1.md`, e ajuste o cabeçalho:

   ```yaml
   ---
   title: "Quantum Mechanics 1"
   title_pt: "Mecânica Quântica 1"
   collection: teaching
   type: Undergraduate course
   department: physics          # ou math
   venue: Universidade Federal de Pernambuco, Physics Department
   location: Recife, Brazil
   semesters: ['2027.1']
   date: 2027-03-01             # início do semestre mais recente (define a ordem)
   permalink: /teaching/mecanica-quantica-1/
   excerpt: Uma frase sobre a disciplina.
   lecture_notes: mecanica-quantica-1
   ---
   ```

2. Suba os PDFs em `lecture-notes/mecanica-quantica-1/`.

Se der a mesma disciplina de novo, basta acrescentar o semestre em `semesters` e atualizar `date`.

As monitorias e minicursos ficam em `_data/teaching_other.yml`.

### Notas antigas nos Releases

As notas de Álgebra Linear e Cálculo 4 continuam nos Releases e estão listadas em `_data/lectures_linear_algebra.yml` e `_data/lectures_calculus_4.yml`. Notas novas desses cursos podem ir direto em `lecture-notes/linear-algebra/` e `lecture-notes/calculus-4/`; elas aparecem depois das antigas.

## Observação

O GitHub desativa workflows agendados em repositórios públicos depois de 60 dias sem nenhum commit. Se isso acontecer, você recebe um e-mail; basta reativar em *Actions*.

## Simulações

Cada simulação é um arquivo em `_simulations/` mais um script em `assets/simulations/`. A galeria em `/simulations/` se monta sozinha a partir desses arquivos.

Para adicionar uma:

1. Crie `assets/simulations/minha-simulacao.js`. O script procura o próprio bloco pela `id` e pode usar os utilitários de `assets/simulations/sim-common.js` (`Sim.fitCanvas`, `Sim.colors`, `Sim.onThemeChange`, `Sim.bindRange` e outros), que já cuidam de tela retina e do modo escuro. Os scripts existentes servem de modelo.
2. Crie `_simulations/minha-simulacao.md`:

   ```markdown
   ---
   title: "Nome da simulação"
   excerpt: "Uma ou duas frases que aparecem no cartão da galeria."
   order: 6
   thumbnail: /images/simulations/minha-simulacao.png
   sim_script: minha-simulacao.js
   ---

   <div class="sim" id="minha-simulacao">
     <div class="sim__views">
       <div class="sim__stage"><canvas data-role="canvas"></canvas></div>
     </div>
     <div class="sim__panel">
       <!-- botões (sim-btn), campos (sim__field), leituras (sim__readout) -->
     </div>
   </div>

   ## A física

   Texto em Markdown, com equações entre $$ ... $$.
   ```

3. Ponha uma imagem 16:10 em `images/simulations/` para o cartão (uma captura de tela da própria simulação serve).

Regras práticas:

- Não escreva `<script>` dentro do `.md`: o layout do tema compacta o HTML e quebra scripts embutidos. Todo código vai no `.js`.
- Dentro das equações, use `\lvert`/`\rvert` em vez de `|` e `\lt` em vez de `<`, para o Markdown não confundir com tabela ou HTML.
- `order` define a posição na galeria.

## Visual

As cores ficam em `_sass/theme/_linck_light.scss` e `_sass/theme/_linck_dark.scss`. Os ajustes de tipografia, cabeçalho e listas ficam em `_sass/layout/_linck.scss`, e os controles das simulações em `_sass/layout/_simulations.scss`. Para voltar às cores antigas, troque `site_theme` no `_config.yml` para `"contrast"` (a tipografia e a faixa espectral continuam; elas saem removendo `"layout/linck"` de `assets/css/main.scss`).
